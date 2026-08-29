# Adding a feature

A feature is one folder under `src/lib/features/<id>/` plus one line in
`src/lib/modules.ts`. Nothing else. The nav entry, the save slice, the tick
hooks, the tooltips and the Studio panel all follow from the folder — and
deleting the folder and the line deletes the feature completely.

This document exists so that adding the twenty-fifth feature costs the same as
adding the fifth.

## The files

| file | required | what it holds |
|---|---|---|
| `state.ts` | yes | the Zod schema, `create*()`, the version, `migrate*()` |
| `module.ts` | yes | `defineModule({...})` — id, nav, requires, hooks |
| `rules.ts` | if it has logic | pure functions over state. No `Math.random()` — ever |
| `rules.test.ts` | if `rules.ts` exists | enforced by `wiring.test.ts` |
| `docs.ts` | if it has a screen | one entry per control, via `defineDocs` |
| `Screen.svelte` | if the player sees it | structure + the `$lib/ui` kit |
| `content.ts` | if it has data | names, tables, copy — no logic |

`Screen.svelte` and `docs.ts` are attached automatically by `discover.ts`; do
not reference them from `module.ts`.

## state.ts

```ts
import { z } from 'zod';
import type { Rng } from '$lib/engine/rng';

export const ThingSchema = z.object({ /* ... */ });
export type ThingState = z.infer<typeof ThingSchema>;

// Declaration merging is what makes `state.modules.thing` typed everywhere.
declare module '$lib/engine/state' {
  interface ModuleStates { thing: ThingState; }
}

export function createThing(rng: Rng): ThingState { /* ... */ }

export const THING_VERSION = 1;
```

Add `migrateThing(old, from)` the moment you change the shape, and bump the
version in the same commit. A save that cannot load is worse than a feature
that does not exist.

## module.ts

```ts
export default defineModule({
  id: 'thing',                    // MUST equal the folder name
  title: 'Ding',
  summary: 'Ein Satz, der im Studio und im Handbuch steht.',
  nav: { group: 'Verein', icon: '📦', order: 40 },
  requires: ['finance'],
  state: { schema: ThingSchema, create: createThing, version: THING_VERSION },
  hooks: { week: { phase: 'economy', order: 10, run({ state, emit }) { /* ... */ } } }
});
```

Nav groups in use: `Sport`, `Verein`, `Wirtschaft`, `Welt`. Tick kinds:
`matchday`, `week`, `seasonStart`, `seasonEnd`. Phases run in order
`pre → sim → post → economy → world`.

### The bus is not optional

If another module needs your number, `provide` it and let them `query`. If many
modules move the same number, `modify`/`addTo` it and let the owner `total` it.
Declare `provides` / `contributes` / `consumes` honestly: the registry refuses
to boot when a consumer is ordered before its provider, and that check is the
only reason a co-trainer's `+2` cannot land in a bucket nobody opens.

Never `import` another feature's rules to read a live value. Import across
features only for a documented, deliberate seam (`postToLedger` is one).

## docs.ts

Every control the player can operate needs an entry, and `npm run docs:check`
fails the build without one.

```ts
export const thingDocs = defineDocs({
  'thing.build': {
    label: 'Ausbauen',
    tooltip: 'Ein bis zwei Sätze. Was es tut, und was es kostet.',
    why: 'Warum diese Mechanik existiert — das Feld, das sonst nur im Kopf lebt.',
    since: '0.1.0',
    related: ['finance.balance']
  }
});
```

`label` is the single source of the visible text: `<Button doc="thing.build" />`
renders it. Never type the label twice.

## Screen.svelte

Use the kit — `Panel`, `Button`, `StatChip`, `Bar`, `Sheet`, `DataTable`,
`Marks`. A raw `<button>` or `<input>` in a feature screen fails the docs gate
unless it carries a `docs-check-ignore` comment naming the group that documents
it.

Colour comes from tokens only. Fill tokens (`--primary`) go on backgrounds; ink
tokens (`--primary-ink`) go on text. Using a fill as ink fails the gate, because
it is how the crest initials once came out the same colour as the field behind
them. Status colour (`--good`, `--bad`) means status; it never means a domain
thing that happens to be green.

Read state as `$derived(game.modules.thing)`, never `const t = game.modules.thing`.

### Never identify a club by its name

The player renames every club in the editor. Look clubs up by `id` through
`teamById`, and resolve the display name through `resolveClub` from
`features/editor/rules`. A name literal fails the gate, and the gate exists
because three surfaces once gave three different answers to "which club am I".

## Before you commit

```bash
npm run verify
```

`check` + `docs:check` + `test`, and all three must pass. Gate the commit on the
exit code, never on grepping the output — that mistake once pushed a red build.

Stage explicitly. Never `git add -A`.

## The failure this codebase keeps having

Ten times now, a feature has been complete, correct, tested, and connected to
nothing: a value published in the wrong phase, a cost computed and never
applied, a screen finished and unreachable. Every one was found by playing the
game, none by reading the code.

So: after you build it, run it, and check the number moves.
