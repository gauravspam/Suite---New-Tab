// ── Suite v2 shared pomodoro engine ──
// Single ticker + persisted state, shared by the Pomodoro widget and the
// terminal `pom` commands. Logic mirrors the original widget semantics.

import { getStorage, setStorage } from "@/shared/storage";

export type PomMode = "focus" | "short" | "long";

export const POM_DURATIONS: Record<PomMode, number> = {
  focus: 25 * 60,
  short: 5 * 60,
  long: 15 * 60,
};

export const POM_LABELS: Record<PomMode, string> = {
  focus: "Focus",
  short: "Short Break",
  long: "Long Break",
};

export interface PomDayStats {
  date: string;
  focusDone: number;
  focusMinutes: number;
}

export interface PomSession {
  ts: number;
  mode: PomMode;
  minutes: number;
}

export const POM_LOG_KEY = "dashboard.pomodoroLog";
const POM_LOG_CAP = 100;

async function appendSessionLog(mode: PomMode, minutes: number) {
  try {
    const log = await getStorage<PomSession[]>(POM_LOG_KEY, []);
    const next = [...(Array.isArray(log) ? log : []), { ts: Date.now(), mode, minutes }];
    await setStorage(POM_LOG_KEY, next.slice(-POM_LOG_CAP));
  } catch { /* journal log is best-effort */ }
}

export interface PomSnapshot {
  mode: PomMode;
  timeLeft: number;
  running: boolean;
  cycle: number;
  stats: PomDayStats;
}

const STORAGE_KEY = "dashboard.pomodoro";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export function pomBeep() {
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new Ctx();
    [0, 0.25, 0.5].forEach((t, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g);
      g.connect(ctx.destination);
      o.frequency.value = i === 2 ? 880 : 660;
      o.start(ctx.currentTime + t);
      o.stop(ctx.currentTime + t + 0.2);
      g.gain.setValueAtTime(0.15, ctx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.2);
    });
    setTimeout(() => ctx.close(), 1200);
  } catch { /* audio unavailable */ }
}

export function pomNotify(title: string, body: string) {
  try {
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      new Notification(title, { body });
    }
  } catch { /* ignore */ }
}

// ── Module-level store ──
let state: PomSnapshot = {
  mode: "focus",
  timeLeft: POM_DURATIONS.focus,
  running: false,
  cycle: 0,
  stats: { date: todayStr(), focusDone: 0, focusMinutes: 0 },
};

const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;
let loaded = false;

function emit() {
  listeners.forEach((cb) => cb());
}

function persist() {
  void setStorage(STORAGE_KEY, {
    mode: state.mode,
    timeLeft: state.timeLeft,
    cycle: state.cycle,
    stats: state.stats,
  });
}

function rolloverIfNeeded() {
  if (state.stats.date !== todayStr()) {
    state = { ...state, stats: { date: todayStr(), focusDone: 0, focusMinutes: 0 }, cycle: 0 };
  }
}

function tick() {
  rolloverIfNeeded();
  if (!state.running) return;
  if (state.timeLeft > 1) {
    state = { ...state, timeLeft: state.timeLeft - 1 };
    emit();
    return;
  }
  // session complete
  pomBeep();
  if (state.mode === "focus") {
    const done = state.stats.focusDone + 1;
    void appendSessionLog("focus", 25);
    const nextCycle = state.cycle + 1;
    const next: PomMode = nextCycle % 4 === 0 ? "long" : "short";
    pomNotify("Focus complete", `${POM_LABELS[next]} started — take a breath.`);
    state = {
      ...state,
      mode: next,
      timeLeft: POM_DURATIONS[next],
      cycle: nextCycle,
      stats: { date: todayStr(), focusDone: done, focusMinutes: state.stats.focusMinutes + 25 },
    };
  } else {
    const mins = state.mode === "long" ? 15 : 5;
    void appendSessionLog(state.mode, mins);
    pomNotify("Break over", "Back to focus.");
    state = { ...state, mode: "focus", timeLeft: POM_DURATIONS.focus };
  }
  persist();
  emit();
}

function ensureTimer() {
  if (timer === null) timer = setInterval(tick, 1000);
}

async function loadPersisted() {
  if (loaded) return;
  loaded = true;
  try {
    const saved = await getStorage<{
      mode?: PomMode;
      timeLeft?: number;
      cycle?: number;
      stats?: PomDayStats;
    }>(STORAGE_KEY, {});
    rolloverIfNeeded();
    const mode = saved.mode && POM_DURATIONS[saved.mode] ? saved.mode : state.mode;
    state = {
      mode,
      timeLeft:
        typeof saved.timeLeft === "number" && saved.timeLeft > 0 && saved.timeLeft <= POM_DURATIONS[mode]
          ? Math.floor(saved.timeLeft)
          : POM_DURATIONS[mode],
      running: false,
      cycle: typeof saved.cycle === "number" ? saved.cycle : 0,
      stats: saved.stats && saved.stats.date === todayStr() ? saved.stats : state.stats,
    };
    emit();
  } catch { /* keep defaults */ }
}

void loadPersisted();

// ── Actions ──
export const pomodoroStore = {
  getSnapshot(): PomSnapshot {
    return state;
  },
  subscribe(cb: () => void): () => void {
    listeners.add(cb);
    return () => {
      listeners.delete(cb);
    };
  },
  start() {
    rolloverIfNeeded();
    state = { ...state, running: true };
    ensureTimer();
    emit();
  },
  pause() {
    state = { ...state, running: false };
    persist();
    emit();
  },
  toggle() {
    if (state.running) pomodoroStore.pause();
    else pomodoroStore.start();
  },
  reset() {
    state = { ...state, running: false, timeLeft: POM_DURATIONS[state.mode] };
    persist();
    emit();
  },
  setMode(m: PomMode) {
    state = { ...state, running: false, mode: m, timeLeft: POM_DURATIONS[m] };
    persist();
    emit();
  },
  skip() {
    if (state.mode === "focus") {
      const next: PomMode = (state.cycle + 1) % 4 === 0 ? "long" : "short";
      state = { ...state, running: false, mode: next, timeLeft: POM_DURATIONS[next] };
    } else {
      state = { ...state, running: false, mode: "focus", timeLeft: POM_DURATIONS.focus };
    }
    persist();
    emit();
  },
};

// ── React hook ──
import { useSyncExternalStore } from "react";

export function usePomodoro(): PomSnapshot {
  return useSyncExternalStore(pomodoroStore.subscribe, pomodoroStore.getSnapshot, pomodoroStore.getSnapshot);
}

export function formatPomClock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const s = (totalSeconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}
