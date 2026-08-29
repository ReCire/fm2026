import { z } from 'zod';
import type { Rng } from '$lib/engine/rng';
import { BEAT_KINDS } from './narrate';

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

/**
 * A match in progress.
 *
 * Held in state rather than in the component so that closing the screen, or
 * reloading, does not lose the match — a live view you cannot walk away from is
 * a cutscene.
 */
export const LiveSchema = z.object({
  /** Ordered beats for the whole match, decided up front. */
  beats: z.array(z.object({
    minute: z.number().int().min(0).max(90),
    /* The literal list, not z.string(). A stored beat with a kind nobody
       recognises validated happily and then rendered no glyph — the save
       said it was fine and the screen disagreed. */
    kind: z.enum(BEAT_KINDS),
    ours: z.boolean(),
    text: z.string(),
    score: z.tuple([z.number().int(), z.number().int()])
  })),
  /** How far the clock has run. 90 means finished. */
  minute: z.number().int().min(0).max(90),
  running: z.boolean(),
  opponent: z.string(),
  isHome: z.boolean()
});
export type Live = z.infer<typeof LiveSchema>;

export const MatchdaySchema = z.object({
  /** Null when no match is being watched. */
  live: LiveSchema.nullable(),
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
  return { live: null, formation: '4-4-2', style: 'ausgeglichen', talk: 'ruhig', lastReport: null, recent: [] };
}

/** v2: adds the live match, so watching survives leaving the screen. */
export const MATCHDAY_VERSION = 2;

export function migrateMatchday(old: unknown, _from: number): MatchdayState {
  const base = old as Partial<MatchdayState>;
  return {
    live: null,
    formation: base.formation ?? '4-4-2',
    style: base.style ?? 'ausgeglichen',
    talk: base.talk ?? 'ruhig',
    lastReport: base.lastReport ?? null,
    recent: base.recent ?? []
  };
}
