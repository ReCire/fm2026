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
    /* Who scored. Optional: a goal narrated before anyone picked a side has no
       owner, and an old save has none either. */
    scorerId: z.string().optional(),
    ours: z.boolean(),
    text: z.string(),
    score: z.tuple([z.number().int(), z.number().int()])
  })),
  /** How far the clock has run. 90 means finished. */
  minute: z.number().int().min(0).max(90),
  running: z.boolean(),
  opponent: z.string(),
  isHome: z.boolean(),
  /**
   * The half-time call, once it has been made. Null until then.
   *
   * Stored rather than held in the component so that a reload during the
   * interval does not lose a decision the player already took — and so the
   * clock can refuse to run past 45 until there IS one.
   */
  decided: z.string().nullable(),
  /** Our strength this match, kept so the second half can be replayed. */
  ourStrength: z.number().int(),
  opponentStrength: z.number().int(),
  /**
   * Strength held back for a second half we go into behind — Resilienz, and
   * nothing at all when we are level or ahead.
   *
   * Stored on the live match rather than read when it is needed, because the
   * half-time and substitution paths run from a UI action and have no tick
   * context to ask the modifier bus with. Captured at kickoff, with every
   * other doctrine effect, so a node bought at the interval cannot change a
   * match that is already half played.
   */
  comeback: z.number(),
  /** Index into league.fixtures for the match this is narrating. */
  matchday: z.number().int(),
  /** Three, and they do not come back — see substitute.ts. */
  subsUsed: z.number().int().min(0).max(3),
  subs: z.array(z.object({
    minute: z.number().int(),
    outId: z.string(),
    inId: z.string()
  })).max(3)
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
  recent: z.array(ReportSchema).max(12),
  /**
   * Competitive wins across the whole career.
   *
   * Counted rather than derived: the league table resets every season and
   * `recent` is capped at twelve, so by matchday twenty of season two there is
   * nowhere left to read this from.
   */
  careerWins: z.number().int().min(0)
});
export type MatchdayState = z.infer<typeof MatchdaySchema>;

declare module '$lib/engine/state' {
  interface ModuleStates {
    matchday: MatchdayState;
  }
}

export function createMatchday(_rng: Rng): MatchdayState {
  return {
    live: null, formation: '4-4-2', style: 'ausgeglichen', talk: 'ruhig',
    lastReport: null, recent: [], careerWins: 0
  };
}

/** v3: the live match gains the half-time decision. */
/** v4: counts career wins, which no surviving state could answer. */
/** v5: the live match gains substitutions. */
/** v6: a live match carries the Resilienz it kicked off with. */
export const MATCHDAY_VERSION = 6;

export function migrateMatchday(old: unknown, _from: number): MatchdayState {
  const base = old as Partial<MatchdayState>;
  return {
    live: null,
    formation: base.formation ?? '4-4-2',
    style: base.style ?? 'ausgeglichen',
    talk: base.talk ?? 'ruhig',
    lastReport: base.lastReport ?? null,
    recent: base.recent ?? [],
    // An old save cannot recover its history; starting at zero under-counts
    // rather than inventing a number.
    careerWins: base.careerWins ?? 0
  };
}
