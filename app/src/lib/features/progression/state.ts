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
   * Department id → the executive running it.
   *
   * `competence` (0..1) is the interesting stat, not the wage: a mediocre
   * executive still resolves the department's open items, just badly, and the
   * player finds out at the balance sheet rather than in a prompt. That is what
   * makes delegation a real trade rather than a cost.
   */
  delegated: z.record(
    z.string(),
    z.object({
      executiveId: z.string(),
      competence: z.number().min(0).max(1),
      hiredOnMatchday: z.number().int().min(0)
    })
  ),
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

/**
 * v2: `delegated` went from `Record<string, string>` to a record of objects
 * carrying competence. Bumped rather than silently reshaped, so the migration
 * path gets exercised at least once before it matters.
 */
export const PROGRESSION_VERSION = 2;

export function migrateProgression(old: unknown, fromVersion: number): ProgressionState {
  const base = old as Partial<ProgressionState> & { delegated?: unknown };

  let delegated: ProgressionState['delegated'] = {};
  if (fromVersion < 2 && base.delegated && typeof base.delegated === 'object') {
    // v1 stored a bare executive id. Assume competent-but-unremarkable rather
    // than dropping the assignment: a player who delegated a department should
    // not silently get it back.
    for (const [moduleId, value] of Object.entries(base.delegated as Record<string, unknown>)) {
      if (typeof value === 'string') {
        delegated[moduleId] = { executiveId: value, competence: 0.6, hiredOnMatchday: 0 };
      }
    }
  } else if (base.delegated) {
    delegated = base.delegated as ProgressionState['delegated'];
  }

  return {
    narrativeId: base.narrativeId ?? 'aufsteiger',
    unlocked: base.unlocked ?? [],
    seen: base.seen ?? [],
    delegated,
    tutorialStep: base.tutorialStep ?? null,
    started: base.started ?? false
  };
}
