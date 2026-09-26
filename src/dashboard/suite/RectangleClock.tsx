// ── Suite-only "Rectangle" clock ──
// Frosted glass panel with a mini analog face (hour + minute hands only —
// NO second hand). The white border is the seconds line: it draws one full
// lap per minute, gliding smoothly as seconds increase.
import { useNow, periodLabel } from "@/shared/time";
import { DEFAULT_DISPLAY, type DashboardDisplaySettings } from "@/shared/types";

export default function RectangleClock({ display }: { display: DashboardDisplaySettings }) {
  const now = useNow(1000);
  const safe = { ...DEFAULT_DISPLAY, ...(display || {}) };

  const sec = now.getSeconds();
  const min = now.getMinutes() * 6 + sec * 0.1;
  const hr = (now.getHours() % 12) * 30 + now.getMinutes() * 0.5;
  const label = safe.customGreeting || periodLabel(now.getHours());
  const size = Math.max(Number(safe.fontSize) || 100, 90);
  const w = Math.max(250, Math.round(size * 2.7));
  const h = Math.max(150, Math.round(size * 1.6));

  return (
    <div className="text-center select-none flex flex-col items-center">
      {safe.showGreeting && (
        <div
          className="mb-4 text-[13px] uppercase text-white/95"
          style={{ letterSpacing: "0.35em", textIndent: "0.35em", fontWeight: 500, textShadow: "0 1px 8px rgba(0,0,0,0.55)" }}
        >
          {label}
        </div>
      )}
      <div
        className="relative flex items-center justify-center"
        style={{ width: w, height: h, borderRadius: 28, background: "rgba(255,255,255,0.16)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", border: "1px solid rgba(255,255,255,0.28)", boxShadow: "0 8px 32px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.3)", overflow: "hidden" }}
      >
        <div className="absolute top-0 left-8 right-8 h-[2px] rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.18)" }}>
          <div className="glass-sheen h-full w-1/2 rounded-full" style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.9), transparent)" }} />
        </div>
        <div className="relative" style={{ width: 90, height: 90 }}>
          <div className="absolute left-1/2 top-1/2 bg-white rounded-full origin-bottom" style={{ width: 3, height: "32%", transform: `translate(-50%,-100%) rotate(${hr}deg)`, boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }} />
          <div className="absolute left-1/2 top-1/2 bg-white rounded-full origin-bottom" style={{ width: 2, height: "46%", transform: `translate(-50%,-100%) rotate(${min}deg)`, boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }} />
          <div className="absolute left-1/2 top-1/2 rounded-full bg-white shadow" style={{ width: 7, height: 7, transform: "translate(-50%,-50%)" }} />
        </div>
        <svg className="absolute inset-0 pointer-events-none" width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
          <rect
            x="2.5" y="2.5" width={w - 5} height={h - 5} rx="25.5" fill="none"
            stroke="rgba(255,255,255,0.95)" strokeWidth="2.5" strokeLinecap="round"
            pathLength={100} strokeDasharray="100" strokeDashoffset={100 - (sec / 60) * 100}
            style={{ filter: "drop-shadow(0 0 6px rgba(255,255,255,0.7))", transition: "stroke-dashoffset 1s linear" }}
          />
        </svg>
      </div>
    </div>
  );
}
