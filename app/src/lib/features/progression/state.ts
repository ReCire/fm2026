import { z } from 'zod';
import type { Rng } from '$lib/engine/rng';

/**
 * Progression owns what the player has access to, and why.
 *
 * Three things travel together here because they are the same decision seen
 * from different angles: which narrative you started, which modules that
 * narrative has opened, and which departments you have handed to an executive.
 */
export const ProgressionSchema = z.object({
  /** Which starting narrative this career began with. */
  narrativeId: z.string(),
  /** Module ids currently available to the player. */
  unlocked: z.array(z.string()),
  /** Module ids the player has seen for the first time — drives the "new" badge. */
  seen: z.array(z.string()),
  /**
   * Department id → executive id. A delegated department runs its autopilot
   * instead of prompting the player.
   */
  delegated: z.record(z.string(), z.string()),
  /** Tutorial (Probesaison) step, or null if skipped or finished. */
  tutorialStep: z.number().int().min(0).nullable(),
  /** True once the player has completed or skipped onboarding. */
  started: z.boolean()
});
export type ProgressionState = z.infer<typeof ProgressionSchema>;

declare module '$lib/engine/state' {
  interface ModuleStates {
    progression: ProgressionState;
  }
}

export function createProgression(_rng: Rng): ProgressionState {
  return {
    narrativeId: 'aufsteiger',
    unlocked: [],
    seen: [],
    delegated: {},
    tutorialStep: 0,
    started: false
  };
}

export const PROGRESSION_VERSION = 1;
