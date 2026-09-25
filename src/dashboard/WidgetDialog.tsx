import CalendarWidget from "@/dashboard/widgets/Calendar";
import WeatherWidget from "@/dashboard/widgets/Weather";
import TasksWidget from "@/dashboard/widgets/Tasks";
import NotesWidget from "@/dashboard/widgets/Notes";
import PomodoroWidget from "@/dashboard/widgets/Pomodoro";
import GithubWidget from "@/dashboard/widgets/Github";
import SystemWidget from "@/dashboard/widgets/System";
import HabitsWidget from "@/dashboard/widgets/Habits";
import WorldClockWidget from "@/dashboard/widgets/WorldClock";
import type { SheetWidgetId } from "@/dashboard/useWidgetItems";

// ── Suite v2 standard widget modal ──
export default function WidgetDialog({
  id,
  onClose,
}: {
  id: SheetWidgetId;
  onClose: () => void;
}) {
  return (
    <>
      {id === "date" && <CalendarWidget onClose={onClose} />}
      {id === "weather" && <WeatherWidget onClose={onClose} />}
      {id === "tasks" && <TasksWidget onClose={onClose} />}
      {id === "notes" && <NotesWidget onClose={onClose} />}
      {id === "pomodoro" && <PomodoroWidget onClose={onClose} />}
      {id === "github" && <GithubWidget onClose={onClose} />}
      {id === "system" && <SystemWidget onClose={onClose} />}
      {id === "habits" && <HabitsWidget onClose={onClose} />}
      {id === "worldClock" && <WorldClockWidget onClose={onClose} />}
    </>
  );
}
