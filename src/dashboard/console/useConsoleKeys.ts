import { useEffect, useState } from "react";
import type { SheetWidgetId } from "@/dashboard/useWidgetItems";

function focusNavButton(id: string) {
  document.querySelector<HTMLElement>(`[data-console-nav="${id}"]`)?.focus();
}

function focusInspectorFirst() {
  const root = document.querySelector<HTMLElement>("[data-inspector]");
  if (!root) return;
  const target = root.querySelector<HTMLElement>(
    "button, input, select, textarea, a[href], [tabindex]:not([tabindex='-1'])"
  );
  (target ?? root).focus();
}

// ── Console keyboard model ──
// j/k or arrows move, 1-9 jump, Enter opens the widget modal, l focuses inspector, Esc back to nav, / searches.
// Inert while typing or while palette/settings/shortcuts overlays are open.
export function useConsoleKeys(opts: {
  enabled: boolean;
  suspended: boolean;
  items: { id: SheetWidgetId }[];
  selectedId: SheetWidgetId | null;
  onSelect: (id: SheetWidgetId) => void;
  onOpen: (id: SheetWidgetId) => void;
  onOpenPalette: () => void;
}) {
  const { enabled, suspended, items, selectedId, onSelect, onOpen, onOpenPalette } = opts;

  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (suspended) return;
      const t = e.target as HTMLElement | null;
      const typing =
        !!t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable);

      if (e.key === "Escape") {
        if (typing) (t as HTMLElement).blur();
        const sel = selectedId ?? items[0]?.id;
        if (sel) {
          onSelect(sel);
          focusNavButton(sel);
        }
        return;
      }
      if (typing || e.ctrlKey || e.metaKey || e.altKey) return;

      const idx = items.findIndex((i) => i.id === selectedId);
      const move = (dir: 1 | -1) => {
        if (items.length === 0) return;
        const next = items[(idx + dir + items.length) % items.length];
        onSelect(next.id);
        focusNavButton(next.id);
      };

      if (e.key === "j" || e.key === "ArrowDown") {
        e.preventDefault();
        move(1);
      } else if (e.key === "k" || e.key === "ArrowUp") {
        e.preventDefault();
        move(-1);
      } else if (e.key === "Enter") {
        e.preventDefault();
        const sel = selectedId ?? items[0]?.id;
        if (sel) onOpen(sel);
      } else if (e.key === "l") {
        e.preventDefault();
        focusInspectorFirst();
      } else if (e.key === "/") {
        e.preventDefault();
        onOpenPalette();
      } else if (/^[1-9]$/.test(e.key)) {
        const item = items[Number(e.key) - 1];
        if (item) {
          e.preventDefault();
          onSelect(item.id);
          focusNavButton(item.id);
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [enabled, suspended, items, selectedId, onSelect, onOpen, onOpenPalette]);
}

// ── Wide-screen guard: console needs room for sidebar + inspector ──
export function useWideScreen(minWidth = 1100): boolean {
  const [wide, setWide] = useState(
    () => typeof window === "undefined" || window.innerWidth >= minWidth
  );
  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${minWidth}px)`);
    const onChange = () => setWide(mq.matches);
    setWide(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [minWidth]);
  return wide;
}
