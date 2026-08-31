import type { GameState } from '$lib/engine/state';
import { amendResult, matchdayFixtures } from '../league/rules';

/**
 * Correct the table, the report and the record after a result that has
 * already been counted changes again.
 *
 * Two callers reach this: a half-time decision and a substitution. Both are
 * the same fact wearing a different trigger — something the manager did
 * after kickoff moved the final score, and three pieces of state have to
 * agree about the new one: the league table, the stored match report, and
 * the career win count. Kept in one place rather than copied per caller
 * because those three staying in sync is a consistency invariant, not
 * incidental duplication — the shape of bug that shows up as a table
 * disagreeing with its own fixtures, found by a player rather than a test.
 *
 * Loud, not silent, when the fixture cannot be found: an `if (fixture)` that
 * quietly does nothing would leave the clock resumed and the correction
 * skipped, with nothing on screen to say so.
 */
export function applyMidMatchOutcome(
  state: GameState,
  finalUs: number,
  finalThem: number,
  /** Who's asking, for the error message only — "Half-time decision", "Substitution". */
  source: string
): void {
  const m = state.modules.matchday;
  const live = m.live;
  if (!live) return;

  const league = state.modules.league;
  const teams = league.levels[league.playerLevel] ?? [];
  const fixture = matchdayFixtures(league, league.playerLevel, live.matchday)
    .find((f) => teams[f.home]?.id === league.playerClubId || teams[f.away]?.id === league.playerClubId);

  if (!fixture) {
    throw new Error(
      `${source} could not find the player's fixture for matchday ${live.matchday}. ` +
      'The table has NOT been corrected.'
    );
  }
  amendResult(
    teams, fixture,
    live.isHome ? finalUs : finalThem,
    live.isHome ? finalThem : finalUs
  );

  if (m.lastReport && m.lastReport.matchday === live.matchday) {
    const wasWin = m.lastReport.goalsFor > m.lastReport.goalsAgainst;
    const isWin = finalUs > finalThem;
    if (!wasWin && isWin) m.careerWins += 1;
    if (wasWin && !isWin) m.careerWins = Math.max(0, m.careerWins - 1);

    m.lastReport.goalsFor = finalUs;
    m.lastReport.goalsAgainst = finalThem;
    const recent = m.recent[0];
    if (recent && recent.matchday === live.matchday) {
      recent.goalsFor = finalUs;
      recent.goalsAgainst = finalThem;
    }
  }
}

/**
 * Resilienz, spent on a half we go into behind.
 *
 * Nothing at all when level or ahead — `me_resilienz` and `me_unbesiegbar` buy
 * "Siegchance aus Rückständen", and a bonus that also applied while winning
 * would be a flat strength node with a more interesting name. Applied at the
 * moment play resumes rather than at kickoff, because that is the only point
 * in this model where the score exists and "behind" is a fact rather than a
 * forecast.
 */
export function comebackFor(live: { comeback: number }, us: number, them: number): number {
  return us < them ? live.comeback : 0;
}
