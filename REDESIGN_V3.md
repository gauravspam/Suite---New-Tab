# Suite v2 — Visual Reboot (v3 direction)

> Status: **PROPOSAL ONLY.** v2-as-built is a reskin of v1 (rail + hero clock + dock + dark glass). This doc proposes layouts that are structurally different while keeping **every feature**. Pick a direction (§5), then I rebuild the shell.

---

## Direction A — "Deck": bento grid — **REMOVED**

- Removed to keep four layouts (Console, Terminal, Map, Orbit). Deleted `dashboard/deck/`, theme/density prefs, and the `theme` wallpaper source.

## Direction B — "Editorial": typographic, ghost UI — **REMOVED**

- Removed alongside the serif clock style. Deleted `dashboard/Sheet.tsx`, the `layout: editorial` option, and the editorial CSS (sheet panel, ghost rows, masthead). Stored `editorial` prefs fall back to suite; stored `serif` clock style falls back to bold.

## Direction C — "Console": sidebar OS, keyboard-first — **BUILT (`layout: console`)**

- Full-height 280px left sidebar = everything (nav + live summaries + tabs), main area = clock/quote only, right inspector panel shows the selected widget large. Vim-style `j/k` + `/` search.
- Implemented in `suite-v2` (`suite.prefs.layout`, switchable in Settings → Prefs → Layout; narrow screens <1100px fall back to suite automatically).

## Direction F — "Terminal": full CLI aesthetic — **BUILT (`layout: terminal`)**

- Black screen, monospace, `$` prompt. Every widget is a command; live data renders as ASCII tables/sparklines/bars. Mouse still works (links open, palette/settings/drawer stay mounted).
- Implemented in `suite-v2/src/dashboard/terminal/`: shared pomodoro engine (`pomodoroStore.ts` — the Pomodoro widget was rewritten on top of it, same UI/semantics), typed output blocks (`types.ts`: text/table/bar/spark), 25-command registry (`commands.ts`) reusing all widget storage keys + APIs (tasks, notes, habits, pom, wt, clocks, open, agents, apps, quote, cal, system, set, layout, bg, dim, discard, search, go, calc, date, settings, echo, whoami, motd, help), history/recall/Tab-completion (`useTerminal.ts`), fullscreen mono UI with live pomodoro statusline (`Terminal.tsx`). Safe arithmetic parser (no `eval`). Switch via `layout terminal` command, `set layout terminal`, or Settings → Prefs → Layout.

## Direction I — "Map": canvas / spatial board — **BUILT (`layout: map`)**

- Infinite-feel pannable/zoomable canvas (drag background to pan, scroll to zoom-to-cursor 0.4–1.6x, dot-grid backdrop). All 9 widgets render as draggable cards reusing the bare widget content, plus time + quote cards; double-click header (or expand button) opens the full modal.
- Positions + camera persist per device in `dashboard.mapLayout` (masonry defaults for first run, saved positions win on merge). Click-to-front z-order, zoom toolbar + reset, debounced persistence. TopBar, Dock, palette, settings drawer and shortcuts modal stay mounted; palette/modal routing falls back to modal dialogs. Switch via Settings → Prefs → Layout, `layout map`, or `set layout map`.

## Direction D — "Orbit": radial / spatial — **BUILT (`layout: orbit`)**

- Clock sun dead-center with widget satellites on an ellipse (`orbit/OrbitBoard` + `orbit/useOrbitKeys`): solid + dashed orbit rings with node ticks, depth-based scale/opacity (lower satellites nearer), hover/Tab/arrows/1-9 pull a satellite into focus with scale-up + z-raise, Enter/Space opens the full modal. Compact two-column fallback under 720×560. TopBar, Dock, palette, settings drawer and shortcuts modal stay mounted; palette/modal routing falls back to modal dialogs. Switch via Settings → Prefs → Layout, `layout orbit`, or `set layout orbit`.

## Direction E — "Era": day-timeline (PROPOSAL)

- Single vertical spine = your day: past above (completed pomodoros, done tasks, morning GitHub), a glowing now-line (clock + current weather), future below (pending tasks, upcoming holidays, habits remaining, clocks ordered by UTC offset). Auto-scrolls to now on load; live regions update in place; everything else opens the existing modals. Pros: time-aware, unlike the other shells. Cons: needs time metadata widgets mostly lack (undated tasks pool in an "unscheduled" bucket); notes and world clocks fit awkwardly.

## Direction G — "Gallery": chrome-less immersion — **REMOVED**

- Removed to keep four layouts (Console, Terminal, Map, Orbit). Deleted `dashboard/gallery/`.

## Direction H — "HUD": corners-anchored overlay — **REMOVED**

- Removed to keep four layouts (Console, Terminal, Map, Orbit). Deleted `dashboard/hud/`.

## Direction J — "Journal": daily briefing page — **REMOVED**

- Removed to keep four layouts (Console, Terminal, Map, Orbit). Deleted `dashboard/journal/` (board + briefing generator + archive).

## Direction L — "Ledger": newspaper broadsheet — **REMOVED**

- Removed to keep four layouts (Console, Terminal, Map, Orbit). Deleted `dashboard/ledger/`.

## Direction M — "Midnight": single-task focus mode — **REMOVED**

- Removed to keep four layouts (Console, Terminal, Map, Orbit). Deleted `dashboard/midnight/`.

## Direction N — "Suite": the original first-built dashboard — **BUILT (`layout: suite`, default)**

- Faithful port of the first built v1 shell (from the specification folder's `src/App.tsx`): floating widget cards down the left edge (`suite/SuiteBoard`), Frost-style hero `Clock` centered with greeting + daily quote, magnification `Dock` across the bottom, shared TopBar above. Cards, dock and top pills use the Apple-style `.liquid-glass` recipe (luminous material, 28px blur + saturation lift, specular top rim, ambient lift shadow). No rail or modules — cards open the shared WidgetDialog, and every feature and storage key stays identical. Switch via Settings → Prefs → Layout, `layout suite`, or `set layout suite`.

---

## What stays identical (all directions)

All features, all storage keys, all modules: 9 widgets + dock + agents + Google apps + fullscreen/command buttons + quote categories + holiday countries + settings drawer content + Discard/Dimmer/YT engines + popup + commands. Only presentation changes.

## Suggested build order (Direction A)

1. Tokens: theme variables (`Paper`/`Midnight`), tile primitives (`Tile`, `TileHeader`), grid shell + top bar.
2. Inline tiles: Time, Tasks, Notes, Pomodoro, Habits (most interactive value first).
3. Weather/Calendar/GitHub/System/WorldClock tiles (+ keep existing modals for detail).
4. Dock row + quote + agents tiles; density pref; wallpaper `theme` source.
5. Command palette; tile reorder (stretch).

## Open questions

1. Direction: **A (Deck) / B (Editorial) / C (Console)**?
2. If A: default theme **Paper or Midnight**? Keep photo wallpapers as an option?
3. Hero clock: demote to tile (A), or keep a medium display somewhere?
4. Anything to cut while we're at it (world clock? habits? agents?)?
