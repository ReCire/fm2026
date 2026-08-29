import type { LeagueState } from '../league/state';
import type { CalendarFilter } from './state';

/**
 * Calendar rules. Pure functions over league state — no state of the
 * calendar's own is read here at all.
 *
 * Ported from the prototype's `renderCalendarView()`, which listed every
 * matchday of a fixed 34-round season with a generic "⚽ Ligaspiel" label and
 * a `(HEUTE)` marker on the current one. There is no cup or Europe calendar to
 * overlay yet, so what survives is the SHAPE — one row per matchday, the
 * current one marked, played ones showing their outcome — rebuilt from the
 * real fixture list instead of a hardcoded round count, so it also carries an
 * opponent and a scoreline the prototype's version never had.
 */

export type MatchOutcome = 'win' | 'draw' | 'loss';

export interface SeasonMatch {
  /** 1-based, matching `state.meta.matchday`. */
  matchday: number;
  opponentId: string;
  isHome: boolean;
  played: boolean;
  goalsFor: number | null;
  goalsAgainst: number | null;
  result: MatchOutcome | null;
}

/**
 * Every matchday of the player's own division, reduced to the one fixture
 * that involves their club. Empty outside a season or if the club cannot be
 * found — never throws, because a screen render is not the place to crash.
 */
export function seasonSchedule(league: LeagueState): SeasonMatch[] {
  const teams = league.levels[league.playerLevel] ?? [];
  const us = teams.findIndex((t) => t.id === league.playerClubId);
  if (us < 0) return [];

  const rounds = league.fixtures[league.playerLevel] ?? [];
  const schedule: SeasonMatch[] = [];

  rounds.forEach((round, i) => {
    const fixture = round.find((f) => f.home === us || f.away === us);
    if (!fixture) return;

    const isHome = fixture.home === us;
    const opponentIndex = isHome ? fixture.away : fixture.home;
    const goalsFor = isHome ? fixture.homeGoals : fixture.awayGoals;
    const goalsAgainst = isHome ? fixture.awayGoals : fixture.homeGoals;
    const decided = fixture.played && goalsFor !== null && goalsAgainst !== null;

    schedule.push({
      matchday: i + 1,
      opponentId: teams[opponentIndex]?.id ?? '',
      isHome,
      played: fixture.played,
      goalsFor,
      goalsAgainst,
      result: decided ? outcomeOf(goalsFor!, goalsAgainst!) : null
    });
  });

  return schedule;
}

function outcomeOf(goalsFor: number, goalsAgainst: number): MatchOutcome {
  return goalsFor > goalsAgainst ? 'win' : goalsFor < goalsAgainst ? 'loss' : 'draw';
}

/** The player's display preference applied to the full season list. */
export function applyFilter(schedule: SeasonMatch[], filter: CalendarFilter): SeasonMatch[] {
  if (filter === 'played') return schedule.filter((m) => m.played);
  if (filter === 'upcoming') return schedule.filter((m) => !m.played);
  return schedule;
}

/** The next fixture still to be played, or `undefined` once the season is over. */
export function nextMatch(schedule: SeasonMatch[]): SeasonMatch | undefined {
  return schedule.find((m) => !m.played);
}

export interface SeasonTally {
  played: number;
  wins: number;
  draws: number;
  losses: number;
}

/** A quick record line — wins, draws, losses — from what has actually been played. */
export function seasonTally(schedule: SeasonMatch[]): SeasonTally {
  const played = schedule.filter((m) => m.played);
  return {
    played: played.length,
    wins: played.filter((m) => m.result === 'win').length,
    draws: played.filter((m) => m.result === 'draw').length,
    losses: played.filter((m) => m.result === 'loss').length
  };
}
