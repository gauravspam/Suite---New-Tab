import { useState, useEffect, useMemo } from "react";
import { GitBranch, ExternalLink, GitCommitHorizontal } from "lucide-react";
import WidgetModal from "@/dashboard/WidgetModal";
import { STORAGE_KEYS, useChromeStorage } from "@/shared/storage";
import { DEFAULT_GITHUB } from "@/shared/types";

interface GhPayloadCommit {
  sha: string;
  message: string;
}

interface GhEvent {
  id: string;
  type: string;
  repo: { name: string };
  created_at: string;
  payload?: {
    action?: string;
    ref_type?: string;
    ref?: string;
    size?: number;
    before?: string;
    head?: string;
    commits?: GhPayloadCommit[];
  };
}

interface CompareCommit {
  sha: string;
  commit: { message: string; author?: { date?: string } };
}

interface CompareRes {
  total_commits?: number;
  commits?: CompareCommit[];
}

interface FlatCommit {
  sha: string;
  message: string;
  repo: string;
  date: Date;
}

// Session cache for compare calls (GitHub allows 60 unauthenticated req/hr)
const compareCache = new Map<string, Promise<CompareRes | null>>();
function fetchCompare(repo: string, before: string, head: string): Promise<CompareRes | null> {
  const key = `${repo}@${before}...${head}`;
  let p = compareCache.get(key);
  if (!p) {
    p = fetch(`https://api.github.com/repos/${repo}/compare/${before}...${head}`)
      .then((r) => (r.ok ? (r.json() as Promise<CompareRes>) : null))
      .catch(() => null);
    compareCache.set(key, p);
    if (compareCache.size > 60) {
      const oldest = compareCache.keys().next().value;
      if (oldest) compareCache.delete(oldest);
    }
  }
  return p;
}

function branchOf(ref?: string) {
  return ref?.replace(/^refs\/heads\//, "") || "main";
}

function dayKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function shortDate(d: Date) {
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit" });
}

const WEEKS = 12;
const ENRICH_LIMIT = 6;

export default function GithubWidget({ onClose, bare }: { onClose: () => void; bare?: boolean }) {
  const [settings, setSettings] = useChromeStorage(STORAGE_KEYS.DASHBOARD_GITHUB, DEFAULT_GITHUB);
  const [events, setEvents] = useState<GhEvent[] | null>(null);
  const [enriched, setEnriched] = useState<FlatCommit[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState(settings.username || "");

  useEffect(() => setDraft(settings.username || ""), [settings.username]);

  useEffect(() => {
    if (!settings.username) return;
    let cancelled = false;
    setEvents(null);
    setEnriched(null);
    setError(null);
    fetch(`https://api.github.com/users/${encodeURIComponent(settings.username)}/events/public?per_page=30`)
      .then((r) => {
        if (r.status === 404) throw new Error("User not found");
        if (r.status === 403) throw new Error("Rate limited — try again later");
        if (!r.ok) throw new Error("GitHub request failed");
        return r.json();
      })
      .then(async (data: GhEvent[]) => {
        if (cancelled) return;
        setEvents(data);
        // Enrich pushes: use embedded commits when present, else the compare API
        const pushes = data.filter((e) => e.type === "PushEvent").slice(0, ENRICH_LIMIT);
        const lists = await Promise.all(
          pushes.map(async (e): Promise<FlatCommit[]> => {
            const eventDate = new Date(e.created_at);
            const embedded = e.payload?.commits;
            if (embedded && embedded.length > 0) {
              return embedded.map((c) => ({
                sha: c.sha,
                message: (c.message || "").split("\n")[0],
                repo: e.repo.name,
                date: eventDate,
              }));
            }
            const before = e.payload?.before;
            const head = e.payload?.head;
            if (before && head && !/^0+$/.test(before)) {
              const cmp = await fetchCompare(e.repo.name, before, head);
              if (cmp?.commits && cmp.commits.length > 0) {
                return cmp.commits.map((c) => ({
                  sha: c.sha,
                  message: (c.commit.message || "").split("\n")[0],
                  repo: e.repo.name,
                  date: c.commit.author?.date ? new Date(c.commit.author.date) : eventDate,
                }));
              }
            }
            // Fallback: synthesize one row from push metadata
            const size = e.payload?.size ?? 0;
            return [{
              sha: head || e.id,
              message: size > 0 ? `Pushed ${size} commit${size === 1 ? "" : "s"} to ${branchOf(e.payload?.ref)}` : `Pushed to ${branchOf(e.payload?.ref)}`,
              repo: e.repo.name,
              date: eventDate,
            }];
          })
        );
        if (!cancelled) {
          const all = lists.flat().sort((a, b) => b.date.getTime() - a.date.getTime());
          setEnriched(all);
        }
      })
      .catch((e) => { if (!cancelled) setError(e.message || "Failed to load"); });
    return () => { cancelled = true; };
  }, [settings.username]);

  const stats = useMemo(() => {
    if (!events || !enriched) return null;
    const pushes = events.filter((e) => e.type === "PushEvent");
    const repos = new Set(pushes.map((e) => e.repo.name));

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const counts = new Map<string, number>();
    for (const c of enriched) {
      const k = dayKey(c.date);
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    const totalDays = WEEKS * 7;
    const start = new Date(today);
    start.setDate(start.getDate() - (totalDays - 1));
    const days: { date: Date; count: number }[] = [];
    for (let i = 0; i < totalDays; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      days.push({ date: d, count: counts.get(dayKey(d)) ?? 0 });
    }
    const max = Math.max(1, ...days.map((d) => d.count));

    return {
      totalCommits: enriched.length,
      pushes: pushes.length,
      repos: repos.size,
      recent: enriched.slice(0, 8),
      days,
      max,
    };
  }, [events, enriched]);

  return (
    <WidgetModal title="GitHub" icon={<GitBranch size={15} className="text-white/85" />} onClose={onClose} bare={bare}>
      <div className="animate-fade-in">
        <div className="flex gap-2 mb-3">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") setSettings({ ...settings, username: draft.trim() }); }}
            onBlur={() => { if (draft.trim() !== (settings.username || "")) setSettings({ ...settings, username: draft.trim() }); }}
            placeholder="GitHub username…"
            className="flex-1 surface-input px-3 py-2 text-sm"
          />
          {settings.username && (
            <a
              href={`https://github.com/${settings.username}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/15 flex items-center justify-center text-white/70 tap-scale"
              title="Open profile"
            >
              <ExternalLink size={14} />
            </a>
          )}
        </div>

        {!settings.username && (
          <div className="text-white/35 text-xs text-center py-4">Enter your username to see live activity</div>
        )}
        {settings.username && !stats && !error && (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => <div key={i} className="h-12 rounded-xl bg-white/[0.04] animate-pulse" />)}
          </div>
        )}
        {error && <div className="text-red-400/80 text-xs text-center py-4">{error}</div>}
        {stats && (
          <>
            <div className="flex items-center gap-4 mb-3 px-1">
              <div>
                <div className="text-white text-lg font-semibold tabular-nums leading-none">{stats.totalCommits}</div>
                <div className="text-white/40 text-[10px] uppercase tracking-[0.12em] mt-1">commits · recent</div>
              </div>
              <div>
                <div className="text-white text-lg font-semibold tabular-nums leading-none">{stats.pushes}</div>
                <div className="text-white/40 text-[10px] uppercase tracking-[0.12em] mt-1">pushes</div>
              </div>
              <div>
                <div className="text-white text-lg font-semibold tabular-nums leading-none">{stats.repos}</div>
                <div className="text-white/40 text-[10px] uppercase tracking-[0.12em] mt-1">repos</div>
              </div>
            </div>

            <div className="grid grid-flow-col grid-rows-7 gap-[3px] mb-1">
              {stats.days.map((d, i) => (
                <div
                  key={i}
                  title={`${d.date.toLocaleDateString()} — ${d.count} commit${d.count === 1 ? "" : "s"}`}
                  className="w-full aspect-square rounded-[3px]"
                  style={{
                    background:
                      d.count === 0
                        ? "rgba(255,255,255,0.07)"
                        : `rgba(52,211,153,${0.25 + 0.75 * (d.count / stats.max)})`,
                  }}
                />
              ))}
            </div>
            <div className="text-white/30 text-[10px] mb-3">last {WEEKS} weeks · public pushes</div>

            <div className="text-white/40 text-[10px] uppercase tracking-[0.12em] mb-1.5">Recent commits</div>
            {stats.recent.length === 0 && (
              <div className="text-white/35 text-xs text-center py-3">No pushes in the last 90 days</div>
            )}
            <div className="space-y-0.5">
              {stats.recent.map((c) => (
                <a
                  key={c.sha}
                  href={c.sha.length >= 7 && /^[0-9a-f]+$/i.test(c.sha) ? `https://github.com/${c.repo}/commit/${c.sha}` : `https://github.com/${c.repo}/commits`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 rounded-lg hover:bg-white/[0.05] px-2 py-1.5 -mx-2 transition-colors animate-slide-in-left"
                >
                  <GitCommitHorizontal size={13} className="text-emerald-300/80 flex-shrink-0" />
                  <span className="text-white/30 text-[11px] tabular-nums flex-shrink-0 w-10">{shortDate(c.date)}</span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-white/85 text-[13px] truncate">{c.message || "(no message)"}</span>
                    <span className="block text-white/40 text-[11px] truncate">{c.repo}</span>
                  </span>
                </a>
              ))}
            </div>
          </>
        )}
      </div>
    </WidgetModal>
  );
}
