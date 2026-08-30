import { z } from 'zod';
import type { Rng } from '$lib/engine/rng';
import { buildings } from '$lib/content/campus';

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

/**
 * A club is not founded on an empty field.
 *
 * `costs[0] === 0` in the catalogue means "the club already has this" — four
 * containers still count as a Kabinentrakt. But `built: {}` said it owned
 * nothing, so the map drew the containers while the catalogue offered to sell
 * the manager the changing rooms they were standing in, for €0.
 *
 * Both halves were right and they disagreed: two sources for one fact, which is
 * the third time this week the same shape has surfaced wearing something else's
 * clothes — the doctrine `order` field against its array position, and
 * `careerWins` needing amendment in two places.
 *
 * Seeding here makes ownership one question with one answer: whatever costs
 * nothing to have, the club has.
 */
function foundingBuildings(): Record<string, number> {
  const built: Record<string, number> = {};
  for (const b of buildings) if (b.costs[0] === 0) built[b.id] = 0;
  return built;
}

export function createCampus(_rng: Rng): CampusState {
  return { built: foundingBuildings(), invested: 0 };
}

/** v2: founding buildings are owned from the start rather than offered at €0. */
export const CAMPUS_VERSION = 2;

export function migrateCampus(old: unknown, _from: number): CampusState {
  const base = (old ?? {}) as Partial<CampusState>;
  // Seeded UNDER whatever the save already holds: a club that has upgraded its
  // changing rooms must not be reset to the containers it started with.
  return {
    built: { ...foundingBuildings(), ...(base.built ?? {}) },
    invested: base.invested ?? 0
  };
}
