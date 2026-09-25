import { useState } from "react";
import { Globe, Plus, X } from "lucide-react";
import WidgetModal from "@/dashboard/WidgetModal";
import { useNow } from "@/shared/time";
import { STORAGE_KEYS, useChromeStorage } from "@/shared/storage";
import { DEFAULT_WORLD_CLOCKS, type WorldClockEntry } from "@/shared/types";

const PRESETS: Omit<WorldClockEntry, "id">[] = [
  { label: "New York", timezone: "America/New_York" },
  { label: "London", timezone: "Europe/London" },
  { label: "Paris", timezone: "Europe/Paris" },
  { label: "Dubai", timezone: "Asia/Dubai" },
  { label: "Mumbai", timezone: "Asia/Kolkata" },
  { label: "Singapore", timezone: "Asia/Singapore" },
  { label: "Tokyo", timezone: "Asia/Tokyo" },
  { label: "Sydney", timezone: "Australia/Sydney" },
  { label: "Los Angeles", timezone: "America/Los_Angeles" },
  { label: "São Paulo", timezone: "America/Sao_Paulo" },
];

function offsetLabel(tz: string, now: Date): string {
  try {
    const inTz = new Date(now.toLocaleString("en-US", { timeZone: tz }));
    const local = new Date(now.toLocaleString("en-US"));
    const diffH = (inTz.getTime() - local.getTime()) / 3600000;
    const sign = diffH < 0 ? "−" : "+";
    const abs = Math.abs(diffH);
    const h = Math.floor(abs);
    const m = Math.round((abs - h) * 60);
    return m === 0 ? `${sign}${h}` : `${sign}${h}:${m.toString().padStart(2, "0")}`;
  } catch {
    return "";
  }
}

function MiniDial({ tz, now }: { tz: string; now: Date }) {
  let hr = 0;
  let min = 0;
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false,
    }).formatToParts(now);
    const get = (t: string) => Number(parts.find((p) => p.type === t)?.value || 0);
    hr = (get("hour") % 12) * 30 + get("minute") * 0.5;
    min = get("minute") * 6;
  } catch { /* leave at 0 */ }
  return (
    <svg viewBox="0 0 40 40" className="w-10 h-10 flex-shrink-0">
      <circle cx="20" cy="20" r="18" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
      <line x1="20" y1="20" x2="20" y2="12" stroke="#fff" strokeWidth="2" strokeLinecap="round" transform={`rotate(${hr} 20 20)`} />
      <line x1="20" y1="20" x2="20" y2="8" stroke="rgba(255,255,255,0.7)" strokeWidth="1.2" strokeLinecap="round" transform={`rotate(${min} 20 20)`} />
      <circle cx="20" cy="20" r="1.6" fill="#fff" />
    </svg>
  );
}

export default function WorldClockWidget({ onClose, bare }: { onClose: () => void; bare?: boolean }) {
  const [clocks, setClocks] = useChromeStorage<WorldClockEntry[]>(STORAGE_KEYS.DASHBOARD_WORLD_CLOCKS, DEFAULT_WORLD_CLOCKS);
  const [adding, setAdding] = useState(false);
  const [search, setSearch] = useState("");
  const now = useNow(1000);

  const list = Array.isArray(clocks) ? clocks : [];
  const existing = new Set(list.map((c) => c.timezone));
  const matches = PRESETS.filter(
    (p) => !existing.has(p.timezone) &&
      (p.label.toLowerCase().includes(search.toLowerCase()) || p.timezone.toLowerCase().includes(search.toLowerCase()))
  );

  function time(tz: string) {
    try {
      return now.toLocaleTimeString("en-US", { timeZone: tz, hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true });
    } catch {
      return "--:--";
    }
  }

  return (
    <WidgetModal title="World Clock" icon={<Globe size={15} className="text-white/85" />} onClose={onClose} bare={bare}>
      <div className="animate-fade-in">
        <div className="space-y-2 mb-3">
          {list.map((c, idx) => (
            <div key={c.id} className="rounded-xl surface-chip p-3 flex items-center gap-3 group animate-slide-in-left" style={{ animationDelay: `${idx * 40}ms` }}>
              <MiniDial tz={c.timezone} now={now} />
              <div className="flex-1 min-w-0">
                <div className="text-white/85 text-sm font-medium truncate">
                  {c.label} <span className="text-white/35 text-[11px] font-normal">UTC{offsetLabel(c.timezone, now)}</span>
                </div>
                <div className="text-xl text-white/90 font-thin tabular-nums">{time(c.timezone)}</div>
              </div>
              <button
                onClick={() => setClocks((prev) => prev.filter((x) => x.id !== c.id))}
                className="opacity-0 group-hover:opacity-100 text-white/30 hover:text-red-400 tap-scale flex-shrink-0"
                aria-label={`Remove ${c.label}`}
              >
                <X size={13} />
              </button>
            </div>
          ))}
          {list.length === 0 && (
            <div className="text-white/35 text-xs text-center py-4">No clocks — add one below</div>
          )}
        </div>

        {adding ? (
          <div className="animate-slide-in-up">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search cities…"
              autoFocus
              className="w-full surface-input px-3 py-2 text-sm mb-2"
            />
            <div className="max-h-44 overflow-y-auto space-y-1">
              {matches.map((p) => (
                <button
                  key={p.timezone}
                  onClick={() => {
                    setClocks((prev) => [...prev, { id: `${p.timezone}-${Date.now()}`, ...p }]);
                    setSearch("");
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/[0.07] text-[13px] text-white/75 tap-scale flex justify-between"
                >
                  {p.label}
                  <span className="text-white/30 text-[11px]">UTC{offsetLabel(p.timezone, now)}</span>
                </button>
              ))}
              {matches.length === 0 && <div className="text-white/30 text-xs px-3 py-2">No matches</div>}
            </div>
            <button onClick={() => { setAdding(false); setSearch(""); }} className="text-white/40 text-xs hover:text-white/65 mt-2">
              Done
            </button>
          </div>
        ) : (
          <button onClick={() => setAdding(true)} className="w-full flex items-center justify-center gap-2 text-white/50 hover:text-white/80 text-[13px] py-2 hover:bg-white/[0.06] rounded-xl transition-colors tap-scale">
            <Plus size={13} /> Add timezone
          </button>
        )}
      </div>
    </WidgetModal>
  );
}
