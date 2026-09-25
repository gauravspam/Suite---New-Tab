// ── Suite v2 terminal: typed output blocks + command context ──

import type { SheetWidgetId } from "@/dashboard/useWidgetItems";

export type BlockTone = "dim" | "normal" | "bright" | "green" | "red" | "yellow";

export type Block =
  | { kind: "text"; text: string; tone?: BlockTone }
  | { kind: "table"; head: string[]; rows: string[][] }
  | { kind: "bar"; label: string; pct: number }
  | { kind: "spark"; values: number[]; label?: string }
  | { kind: "blank" };

export interface TermLine {
  id: number;
  cmd: string;
  blocks: Block[];
}

export interface TermCtx {
  openWidget: (id: SheetWidgetId) => void;
  openSettings: (tab?: string) => void;
  openPalette: () => void;
  setLayout: (l: "console" | "editorial" | "terminal" | "map" | "orbit" | "suite") => void;
}

export interface TermCommand {
  name: string;
  aliases?: string[];
  usage: string;
  description: string;
  run: (ctx: TermCtx, args: string[]) => Promise<Block[]>;
}
