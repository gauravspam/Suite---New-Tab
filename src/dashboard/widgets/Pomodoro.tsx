import { Pause, Play, RotateCcw, SkipForward, Timer, Bell } from "lucide-react";
import WidgetModal from "@/dashboard/WidgetModal";
import {
  POM_DURATIONS,
  POM_LABELS,
  formatPomClock,
  pomodoroStore,
  usePomodoro,
  type PomMode,
} from "@/dashboard/terminal/pomodoroStore";

export default function PomodoroWidget({ onClose, bare }: { onClose: () => void; bare?: boolean }) {
  const { mode, timeLeft, running, cycle, stats } = usePomodoro();

  function switchMode(m: PomMode) {
    pomodoroStore.setMode(m);
  }

  const total = POM_DURATIONS[mode];
  const progress = 1 - timeLeft / total;
  const R = 54;
  const CIRC = 2 * Math.PI * R;
  const [mins, secs] = formatPomClock(timeLeft).split(":");

  return (
    <WidgetModal title="Pomodoro" icon={<Timer size={15} className="text-white/85" />} onClose={onClose} bare={bare}>
      <div className="animate-fade-in flex flex-col items-center">
        <div className="flex gap-1 p-1 rounded-full bg-black/30 border border-white/10 mb-4">
          {(Object.keys(POM_LABELS) as PomMode[]).map((m) => (
            <button
              key={m}
              onClick={() => switchMode(m)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium tap-scale ${mode === m ? "bg-white/15 text-white" : "text-white/45 hover:text-white/70"}`}
            >
              {POM_LABELS[m]}
            </button>
          ))}
        </div>

        <div className="relative w-40 h-40">
          <svg viewBox="0 0 128 128" className="w-40 h-40 -rotate-90">
            <circle cx="64" cy="64" r={R} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
            <circle
              cx="64" cy="64" r={R} fill="none"
              stroke={mode === "focus" ? "#f87171" : "#34d399"}
              strokeWidth="6" strokeLinecap="round"
              strokeDasharray={`${progress * CIRC} ${CIRC}`}
              className="transition-all duration-1000"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-4xl font-thin text-white tabular-nums">{mins}:{secs}</div>
            <div className="text-[10px] text-white/40 uppercase tracking-widest mt-1">{running ? "running" : "paused"}</div>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-4">
          <button onClick={() => pomodoroStore.toggle()} className="px-6 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white tap-scale flex items-center gap-2 text-sm font-medium" aria-label={running ? "Pause" : "Start"}>
            {running ? <Pause size={15} /> : <Play size={15} />} {running ? "Pause" : "Start"}
          </button>
          <button onClick={() => pomodoroStore.reset()} className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 tap-scale" title="Reset" aria-label="Reset">
            <RotateCcw size={15} />
          </button>
          <button onClick={() => pomodoroStore.skip()} className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 tap-scale" title="Skip to next" aria-label="Skip">
            <SkipForward size={15} />
          </button>
        </div>

        <div className="flex items-center gap-1.5 mt-4">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className={`w-2 h-2 rounded-full ${i < cycle % 4 ? "bg-emerald-400" : "bg-white/15"}`} />
          ))}
        </div>
        <div className="text-white/40 text-xs mt-2">
          Today: {stats.focusDone} focus · {stats.focusMinutes} min
        </div>
        {typeof Notification !== "undefined" && Notification.permission !== "granted" && (
          <button
            onClick={() => Notification.requestPermission().catch(() => {})}
            className="mt-2 text-[11px] text-white/40 hover:text-white/70 flex items-center gap-1.5 tap-scale"
          >
            <Bell size={11} /> Enable session notifications
          </button>
        )}
      </div>
    </WidgetModal>
  );
}
