// ── Suite v2 terminal: command registry ──
// Every command reuses the same storage keys + APIs as the GUI widgets.

import { GOOGLE_APPS } from "@/dashboard/TopBar";
import { STORAGE_KEYS, getStorage, setStorage } from "@/shared/storage";
import { QUOTE_CATEGORIES, getQuoteForCategory } from "@/shared/quotes";
import { holidaysFor } from "@/shared/holidays";
import {
  DEFAULT_AI_AGENTS,
  DEFAULT_SHORTCUTS,
  DEFAULT_SUITE_PREFS,
  type DashboardAiAgent,
  type DashboardNote,
  type DashboardTask,
  type SuiteHabitEntry,
  type SuitePrefs,
  type WorldClockEntry,
} from "@/shared/types";
import {
  POM_DURATIONS,
  POM_LABELS,
  formatPomClock,
  pomodoroStore,
  type PomMode,
} from "@/dashboard/terminal/pomodoroStore";
import type { Block, BlockTone, TermCommand } from "@/dashboard/terminal/types";

declare const chrome: any;

// ── helpers ──
const txt = (text: string, tone: BlockTone = "normal"): Block => ({ kind: "text", text, tone });
const err = (text: string): Block => ({ kind: "text", text, tone: "red" });
const ok = (text: string): Block => ({ kind: "text", text, tone: "green" });
const dim = (text: string): Block => ({ kind: "text", text, tone: "dim" });

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function pickByIndex<T>(list: T[], n: string): T | null {
  const i = parseInt(n, 10);
  if (!Number.isFinite(i) || i < 1 || i > list.length) return null;
  return list[i - 1];
}

function wmoDesc(code: number): string {
  if (code === 0) return "Clear";
  if (code <= 3) return "Cloudy";
  if (code <= 48) return "Foggy";
  if (code <= 67) return "Rain";
  if (code <= 77) return "Snow";
  return "Storm";
}

async function getPrefs(): Promise<SuitePrefs> {
  return getStorage<SuitePrefs>(STORAGE_KEYS.SUITE_PREFS, DEFAULT_SUITE_PREFS);
}

// Safe arithmetic: tokenizer + recursive descent (no eval).
function calcEval(src: string): number {
  const tokens: (number | string)[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === " " || c === "\t") { i++; continue; }
    if (/[0-9.]/.test(c)) {
      let j = i;
      while (j < src.length && /[0-9.]/.test(src[j])) j++;
      const n = parseFloat(src.slice(i, j));
      if (!Number.isFinite(n)) throw new Error("bad number");
      tokens.push(n);
      i = j;
      continue;
    }
    if ("+-*/%^()".includes(c)) { tokens.push(c); i++; continue; }
    throw new Error(`unexpected '${c}'`);
  }
  let pos = 0;
  function peek(): number | string | undefined { return tokens[pos]; }
  function eat(): number | string | undefined { return tokens[pos++]; }
  function expr(): number {
    let v = term();
    for (;;) {
      const t = peek();
      if (t === "+" || t === "-") { eat(); const r = term(); v = t === "+" ? v + r : v - r; }
      else return v;
    }
  }
  function term(): number {
    let v = factor();
    for (;;) {
      const t = peek();
      if (t === "*" || t === "/" || t === "%") {
        eat();
        const r = factor();
        v = t === "*" ? v * r : t === "/" ? v / r : v % r;
      } else return v;
    }
  }
  function factor(): number {
    const t = peek();
    if (t === "-") { eat(); return -factor(); }
    if (t === "+") { eat(); return factor(); }
    return power();
  }
  function power(): number {
    let v = primary();
    if (peek() === "^") { eat(); v = Math.pow(v, factor()); }
    return v;
  }
  function primary(): number {
    const t = eat();
    if (typeof t === "number") return t;
    if (t === "(") {
      const v = expr();
      if (eat() !== ")") throw new Error("missing ')'");
      return v;
    }
    throw new Error("expected a number");
  }
  const v = expr();
  if (pos !== tokens.length) throw new Error("trailing input");
  if (!Number.isFinite(v)) throw new Error("not finite");
  return parseFloat(v.toPrecision(12));
}

interface Shortcut {
  id: string;
  name: string;
  url: string;
}

async function getShortcuts(): Promise<Shortcut[]> {
  const list = await getStorage<Shortcut[]>(STORAGE_KEYS.DASHBOARD_SHORTCUTS, DEFAULT_SHORTCUTS);
  return Array.isArray(list) ? list : [];
}

// ── commands ──
const helpCmd: TermCommand = {
  name: "help",
  aliases: ["?", "h"],
  usage: "help [command]",
  description: "List commands or show one command's usage",
  run: async (_ctx, args) => {
    if (args[0]) {
      const c = REGISTRY.find((c) => c.name === args[0].toLowerCase() || c.aliases?.includes(args[0].toLowerCase()));
      if (!c) return [err(`unknown command: ${args[0]} — try 'help'`)];
      return [txt(`${c.name}  ${c.usage}`, "bright"), dim(`  ${c.description}`)];
    }
    const rows = REGISTRY.map((c) => [c.name + (c.aliases?.length ? ` (${c.aliases.join(", ")})` : ""), c.description]);
    return [
      txt("suite v2 — terminal. type a command, 'help <cmd>' for usage.", "bright"),
      { kind: "table", head: ["command", "what"], rows },
    ];
  },
};

const tasksCmd: TermCommand = {
  name: "tasks",
  aliases: ["todo", "t"],
  usage: "tasks [add \"text\" | done <n> | del <n> | clear-done]",
  description: "List, add, complete and delete tasks",
  run: async (_ctx, args) => {
    let list = await getStorage<DashboardTask[]>(STORAGE_KEYS.DASHBOARD_TASKS, []);
    if (!Array.isArray(list)) list = [];
    const save = (next: DashboardTask[]) => setStorage(STORAGE_KEYS.DASHBOARD_TASKS, next);
    const [sub, ...rest] = args;
    if (!sub) {
      if (list.length === 0) return [dim("no tasks — tasks add \"buy milk\"")];
      return [{
        kind: "table",
        head: ["#", "done", "task"],
        rows: list.map((t, i) => [(i + 1).toString(), t.completed ? "x" : " ", t.text]),
      }];
    }
    if (sub === "add") {
      const text = rest.join(" ").trim();
      if (!text) return [err("usage: tasks add \"task text\"")];
      await save([...list, { id: Date.now().toString(), text, completed: false, createdAt: Date.now() }]);
      return [ok(`added #${list.length + 1}: ${text}`)];
    }
    if (sub === "done") {
      const t = pickByIndex(list, rest[0]);
      if (!t) return [err(`no task #${rest[0]}`)];
      await save(list.map((x) => (x.id === t.id ? { ...x, completed: !x.completed } : x)));
      return [ok(`${t.completed ? "reopened" : "done"}: ${t.text}`)];
    }
    if (sub === "del" || sub === "rm") {
      const t = pickByIndex(list, rest[0]);
      if (!t) return [err(`no task #${rest[0]}`)];
      await save(list.filter((x) => x.id !== t.id));
      return [ok(`deleted: ${t.text}`)];
    }
    if (sub === "clear-done") {
      const n = list.filter((t) => t.completed).length;
      await save(list.filter((t) => !t.completed));
      return [ok(`cleared ${n} completed`)];
    }
    return [err(`unknown subcommand: ${sub} — tasks [add|done|del|clear-done]`)];
  },
};

const notesCmd: TermCommand = {
  name: "notes",
  aliases: ["n", "note"],
  usage: "notes [add \"text\" | show <n> | pin <n> | del <n>]",
  description: "List, add, pin and delete notes",
  run: async (_ctx, args) => {
    let list = await getStorage<DashboardNote[]>(STORAGE_KEYS.DASHBOARD_NOTES, []);
    if (!Array.isArray(list)) list = [];
    const sorted = [...list].sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt - a.updatedAt);
    const save = (next: DashboardNote[]) => setStorage(STORAGE_KEYS.DASHBOARD_NOTES, next);
    const [sub, ...rest] = args;
    if (!sub) {
      if (sorted.length === 0) return [dim("no notes — notes add \"idea\"")];
      return [{
        kind: "table",
        head: ["#", " ", "note"],
        rows: sorted.map((n, i) => [(i + 1).toString(), n.pinned ? "📌" : "", n.title || n.body.slice(0, 48)]),
      }];
    }
    if (sub === "add") {
      const text = rest.join(" ").trim();
      if (!text) return [err("usage: notes add \"some text\"")];
      const ts = Date.now();
      await save([{ id: String(ts), title: text.split("\n")[0].slice(0, 40), body: text, pinned: false, createdAt: ts, updatedAt: ts }, ...list]);
      return [ok("note added")];
    }
    if (sub === "show") {
      const n = pickByIndex(sorted, rest[0]);
      if (!n) return [err(`no note #${rest[0]}`)];
      return [txt(n.title, "bright"), txt(n.body)];
    }
    if (sub === "pin" || sub === "unpin") {
      const n = pickByIndex(sorted, rest[0]);
      if (!n) return [err(`no note #${rest[0]}`)];
      const to = sub === "pin" ? true : sub === "unpin" ? false : !n.pinned;
      await save(list.map((x) => (x.id === n.id ? { ...x, pinned: to, updatedAt: Date.now() } : x)));
      return [ok(`${to ? "pinned" : "unpinned"}: ${n.title}`)];
    }
    if (sub === "del" || sub === "rm") {
      const n = pickByIndex(sorted, rest[0]);
      if (!n) return [err(`no note #${rest[0]}`)];
      await save(list.filter((x) => x.id !== n.id));
      return [ok(`deleted: ${n.title}`)];
    }
    return [err("usage: notes [add|show|pin|del]")];
  },
};

const habitsCmd: TermCommand = {
  name: "habits",
  aliases: ["h", "habit"],
  usage: "habits [toggle <n> | add \"name\" | del <n>]",
  description: "Week strip, toggle today, manage habits",
  run: async (_ctx, args) => {
    let list = await getStorage<SuiteHabitEntry[]>(STORAGE_KEYS.DASHBOARD_HABITS, []);
    if (!Array.isArray(list)) list = [];
    const prefs = await getPrefs();
    const save = (next: SuiteHabitEntry[]) => setStorage(STORAGE_KEYS.DASHBOARD_HABITS, next);
    const today = todayStr();
    const [sub, ...rest] = args;
    if (sub === "add") {
      const name = rest.join(" ").trim();
      if (!name) return [err("usage: habits add \"name\"")];
      await save([...list, { id: Date.now().toString(), name, completedDates: [] }]);
      return [ok(`habit added: ${name}`)];
    }
    if (sub === "toggle" || sub === "done") {
      const h = pickByIndex(list, rest[0]);
      if (!h) return [err(`no habit #${rest[0]}`)];
      const has = h.completedDates.includes(today);
      await save(list.map((x) => x.id === h.id
        ? { ...x, completedDates: has ? x.completedDates.filter((d) => d !== today) : [...x.completedDates, today] }
        : x));
      return [ok(`${has ? "unticked" : "ticked"} today: ${h.name}`)];
    }
    if (sub === "del" || sub === "rm") {
      const h = pickByIndex(list, rest[0]);
      if (!h) return [err(`no habit #${rest[0]}`)];
      await save(list.filter((x) => x.id !== h.id));
      return [ok(`deleted: ${h.name}`)];
    }
    if (sub && sub !== "list" && sub !== "ls") return [err("usage: habits [toggle|add|del]")];
    if (list.length === 0) return [dim("no habits — habits add \"read\"")];
    const weekStartMon = (prefs.weekStartsOn || "sun") === "mon";
    const now = new Date();
    const dow = (now.getDay() + (weekStartMon ? 6 : 0)) % 7;
    const monday = new Date(now);
    monday.setDate(now.getDate() - dow);
    const keys: string[] = [];
    const letters: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      keys.push(d.toISOString().slice(0, 10));
      letters.push(d.toLocaleDateString("en-US", { weekday: "narrow" }));
    }
    return [{
      kind: "table",
      head: ["#", "habit", ...letters],
      rows: list.map((h, i) => [
        (i + 1).toString(),
        h.name,
        ...keys.map((k) => (h.completedDates.includes(k) ? "x" : "·")),
      ]),
    }];
  },
};

const pomCmd: TermCommand = {
  name: "pom",
  aliases: ["pomodoro", "focus"],
  usage: "pom [start|pause|reset|skip|mode <focus|short|long>|stats]",
  description: "Shared pomodoro engine (same timer as the widget)",
  run: async (_ctx, args) => {
    const [sub, val] = args;
    const s = pomodoroStore.getSnapshot();
    const status = (): Block[] => [
      txt(`${POM_LABELS[s.mode]} ${formatPomClock(s.timeLeft)} — ${s.running ? "running" : "paused"}`, s.running ? "green" : "normal"),
      dim(`today: ${s.stats.focusDone} focus · ${s.stats.focusMinutes} min · cycle ${s.cycle % 4}/4`),
    ];
    if (!sub || sub === "status") return status();
    if (sub === "start") { pomodoroStore.start(); return [ok("timer started")]; }
    if (sub === "pause" || sub === "stop") { pomodoroStore.pause(); return [ok("timer paused")]; }
    if (sub === "toggle") { pomodoroStore.toggle(); return [ok(pomodoroStore.getSnapshot().running ? "timer started" : "timer paused")]; }
    if (sub === "reset") { pomodoroStore.reset(); return [ok("timer reset")]; }
    if (sub === "skip") { pomodoroStore.skip(); return [ok("skipped to next session")]; }
    if (sub === "mode") {
      if (val !== "focus" && val !== "short" && val !== "long") return [err("mode must be focus|short|long")];
      pomodoroStore.setMode(val as PomMode);
      return [ok(`mode: ${POM_LABELS[val as PomMode]} ${formatPomClock(POM_DURATIONS[val as PomMode])}`)];
    }
    if (sub === "stats") {
      return [
        { kind: "bar", label: "cycle", pct: ((s.cycle % 4) / 4) * 100 },
        txt(`focus sessions today: ${s.stats.focusDone} · minutes: ${s.stats.focusMinutes}`),
      ];
    }
    return [err("usage: pom [start|pause|reset|skip|mode|stats]")];
  },
};

async function fetchWeather(city: string, unit: "celsius" | "fahrenheit") {
  let lat: number | null = null;
  let lon: number | null = null;
  let name = city;
  const m = city.match(/^(-?\d+\.?\d*)[,\s]+(-?\d+\.?\d*)$/);
  if (m) {
    lat = parseFloat(m[1]);
    lon = parseFloat(m[2]);
    if (Math.abs(lat) > 90 || Math.abs(lon) > 180) throw new Error("coordinates out of range");
    name = `${lat.toFixed(2)}°, ${lon.toFixed(2)}°`;
  } else {
    const geo = await (await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`)).json();
    const loc = geo.results?.[0];
    if (!loc) throw new Error(`city not found: ${city}`);
    lat = loc.latitude;
    lon = loc.longitude;
    name = loc.name;
  }
  const wx = await (await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min&forecast_days=1&timezone=auto`
  )).json();
  if (!wx?.current) throw new Error("weather unavailable");
  const conv = (c: number) => (unit === "fahrenheit" ? Math.round((c * 9) / 5 + 32) : Math.round(c));
  return {
    name,
    temp: conv(wx.current.temperature_2m),
    code: wx.current.weather_code as number,
    high: conv(wx.daily.temperature_2m_max[0]),
    low: conv(wx.daily.temperature_2m_min[0]),
    unit: unit === "fahrenheit" ? "°F" : "°C",
  };
}

const weatherCmd: TermCommand = {
  name: "wt",
  aliases: ["weather"],
  usage: "wt [city] | wt unit <c|f>",
  description: "Current weather (default: saved city)",
  run: async (_ctx, args) => {
    const settings = await getStorage(STORAGE_KEYS.DASHBOARD_WEATHER, { locationMode: "city", cityName: "Thane", unit: "celsius" } as never) as { cityName?: string; unit: "celsius" | "fahrenheit" };
    if (args[0] === "unit") {
      const u = (args[1] || "").toLowerCase();
      if (u !== "c" && u !== "f" && u !== "celsius" && u !== "fahrenheit") return [err("usage: wt unit <c|f>")];
      const unit = u.startsWith("f") ? "fahrenheit" : "celsius";
      await setStorage(STORAGE_KEYS.DASHBOARD_WEATHER, { ...(settings as object), unit });
      return [ok(`unit: °${unit === "fahrenheit" ? "F" : "C"}`)];
    }
    const city = args.join(" ").trim() || settings.cityName || "Thane";
    try {
      const w = await fetchWeather(city, settings.unit || "celsius");
      return [
        txt(`${w.name}: ${w.temp}${w.unit}, ${wmoDesc(w.code)} (H ${w.high}° L ${w.low}°)`, "bright"),
      ];
    } catch (e: any) {
      return [err(e?.message || "weather failed")];
    }
  },
};

const clocksCmd: TermCommand = {
  name: "clocks",
  aliases: ["clock", "tz", "worldclock"],
  usage: "clocks [add \"Label\" <Timezone> | del <n>]",
  description: "List, add and remove world clocks",
  run: async (_ctx, args) => {
    let list = await getStorage<WorldClockEntry[]>(STORAGE_KEYS.DASHBOARD_WORLD_CLOCKS, []);
    if (!Array.isArray(list)) list = [];
    const save = (next: WorldClockEntry[]) => setStorage(STORAGE_KEYS.DASHBOARD_WORLD_CLOCKS, next);
    const [sub, ...rest] = args;
    const fmt = (tz: string) => {
      try {
        return new Date().toLocaleTimeString("en-US", { timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: true });
      } catch {
        return "--:--";
      }
    };
    if (!sub || sub === "list" || sub === "ls") {
      if (list.length === 0) return [dim('no clocks — clocks add "Tokyo" Asia/Tokyo')];
      return [{
        kind: "table",
        head: ["#", "label", "time", "timezone"],
        rows: list.map((c, i) => [(i + 1).toString(), c.label, fmt(c.timezone), c.timezone]),
      }];
    }
    if (sub === "add") {
      const tz = rest[rest.length - 1];
      const label = rest.slice(0, -1).join(" ").trim();
      if (!label || !tz) return [err('usage: clocks add "Label" <Timezone>  (e.g. clocks add Tokyo Asia/Tokyo)')];
      try {
        new Intl.DateTimeFormat("en-US", { timeZone: tz });
      } catch {
        return [err(`invalid timezone: ${tz}`)];
      }
      await save([...list, { id: `${tz}-${Date.now()}`, label, timezone: tz }]);
      return [ok(`added: ${label} (${tz}) — ${fmt(tz)}`)];
    }
    if (sub === "del" || sub === "rm") {
      const c = pickByIndex(list, rest[0]);
      if (!c) return [err(`no clock #${rest[0]}`)];
      await save(list.filter((x) => x.id !== c.id));
      return [ok(`deleted: ${c.label}`)];
    }
    return [err("usage: clocks [add|del]")];
  },
};

const openCmd: TermCommand = {
  name: "open",
  aliases: ["o", "go", "links"],
  usage: "open [add <name> <url> | del <n> | <n|name>]",
  description: "List, open, add and delete shortcuts",
  run: async (_ctx, args) => {
    const list = await getShortcuts();
    const [sub, ...rest] = args;
    if (!sub) {
      if (list.length === 0) return [dim("no shortcuts")];
      return [{
        kind: "table",
        head: ["#", "name", "url"],
        rows: list.map((s, i) => [(i + 1).toString(), s.name, s.url]),
      }];
    }
    if (sub === "add") {
      const url = rest[rest.length - 1];
      const name = rest.slice(0, -1).join(" ").trim();
      if (!name || !url) return [err("usage: open add <name> <url>")];
      const full = url.startsWith("http") ? url : `https://${url}`;
      await setStorage(STORAGE_KEYS.DASHBOARD_SHORTCUTS, [...list, { id: Date.now().toString(), name, url: full }]);
      return [ok(`added: ${name} → ${full}`)];
    }
    if (sub === "del" || sub === "rm") {
      const s = pickByIndex(list, rest[0]);
      if (!s) return [err(`no shortcut #${rest[0]}`)];
      await setStorage(STORAGE_KEYS.DASHBOARD_SHORTCUTS, list.filter((x) => x.id !== s.id));
      return [ok(`deleted: ${s.name}`)];
    }
    const q = args.join(" ").toLowerCase();
    const byNum = pickByIndex(list, args[0]);
    const s = byNum || list.find((x) => x.name.toLowerCase().includes(q));
    if (!s) return [err(`no shortcut matching: ${args.join(" ")}`)];
    window.open(s.url, "_blank", "noopener");
    return [ok(`opening ${s.name}…`)];
  },
};

const agentsCmd: TermCommand = {
  name: "agents",
  aliases: ["ai"],
  usage: "agents [open <n|name>]",
  description: "List and open AI agents",
  run: async (_ctx, args) => {
    const list = await getStorage<DashboardAiAgent[]>(STORAGE_KEYS.DASHBOARD_AI_AGENTS, DEFAULT_AI_AGENTS);
    const [sub, ...rest] = args;
    if (!sub || sub === "list" || sub === "ls") {
      return [{
        kind: "table",
        head: ["#", "agent", "url"],
        rows: list.map((a, i) => [(i + 1).toString(), a.name, a.url]),
      }];
    }
    if (sub === "open") {
      const q = rest.join(" ").toLowerCase();
      const a = pickByIndex(list, rest[0]) || list.find((x) => x.name.toLowerCase().includes(q));
      if (!a) return [err(`no agent matching: ${rest.join(" ")}`)];
      window.open(a.url, "_blank", "noopener");
      return [ok(`opening ${a.name}…`)];
    }
    return [err("usage: agents [open <n|name>]")];
  },
};

const appsCmd: TermCommand = {
  name: "apps",
  aliases: ["gapps", "google"],
  usage: "apps [open <name>]",
  description: "List and open Google apps",
  run: async (_ctx, args) => {
    const [sub, ...rest] = args;
    if (!sub || sub === "list" || sub === "ls") {
      return [{
        kind: "table",
        head: ["#", "app"],
        rows: GOOGLE_APPS.map((g, i) => [(i + 1).toString(), g.name]),
      }];
    }
    if (sub === "open") {
      const q = rest.join(" ").toLowerCase();
      const g = pickByIndex(GOOGLE_APPS, rest[0]) || GOOGLE_APPS.find((x) => x.name.toLowerCase().includes(q));
      if (!g) return [err(`no app matching: ${rest.join(" ")}`)];
      window.open(g.url, "_blank", "noopener");
      return [ok(`opening ${g.name}…`)];
    }
    return [err("usage: apps [open <name>]")];
  },
};

const quoteCmd: TermCommand = {
  name: "quote",
  aliases: ["q"],
  usage: "quote [category] | quote cats",
  description: "Daily quote, optionally from a category",
  run: async (_ctx, args) => {
    const prefs = await getPrefs();
    if (args[0] === "cats") {
      return [{ kind: "table", head: ["category"], rows: Object.keys(QUOTE_CATEGORIES).map((c) => [c]) }];
    }
    const cat = args.join(" ").trim() || prefs.quoteCategory || "General";
    const quote = getQuoteForCategory(QUOTE_CATEGORIES[cat] ? cat : undefined);
    const shown = QUOTE_CATEGORIES[cat] ? cat : "General";
    return [txt(`"${quote.text}"`, "bright"), dim(`— ${quote.author}  [${shown}]`)];
  },
};

const calCmd: TermCommand = {
  name: "cal",
  aliases: ["calendar"],
  usage: "cal [month] [year]",
  description: "ASCII month grid with holidays + coming up",
  run: async (_ctx, args) => {
    const prefs = await getPrefs();
    const now = new Date();
    const monthNames = ["january","february","march","april","may","june","july","august","september","october","november","december"];
    let month = now.getMonth();
    let year = now.getFullYear();
    if (args[0]) {
      const mi = monthNames.findIndex((m) => m.startsWith(args[0].toLowerCase()));
      const num = parseInt(args[0], 10);
      if (mi >= 0) month = mi;
      else if (num >= 1 && num <= 12) month = num - 1;
      else return [err("bad month — use name or 1-12")];
    }
    if (args[1]) {
      const y = parseInt(args[1], 10);
      if (!Number.isFinite(y) || y < 1970 || y > 2100) return [err("bad year")];
      year = y;
    }
    const holidays = holidaysFor(prefs.holidayCountry, year);
    const keys = new Set(holidays.map((h) => `${h.month}-${h.date}`));
    const days = new Date(year, month + 1, 0).getDate();
    const first = new Date(year, month, 1).getDay();
    const title = `${monthNames[month][0].toUpperCase() + monthNames[month].slice(1)} ${year}`;
    const lines: string[] = [title, "Su Mo Tu We Th Fr Sa"];
    let row = "   ".repeat(first);
    for (let d = 1; d <= days; d++) {
      const isToday = d === now.getDate() && month === now.getMonth() && year === now.getFullYear();
      const hol = keys.has(`${month}-${d}`);
      let cell = d.toString().padStart(2, " ") + " ";
      if (isToday) cell = `[${d.toString().padStart(2, " ")}]`.slice(0, 3);
      else if (hol) cell = d.toString().padStart(2, " ") + "*";
      row += cell;
      if ((first + d) % 7 === 0 || d === days) {
        lines.push(row.trimEnd());
        row = "";
      }
    }
    const blocks: Block[] = lines.map((l, i) => txt(l, i === 0 ? "bright" : "normal"));
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    const upcoming = holidays
      .map((h) => ({ ...h, d: new Date(year, h.month, h.date) }))
      .filter((h) => h.d.getTime() >= t.getTime())
      .sort((a, b) => a.d.getTime() - b.d.getTime())
      .slice(0, 3);
    if (upcoming.length > 0) {
      blocks.push({ kind: "blank" });
      blocks.push(txt("coming up:", "dim"));
      for (const h of upcoming) {
        const diff = Math.round((h.d.getTime() - t.getTime()) / 86400000);
        const when = diff === 0 ? "today" : `in ${diff}d`;
        blocks.push(txt(`* ${h.name} — ${h.d.toLocaleDateString("en-US", { month: "short", day: "numeric" })} (${when})`));
      }
      blocks.push(dim("[ ] today   * holiday"));
    }
    return blocks;
  },
};

const systemCmd: TermCommand = {
  name: "system",
  aliases: ["sys", "health"],
  usage: "system [discard-now]",
  description: "Tab stats, sparkline, discard control",
  run: async (_ctx, args) => {
    const stats = await getStorage(STORAGE_KEYS.DISCARD_STATS, { totalDiscardedCount: 0, estimatedMemorySavedMb: 0 });
    const history = await getStorage<number[]>("dashboard.systemHistory", []);
    let openTabs: number | null = null;
    try {
      if (typeof chrome !== "undefined" && chrome.tabs?.query) {
        const tabs: unknown[] = await chrome.tabs.query({});
        openTabs = tabs.length;
      }
    } catch { /* web preview */ }
    const blocks: Block[] = [
      txt(`open tabs:      ${openTabs ?? "n/a (web preview)"}`),
      txt(`discarded:      ${stats.totalDiscardedCount}`),
      txt(`memory saved:   ~${Math.round(stats.estimatedMemorySavedMb)} MB`),
    ];
    if (history.length > 0) blocks.push({ kind: "spark", values: history.slice(-14), label: "discard history" });
    if (args[0] === "discard-now") {
      try {
        if (typeof chrome === "undefined" || !chrome.runtime?.sendMessage) throw new Error("discard engine not installed");
        const res: any = await chrome.runtime.sendMessage({ type: "DISCARD_TABS_NOW" });
        blocks.push(ok(`discarded ${res?.payload?.count ?? 0} tabs`));
      } catch (e: any) {
        blocks.push(err(e?.message || "discard failed"));
      }
    } else {
      blocks.push(dim("tip: system discard-now"));
    }
    return blocks;
  },
};

const SET_KEYS: Record<string, { parse: (v: string) => unknown; hint: string }> = {
  layout: { parse: (v) => { if (!["console", "terminal", "map", "orbit", "suite"].includes(v)) throw new Error("console|terminal|map|orbit|suite"); return v; }, hint: "console|terminal|map|orbit|suite" },
  quoteCategory: { parse: (v) => { if (!QUOTE_CATEGORIES[v]) throw new Error(Object.keys(QUOTE_CATEGORIES).join("|")); return v; }, hint: Object.keys(QUOTE_CATEGORIES).join("|") },
  holidayCountry: { parse: (v) => { if (!v) throw new Error("a country name"); return v; }, hint: "<country>" },
  defaultSearchEngine: { parse: (v) => { if (!["Google", "DuckDuckGo", "Bing", "Brave"].includes(v)) throw new Error("Google|DuckDuckGo|Bing|Brave"); return v; }, hint: "Google|DuckDuckGo|Bing|Brave" },
  weekStartsOn: { parse: (v) => { if (!["sun", "mon"].includes(v)) throw new Error("sun|mon"); return v; }, hint: "sun|mon" },
  dockMagnification: { parse: parseBool, hint: "on|off" },
  showGoogleAppsButton: { parse: parseBool, hint: "on|off" },
  showFullscreenButton: { parse: parseBool, hint: "on|off" },
  showCommandBarButton: { parse: parseBool, hint: "on|off" },
};

function parseBool(v: string): boolean {
  const t = v.toLowerCase();
  if (["on", "true", "1", "yes"].includes(t)) return true;
  if (["off", "false", "0", "no"].includes(t)) return false;
  throw new Error("on|off");
}

const setCmd: TermCommand = {
  name: "set",
  aliases: ["pref", "config"],
  usage: "set [key] [value]",
  description: "View or change preferences",
  run: async (ctx, args) => {
    const prefs = await getPrefs();
    if (args.length === 0) {
      return [{
        kind: "table",
        head: ["key", "value"],
        rows: Object.keys(SET_KEYS).map((k) => [k, String((prefs as unknown as Record<string, unknown>)[k] ?? "")]),
      }];
    }
    const [key, ...rest] = args;
    const def = SET_KEYS[key];
    if (!def) return [err(`unknown key: ${key} — set (no args) lists keys`)];
    if (rest.length === 0) return [txt(`${key} = ${String((prefs as unknown as Record<string, unknown>)[key] ?? "")}   (${def.hint})`)];
    try {
      const value = def.parse(rest.join(" "));
      const next = { ...prefs, [key]: value };
      await setStorage(STORAGE_KEYS.SUITE_PREFS, next);
      if (key === "layout") ctx.setLayout(value as "console" | "terminal" | "map" | "orbit" | "suite");
      return [ok(`${key} = ${String(value)}`)];
    } catch (e: any) {
      return [err(`bad value — ${key}: ${e?.message || def.hint}`)];
    }
  },
};

const layoutCmd: TermCommand = {
  name: "layout",
  aliases: ["shell", "mode"],
  usage: "layout [console|terminal|map|orbit|suite]",
  description: "Show or switch the dashboard shell",
  run: async (ctx, args) => {
    const prefs = await getPrefs();
    if (!args[0]) return [txt(`shell: ${prefs.layout ?? "suite"}`, "bright"), dim("console = sidebar OS · terminal = this CLI · map = canvas board · orbit = clock sun + satellites · suite = glass cards + hero clock")];
    const v = args[0].toLowerCase();
    if (!["console", "terminal", "map", "orbit", "suite"].includes(v)) return [err("layout console|terminal|map|orbit|suite")];
    ctx.setLayout(v as "console" | "terminal" | "map" | "orbit" | "suite");
    return [ok(`shell → ${v}`)];
  },
};

const bgCmd: TermCommand = {
  name: "bg",
  aliases: ["wallpaper"],
  usage: "bg [next|source <unsplash|upload|color|video>|status]",
  description: "Cycle or switch the background",
  run: async (_ctx, args) => {
    const s = await getStorage(STORAGE_KEYS.DASHBOARD_BACKGROUND, { source: "unsplash", fallbackPoolIndex: 0 } as never) as { source: string; fallbackPoolIndex: number };
    const [sub, val] = args;
    if (!sub) return [txt(`source: ${s.source} · pool: #${s.fallbackPoolIndex}`, "bright"), dim("bg next | bg source <unsplash|upload|color|video> | bg status")];
    if (sub === "status") {
      const full = await getStorage(STORAGE_KEYS.DASHBOARD_BACKGROUND, {} as never) as Record<string, any>;
      const ageS = full.lastFetchedAt ? Math.round((Date.now() - full.lastFetchedAt) / 1000) : null;
      let host = "—";
      try { host = new URL(full.cachedImageUrl || "").hostname || "—"; } catch { /* ignore */ }
      return [
        txt(`source: ${full.source ?? "—"} · interval: ${full.refreshInterval ?? "—"} · pool: #${full.fallbackPoolIndex ?? 0}`, "bright"),
        txt(`key: ${full.unsplashAccessKey ? "set" : "missing"} · cache: ${host} · fetched: ${ageS === null ? "never" : ageS + "s ago"}`, "normal"),
        dim("fresh fetch = refetching every tab · old timestamp + changing photo = URL re-rolling"),
      ];
    }
    if (sub === "next") {
      await setStorage(STORAGE_KEYS.DASHBOARD_BACKGROUND, { ...s, fallbackPoolIndex: (s.fallbackPoolIndex || 0) + 1 });
      return [ok(`wallpaper pool → #${(s.fallbackPoolIndex || 0) + 1}`)];
    }
    if (sub === "source") {
      if (!["unsplash", "upload", "color", "video"].includes(val)) return [err("source unsplash|upload|color|video")];
      await setStorage(STORAGE_KEYS.DASHBOARD_BACKGROUND, { ...s, source: val });
      return [ok(`source → ${val}`)];
    }
    return [err("usage: bg [next|source <s>]")];
  },
};

const dimCmd: TermCommand = {
  name: "dim",
  aliases: ["dimmer"],
  usage: "dim [on|off|toggle|+|-|<0-100>]",
  description: "Screen dimmer control",
  run: async (_ctx, args) => {
    const s = await getStorage(STORAGE_KEYS.DIMMER_SETTINGS, { enabled: false, intensity: 40 } as never) as { enabled: boolean; intensity: number };
    const [sub] = args;
    if (!sub) return [txt(`dimmer: ${s.enabled ? "on" : "off"} @ ${s.intensity}%`, "bright"), dim("dim on|off|toggle|+|-|<0-100>")];
    let next = { ...s };
    if (sub === "on") next.enabled = true;
    else if (sub === "off") next.enabled = false;
    else if (sub === "toggle") next.enabled = !s.enabled;
    else if (sub === "+") next.intensity = Math.min(100, s.intensity + 10);
    else if (sub === "-") next.intensity = Math.max(0, s.intensity - 10);
    else if (/^\d+$/.test(sub)) next.intensity = Math.max(0, Math.min(100, parseInt(sub, 10)));
    else return [err("usage: dim [on|off|toggle|+|-|<0-100>]")];
    await setStorage(STORAGE_KEYS.DIMMER_SETTINGS, next);
    return [ok(`dimmer: ${next.enabled ? "on" : "off"} @ ${next.intensity}%`)];
  },
};

const discardCmd: TermCommand = {
  name: "discard",
  aliases: ["tabs"],
  usage: "discard [now|status]",
  description: "Tab discard engine status + control",
  run: async (_ctx, args) => {
    const s = await getStorage(STORAGE_KEYS.DISCARD_SETTINGS, { enabled: true, idleMinutes: 15 } as never) as { enabled: boolean; idleMinutes: number };
    const stats = await getStorage(STORAGE_KEYS.DISCARD_STATS, { totalDiscardedCount: 0, estimatedMemorySavedMb: 0 });
    if (args[0] === "now") {
      try {
        if (typeof chrome === "undefined" || !chrome.runtime?.sendMessage) throw new Error("discard engine not installed");
        const res: any = await chrome.runtime.sendMessage({ type: "DISCARD_TABS_NOW" });
        return [ok(`discarded ${res?.payload?.count ?? 0} tabs`)];
      } catch (e: any) {
        return [err(e?.message || "discard failed")];
      }
    }
    return [
      txt(`engine: ${s.enabled ? "on" : "off"} · idle ${s.idleMinutes}m`, "bright"),
      txt(`discarded: ${stats.totalDiscardedCount} · saved ~${Math.round(stats.estimatedMemorySavedMb)} MB`),
    ];
  },
};

const SEARCH_ENGINES: Record<string, string> = {
  Google: "https://www.google.com/search?q=",
  DuckDuckGo: "https://duckduckgo.com/?q=",
  Bing: "https://www.bing.com/search?q=",
  Brave: "https://search.brave.com/search?q=",
};

function searchUrl(q: string, engine: string): string {
  if (/^[^\s]+\.[^\s]{2,}$/.test(q) && !q.includes(" ")) {
    return q.startsWith("http") ? q : `https://${q}`;
  }
  return `${SEARCH_ENGINES[engine] || SEARCH_ENGINES.Google}${encodeURIComponent(q)}`;
}

const searchCmd: TermCommand = {
  name: "search",
  aliases: ["s", "g"],
  usage: "search <query>",
  description: "Web search (default engine)",
  run: async (_ctx, args) => {
    const q = args.join(" ").trim();
    if (!q) return [err("usage: search <query>")];
    const prefs = await getPrefs();
    const url = searchUrl(q, prefs.defaultSearchEngine || "Google");
    window.open(url, "_blank", "noopener");
    return [ok(`searching ${prefs.defaultSearchEngine || "Google"}: ${q}`)];
  },
};

const goCmd: TermCommand = {
  name: "go",
  aliases: ["visit"],
  usage: "go <shortcut-name|url>",
  description: "Open a shortcut or URL",
  run: async (_ctx, args) => {
    const q = args.join(" ").trim();
    if (!q) return [err("usage: go <shortcut-name|url>")];
    const list = await getShortcuts();
    const hit = list.find((s) => s.name.toLowerCase().includes(q.toLowerCase()));
    const url = hit ? hit.url : searchUrl(q, "Google");
    window.open(url, "_blank", "noopener");
    return [ok(`opening ${hit ? hit.name : url}…`)];
  },
};

const calcCmd: TermCommand = {
  name: "calc",
  aliases: ["=", "math"],
  usage: "calc <expression>",
  description: "Safe arithmetic (+ - * / % ^ parens)",
  run: async (_ctx, args) => {
    const src = args.join(" ").trim();
    if (!src) return [err("usage: calc 2*(3+4)")];
    try {
      return [txt(`= ${calcEval(src)}`, "green")];
    } catch (e: any) {
      return [err(`calc: ${e?.message || "invalid expression"}`)];
    }
  },
};

const dateCmd: TermCommand = {
  name: "date",
  aliases: ["now", "time"],
  usage: "date",
  description: "Current date and time",
  run: async () => {
    const n = new Date();
    return [txt(n.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }), "bright"), dim(n.toLocaleTimeString("en-US"))];
  },
};

const settingsCmd: TermCommand = {
  name: "settings",
  aliases: ["conf", "config", "prefs"],
  usage: "settings [tab]",
  description: "Open the settings drawer",
  run: async (ctx, args) => {
    ctx.openSettings(args[0]);
    return [ok(args[0] ? `opening settings → ${args[0]}` : "opening settings…")];
  },
};

const echoCmd: TermCommand = {
  name: "echo",
  aliases: [],
  usage: "echo <text>",
  description: "Print text",
  run: async (_ctx, args) => [txt(args.join(" "))],
};

const whoamiCmd: TermCommand = {
  name: "whoami",
  aliases: [],
  usage: "whoami",
  description: "Who are you here",
  run: async () => [txt("guest@suite — tabs are temporary, taste is forever.", "green")],
};

const motdCmd: TermCommand = {
  name: "motd",
  aliases: ["banner", "welcome"],
  usage: "motd",
  description: "Show the welcome banner",
  run: async () => bootBlocks(),
};

export function bootBlocks(): Block[] {
  return [
    txt("suite v2.0 — terminal.", "green"),
    dim("type 'help' for commands · Tab completes · ↑/↓ history · Ctrl+L clears"),
  ];
}

export const REGISTRY: TermCommand[] = [
  helpCmd, tasksCmd, notesCmd, habitsCmd, pomCmd, weatherCmd, clocksCmd,
  openCmd, agentsCmd, appsCmd, quoteCmd, calCmd, systemCmd,
  setCmd, layoutCmd, bgCmd, dimCmd, discardCmd,
  searchCmd, goCmd, calcCmd, dateCmd, settingsCmd,
  echoCmd, whoamiCmd, motdCmd,
];

export function findCommand(name: string): TermCommand | undefined {
  const n = name.toLowerCase();
  return REGISTRY.find((c) => c.name === n || c.aliases?.includes(n));
}

export function commandNames(): string[] {
  return REGISTRY.flatMap((c) => [c.name, ...(c.aliases || [])]);
}
