import { createRng, mixSeed } from '$lib/engine/rng';
import type { GameState } from '$lib/engine/state';
import type { Player } from '../squad/state';
import { continueFrom, scoreAt, type Beat } from './narrate';
import { simulateFixture, amendResult, matchdayFixtures, teamById } from '../league/rules';
import { rating, isAvailable } from '../squad/rules';

/**
 * The substitution.
 *
 * Requested by architecture after the parity audit: the prototype let a
 * manager bring on a fresh player mid-match, the port did not, and "the bench
 * exists but nothing you do can ever put it on the pitch" is the same
 * invisible-mechanic shape as an executive whose competence resolves nowhere.
 *
 * The trade is `rating()`, not a new number. A substitution is only a real
 * decision if it can be wrong — a strictly-better bench would make it a
 * button that says "get stronger" — and `squad/rules.ts` already prices a
 * player's fitness as a deviation from baseline, so a tired 65 coming off for
 * a fresh 60 is a genuine gamble in both directions rather than an invented
 * bonus. This file adds no second opinion about a player's quality; it just
 * asks the same function twice, before and after the swap.
 */

export const MAX_SUBS = 3;

/** Our club's display name, looked up by id — see halftime.ts's identical helper. */
function ourName(state: GameState): string {
  return teamById(state.modules.league, state.modules.league.playerClubId)?.name ?? 'Unser Verein';
}

/** Everyone who could come ON: available, and not already out there. */
export function benchFor(state: GameState): Player[] {
  const squad = state.modules.squad;
  return squad.players.filter((p) => isAvailable(p) && !squad.lineup.includes(p.id));
}

/** Everyone who could come OFF: the current eleven, in lineup order. */
export function onPitch(state: GameState): Player[] {
  const squad = state.modules.squad;
  const byId = new Map(squad.players.map((p) => [p.id, p]));
  return squad.lineup.map((id) => byId.get(id)).filter((p): p is Player => !!p);
}

/**
 * The swing one swap is worth, on the team's average — see the note beside
 * its call site. Exported so the direction of the trade (fresh legs can help
 * OR hurt, depending who is actually coming on) is testable without playing
 * out a whole career.
 */
export function subSwing(inP: Player, outP: Player): number {
  return (rating(inP) - rating(outP)) / 11;
}

export function canSubstitute(state: GameState): boolean {
  const live = state.modules.matchday.live;
  if (!live || live.minute >= 90 || live.running) return false;
  return live.subsUsed < MAX_SUBS && benchFor(state).length > 0;
}

/**
 * Bring `inId` on for `outId`, from this minute.
 *
 * Structurally the half-time decision's sibling: `continueFrom` re-narrates
 * only what has not happened yet, onto a final score decided fresh — the same
 * reason a half-time call cannot un-happen the first half. The two differ in
 * what moves the strength: a half-time option reads a fixed table, a
 * substitution reads the swap itself, at whatever minute the manager actually
 * made it rather than a fixed interval.
 */
export function applySubstitution(state: GameState, outId: string, inId: string): boolean {
  const m = state.modules.matchday;
  const live = m.live;
  if (!live || live.minute >= 90 || live.running) return false;
  if (live.subsUsed >= MAX_SUBS) return false;
  if (outId === inId) return false;

  const squad = state.modules.squad;
  if (!squad.lineup.includes(outId)) return false;
  const outPlayer = squad.players.find((p) => p.id === outId);
  const inPlayer = squad.players.find((p) => p.id === inId);
  if (!outPlayer || !inPlayer || !isAvailable(inPlayer) || squad.lineup.includes(inId)) return false;

  const rng = createRng(
    mixSeed(state.meta.seed, `sub#${live.matchday}#${live.subsUsed}#${outId}#${inId}`)
  );

  /*
   * One eleventh, not the whole gap.
   *
   * `teamStrength()` is the lineup's average `rating()` across eleven shirts;
   * swapping one of them moves the SUM by `rating(in) - rating(out)` and the
   * average by a twelfth of that... except the team is eleven, not twelve, so
   * it is a eleventh. Applying the raw player-to-player gap to the whole team
   * would let one substitution outweigh the entire rest of the eleven.
   */
  const swing = subSwing(inPlayer, outPlayer);
  const [usNow, themNow] = scoreAt(live.beats, live.minute);
  const ours = live.ourStrength + swing;

  const share = Math.max(0, (90 - live.minute) / 90);
  const rest = simulateFixture(
    rng,
    live.isHome ? ours : live.opponentStrength,
    live.isHome ? live.opponentStrength : ours,
    share
  );
  const restUs = live.isHome ? rest.homeGoals : rest.awayGoals;
  const restThem = live.isHome ? rest.awayGoals : rest.homeGoals;
  const finalUs = usNow + restUs;
  const finalThem = themNow + restThem;

  const subBeat: Beat = {
    minute: live.minute, kind: 'sub', ours: true,
    text: `Wechsel: ${inPlayer.name} kommt für ${outPlayer.name}.`,
    score: [usNow, themNow]
  };
  live.beats = [
    ...continueFrom(rng, live.beats, live.minute, {
      ourGoals: finalUs,
      theirGoals: finalThem,
      ourName: ourName(state),
      theirName: live.opponent,
      edge: ours - live.opponentStrength
    }),
    subBeat
  ].sort((a, b) => a.minute - b.minute);

  // The eleven changes now, not just the beats — everything downstream
  // (post-match fitness loss, injury risk) already reads `squad.lineup`, so
  // this one line is what makes the substitute actually PLAY the rest of the
  // match rather than merely appear in the feed.
  squad.lineup = squad.lineup.map((id) => (id === outId ? inId : id));
  live.subs.push({ minute: live.minute, outId, inId });
  live.subsUsed += 1;

  /*
   * Same correction the half-time call makes, and for the same reason: the
   * table counted the score at kickoff, and this is the second thing in the
   * game that can change a result after it was counted. See halftime.ts —
   * duplicated rather than shared, because reaching into architecture's file
   * to extract a helper is a bigger seam crossing than this feature needed.
   */
  const league = state.modules.league;
  const teams = league.levels[league.playerLevel] ?? [];
  const fixture = matchdayFixtures(league, league.playerLevel, live.matchday)
    .find((f) => teams[f.home]?.id === league.playerClubId || teams[f.away]?.id === league.playerClubId);
  if (!fixture) {
    throw new Error(
      `Substitution could not find the player's fixture for matchday ${live.matchday}. ` +
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

  return true;
}
