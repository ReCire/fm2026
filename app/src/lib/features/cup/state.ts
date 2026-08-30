import { z } from 'zod';
import type { Rng } from '$lib/engine/rng';

/**
 * One single-leg tie between two club ids.
 *
 * Ids, never names — the editor renames every club, and a pairing that stored
 * "FC Anstoß Pro" would stop recognising its own home side the moment the
 * player used it.
 */
export const CupPairingSchema = z.object({
  homeId: z.string(),
  awayId: z.string(),
  homeGoals: z.number().int().min(0).nullable(),
  awayGoals: z.number().int().min(0).nullable(),
  /** Set only when the 90 minutes finished level. */
  penaltyWinnerId: z.string().nullable(),
  played: z.boolean()
});
export type CupPairing = z.infer<typeof CupPairingSchema>;

export const CupRoundSchema = z.object({
  roundIndex: z.number().int().min(0),
  pairings: z.array(CupPairingSchema),
  completed: z.boolean()
});
export type CupRound = z.infer<typeof CupRoundSchema>;

export const CupSchema = z.object({
  /** False the moment our own tie is lost. Reset the moment a new bracket is drawn. */
  active: z.boolean(),
  /** Index into `rounds` (and into content's parallel arrays) that is next to resolve. */
  roundIndex: z.number().int().min(0),
  /** Every round drawn so far this season, oldest first. Replaced whole at the next draw. */
  rounds: z.array(CupRoundSchema),
  /**
   * Our own side's effective matchday strength, cached from the bus.
   *
   * `squad.strength` exists on the bus only for the lifetime of the `matchday`
   * tick that publishes it — a `week` tick is a separate call with its own,
   * empty bus (see `engine/clock.ts: runTick`). This is refreshed every
   * matchday in `post` so a week-tick tie still uses a real, tactics-and-staff
   * inclusive number instead of falling back to the bare squad rating.
   */
  playerStrength: z.number().min(1),
  /** Season this bracket was drawn for. A mismatch with `meta.season` triggers a redraw. */
  season: z.number().int(),
  /** Finals won, career total. */
  titles: z.number().int().min(0)
});
export type CupState = z.infer<typeof CupSchema>;

declare module '$lib/engine/state' {
  interface ModuleStates {
    cup: CupState;
  }
}

/**
 * Empty on creation, deliberately. The bracket needs the league pyramid to draw
 * from, and `create()` only gets an `rng` — so the first `week` tick draws it
 * lazily (see `module.ts`), the same way a season rollover would.
 */
export function createCup(_rng: Rng): CupState {
  return { active: true, roundIndex: 0, rounds: [], playerStrength: 50, season: -1, titles: 0 };
}

export const CUP_VERSION = 1;
