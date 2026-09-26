import { useNow, periodLabel } from "@/shared/time";
import type { DashboardDisplaySettings } from "@/shared/types";
import { DEFAULT_DISPLAY } from "@/shared/types";

export default function Clock({ display }: { display: DashboardDisplaySettings }) {
  const now = useNow(1000);
  const safe = { ...DEFAULT_DISPLAY, ...(display || {}) };

  const h24 = now.getHours();
  const mins = now.getMinutes().toString().padStart(2, "0");
  const h12 = h24 % 12 || 12;
  const hours =
    safe.timeFormat === "12h" ? h12.toString().padStart(2, "0") : h24.toString().padStart(2, "0");
  const label = safe.customGreeting || periodLabel(h24);
  const size = Math.max(Number(safe.fontSize) || 100, 90);

  const labelEl = safe.showGreeting ? (
    <div
      className="mb-4 text-[13px] uppercase text-white/95"
      style={{ letterSpacing: "0.35em", textIndent: "0.35em", fontWeight: 500, textShadow: "0 1px 8px rgba(0,0,0,0.55)" }}
    >
      {label}
    </div>
  ) : null;

  if (safe.clockStyle === "analog") {
    const sec = now.getSeconds() * 6;
    const min = now.getMinutes() * 6 + now.getSeconds() * 0.1;
    const hr = (h24 % 12) * 30 + now.getMinutes() * 0.5;
    const s = Math.max(190, Math.round(size * 1.9));
    return (
      <div className="text-center select-none flex flex-col items-center">
        {labelEl}
        <div
          className="relative rounded-full"
          style={{ width: s, height: s, background: "rgba(255,255,255,0.14)", backdropFilter: "blur(22px)", WebkitBackdropFilter: "blur(22px)", border: "1px solid rgba(255,255,255,0.25)", boxShadow: "0 8px 32px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.25)" }}
        >
          {Array.from({ length: 12 }).map((_, i) => {
            const a = (i * 30 * Math.PI) / 180;
            const quarter = i % 3 === 0;
            const rOuter = s / 2 - 10;
            const rInner = rOuter - (quarter ? 12 : 7);
            return (
              <div
                key={i}
                className="absolute left-1/2 top-1/2 rounded-full"
                style={{
                  width: quarter ? 3 : 2,
                  height: quarter ? 3 : 2,
                  background: quarter ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.35)",
                  transform: `translate(-50%,-50%) translate(${Math.sin(a) * ((rOuter + rInner) / 2)}px, ${-Math.cos(a) * ((rOuter + rInner) / 2)}px)`,
                }}
              />
            );
          })}
          <div className="absolute left-1/2 top-1/2 bg-white rounded-full origin-bottom" style={{ width: 3, height: "26%", transform: `translate(-50%,-100%) rotate(${hr}deg)` }} />
          <div className="absolute left-1/2 top-1/2 bg-white rounded-full origin-bottom" style={{ width: 2, height: "36%", transform: `translate(-50%,-100%) rotate(${min}deg)` }} />
          <div className="absolute left-1/2 top-1/2 bg-white/70 rounded-full origin-bottom" style={{ width: 1, height: "38%", transform: `translate(-50%,-100%) rotate(${sec}deg)` }} />
          <div className="absolute left-1/2 top-1/2 rounded-full bg-white" style={{ width: 8, height: 8, transform: "translate(-50%,-50%)" }} />
        </div>
      </div>
    );
  }

  // halo — frosted glass rectangle, mini analog face, white border draws
  // one lap per minute as the seconds hand (Frost reference look)
  if (safe.clockStyle === "halo") {
    const sec = now.getSeconds();
    const min = now.getMinutes() * 6 + sec * 0.1;
    const hr = (h24 % 12) * 30 + now.getMinutes() * 0.5;
    const w = Math.max(250, Math.round(size * 2.7));
    const h = Math.max(150, Math.round(size * 1.6));
    return (
      <div className="text-center select-none flex flex-col items-center">
        {labelEl}
        <div
          className="relative flex items-center justify-center"
          style={{ width: w, height: h, borderRadius: 28, background: "rgba(255,255,255,0.16)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", border: "1px solid rgba(255,255,255,0.28)", boxShadow: "0 8px 32px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.3)", overflow: "hidden" }}
        >
          <div className="absolute top-0 left-8 right-8 h-[2px] rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.18)" }}>
            <div className="glass-sheen h-full w-1/2 rounded-full" style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.9), transparent)" }} />
          </div>
          <div className="relative" style={{ width: 90, height: 90 }}>
            <div className="absolute left-1/2 top-1/2 bg-white rounded-full origin-bottom" style={{ width: 3, height: "32%", transform: `translate(-50%,-100%) rotate(${hr}deg)` }} />
            <div className="absolute left-1/2 top-1/2 bg-white rounded-full origin-bottom" style={{ width: 2, height: "46%", transform: `translate(-50%,-100%) rotate(${min}deg)` }} />
            <div className="absolute left-1/2 top-1/2 bg-white/80 rounded-full origin-bottom" style={{ width: 1, height: "48%", transform: `translate(-50%,-100%) rotate(${sec * 6}deg)` }} />
            <div className="absolute left-1/2 top-1/2 rounded-full bg-white" style={{ width: 7, height: 7, transform: "translate(-50%,-50%)" }} />
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

  if (safe.clockStyle === "glass") {    const sec = now.getSeconds() * 6;
    const min = now.getMinutes() * 6 + now.getSeconds() * 0.1;
    const hr = (h24 % 12) * 30 + now.getMinutes() * 0.5;
    const w = Math.max(250, Math.round(size * 2.7));
    const h = Math.max(150, Math.round(size * 1.6));
    return (
      <div className="text-center select-none flex flex-col items-center">
        {labelEl}
        <div
          className="relative flex items-center justify-center"
          style={{ width: w, height: h, borderRadius: 28, background: "rgba(255,255,255,0.16)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", border: "1px solid rgba(255,255,255,0.28)", boxShadow: "0 8px 32px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.3)", overflow: "hidden" }}
        >
          <div className="absolute top-0 left-8 right-8 h-[2px] rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.18)" }}>
            <div className="glass-sheen h-full w-1/2 rounded-full" style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.9), transparent)" }} />
          </div>
          <div className="relative" style={{ width: 90, height: 90 }}>
            <div className="absolute left-1/2 top-1/2 bg-white rounded-full origin-bottom" style={{ width: 3, height: "32%", transform: `translate(-50%,-100%) rotate(${hr}deg)` }} />
            <div className="absolute left-1/2 top-1/2 bg-white rounded-full origin-bottom" style={{ width: 2, height: "46%", transform: `translate(-50%,-100%) rotate(${min}deg)` }} />
            <div className="absolute left-1/2 top-1/2 bg-white/80 rounded-full origin-bottom" style={{ width: 1, height: "48%", transform: `translate(-50%,-100%) rotate(${sec}deg)` }} />
            <div className="absolute left-1/2 top-1/2 rounded-full bg-white" style={{ width: 7, height: 7, transform: "translate(-50%,-50%)" }} />
          </div>
        </div>
      </div>
    );
  }

  if (safe.clockStyle === "thin") {
    return (
      <div className="text-center select-none">
        {labelEl}
        <div className="tabular-nums leading-none text-white flex items-baseline justify-center" style={{ fontSize: size + 24, fontWeight: 100, letterSpacing: "0.02em", textShadow: "0 2px 16px rgba(0,0,0,0.55)" }}>
          <span>{hours}</span><span className="mx-2 opacity-80">:</span><span>{mins}</span>
        </div>
      </div>
    );
  }

  if (safe.clockStyle === "outline") {
    return (
      <div className="text-center select-none">
        {labelEl}
        <div
          className="tabular-nums leading-none flex items-baseline justify-center"
          style={{ fontSize: size + 28, fontWeight: 700, letterSpacing: "0.02em", color: "transparent", WebkitTextStroke: "2px rgba(255,255,255,0.95)", filter: "drop-shadow(0 2px 10px rgba(0,0,0,0.5))", paintOrder: "stroke fill" }}
        >
          <span>{hours}</span><span className="mx-1">:</span><span>{mins}</span>
        </div>
      </div>
    );
  }

  if (safe.clockStyle === "modern") {
    return (
      <div className="text-center select-none">
        {labelEl}
        <div className="tabular-nums leading-none flex items-baseline justify-center" style={{ fontSize: size + 24, fontWeight: 800, letterSpacing: "0.01em", color: "rgba(255,255,255,0.65)", textShadow: "0 2px 14px rgba(0,0,0,0.45)" }}>
          <span>{hours}</span><span className="mx-1">:</span><span>{mins}</span>
        </div>
      </div>
    );
  }

  // bold (default) — gradient reference look
  return (
    <div className="text-center select-none">
      {labelEl}
      <div
        className="tabular-nums leading-none flex items-baseline justify-center font-black"
        style={{
          fontSize: size + 60, letterSpacing: "0.01em",
          background: "linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.55) 100%)",
          WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent",
          filter: "drop-shadow(0 2px 14px rgba(0,0,0,0.5))",
        }}
      >
        <span>{hours}</span><span className="mx-2">:</span><span>{mins}</span>
        {safe.timeFormat === "12h" && <span className="ml-4" style={{ fontSize: "0.9em" }}>{h24 >= 12 ? "PM" : "AM"}</span>}
      </div>
    </div>
  );
}
