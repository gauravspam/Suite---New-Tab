# Suite v2 (rebuild)

Fresh rebuild of the Suite extension from the v1 lessons + `../REDESIGN_PROPOSAL.md`.

## Status

- [x] Foundation: toolchain (Vite 7 + React 19 + Tailwind v4), MV3 manifest, `build:ext` pipeline
- [x] Tokens: Midnight Glass surfaces + motion utilities (`src/index.css`)
- [x] Shared: storage hook, v2 types/defaults, quote categories, `useNow()` hook, holidays helper
- [x] Dashboard shell: `BackgroundLayer` + `Clock` (7 styles) + `Sidebar` rail + `Dock` (magnification) + quote
- [x] P1: `WidgetModal` system + Calendar (42-cell grid, progress, coming-up) / Weather (search, °C/°F, hourly, 5-day) / Tasks / Notes widgets + `SettingsDrawer` (Background/Display/Weather/Widgets/Github/Prefs) + `TopBar` (agents, apps, command, fullscreen, settings) + shortcuts modal
- [x] P2: pomodoro engine (25/5/15 auto-cycle, ring, sessions, sound + notifications, daily totals), GitHub live (public events, relative time), System live (open/discarded/MB, sparkline history, discard-now), habits week-strip (streaks, colors), world clock (UTC offsets, mini dials, search add)
- [x] Modules: Discard engine (worker + presets + whitelist + per-site + commands), Dimmer (overlay/media/dark + schedule window + presets + per-site + popup), YT Fullscreen (theater + remember-per-video wired + Esc + 20px button), settings tabs for all three
- [x] Console shell: 280px sidebar OS (`console/ConsoleSidebar`) + inspector panel (`console/Inspector`, bare widget content) + status bar, vim keys (`console/useConsoleKeys`: j/k/arrows/1-9/Enter/l/Esc//), layout pref with suite fallback + narrow-screen fallback, `WidgetDialog` extractor
- [x] Command palette (`Ctrl/⌘+K`): shortcuts, agents, Google apps, widgets, settings deep-links, actions (fullscreen, dimmer), search-engine fallback
- [x] Terminal shell (Direction F): fullscreen CLI — shared pomodoro engine (`terminal/pomodoroStore.ts`, widget rewritten on top), typed output blocks (`terminal/types.ts`), 25-command registry (`terminal/commands.ts`) reusing all widget storage/APIs, history/recall/completion hook (`useTerminal.ts`), mono UI with statusline (`terminal/Terminal.tsx`); `layout: terminal` in prefs + settings radio
- [x] Map shell (Direction I): pannable/zoomable canvas (`map/MapBoard`) — all 9 widgets as draggable cards reusing bare content, plus time + quote cards; positions + camera persist in `dashboard.mapLayout`; dot-grid backdrop, zoom toolbar, reset, double-click/expand-button opens the full modal; `layout: map` in prefs, settings radio, terminal `set`/`layout` commands
- [x] Orbit shell (Direction D): clock sun at center with live widget satellites on an ellipse (`orbit/OrbitBoard` + `orbit/useOrbitKeys`) — hover/Tab/arrows/1-9 pull a satellite into focus with depth scaling, Enter opens the modal; orbit rings + node ticks; compact column fallback under 720×560; `layout: orbit` in prefs, settings radio, terminal `set`/`layout` commands
- [x] Suite shell (default): the original first-built dashboard ported as `layout: suite` (`suite/SuiteBoard`, from the first build's `Center`/TopBar/BottomDock) — floating liquid-glass widget cards on the left (live summaries → full modals), Frost hero clock + greeting + daily quote centered, magnification Dock, shared TopBar; `layout: suite` in prefs, settings radio, terminal `set`/`layout` commands
- [x] Layout cull: removed Deck, Gallery, HUD, Journal, Ledger, Midnight, Editorial shells + theme/density prefs + `theme` wallpaper source (see REMOVED sections in `REDESIGN_V3.md`); five layouts remain

## Run

```powershell
npm install
npm run dev        # web preview
npm run typecheck  # tsc
npm run build:ext  # → dist/, load as unpacked extension
```

## Notes

- Storage keys are identical to v1 (`dashboard.*`, `suite.prefs`), so settings carry over.
- No `vite-plugin-singlefile`: extension build keeps separate JS/CSS for CSP.
