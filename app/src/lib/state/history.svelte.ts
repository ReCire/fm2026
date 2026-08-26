import type { GameState } from '$lib/engine/state';

/**
 * Undo / rewind.
 *
 * An immutable store would give this away for free through structural sharing.
 * Svelte's `$state.snapshot()` deep-clones instead, so we snapshot on TICKS
 * only — around 34 a season, not one per player action — and cap the buffer.
 * That keeps rewind cheap enough to always be on.
 */
const MAX_SNAPSHOTS = 12;

interface Entry {
  tick: number;
  season: number;
  matchday: number;
  state: GameState;
}

export const history = $state<{ entries: Entry[] }>({ entries: [] });

export const canUndo = () => history.entries.length > 0;

export function pushSnapshot(game: GameState): void {
  history.entries.push({
    tick: game.meta.tick,
    season: game.meta.season,
    matchday: game.meta.matchday,
    state: $state.snapshot(game) as GameState
  });
  if (history.entries.length > MAX_SNAPSHOTS) history.entries.shift();
}

/** Most recent snapshot, or undefined if there is nothing to go back to. */
export function popSnapshot(): GameState | undefined {
  return history.entries.pop()?.state;
}

export function clearHistory(): void {
  history.entries.length = 0;
}
