import { z } from 'zod';
import type { Rng } from '$lib/engine/rng';
import { ATTRIBUTES } from '../squad/attributes';

/**
 * Training.
 *
 * With one `strength` number, training could only make a player better. With
 * five attributes it decides WHAT KIND of player someone becomes, which is a
 * different mechanic wearing the same name: a slow midfielder trained on Tempo
 * for two seasons is a different footballer, not a slightly larger number.
 */
export const FOCUS = ['allgemein', ...ATTRIBUTES] as const;
export type Focus = (typeof FOCUS)[number];

export const INTENSITIES = ['locker', 'normal', 'hart'] as const;
export type Intensity = (typeof INTENSITIES)[number];

export const TrainingSchema = z.object({
  /** What the whole squad works on when a player has no focus of their own. */
  teamFocus: z.enum(FOCUS),
  intensity: z.enum(INTENSITIES),
  /** Player id → their individual focus. Absent means they follow the team. */
  individual: z.record(z.string(), z.enum(FOCUS)),
  /** Player id → attribute → points gained this season, for the report. */
  progress: z.record(z.string(), z.record(z.string(), z.number()))
});
export type TrainingState = z.infer<typeof TrainingSchema>;

declare module '$lib/engine/state' {
  interface ModuleStates {
    training: TrainingState;
  }
}

export function createTraining(_rng: Rng): TrainingState {
  return { teamFocus: 'allgemein', intensity: 'normal', individual: {}, progress: {} };
}

export const TRAINING_VERSION = 1;
