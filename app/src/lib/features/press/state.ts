import { z } from 'zod';
import { CAUSES } from './content';

/**
 * What has been written about the club, and how hot it is.
 *
 * Pressure is a TEMPERATURE, not a resource — nothing spends it, it decays
 * toward a baseline, and it rises when something happens worth writing about.
 * A resource would make the shadow doctrine a budget; a temperature makes it a
 * consequence you live with.
 */

export const StorySchema = z.object({
  season: z.number().int().min(0),
  matchday: z.number().int().min(0),
  /** The outlet that ran it. A tier-3 paper in the fourth division is a joke. */
  outlet: z.string(),
  /** Already filled in — templates are resolved at write time, not at read. */
  text: z.string(),
  cause: z.enum(CAUSES),
  /** Pressure this story added. Negative is good news. */
  weight: z.number().int()
});
export type Story = z.infer<typeof StorySchema>;

/**
 * An open file at the association.
 *
 * The prototype raided you out of nowhere: above 25% pressure it rolled each
 * matchday and, on a hit, took a fine straight off the balance. That is a
 * punishment with no decision in front of it — nothing the player could have
 * seen, and nothing they could have done differently once they had.
 *
 * So the file OPENS first, visibly, and the raid rolls only while it is open.
 * Same eventual fine, but now there is a matchday or three in which lowering
 * the temperature is a real move, which is the only thing that makes
 * Medien-Training and Dr. Gauner worth buying rather than worth having bought.
 */
export const InvestigationSchema = z.object({
  openedSeason: z.number().int().min(0),
  openedMatchday: z.number().int().min(0),
  /** Raids survived. Each one costs money and cools the club down.  */
  raids: z.number().int().min(0)
});
export type Investigation = z.infer<typeof InvestigationSchema>;

export const PressSchema = z.object({
  /** 0..100. See `pressContent.baseline` for where it rests. */
  pressure: z.number().min(0).max(100),
  /** Newest first, capped at `pressContent.feedLength`. */
  feed: z.array(StorySchema),
  /** Matchdays since the last win, and since the last defeat. */
  winless: z.number().int().min(0),
  unbeaten: z.number().int().min(0),
  investigation: InvestigationSchema.nullable(),
  /** Everything the association has ever taken, for the screen. */
  finesPaid: z.number().min(0)
});
export type PressState = z.infer<typeof PressSchema>;

declare module '$lib/engine/state' {
  interface ModuleStates {
    press: PressState;
  }
}

export function createPress(): PressState {
  return {
    /*
     * Zero, and it matters. A club that has done nothing is not under
     * investigation at a low level — it is not under investigation, and the
     * screen should be able to say so. See the note in content.ts.
     */
    pressure: 0,
    feed: [],
    winless: 0,
    unbeaten: 0,
    investigation: null,
    finesPaid: 0
  };
}

export const PRESS_VERSION = 1;
