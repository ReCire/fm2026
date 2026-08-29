import { z } from 'zod';
import type { Rng } from '$lib/engine/rng';

/**
 * The career remembered, season by season.
 *
 * The prototype kept exactly one piece of history: `game.trophies`, a flat
 * array of strings pushed on a cup or Europe win. Every ordinary season —
 * which division, what final position, how many points, the goals, the
 * biggest scoreline — was thrown away the moment `concludeSeasonAndAdvance()`
 * regenerated the world. Trophies were also the only thing the prototype had
 * a cup or Europe competition to award; neither exists here yet, so what is
 * ported is the STRUCTURE of a season record, filled from what league already
 * tracks rather than the two competitions that produced it there.
 */
export const SEASON_OUTCOMES = ['promoted', 'relegated', 'stayed'] as const;
export type SeasonOutcome = (typeof SEASON_OUTCOMES)[number];

export const BiggestWinSchema = z.object({
  opponentId: z.string(),
  isHome: z.boolean(),
  goalsFor: z.number().int().min(0),
  goalsAgainst: z.number().int().min(0)
});
export type BiggestWin = z.infer<typeof BiggestWinSchema>;

export const SeasonRecordSchema = z.object({
  season: z.number().int(),
  /** Division name at the time the season ended, e.g. "3. Liga". */
  league: z.string(),
  /** 1-based final table position. 0 if the club could not be found. */
  rank: z.number().int(),
  points: z.number().int(),
  goalsFor: z.number().int(),
  goalsAgainst: z.number().int(),
  outcome: z.enum(SEASON_OUTCOMES),
  /** `null` for a season with no win at all. */
  biggestWin: BiggestWinSchema.nullable()
});
export type SeasonRecord = z.infer<typeof SeasonRecordSchema>;

export const HistorySchema = z.object({
  /** One entry per completed season, oldest first. Never capped. */
  seasons: z.array(SeasonRecordSchema),
  /**
   * The biggest win of the season IN PROGRESS, tracked as it happens.
   *
   * Deliberately NOT derived from matchday's `recent` log at season end: that
   * list is capped at twelve reports and a season runs thirty-four matchdays,
   * so by the time a season closes the game that produced its biggest win may
   * already have scrolled off it. Kept here instead, matchday by matchday, and
   * reset the moment a season is filed away.
   */
  runningBiggestWin: BiggestWinSchema.nullable()
});
export type HistoryState = z.infer<typeof HistorySchema>;

declare module '$lib/engine/state' {
  interface ModuleStates {
    history: HistoryState;
  }
}

export function createHistory(_rng: Rng): HistoryState {
  return { seasons: [], runningBiggestWin: null };
}

export const HISTORY_VERSION = 1;
