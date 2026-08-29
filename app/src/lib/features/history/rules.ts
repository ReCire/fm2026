import type { LeagueState } from '../league/state';
import { matchdayFixtures, standings, levelName } from '../league/rules';
import type { BiggestWin, SeasonOutcome, SeasonRecord } from './state';

/**
 * History rules. Pure functions, no I/O — the matchday hook and the
 * season-end hook in module.ts are the only callers.
 *
 * league/rules.ts already computes everything a finished season needs
 * (`standings`, `seasonOutcome`); this file's job is narrower: notice the
 * player's own result on a matchday that has just been played, track the
 * biggest win as the season goes, and freeze one row into a `SeasonRecord`
 * when the season closes — before league resets the table for the next one.
 */

export interface OwnResult {
  opponentId: string;
  isHome: boolean;
  goalsFor: number;
  goalsAgainst: number;
}

/**
 * The player's own result for one matchday, once it has been decided.
 * `undefined` before it is played, outside the season, or if the club cannot
 * be found — the caller (module.ts) treats all three the same way: do nothing.
 */
export function ownResult(league: LeagueState, matchday: number): OwnResult | undefined {
  const teams = league.levels[league.playerLevel];
  if (!teams) return undefined;
  const us = teams.findIndex((t) => t.id === league.playerClubId);
  if (us < 0) return undefined;

  const fixture = matchdayFixtures(league, league.playerLevel, matchday).find(
    (f) => f.home === us || f.away === us
  );
  if (!fixture || !fixture.played || fixture.homeGoals === null || fixture.awayGoals === null) {
    return undefined;
  }

  const isHome = fixture.home === us;
  const opponentIndex = isHome ? fixture.away : fixture.home;
  return {
    opponentId: teams[opponentIndex]?.id ?? '',
    isHome,
    goalsFor: isHome ? fixture.homeGoals : fixture.awayGoals,
    goalsAgainst: isHome ? fixture.awayGoals : fixture.homeGoals
  };
}

/** Win margin. Zero or negative for anything that was not a win. */
function margin(r: { goalsFor: number; goalsAgainst: number }): number {
  return r.goalsFor - r.goalsAgainst;
}

/**
 * The bigger of a running best and a new candidate, by margin and then by
 * goals scored — so a 4:3 does not overwrite a 3:0. A draw or a loss never
 * replaces anything; a loss is never a "win" regardless of how it compares.
 */
export function biggerWin(current: BiggestWin | null, candidate: OwnResult): BiggestWin | null {
  if (candidate.goalsFor <= candidate.goalsAgainst) return current;
  if (
    !current ||
    margin(candidate) > margin(current) ||
    (margin(candidate) === margin(current) && candidate.goalsFor > current.goalsFor)
  ) {
    return {
      opponentId: candidate.opponentId,
      isHome: candidate.isHome,
      goalsFor: candidate.goalsFor,
      goalsAgainst: candidate.goalsAgainst
    };
  }
  return current;
}

/** Freeze the season that just ended into one record, before anything moves. */
export function seasonRecord(
  league: LeagueState,
  season: number,
  outcome: SeasonOutcome,
  biggestWin: BiggestWin | null
): SeasonRecord {
  const teams = league.levels[league.playerLevel] ?? [];
  const row = standings(teams).find((r) => r.team.id === league.playerClubId);

  return {
    season,
    league: levelName(league.playerLevel),
    rank: row?.pos ?? 0,
    points: row?.points ?? 0,
    goalsFor: row?.team.goalsFor ?? 0,
    goalsAgainst: row?.team.goalsAgainst ?? 0,
    outcome,
    biggestWin
  };
}

/** Best (lowest) final position across the whole career. `undefined` with no seasons yet. */
export function careerBestRank(seasons: readonly SeasonRecord[]): number | undefined {
  const ranked = seasons.map((s) => s.rank).filter((r) => r > 0);
  return ranked.length > 0 ? Math.min(...ranked) : undefined;
}

/** The single biggest win across every recorded season, with the season it happened in. */
export function careerBiggestWin(
  seasons: readonly SeasonRecord[]
): (BiggestWin & { season: number }) | undefined {
  let best: (BiggestWin & { season: number }) | undefined;
  for (const s of seasons) {
    if (!s.biggestWin) continue;
    const candidateMargin = margin(s.biggestWin);
    const bestMargin = best ? margin(best) : -Infinity;
    if (candidateMargin > bestMargin || (candidateMargin === bestMargin && s.biggestWin.goalsFor > (best?.goalsFor ?? -1))) {
      best = { ...s.biggestWin, season: s.season };
    }
  }
  return best;
}
