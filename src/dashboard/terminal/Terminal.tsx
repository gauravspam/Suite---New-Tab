import { useState, useEffect, useRef } from "react";
import { useTerminal } from "@/dashboard/terminal/useTerminal";
import { usePomodoro, formatPomClock, POM_LABELS } from "@/dashboard/terminal/pomodoroStore";
import { useNow } from "@/shared/time";
import type { Block, TermCtx } from "@/dashboard/terminal/types";

function toneClass(tone: NonNullable<Extract<Block, { kind: "text" }>["tone"]>): string {
  switch (tone) {
    case "dim": return "text-white/35";
    case "bright": return "text-white/95";
    case "green": return "text-emerald-300";
    case "red": return "text-red-300";
    case "yellow": return "text-amber-200";
    default: return "text-white/75";
  }
}

function renderBlock(b: Block, key: number) {
  switch (b.kind) {
    case "blank":
      return <div key={key} className="h-2" />;
    case "text":
      return <div key={key} className={`whitespace-pre-wrap break-words ${toneClass(b.tone || "normal")}`}>{b.text}</div>;
    case "table": {
      const widths = b.head.map((h, i) => Math.max(h.length, ...b.rows.map((r) => (r[i] || "").length)));
      const pad = (s: string, i: number) => s.padEnd(widths[i], " ");
      return (
        <div key={key} className="overflow-x-auto">
          <div className="text-white/35">{b.head.map(pad).join("  ")}</div>
          <div className="text-white/20">{"─".repeat(Math.min(72, widths.reduce((a, w) => a + w + 2, 0)))}</div>
          {b.rows.map((r, i) => (
            <div key={i} className="text-white/80 whitespace-pre">{r.map((c, j) => pad(c || "", j)).join("  ")}</div>
          ))}
        </div>
      );
    }
    case "bar": {
      const w = 28;
      const fill = Math.round(Math.max(0, Math.min(100, b.pct)) / 100 * w);
      return (
        <div key={key} className="text-white/75 whitespace-pre">
          {b.label.padEnd(12, " ")}[{"█".repeat(fill)}{"░".repeat(w - fill)}] {Math.round(b.pct)}%
        </div>
      );
    }
    case "spark": {
      const glyphs = "▁▂▃▄▅▆▇█";
      const max = Math.max(1, ...b.values);
      const bars = b.values.map((v) => glyphs[Math.min(7, Math.round((v / max) * 7))]).join("");
      return (
        <div key={key} className="text-emerald-300 whitespace-pre">
          {bars}{b.label ? <span className="text-white/35">  {b.label}</span> : null}
        </div>
      );
    }
  }
}

export default function Terminal({ ctx }: { ctx: TermCtx }) {
  const { lines, history, exec, clear, complete } = useTerminal(ctx);
  const [value, setValue] = useState("");
  const [histIdx, setHistIdx] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const now = useNow(1000);
  const pom = usePomodoro();

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      void exec(value);
      setValue("");
      setHistIdx(null);
      setDraft("");
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (history.length === 0) return;
      if (histIdx === null) setDraft(value);
      const next = histIdx === null ? history.length - 1 : Math.max(0, histIdx - 1);
      setHistIdx(next);
      setValue(history[next]);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (histIdx === null) return;
      if (histIdx >= history.length - 1) {
        setHistIdx(null);
        setValue(draft);
      } else {
        const next = histIdx + 1;
        setHistIdx(next);
        setValue(history[next]);
      }
    } else if (e.key === "Tab") {
      e.preventDefault();
      const hit = complete(value);
      if (hit) setValue(hit);
    } else if (e.key === "l" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      clear();
    }
  }

  const clock = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });

  return (
    <div className="fixed inset-0 z-20 flex flex-col" style={{ background: "#05070c" }} onClick={() => inputRef.current?.focus()}>
      {/* header strip */}
      <header className="flex items-center justify-between px-5 pt-4 pb-2 font-mono text-[11px] text-white/35 flex-shrink-0">
        <span>
          <span className="text-emerald-300">●</span>
          <span className="ml-2">suite v2.0 — terminal</span>
        </span>
        <span className="tabular-nums">{clock}</span>
      </header>

      {/* scrollback */}
      <div ref={scrollRef} className="term-scroll flex-1 overflow-y-auto px-5 pb-2 font-mono text-[13px] leading-[1.55]">
        {lines.map((line) => (
          <div key={line.id} className="mb-1.5">
            {line.cmd && (
              <div className="flex gap-2">
                <span className="text-emerald-300 flex-shrink-0">$</span>
                <span className="text-white/90 break-all">{line.cmd}</span>
              </div>
            )}
            <div className="pl-4">{line.blocks.map(renderBlock)}</div>
          </div>
        ))}
      </div>

      {/* input row */}
      <div className="px-5 pb-3 flex-shrink-0">
        <div className="flex items-center gap-2 font-mono text-[13px]">
          <span className="text-emerald-300 flex-shrink-0">$</span>
          <input
            ref={inputRef}
            value={value}
            onChange={(e) => { setValue(e.target.value); setHistIdx(null); }}
            onKeyDown={onKeyDown}
            placeholder="type 'help'…"
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            className="flex-1 bg-transparent outline-none text-white/90 placeholder-white/20 caret-emerald-300"
            aria-label="Terminal input"
          />
        </div>
      </div>

      {/* statusline */}
      <footer className="flex items-center justify-between px-5 h-8 border-t border-white/10 font-mono text-[11px] text-white/35 flex-shrink-0" style={{ background: "rgba(8,10,18,0.9)" }}>
        <span>
          <span className="text-white/60">terminal</span>
          <span className="mx-2 text-white/15">|</span>
          {POM_LABELS[pom.mode]} {formatPomClock(pom.timeLeft)} {pom.running ? <span className="text-emerald-300">●</span> : <span className="text-white/25">○</span>}
        </span>
        <span className="hidden md:block">
          <span className="kbd">tab</span> complete
          <span className="mx-1.5 text-white/15">·</span>
          <span className="kbd">↑↓</span> history
          <span className="mx-1.5 text-white/15">·</span>
          <span className="kbd">^L</span> clear
        </span>
      </footer>
    </div>
  );
}
