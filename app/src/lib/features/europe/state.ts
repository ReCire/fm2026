import { z } from 'zod';

/**
 * The Champions Cup: two groups of four, two semi-finals, one final.
 *
 * The player's own club appears in here under the sentinel id `PLAYER` rather
 * than under its league id, because the club can be renamed by the editor and
 * because its strength is not a stored number — it is whatever the eleven and
 * the doctrine make it on the day. Every other entrant carries a fixed
 * strength from content.
 */

/** Our club's seat at the table. Resolved to a name and a strength per tick. */
export const PLAYER = 'player';

export const EuroEntrySchema = z.object({
  clubId: z.string(),
  played: z.number().int().min(0),
  won: z.number().int().min(0),
  drawn: z.number().int().min(0),
  lost: z.number().int().min(0),
  goalsFor: z.number().int().min(0),
  goalsAgainst: z.number().int().min(0),
  points: z.number().int().min(0)
});
export type EuroEntry = z.infer<typeof EuroEntrySchema>;

export const EuroMatchSchema = z.object({
  matchday: z.number().int().min(0),
  stage: z.enum(['group', 'semi', 'final']),
  /** 'A' or 'B' for a group game, null in the knockout. */
  group: z.string().nullable(),
  home: z.string(),
  away: z.string(),
  homeGoals: z.number().int().min(0),
  awayGoals: z.number().int().min(0)
});
export type EuroMatch = z.infer<typeof EuroMatchSchema>;

/**
 * A knockout pairing, which starts as two empty slots.
 *
 * `home`/`away` are null until the groups decide them, and `winner` is null
 * until it is PLAYED. That nullability is the whole point — the prototype's
 * semi-finals were object literals with the winners already written in, so no
 * implementation was ever asked to play them, and its final was not played at
 * all: reaching it was winning it, with the scoreline stored as the string
 * "3 : 1". A trophy that cannot be lost is a receipt for having qualified.
 *
 * fussballmanager-15 shaped `KNOCKOUT` in content as ties rather than results
 * so that a port keeping either bug fails a test. This is the state that
 * satisfies it honestly.
 */
export const TieSchema = z.object({
  home: z.string().nullable(),
  away: z.string().nullable(),
  homeGoals: z.number().int().min(0).nullable(),
  awayGoals: z.number().int().min(0).nullable(),
  /** Set only once the tie has actually been resolved. */
  winner: z.string().nullable(),
  /** True when the winner came from a shoot-out rather than from the ninety. */
  onPenalties: z.boolean()
});
export type Tie = z.infer<typeof TieSchema>;

export const EuropeSchema = z.object({
  /** The season this tournament belongs to. A new one wipes it. */
  season: z.number().int().min(0),
  /** Club ids, four each. `PLAYER` appears in exactly one of them, or neither. */
  groups: z.object({ A: z.array(z.string()), B: z.array(z.string()) }),
  table: z.array(EuroEntrySchema),
  matches: z.array(EuroMatchSchema),
  semis: z.array(TieSchema),
  final: TieSchema.nullable(),
  champion: z.string().nullable(),
  /**
   * Whether our club is in this season's tournament.
   *
   * Stored rather than derived from the groups, because the groups are also
   * how the screen knows who Mersey City displaced — and a career spends most
   * of its length watching rather than playing.
   */
  playerIn: z.boolean(),
  /** Prize money banked this season, for the screen. */
  prizeMoney: z.number().min(0)
});
export type EuropeState = z.infer<typeof EuropeSchema>;

declare module '$lib/engine/state' {
  interface ModuleStates {
    europe: EuropeState;
  }
}

export function createEurope(): EuropeState {
  return {
    season: 0,
    groups: { A: [], B: [] },
    table: [],
    matches: [],
    semis: [],
    final: null,
    champion: null,
    playerIn: false,
    prizeMoney: 0
  };
}

export const EUROPE_VERSION = 1;
