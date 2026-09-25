import { useEffect } from "react";
import type { SheetWidgetId } from "@/dashboard/useWidgetItems";

export function focusOrbitSatellite(id: string) {
  document.querySelector<HTMLElement>(`[data-orbit-sat="${id}"]`)?.focus();
}

// ── Orbit keyboard model ──
// Tab / arrows cycle satellites, Enter opens, 1-9 jump.
// Inert while typing or while any overlay is open.
export function useOrbitKeys(opts: {
  enabled: boolean;
  suspended: boolean;
  items: { id: SheetWidgetId }[];
  focusedId: SheetWidgetId | null;
  onFocus: (id: SheetWidgetId) => void;
  onOpen: (id: SheetWidgetId) => void;
}) {
  const { enabled, suspended, items, focusedId, onFocus, onOpen } = opts;

  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (suspended) return;
      const t = e.target as HTMLElement | null;
      const typing =
        !!t &&
        (t.tagName === "INPUT" ||
          t.tagName === "TEXTAREA" ||
          t.tagName === "SELECT" ||
          t.isContentEditable);
      if (typing) return;

      const idx = items.findIndex((i) => i.id === focusedId);
      const move = (dir: 1 | -1) => {
        if (items.length === 0) return;
        const next = items[(idx + dir + items.length) % items.length];
        onFocus(next.id);
        focusOrbitSatellite(next.id);
      };

      if (e.key === "Tab") {
        e.preventDefault();
        move(e.shiftKey ? -1 : 1);
      } else if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        move(1);
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        move(-1);
      } else if (e.key === "Enter" || e.key === " ") {
        const cur = items[idx] ?? items[0];
        if (cur) {
          e.preventDefault();
          onOpen(cur.id);
        }
      } else if (/^[1-9]$/.test(e.key)) {
        const item = items[Number(e.key) - 1];
        if (item) {
          e.preventDefault();
          onFocus(item.id);
          focusOrbitSatellite(item.id);
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [enabled, suspended, items, focusedId, onFocus, onOpen]);
}
