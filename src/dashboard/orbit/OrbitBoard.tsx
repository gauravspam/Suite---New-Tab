import { useEffect, useState } from "react";
import Clock from "@/dashboard/Clock";
import { useOrbitKeys } from "@/dashboard/orbit/useOrbitKeys";
import type { SheetWidgetId, WidgetItem } from "@/dashboard/useWidgetItems";
import type { DashboardDisplaySettings } from "@/shared/types";

interface Quote {
  text: string;
  author: string;
}

// ── Orbit shell: clock sun at the center, widget satellites around it ──
// Hover, Tab or arrows pull a satellite into focus; Enter opens it.
export default function OrbitBoard({
  items,
  display,
  quote,
  suspended,
  dimmed,
  onOpenWidget,
}: {
  items: WidgetItem[];
  display: DashboardDisplaySettings;
  quote: Quote | null;
  suspended: boolean;
  dimmed: boolean;
  onOpenWidget: (id: SheetWidgetId) => void;
}) {
  const [vp, setVp] = useState(() => ({
    w: typeof window !== "undefined" ? window.innerWidth : 1280,
    h: typeof window !== "undefined" ? window.innerHeight : 800,
  }));
  const [focusedId, setFocusedId] = useState<SheetWidgetId | null>(null);
  const focus = (id: SheetWidgetId) => setFocusedId(id);

  useEffect(() => {
    const onResize = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const focused = focusedId && items.some((i) => i.id === focusedId) ? focusedId : null;

  useOrbitKeys({
    enabled: true,
    suspended,
    items,
    focusedId: focused,
    onFocus: setFocusedId,
    onOpen: onOpenWidget,
  });

  const compact = vp.w < 720 || vp.h < 560;

  if (items.length === 0) {
    return (
      <main className="absolute inset-0 z-10 flex flex-col items-center justify-center px-6">
        <Clock display={display} />
        <p className="mt-6 text-white/30 text-sm">
          No widgets enabled — turn some on in Settings → Widgets
        </p>
      </main>
    );
  }

  if (compact) {
    return (
      <main className="absolute inset-0 z-10 overflow-y-auto px-6 pt-24 pb-10">
        <div className="flex flex-col items-center">
          <Clock display={{ ...display, fontSize: 40 }} />
          {quote && (
            <div className="mt-4 max-w-md text-center">
              <div className="font-display italic font-light text-white/75 text-[15px]">"{quote.text}"</div>
              <div className="mt-1 text-[10px] text-white/40 uppercase tracking-[0.2em]">— {quote.author}</div>
            </div>
          )}
          <div className="mt-8 grid grid-cols-2 gap-2 w-full max-w-md">
            {items.map((item) => (
              <Satellite
                key={item.id}
                item={item}
                active={focused === item.id}
                onFocus={() => focus(item.id)}
                onOpen={() => onOpenWidget(item.id)}
              />
            ))}
          </div>
        </div>
      </main>
    );
  }

  const n = items.length;
  const cx = vp.w / 2;
  const cy = vp.h * 0.46;
  const rx = Math.min(vp.w * 0.36, 560);
  const ry = Math.min(vp.h * 0.34, 380);

  return (
    <main className="absolute inset-0 z-10 overflow-hidden">
      {/* orbit rings */}
      <svg
        className="absolute pointer-events-none"
        style={{ left: cx - rx - 48, top: cy - ry - 48 }}
        width={(rx + 48) * 2}
        height={(ry + 48) * 2}
      >
        <ellipse
          cx={(rx + 48)}
          cy={(ry + 48)}
          rx={rx}
          ry={ry}
          fill="none"
          stroke="rgba(255,255,255,0.09)"
          strokeWidth="1"
        />
        <ellipse
          cx={(rx + 48)}
          cy={(ry + 48)}
          rx={rx * 1.18}
          ry={ry * 1.18}
          fill="none"
          stroke="rgba(255,255,255,0.05)"
          strokeWidth="1"
          strokeDasharray="3 7"
        />
        {items.map((_, i) => {
          const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
          return (
            <circle
              key={i}
              cx={rx + 48 + rx * Math.cos(a)}
              cy={ry + 48 + ry * Math.sin(a)}
              r="2"
              fill="rgba(255,255,255,0.22)"
            />
          );
        })}
      </svg>

      {/* center sun: clock + quote (fades only while a widget modal is open so it can't bleed through the panel) */}
      <div
        className={`absolute flex flex-col items-center text-center px-4 transition-opacity duration-300 ${dimmed ? "opacity-0" : "opacity-100"}`}
        style={{ left: cx, top: cy, transform: "translate(-50%, -50%)", maxWidth: Math.max(320, rx * 1.15) }}
      >
        <div className="animate-fade-in">
          <Clock display={display} />
        </div>
        {quote && (
          <div className="mt-4 animate-fade-in" style={{ animationDelay: "200ms" }}>
            <div className="font-display italic font-light text-white/75 text-[15px] leading-relaxed" style={{ textShadow: "0 1px 6px rgba(0,0,0,0.6)" }}>
              "{quote.text}"
            </div>
            <div className="mt-1.5 text-[10px] text-white/40 uppercase" style={{ letterSpacing: "0.22em" }}>
              — {quote.author}
            </div>
          </div>
        )}
      </div>

      {/* satellites */}
      {items.map((item, i) => {
        const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
        const depth = (Math.sin(a) + 1) / 2; // 0 top → 1 bottom
        const active = focused === item.id;
        const scale = (0.92 + 0.08 * depth) * (active ? 1.14 : 1);
        return (
          <div
            key={item.id}
            className="absolute animate-fade-in"
            style={{
              left: cx + rx * Math.cos(a),
              top: cy + ry * Math.sin(a),
              transform: "translate(-50%, -50%)",
              zIndex: active ? 30 : Math.round(10 + depth * 10),
              animationDelay: `${i * 70}ms`,
              opacity: 0.72 + 0.28 * depth,
            }}
          >
            <div style={{ transform: `scale(${scale})`, transition: "transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)" }}>
              <Satellite
                item={item}
                active={active}
                onFocus={() => focus(item.id)}
                onOpen={() => onOpenWidget(item.id)}
              />
            </div>
          </div>
        );
      })}
    </main>
  );
}

function Satellite({
  item,
  active,
  onFocus,
  onOpen,
}: {
  item: WidgetItem;
  active: boolean;
  onFocus: () => void;
  onOpen: () => void;
}) {
  return (
    <button
      data-orbit-sat={item.id}
      onClick={onOpen}
      onMouseEnter={onFocus}
      onFocus={onFocus}
      className={`w-44 rounded-2xl p-3 text-left tap-scale focus-ring widget-frost ${active ? "widget-frost-active" : ""}`}
    >
      <div className="flex items-center gap-2">
        <span className="w-7 h-7 rounded-lg bg-white/[0.07] flex items-center justify-center flex-shrink-0">
          <item.icon size={13} className="text-white/75" />
        </span>
        <span className="text-[10px] uppercase tracking-[0.12em] text-white/45 font-medium truncate">
          {item.label}
        </span>
      </div>
      <div className="mt-1.5 text-[13px] text-white/85 font-medium truncate">{item.summary}</div>
    </button>
  );
}
