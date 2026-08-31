import {
  boardContent, bandFor, demandFor, expectedRank, isDisaster, SACK_AT,
  doubtPerStoryWeight, type ExpectationInput
} from './content';
import type { BoardState, Ultimatum, Verdict } from './state';

/**
 * The boardroom's arithmetic. Pure, so a career can be judged without one.
 *
 * Two inputs and only two: the season against the bar, and what the papers
 * printed in between. Results reach this file exclusively through the first,
 * and never as a scoreline — see `doubtFrom`.
 */

/**
 * Clamp trust, honouring a floor a doctrine node may have bought.
 *
 * The floor is `max` arity in EFFECTS, not `total`: two nodes promising trust
 * never falls below 30 and below 40 promise a floor of 40, not 70. A node whose
 * German reads "fällt nie unter 40 %" has to be literally true, because the
 * tree is the one place a player reads the numbers carefully.
 */
export function clampTrust(value: number, floor = 0): number {
  const safeFloor = Math.max(0, Math.min(100, floor));
  return Math.max(safeFloor, Math.min(100, value));
}

/* ─────────────────────────────────────────────────────────────────────────
 * The bar
 * ───────────────────────────────────────────────────────────────────────── */

/**
 * Where the club finished last season, as far as this board is concerned.
 *
 * `null` after a promotion or a relegation, and that is the point: last May
 * happened in a different division, so carrying the position across would have
 * a board demand a repeat of eleventh in a league the club has never played in.
 */
export function lastRankFor(state: BoardState): number | null {
  const last = state.verdicts[state.verdicts.length - 1];
  if (!last || last.promoted || last.relegated) return null;
  return last.actual;
}

export interface Bar {
  rank: number;
  demand: string;
  /**
   * The inputs the bar came from, carried along so a verdict can ask whether
   * a finish was a disaster without rebuilding them.
   *
   * `isDisaster` is exported from content for one reason: writing the
   * comparison out twice is how a manager gets dismissed for the exact place
   * his board asked him to reach. Passing the input rather than the line keeps
   * there being one comparison.
   */
  input: ExpectationInput;
}

/** The bar, in a number and in words. Both are shown; neither is hidden. */
export function barFor(
  state: BoardState,
  input: { level: number; budgetRank: number; clubs: number }
): Bar {
  const rank = expectedRank({
    level: input.level,
    budgetRank: input.budgetRank,
    lastRank: lastRankFor(state),
    clubs: input.clubs
  });
  const inputs: ExpectationInput = {
    level: input.level,
    budgetRank: input.budgetRank,
    lastRank: lastRankFor(state),
    clubs: input.clubs
  };
  return { rank, demand: demandFor(rank, input.clubs), input: inputs };
}

/* ─────────────────────────────────────────────────────────────────────────
 * The verdict
 * ───────────────────────────────────────────────────────────────────────── */

export interface SeasonInput {
  season: number;
  /** The bar, as a table position. 1 is top. */
  expected: number;
  actual: number;
  demand: string;
  promoted: boolean;
  relegated: boolean;
  /**
   * Whether the finish was below the line that is a failure whatever the bar
   * said. A club can beat a modest bar and still finish in the bottom
   * fifteenth of the table, and no board calls that a good season.
   */
  disaster: boolean;
}

/**
 * What a season was worth.
 *
 * `expected − actual` is the whole idea: positive means finishing higher up the
 * table than the money said you would. Everything else is a coefficient.
 *
 * Asymmetric, and capped. Asymmetric because a board rewards less than it
 * punishes and then quietly raises the bar — `memoryOfLastSeason` charges you
 * for the same success a second time. Capped because one year should not be
 * able to end the story twice: an eighteen-place collapse and a nine-place
 * collapse are both a sacking, and letting the first bank enough damage to
 * outlive a recovery makes the recovery pointless.
 */
export function seasonDelta(input: SeasonInput): number {
  const c = boardContent;
  const places = input.expected - input.actual;
  const base = places >= 0 ? places * c.perRankOver : places * c.perRankUnder;
  const capped = Math.max(-c.seasonCap, Math.min(c.seasonCap, base));
  const promotion = input.promoted ? c.promotionBonus : 0;
  const relegation = input.relegated ? -c.relegationPenalty : 0;

  /*
   * A disaster cannot be a positive season, however low the bar was.
   *
   * The bar protects a poorly funded club from being sacked for finishing
   * where its money says. It should not protect it from finishing in the
   * bottom tenth — a board handed "Klassenerhalt" and given seventeenth of
   * eighteen does not send a letter of thanks. Floored at zero rather than
   * inverted, because the relegation penalty is already the punishment and
   * counting it twice is the double-jeopardy this whole design avoids.
   */
  const total = capped + promotion + relegation;
  return input.disaster ? Math.min(0, total) : total;
}

/** Apply a season's verdict, record it, and return it. */
export function judgeSeason(state: BoardState, input: SeasonInput, floor = 0): Verdict {
  const delta = seasonDelta(input);
  state.trust = clampTrust(state.trust + delta, floor);
  const verdict: Verdict = {
    season: input.season,
    expected: input.expected,
    actual: input.actual,
    demand: input.demand,
    promoted: input.promoted,
    relegated: input.relegated,
    delta,
    trustAfter: state.trust
  };
  state.verdicts.push(verdict);
  return verdict;
}

/* ─────────────────────────────────────────────────────────────────────────
 * Between the meetings
 * ───────────────────────────────────────────────────────────────────────── */

/**
 * Corridor talk: how the live table is drifting against the bar.
 *
 * Small and capped on purpose. The board meets four times a year, and this is
 * what happens in between — it exists so the screen is worth opening in
 * November rather than being a page that changes once every May. Uncapped, a
 * single wild table swing in September would be a verdict.
 */
export function matchdayDrift(rank: number, expected: number): number {
  const c = boardContent;
  const places = expected - rank;
  return Math.max(-c.matchdayCap, Math.min(c.matchdayCap, places * c.perMatchdayPerRank));
}

/**
 * What the papers cost the boardroom's confidence.
 *
 * Takes STORY WEIGHTS, not the pressure meter, and the difference is the whole
 * design. A raid RESOLVES the Verband's meter — they took the boxes, the
 * suspicion is now a matter of record — so a board reading `press.pressure`
 * would receive the loudest week of a career as relief.
 *
 * The Verband's file is private. What a supervisory board sees is the
 * newspaper on the table, and the newspaper ran the pictures. So this reads
 * what was printed, in both directions: a `cleared` verdict at −14 hands back
 * exactly what the raid at +14 took, because the board believes the paper.
 *
 * It is also why the board never reads `league.result`. Press is where a
 * result becomes a story; a board reading both would punish one defeat twice,
 * which is unfair even when the arithmetic is defensible.
 */
export function doubtFrom(storyWeights: readonly number[]): number {
  const printed = storyWeights.reduce((sum, w) => sum + w, 0);
  // `-0` otherwise, which is what a quiet week produces and is not a number
  // anybody wants to find written into a save file.
  return printed === 0 ? 0 : -printed * doubtPerStoryWeight;
}

/* ─────────────────────────────────────────────────────────────────────────
 * The last stretch
 * ───────────────────────────────────────────────────────────────────────── */

export function shouldSetUltimatum(state: BoardState): boolean {
  return !state.sacked && state.ultimatum === null && state.trust < boardContent.ultimatumAt;
}

export function openUltimatum(
  season: number,
  matchday: number,
  bar: Bar
): Ultimatum {
  return {
    setSeason: season,
    setMatchday: matchday,
    deadline: matchday + boardContent.ultimatumMatchdays,
    targetRank: bar.rank,
    demand: bar.demand
  };
}

/** Matchdays left to meet it, or null when nobody is counting. */
export function matchdaysLeft(state: BoardState, matchday: number): number | null {
  if (!state.ultimatum || state.sacked) return null;
  return Math.max(0, state.ultimatum.deadline - matchday);
}

export type UltimatumOutcome = 'met' | 'missed' | 'running';

/**
 * How an ultimatum ended, checked on the deadline matchday.
 *
 * Met EARLY as well as on time — climbing to the target in the third matchday
 * of eight should end the thing, not start a five-week wait for a verdict that
 * is already decided. A board that keeps counting after it got what it asked
 * for is not a board, it is a timer.
 */
export function ultimatumOutcome(
  state: BoardState,
  matchday: number,
  rank: number
): UltimatumOutcome {
  if (!state.ultimatum) return 'running';
  if (rank > 0 && rank <= state.ultimatum.targetRank) return 'met';
  return matchday >= state.ultimatum.deadline ? 'missed' : 'running';
}

/** Whether the job is over. One visible number, one threshold, and nothing else. */
export function shouldSack(state: BoardState): boolean {
  return !state.sacked && state.trust <= SACK_AT;
}

/* ─────────────────────────────────────────────────────────────────────────
 * Reading it
 * ───────────────────────────────────────────────────────────────────────── */

export function bandOf(state: BoardState) {
  return bandFor(state.trust);
}

/** One line for the shell, or null when there is nothing to interrupt for. */
export function statusOf(state: BoardState, matchday: number): string | null {
  if (state.sacked) return 'Freigestellt';
  const left = matchdaysLeft(state, matchday);
  if (left === null) return null;
  return left === 0
    ? `Letzter Spieltag der Frist — ${state.ultimatum!.demand}`
    : `Frist des Aufsichtsrats: ${state.ultimatum!.demand}, noch ${left} Spieltage`;
}
