import { z } from 'zod';
import type { Rng } from '$lib/engine/rng';

/**
 * The campus — everything the club owns that is not the pitch.
 *
 * State is deliberately thin: a level per building and nothing else. Every
 * other fact — what it costs, what it does, how tall it stands at each level —
 * lives in `content/campus.ts`, so changing the world is a content edit and
 * changing the rules is a code edit, and neither is both.
 *
 * A building the club has not built is ABSENT from the record rather than
 * present at level -1. The map draws empty ground where there is no entry,
 * which is the honest picture of a fourth-division club: mostly grass.
 */
export const CampusSchema = z.object({
  /** Building id → level owned. Absent means not built. */
  built: z.record(z.string(), z.number().int().min(0)),
  /** Total ever spent here, for the report. Never spent down. */
  invested: z.number().min(0)
});
export type CampusState = z.infer<typeof CampusSchema>;

declare module '$lib/engine/state' {
  interface ModuleStates {
    campus: CampusState;
  }
}

export function createCampus(_rng: Rng): CampusState {
  return { built: {}, invested: 0 };
}

export const CAMPUS_VERSION = 1;
