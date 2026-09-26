// ── Suite v2 "Suite" shell: the original first-built dashboard, ported ──
// Faithful port of the first build (specification folder src/App.tsx → Center +
// TopBar + BottomDock): floating dark-glass widget cards down the left edge,
// Frost-style hero clock + greeting + daily quote centered, magnification dock
// across the bottom. Every feature and storage key stays identical — cards open
// the shared WidgetDialog, TopBar/Dock/Settings/palette stay mounted by App.

import { useNow } from "@/shared/time";
import Clock from "@/dashboard/Clock";
import RectangleClock from "@/dashboard/suite/RectangleClock";
import type { SheetWidgetId, WidgetItem } from "@/dashboard/useWidgetItems";
import type { DashboardDisplaySettings } from "@/shared/types";

function greetingFor(hour: number) {
  if (hour < 6) return "Good night";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function SuiteBoard({
  items,
  display,
  quote,
  dimmed,
  onOpenWidget,
}: {
  items: WidgetItem[];
  display: DashboardDisplaySettings;
  quote: { text: string; author: string } | null;
  dimmed: boolean;
  onOpenWidget: (id: SheetWidgetId) => void;
}) {
  const now = useNow(1000);
  const hour = now.getHours();

  return (
    <>
      {/* Sidebar widgets — floating frosted-glass cards */}
      <aside
        className="absolute left-5 top-20 bottom-28 z-30 flex flex-col gap-2 w-[210px] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {items.map((item, idx) => (
          <button
            key={item.id}
            onClick={() => onOpenWidget(item.id)}
            className="widget-frost-light rounded-2xl p-3 text-left tap-scale focus-ring flex items-center gap-3"
            style={{ animation: `slideInLeft 0.4s cubic-bezier(0.2,0.8,0.2,1) ${idx * 60}ms both` }}
          >
            <span className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 bg-white/[0.07]">
              <item.icon size={16} className="text-white/75" />
            </span>
            <span className="min-w-0">
              <span className="block text-[10px] uppercase tracking-[0.12em] text-white/40 font-medium">{item.label}</span>
              <span className="block text-[13px] text-white/90 font-semibold truncate">{item.summary}</span>
            </span>
          </button>
        ))}
      </aside>

      {/* Center: clock + greeting + quote (fades out while a modal is open so nothing bleeds through the panel) */}
      <main className={`absolute inset-0 flex flex-col items-center justify-center px-4 z-10 pointer-events-none transition-opacity duration-300 ${dimmed ? "opacity-0" : "opacity-100"}`}>
        <div className="pointer-events-auto flex flex-col items-center animate-fade-in">
          <div className="animate-slide-in-up" style={{ animationDelay: "100ms" }}>
            {display.clockStyle === "rectangle" ? <RectangleClock display={display} /> : <Clock display={display} />}
          </div>
          {display.showGreeting && (
            <div
              className="mt-3 text-center text-white/90 text-sm font-light tracking-wide drop-shadow-[0_1px_4px_rgba(0,0,0,0.6)] animate-slide-in-up"
              style={{ animationDelay: "200ms" }}
            >
              {display.customGreeting || greetingFor(hour)}
            </div>
          )}
          {quote && (
            <div className="mt-6 max-w-3xl px-6 text-center animate-fade-in" style={{ animationDelay: "300ms" }}>
              <div className="text-xl italic text-white/90" style={{ textShadow: "0 1px 6px rgba(0,0,0,0.6)" }}>"{quote.text}"</div>
              <div className="mt-2 text-xs text-white/60 uppercase" style={{ letterSpacing: "0.22em" }}>— {quote.author}</div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
