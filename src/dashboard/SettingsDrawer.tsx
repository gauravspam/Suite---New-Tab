import { useState } from "react";
import { Check, ChevronDown, Coffee, X } from "lucide-react";
import { useChromeStorage, STORAGE_KEYS } from "@/shared/storage";
import { QUOTE_CATEGORIES } from "@/shared/quotes";
import {
  DEFAULT_BACKGROUND, DEFAULT_DISPLAY, DEFAULT_GITHUB, DEFAULT_SUITE_PREFS,
  DEFAULT_WEATHER, DEFAULT_WIDGETS,
  DEFAULT_DISCARD_SETTINGS, DEFAULT_DIMMER_SETTINGS, DEFAULT_YT_SETTINGS,
  type DashboardBackgroundSettings, type DashboardDisplaySettings,
  type DashboardGithubSettings, type DashboardWeatherSettings,
  type DashboardWidgetVisibility, type SuitePrefs,
  type DiscardSettings, type DimmerSettings, type YtFullscreenSettings,
} from "@/shared/types";

const TABS = ["background", "display", "weather", "widgets", "github", "prefs", "discard", "dimmer", "yt", "backup"] as const;
type TabId = (typeof TABS)[number];

const LABELS: Record<TabId, string> = {
  background: "Background",
  display: "Display",
  weather: "Weather",
  widgets: "Widgets",
  github: "Github",
  prefs: "Prefs",
  discard: "Discard",
  dimmer: "Dimmer",
  yt: "YT Full",
  backup: "Backup",
};

export default function SettingsDrawer({ onClose, initialTab }: { onClose: () => void; initialTab?: string }) {
  const [tab, setTab] = useState<TabId>(
    (["background", "display", "weather", "widgets", "github", "prefs", "discard", "dimmer", "yt", "backup"] as string[]).includes(initialTab || "")
      ? (initialTab as TabId)
      : "background"
  );

  return (
    <div className="fixed inset-0 z-50 animate-fade-in">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-md" onClick={onClose} />
      <aside
        className="absolute right-0 top-0 h-full w-[430px] max-w-[94vw] flex flex-col border-l border-white/10 animate-slide-in-right"
        style={{ background: "rgba(22,24,34,0.82)", backdropFilter: "blur(28px) saturate(1.4)", WebkitBackdropFilter: "blur(28px) saturate(1.4)", boxShadow: "-24px 0 64px rgba(0,0,0,0.45)" }}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h2 className="text-white/90 text-xl font-semibold">Settings</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white/85 tap-scale" aria-label="Close settings">
            <X size={18} />
          </button>
        </div>

        <div className="px-4 pb-3">
          <div className="flex gap-1 p-1 rounded-full bg-white/5 border border-white/10 overflow-x-auto">
            {TABS.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
                  tab === t ? "bg-white/15 text-white shadow" : "text-white/45 hover:text-white/70 hover:bg-white/5"
                }`}
              >
                {LABELS[t]}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-3">
          <div className="rounded-2xl surface-chip p-4 text-center">
            <p className="text-white/60 text-xs mb-3">Enjoying Suite? Support updates!</p>
            <button className="w-full py-2.5 rounded-xl text-sm font-semibold text-yellow-300 bg-yellow-400/10 border border-yellow-400/30 hover:bg-yellow-400/20 transition-colors flex items-center justify-center gap-2 tap-scale">
              <Coffee size={15} /> Buy me a coffee
            </button>
          </div>

          {tab === "background" && <BackgroundTab />}
          {tab === "display" && <DisplayTab />}
          {tab === "weather" && <WeatherTab />}
          {tab === "widgets" && <WidgetsTab />}
          {tab === "github" && <GithubTab />}
          {tab === "prefs" && <PrefsTab />}
          {tab === "discard" && <DiscardTab />}
          {tab === "dimmer" && <DimmerTab />}
          {tab === "yt" && <YtTab />}
          {tab === "backup" && <BackupTab />}
        </div>

        <div className="p-4 pt-2">
          <button onClick={onClose} className="w-full py-2.5 rounded-xl text-sm font-medium text-white/80 bg-white/10 border border-white/15 hover:bg-white/15 transition-colors tap-scale">
            Save & Close
          </button>
        </div>
      </aside>
    </div>
  );
}

// ── Shared bits ──
function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl surface-chip p-4">{children}</div>;
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`w-10 h-5 rounded-full transition-all duration-300 relative tap-scale flex-shrink-0 ${value ? "bg-blue-500/70 shadow-lg shadow-blue-500/30" : "bg-white/10 hover:bg-white/15"}`}
      aria-pressed={value}
    >
      <div className={`w-4 h-4 rounded-full bg-white transition-all duration-300 absolute top-0.5 shadow-md ${value ? "left-5" : "left-0.5"}`} />
    </button>
  );
}

function CheckBox({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <div className="py-2">
      <button onClick={() => onChange(!checked)} className="flex items-center gap-2.5 text-left tap-scale">
        <span className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all flex-shrink-0 ${checked ? "bg-green-400 border-green-400" : "border-white/25 hover:border-white/40"}`}>
          {checked && <Check size={13} className="text-black" strokeWidth={3} />}
        </span>
        <span className="text-white/85 text-sm">{label}</span>
      </button>
      {hint && <p className="text-white/35 text-xs mt-1 ml-[30px]">{hint}</p>}
    </div>
  );
}

function Row({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2.5 gap-3">
      <div className="min-w-0">
        <div className="text-white/80 text-sm">{label}</div>
        {description && <div className="text-white/35 text-xs mt-0.5">{description}</div>}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

function Slider({ value, onChange, min = 0, max = 100, step = 1, unit = "" }: {
  value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number; unit?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-28" />
      <span className="text-white/60 text-xs w-10 text-right">{value}{unit}</span>
    </div>
  );
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`surface-input px-3.5 py-2.5 text-sm placeholder-white/25 w-full ${props.className || ""}`} />;
}

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none surface-input px-3.5 py-2.5 text-sm pr-9 [&>option]:bg-[#1a1d2e]"
      >
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
    </div>
  );
}

// ── Tabs ──
function BackgroundTab() {
  const [s, setS] = useChromeStorage<DashboardBackgroundSettings>(STORAGE_KEYS.DASHBOARD_BACKGROUND, DEFAULT_BACKGROUND);
  const update = (p: Partial<DashboardBackgroundSettings>) => setS((prev) => ({ ...prev, ...p }));

  return (
    <Card>
      <div className="flex gap-1 p-1 rounded-xl bg-white/5 border border-white/10 mb-4 overflow-x-auto">
        {(["unsplash", "upload", "color", "video"] as const).map((src) => (
          <button key={src} onClick={() => update({ source: src })} className={`px-3 py-2 rounded-lg text-xs font-medium capitalize tap-scale whitespace-nowrap ${s.source === src ? "bg-white/15 text-white" : "text-white/45 hover:text-white/70"}`}>
            {src}
          </button>
        ))}
      </div>
      {s.source === "unsplash" && (
        <div className="space-y-3">
          <div>
            <div className="text-white/70 text-xs font-medium mb-2">Unsplash API Key (Optional)</div>
            <TextInput type="password" value={s.unsplashAccessKey || ""} onChange={(e) => update({ unsplashAccessKey: e.target.value })} placeholder="Enter your Unsplash Access Key" />
          </div>
          <div>
            <div className="text-white/70 text-xs font-medium mb-2">Refresh Interval</div>
            <Select value={s.refreshInterval} onChange={(v) => update({ refreshInterval: v as DashboardBackgroundSettings["refreshInterval"] })} options={["hour", "day", "week", "newtab", "always", "never"]} />
          </div>
        </div>
      )}
      {s.source === "color" && (
        <Row label="Custom Color">
          <input type="color" value={s.customColor || "#1a1a2e"} onChange={(e) => update({ customColor: e.target.value })} className="w-9 h-9 rounded-lg cursor-pointer bg-transparent border-0" />
        </Row>
      )}
      {s.source === "upload" && (
        <Row label="Upload Image" description="JPG, PNG, WebP (max 5MB)">
          <label className="bg-white/10 hover:bg-white/20 rounded-lg px-4 py-1.5 text-sm text-white/80 cursor-pointer tap-scale">
            Choose File
            <input
              type="file" accept="image/*" className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                if (f.size > 5 * 1024 * 1024) { alert("File too large (max 5MB)"); return; }
                const r = new FileReader();
                r.onload = (ev) => update({ customImageUrl: ev.target?.result as string });
                r.readAsDataURL(f);
              }}
            />
          </label>
        </Row>
      )}
      {s.source === "video" && (
        <Row label="Upload Video" description="MP4, WebM (max 20MB)">
          <label className="bg-white/10 hover:bg-white/20 rounded-lg px-4 py-1.5 text-sm text-white/80 cursor-pointer tap-scale">
            Choose File
            <input
              type="file" accept="video/*" className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                if (f.size > 20 * 1024 * 1024) { alert("File too large (max 20MB)"); return; }
                const r = new FileReader();
                r.onload = (ev) => update({ customVideoUrl: ev.target?.result as string });
                r.readAsDataURL(f);
              }}
            />
          </label>
        </Row>
      )}
      {s.source !== "color" && (
        <Row label="Wallpaper Index" description="Bundled gradients">
          <Slider value={s.fallbackPoolIndex} onChange={(v) => update({ fallbackPoolIndex: v })} min={0} max={14} />
        </Row>
      )}
    </Card>
  );
}

function DisplayTab() {
  const [s, setS] = useChromeStorage<DashboardDisplaySettings>(STORAGE_KEYS.DASHBOARD_DISPLAY, DEFAULT_DISPLAY);
  const update = (p: Partial<DashboardDisplaySettings>) => setS((prev) => ({ ...prev, ...p }));

  return (
    <div className="space-y-3">
      <Card>
        <div className="text-white/70 text-xs font-medium mb-2">Clock Style</div>
        <div className="flex gap-1 flex-wrap">
          {(["modern", "bold", "thin", "outline", "analog", "glass"] as const).map((c) => (
            <button key={c} onClick={() => update({ clockStyle: c })} className={`px-3 py-1.5 rounded-lg text-xs capitalize tap-scale ${s.clockStyle === c ? "bg-white/15 text-white" : "bg-white/5 text-white/45"}`}>{c}</button>
          ))}
        </div>
        <div className="mt-2">
          <Row label="Time Format">
            <div className="flex gap-1">
              {(["12h", "24h"] as const).map((f) => (
                <button key={f} onClick={() => update({ timeFormat: f })} className={`px-3 py-1 rounded-lg text-xs tap-scale ${s.timeFormat === f ? "bg-white/15 text-white" : "bg-white/5 text-white/45"}`}>{f}</button>
              ))}
            </div>
          </Row>
          <Row label="Clock Size"><Slider value={s.fontSize} onChange={(v) => update({ fontSize: v })} min={40} max={160} step={10} unit="px" /></Row>
        </div>
      </Card>
      <Card>
        <Row label="Show Greeting"><Toggle value={s.showGreeting} onChange={(v) => update({ showGreeting: v })} /></Row>
        <Row label="Custom Greeting">
          <input value={s.customGreeting || ""} onChange={(e) => update({ customGreeting: e.target.value || undefined })} placeholder="Default" className="surface-input px-3 py-1.5 text-sm placeholder-white/25 w-32" />
        </Row>
      </Card>
    </div>
  );
}

function WeatherTab() {
  const [s, setS] = useChromeStorage<DashboardWeatherSettings>(STORAGE_KEYS.DASHBOARD_WEATHER, DEFAULT_WEATHER);
  const update = (p: Partial<DashboardWeatherSettings>) => setS({ ...s, ...p });

  return (
    <Card>
      <Row label="Location Mode">
        <div className="flex gap-1">
          {(["auto", "city"] as const).map((m) => (
            <button key={m} onClick={() => update({ locationMode: m })} className={`px-3 py-1 rounded-lg text-xs tap-scale ${s.locationMode === m ? "bg-white/15 text-white" : "bg-white/5 text-white/45"}`}>{m === "auto" ? "Auto" : "Manual"}</button>
          ))}
        </div>
      </Row>
      {s.locationMode === "city" && (
        <Row label="City Name">
          <input value={s.cityName || ""} onChange={(e) => update({ cityName: e.target.value })} placeholder="e.g. London" className="surface-input px-3 py-1.5 text-sm placeholder-white/25 w-32" />
        </Row>
      )}
      <Row label="Temperature">
        <div className="flex gap-1">
          {(["celsius", "fahrenheit"] as const).map((u) => (
            <button key={u} onClick={() => update({ unit: u })} className={`px-3 py-1 rounded-lg text-xs tap-scale ${s.unit === u ? "bg-white/15 text-white" : "bg-white/5 text-white/45"}`}>{u === "celsius" ? "°C" : "°F"}</button>
          ))}
        </div>
      </Row>
    </Card>
  );
}

function WidgetsTab() {
  const [s, setS] = useChromeStorage<DashboardWidgetVisibility>(STORAGE_KEYS.DASHBOARD_WIDGETS, DEFAULT_WIDGETS);
  const list: { key: keyof DashboardWidgetVisibility; label: string }[] = [
    { key: "date", label: "Date & Time" },
    { key: "weather", label: "Weather" },
    { key: "tasks", label: "Tasks" },
    { key: "notes", label: "Notes" },
    { key: "pomodoro", label: "Pomodoro" },
    { key: "github", label: "GitHub" },
    { key: "systemMonitor", label: "System Monitor" },
    { key: "habits", label: "Habits" },
    { key: "worldClock", label: "World Clock" },
    { key: "quickAccessDock", label: "Quick Access Dock" },
    { key: "aiAgentsButton", label: "AI Agents Button" },
    { key: "dailyQuote", label: "Daily Quote" },
  ];

  return (
    <Card>
      <div className="text-white/70 text-xs font-medium mb-1">Dashboard Widgets</div>
      {list.map(({ key, label }) => (
        <div key={key} className="flex items-center justify-between py-2">
          <span className="text-white/75 text-sm">{label}</span>
          <Toggle value={s[key]} onChange={(v) => setS((prev) => ({ ...prev, [key]: v }))} />
        </div>
      ))}
    </Card>
  );
}

function GithubTab() {
  const [s, setS] = useChromeStorage<DashboardGithubSettings>(STORAGE_KEYS.DASHBOARD_GITHUB, DEFAULT_GITHUB);
  const update = (p: Partial<DashboardGithubSettings>) => setS((prev) => ({ ...prev, ...p }));

  return (
    <Card>
      <Row label="Username">
        <input value={s.username || ""} onChange={(e) => update({ username: e.target.value })} placeholder="e.g. octocat" className="surface-input px-3 py-1.5 text-sm placeholder-white/25 w-32" />
      </Row>
      <Row label="Show Contributions"><Toggle value={s.showContributions} onChange={(v) => update({ showContributions: v })} /></Row>
      <Row label="Show Activity"><Toggle value={s.showActivity} onChange={(v) => update({ showActivity: v })} /></Row>
    </Card>
  );
}

function PrefsTab() {
  const [prefs, setPrefs] = useChromeStorage<SuitePrefs>(STORAGE_KEYS.SUITE_PREFS, DEFAULT_SUITE_PREFS);
  const update = (p: Partial<SuitePrefs>) => setPrefs((prev) => ({ ...prev, ...p }));

  return (
    <div className="space-y-3">
      <Card>
        <div className="text-white/70 text-xs font-medium mb-2">Layout</div>
        <div className="flex gap-1.5">
          {(["console", "terminal", "map", "orbit", "suite"] as const).map((l) => (
            <button
              key={l}
              onClick={() => update({ layout: l })}
              className={`flex-1 py-1.5 rounded-lg text-xs capitalize tap-scale ${prefs.layout === l || (!prefs.layout && l === "suite") ? "bg-white/15 text-white" : "bg-white/5 text-white/45 hover:text-white/70"}`}
            >
              {l}
            </button>
          ))}
        </div>
        <p className="text-white/35 text-xs mt-2">Console: sidebar OS + inspector, keyboard-first (narrow screens use Suite). Terminal: full CLI. Map: draggable canvas board. Orbit: clock sun with satellite widgets. Suite: the original rail + hero clock + dock.</p>
      </Card>
      <Card>
        <div className="text-white/70 text-xs font-medium mb-1">Quick Access Dock</div>
        <CheckBox checked={prefs.dockMagnification ?? true} onChange={(v) => update({ dockMagnification: v })} label="Dock hover magnification" hint="Right-click dock items to edit/delete" />
      </Card>
      <Card>
        <div className="text-white/70 text-xs font-medium mb-1">UI Options</div>
        <CheckBox checked={prefs.showGoogleAppsButton ?? true} onChange={(v) => update({ showGoogleAppsButton: v })} label="Show Google Apps button" />
        <CheckBox checked={prefs.showFullscreenButton ?? false} onChange={(v) => update({ showFullscreenButton: v })} label="Show Full Screen button" />
        <CheckBox checked={prefs.showCommandBarButton ?? false} onChange={(v) => update({ showCommandBarButton: v })} label="Show Command Bar button (⌘)" />
      </Card>
      <Card>
        <div className="text-white/70 text-xs font-medium mb-2">Quote Category</div>
        <Select value={prefs.quoteCategory || "General"} onChange={(v) => update({ quoteCategory: v })} options={Object.keys(QUOTE_CATEGORIES)} />
        <div className="text-white/70 text-xs font-medium mt-4 mb-2">Holiday Country</div>
        <TextInput value={prefs.holidayCountry || "India"} onChange={(e) => update({ holidayCountry: e.target.value })} placeholder="India" />
        <div className="text-white/70 text-xs font-medium mt-4 mb-2">Default Search Engine</div>
        <Select value={prefs.defaultSearchEngine || "Google"} onChange={(v) => update({ defaultSearchEngine: v })} options={["Google", "DuckDuckGo", "Bing", "Brave"]} />
      </Card>
      <Card>
        <div className="text-white/70 text-xs font-medium mb-1">Debug</div>
        <Row label="Debug Mode" description="Verbose console logging">
          <Toggle value={prefs.debug} onChange={(v) => update({ debug: v })} />
        </Row>
      </Card>
    </div>
  );
}

// ── Discard Tab ──
function DiscardTab() {
  const [s, setS] = useChromeStorage<DiscardSettings>(STORAGE_KEYS.DISCARD_SETTINGS, DEFAULT_DISCARD_SETTINGS);
  const [wl, setWl] = useState(s.whitelist.join(", "));
  const update = (p: Partial<DiscardSettings>) => setS({ ...s, ...p });

  function preset(p: "gentle" | "balanced" | "aggressive") {
    if (p === "gentle") update({ idleMinutes: 30, minInactiveTabsThreshold: 5, gracePeriodSeconds: 120 });
    else if (p === "balanced") update({ idleMinutes: 15, minInactiveTabsThreshold: 3, gracePeriodSeconds: 60 });
    else update({ idleMinutes: 5, minInactiveTabsThreshold: 1, gracePeriodSeconds: 30 });
  }

  return (
    <div className="space-y-3">
      <Card>
        <Row label="Enable Discard"><Toggle value={s.enabled} onChange={(v) => update({ enabled: v })} /></Row>
        <div className="text-white/70 text-xs font-medium mt-2 mb-1">Preset</div>
        <div className="flex gap-1.5">
          {(["gentle", "balanced", "aggressive"] as const).map((p) => (
            <button key={p} onClick={() => preset(p)} className="flex-1 py-1.5 rounded-lg text-xs capitalize bg-white/5 hover:bg-white/10 text-white/60 hover:text-white/85 tap-scale">
              {p}
            </button>
          ))}
        </div>
      </Card>
      <Card>
        <Row label="Idle Minutes" description="Tabs inactive this long become eligible">
          <Slider value={s.idleMinutes} onChange={(v) => update({ idleMinutes: v })} min={1} max={120} unit="m" />
        </Row>
        <Row label="Grace Period" description="Don't discard tabs newer than this">
          <Slider value={s.gracePeriodSeconds} onChange={(v) => update({ gracePeriodSeconds: v })} min={10} max={300} unit="s" />
        </Row>
        <Row label="Min Inactive Tabs"><Slider value={s.minInactiveTabsThreshold} onChange={(v) => update({ minInactiveTabsThreshold: v })} min={1} max={20} /></Row>
        <Row label="Never discard active tab"><Toggle value={s.neverDiscardActiveTab} onChange={(v) => update({ neverDiscardActiveTab: v })} /></Row>
        <Row label="Never discard audible tab"><Toggle value={s.neverDiscardAudibleTab} onChange={(v) => update({ neverDiscardAudibleTab: v })} /></Row>
        <Row label="Never discard pinned tab"><Toggle value={s.neverDiscardPinnedTab} onChange={(v) => update({ neverDiscardPinnedTab: v })} /></Row>
        <Row label="Never discard unsaved forms"><Toggle value={s.neverDiscardWithUnsavedForm} onChange={(v) => update({ neverDiscardWithUnsavedForm: v })} /></Row>
      </Card>
      <Card>
        <div className="text-white/70 text-xs font-medium mb-1">Whitelist</div>
        <p className="text-white/35 text-xs mb-2">Comma-separated hostnames to never discard</p>
        <textarea
          value={wl}
          onChange={(e) => { setWl(e.target.value); update({ whitelist: e.target.value.split(",").map((x) => x.trim()).filter(Boolean) }); }}
          placeholder="e.g. meet.google.com, docs.google.com"
          className="w-full surface-input px-3 py-2 text-sm h-16 resize-none"
        />
        <div className="mt-2">
          <Row label="Memory pressure" description="Discard faster when RAM is low">
            <Toggle value={s.useMemoryPressure} onChange={(v) => update({ useMemoryPressure: v })} />
          </Row>
          {s.useMemoryPressure && (
            <Row label="Free-memory threshold"><Slider value={s.memoryPressureThresholdPercent} onChange={(v) => update({ memoryPressureThresholdPercent: v })} min={5} max={50} unit="%" /></Row>
          )}
        </div>
      </Card>
    </div>
  );
}

const DIMMER_COLORS = [
  { id: "black", hex: "#000000" },
  { id: "brown", hex: "#5C3C28" },
  { id: "green", hex: "#143C1E" },
  { id: "red", hex: "#5A1414" },
  { id: "blue", hex: "#14285A" },
];

// ── Dimmer Tab ──
function DimmerTab() {
  const [sRaw, setS] = useChromeStorage<DimmerSettings>(STORAGE_KEYS.DIMMER_SETTINGS, DEFAULT_DIMMER_SETTINGS);
  // Defensive merge so a stale/partial stored value can't crash the tab (fixes white-screen when s.color is undefined)
  const s: DimmerSettings = {
    ...DEFAULT_DIMMER_SETTINGS,
    ...(sRaw as Partial<DimmerSettings>),
    schedule: (sRaw as any)?.schedule ? { ...DEFAULT_DIMMER_SETTINGS.schedule, ...(sRaw as any).schedule } as any : (sRaw as any)?.schedule,
  } as DimmerSettings;
  // Normalize: if schedule was explicitly deleted, keep it undefined (off)
  if ((sRaw as any)?.schedule === undefined) (s as any).schedule = undefined;
  const [perSite, setPerSite] = useChromeStorage<Record<string, { enabled: boolean }>>(STORAGE_KEYS.DIMMER_PERSITE, {});
  const [site, setSite] = useState("");
  const update = (p: Partial<DimmerSettings>) => setS((prev) => ({ ...prev, ...p }));

  const PRESETS: { label: string; v: Partial<DimmerSettings> }[] = [
    { label: "Night", v: { intensity: 55, color: "black", blur: false } },
    { label: "Reading", v: { intensity: 25, color: "brown", blur: false } },
    { label: "Movie", v: { intensity: 70, color: "black", blur: false, mode: "media-only" } },
  ];

  return (
    <div className="space-y-3">
      <Card>
        <Row label="Enable Dimmer"><Toggle value={s.enabled} onChange={(v) => update({ enabled: v })} /></Row>
        <div className="text-white/70 text-xs font-medium mt-2 mb-1">Presets</div>
        <div className="flex gap-1.5 mb-3">
          {PRESETS.map((p) => (
            <button key={p.label} onClick={() => update(p.v)} className="flex-1 py-1.5 rounded-lg text-xs bg-white/5 hover:bg-white/10 text-white/60 hover:text-white/85 tap-scale">
              {p.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2 mb-3">
          {(["overlay", "media-only"] as const).map((m) => (
            <button key={m} onClick={() => update({ mode: m })} className={`flex-1 py-2 rounded-xl text-xs tap-scale ${s.mode === m ? "bg-white/15 text-white border border-white/20" : "bg-white/5 text-white/45"}`}>
              {m === "overlay" ? "Page Overlay" : "Media Only"}
            </button>
          ))}
        </div>
        <div className="flex gap-2 mb-3">
          {DIMMER_COLORS.map((c) => (
            <button key={c.id} onClick={() => update({ color: c.id })} title={c.id} className={`w-9 h-9 rounded-lg tap-scale ${s.color === c.id ? "ring-2 ring-white/60 scale-110" : ""}`} style={{ backgroundColor: c.hex }} />
          ))}
          <div className="relative">
            <input type="color" value={typeof s.color === "string" && s.color.startsWith("#") ? s.color : "#000000"} onChange={(e) => update({ color: e.target.value })} className="absolute inset-0 opacity-0 cursor-pointer w-9 h-9" />
            <div className="w-9 h-9 rounded-lg border-2 border-dashed border-white/20 flex items-center justify-center text-white/40 text-xs">+</div>
          </div>
        </div>
        <Row label="Intensity"><Slider value={Number.isFinite(s.intensity as any) ? s.intensity : 40} onChange={(v) => update({ intensity: v })} min={0} max={100} unit="%" /></Row>
        <Row label="Blur"><Toggle value={!!s.blur} onChange={(v) => update({ blur: v })} /></Row>
        <Row label="Whitescreen protection"><Toggle value={!!s.whitescreenProtection} onChange={(v) => update({ whitescreenProtection: v })} /></Row>
        <Row label="Dark mode" description="Experimental invert filter"><Toggle value={!!s.darkMode} onChange={(v) => update({ darkMode: v })} /></Row>
      </Card>
      <Card>
        <Row label="Schedule" description="Only dim during these hours">
          <Toggle value={s.schedule?.enabled ?? false} onChange={(v) => setS((prev) => ({ ...prev, schedule: { enabled: v, startHour: prev.schedule?.startHour ?? 20, endHour: prev.schedule?.endHour ?? 7 } }))} />
        </Row>
        {s.schedule?.enabled && (
          <>
            <Row label="Start hour"><Slider value={s.schedule.startHour} onChange={(v) => setS((prev) => ({ ...prev, schedule: { ...(prev.schedule as DimmerSettings["schedule"])!, startHour: v } }))} min={0} max={23} unit="h" /></Row>
            <Row label="End hour"><Slider value={s.schedule.endHour} onChange={(v) => setS((prev) => ({ ...prev, schedule: { ...(prev.schedule as DimmerSettings["schedule"])!, endHour: v } }))} min={0} max={23} unit="h" /></Row>
          </>
        )}
      </Card>
      <Card>
        <div className="text-white/70 text-xs font-medium mb-2">Per-site overrides</div>
        {Object.entries(perSite).map(([host, cfg]) => (
          <div key={host} className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2 mb-1.5">
            <span className="text-white/70 text-xs">{host}</span>
            <div className="flex items-center gap-2">
              <Toggle value={cfg.enabled} onChange={(v) => setPerSite({ ...perSite, [host]: { ...cfg, enabled: v } })} />
              <button onClick={() => { const c = { ...perSite }; delete c[host]; setPerSite(c); }} className="text-white/30 hover:text-white/60 text-xs">✕</button>
            </div>
          </div>
        ))}
        <div className="flex gap-2 mt-2">
          <input value={site} onChange={(e) => setSite(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && site.trim()) { setPerSite({ ...perSite, [site.trim()]: { enabled: true } }); setSite(""); } }} placeholder="e.g. reddit.com" className="flex-1 surface-input px-3 py-1.5 text-xs" />
          <button onClick={() => { if (!site.trim()) return; setPerSite({ ...perSite, [site.trim()]: { enabled: true } }); setSite(""); }} className="bg-white/10 hover:bg-white/20 rounded-lg px-3 text-xs text-white/60 tap-scale">Add</button>
        </div>
      </Card>
    </div>
  );
}

// ── YT Fullscreen Tab ──
function YtTab() {
  const [s, setS] = useChromeStorage<YtFullscreenSettings>(STORAGE_KEYS.YT_FULLSCREEN_SETTINGS, DEFAULT_YT_SETTINGS);
  const update = (p: Partial<YtFullscreenSettings>) => setS((prev) => ({ ...prev, ...p }));

  return (
    <Card>
      <Row label="Enable YT Fullscreen"><Toggle value={s.enabled} onChange={(v) => update({ enabled: v })} /></Row>
      <Row label="Remember per video" description="Auto-apply to videos you expanded before">
        <Toggle value={s.rememberPerVideo} onChange={(v) => update({ rememberPerVideo: v })} />
      </Row>
      <Row label="Keyboard shortcut" description="` (Backquote) in-page · Alt+Shift+F global · Esc exits">
        <Toggle value={s.keyboardShortcutEnabled} onChange={(v) => update({ keyboardShortcutEnabled: v })} />
      </Row>
    </Card>
  );
}

// ── Backup Tab ──
function BackupTab() {
  const [status, setStatus] = useState<string | null>(null);

  function doExport() {
    try {
      const data: Record<string, string> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)!;
        if (/^(dashboard|discard|dimmer|ytFullscreen|suite)\./.test(key)) data[key] = localStorage.getItem(key)!;
      }
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "suite-v2-settings.json";
      a.click();
      URL.revokeObjectURL(url);
      setStatus("Exported.");
    } catch {
      setStatus("Export failed.");
    }
  }

  function doImport(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    f.text().then((text) => {
      try {
        const data = JSON.parse(text) as Record<string, string>;
        let n = 0;
        for (const [k, v] of Object.entries(data)) {
          localStorage.setItem(k, typeof v === "string" ? v : JSON.stringify(v));
          n++;
        }
        setStatus(`Imported ${n} settings. Reload to apply.`);
      } catch {
        setStatus("Import failed — invalid file.");
      }
    });
  }

  return (
    <Card>
      <div className="text-white/70 text-xs font-medium mb-1">Backup & Restore</div>
      <p className="text-white/35 text-xs mb-3">Custom backgrounds and video are not included.</p>
      <div className="flex gap-2">
        <button onClick={doExport} className="flex-1 py-2 rounded-xl text-xs font-medium text-white bg-blue-500/80 hover:bg-blue-500 tap-scale">Export</button>
        <label className="flex-1 py-2 rounded-xl text-xs font-medium text-white bg-green-600/80 hover:bg-green-600 tap-scale text-center cursor-pointer">
          Import
          <input type="file" accept=".json" onChange={doImport} className="hidden" />
        </label>
      </div>
      {status && <p className="text-xs mt-3 text-white/60">{status}</p>}
    </Card>
  );
}
