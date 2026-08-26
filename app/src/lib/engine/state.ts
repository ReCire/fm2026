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
  /**
   * Reproducibility: the seed plus the tick number fully determine every
   * module's RNG stream, because each stream is derived from
   * mixSeed(seed, `module#kind#tick`) rather than carried across ticks.
   *
   * There is deliberately no cursor field. There used to be one; it was never
   * read, never written, and its accessor double-counted its own fast-forward —
   * a dead guarantee that the next person to implement mid-tick saving would
   * have trusted.
   */
  seed: number;
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
