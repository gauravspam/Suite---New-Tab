// ── Suite v2 shared clock hook — one interval per app, paused when hidden ──
import { useState, useEffect } from "react";

export function useNow(intervalMs = 1000): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (typeof document !== "undefined" && document.hidden) return;
    const id = setInterval(() => setNow(new Date()), intervalMs);
    const onVis = () => {
      if (!document.hidden) setNow(new Date());
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [intervalMs]);

  return now;
}

export function periodLabel(hours: number): string {
  if (hours >= 5 && hours < 12) return "GOOD MORNING";
  if (hours >= 12 && hours < 17) return "GOOD AFTERNOON";
  if (hours >= 17 && hours < 21) return "GOOD EVENING";
  return "GOOD NIGHT";
}
