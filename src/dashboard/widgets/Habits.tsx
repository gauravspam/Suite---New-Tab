import { useState } from "react";
import { Check, Flame, Plus, X } from "lucide-react";
import WidgetModal from "@/dashboard/WidgetModal";
import { STORAGE_KEYS, useChromeStorage } from "@/shared/storage";
import { DEFAULT_HABITS, DEFAULT_SUITE_PREFS, type SuiteHabitEntry } from "@/shared/types";

const COLORS = ["#f87171", "#fb923c", "#fbbf24", "#a3e635", "#34d399", "#22d3ee", "#818cf8", "#c084fc", "#f472b6"];

function dayKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

function weekDays(weekStartsOn: string): Date[] {
  const today = new Date();
  const dow = (today.getDay() + (weekStartsOn === "mon" ? 6 : 0)) % 7; // 0 = week start
  const monday = new Date(today);
  monday.setDate(today.getDate() - dow);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function streak(h: SuiteHabitEntry): number {
  const set = new Set(h.completedDates);
  let n = 0;
  const d = new Date();
  if (!set.has(dayKey(d))) d.setDate(d.getDate() - 1);
  while (set.has(dayKey(d))) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}

export default function HabitsWidget({ onClose, bare }: { onClose: () => void; bare?: boolean }) {
  const [habits, setHabits] = useChromeStorage<SuiteHabitEntry[]>(STORAGE_KEYS.DASHBOARD_HABITS, DEFAULT_HABITS);
  const [prefs] = useChromeStorage(STORAGE_KEYS.SUITE_PREFS, DEFAULT_SUITE_PREFS);
  const [name, setName] = useState("");
  const [adding, setAdding] = useState(false);

  const list = Array.isArray(habits) ? habits : [];
  const days = weekDays(prefs.weekStartsOn || "sun");
  const today = dayKey(new Date());

  function toggle(id: string, key: string) {
    setHabits((prev) =>
      prev.map((h) => {
        if (h.id !== id) return h;
        const done = h.completedDates.includes(key);
        return { ...h, completedDates: done ? h.completedDates.filter((d) => d !== key) : [...h.completedDates, key] };
      })
    );
  }

  function add() {
    if (!name.trim()) return;
    const color = COLORS[list.length % COLORS.length];
    setHabits((prev) => [
      ...prev,
      { id: Date.now().toString(), name: name.trim(), completedDates: [], habitColor: color },
    ]);
    setName("");
    setAdding(false);
  }

  return (
    <WidgetModal title="Habits" icon={<Flame size={15} className="text-white/85" />} onClose={onClose} bare={bare}>
      <div className="animate-fade-in">
        <div className="grid grid-cols-7 gap-1 text-center mb-3">
          {days.map((d) => (
            <div key={d.toISOString()} className={`text-[10px] font-medium ${dayKey(d) === today ? "text-white" : "text-white/35"}`}>
              {d.toLocaleDateString("en-US", { weekday: "narrow" })}
            </div>
          ))}
        </div>

        <div className="space-y-2 mb-3">
          {list.map((h, idx) => {
            const color = h.habitColor || COLORS[0];
            const st = streak(h);
            return (
              <div key={h.id} className="rounded-xl surface-chip p-3 animate-slide-in-left" style={{ animationDelay: `${idx * 40}ms` }}>
                <div className="flex items-center gap-2 group">
                  <span className="text-sm flex-1 text-white/85 truncate">{h.name}</span>
                  {st > 1 && (
                    <span className="text-[11px] text-amber-300 flex items-center gap-0.5 flex-shrink-0">
                      <Flame size={11} /> {st}
                    </span>
                  )}
                  <button onClick={() => setHabits((prev) => prev.filter((x) => x.id !== h.id))} className="opacity-0 group-hover:opacity-100 text-white/30 hover:text-red-400 tap-scale" aria-label="Delete habit">
                    <X size={12} />
                  </button>
                </div>
                <div className="grid grid-cols-7 gap-1 mt-2">
                  {days.map((d) => {
                    const key = dayKey(d);
                    const done = h.completedDates.includes(key);
                    const isToday = key === today;
                    return (
                      <button
                        key={key}
                        onClick={() => toggle(h.id, key)}
                        className={`aspect-square rounded-lg flex items-center justify-center tap-scale border ${
                          done ? "" : "border-white/10 bg-white/[0.04] hover:bg-white/[0.09]"
                        } ${isToday && !done ? "border-white/30" : ""}`}
                        style={done ? { background: `${color}33`, borderColor: color } : undefined}
                        aria-label={`${h.name} ${key}`}
                      >
                        {done && <Check size={11} style={{ color }} strokeWidth={3} />}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {list.length === 0 && (
            <div className="text-white/35 text-xs text-center py-4">No habits yet — start your first below</div>
          )}
        </div>

        {adding ? (
          <div className="flex gap-2 animate-slide-in-up">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && add()}
              placeholder="Habit name…"
              autoFocus
              className="flex-1 surface-input px-3 py-2 text-sm"
            />
            <button onClick={add} className="px-3 rounded-xl bg-white/10 hover:bg-white/15 text-white/70 tap-scale" aria-label="Save habit">
              <Check size={14} />
            </button>
          </div>
        ) : (
          <button onClick={() => setAdding(true)} className="text-white/40 text-xs hover:text-white/65 flex items-center gap-1.5 tap-scale">
            <Plus size={12} /> Add habit
          </button>
        )}
      </div>
    </WidgetModal>
  );
}
