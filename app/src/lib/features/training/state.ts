import { z } from 'zod';
import type { Rng } from '$lib/engine/rng';
import { FOCUS } from '../squad/attributes';

/**
 * Training — the week's main decision.
 *
 * With one `strength` number, training could only make a player better. With
 * five attributes it decides WHAT KIND of player someone becomes, which is a
 * different mechanic wearing the same name: a slow midfielder trained on Tempo
 * for two seasons is a different footballer, not a slightly larger number.
 *
 * A player's own focus is NOT stored here — it lives on the player, in
 * `squad`. See the note beside FOCUS in squad/attributes.ts for why.
 */
export { FOCUS, type Focus } from '../squad/attributes';

export const INTENSITIES = ['locker', 'normal', 'hart'] as const;
export type Intensity = (typeof INTENSITIES)[number];

export const TrainingSchema = z.object({
  /** What the squad works on when a player has no focus of their own. */
  teamFocus: z.enum(FOCUS),
  intensity: z.enum(INTENSITIES),
  /**
   * What the last training week actually produced, so the screen can show it
   * rather than announcing a number that changed off-screen. Cleared and
   * rewritten each week; the season total lives in `season`.
   */
  lastWeek: z.array(z.object({
    playerId: z.string(),
    name: z.string(),
    attribute: z.string(),
    delta: z.number().int()
  })),
  /** Player id → attribute → points gained this season, for the report. */
  season: z.record(z.string(), z.record(z.string(), z.number())),
  /** Weeks trained this season, so the screen can say "3 von 5". */
  weeks: z.number().int().min(0)
});
export type TrainingState = z.infer<typeof TrainingSchema>;

declare module '$lib/engine/state' {
  interface ModuleStates {
    training: TrainingState;
  }
}

export function createTraining(_rng: Rng): TrainingState {
  return { teamFocus: 'allgemein', intensity: 'normal', lastWeek: [], season: {}, weeks: 0 };
}

export const TRAINING_VERSION = 1;
