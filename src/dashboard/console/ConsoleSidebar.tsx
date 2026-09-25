import type { WidgetItem, SheetWidgetId } from "@/dashboard/useWidgetItems";

// ── Console sidebar: full-height nav (icons + labels + live summaries + key hints) ──
export default function ConsoleSidebar({
  items,
  selectedId,
  onSelect,
  onExpand,
}: {
  items: WidgetItem[];
  selectedId: SheetWidgetId | null;
  onSelect: (id: SheetWidgetId) => void;
  onExpand: () => void;
}) {
  return (
    <nav
      aria-label="Widgets"
      className="absolute left-0 top-0 bottom-0 w-[280px] z-30 flex flex-col border-r border-white/10 animate-slide-in-left"
      style={{ background: "rgba(0,0,0,0.62)", backdropFilter: "blur(24px) saturate(1.4)", WebkitBackdropFilter: "blur(24px) saturate(1.4)" }}
    >
      <div className="px-5 pt-6 pb-4 flex items-center gap-2.5">
        <span className="text-white/90 text-sm font-semibold tracking-wide">SUITE</span>
        <span className="text-[10px] text-white/35 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full font-mono">
          console
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-2" role="listbox" aria-label="Widget list">
        {items.map((item, idx) => {
          const selected = item.id === selectedId;
          return (
            <button
              key={item.id}
              data-console-nav={item.id}
              role="option"
              aria-selected={selected}
              onClick={() => { onSelect(item.id); onExpand(); }}
              onMouseMove={() => { if (!selected) onSelect(item.id); }}
              className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors tap-scale focus-ring ${
                selected ? "bg-white/10 border border-white/15" : "border border-transparent hover:bg-white/[0.05]"
              }`}
            >
              <span className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${selected ? "bg-white/10" : "bg-white/[0.05]"}`}>
                <item.icon size={15} className={selected ? "text-white/90" : "text-white/55"} />
              </span>
              <span className="flex-1 min-w-0">
                <span className={`block text-[10px] uppercase tracking-[0.12em] font-medium ${selected ? "text-white/60" : "text-white/35"}`}>
                  {item.label}
                </span>
                <span className="block text-[13px] text-white/85 font-medium truncate">{item.summary}</span>
              </span>
              <kbd className="kbd flex-shrink-0">{idx + 1 <= 9 ? idx + 1 : "·"}</kbd>
            </button>
          );
        })}
        {items.length === 0 && (
          <div className="text-white/30 text-xs text-center py-6">
            No widgets enabled — turn some on in Settings → Widgets
          </div>
        )}
      </div>

      <div className="px-5 py-3 border-t border-white/10 text-[11px] text-white/30 leading-relaxed font-mono">
        <span className="kbd">j</span>/<span className="kbd">k</span> move · <span className="kbd">⏎</span> focus · <span className="kbd">/</span> search
      </div>
    </nav>
  );
}
