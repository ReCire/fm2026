import { describe, it, expect } from 'vitest';
import {
  barFor, clampTrust, doubtFrom, judgeSeason, lastRankFor, matchdayDrift,
  matchdaysLeft, openUltimatum, seasonDelta, shouldSack, shouldSetUltimatum,
  statusOf, ultimatumOutcome
} from './rules';
import { createBoard } from './state';
import { boardContent, bandFor, doubtPerStoryWeight, SACK_AT } from './content';

const fresh = () => createBoard();
const season = (over: Partial<Parameters<typeof seasonDelta>[0]> = {}) => ({
  season: 1, expected: 10, actual: 10, demand: 'Gesichertes Mittelfeld',
  promoted: false, relegated: false, disaster: false, ...over
});

describe('measuring against the bar', () => {
  it('is the whole design: the same finish is a triumph or a sacking', () => {
    /*
     * Why this system never reads an absolute position. Eighth with the eighth
     * budget is a pass; eighth with the largest is the beginning of the end.
     * Against an absolute, a promoted side is unemployable by construction and
     * a favourite cannot fail — both backwards, and both would make the fourth
     * division, where this game starts, unplayable by arithmetic.
     */
    expect(seasonDelta(season({ expected: 16, actual: 8 }))).toBeGreaterThan(0);
    expect(seasonDelta(season({ expected: 2, actual: 8 }))).toBeLessThan(0);
  });

  it('is neutral for a club that finished exactly where its money said', () => {
    expect(seasonDelta(season({ expected: 7, actual: 7 }))).toBe(0);
  });

  it('punishes a place missed harder than it rewards a place beaten', () => {
    const beaten = seasonDelta(season({ expected: 10, actual: 7 }));
    const missed = seasonDelta(season({ expected: 10, actual: 13 }));
    expect(Math.abs(missed)).toBeGreaterThan(Math.abs(beaten));
  });

  it('caps the season, so one year cannot end the story twice', () => {
    /*
     * An eighteen-place collapse and a nine-place collapse are both a sacking.
     * Letting the first bank enough damage to outlive a recovery makes the
     * recovery pointless — and a recovery nobody can complete is not a lose
     * condition, it is an ending with extra steps.
     */
    const bad = seasonDelta(season({ expected: 1, actual: 20 }));
    expect(bad).toBe(-boardContent.seasonCap);
    const good = seasonDelta(season({ expected: 20, actual: 1 }));
    expect(good).toBe(boardContent.seasonCap);
  });

  it('adds promotion and relegation on top of the cap, not inside it', () => {
    const flat = seasonDelta(season({ expected: 3, actual: 1 }));
    expect(seasonDelta(season({ expected: 3, actual: 1, promoted: true })) - flat)
      .toBe(boardContent.promotionBonus);
    expect(seasonDelta(season({ expected: 10, actual: 18, relegated: true })))
      .toBeLessThan(seasonDelta(season({ expected: 10, actual: 18 })));
  });
});

describe('the line below which nothing counts', () => {
  it('cannot be a good season, however modest the bar was', () => {
    /*
     * The bar protects a poorly funded club from being sacked for finishing
     * where its money says. It must not protect it from the bottom tenth: a
     * board that asked for Klassenerhalt and got seventeenth of eighteen does
     * not send a letter of thanks.
     */
    const beatTheBar = seasonDelta(season({ expected: 18, actual: 17 }));
    expect(beatTheBar).toBeGreaterThan(0);
    expect(seasonDelta(season({ expected: 18, actual: 17, disaster: true }))).toBe(0);
  });

  it('does not stack on top of the relegation penalty', () => {
    /*
     * Floored at zero rather than inverted. Relegation already carries its own
     * punishment, and counting the same finish twice is the double jeopardy
     * this whole design exists to avoid.
     */
    const relegated = season({ expected: 10, actual: 18, relegated: true });
    expect(seasonDelta({ ...relegated, disaster: true })).toBe(seasonDelta(relegated));
  });
});

describe('what the board remembers', () => {
  it('carries last season forward, so success raises the bar', () => {
    const b = fresh();
    judgeSeason(b, season({ season: 1, expected: 12, actual: 4 }));
    expect(lastRankFor(b)).toBe(4);

    const before = barFor(fresh(), { level: 3, budgetRank: 12, clubs: 18 });
    const after = barFor(b, { level: 3, budgetRank: 12, clubs: 18 });
    expect(after.rank).toBeLessThanOrEqual(before.rank);
  });

  it('forgets it across a division, because last May happened somewhere else', () => {
    /*
     * Otherwise a board demands a repeat of eleventh in a league the club has
     * never played in, which is the exact way an Aufsteiger becomes
     * unemployable.
     */
    const b = fresh();
    judgeSeason(b, season({ season: 1, expected: 3, actual: 1, promoted: true }));
    expect(lastRankFor(b)).toBeNull();
  });

  it('states the bar in words as well as a number, and never hides either', () => {
    const bar = barFor(fresh(), { level: 3, budgetRank: 16, clubs: 18 });
    expect(bar.rank).toBeGreaterThan(0);
    expect(bar.demand.length).toBeGreaterThan(3);
  });
});

describe('the floor a doctrine buys', () => {
  it('holds trust up, and two floors do not stack into a third', () => {
    /*
     * `boardFloor` is `max` arity in EFFECTS, not `total`: floors of 30 and 40
     * promise 40, not 70. A node whose German reads "fällt nie unter 40 %" has
     * to be literally true — the tree is the one place a player reads the
     * numbers carefully.
     */
    expect(clampTrust(5, 40)).toBe(40);
    expect(clampTrust(-20, 40)).toBe(40);
    expect(clampTrust(80, 40)).toBe(80);
    expect(clampTrust(50, 140)).toBeLessThanOrEqual(100);
  });

  it('makes the sack impossible, which is what the node is for', () => {
    const b = fresh();
    b.trust = clampTrust(-50, 30);
    expect(shouldSack(b)).toBe(false);
  });

  it('applies to a season verdict too, not only to the matchday drift', () => {
    const b = fresh();
    b.trust = 20;
    judgeSeason(b, season({ expected: 2, actual: 18, relegated: true }), 30);
    expect(b.trust).toBe(30);
  });
});

describe('the transmission from press', () => {
  it('reads what was printed, not the Verband\'s private meter', () => {
    /*
     * The correction that mattered. A raid RESOLVES the pressure meter, so a
     * board reading `press.pressure` would receive the loudest week of a
     * career as relief. It reads the newspaper, and the newspaper ran the
     * pictures.
     */
    expect(doubtFrom([14])).toBe(-14 * doubtPerStoryWeight);
  });

  it('gives back exactly what it took, when the club is cleared', () => {
    expect(doubtFrom([14]) + doubtFrom([-14])).toBe(0);
  });

  it('ignores the football, because the football is already in the table', () => {
    // Every defeat headline weighs zero — see press/content.ts.
    expect(doubtFrom([0, 0, 0])).toBe(0);
  });

  it('costs nothing on a matchday nobody wrote about', () => {
    expect(doubtFrom([])).toBe(0);
  });
});

describe('corridor talk', () => {
  it('drifts toward the bar in both directions', () => {
    expect(matchdayDrift(4, 10)).toBeGreaterThan(0);
    expect(matchdayDrift(16, 10)).toBeLessThan(0);
    expect(matchdayDrift(10, 10)).toBe(0);
  });

  it('is capped, so one wild table swing in September is not a verdict', () => {
    expect(Math.abs(matchdayDrift(1, 20))).toBeLessThanOrEqual(boardContent.matchdayCap);
  });

  it('cannot move trust more in a season than a season verdict does', () => {
    /*
     * The proportion is the point. If the drip outweighs the meeting, the board
     * is grading results after all and the whole transmission is decoration.
     */
    const overASeason = boardContent.matchdayCap * 34;
    expect(overASeason).toBeLessThan(boardContent.seasonCap * 3);
  });
});

describe('the ultimatum', () => {
  it('is not set while the board is merely unhappy', () => {
    const b = fresh();
    b.trust = boardContent.ultimatumAt + 1;
    expect(shouldSetUltimatum(b)).toBe(false);
    expect(statusOf(b, 12)).toBeNull();
  });

  it('states a target and a deadline, both in words and in numbers', () => {
    const b = fresh();
    b.trust = 5;
    expect(shouldSetUltimatum(b)).toBe(true);
    b.ultimatum = openUltimatum(2, 12, { rank: 9, demand: 'Klassenerhalt', input: { level: 3, budgetRank: 9, lastRank: null, clubs: 18 } });
    expect(b.ultimatum.deadline).toBe(12 + boardContent.ultimatumMatchdays);
    expect(statusOf(b, 12)).toContain('Klassenerhalt');
    expect(matchdaysLeft(b, 12)).toBe(boardContent.ultimatumMatchdays);
  });

  it('ends the moment it is met, rather than running the clock down', () => {
    /*
     * A board that keeps counting after it got what it asked for is not a
     * board, it is a timer.
     */
    const b = fresh();
    b.ultimatum = openUltimatum(2, 12, { rank: 9, demand: 'Klassenerhalt', input: { level: 3, budgetRank: 9, lastRank: null, clubs: 18 } });
    expect(ultimatumOutcome(b, 13, 7)).toBe('met');
    expect(ultimatumOutcome(b, 13, 12)).toBe('running');
  });

  it('is missed only at the deadline, never before it', () => {
    const b = fresh();
    b.ultimatum = openUltimatum(2, 12, { rank: 9, demand: 'Klassenerhalt', input: { level: 3, budgetRank: 9, lastRank: null, clubs: 18 } });
    const deadline = b.ultimatum.deadline;
    expect(ultimatumOutcome(b, deadline - 1, 15)).toBe('running');
    expect(ultimatumOutcome(b, deadline, 15)).toBe('missed');
  });

  it('is not judged on a matchday with no table to read', () => {
    const b = fresh();
    b.ultimatum = openUltimatum(2, 12, { rank: 9, demand: 'Klassenerhalt', input: { level: 3, budgetRank: 9, lastRank: null, clubs: 18 } });
    expect(ultimatumOutcome(b, 13, 0)).toBe('running');
  });
});

describe('the sack', () => {
  it('is one visible number and one threshold, and nothing else', () => {
    /*
     * A separate probability roll would make the meter decorative — the player
     * would learn the real rule is invisible, which is the prototype's raid
     * problem in a different costume.
     */
    const b = fresh();
    b.trust = SACK_AT + 1;
    expect(shouldSack(b)).toBe(false);
    b.trust = SACK_AT;
    expect(shouldSack(b)).toBe(true);
  });

  it('stays done, even when a doctrine node arrives with a floor', () => {
    /*
     * Why `sacked` is stored rather than derived from `trust === 0`. A manager
     * sacked at zero who then bought a floor of 30 would be un-sacked by a
     * purchase, which is the sort of thing that is only funny once.
     */
    const b = fresh();
    b.sacked = true;
    b.trust = clampTrust(0, 30);
    expect(shouldSack(b)).toBe(false);
    expect(shouldSetUltimatum(b)).toBe(false);
    expect(statusOf(b, 99)).toBe('Freigestellt');
    expect(matchdaysLeft(b, 99)).toBeNull();
  });
});

describe('the record', () => {
  it('keeps one entry per season, with the reasoning attached', () => {
    const b = fresh();
    judgeSeason(b, season({ season: 1, expected: 12, actual: 4 }));
    judgeSeason(b, season({ season: 2, expected: 4, actual: 11 }));
    expect(b.verdicts).toHaveLength(2);
    expect(b.verdicts[0]!.delta).toBeGreaterThan(0);
    expect(b.verdicts[1]!.delta).toBeLessThan(0);
    expect(b.verdicts[1]!.trustAfter).toBe(b.trust);
  });

  it('stores the demand in words, so an old verdict still reads right', () => {
    /*
     * `demandFor` needs the division's size, and a career that has been
     * promoted twice no longer knows what "Aufstiegsrennen" meant three
     * divisions ago. Storing the words is cheaper than storing the context to
     * recompute them.
     */
    const b = fresh();
    judgeSeason(b, season({ demand: 'Aufstieg' }));
    expect(b.verdicts[0]!.demand).toBe('Aufstieg');
  });
});

describe('the bands', () => {
  it('cover the whole scale with no gap to fall into', () => {
    for (let t = 0; t <= 100; t++) expect(bandFor(t)).toBeDefined();
    expect(bandFor(0).id).toBe('trainerfrage');
    expect(bandFor(100).id).toBe('rueckhalt');
  });
});
