import { z } from 'zod';
import type { Rng } from '$lib/engine/rng';
import { PlayerSchema } from '../squad/state';
import { scoutProspect } from './rules';

export const YouthSchema = z.object({
  /** How much the club has invested in the academy. Clamped to maxLevel in rules.ts. */
  level: z.number().int().min(1),
  /** Prospects in the academy, not yet on the first-team squad. Full `Player`
   *  shape — built with `createPlayer`, so a graduate cannot drift from how
   *  every other player in the game is made. */
  prospects: z.array(PlayerSchema),
  /**
   * Position in the scouting RNG stream.
   *
   * Scouting happens when the player clicks, outside any tick, so it cannot
   * use the tick's per-module RNG. Persisting a cursor keeps it seeded and
   * replayable anyway — same save, same clicks, same talent — the same
   * technique `transfer` uses for a negotiation roll.
   */
  scoutCursor: z.number().int().min(0),
  /**
   * How many prospects have graduated into the first team, over the career.
   *
   * Counted rather than derived: a graduate becomes an ordinary squad player on
   * arrival and keeps no mark of where they came from, so by the following
   * season there is nothing in state that could answer this.
   */
  promoted: z.number().int().min(0)
});
export type YouthState = z.infer<typeof YouthSchema>;

declare module '$lib/engine/state' {
  interface ModuleStates {
    youth: YouthState;
  }
}

export function createYouth(rng: Rng): YouthState {
  // One prospect from day one, so the academy screen is never simply empty —
  // scouting a second is then the player's first real decision here.
  return { level: 1, prospects: [scoutProspect(rng, 1)], scoutCursor: 0, promoted: 0 };
}

/** v2: counts graduates, which nothing in state could answer afterwards. */
export const YOUTH_VERSION = 2;

export function migrateYouth(old: unknown, _from: number): YouthState {
  const base = old as YouthState;
  // An old save cannot recover its graduates; zero under-counts rather than
  // inventing a number.
  return { ...base, promoted: base.promoted ?? 0 };
}
