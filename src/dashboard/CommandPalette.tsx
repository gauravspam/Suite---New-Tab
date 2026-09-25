import { useState, useEffect, useMemo, useRef } from "react";
import {
  Calendar as CalendarIcon, CheckSquare, Cloud, Command, CornerDownLeft,
  Flame, GitBranch, Globe, Link2, Monitor, Search, Settings2,
  StickyNote, Timer,
} from "lucide-react";
import { STORAGE_KEYS, useChromeStorage, getStorage, setStorage } from "@/shared/storage";
import {
  DEFAULT_AI_AGENTS, DEFAULT_SHORTCUTS, DEFAULT_SUITE_PREFS,
  type DashboardAiAgent,
} from "@/shared/types";
import { GOOGLE_APPS, agentIconFor } from "@/dashboard/TopBar";
import type { SheetWidgetId } from "@/dashboard/useWidgetItems";

interface Shortcut {
  id: string;
  name: string;
  url: string;
}

interface Item {
  id: string;
  group: string;
  label: string;
  hint?: string;
  icon: React.ReactNode;
  run: () => void;
}

const SEARCH_ENGINES: Record<string, string> = {
  Google: "https://www.google.com/search?q=",
  DuckDuckGo: "https://duckduckgo.com/?q=",
  Bing: "https://www.bing.com/search?q=",
  Brave: "https://search.brave.com/search?q=",
};

const WIDGETS: { id: SheetWidgetId; label: string; icon: React.ReactNode }[] = [
  { id: "date", label: "Calendar", icon: <CalendarIcon size={14} className="text-white/60" /> },
  { id: "weather", label: "Weather", icon: <Cloud size={14} className="text-white/60" /> },
  { id: "tasks", label: "Tasks", icon: <CheckSquare size={14} className="text-white/60" /> },
  { id: "notes", label: "Notes", icon: <StickyNote size={14} className="text-white/60" /> },
  { id: "pomodoro", label: "Pomodoro", icon: <Timer size={14} className="text-white/60" /> },
  { id: "github", label: "GitHub", icon: <GitBranch size={14} className="text-white/60" /> },
  { id: "system", label: "System", icon: <Monitor size={14} className="text-white/60" /> },
  { id: "habits", label: "Habits", icon: <Flame size={14} className="text-white/60" /> },
  { id: "worldClock", label: "World Clock", icon: <Globe size={14} className="text-white/60" /> },
];

const SETTING_TABS = [
  "background", "display", "weather", "widgets", "github",
  "prefs", "discard", "dimmer", "yt", "backup",
];

export default function CommandPalette({
  onClose,
  onOpenWidget,
  onOpenSettings,
}: {
  onClose: () => void;
  onOpenWidget: (id: SheetWidgetId) => void;
  onOpenSettings: (tab: string) => void;
}) {
  const [shortcuts] = useChromeStorage<Shortcut[]>(STORAGE_KEYS.DASHBOARD_SHORTCUTS, DEFAULT_SHORTCUTS);
  const [agents] = useChromeStorage<DashboardAiAgent[]>(STORAGE_KEYS.DASHBOARD_AI_AGENTS, DEFAULT_AI_AGENTS);
  const [prefs] = useChromeStorage(STORAGE_KEYS.SUITE_PREFS, DEFAULT_SUITE_PREFS);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const items: Item[] = useMemo(() => {
    const q = query.trim().toLowerCase();
    const match = (s: string) => !q || s.toLowerCase().includes(q);
    const out: Item[] = [];

    for (const s of Array.isArray(shortcuts) ? shortcuts : []) {
      if (!match(s.name) && !match(s.url)) continue;
      out.push({
        id: `sc-${s.id}`, group: "Shortcuts", label: s.name, hint: "Open link",
        icon: <Link2 size={14} className="text-white/60" />,
        run: () => window.open(s.url, "_blank", "noopener"),
      });
    }
    for (const a of Array.isArray(agents) ? agents : []) {
      if (!match(a.name)) continue;
      const Icon = agentIconFor(a);
      out.push({
        id: `ag-${a.id}`, group: "AI Agents", label: a.name, hint: "Open agent",
        icon: <span style={{ color: a.color }}><Icon size={14} /></span>,
        run: () => window.open(a.url, "_blank", "noopener"),
      });
    }
    for (const g of GOOGLE_APPS) {
      if (!match(g.name)) continue;
      out.push({
        id: `ga-${g.name}`, group: "Google Apps", label: g.name, hint: "Open app",
        icon: (
          <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" className="text-white/60">
            <path d={g.icon} />
          </svg>
        ),
        run: () => window.open(g.url, "_blank", "noopener"),
      });
    }
    for (const w of WIDGETS) {
      if (!match(w.label)) continue;
      out.push({
        id: `w-${w.id}`, group: "Widgets", label: w.label, hint: "Open widget",
        icon: w.icon, run: () => onOpenWidget(w.id),
      });
    }
    for (const t of SETTING_TABS) {
      if (!match(t) && !match("settings")) continue;
      out.push({
        id: `st-${t}`, group: "Settings", label: `Settings → ${t}`, hint: "Open settings",
        icon: <Settings2 size={14} className="text-white/60" />,
        run: () => onOpenSettings(t),
      });
    }
    if (!q) {
      out.push({
        id: "act-fs", group: "Actions", label: "Toggle full screen", hint: "Action",
        icon: <Command size={14} className="text-white/60" />,
        run: () => {
          if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
          else document.documentElement.requestFullscreen().catch(() => {});
        },
      });
      out.push({
        id: "act-dim", group: "Actions", label: "Toggle dimmer", hint: "Action",
        icon: <Command size={14} className="text-white/60" />,
        run: async () => {
          try {
            const s: any = await getStorage("dimmer.settings", { enabled: false });
            await setStorage("dimmer.settings", { ...s, enabled: !s.enabled });
          } catch { /* ignore */ }
        },
      });
    }

    // Rank: starts-with first, then alphabetical within group order
    const starts = (s: string) => s.toLowerCase().startsWith(q);
    return out
      .sort((a, b) => Number(starts(b.label)) - Number(starts(a.label)))
      .slice(0, 12);
  }, [query, shortcuts, agents, onOpenWidget, onOpenSettings]);

  useEffect(() => setActive(0), [query]);
  useEffect(() => {
    listRef.current?.querySelector(`[data-idx="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const engine = SEARCH_ENGINES[prefs.defaultSearchEngine || "Google"] || SEARCH_ENGINES.Google;

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(items.length - 1, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = items[active];
      if (item) {
        item.run();
        onClose();
      } else if (query.trim()) {
        openSearch(query.trim());
      }
    }
  }

  function openSearch(q: string) {
    const url = /^[^\s]+\.[^\s]{2,}$/.test(q) && !q.includes(" ")
      ? (q.startsWith("http") ? q : `https://${q}`)
      : `${engine}${encodeURIComponent(q)}`;
    window.open(url, "_blank", "noopener");
    onClose();
  }

  let lastGroup = "";

  return (
    <div className="fixed inset-0 z-[70] flex justify-center pt-[18vh] animate-fade-in" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-md" />
      <div
        className="relative surface-modal rounded-2xl w-full max-w-xl mx-4 h-fit max-h-[60vh] flex flex-col overflow-hidden animate-scale-in-bounce"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Command bar"
      >
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/10">
          <Search size={15} className="text-white/40 flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Type a command, link, or search…"
            className="flex-1 bg-transparent text-[15px] text-white placeholder-white/30 outline-none"
          />
          <kbd className="text-[10px] text-white/30 bg-white/5 border border-white/10 rounded px-1.5 py-0.5">esc</kbd>
        </div>
        <div ref={listRef} className="overflow-y-auto p-2">
          {items.map((item, idx) => {
            const header = item.group !== lastGroup ? item.group : null;
            lastGroup = item.group;
            return (
              <div key={item.id}>
                {header && (
                  <div className="px-3 pt-2 pb-1 text-[10px] uppercase tracking-[0.15em] text-white/30 font-medium">{header}</div>
                )}
                <button
                  data-idx={idx}
                  onClick={() => { item.run(); onClose(); }}
                  onMouseMove={() => setActive(idx)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left tap-scale ${
                    idx === active ? "bg-white/10" : ""
                  }`}
                >
                  <span className="flex-shrink-0 w-6 flex justify-center">{item.icon}</span>
                  <span className="flex-1 text-sm text-white/85 truncate">{item.label}</span>
                  {idx === active && <CornerDownLeft size={12} className="text-white/30 flex-shrink-0" />}
                </button>
              </div>
            );
          })}
          {items.length === 0 && query.trim() && (
            <button
              onClick={() => openSearch(query.trim())}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left bg-white/10 tap-scale"
            >
              <Search size={14} className="text-white/60" />
              <span className="text-sm text-white/85">Search {prefs.defaultSearchEngine || "Google"} for "{query.trim()}"</span>
            </button>
          )}
          {items.length === 0 && !query.trim() && (
            <div className="text-white/30 text-xs text-center py-5">Start typing to search everything</div>
          )}
        </div>
      </div>
    </div>
  );
}
