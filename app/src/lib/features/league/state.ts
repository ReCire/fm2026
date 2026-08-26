import { z } from 'zod';
import type { Rng } from '$lib/engine/rng';
import { leagueContent } from './content';
import { buildPyramid, generateFixtures } from './rules';

/**
 * The league pyramid, as plain saveable data.
 *
 * Two things changed on the way over from the prototype:
 *
 * 1. `points` is **not** stored. The prototype kept it alongside won/drawn and
 *    let the two drift apart whenever a result was applied twice. Here it is
 *    derived by `points()` in rules.ts, from the same content that awards it,
 *    so a three-point win can never disagree with the table.
 * 2. Nothing here is a getter. The prototype computed capacity, rank and
 *    strength with getters on live objects; getters do not survive
 *    `JSON.stringify`, so a saved season came back hollow.
 */

export const LeagueTeamSchema = z.object({
  name: z.string(),
  /** 1..99. The only input the match model has for a club that is not ours. */
  strength: z.number().int().min(1).max(99),
  played: z.number().int().min(0),
  won: z.number().int().min(0),
  drawn: z.number().int().min(0),
  lost: z.number().int().min(0),
  goalsFor: z.number().int().min(0),
  goalsAgainst: z.number().int().min(0)
});
export type LeagueTeam = z.infer<typeof LeagueTeamSchema>;

/** One scheduled match. `home`/`away` are indices into that division's team array. */
export const FixtureSchema = z.object({
  home: z.number().int().min(0),
  away: z.number().int().min(0),
  homeGoals: z.number().int().min(0).nullable(),
  awayGoals: z.number().int().min(0).nullable(),
  played: z.boolean()
});
export type Fixture = z.infer<typeof FixtureSchema>;

export const LeagueSchema = z.object({
  /** Which division the player's club is currently in. 0 = top. */
  playerLevel: z.number().int().min(0),
  /** Divisions, top first. `levels[l][i]` is a club; fixtures index into it. */
  levels: z.array(z.array(LeagueTeamSchema)),
  /** `fixtures[level][matchday - 1]` is that division's round. */
  fixtures: z.array(z.array(z.array(FixtureSchema))),
  /** Set by the season-end hook when the club takes a European place. */
  inEurope: z.boolean()
});
export type LeagueState = z.infer<typeof LeagueSchema>;

declare module '$lib/engine/state' {
  interface ModuleStates {
    league: LeagueState;
  }
}

/** A fresh pyramid: the prototype's `initLeagues()`, made deterministic. */
export function createLeague(rng: Rng): LeagueState {
  const levels = buildPyramid(rng, leagueContent.startLevel);
  return {
    playerLevel: leagueContent.startLevel,
    levels,
    fixtures: levels.map((teams) => generateFixtures(teams.length)),
    inEurope: false
  };
}

export const LEAGUE_VERSION = 1;
