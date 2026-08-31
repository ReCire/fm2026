import { z } from 'zod';
import { boardContent } from './content';

/**
 * What the boardroom thinks, and how long you have.
 *
 * Trust is the first number in this game that can end a career. Everything
 * else compounds a bad season into a worse one; this ends it.
 */

export const VerdictSchema = z.object({
  season: z.number().int().min(0),
  /** The bar, as a table position. Printed on the screen — never hidden. */
  expected: z.number().int().min(0),
  actual: z.number().int().min(0),
  /** What the board demanded, in words. Derived from `expected`, stored so
   *  the record still reads correctly after the division changes. */
  demand: z.string(),
  promoted: z.boolean(),
  relegated: z.boolean(),
  /** Trust moved by this much. The sign is the verdict. */
  delta: z.number(),
  trustAfter: z.number().min(0).max(100)
});
export type Verdict = z.infer<typeof VerdictSchema>;

/**
 * The last stretch, made playable rather than merely observed.
 *
 * A meter that quietly reaches zero is a lose condition the player watched
 * happen. The ultimatum turns the same arithmetic into a stated target with a
 * deadline on it — the board has said the thing out loud, and there are eight
 * matchdays in which beating it is a real move.
 */
export const UltimatumSchema = z.object({
  setSeason: z.number().int().min(0),
  setMatchday: z.number().int().min(0),
  /** The last matchday on which it can still be met. */
  deadline: z.number().int().min(0),
  /** Finish at or above this table position by the deadline. */
  targetRank: z.number().int().min(1),
  /** The same target in the board's own words, for the screen and the record. */
  demand: z.string()
});
export type Ultimatum = z.infer<typeof UltimatumSchema>;

export const BoardSchema = z.object({
  /** 0..100. Zero is the sack, and nothing else is. */
  trust: z.number().min(0).max(100),
  /** One entry per completed season, oldest first. The board's memory. */
  verdicts: z.array(VerdictSchema),
  ultimatum: UltimatumSchema.nullable(),
  /**
   * Set once, and never unset by anything.
   *
   * Stored rather than derived from `trust === 0`, because trust has a floor
   * seven doctrine nodes can raise: a manager sacked at zero who then bought a
   * floor of 30 would otherwise be un-sacked by a purchase, which is the sort
   * of thing that is only funny once.
   */
  sacked: z.boolean()
});
export type BoardState = z.infer<typeof BoardSchema>;

declare module '$lib/engine/state' {
  interface ModuleStates {
    board: BoardState;
  }
}

export function createBoard(): BoardState {
  return {
    trust: boardContent.startingTrust,
    verdicts: [],
    ultimatum: null,
    sacked: false
  };
}

export const BOARD_VERSION = 1;
