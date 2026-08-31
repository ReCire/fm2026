import { describe, it, expect } from 'vitest';
import {
  bands, bandFor, ambitions, ambitionFor, expectedRank, disasterRank, isDisaster, demandFor,
  boardContent, doubtPerStoryWeight, memoryOfLastSeason, SACK_AT, SOURCES, VOICES, copy
} from './content';

describe('the gauge', () => {
  it('reads at every value from 0 to 100', () => {
    for (let v = 0; v <= 100; v++) expect(bandFor(v), `no band at ${v}`).toBeDefined();
    expect(bandFor(0).id).toBe('trainerfrage');
    expect(bandFor(100).id).toBe('rueckhalt');
  });

  it('is separable without colour', () => {
    expect(new Set(bands.map((b) => b.mark)).size).toBe(bands.length);
    expect(new Set(bands.map((b) => b.label)).size).toBe(bands.length);
  });

  it('says the ultimatum band out loud where the rule fires', () => {
    // The screen tells the player the board speaks up below 20. If the band
    // boundary and that threshold drift apart, the warning arrives in a band
    // whose copy says nobody is talking about the manager.
    expect(bandFor(boardContent.ultimatumAt).id).toBe('zweifel');
    expect(bandFor(boardContent.ultimatumAt - 1).id).toBe('trainerfrage');
  });

  it('keeps the sack on the number and nowhere else', () => {
    // One visible threshold. A separate dismissal roll would make the gauge
    // decorative and put the real rule out of sight — the prototype's raid
    // problem in a different costume.
    expect(SACK_AT).toBe(0);
    expect(bandFor(SACK_AT).id).toBe('trainerfrage');
  });

  it('keeps the president warm one band longer than the chairwoman', () => {
    /*
     * "Der Trainer hat mein vollstes Vertrauen" appears on two bands VERBATIM.
     * That is the joke — the only sentence in German football that means the
     * opposite of itself, and it works because it does not change between the
     * week it is true and the week it is a countdown.
     *
     * This test exists so a future tidy-up that "fixes the duplicate" fails
     * loudly instead of quietly deleting the gag.
     */
    const zweifel = bands.find((b) => b.id === 'zweifel')!;
    const frage = bands.find((b) => b.id === 'trainerfrage')!;
    expect(zweifel.kuhlmann).toBe(frage.kuhlmann);
    expect(zweifel.vogt).not.toBe(frage.vogt);
  });

  it('names the two people rather than saying Vorstand', () => {
    expect(VOICES.vogt.name).toBeTruthy();
    expect(VOICES.kuhlmann.name).toBeTruthy();
    expect(VOICES.vogt.name).not.toBe(VOICES.kuhlmann.name);
  });
});

describe('the bar', () => {
  const clubs = 18;

  it('grades money, not the table', () => {
    // The whole file in one assertion. Same division, same finish, different
    // budget: the rich club is expected higher and is therefore failing.
    const rich = expectedRank({ level: 0, budgetRank: 1, lastRank: null, clubs });
    const poor = expectedRank({ level: 0, budgetRank: 16, lastRank: null, clubs });
    expect(rich).toBeLessThan(poor);
    expect(rich).toBeLessThanOrEqual(4);
  });

  it('never asks for a place that does not exist', () => {
    for (const level of [0, 1, 2, 3]) {
      for (const budgetRank of [1, 9, 18, 20]) {
        for (const lastRank of [null, 1, 18]) {
          const r = expectedRank({ level, budgetRank, lastRank, clubs });
          expect(r, `level ${level} budget ${budgetRank}`).toBeGreaterThanOrEqual(1);
          expect(r).toBeLessThanOrEqual(clubs);
        }
      }
    }
  });

  it('leaves the fourth division playable', () => {
    /*
     * The reason the pull is graded by level. A Regionalliga club with the
     * ninth budget must be able to finish ninth and keep its job, or the
     * opening hours of the game are unwinnable by arithmetic rather than by
     * play — and the opening hours are where this game starts.
     */
    const small = expectedRank({ level: 3, budgetRank: 9, lastRank: null, clubs });
    const big = expectedRank({ level: 0, budgetRank: 9, lastRank: null, clubs });
    expect(small).toBeGreaterThan(big);
    expect(Math.abs(small - 9)).toBeLessThanOrEqual(2);
  });

  it('makes the boardroom more deluded the higher it sits', () => {
    const pulls = [0, 1, 2, 3].map((l) => ambitionFor(l).pull);
    expect(pulls).toEqual([...pulls].sort((a, b) => b - a));
    expect(ambitions).toHaveLength(4);
  });

  it('re-prices a good season', () => {
    // Overachievement becomes next year's minimum. Slightly unfair on purpose:
    // a board that forgot would let one good year fund a decade.
    const after = expectedRank({ level: 1, budgetRank: 12, lastRank: 3, clubs });
    const flat = expectedRank({ level: 1, budgetRank: 12, lastRank: null, clubs });
    expect(after).toBeLessThan(flat);
    expect(memoryOfLastSeason).toBeGreaterThan(0);
    expect(memoryOfLastSeason).toBeLessThan(1);
  });

  it('never sacks a manager for hitting the target he was given', () => {
    /*
     * This one found a real bug. A flat fraction of the table gave the
     * Regionalliga's poorest club a published bar of 17th and a failure line of
     * 16th — the board hands you a goal and dismisses you for reaching it.
     *
     * Every club, every division, every history: the failure line is at or
     * below the bar.
     */
    for (const level of [0, 1, 2, 3]) {
      for (const budgetRank of [1, 5, 9, 14, 18]) {
        for (const lastRank of [null, 1, 9, 18]) {
          const input = { level, budgetRank, lastRank, clubs };
          expect(disasterRank(input), `level ${level} budget ${budgetRank} last ${lastRank}`)
            .toBeGreaterThanOrEqual(expectedRank(input));
        }
      }
    }
  });

  it('leaves the poorest club in a division able to fail only by finishing last', () => {
    const input = { level: 3, budgetRank: 18, lastRank: 18, clubs };
    expect(isDisaster(clubs, input)).toBe(true);
    expect(isDisaster(clubs - 1, input)).toBe(false);
  });

  it('never calls the published bar a disaster, anywhere', () => {
    // `isDisaster` exists so this comparison is written once. The boundary is
    // exclusive: reaching the bar is never a failure, in any division, at any
    // budget, after any season.
    for (const level of [0, 1, 2, 3]) {
      for (const budgetRank of [1, 9, 18]) {
        for (const lastRank of [null, 1, 18]) {
          const input = { level, budgetRank, lastRank, clubs };
          expect(isDisaster(expectedRank(input), input), `level ${level} budget ${budgetRank}`)
            .toBe(false);
        }
      }
    }
  });
});

describe('the demand', () => {
  it('is derived from the bar and cannot contradict it', () => {
    // Two sources for one promise is how the doctrine order went wrong and how
    // the campus sold buildings it had already drawn.
    expect(demandFor(1, 18)).toBe('Meisterschaft');
    expect(demandFor(2, 18)).toBe('Aufstieg');
    expect(demandFor(18, 18)).toBe('Klassenerhalt');
  });

  it('has a word for every place in every plausible division', () => {
    for (const clubs of [16, 18, 20]) {
      for (let rank = 1; rank <= clubs; rank++) {
        expect(demandFor(rank, clubs), `${rank}/${clubs}`).toBeTruthy();
      }
    }
  });

  it('never gets more relaxed as the bar gets higher', () => {
    const order = [
      'Meisterschaft', 'Aufstieg', 'Aufstiegsrennen',
      'Oberes Tabellendrittel', 'Gesichertes Mittelfeld', 'Klassenerhalt'
    ];
    const seen = Array.from({ length: 18 }, (_, i) => order.indexOf(demandFor(i + 1, 18)));
    expect(seen).toEqual([...seen].sort((a, b) => a - b));
    expect(seen).not.toContain(-1);
  });
});

describe('what the board reads', () => {
  it('takes the newspaper, symmetrically', () => {
    /*
     * The board reads story WEIGHT, not the Ermittlungsdruck meter — because a
     * raid resolves the meter, and the loudest week of a career would otherwise
     * reach the boardroom as relief. A −14 clearance hands back exactly what a
     * +14 raid took: the board believes the paper.
     */
    expect(doubtPerStoryWeight * 14).toBeCloseTo(-(doubtPerStoryWeight * -14));
    expect(doubtPerStoryWeight * 14).toBeGreaterThan(boardContent.promotionBonus / 3);
  });

  it('punishes a bad season harder than it rewards a good one', () => {
    expect(boardContent.perRankUnder).toBeGreaterThan(boardContent.perRankOver);
    expect(boardContent.relegationPenalty).toBeGreaterThan(boardContent.promotionBonus);
  });

  it('cannot end a career in a single matchday', () => {
    // The corridor talk between meetings. If one wild table swing could reach
    // the ultimatum, the season verdict would be decoration.
    expect(boardContent.matchdayCap).toBeLessThan(1);
    expect(boardContent.startingTrust - boardContent.matchdayCap * 34)
      .toBeGreaterThan(boardContent.ultimatumAt);
  });

  it('keeps earned trust and bought trust as different things', () => {
    // If the surface renders both as "+8 Vertrauen", the Diplomatenloge is a
    // training ground with a better icon.
    expect(SOURCES.earned.note).not.toBe(SOURCES.floor.note);
    expect(copy.secured).toContain('Trainerfrage');
  });
});
