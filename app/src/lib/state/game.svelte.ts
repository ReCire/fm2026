import { Registry } from '$lib/engine/registry';
import { runTick, type TickResult } from '$lib/engine/clock';
import { createRng, seedFrom } from '$lib/engine/rng';
import { installDocs } from '$lib/docs/registry';
import type { GameState, MetaState, ModuleStates } from '$lib/engine/state';
import type { TickKind } from '$lib/engine/module';
import { modules } from '$lib/modules';
import { pushSnapshot, clearHistory } from './history.svelte';

export const registry = new Registry(modules);

// Docs are installed once at boot so components can resolve labels and
// tooltips synchronously, without every screen importing every feature.
installDocs(registry.docs());

function freshMeta(seed: number): MetaState {
  return {
    seed,
    rngCursor: 0,
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
  const result = runTick(registry, game, kind);
  lastTick.result = result;
  return result;
}

export function replaceGame(next: GameState): void {
  game.meta = next.meta;
  game.modules = next.modules;
  clearHistory();
  lastTick.result = null;
}

export function newGame(seedText?: string): void {
  replaceGame(createGame(seedText));
}
