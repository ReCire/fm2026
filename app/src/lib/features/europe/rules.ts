import type { Rng } from '$lib/engine/rng';
import { simulateFixture } from '../league/rules';
import {
  europeContent, euroClubs, standIn, clubById, GROUP_ROUNDS, KNOCKOUT
} from './content';
import { PLAYER, type EuroEntry, type EuroMatch, type EuropeState, type Tie } from './state';

/**
 * The Champions Cup, played rather than announced.
 *
 * Pure functions with the RNG injected, like every other rules file — which is
 * also what makes the two prototype bugs impossible to reproduce here. A
 * semi-final is a `Tie` with two null slots, and the only way to fill in a
 * winner is to run `resolveTie`, which needs a seed and two strengths.
 */

const C = europeContent;

/* ─────────────────────────────────────────────────────────────────────────
 * The draw
 * ───────────────────────────────────────────────────────────────────────── */

/**
 * Eight clubs into two groups of four.
 *
 * The player takes a seat only when they qualified; otherwise Mersey City
 * takes it and the tournament runs without them. That is the prototype's own
 * decision and a good one — a competition that exists only in the seasons you
 * are in it never gets a chance to mean anything, and watching the stand-in
 * win it twice from the third division is what makes qualifying land.
 */
export function drawGroups(rng: Rng, playerIn: boolean): { A: string[]; B: string[] } {
  const entrants = [...euroClubs.map((c) => c.id), playerIn ? PLAYER : standIn.id];
  const shuffled = [...entrants];
  // Fisher-Yates, so every arrangement is equally likely. Sorting by a random
  // key is the version that looks equivalent and is measurably biased.
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
  }
  return { A: shuffled.slice(0, C.groupSize), B: shuffled.slice(C.groupSize) };
}

export function emptyTable(groups: { A: string[]; B: string[] }): EuroEntry[] {
  return [...groups.A, ...groups.B].map((clubId) => ({
    clubId, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0
  }));
}

export function createTournament(rng: Rng, season: number, playerIn: boolean): EuropeState {
  const groups = drawGroups(rng, playerIn);
  return {
    season,
    groups,
    table: emptyTable(groups),
    matches: [],
    /*
     * Two ties with four null slots. Declared here so the screen has something
     * to render from the first matchday — "Halbfinale steht noch nicht fest"
     * is a state, not an absence.
     */
    semis: KNOCKOUT.semis.map(() => emptyTie()),
    final: null,
    champion: null,
    playerIn,
    prizeMoney: 0
  };
}

export function emptyTie(): Tie {
  return { home: null, away: null, homeGoals: null, awayGoals: null, winner: null, onPenalties: false };
}

/* ─────────────────────────────────────────────────────────────────────────
 * Strength
 * ───────────────────────────────────────────────────────────────────────── */

/**
 * How good a club is today.
 *
 * Everyone except us carries a fixed number from content. Ours is whatever the
 * eleven, the tactics and the doctrine produced this matchday, which is the
 * reason `PLAYER` is a sentinel rather than a row in the club table: a stored
 * strength would go stale the moment somebody was injured.
 */
export function strengthOf(clubId: string, playerStrength: number): number {
  return clubId === PLAYER ? playerStrength : clubById.get(clubId)?.strength ?? 80;
}

/* ─────────────────────────────────────────────────────────────────────────
 * The group stage
 * ───────────────────────────────────────────────────────────────────────── */

/** Which of the six group matchdays this is, or -1. */
export function groupRoundOf(matchday: number): number {
  return C.groupMatchdays.indexOf(matchday);
}

/**
 * The fixtures for one group round, with the venue swapped in the second half.
 *
 * Six matchdays over a three-round table: rounds 3 to 5 are rounds 0 to 2
 * played back the other way, which is what makes it a double round-robin
 * rather than the same three games twice.
 */
export function fixturesFor(group: string[], round: number): [string, string][] {
  const pattern = GROUP_ROUNDS[round % GROUP_ROUNDS.length]!;
  const reversed = round >= GROUP_ROUNDS.length;
  return pattern.map(([h, a]) =>
    reversed ? [group[a]!, group[h]!] : [group[h]!, group[a]!]
  );
}

function entry(state: EuropeState, clubId: string): EuroEntry | undefined {
  return state.table.find((e) => e.clubId === clubId);
}

function applyResult(state: EuropeState, match: EuroMatch): void {
  const home = entry(state, match.home);
  const away = entry(state, match.away);
  if (!home || !away) return;
  for (const [side, gf, ga] of [
    [home, match.homeGoals, match.awayGoals] as const,
    [away, match.awayGoals, match.homeGoals] as const
  ]) {
    side.played += 1;
    side.goalsFor += gf;
    side.goalsAgainst += ga;
    if (gf > ga) { side.won += 1; side.points += 3; }
    else if (gf === ga) { side.drawn += 1; side.points += 1; }
    else side.lost += 1;
  }
}

/** Play one group round. Returns the matches, newest last. */
export function playGroupRound(
  state: EuropeState,
  rng: Rng,
  matchday: number,
  playerStrength: number
): EuroMatch[] {
  const round = groupRoundOf(matchday);
  if (round < 0) return [];
  const played: EuroMatch[] = [];

  for (const [name, group] of [['A', state.groups.A], ['B', state.groups.B]] as const) {
    for (const [home, away] of fixturesFor(group, round)) {
      const result = simulateFixture(
        rng,
        strengthOf(home, playerStrength),
        strengthOf(away, playerStrength)
      );
      const match: EuroMatch = {
        matchday, stage: 'group', group: name, home, away,
        homeGoals: result.homeGoals, awayGoals: result.awayGoals
      };
      applyResult(state, match);
      state.matches.push(match);
      played.push(match);
    }
  }
  return played;
}

/**
 * A group in finishing order.
 *
 * Points, then goal difference, then goals scored — and `clubId` last so the
 * order is total. Without that final key two clubs level on everything sort
 * by whatever order they happened to be in, and the semi-final draw would
 * change depending on how the array was built.
 */
export function standings(state: EuropeState, group: 'A' | 'B'): EuroEntry[] {
  const ids = new Set(state.groups[group]);
  return state.table
    .filter((e) => ids.has(e.clubId))
    .sort(
      (a, b) =>
        b.points - a.points ||
        (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst) ||
        b.goalsFor - a.goalsFor ||
        a.clubId.localeCompare(b.clubId)
    );
}

export function groupsComplete(state: EuropeState): boolean {
  return state.matches.filter((m) => m.stage === 'group').length >= C.groupMatchdays.length * 2;
}

/* ─────────────────────────────────────────────────────────────────────────
 * The knockout
 * ───────────────────────────────────────────────────────────────────────── */

/**
 * Resolve a tie, which must produce a winner.
 *
 * A knockout game cannot end level, so a draw goes to penalties — weighted by
 * strength but only slightly, because a shoot-out is the one part of football
 * where being better helps least. That weighting is why this cannot be
 * satisfied by printing a result: the winner is a function of the seed and the
 * two strengths, and neither is known when the tie is declared.
 */
export function resolveTie(
  rng: Rng,
  home: string,
  away: string,
  playerStrength: number
): Tie {
  const hs = strengthOf(home, playerStrength);
  const as = strengthOf(away, playerStrength);
  const result = simulateFixture(rng, hs, as);

  if (result.homeGoals !== result.awayGoals) {
    return {
      home, away,
      homeGoals: result.homeGoals, awayGoals: result.awayGoals,
      winner: result.homeGoals > result.awayGoals ? home : away,
      onPenalties: false
    };
  }

  /*
   * 0.5 plus a twentieth of a point per point of difference, capped either
   * side. Eleven points of gap — the whole spread of the tournament — moves a
   * shoot-out from even to roughly two-to-one, which is about right and is a
   * long way short of the certainty the group stage offers.
   */
  const edge = Math.max(0.25, Math.min(0.75, 0.5 + (hs - as) * 0.02));
  return {
    home, away,
    homeGoals: result.homeGoals, awayGoals: result.awayGoals,
    winner: rng.chance(edge) ? home : away,
    onPenalties: true
  };
}

/** Fill the two semi-final slots from the finished groups. */
export function seedSemis(state: EuropeState): void {
  const a = standings(state, 'A');
  const b = standings(state, 'B');
  const pick = (group: string, place: number) =>
    (group === 'A' ? a : b)[place - 1]?.clubId ?? null;

  state.semis = KNOCKOUT.semis.map((tie) => ({
    ...emptyTie(),
    home: pick(tie.home.group, tie.home.place),
    away: pick(tie.away.group, tie.away.place)
  }));
}

/** Fill the final from the two semi-final WINNERS, which must already exist. */
export function seedFinal(state: EuropeState): void {
  const [first, second] = state.semis;
  if (!first?.winner || !second?.winner) return;
  state.final = { ...emptyTie(), home: first.winner, away: second.winner };
}

/* ─────────────────────────────────────────────────────────────────────────
 * Money
 * ───────────────────────────────────────────────────────────────────────── */

export interface Prize {
  amount: number;
  reason: string;
}

/** What our club earned from one group round, if anything. */
export function groupPrize(matches: readonly EuroMatch[]): Prize | null {
  const ours = matches.find((m) => m.home === PLAYER || m.away === PLAYER);
  if (!ours) return null;
  const isHome = ours.home === PLAYER;
  const gf = isHome ? ours.homeGoals : ours.awayGoals;
  const ga = isHome ? ours.awayGoals : ours.homeGoals;
  if (gf > ga) return { amount: C.groupWin, reason: 'Champions Cup — Gruppensieg' };
  if (gf === ga) return { amount: C.groupDraw, reason: 'Champions Cup — Gruppenremis' };
  return null;
}

/**
 * What reaching a round is worth.
 *
 * The prototype paid nothing at all for losing a final, so the second-biggest
 * night of a career was worth exactly what a beaten semi-finalist got. Every
 * round pays for being reached; the trophy pays again on top.
 */
export function roundPrize(stage: 'semi' | 'final', won: boolean): Prize {
  if (stage === 'semi') {
    return { amount: C.reachSemi, reason: 'Champions Cup — Halbfinale' };
  }
  return won
    ? { amount: C.reachFinal + C.win, reason: 'Champions Cup — Titel' }
    : { amount: C.reachFinal, reason: 'Champions Cup — Finale' };
}

/** Did our club take part in this tie at all? */
export function playerIn(tie: Tie | null): boolean {
  return !!tie && (tie.home === PLAYER || tie.away === PLAYER);
}
