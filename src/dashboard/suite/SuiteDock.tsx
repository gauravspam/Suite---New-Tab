// ── Suite v1 Port: SuiteDock ──
// Frost-style separated dock tiles (no capsule container)
// Same shortcuts + magnification engine as shared Dock

import { useState, type CSSProperties } from "react";
import { Grid } from "lucide-react";
import { STORAGE_KEYS, useChromeStorage } from "@/shared/storage";
import {
  DEFAULT_SHORTCUTS,
  DEFAULT_SUITE_PREFS,
  DEFAULT_WIDGETS,
  type DashboardWidgetVisibility,
  type SuitePrefs,
} from "@/shared/types";

interface Shortcut {
  id: string;
  name: string;
  url: string;
}

function favicon(url: string) {
  try {
    return `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=64`;
  } catch {
    return "";
  }
}

const tileGlass: CSSProperties = {
  background: "rgba(0,0,0,0.35)",
  backdropFilter: "blur(20px) saturate(1.4)",
  WebkitBackdropFilter: "blur(20px) saturate(1.4)",
};

export default function SuiteDock({ onOpenAll }: { onOpenAll: () => void }) {
  const [shortcuts] = useChromeStorage<Shortcut[]>(STORAGE_KEYS.DASHBOARD_SHORTCUTS, DEFAULT_SHORTCUTS);
  const [prefs] = useChromeStorage<SuitePrefs>(STORAGE_KEYS.SUITE_PREFS, DEFAULT_SUITE_PREFS);
  const [widgets] = useChromeStorage<DashboardWidgetVisibility>(STORAGE_KEYS.DASHBOARD_WIDGETS, DEFAULT_WIDGETS);
  const [magnet, setMagnet] = useState<number | null>(null);
  const magnification = prefs.dockMagnification ?? true;

  if (widgets.quickAccessDock === false) return null;

  const list = (Array.isArray(shortcuts) ? shortcuts : []).slice(0, 12);

  function onMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!magnification || list.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setMagnet(((e.clientX - rect.left) / rect.width) * list.length - 0.5);
  }

  function scale(idx: number) {
    if (magnet === null || !magnification) return 1;
    const d = Math.abs(idx - magnet);
    if (d >= 1.8) return 1;
    const t = 1 - d / 1.8;
    return 1 + 0.9 * t * t;
  }

  return (
    <div
      className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 animate-slide-in-up"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-end gap-3">
        <div
          className="flex items-end gap-3"
          onMouseMove={onMove}
          onMouseLeave={() => setMagnet(null)}
        >
          {list.map((s, idx) => {
            const k = scale(idx);
            return (
              <a
                key={s.id}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                title={s.name}
                className="w-12 h-12 rounded-2xl border border-white/10 flex items-center justify-center"
                style={{
                  ...tileGlass,
                  transform: `scale(${k}) translateY(${-(k - 1) * 18}px)`,
                  transition: magnet === null ? "transform 0.25s cubic-bezier(0.2,0.8,0.2,1)" : "transform 0.08s linear",
                  transformOrigin: "bottom center",
                }}
              >
                <img
                  src={favicon(s.url)}
                  alt={s.name}
                  className="pointer-events-none"
                  style={{ width: 20 * k, height: 20 * k }}
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                />
              </a>
            );
          })}
        </div>
        <button
          onClick={onOpenAll}
          onMouseEnter={() => setMagnet(null)}
          title="All shortcuts"
          className="w-12 h-12 rounded-2xl border border-white/10 flex items-center justify-center text-white/65 hover:text-white/85 tap-scale"
          style={tileGlass}
        >
          <Grid size={18} />
        </button>
      </div>
    </div>
  );
}

interface Shortcut {
  id: string;
  name: string;
  url: string;
}