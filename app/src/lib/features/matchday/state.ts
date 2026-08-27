import { z } from 'zod';
import type { Rng } from '$lib/engine/rng';

/**
 * The pre-match and the report.
 *
 * The SIMULATION lives in league — it owns the fixture list, so it resolves
 * every fixture including ours. This module owns what surrounds it: the shape
 * the team takes, and what the player is told afterwards.
 */
export const FORMATIONS = ['4-4-2', '4-3-3', '5-3-2', '3-5-2'] as const;
export type Formation = (typeof FORMATIONS)[number];

export const STYLES = ['defensiv', 'ausgeglichen', 'offensiv'] as const;
export type Style = (typeof STYLES)[number];

export const TALKS = ['ruhig', 'motivierend', 'fordernd'] as const;
export type Talk = (typeof TALKS)[number];

export const ReportSchema = z.object({
  season: z.number().int(),
  matchday: z.number().int(),
  opponent: z.string(),
  isHome: z.boolean(),
  goalsFor: z.number().int().min(0),
  goalsAgainst: z.number().int().min(0),
  /** The strength we actually took into the match, after tactics. */
  ourStrength: z.number().int(),
  opponentStrength: z.number().int()
});
export type Report = z.infer<typeof ReportSchema>;

export const MatchdaySchema = z.object({
  formation: z.enum(FORMATIONS),
  style: z.enum(STYLES),
  talk: z.enum(TALKS),
  /** Kept so the report survives a reload; an event log does not. */
  lastReport: ReportSchema.nullable(),
  /** Most recent results, newest first. Capped. */
  recent: z.array(ReportSchema).max(12)
});
export type MatchdayState = z.infer<typeof MatchdaySchema>;

declare module '$lib/engine/state' {
  interface ModuleStates {
    matchday: MatchdayState;
  }
}

export function createMatchday(_rng: Rng): MatchdayState {
  return { formation: '4-4-2', style: 'ausgeglichen', talk: 'ruhig', lastReport: null, recent: [] };
}

export const MATCHDAY_VERSION = 1;
