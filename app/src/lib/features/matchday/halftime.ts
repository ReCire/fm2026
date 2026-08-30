import { createRng, mixSeed } from '$lib/engine/rng';
import type { GameState } from '$lib/engine/state';
import { continueFrom, scoreAt } from './narrate';
import { halfTimeDecision, optionById, cappedSwing, type Decision, type Option } from './intervene';
import { simulateFixture, amendResult, matchdayFixtures, teamById } from '../league/rules';

/**
 * Taking the half-time decision.
 *
 * This is the only place in the game where a result that has already been
 * counted is changed, so it does all of it in one function: play the second
 * half again with the new strength, retell it, correct the table, correct the
 * report, and charge what the choice costs. Spreading those five across hooks
 * would let four of them succeed and one be forgotten — and a table that no
 * longer matches the scoreline is the kind of bug nobody finds for weeks.
 */

/**
 * Our club's display name.
 *
 * Just the club's name. An editor rename is written onto the club itself, so
 * there is nothing to resolve and nothing for this to forget.
 */
function ourName(state: GameState): string {
  return teamById(state.modules.league, state.modules.league.playerClubId)?.name ?? 'Unser Verein';
}

/** The question waiting at the interval, or null when there is none. */
export function pendingDecision(state: GameState): Decision | null {
  const live = state.modules.matchday.live;
  if (!live || live.decided !== null) return null;
  if (live.minute < 45) return null;
  const [us, them] = scoreAt(live.beats, 45);
  return halfTimeDecision(us, them, state.modules.matchday.style);
}

export function applyHalfTime(state: GameState, optionId: string): Option | null {
  const m = state.modules.matchday;
  const live = m.live;
  if (!live || live.decided !== null) return null;

  const [us, them] = scoreAt(live.beats, 45);
  const decision = halfTimeDecision(us, them, m.style);
  const option = optionById(decision, optionId);
  if (!option) return null;

  live.decided = option.id;

  /*
   * A stream derived from the match rather than from the clock. The player can
   * sit at the interval for as long as they like, so anything that depended on
   * when they answered would make the second half a function of how long they
   * thought about it.
   */
  const rng = createRng(mixSeed(state.meta.seed, `halftime#${live.matchday}#${option.id}`));

  const league = state.modules.league;
  const teams = league.levels[league.playerLevel] ?? [];
  const fixture = matchdayFixtures(league, league.playerLevel, live.matchday)
    .find((f) => teams[f.home]?.id === league.playerClubId || teams[f.away]?.id === league.playerClubId);

  const swing = cappedSwing(option);
  const ours = live.ourStrength + swing;

  /*
   * The second half only. `goalChance` halved, because this is forty-five
   * minutes and not ninety — without it a half-time call would roughly double
   * the goals in the match regardless of which option was picked, which would
   * read as "intervening always makes it a shootout".
   */
  const half = simulateFixture(
    rng,
    live.isHome ? ours : live.opponentStrength,
    live.isHome ? live.opponentStrength : ours,
    0.5
  );
  const secondUs = live.isHome ? half.homeGoals : half.awayGoals;
  const secondThem = live.isHome ? half.awayGoals : half.homeGoals;

  const finalUs = us + secondUs;
  const finalThem = them + secondThem;

  live.beats = continueFrom(rng, live.beats, 45, {
    ourGoals: finalUs,
    theirGoals: finalThem,
    ourName: ourName(state),
    theirName: live.opponent,
    edge: ours - live.opponentStrength
  });

  /*
   * The table counted the original result at kickoff. Correct it.
   *
   * Loud, not silent. An `if (fixture)` that quietly does nothing leaves the
   * table saying one thing and the scoreline another, and nobody finds that
   * for weeks — it is the exact failure shape this codebase keeps hitting. If
   * the fixture cannot be found, the decision has not been applied and the
   * caller needs to know rather than see a resumed clock and assume it worked.
   */
  if (!fixture) {
    throw new Error(
      `Half-time decision could not find the player's fixture for matchday ${live.matchday}. ` +
      'The table has NOT been corrected.'
    );
  }
  amendResult(
    teams,
    fixture,
    live.isHome ? finalUs : finalThem,
    live.isHome ? finalThem : finalUs
  );

  // And the report, which is what the player reads afterwards.
  if (m.lastReport && m.lastReport.matchday === live.matchday) {
    m.lastReport.goalsFor = finalUs;
    m.lastReport.goalsAgainst = finalThem;
    const recent = m.recent[0];
    if (recent && recent.matchday === live.matchday) {
      recent.goalsFor = finalUs;
      recent.goalsAgainst = finalThem;
    }
  }

  // What it cost. Applied to the eleven that played, not to the whole squad.
  for (const p of state.modules.squad.players) {
    if (!state.modules.squad.lineup.includes(p.id)) continue;
    p.fitness = Math.max(10, Math.min(100, p.fitness - option.fitnessCost));
    p.morale = Math.max(0, Math.min(100, p.morale + option.morale));
  }

  return option;
}
