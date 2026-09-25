// ── Suite v2 terminal: history, exec, recall, completion ──
import { useState, useRef, useCallback } from "react";
import { bootBlocks, commandNames, findCommand } from "@/dashboard/terminal/commands";
import type { TermCtx, TermLine } from "@/dashboard/terminal/types";

function splitArgs(input: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quote: string | null = null;
  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    if (quote) {
      if (c === quote) quote = null;
      else cur += c;
    } else if (c === '"' || c === "'") {
      quote = c;
    } else if (c === " " || c === "\t") {
      if (cur) {
        out.push(cur);
        cur = "";
      }
    } else {
      cur += c;
    }
  }
  if (cur) out.push(cur);
  return out;
}

export function useTerminal(ctx: TermCtx) {
  const [lines, setLines] = useState<TermLine[]>(() => [
    { id: 0, cmd: "", blocks: bootBlocks() },
  ]);
  const [history, setHistory] = useState<string[]>([]);
  const idRef = useRef(1);
  const ctxRef = useRef(ctx);
  ctxRef.current = ctx;

  const exec = useCallback(async (input: string) => {
    const cmd = input.trim();
    if (!cmd) return;
    setHistory((h) => [...h.slice(-99), cmd]);
    const parts = splitArgs(cmd);
    const name = parts[0].toLowerCase();
    const args = parts.slice(1);
    if (name === "clear" || name === "cls") {
      setLines([]);
      return;
    }
    const found = findCommand(name);
    const id = idRef.current++;
    try {
      const blocks = found
        ? await found.run(ctxRef.current, args)
        : [{ kind: "text", text: `command not found: ${name} — try 'help'`, tone: "red" } as const];
      setLines((prev) => [...prev.slice(-499), { id, cmd, blocks }]);
    } catch (e: any) {
      setLines((prev) => [
        ...prev.slice(-499),
        { id, cmd, blocks: [{ kind: "text", text: e?.message || "command failed", tone: "red" }] },
      ]);
    }
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const complete = useCallback((partial: string): string | null => {
    const p = partial.toLowerCase();
    if (!p || p.includes(" ")) return null;
    const hits = commandNames().filter((n) => n.startsWith(p));
    if (hits.length === 0) return null;
    // longest common prefix beyond what was typed
    let prefix = hits[0];
    for (const h of hits.slice(1)) {
      let i = 0;
      while (i < prefix.length && prefix[i] === h[i]) i++;
      prefix = prefix.slice(0, i);
    }
    return prefix.length > partial.length ? prefix : hits.length === 1 ? hits[0] + " " : null;
  }, []);

  return { lines, history, exec, clear, complete };
}
