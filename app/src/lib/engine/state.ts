/**
 * The shape of a saved game.
 *
 * `ModuleStates` is deliberately empty here. Each feature widens it by
 * declaration merging:
 *
 *     declare module '$lib/engine/state' {
 *       interface ModuleStates { finance: FinanceState }
 *     }
 *
 * The engine therefore knows nothing about any specific feature, while
 * `game.modules.finance.money` stays fully typed at every call site. Delete the
 * feature folder and the property disappears from the type — the compiler finds
 * every reference for you.
 */
export interface ModuleStates {}

export interface MetaState {
  /** Reproducibility: seed + cursor fully determine the RNG stream. */
  seed: number;
  rngCursor: number;
  season: number;
  matchday: number;
  /** Monotonic counter of committed ticks. Used by the history buffer. */
  tick: number;
  createdAt: number;
  lastPlayedAt: number;
}

export interface GameState {
  meta: MetaState;
  modules: ModuleStates;
}

export type ModuleId = keyof ModuleStates & string;
