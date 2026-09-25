import { useState, useEffect, useRef } from "react";
import { Monitor, Trash2 } from "lucide-react";
import WidgetModal from "@/dashboard/WidgetModal";
import { useChromeStorage } from "@/shared/storage";

declare const chrome: any;

interface Stats {
  totalDiscardedCount: number;
  estimatedMemorySavedMb: number;
}

const STATS_KEY = "discard.stats";
const HISTORY_KEY = "dashboard.systemHistory";

export default function SystemWidget({ onClose, bare }: { onClose: () => void; bare?: boolean }) {
  const [stats] = useChromeStorage<Stats>(STATS_KEY, { totalDiscardedCount: 0, estimatedMemorySavedMb: 0 });
  const [history, setHistory] = useChromeStorage<number[]>(HISTORY_KEY, []);
  const [openTabs, setOpenTabs] = useState<number | null>(null);
  const [discarding, setDiscarding] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const prevTotal = useRef(stats.totalDiscardedCount);

  // Live tab count (extension only)
  useEffect(() => {
    try {
      if (typeof chrome !== "undefined" && chrome.tabs?.query) {
        chrome.tabs.query({}).then((tabs: unknown[]) => setOpenTabs(tabs.length)).catch(() => {});
      }
    } catch { /* web preview */ }
  }, []);

  // Record history when the total grows
  useEffect(() => {
    if (stats.totalDiscardedCount > prevTotal.current) {
      prevTotal.current = stats.totalDiscardedCount;
      setHistory((prev) => {
        const next = [...(Array.isArray(prev) ? prev : []), stats.totalDiscardedCount];
        return next.slice(-14);
      });
    } else {
      prevTotal.current = stats.totalDiscardedCount;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stats.totalDiscardedCount]);

  async function discardNow() {
    setDiscarding(true);
    setMsg(null);
    try {
      if (typeof chrome === "undefined" || !chrome.runtime?.sendMessage) {
        throw new Error("Discard engine not installed");
      }
      const res: any = await chrome.runtime.sendMessage({ type: "DISCARD_TABS_NOW" });
      setMsg(`Discarded ${res?.payload?.count ?? 0} tabs`);
    } catch (e: any) {
      setMsg(e?.message || "Discard failed");
    } finally {
      setDiscarding(false);
    }
  }

  const max = Math.max(1, ...history);
  const bars = history.length > 0 ? history : [0];

  return (
    <WidgetModal title="Tab Health" icon={<Monitor size={15} className="text-white/85" />} onClose={onClose} bare={bare}>
      <div className="animate-fade-in">
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="rounded-xl surface-chip p-3 text-center">
            <div className="text-2xl font-thin text-white tabular-nums">{openTabs ?? "—"}</div>
            <div className="text-[10px] text-white/40 uppercase tracking-wider mt-1">Open</div>
          </div>
          <div className="rounded-xl surface-chip p-3 text-center">
            <div className="text-2xl font-thin text-white tabular-nums">{stats.totalDiscardedCount}</div>
            <div className="text-[10px] text-white/40 uppercase tracking-wider mt-1">Discarded</div>
          </div>
          <div className="rounded-xl surface-chip p-3 text-center">
            <div className="text-2xl font-thin text-white tabular-nums">~{Math.round(stats.estimatedMemorySavedMb)}</div>
            <div className="text-[10px] text-white/40 uppercase tracking-wider mt-1">MB saved</div>
          </div>
        </div>

        <div className="text-[10px] text-white/35 uppercase tracking-wider mb-2">Discards (last {bars.length})</div>
        <div className="flex items-end gap-1 h-14 mb-4">
          {bars.map((v, i) => (
            <div
              key={i}
              className="flex-1 rounded-sm bg-emerald-400/50 min-h-[3px]"
              style={{ height: `${Math.max(8, (v / max) * 100)}%` }}
              title={`${v} total`}
            />
          ))}
        </div>

        <button
          onClick={discardNow}
          disabled={discarding}
          className="w-full py-2.5 rounded-xl text-sm font-medium text-white bg-white/10 hover:bg-white/15 border border-white/10 tap-scale flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Trash2 size={14} /> {discarding ? "Discarding…" : "Discard inactive tabs now"}
        </button>
        {msg && <div className="text-white/50 text-xs text-center mt-2 animate-fade-in">{msg}</div>}
      </div>
    </WidgetModal>
  );
}
