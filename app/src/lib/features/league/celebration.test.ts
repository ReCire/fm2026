import { describe, it, expect } from 'vitest';
import { celebrate, isMoment, OUTCOMES, type ReviewFacts, type Outcome } from './celebration';

const base: ReviewFacts = {
  level: 1,
  rank: 8,
  champion: false,
  promoted: false,
  relegated: false,
  europe: false,
  playoff: null
};
const facts = (over: Partial<ReviewFacts> = {}): ReviewFacts => ({ ...base, ...over });

describe('what a season was', () => {
  it('tells the five ways up and down apart', () => {
    const cases: [Partial<ReviewFacts>, Outcome][] = [
      [{ level: 0, rank: 1, champion: true, europe: true }, 'meisterschaft'],
      [{ rank: 1, champion: true, promoted: true }, 'meister'],
      [{ rank: 3, promoted: true, playoff: { won: true, direction: 'up' } }, 'aufstiegRelegation'],
      [{ rank: 2, promoted: true }, 'aufstieg'],
      [{ level: 0, rank: 4, europe: true }, 'europa'],
      [{ rank: 16, playoff: { won: true, direction: 'down' } }, 'klassenerhalt'],
      [{ rank: 17, relegated: true }, 'abstieg'],
      [{ rank: 11 }, 'saison']
    ];
    for (const [over, expected] of cases) {
      expect(celebrate(facts(over)).outcome, JSON.stringify(over)).toBe(expected);
    }
  });

  it('has a distinct word for every outcome it can produce', () => {
    // Two outcomes sharing a headline is two outcomes the player cannot tell
    // apart, which makes the distinction decorative.
    const seen = new Map<Outcome, string>();
    const all: Partial<ReviewFacts>[] = [
      { level: 0, rank: 1, champion: true },
      { rank: 1, champion: true, promoted: true },
      { rank: 3, promoted: true, playoff: { won: true, direction: 'up' } },
      { rank: 2, promoted: true },
      { level: 0, rank: 4, europe: true },
      { rank: 16, playoff: { won: true, direction: 'down' } },
      { rank: 17, relegated: true },
      { rank: 11 }
    ];
    for (const over of all) {
      const c = celebrate(facts(over));
      seen.set(c.outcome, c.headline);
    }
    expect(seen.size).toBe(OUTCOMES.length);
    expect(new Set(seen.values()).size, 'two outcomes share a headline').toBe(OUTCOMES.length);
  });
});

describe('volume and tone are separate on purpose', () => {
  it('gives relegation a promotion’s room and none of its joy', () => {
    /*
     * The single reason these are two fields. Collapsed into one "importance"
     * number, the screen either throws confetti at a relegation or buries it in
     * a line of grey text, and both are worse than a plain sentence.
     */
    const down = celebrate(facts({ rank: 17, relegated: true }));
    const up = celebrate(facts({ rank: 2, promoted: true }));
    expect(down.volume).toBe(up.volume);
    expect(down.tone).toBe('bitter');
    expect(up.tone).toBe('freude');
  });

  it('never congratulates a club for surviving', () => {
    // Relief is not joy. A side that has just spent two legs finding out
    // whether it still exists at this level does not want congratulating.
    const survived = celebrate(facts({ rank: 16, playoff: { won: true, direction: 'down' } }));
    expect(survived.tone).toBe('erleichterung');
    expect(survived.tone).not.toBe('freude');
  });

  it('keeps mid-table quiet', () => {
    /*
     * A celebration that fires at the same volume for eleventh place is a
     * celebration nobody believes the next time. This is the case that happens
     * most, so it is the one that protects all the others.
     */
    const nothing = celebrate(facts({ rank: 11 }));
    expect(nothing.volume).toBe(0);
    expect(isMoment(nothing)).toBe(false);
    expect(isMoment(celebrate(facts({ rank: 2, promoted: true })))).toBe(true);
  });

  it('has exactly one outcome at the top of the ladder', () => {
    // A first-division title is not a bigger third-division title; it is the
    // end of the ladder, and nothing else in the game is.
    const top = celebrate(facts({ level: 0, rank: 1, champion: true }));
    const lower = celebrate(facts({ level: 2, rank: 1, champion: true, promoted: true }));
    expect(top.outcome).not.toBe(lower.outcome);
    expect(top.headline).not.toBe(lower.headline);
  });
});

describe('the case that was missing from the list', () => {
  it('says something when a club reaches Europe without winning anything', () => {
    /*
     * Third in the first division: not champion, cannot be promoted, not
     * relegated. Every rule above it says "nothing happened, be brief", so the
     * first European qualification in a club's history would have arrived as a
     * grey line about finishing third.
     *
     * Same shape as a badge nobody can earn — the moment is in the data and no
     * surface says it.
     */
    const third = celebrate(facts({ level: 0, rank: 3, europe: true }));
    expect(third.outcome).toBe('europa');
    expect(isMoment(third)).toBe(true);
    expect(third.headline).toContain('EUROPA');
  });

  it('lets a title outrank a European place rather than announcing both', () => {
    // A champion is also in Europe. Announcing the smaller of two true things
    // is how a headline gets ignored.
    const champion = celebrate(facts({ level: 0, rank: 1, champion: true, europe: true }));
    expect(champion.outcome).toBe('meisterschaft');
  });
});

describe('every path says something', () => {
  it('never returns an empty headline or a bare number', () => {
    // A moment that renders as "" or as "Platz 4." is the celebration screen
    // failing at the one thing it is for.
    const combos: Partial<ReviewFacts>[] = [];
    for (const level of [0, 1, 2, 3]) {
      for (const rank of [1, 2, 3, 8, 16, 18]) {
        for (const promoted of [true, false]) {
          for (const relegated of [true, false]) {
            combos.push({ level, rank, promoted, relegated, champion: rank === 1 });
          }
        }
      }
    }
    for (const over of combos) {
      const c = celebrate(facts(over));
      expect(c.headline.length, JSON.stringify(over)).toBeGreaterThan(6);
      expect(c.line.length).toBeGreaterThan(20);
      expect(OUTCOMES).toContain(c.outcome);
    }
  });
});
