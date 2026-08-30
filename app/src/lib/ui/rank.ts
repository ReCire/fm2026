/**
 * Ranking for leaderboards, extracted so it can be tested.
 *
 * It lived inside `Leaderboard.svelte` and the tie rule is exactly the kind of
 * thing that is easy to get subtly wrong and impossible to notice: an
 * off-by-one in the skip only shows up when two entries happen to be level,
 * which in a fresh league is never and in a played season is constant.
 */

export interface Rankable {
  value: number;
}

/**
 * Sorts and numbers, with equal values sharing a rank and the next one
 * skipping: 1, 2, 2, 4.
 *
 * Numbering straight through would invent an order between two clubs that are
 * level, and a table is the one place a reader trusts the number absolutely.
 * It is also what printed football tables do, which is the stronger argument —
 * a football reader notices immediately.
 *
 * `lowBest` inverts it, for the boards where fewest wins: goals conceded,
 * cards, fouls.
 */
export function rankEntries<T extends Rankable>(entries: T[], lowBest = false): (T & { rank: number })[] {
  const sorted = [...entries].sort((a, b) => (lowBest ? a.value - b.value : b.value - a.value));

  let lastValue: number | null = null;
  let lastRank = 0;
  return sorted.map((entry, i) => {
    const rank = lastValue !== null && entry.value === lastValue ? lastRank : i + 1;
    lastValue = entry.value;
    lastRank = rank;
    return { ...entry, rank };
  });
}
