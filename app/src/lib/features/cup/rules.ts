import type { Rng } from '$lib/engine/rng';
import type { LeagueState } from '../league/state';
import { allTeams, teamById } from '../league/rules';
import { cupContent } from './content';
import type { CupPairing, CupRound, CupState } from './state';

/**
 * The cup, as arithmetic.
 *
 * A knockout is the one thing a league table cannot give you: the season-long
 * table is a slow averaging machine that eventually tells the truth about how
 * good you are, and the cup is ninety minutes where it might not. That is the
 * whole reason to build it, and every rule here is chosen to protect it.
 */

const C = cupContent;

/** How many rounds the bracket has. */
export const ROUNDS = C.roundNames.length;

/**
 * Draw a fresh bracket for the season.
 *
 * The player's club is always in it — a cup you might not be entered into is a
 * screen that is empty most seasons. The other thirty-one are drawn from the
 * whole pyramid, which is what puts a first-division side in front of you in
 * round one and makes the draw worth reading.
 */
export function drawBracket(rng: Rng, league: LeagueState): CupRound[] {
  const everyone = allTeams(league);
  const us = league.playerClubId;

  const pool = everyone.map((t) => ({ id: t.team.id, level: t.level })).filter((t) => t.id !== us);
  // Fisher-Yates from the seeded stream, so the same career draws the same cup.
  for (let i = pool.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    [pool[i], pool[j]] = [pool[j]!, pool[i]!];
  }

  const ourLevel = everyone.find((t) => t.team.id === us)?.level ?? 3;
  const entrants = [{ id: us, level: ourLevel }, ...pool.slice(0, C.bracketSize - 1)];
  for (let i = entrants.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    [entrants[i], entrants[j]] = [entrants[j]!, entrants[i]!];
  }

  return [{ roundIndex: 0, pairings: pairUp(entrants), completed: false }];
}

/**
 * Pair a list into ties, with the LOWER division at home.
 *
 * The real rule, and the one that makes the format work: a fourth-division club
 * that draws a first-division one gets them at its own ground. It is the only
 * advantage the small side has, and without it the giant-killing the whole
 * competition exists for essentially never happens.
 */
function pairUp(entrants: { id: string; level: number }[]): CupPairing[] {
  const pairings: CupPairing[] = [];
  for (let i = 0; i + 1 < entrants.length; i += 2) {
    const a = entrants[i]!;
    const b = entrants[i + 1]!;
    // Higher `level` index means a lower division.
    const [home, away] = a.level >= b.level ? [a, b] : [b, a];
    pairings.push({
      homeId: home.id, awayId: away.id,
      homeGoals: null, awayGoals: null, penaltyWinnerId: null, played: false
    });
  }
  return pairings;
}

/** The strength a club takes into a tie. Ours is the cached matchday figure. */
export function strengthOf(league: LeagueState, cup: CupState, clubId: string): number {
  if (clubId === league.playerClubId) return Math.round(cup.playerStrength);
  return teamById(league, clubId)?.strength ?? C.unknownStrength;
}

/**
 * Ninety minutes, then penalties if it is level.
 *
 * Deliberately more open than a league fixture. A cup tie that resolves like a
 * Saturday afternoon is a Saturday afternoon; the shoot-out is what makes the
 * format cruel, and cruelty is the point — it is the only competition where
 * being better is not enough.
 */
export function resolveTie(rng: Rng, pairing: CupPairing, home: number, away: number): CupPairing {
  const edge = home + 4 - away;   // a smaller home advantage than the league's
  const homeGoals = Math.max(0, Math.floor(rng.next() * 3 + Math.max(0, edge) * 0.045));
  const awayGoals = Math.max(0, Math.floor(rng.next() * 3 + Math.max(0, -edge) * 0.045));

  let penaltyWinnerId: string | null = null;
  if (homeGoals === awayGoals) {
    /*
     * Barely weighted. A shoot-out that the better side wins 80% of the time is
     * just the league model again in a hat — the whole reason it is dramatic is
     * that it is nearly a coin toss.
     */
    const homeChance = 0.5 + Math.max(-0.12, Math.min(0.12, edge * 0.006));
    penaltyWinnerId = rng.chance(homeChance) ? pairing.homeId : pairing.awayId;
  }

  return { ...pairing, homeGoals, awayGoals, penaltyWinnerId, played: true };
}

export function winnerOf(pairing: CupPairing): string | null {
  if (!pairing.played || pairing.homeGoals === null || pairing.awayGoals === null) return null;
  if (pairing.penaltyWinnerId) return pairing.penaltyWinnerId;
  return pairing.homeGoals > pairing.awayGoals ? pairing.homeId : pairing.awayId;
}

/** The round due before this league matchday, or null when none is. */
export function roundDueAt(matchday: number): number | null {
  const i = C.roundMatchdays.indexOf(matchday);
  return i === -1 ? null : i;
}

/** Our own tie in a round, if we are still in it. */
export function tieFor(round: CupRound | undefined, clubId: string): CupPairing | undefined {
  return round?.pairings.find((p) => p.homeId === clubId || p.awayId === clubId);
}

/** Build the next round from the winners of the one just completed. */
export function nextRound(league: LeagueState, round: CupRound): CupRound | null {
  if (round.roundIndex + 1 >= ROUNDS) return null;
  const winners = round.pairings
    .map(winnerOf)
    .filter((id): id is string => id !== null)
    .map((id) => ({ id, level: levelOf(league, id) }));
  return { roundIndex: round.roundIndex + 1, pairings: pairUp(winners), completed: false };
}

function levelOf(league: LeagueState, clubId: string): number {
  return allTeams(league).find((t) => t.team.id === clubId)?.level ?? 3;
}

export function roundName(index: number): string {
  return C.roundNames[index] ?? `Runde ${index + 1}`;
}

export function prizeFor(index: number): number {
  return C.prizes[index] ?? 0;
}

/** How the tie reads on screen: "2:1" or "1:1 n.E." */
export function scoreline(p: CupPairing): string {
  if (!p.played || p.homeGoals === null || p.awayGoals === null) return '–:–';
  return `${p.homeGoals}:${p.awayGoals}${p.penaltyWinnerId ? ' n.E.' : ''}`;
}
