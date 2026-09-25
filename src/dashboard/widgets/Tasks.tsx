import { useState } from "react";
import { CheckSquare, Plus, X } from "lucide-react";
import WidgetModal from "@/dashboard/WidgetModal";
import { STORAGE_KEYS, useChromeStorage } from "@/shared/storage";
import type { DashboardTask } from "@/shared/types";

export default function TasksWidget({ onClose, bare }: { onClose: () => void; bare?: boolean }) {
  const [tasks, setTasks] = useChromeStorage<DashboardTask[]>(STORAGE_KEYS.DASHBOARD_TASKS, []);
  const [input, setInput] = useState("");

  function add() {
    if (!input.trim()) return;
    setTasks((prev) => [
      ...(Array.isArray(prev) ? prev : []),
      { id: Date.now().toString(), text: input.trim(), completed: false, createdAt: Date.now() },
    ]);
    setInput("");
  }

  const list = Array.isArray(tasks) ? tasks : [];
  const open = list.filter((t) => !t.completed).length;

  return (
    <WidgetModal title="My Tasks" icon={<CheckSquare size={15} className="text-white/85" />} onClose={onClose} bare={bare}>
      <div className="animate-fade-in">
        <div className="text-[10px] text-white/35 uppercase tracking-wider mb-2">{open} open</div>
        <div className="flex items-center gap-2 mb-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
            placeholder="Add a new task…"
            className="flex-1 surface-input px-3 py-2 text-sm"
          />
          <button onClick={add} className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/15 flex items-center justify-center text-white/70 tap-scale" aria-label="Add task">
            <Plus size={16} />
          </button>
        </div>
        <div className="space-y-1">
          {list.map((t, idx) => (
            <label
              key={t.id}
              className="flex items-center gap-3 text-sm text-white/75 cursor-pointer hover:bg-white/[0.06] rounded-lg px-2 py-1.5 -mx-2 transition-colors animate-slide-in-left"
              style={{ animationDelay: `${idx * 30}ms` }}
            >
              <input
                type="checkbox"
                checked={t.completed}
                onChange={() => setTasks((prev) => prev.map((x) => (x.id === t.id ? { ...x, completed: !x.completed } : x)))}
                className="w-4 h-4 rounded accent-emerald-400"
              />
              <span className={`flex-1 ${t.completed ? "line-through text-white/35" : ""}`}>{t.text}</span>
              <button
                onClick={(e) => { e.preventDefault(); setTasks((prev) => prev.filter((x) => x.id !== t.id)); }}
                className="text-white/30 hover:text-red-400 tap-scale"
                aria-label="Delete task"
              >
                <X size={12} />
              </button>
            </label>
          ))}
          {list.length === 0 && (
            <div className="text-white/35 text-xs text-center py-4">No tasks yet — add one above</div>
          )}
        </div>
      </div>
    </WidgetModal>
  );
}
