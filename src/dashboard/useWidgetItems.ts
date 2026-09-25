import {
  Calendar as CalendarIcon,
  CheckSquare,
  Cloud,
  Flame,
  GitBranch,
  Globe,
  Monitor,
  StickyNote,
  Timer,
} from "lucide-react";
import { STORAGE_KEYS, useChromeStorage } from "@/shared/storage";
import {
  DEFAULT_GITHUB,
  DEFAULT_WORLD_CLOCKS,
  type DashboardWidgetVisibility,
} from "@/shared/types";

export type SheetWidgetId =
  | "date" | "weather" | "tasks" | "notes"
  | "pomodoro" | "github" | "system" | "habits" | "worldClock";

export interface WidgetItem {
  id: SheetWidgetId;
  label: string;
  summary: string;
  icon: React.ElementType;
}

export const WIDGET_TITLES: Record<SheetWidgetId, string> = {
  date: "Date & Calendar",
  weather: "Weather",
  tasks: "My Tasks",
  notes: "My Notes",
  pomodoro: "Pomodoro",
  github: "GitHub",
  system: "Tab Health",
  habits: "Habits",
  worldClock: "World Clock",
};

// ── Live nav items (label + summary) for the sidebar / sheet / palette ──
export function useWidgetItems(widgets: DashboardWidgetVisibility): WidgetItem[] {
  const [tasks] = useChromeStorage<{ id: string; completed: boolean }[]>(STORAGE_KEYS.DASHBOARD_TASKS, []);
  const [notes] = useChromeStorage<{ id: string }[]>(STORAGE_KEYS.DASHBOARD_NOTES, []);
  const [habits] = useChromeStorage<{ id: string }[]>(STORAGE_KEYS.DASHBOARD_HABITS, []);
  const [clocks] = useChromeStorage(STORAGE_KEYS.DASHBOARD_WORLD_CLOCKS, DEFAULT_WORLD_CLOCKS);
  const [github] = useChromeStorage(STORAGE_KEYS.DASHBOARD_GITHUB, DEFAULT_GITHUB);
  const [stats] = useChromeStorage<{ totalDiscardedCount: number }>("discard.stats", { totalDiscardedCount: 0 });
  const [weather] = useChromeStorage(STORAGE_KEYS.DASHBOARD_WEATHER, { cityName: "Thane" } as never);

  const pending = (Array.isArray(tasks) ? tasks : []).filter((t) => !t.completed).length;

  const items: WidgetItem[] = [];
  if (widgets.date) items.push({ id: "date", label: "Calendar", summary: new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }), icon: CalendarIcon });
  if (widgets.weather) items.push({ id: "weather", label: "Weather", summary: (weather as { cityName?: string })?.cityName || "Local", icon: Cloud });
  if (widgets.tasks) items.push({ id: "tasks", label: "Tasks", summary: pending > 0 ? `${pending} pending` : "All done", icon: CheckSquare });
  if (widgets.notes) items.push({ id: "notes", label: "Notes", summary: `${notes.length} note${notes.length === 1 ? "" : "s"}`, icon: StickyNote });
  if (widgets.pomodoro) items.push({ id: "pomodoro", label: "Pomodoro", summary: "Ready to focus?", icon: Timer });
  if (widgets.github) items.push({ id: "github", label: "GitHub", summary: github?.username ? `@${github.username}` : "All Caught Up", icon: GitBranch });
  if (widgets.systemMonitor) items.push({ id: "system", label: "System", summary: stats?.totalDiscardedCount ? `${stats.totalDiscardedCount} freed` : "Tab health", icon: Monitor });
  if (widgets.habits) items.push({ id: "habits", label: "Habits", summary: habits.length > 0 ? `🔥 ${habits.length}` : "Start your first", icon: Flame });
  if (widgets.worldClock) items.push({ id: "worldClock", label: "World Clock", summary: clocks.length > 0 ? `${clocks.length} clocks` : "No clocks", icon: Globe });
  return items;
}
