import { Registry } from '$lib/engine/registry';
import { runTick, type TickResult } from '$lib/engine/clock';
import { createRng, seedFrom } from '$lib/engine/rng';
import { installDocs } from '$lib/docs/registry';
import type { GameState, MetaState, ModuleStates } from '$lib/engine/state';
import type { TickKind } from '$lib/engine/module';
import { modules } from '$lib/modules';
import { delegationFor, setBuildableModules } from '$lib/features/progression/rules';
import { pushSnapshot, popSnapshot, clearHistory } from './history.svelte';

export const registry = new Registry(modules);

// Docs are installed once at boot so components can resolve labels and
// tooltips synchronously, without every screen importing every feature.
installDocs(registry.docs());

/*
 * Progression's ladders name departments that are designed but not built yet.
 * Telling it what actually exists lets a narrative carry a roadmap without a
 * career silently spending an unlock slot on a door with nothing behind it.
 */
setBuildableModules(registry.all.map((m) => m.id));

function freshMeta(seed: number): MetaState {
  return {
    seed,
    season: 1,
    matchday: 1,
    tick: 0,
    createdAt: Date.now(),
    lastPlayedAt: Date.now()
  };
}

export function createGame(seedText = String(Date.now())): GameState {
  const seed = seedFrom(seedText);
  const rng = createRng(seed);
  const moduleStates: Record<string, unknown> = {};
  for (const m of registry.all) {
    moduleStates[m.id] = m.state.create(rng.fork(m.id));
  }
  // The map is built by iterating the registry, so the compiler cannot see
  // that every ModuleStates key is present. Zod validates it at runtime on
  // load instead; this is the single boundary where that trade is made.
  return { meta: freshMeta(seed), modules: moduleStates as unknown as ModuleStates };
}

/**
 * The live game.
 *
 * `$state` is a deep proxy, so `game.modules.finance.money -= 100` is both
 * ordinary JavaScript and a reactive update. There is no store to subscribe to,
 * no selector to write, and no updateUI() to remember to call.
 */
export const game = $state<GameState>(createGame('anstoss-dev'));

/** The events produced by the most recent tick, for the matchday report. */
export const lastTick = $state<{ result: TickResult | null }>({ result: null });

export function advance(kind: TickKind = 'matchday'): TickResult {
  // Snapshot BEFORE the tick, so "undo matchday" returns to the decision point.
  pushSnapshot(game);

  const result = runTick(registry, game, kind, {
    delegationFor: (moduleId) => delegationFor(game, moduleId)
  });

  // A hook that threw leaves the tick half-applied: the engine mutates state in
  // place, so a transfer fee can be debited without the player arriving. Rather
  // than commit that, roll the whole tick back to the snapshot we just took —
  // the cost of the guarantee is a snapshot we were taking anyway.
  if (result.failed.length > 0) {
    const before = popSnapshot();
    if (before) restore(before);
    result.events.push({
      source: 'engine',
      severity: 'bad',
      title: 'Spieltag zurückgenommen',
      detail: `Fehler in: ${result.failed.join(', ')}. Der Spielstand ist unverändert.`
    });
  }

  lastTick.result = result;

  /*
   * Autosave on every committed tick. Fire-and-forget: a save that is still
   * writing must never hold up the next decision, and a failure surfaces
   * through saveStatus rather than by throwing into a click handler.
   */
  void autosave();

  return result;
}

/**
 * Set by the persistence layer at boot. Indirect so the engine and the store
 * stay free of storage concerns, and so tests can run ticks without IndexedDB.
 */
let autosave: () => Promise<unknown> = async () => {};
export function onCommit(fn: () => Promise<unknown>): void {
  autosave = fn;
}

/**
 * Copy a state INTO the live game without replacing `game.modules`.
 *
 * Reassigning `game.modules` installs a new object, so the next read returns a
 * NEW rune proxy — and any reference a component captured before the swap keeps
 * pointing at a detached object that is still individually reactive. That stale
 * screen re-renders happily, shows its own numbers, accepts edits, and none of
 * it reaches the game or the save.
 *
 * Every screen today uses `$derived(game.modules.x)` and survives a swap, but
 * `const x = game.modules.squad` and `const x = $derived(game.modules.squad)`
 * are one keyword apart, read identically, and behave identically until the
 * first undo. Mutating in place preserves identity so the distinction stops
 * being load-bearing.
 */
function restore(next: GameState): void {
  Object.assign(game.meta, next.meta);
  const live = game.modules as unknown as Record<string, unknown>;
  const incoming = next.modules as unknown as Record<string, unknown>;
  for (const key of Object.keys(live)) if (!(key in incoming)) delete live[key];
  for (const [key, value] of Object.entries(incoming)) live[key] = value;
}

/**
 * Swap in a different game — a loaded save, or a new career.
 *
 * Clears history, because undoing across two different careers is meaningless.
 * Undo must NOT go through here: it did once, and `clearHistory()` reduced a
 * documented twelve-step buffer to exactly one step. Undo calls `undo()`.
 */
export function replaceGame(next: GameState): void {
  restore(next);
  clearHistory();
  lastTick.result = null;
}

/** Step back one committed tick. Returns false when there is nothing to undo. */
export function undo(): boolean {
  const before = popSnapshot();
  if (!before) return false;
  restore(before);
  lastTick.result = null;
  return true;
}

export function newGame(seedText?: string): void {
  replaceGame(createGame(seedText));
}
