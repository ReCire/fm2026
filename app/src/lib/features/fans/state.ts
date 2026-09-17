import { z } from 'zod';
import type { Rng } from '$lib/engine/rng';
import { fanGroups, STARTING_MOOD, DEFAULT_STEWARDS } from './content';

/**
 * The fans — a handful of factions with a mood each, not one meter.
 *
 * A single "Fanzufriedenheit: 75%" hides WHOSE 75% it is. Ultras, Alte Garde,
 * families and the loge do not want the same thing from a football club, and
 * the state says so by keeping four numbers instead of averaging them away
 * before anyone gets to read them.
 */
export const FanGroupStateSchema = z.object({
  id: z.string(),
  mood: z.number().min(0).max(100)
});
export type FanGroupState = z.infer<typeof FanGroupStateSchema>;

export const FansSchema = z.object({
  groups: z.array(FanGroupStateSchema),
  /** Ordner im Einsatz. Content sells four levels; nothing stops the rest. */
  stewards: z.number().int().min(0)
});
export type FansState = z.infer<typeof FansSchema>;

declare module '$lib/engine/state' {
  interface ModuleStates {
    fans: FansState;
  }
}

export function createFans(_rng: Rng): FansState {
  return {
    groups: fanGroups.map((g) => ({ id: g.id, mood: STARTING_MOOD })),
    stewards: DEFAULT_STEWARDS
  };
}

export const FANS_VERSION = 1;
