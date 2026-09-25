// ── Suite v2 Map board: infinite-canvas spatial layout ──
// Widgets render as draggable cards; positions + camera persist per device.
// Double-click a card header to open the full modal.

import { useEffect, useRef, useState } from "react";
import { GripVertical, Maximize2, Minus, Plus, RotateCcw, Clock3, Quote } from "lucide-react";
import CalendarWidget from "@/dashboard/widgets/Calendar";
import WeatherWidget from "@/dashboard/widgets/Weather";
import TasksWidget from "@/dashboard/widgets/Tasks";
import NotesWidget from "@/dashboard/widgets/Notes";
import PomodoroWidget from "@/dashboard/widgets/Pomodoro";
import GithubWidget from "@/dashboard/widgets/Github";
import SystemWidget from "@/dashboard/widgets/System";
import HabitsWidget from "@/dashboard/widgets/Habits";
import WorldClockWidget from "@/dashboard/widgets/WorldClock";
import { STORAGE_KEYS, useChromeStorage, getStorage, setStorage } from "@/shared/storage";
import { getQuoteForCategory } from "@/shared/quotes";
import { useNow } from "@/shared/time";
import {
  DEFAULT_DISPLAY,
  DEFAULT_SUITE_PREFS,
  type DashboardWidgetVisibility,
} from "@/shared/types";
import { WIDGET_TITLES, type SheetWidgetId, type WidgetItem } from "@/dashboard/useWidgetItems";

const LAYOUT_KEY = "dashboard.mapLayout";
const CARD_W = 360;
const COL_PITCH = 400;

interface CardPos { x: number; y: number }
interface Cam { x: number; y: number; zoom: number }
interface MapLayout { cards: Record<string, CardPos>; cam: Cam }

type BoardCardId = SheetWidgetId | "time" | "quote";

const ALL_CARDS: BoardCardId[] = [
  "time", "date", "weather", "tasks", "notes", "pomodoro",
  "github", "system", "habits", "worldClock", "quote",
];

const EST_H: Record<BoardCardId, number> = {
  time: 200, quote: 190, date: 560, weather: 480, tasks: 320, notes: 320,
  pomodoro: 560, github: 420, system: 380, habits: 420, worldClock: 360,
};

function defaultCards(): Record<string, CardPos> {
  const cols = [0, 0, 0];
  const out: Record<string, CardPos> = {};
  ALL_CARDS.forEach((id, i) => {
    const col = i % 3;
    out[id] = { x: (col - 1) * COL_PITCH - CARD_W / 2, y: cols[col] - 360 };
    cols[col] += EST_H[id] + 32;
  });
  return out;
}

function defaultCam(): Cam {
  return {
    x: typeof window !== "undefined" ? window.innerWidth / 2 : 800,
    y: typeof window !== "undefined" ? window.innerHeight / 2 : 450,
    zoom: 1,
  };
}

const clampZoom = (z: number) => Math.max(0.4, Math.min(1.6, z));
const noop = () => {};

function TimeCard() {
  const now = useNow(1000);
  const [display] = useChromeStorage(STORAGE_KEYS.DASHBOARD_DISPLAY, DEFAULT_DISPLAY);
  const h24 = now.getHours();
  const mins = now.getMinutes().toString().padStart(2, "0");
  const is12 = display.timeFormat !== "24h";
  const h = is12 ? (h24 % 12 || 12).toString().padStart(2, "0") : h24.toString().padStart(2, "0");
  return (
    <div className="py-2">
      <div className="text-5xl font-thin text-white tabular-nums leading-none">
        {h}:{mins}
        {is12 && <span className="text-lg text-white/50 ml-2">{h24 >= 12 ? "PM" : "AM"}</span>}
      </div>
      <div className="mt-2 text-xs text-white/50">
        {now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
      </div>
    </div>
  );
}

function QuoteCard() {
  const [prefs] = useChromeStorage(STORAGE_KEYS.SUITE_PREFS, DEFAULT_SUITE_PREFS);
  const quote = getQuoteForCategory(prefs.quoteCategory || "General");
  return (
    <div className="py-1">
      <div className="text-sm italic text-white/85 leading-relaxed">"{quote.text}"</div>
      <div className="mt-2 text-[10px] text-white/40 uppercase tracking-[0.2em]">— {quote.author}</div>
    </div>
  );
}

export default function MapBoard({
  items,
  widgets,
  dimmed,
  onOpenWidget,
}: {
  items: WidgetItem[];
  widgets: DashboardWidgetVisibility;
  dimmed: boolean;
  onOpenWidget: (id: SheetWidgetId) => void;
}) {
  const [layout, setLayout] = useState<MapLayout | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [panning, setPanning] = useState(false);
  const boardRef = useRef<HTMLDivElement>(null);
  const layoutRef = useRef<MapLayout>({ cards: defaultCards(), cam: defaultCam() });
  const zRef = useRef(10);
  const [zMap, setZMap] = useState<Record<string, number>>({});
  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load persisted layout once
  useEffect(() => {
    let cancelled = false;
    getStorage<Partial<MapLayout>>(LAYOUT_KEY, {}).then((saved) => {
      if (cancelled) return;
      const defaults = defaultCards();
      const next: MapLayout = {
        cards: { ...defaults, ...(saved.cards || {}) },
        cam: saved.cam || defaultCam(),
      };
      layoutRef.current = next;
      setLayout(next);
    });
    return () => { cancelled = true; };
  }, []);

  function persist(next: MapLayout) {
    layoutRef.current = next;
    if (persistTimer.current) clearTimeout(persistTimer.current);
    persistTimer.current = setTimeout(() => {
      void setStorage(LAYOUT_KEY, layoutRef.current);
    }, 400);
  }

  function bringToFront(id: string) {
    zRef.current += 1;
    const z = zRef.current;
    setZMap((prev) => ({ ...prev, [id]: z }));
  }

  // ── Card drag (header handle) ──
  function onHeaderPointerDown(e: React.PointerEvent, id: string) {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    bringToFront(id);
    const startX = e.clientX;
    const startY = e.clientY;
    const orig = layoutRef.current.cards[id];
    const zoom = layoutRef.current.cam.zoom;
    let moved = false;
    setDragId(id);

    const onMove = (ev: PointerEvent) => {
      if (Math.abs(ev.clientX - startX) + Math.abs(ev.clientY - startY) < 3 && !moved) return;
      moved = true;
      const dx = (ev.clientX - startX) / zoom;
      const dy = (ev.clientY - startY) / zoom;
      const next = {
        ...layoutRef.current,
        cards: { ...layoutRef.current.cards, [id]: { x: orig.x + dx, y: orig.y + dy } },
      };
      layoutRef.current = next;
      setLayout(next);
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      setDragId(null);
      void setStorage(LAYOUT_KEY, layoutRef.current);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  // ── Canvas pan (background drag) ──
  function onBoardPointerDown(e: React.PointerEvent) {
    if (e.button !== 0 || e.target !== boardRef.current) return;
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const orig = { ...layoutRef.current.cam };
    setPanning(true);
    const onMove = (ev: PointerEvent) => {
      const next = { ...layoutRef.current, cam: { ...layoutRef.current.cam, x: orig.x + (ev.clientX - startX), y: orig.y + (ev.clientY - startY) } };
      layoutRef.current = next;
      setLayout(next);
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      setPanning(false);
      void setStorage(LAYOUT_KEY, layoutRef.current);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  // ── Zoom to cursor (non-passive wheel) ──
  useEffect(() => {
    const el = boardRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      setLayout((prev) => {
        if (!prev) return prev;
        const zoom = clampZoom(prev.cam.zoom * Math.exp(-e.deltaY * 0.0015));
        const wx = (mx - prev.cam.x) / prev.cam.zoom;
        const wy = (my - prev.cam.y) / prev.cam.zoom;
        const next = { ...prev, cam: { x: mx - wx * zoom, y: my - wy * zoom, zoom } };
        persist(next);
        return next;
      });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  function zoomStep(factor: number) {
    setLayout((prev) => {
      if (!prev) return prev;
      const el = boardRef.current;
      const cx = el ? el.clientWidth / 2 : window.innerWidth / 2;
      const cy = el ? el.clientHeight / 2 : window.innerHeight / 2;
      const zoom = clampZoom(prev.cam.zoom * factor);
      const wx = (cx - prev.cam.x) / prev.cam.zoom;
      const wy = (cy - prev.cam.y) / prev.cam.zoom;
      const next = { ...prev, cam: { x: cx - wx * zoom, y: cy - wy * zoom, zoom } };
      persist(next);
      return next;
    });
  }

  function resetView() {
    const next: MapLayout = { cards: defaultCards(), cam: defaultCam() };
    layoutRef.current = next;
    setLayout(next);
    setZMap({});
    void setStorage(LAYOUT_KEY, next);
  }

  if (!layout) return null;
  const { cam } = layout;

  const visible: { id: BoardCardId; title: string; icon: React.ReactNode; wide?: boolean }[] = [
    { id: "time", title: "Time", icon: <Clock3 size={14} className="text-white/70" /> },
    ...items.map((i) => ({ id: i.id as BoardCardId, title: WIDGET_TITLES[i.id as SheetWidgetId] ?? i.label, icon: <i.icon size={14} className="text-white/70" /> })),
  ];
  if (widgets.dailyQuote) {
    visible.push({ id: "quote", title: "Daily Quote", icon: <Quote size={14} className="text-white/70" /> });
  }

  function openFor(id: BoardCardId) {
    if (id === "time") onOpenWidget("date");
    else if (id !== "quote") onOpenWidget(id as SheetWidgetId);
  }

  function cardBody(id: BoardCardId) {
    switch (id) {
      case "time": return <TimeCard />;
      case "quote": return <QuoteCard />;
      case "date": return <CalendarWidget onClose={noop} bare />;
      case "weather": return <WeatherWidget onClose={noop} bare />;
      case "tasks": return <TasksWidget onClose={noop} bare />;
      case "notes": return <NotesWidget onClose={noop} bare />;
      case "pomodoro": return <PomodoroWidget onClose={noop} bare />;
      case "github": return <GithubWidget onClose={noop} bare />;
      case "system": return <SystemWidget onClose={noop} bare />;
      case "habits": return <HabitsWidget onClose={noop} bare />;
      case "worldClock": return <WorldClockWidget onClose={noop} bare />;
    }
  }

  return (
    <div className={`absolute inset-0 z-10 overflow-hidden transition-opacity duration-300 ${dimmed ? "opacity-30" : "opacity-100"}`}>
      <div
        ref={boardRef}
        onPointerDown={onBoardPointerDown}
        className={`absolute inset-0 map-grid touch-none select-none ${panning ? "cursor-grabbing" : "cursor-grab"}`}
      >
        <div
          className="absolute top-0 left-0"
          style={{ transform: `translate(${cam.x}px, ${cam.y}px) scale(${cam.zoom})`, transformOrigin: "0 0" }}
        >
          {visible.map((card) => {
            const pos = layout.cards[card.id] ?? { x: 0, y: 0 };
            const dragging = dragId === card.id;
            return (
              <div
                key={card.id}
                onPointerDown={(e) => e.stopPropagation()}
                onDoubleClick={() => openFor(card.id)}
                className={`absolute surface-translucent map-card rounded-2xl w-[360px] ${dragging ? "map-card-dragging" : ""}`}
                style={{ left: pos.x, top: pos.y, zIndex: dragging ? 100 : 10 + (zMap[card.id] ?? 0) }}
              >
                <div
                  onPointerDown={(e) => onHeaderPointerDown(e, card.id)}
                  className={`flex items-center gap-2 px-3.5 py-2.5 border-b border-white/10 rounded-t-2xl ${dragging ? "cursor-grabbing" : "cursor-grab"} touch-none`}
                >
                  <GripVertical size={13} className="text-white/30 flex-shrink-0" />
                  <span className="flex items-center justify-center text-white/70">{card.icon}</span>
                  <span className="flex-1 text-xs font-medium text-white/80 truncate">{card.title}</span>
                  {(card.id !== "time" && card.id !== "quote") && (
                    <button
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => { e.stopPropagation(); openFor(card.id); }}
                      className="text-white/30 hover:text-white/70 tap-scale"
                      title="Expand"
                    >
                      <Maximize2 size={12} />
                    </button>
                  )}
                </div>
                <div className="p-3.5 max-h-[400px] overflow-y-auto text-white/65 text-sm">
                  {cardBody(card.id)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Board toolbar */}
      <div className="absolute left-5 bottom-5 z-40 flex items-center gap-1.5 surface rounded-xl px-2 py-1.5">
        <button onClick={() => zoomStep(1 / 1.2)} className="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center text-white/60 tap-scale" title="Zoom out">
          <Minus size={13} />
        </button>
        <span className="text-[11px] text-white/50 tabular-nums w-10 text-center">{Math.round(cam.zoom * 100)}%</span>
        <button onClick={() => zoomStep(1.2)} className="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center text-white/60 tap-scale" title="Zoom in">
          <Plus size={13} />
        </button>
        <button onClick={resetView} className="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center text-white/60 tap-scale" title="Reset board">
          <RotateCcw size={13} />
        </button>
      </div>
      <div className="absolute right-5 bottom-5 z-40 text-[11px] text-white/30 font-mono hidden md:block">
        drag background to pan · scroll to zoom · drag cards by header · double-click to expand
      </div>
    </div>
  );
}
