import { Bot, Code2, Command, Eye, Grid, Maximize, Search, Settings, Sparkles, Star, X, Zap } from "lucide-react";
import { STORAGE_KEYS, useChromeStorage } from "@/shared/storage";
import { DEFAULT_AI_AGENTS, type DashboardAiAgent, type DashboardWidgetVisibility } from "@/shared/types";

export function agentIconFor(agent: { id: string; name: string }) {
  const key = `${agent.id} ${agent.name}`.toLowerCase();
  if (key.includes("gemini")) return Sparkles;
  if (key.includes("claude")) return Star;
  if (key.includes("deepseek")) return Eye;
  if (key.includes("grok")) return Zap;
  if (key.includes("copilot")) return Code2;
  if (key.includes("perplexity")) return Search;
  return Bot;
}

function agentIcon(agent: DashboardAiAgent) {
  return agentIconFor(agent);
}

const iconBtn =
  "w-10 h-10 rounded-xl flex items-center justify-center text-white/70 hover:text-white border border-white/10 hover:border-white/25 transition-colors duration-200 tap-scale";

export default function TopBar({
  widgets,
  aiOpen,
  setAiOpen,
  googleAppsOpen,
  setGoogleAppsOpen,
  showGoogleApps,
  showFullscreen,
  showCommand,
  onOpenPalette,
  onOpenSettings,
  navOffset = "left-5",
}: {
  widgets: DashboardWidgetVisibility;
  aiOpen: boolean;
  setAiOpen: (v: boolean) => void;
  googleAppsOpen: boolean;
  setGoogleAppsOpen: (v: boolean) => void;
  showGoogleApps: boolean;
  showFullscreen: boolean;
  showCommand: boolean;
  onOpenPalette: () => void;
  onOpenSettings: () => void;
  navOffset?: string;
}) {
  const [agents] = useChromeStorage<DashboardAiAgent[]>(STORAGE_KEYS.DASHBOARD_AI_AGENTS, DEFAULT_AI_AGENTS);
  const list = Array.isArray(agents) ? agents : [];

  return (
    <>
      {widgets.aiAgentsButton && (
        <div className={`absolute top-5 z-40 flex items-center gap-2 ${navOffset}`} onClick={(e) => e.stopPropagation()}>
          {aiOpen ? (
            <>
              <button
                onClick={() => setAiOpen(false)}
                className="flex-shrink-0 inline-flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-semibold text-white border border-red-400/40"
                style={{ background: "rgba(220,60,60,0.28)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)" }}
                aria-label="Close AI Agents"
              >
                <X size={14} />
                <span>Close</span>
              </button>
              <div className="flex items-center gap-2 overflow-x-auto max-w-[62vw] animate-fade-in">
                {list.map((agent) => {
                  const Icon = agentIcon(agent);
                  return (
                    <a
                      key={agent.id}
                      href={agent.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="pill flex-shrink-0 inline-flex items-center gap-2 rounded-full pl-1.5 pr-3.5 py-1.5 text-[13px] font-medium text-white/85 whitespace-nowrap"
                    >
                      <span
                        className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ background: `${agent.color}26`, border: `1px solid ${agent.color}66`, color: agent.color }}
                      >
                        <Icon size={12} />
                      </span>
                      {agent.name}
                    </a>
                  );
                })}
              </div>
            </>
          ) : (
            <button
              onClick={() => setAiOpen(true)}
              className="pill flex-shrink-0 inline-flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-semibold text-white/85"
              aria-label="Open AI Agents"
              aria-expanded={false}
            >
              <Sparkles size={14} className="text-purple-300" />
              <span>AI Agents</span>
            </button>
          )}
        </div>
      )}

      <div className="absolute top-5 right-5 z-40 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
        {showGoogleApps && (
          <div className="relative">
            <button
              onClick={() => setGoogleAppsOpen(!googleAppsOpen)}
              className={`${iconBtn} pill rounded-xl`}
              title="Google Apps"
              aria-label="Google Apps"
              aria-expanded={googleAppsOpen}
            >
              <Grid size={17} />
            </button>
            {googleAppsOpen && (
              <>
                <div className="fixed inset-0 z-40 animate-fade-in" onClick={() => setGoogleAppsOpen(false)} />
                <GoogleAppsPanel />
              </>
            )}
          </div>
        )}
        {showCommand && (
          <button onClick={onOpenPalette} className={`${iconBtn} pill rounded-xl`} title="Command Bar (⌘K)" aria-label="Command Bar">
            <Command size={17} />
          </button>
        )}
        {showFullscreen && (
          <button
            onClick={() => {
              if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
              else document.documentElement.requestFullscreen().catch(() => {});
            }}
            className={`${iconBtn} pill rounded-xl`}
            title="Toggle Full Screen"
            aria-label="Toggle Full Screen"
          >
            <Maximize size={17} />
          </button>
        )}
        <button onClick={onOpenSettings} className={`${iconBtn} pill rounded-xl`} title="Settings" aria-label="Settings">
          <Settings size={17} />
        </button>
      </div>
    </>
  );
}

export const GOOGLE_APPS = [
  { name: "Gmail", url: "https://mail.google.com", icon: "M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" },
  { name: "Drive", url: "https://drive.google.com", icon: "M12 2L4 14l8 8 8-8L12 2z" },
  { name: "Docs", url: "https://docs.google.com", icon: "M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm0 18H6V8h8v12zM4 4h14v2H4V4zm0 4h14v2H4V8z" },
  { name: "Sheets", url: "https://sheets.google.com", icon: "M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zM6 7h4v2H6V7zm0 4h4v2H6v-2zm0 4h4v2H6v-2z" },
  { name: "Slides", url: "https://slides.google.com", icon: "M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 16H7V7h10v12zM9 9h2v2H9V9zm4 0h2v2h-2V9zm4 0h2v2h-2V9zM9 13h2v2H9v-2zm4 0h2v2h-2v-2zm4 0h2v2h-2v-2z" },
  { name: "Calendar", url: "https://calendar.google.com", icon: "M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zM9 12H7v2h2v-2zm0-4H7v2h2V8zm4 4h-2v2h2v-2zm0-4h-2v2h2V8zm4 4h-2v2h2v-2zm0-4h-2v2h2V8z" },
  { name: "YouTube", url: "https://youtube.com", icon: "M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z" },
  { name: "Maps", url: "https://maps.google.com", icon: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" },
  { name: "Photos", url: "https://photos.google.com", icon: "M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" },
  { name: "News", url: "https://news.google.com", icon: "M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10H7v-2h10v2zm0-4H7v-2h10v2zm0-4H7V5h10v2z" },
  { name: "Translate", url: "https://translate.google.com", icon: "M12.87 15.07l-2.54-2.51.03-.03A17.52 17.52 0 0014.07 6H17V4h-7V2H8v2H1v2h11.17C11.5 7.92 10.44 9.75 9 11.35 7.56 12.95 6 15.36 6 18h12c0-2.63-1.56-5.04-3.87-6.93l.02-.02zm-1.86 2.1c.95.3 1.95.46 3 .46 3.12 0 5.7-2.58 5.7-5.7 0-.9-.12-1.77-.34-2.6l-.04-.08.02-.03c.25-.49.39-1.02.39-1.57 0-1.7-1.3-3.06-3-3.06S12 9.1 12 10.8c0 .5.14.97.39 1.4l-.02.04-.03.08c-.2.84-.33 1.7-.34 2.6 0 .73.1 1.43.3 2.11l.04.05.02.02c1.4.16 2.68.67 3.58 1.39l.07.07-2.54 2.54zM18 13H6v-2h12v2z" },
  { name: "Keep", url: "https://keep.google.com", icon: "M21 3H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H3V5h18v14zM11 7h2v2h-2V7zm-4 0h2v2H7V7zm8 8H7v-2h8v2zm0-4H7v-2h8v2zM7 15h2v2H7v-2z" },
  { name: "Meet", url: "https://meet.google.com", icon: "M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 12H4V8h16v10z" },
];

function GoogleAppsPanel() {
  return (
    <div className="absolute right-0 top-12 z-50 w-[340px] rounded-2xl p-3 animate-scale-in-bounce surface shadow-2xl">
      <div className="grid grid-cols-3 gap-2">
        {GOOGLE_APPS.map((app, idx) => (
          <a
            key={app.name}
            href={app.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center gap-2 rounded-xl surface-chip px-2 py-3 tap-scale group"
            style={{ animation: `slideInUp 0.3s cubic-bezier(0.2,0.8,0.2,1) ${idx * 30}ms both` }}
          >
            <span className="flex items-center justify-center text-white group-hover:scale-110 transition-transform duration-300">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <path d={app.icon} />
              </svg>
            </span>
            <span className="text-white/70 text-[11px] font-medium group-hover:text-white">{app.name}</span>
          </a>
        ))}
      </div>
    </div>
  );
}
