import { z } from 'zod';
import type { Rng } from '$lib/engine/rng';

/**
 * Contracts owns almost nothing.
 *
 * The one fact that matters — how much contract a player has left — lives on
 * the player, in `squad` (`contractMatchdays`). A `Record<playerId, Contract>`
 * here was tried and reverted: it left a stale entry behind for every player
 * who departed, and gave two systems a chance to disagree about the same fact.
 * See the note beside `FOCUS` in `squad/attributes.ts`.
 *
 * What IS legitimately this module's own is a short, disposable log of who
 * left for nothing this season — a report, not a fact about a living player.
 */
export const DepartureSchema = z.object({
  name: z.string(),
  pos: z.string()
});
export type Departure = z.infer<typeof DepartureSchema>;

export const ContractsSchema = z.object({
  /** Ablösefreie Abgänge diese Saison. Cleared on seasonEnd. */
  departures: z.array(DepartureSchema)
});
export type ContractsState = z.infer<typeof ContractsSchema>;

declare module '$lib/engine/state' {
  interface ModuleStates {
    contracts: ContractsState;
  }
}

export function createContracts(_rng: Rng): ContractsState {
  return { departures: [] };
}

export const CONTRACTS_VERSION = 1;
