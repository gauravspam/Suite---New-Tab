import {
  Calendar as CalendarIcon,
  CheckSquare,
  ChevronRight,
  Cloud,
  Flame,
  GitBranch,
  Globe,
  Monitor,
  StickyNote,
  Timer,
} from "lucide-react";
import CalendarWidget from "@/dashboard/widgets/Calendar";
import WeatherWidget from "@/dashboard/widgets/Weather";
import TasksWidget from "@/dashboard/widgets/Tasks";
import NotesWidget from "@/dashboard/widgets/Notes";
import PomodoroWidget from "@/dashboard/widgets/Pomodoro";
import GithubWidget from "@/dashboard/widgets/Github";
import SystemWidget from "@/dashboard/widgets/System";
import HabitsWidget from "@/dashboard/widgets/Habits";
import WorldClockWidget from "@/dashboard/widgets/WorldClock";
import { WIDGET_TITLES, type SheetWidgetId } from "@/dashboard/useWidgetItems";

const ICONS: Record<SheetWidgetId, React.ReactNode> = {
  date: <CalendarIcon size={15} className="text-white/85" />,
  weather: <Cloud size={15} className="text-white/85" />,
  tasks: <CheckSquare size={15} className="text-white/85" />,
  notes: <StickyNote size={15} className="text-white/85" />,
  pomodoro: <Timer size={15} className="text-white/85" />,
  github: <GitBranch size={15} className="text-white/85" />,
  system: <Monitor size={15} className="text-white/85" />,
  habits: <Flame size={15} className="text-white/85" />,
  worldClock: <Globe size={15} className="text-white/85" />,
};

// ── Console inspector: selected widget rendered large, no modal chrome ──
export default function Inspector({ id, onToggle }: { id: SheetWidgetId | null; onToggle: () => void }) {
  const noop = () => {};

  return (
    <section
      data-inspector
      tabIndex={-1}
      aria-label={id ? WIDGET_TITLES[id] : "Inspector"}
      className="absolute right-5 top-20 bottom-14 w-[400px] z-30 inspector-panel rounded-2xl p-5 overflow-y-auto animate-fade-in focus-ring"
    >
      <button
        onClick={onToggle}
        title="Collapse widget panel"
        aria-label="Collapse widget panel"
        className="absolute -left-3 top-1/2 -translate-y-1/2 z-40 w-6 h-16 rounded-xl bg-black/50 hover:bg-black/65 border border-white/10 flex items-center justify-center text-white/50 hover:text-white/90 tap-scale"
        style={{ backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)" }}
      >
        <ChevronRight size={14} />
      </button>
      {id === null ? (
        <div className="h-full flex items-center justify-center text-white/30 text-sm">
          Select a widget <span className="kbd mx-1">1–9</span> or move with <span className="kbd mx-1">j</span><span className="kbd">k</span>
        </div>
      ) : (
        <div key={id} className="animate-fade-in">
          <div className="flex items-center gap-2.5 mb-4">
            <span className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
              {ICONS[id]}
            </span>
            <h2 className="text-[15px] text-white/90 font-semibold">{WIDGET_TITLES[id]}</h2>
          </div>
          <div className="text-white/65 text-sm">
            {id === "date" && <CalendarWidget onClose={noop} bare />}
            {id === "weather" && <WeatherWidget onClose={noop} bare />}
            {id === "tasks" && <TasksWidget onClose={noop} bare />}
            {id === "notes" && <NotesWidget onClose={noop} bare />}
            {id === "pomodoro" && <PomodoroWidget onClose={noop} bare />}
            {id === "github" && <GithubWidget onClose={noop} bare />}
            {id === "system" && <SystemWidget onClose={noop} bare />}
            {id === "habits" && <HabitsWidget onClose={noop} bare />}
            {id === "worldClock" && <WorldClockWidget onClose={noop} bare />}
          </div>
        </div>
      )}
    </section>
  );
}
