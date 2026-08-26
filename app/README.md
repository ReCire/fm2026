# app/ — the modular codebase

The game, rebuilt as feature modules. The playable prototype still lives in
`../index.html` and stays the reference implementation until the port finishes.

```bash
npm install
npm run dev        # http://localhost:5173
npm run verify     # typecheck + docs gate + tests — what CI runs
```

## The one idea

A feature is a **folder that registers itself with the engine** and owns
everything about itself. Adding one is a folder plus a line in
`src/lib/modules.ts`; deleting one is the same in reverse, and the nav entry,
save slice, tick hooks and documentation all disappear with it.

```
src/lib/features/<name>/
  module.ts      manifest — nav, state, hooks, screen, docs, dependencies
  state.ts       Zod schema + initial state + version + migration
  rules.ts       pure simulation functions (no DOM, no rng of their own)
  rules.test.ts  tests for those pure functions
  Screen.svelte  the UI, composed from src/lib/ui primitives
  content.ts     every tunable number, schema-validated
  docs.ts        tooltip + manual entry + rationale for each control
  positions.ts   (squad) shared leaf types, where a cycle would otherwise form
```

## How a matchday runs

Nothing calls anything else. The engine collects hooks from every enabled
module and runs them in phase order:

```
pre → sim → post → economy → world
```

`engine.runTick()` returns an event log and commits one state change. Stadium
posts gate receipts, squad posts wages, finance charges interest last — and
none of them import each other for control flow.

Each module gets its **own RNG stream**, derived from the game seed and the
module id, so adding a die roll in one feature cannot shift another's outcomes.
Same seed + same actions = the same season, byte for byte.

## Rules that CI enforces

| Rule | Why |
|---|---|
| Every `<Button>` / `<StatChip>` has a `doc` id | The manual stays complete; label, tooltip and aria-label all come from one entry |
| No raw `<button>` in a feature screen | Raw controls bypass the doc registry |
| No `Math.random()` in a `rules.ts` | A season must replay from its seed |
| `doc="…"` must resolve | Catches typos before they reach a screenshot |

Escape hatch: a `docs-check-ignore` comment on the line above, for the rare
control that genuinely needs no entry.

## Layout

```
src/lib/engine/     tick bus · seeded RNG · module contract · registry · saves
src/lib/state/      rune-backed store · undo history
src/lib/design/     tokens.css — the only file that defines a colour
src/lib/ui/         Panel, Button, StatChip, Bar, Sheet, Toast, DataTable
src/lib/docs/       doc registry + the ⓘ bottom sheet
src/lib/features/   every game feature
src/lib/modules.ts  the registry — the only global list
src/routes/         shell, dashboard, and the dynamic module route
```

## State

Svelte 5 runes. `$state` is a deep proxy, so an update is ordinary JavaScript
and reactive at the same time:

```ts
finance.money -= amount;            // reactive, no store API
const bill = $derived(wageBill(squad));
```

There is no `updateUI()`. There is nothing to subscribe to and no selector to
write — reads are tracked per value.

## Saves

IndexedDB, not localStorage — iOS evicts localStorage under storage pressure.
Every module serialises and **migrates its own slice**, so a save written before
a feature existed simply gets that feature's fresh state, and one written before
a feature changed shape runs that feature's `migrate`. Failures are reported in
`notes`, never silent.

## Not built yet

- `studio/` — schema-derived content editor writing back to `content/` as git diffs
- `e2e/` — Playwright screenshot scenarios feeding the generated manual
- `graphics/` — SVG pitch, formation view, charts, generated crests
- Remaining features: league, matchday, transfer, training, youth, staff, fans,
  sponsors, merch, industry, stocks, holding, underworld, cup, europe, doctrine,
  private life, history
