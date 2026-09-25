// ── Suite v2 Shared Types ──

export interface DashboardBackgroundSettings {
  source: "unsplash" | "upload" | "color" | "video";
  unsplashAccessKey?: string;
  refreshInterval: "hour" | "day" | "week" | "never" | "newtab" | "always";
  cachedImageUrl?: string;
  cachedImageAttribution?: string;
  lastFetchedAt?: number;
  fallbackPoolIndex: number;
  customColor?: string;
  customImageUrl?: string;
  customVideoUrl?: string;
}

export interface DashboardDisplaySettings {
  clockStyle: "modern" | "bold" | "thin" | "outline" | "analog" | "glass" | "serif";
  timeFormat: "12h" | "24h";
  showGreeting: boolean;
  customGreeting?: string;
  fontSize: number;
}

export interface DashboardWeatherSettings {
  locationMode: "auto" | "city";
  cityName?: string;
  unit: "celsius" | "fahrenheit";
}

export interface DashboardWidgetVisibility {
  date: boolean;
  weather: boolean;
  tasks: boolean;
  notes: boolean;
  pomodoro: boolean;
  github: boolean;
  systemMonitor: boolean;
  habits: boolean;
  worldClock: boolean;
  quickAccessDock: boolean;
  aiAgentsButton: boolean;
  dailyQuote: boolean;
}

export interface DashboardTask {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
}

export interface DashboardNote {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface DashboardGithubSettings {
  username?: string;
  showContributions: boolean;
  showActivity: boolean;
}

export interface DashboardAiAgent {
  id: string;
  name: string;
  url: string;
  color: string;
}

export interface WorldClockEntry {
  id: string;
  label: string;
  timezone: string;
}

export interface SuiteHabitEntry {
  id: string;
  name: string;
  completedDates: string[];
  habitColor?: string;
}

export interface SuitePrefs {
  debug: boolean;
  dockMagnification?: boolean;
  showGoogleAppsButton?: boolean;
  showFullscreenButton?: boolean;
  showCommandBarButton?: boolean;
  quoteCategory?: string;
  holidayCountry?: string;
  defaultSearchEngine?: string;
  weekStartsOn?: "sun" | "mon";
  layout?: "editorial" | "console" | "terminal" | "map" | "orbit" | "suite";
}

export interface DiscardSettings {
  enabled: boolean;
  idleMinutes: number;
  minInactiveTabsThreshold: number;
  neverDiscardActiveTab: boolean;
  neverDiscardAudibleTab: boolean;
  neverDiscardPinnedTab: boolean;
  neverDiscardWithUnsavedForm: boolean;
  gracePeriodSeconds: number;
  useMemoryPressure: boolean;
  memoryPressureThresholdPercent: number;
  whitelist: string[];
  advancedConditions: {
    onlyWhenIdleState: boolean;
    skipIfOffline: boolean;
  };
}

export interface DiscardPerSiteRule {
  hostname: string;
  mode: "always-keep" | "keep-session" | "allow-discard";
}

export interface DimmerSettings {
  enabled: boolean;
  mode: "overlay" | "media-only";
  intensity: number;
  color: string;
  blur: boolean;
  whitescreenProtection: boolean;
  darkMode: boolean;
  schedule?: { enabled: boolean; startHour: number; endHour: number };
}

export interface DimmerPerSiteSettings {
  [hostname: string]: { enabled: boolean; intensity?: number; color?: string };
}

export interface YtFullscreenSettings {
  enabled: boolean;
  rememberPerVideo: boolean;
  keyboardShortcutEnabled: boolean;
}

// ── Defaults ──

export const DEFAULT_BACKGROUND: DashboardBackgroundSettings = {
  source: "unsplash",
  refreshInterval: "day",
  fallbackPoolIndex: 0,
};

export const DEFAULT_DISPLAY: DashboardDisplaySettings = {
  clockStyle: "serif",
  timeFormat: "12h",
  showGreeting: true,
  fontSize: 100,
};

export const DEFAULT_WEATHER: DashboardWeatherSettings = {
  locationMode: "city",
  cityName: "Thane",
  unit: "celsius",
};

export const DEFAULT_WIDGETS: DashboardWidgetVisibility = {
  date: true,
  weather: true,
  tasks: true,
  notes: true,
  pomodoro: true,
  github: true,
  systemMonitor: true,
  habits: true,
  worldClock: true,
  quickAccessDock: true,
  aiAgentsButton: true,
  dailyQuote: true,
};

export const DEFAULT_GITHUB: DashboardGithubSettings = {
  showContributions: true,
  showActivity: true,
};

export const DEFAULT_SHORTCUTS = [
  { id: "1", name: "Gmail", url: "https://mail.google.com" },
  { id: "2", name: "YouTube", url: "https://youtube.com" },
  { id: "3", name: "GitHub", url: "https://github.com" },
  { id: "4", name: "X", url: "https://x.com" },
  { id: "5", name: "Reddit", url: "https://reddit.com" },
  { id: "6", name: "LinkedIn", url: "https://linkedin.com" },
];

export const DEFAULT_AI_AGENTS: DashboardAiAgent[] = [
  { id: "a1", name: "ChatGPT", url: "https://chat.openai.com", color: "#10a37f" },
  { id: "a2", name: "Gemini", url: "https://gemini.google.com", color: "#4285f4" },
  { id: "a3", name: "Claude", url: "https://claude.ai", color: "#d97757" },
  { id: "a4", name: "DeepSeek", url: "https://chat.deepseek.com", color: "#2563eb" },
  { id: "a5", name: "Grok", url: "https://grok.com", color: "#e5e5e5" },
  { id: "a6", name: "Copilot", url: "https://copilot.microsoft.com", color: "#22c55e" },
  { id: "a7", name: "Perplexity", url: "https://www.perplexity.ai", color: "#7dd3fc" },
];

export const DEFAULT_WORLD_CLOCKS: WorldClockEntry[] = [];
export const DEFAULT_HABITS: SuiteHabitEntry[] = [];

export const DEFAULT_SUITE_PREFS: SuitePrefs = {
  debug: false,
  dockMagnification: true,
  showGoogleAppsButton: true,
  showFullscreenButton: false,
  showCommandBarButton: false,
  quoteCategory: "General",
  holidayCountry: "India",
  defaultSearchEngine: "Google",
  weekStartsOn: "sun",
  layout: "suite",
};

export const DEFAULT_DISCARD_SETTINGS: DiscardSettings = {
  enabled: true,
  idleMinutes: 15,
  minInactiveTabsThreshold: 3,
  neverDiscardActiveTab: true,
  neverDiscardAudibleTab: true,
  neverDiscardPinnedTab: true,
  neverDiscardWithUnsavedForm: true,
  gracePeriodSeconds: 60,
  useMemoryPressure: false,
  memoryPressureThresholdPercent: 15,
  whitelist: [],
  advancedConditions: { onlyWhenIdleState: false, skipIfOffline: false },
};

export const DEFAULT_DISCARD_STATS = {
  totalDiscardedCount: 0,
  estimatedMemorySavedMb: 0,
  lastResetAt: Date.now(),
};

export const DEFAULT_DIMMER_SETTINGS: DimmerSettings = {
  enabled: false,
  mode: "overlay",
  intensity: 40,
  color: "black",
  blur: false,
  whitescreenProtection: true,
  darkMode: false,
};

export const DEFAULT_YT_SETTINGS: YtFullscreenSettings = {
  enabled: true,
  rememberPerVideo: false,
  keyboardShortcutEnabled: true,
};
