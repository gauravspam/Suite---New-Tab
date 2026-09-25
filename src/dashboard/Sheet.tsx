import { ChevronRight } from "lucide-react";
import { useWidgetItems, type SheetWidgetId } from "@/dashboard/useWidgetItems";
import type { DashboardWidgetVisibility } from "@/shared/types";

export type { SheetWidgetId } from "@/dashboard/useWidgetItems";

export default function Sheet({
  widgets,
  onOpen,
  expanded,
  setExpanded,
}: {
  widgets: DashboardWidgetVisibility;
  onOpen: (id: SheetWidgetId) => void;
  expanded: boolean;
  setExpanded: (v: boolean) => void;
}) {
  const items = useWidgetItems(widgets);

  return (
    <div className="absolute bottom-0 left-0 right-0 z-30 flex flex-col items-center pointer-events-none">
      <div className="sheet-panel w-full pointer-events-auto">
        {/* Handle */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full pt-2.5 pb-1 flex flex-col items-center gap-1.5 tap-scale"
          aria-expanded={expanded}
          aria-label={expanded ? "Collapse widgets" : "Expand widgets"}
        >
          <span className="w-10 h-1 rounded-full bg-white/25" />
          {!expanded && (
            <span className="flex gap-4 overflow-x-auto max-w-full px-4 pb-1 whitespace-nowrap animate-fade-in">
              {items.map((item) => (
                <span key={item.id} className="masthead-text !text-white/45">
                  {item.label} <span className="text-white/75 normal-case tracking-normal">{item.summary}</span>
                </span>
              ))}
            </span>
          )}
        </button>

        {/* Panel */}
        <div
          className="overflow-hidden transition-all duration-300 cubic-bezier(0.2,0.8,0.2,1)"
          style={{ maxHeight: expanded ? "46vh" : 0, opacity: expanded ? 1 : 0 }}
        >
          <div className="px-4 pb-4 pt-1 grid grid-cols-1 sm:grid-cols-2 gap-x-6">
            {items.map((item, idx) => (
              <button
                key={item.id}
                onClick={() => onOpen(item.id)}
                className="ghost-row flex items-center gap-3 py-2.5 text-left tap-scale animate-slide-in-up"
                style={{ animationDelay: `${idx * 40}ms` }}
              >
                <item.icon size={15} className="text-white/50 flex-shrink-0" />
                <span className="masthead-text flex-shrink-0 w-24">{item.label}</span>
                <span className="flex-1 text-[13px] text-white/85 truncate">{item.summary}</span>
                <ChevronRight size={13} className="text-white/25 flex-shrink-0" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
