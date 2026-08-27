import { z } from 'zod';
import type { Rng } from '$lib/engine/rng';
import { STAFF_ROLES } from './content';

export const StaffSchema = z.object({
  /** Role id → the matchday they were hired on. Absent means not employed. */
  hired: z.record(z.string(), z.number().int().min(0))
});
export type StaffState = z.infer<typeof StaffSchema>;

declare module '$lib/engine/state' {
  interface ModuleStates {
    staff: StaffState;
  }
}

export function createStaff(_rng: Rng): StaffState {
  return { hired: {} };
}

/** Sanity: the state schema and the content must agree on what a role is. */
export const KNOWN_ROLES = new Set(STAFF_ROLES.map((r) => r.id));

export const STAFF_VERSION = 1;
