import { describe, it, expect } from 'vitest';
import { rankEntries } from './rank';

const of = (...values: number[]) => values.map((value, i) => ({ id: `e${i}`, value }));

describe('rankEntries', () => {
  it('orders highest first by default', () => {
    expect(rankEntries(of(3, 9, 5)).map((e) => e.value)).toEqual([9, 5, 3]);
  });

  it('orders lowest first when fewest wins', () => {
    // Goals conceded, cards, fouls: the board where the leader has the least.
    expect(rankEntries(of(3, 9, 5), true).map((e) => e.value)).toEqual([3, 5, 9]);
  });

  it('shares a rank on a tie and skips the next', () => {
    // 1, 2, 2, 4 — never 1, 2, 3, 4. Numbering straight through would invent an
    // order between two clubs that are level, and a football reader notices.
    expect(rankEntries(of(9, 5, 5, 1)).map((e) => e.rank)).toEqual([1, 2, 2, 4]);
  });

  it('handles a tie at the top', () => {
    expect(rankEntries(of(7, 7, 3)).map((e) => e.rank)).toEqual([1, 1, 3]);
  });

  it('handles everything level', () => {
    expect(rankEntries(of(4, 4, 4, 4)).map((e) => e.rank)).toEqual([1, 1, 1, 1]);
  });

  it('handles a tie at the bottom, and one entry, and none', () => {
    expect(rankEntries(of(9, 2, 2)).map((e) => e.rank)).toEqual([1, 2, 2]);
    expect(rankEntries(of(5)).map((e) => e.rank)).toEqual([1]);
    expect(rankEntries([])).toEqual([]);
  });

  it('never reorders the array it was handed', () => {
    // A board must not sort the squad, only the view of it — the same rule
    // DataTable follows for exactly the same reason.
    const source = of(3, 9, 5);
    const copy = [...source];
    rankEntries(source);
    expect(source).toEqual(copy);
  });

  it('keeps ties in the order they arrived', () => {
    // Stable, so two clubs level on points do not swap places between renders
    // for no reason a reader could see.
    const rows = [
      { id: 'a', value: 5 },
      { id: 'b', value: 5 },
      { id: 'c', value: 9 }
    ];
    expect(rankEntries(rows).map((e) => e.id)).toEqual(['c', 'a', 'b']);
  });
});
