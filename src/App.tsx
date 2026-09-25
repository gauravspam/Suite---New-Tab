import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Grid, Plus, X } from "lucide-react";
import BackgroundLayer from "@/dashboard/BackgroundLayer";
import Clock from "@/dashboard/Clock";
import type { SheetWidgetId } from "@/dashboard/useWidgetItems";
import Dock from "@/dashboard/Dock";
import TopBar from "@/dashboard/TopBar";
import SettingsDrawer from "@/dashboard/SettingsDrawer";
import CommandPalette from "@/dashboard/CommandPalette";
import WidgetDialog from "@/dashboard/WidgetDialog";
import MapBoard from "@/dashboard/map/MapBoard";
import OrbitBoard from "@/dashboard/orbit/OrbitBoard";
import SuiteBoard from "@/dashboard/suite/SuiteBoard";
import Terminal from "@/dashboard/terminal/Terminal";
import type { TermCtx } from "@/dashboard/terminal/types";
import ConsoleSidebar from "@/dashboard/console/ConsoleSidebar";
import Inspector from "@/dashboard/console/Inspector";
import { useConsoleKeys, useWideScreen } from "@/dashboard/console/useConsoleKeys";
import { useWidgetItems } from "@/dashboard/useWidgetItems";
import { STORAGE_KEYS, useChromeStorage } from "@/shared/storage";
import { getQuoteForCategory } from "@/shared/quotes";
import {
  DEFAULT_DISPLAY,
  DEFAULT_SHORTCUTS,
  DEFAULT_SUITE_PREFS,
  DEFAULT_WIDGETS,
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

export default function App() {
  const [widgets, , loading] = useChromeStorage(STORAGE_KEYS.DASHBOARD_WIDGETS, DEFAULT_WIDGETS);
  const [display] = useChromeStorage(STORAGE_KEYS.DASHBOARD_DISPLAY, DEFAULT_DISPLAY);
  const [prefs, setPrefs] = useChromeStorage(STORAGE_KEYS.SUITE_PREFS, DEFAULT_SUITE_PREFS);
  const [shortcuts, setShortcuts] = useChromeStorage<Shortcut[]>(STORAGE_KEYS.DASHBOARD_SHORTCUTS, DEFAULT_SHORTCUTS);

  const [openWidget, setOpenWidget] = useState<SheetWidgetId | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<string>("background");
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [googleAppsOpen, setGoogleAppsOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [draft, setDraft] = useState({ name: "", url: "" });
  const [selectedId, setSelectedId] = useState<SheetWidgetId | null>(null);
  const [inspectorOpen, setInspectorOpen] = useState(true);

  const items = useWidgetItems(widgets);
  const effectiveSelected =
    selectedId && items.some((i) => i.id === selectedId) ? selectedId : (items[0]?.id ?? null);

  const wide = useWideScreen(1100);
  const layout = prefs.layout ?? "suite";
  // Narrow screens can't fit the console inspector — fall back to suite.
  // (A stored "editorial" pref from an older build lands on suite the same way.)
  const effective = layout === "console" && !wide ? "suite" : layout;
  const isTerminal = effective === "terminal";
  const isMap = effective === "map";
  const isOrbit = effective === "orbit";
  const isConsole = effective === "console";

  // Global command-bar hotkey
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useConsoleKeys({
    enabled: isConsole,
    suspended: paletteOpen || settingsOpen || shortcutsOpen || openWidget !== null,
    items,
    selectedId: effectiveSelected,
    onSelect: setSelectedId,
    onOpen: (id) => setOpenWidget(id),
    onOpenPalette: () => setPaletteOpen(true),
  });

  if (loading) return <div className="fixed inset-0 bg-black" />;

  const quote = getQuoteForCategory(prefs.quoteCategory || "General");

  function addShortcut() {
    if (!draft.name.trim() || !draft.url.trim()) return;
    setShortcuts((prev) => [
      ...prev,
      { id: Date.now().toString(), name: draft.name.trim(), url: draft.url.startsWith("http") ? draft.url : `https://${draft.url}` },
    ]);
    setDraft({ name: "", url: "" });
  }

  const topBar = (
    <TopBar
      widgets={widgets}
      aiOpen={aiOpen}
      setAiOpen={setAiOpen}
      googleAppsOpen={googleAppsOpen}
      setGoogleAppsOpen={setGoogleAppsOpen}
      showGoogleApps={prefs.showGoogleAppsButton ?? true}
      showFullscreen={prefs.showFullscreenButton ?? false}
      showCommand={prefs.showCommandBarButton ?? false}
      onOpenPalette={() => setPaletteOpen(true)}
      onOpenSettings={() => { setSettingsTab("background"); setSettingsOpen(true); }}
      navOffset={isConsole ? "left-[296px]" : "left-5"}
    />
  );

  const hero = (
    <div className={`pointer-events-auto transition-opacity duration-300 ${openWidget ? "opacity-0" : "opacity-100"}`}>
      <div className="animate-fade-in">
      <div className="animate-slide-in-up" style={{ animationDelay: "100ms" }}>
        <Clock display={display} />
      </div>
      {widgets.dailyQuote && (
        <div className="mt-5 max-w-2xl animate-fade-in" style={{ animationDelay: "300ms" }}>
          <div className="font-display italic font-light text-white/80 text-[15px] leading-relaxed" style={{ textShadow: "0 1px 6px rgba(0,0,0,0.6)" }}>
            "{quote.text}"
          </div>
          <div className="mt-2 text-[10px] text-white/45 uppercase" style={{ letterSpacing: "0.22em" }}>
            — {quote.author}
          </div>
        </div>
      )}
      </div>
    </div>
  );

  const palette = paletteOpen && (
    <CommandPalette
      onClose={() => setPaletteOpen(false)}
      onOpenWidget={(id) => {
        if (isConsole) { setSelectedId(id); setInspectorOpen(true); }
        else if (isTerminal) setSelectedId(id);
        else setOpenWidget(id);
      }}
      onOpenSettings={(tab) => { setSettingsTab(tab); setSettingsOpen(true); }}
    />
  );

  const termCtx: TermCtx = {
    openWidget: (id) => {
      if (isConsole) { setSelectedId(id); setInspectorOpen(true); }
      else if (isTerminal) setSelectedId(id);
      else setOpenWidget(id);
    },
    openSettings: (tab) => {
      if (tab) setSettingsTab(tab);
      setSettingsOpen(true);
    },
    openPalette: () => setPaletteOpen(true),
    setLayout: (l) => setPrefs((prev) => ({ ...prev, layout: l })),
  };

  return (
    <div className="fixed inset-0 overflow-hidden">
      <BackgroundLayer />

      {isTerminal ? (
        <>
          <div className="absolute inset-0 z-[1] pointer-events-none bg-black/85" />
          <Terminal ctx={termCtx} />
        </>
      ) : isMap ? (
        <>
          <div className="absolute inset-0 z-[1] pointer-events-none bg-black/20" />
          {topBar}
          <MapBoard items={items} widgets={widgets} dimmed={openWidget !== null} onOpenWidget={setOpenWidget} />
          <Dock onOpenAll={() => setShortcutsOpen(true)} />
          {openWidget && <WidgetDialog id={openWidget} onClose={() => setOpenWidget(null)} />}
        </>
      ) : isOrbit ? (
        <>
          <div className="absolute inset-0 z-[1] pointer-events-none bg-black/45" />
          {topBar}
          <OrbitBoard
            items={items}
            display={display}
            quote={widgets.dailyQuote ? quote : null}
            suspended={paletteOpen || settingsOpen || shortcutsOpen || openWidget !== null}
            dimmed={openWidget !== null}
            onOpenWidget={setOpenWidget}
          />
          <Dock onOpenAll={() => setShortcutsOpen(true)} />
          {openWidget && <WidgetDialog id={openWidget} onClose={() => setOpenWidget(null)} />}
        </>
      ) : isConsole ? (
        <>
          <div className="absolute inset-0 z-[1] pointer-events-none bg-black/25" />
          {topBar}
          <ConsoleSidebar items={items} selectedId={effectiveSelected} onSelect={setSelectedId} onExpand={() => setInspectorOpen(true)} />

          {/* Click empty background to collapse the inspector */}
          <div className="absolute inset-0 z-[5]" onClick={() => setInspectorOpen(false)} />

          {/* Main area: clock + quote between sidebar and inspector */}
          <main className={`absolute top-0 bottom-9 left-[280px] ${inspectorOpen ? "right-[440px]" : "right-0"} flex flex-col items-center justify-center px-6 z-10 pointer-events-none`}>
            {hero}
          </main>

          {/* Dock scoped to the main area */}
          <div className={`absolute top-0 bottom-0 left-[280px] ${inspectorOpen ? "right-[440px]" : "right-0"}`}>
            <Dock onOpenAll={() => setShortcutsOpen(true)} />
          </div>

          {inspectorOpen && <Inspector id={effectiveSelected} />}

          {openWidget && <WidgetDialog id={openWidget} onClose={() => setOpenWidget(null)} />}

          {/* Inspector collapse / expand arrow */}
          <button
            onClick={() => setInspectorOpen((v) => !v)}
            title={inspectorOpen ? "Collapse widget panel" : "Expand widget panel"}
            aria-label={inspectorOpen ? "Collapse widget panel" : "Expand widget panel"}
            className="absolute top-1/2 -translate-y-1/2 z-40 w-6 h-16 rounded-l-xl bg-black/50 hover:bg-black/65 border border-r-0 border-white/10 flex items-center justify-center text-white/50 hover:text-white/90 tap-scale"
            style={{ right: inspectorOpen ? 420 : 0, backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)" }}
          >
            {inspectorOpen ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>

          {/* Status bar */}
          <footer className="absolute left-[280px] right-0 bottom-0 h-9 z-40 flex items-center justify-between px-5 border-t border-white/10 font-mono text-[11px] text-white/35"
            style={{ background: "rgba(0,0,0,0.62)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)" }}>
            <span>
              <span className="text-white/60">console</span>
              <span className="mx-2 text-white/15">|</span>
              {effectiveSelected ? items.find((i) => i.id === effectiveSelected)?.label : "no widget"}
            </span>
            <span className="hidden md:block">
              <span className="kbd">j</span>/<span className="kbd">k</span> move
              <span className="mx-1.5 text-white/15">·</span>
              <span className="kbd">⏎</span> open
              <span className="mx-1.5 text-white/15">·</span>
              <span className="kbd">/</span> search
              <span className="mx-1.5 text-white/15">·</span>
              <span className="kbd">esc</span> back
            </span>
          </footer>
        </>
      ) : (
        <>
          {topBar}
          <SuiteBoard
            items={items}
            display={display}
            quote={widgets.dailyQuote ? quote : null}
            dimmed={openWidget !== null}
            onOpenWidget={setOpenWidget}
          />
          <Dock onOpenAll={() => setShortcutsOpen(true)} />
          {openWidget && <WidgetDialog id={openWidget} onClose={() => setOpenWidget(null)} />}
        </>
      )}

      {shortcutsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in" onClick={() => setShortcutsOpen(false)}>
          <div className="absolute inset-0 bg-black/65 backdrop-blur-xl" />
          <div className="relative surface-modal rounded-2xl p-6 w-full max-w-3xl mx-4 max-h-[85vh] overflow-y-auto animate-scale-in-bounce" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-xl text-white/90 font-medium">All Shortcuts</h2>
              <button onClick={() => setShortcutsOpen(false)} className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/60 tap-scale">
                <X size={14} />
              </button>
            </div>
            <p className="text-xs text-white/35 mb-4">Click ✕ on a tile to delete · add below</p>
            <div className="grid grid-cols-5 gap-3">
              {shortcuts.map((s) => (
                <div key={s.id} className="relative group rounded-2xl surface-chip p-4 pt-5 text-center">
                  <a href={s.url} target="_blank" rel="noopener noreferrer" className="block">
                    <div className="mx-auto mb-2 h-12 w-12 rounded-xl bg-white/[0.07] flex items-center justify-center">
                      <img src={favicon(s.url)} alt={s.name} className="h-6 w-6 pointer-events-none" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                    </div>
                    <div className="text-xs text-white/80 truncate">{s.name}</div>
                  </a>
                  <button
                    onClick={() => setShortcuts((prev) => prev.filter((x) => x.id !== s.id))}
                    className="opacity-0 group-hover:opacity-100 absolute -top-2 right-2 w-5 h-5 rounded-md bg-red-500 hover:bg-red-400 flex items-center justify-center text-white transition-opacity"
                    title="Delete"
                  >
                    <X size={10} />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-4">
              <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Name" className="flex-1 surface-input px-3 py-2 text-sm" />
              <input value={draft.url} onChange={(e) => setDraft({ ...draft, url: e.target.value })} onKeyDown={(e) => e.key === "Enter" && addShortcut()} placeholder="URL (e.g. google.com)" className="flex-1 surface-input px-3 py-2 text-sm" />
              <button onClick={addShortcut} className="px-4 rounded-xl bg-white/10 hover:bg-white/15 text-white/80 tap-scale flex items-center gap-1.5">
                <Plus size={14} /> Add
              </button>
            </div>
            <div className="flex items-center gap-2 mt-3 text-white/40 text-xs">
              <Grid size={12} /> Drag to rearrange arrives in P2
            </div>
          </div>
        </div>
      )}

      {settingsOpen && <SettingsDrawer key={settingsTab} initialTab={settingsTab} onClose={() => setSettingsOpen(false)} />}

      {palette}
    </div>
  );
}
