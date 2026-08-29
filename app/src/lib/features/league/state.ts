import { z } from 'zod';
import type { Rng } from '$lib/engine/rng';
import { leagueContent } from './content';
import { buildPyramid, generateFixtures } from './rules';
import { onboardingContent } from '../onboarding/content';

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
  /**
   * Stable identity, deliberately NOT derived from the name.
   *
   * The editor renames clubs, so a name-derived id would either break the link
   * the moment someone edits, or stop matching what is on screen. It is also
   * what makes an edit pack portable: a pack keyed on names would apply to
   * whichever club happened to be called that in the recipient's world.
   *
   * Generated from the seeded RNG at pyramid build, so the same seed produces
   * the same ids and an edit made on one career survives starting it again.
   * Designed clubs carry their own fixed id and are portable across seeds;
   * generated ones are necessarily seed-local, because "the club in slot 7" has
   * no meaning in someone else's world.
   */
  id: z.string(),
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
  /**
   * WHICH club is ours, by id.
   *
   * Everything used to find it by comparing names against a constant, which
   * meant renaming your own club in the editor — the first thing anyone does —
   * would stop the game finding your fixture at all. An identity has to survive
   * being renamed, or it was never an identity.
   */
  playerClubId: z.string(),
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
  /*
   * The designed clubs are seeded into their own divisions as a MINORITY —
   * four crafted among fourteen generated in a division of eighteen. They give
   * the division a texture and put clubs the player will actually meet into the
   * crest carousel; the generated remainder stays deliberately plain, because a
   * club with no story is a blank slate that invites replacement, which is what
   * shipping an editor is for.
   */
  const designed: Record<number, { id: string; name: string }[]> = {};
  for (const club of onboardingContent.clubs) {
    (designed[club.leagueLevel] ??= []).push({ id: club.id, name: club.name });
  }

  const levels = buildPyramid(rng, leagueContent.startLevel, designed);
  const startDivision = levels[leagueContent.startLevel] ?? [];

  return {
    playerLevel: leagueContent.startLevel,
    // Provisional: onboarding replaces this the moment a club is chosen. It is
    // a real id rather than a placeholder so a game that skips onboarding is
    // still coherent.
    playerClubId: startDivision[0]?.id ?? 'unknown',
    levels,
    fixtures: levels.map((teams) => generateFixtures(teams.length)),
    inEurope: false
  };
}

export const LEAGUE_VERSION = 1;
