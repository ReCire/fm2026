/**
 * Seeded, serialisable random number generator.
 *
 * Every random decision in the game goes through one of these. `Math.random()`
 * is banned inside `rules.ts` files (see scripts/check-docs.mjs) because a
 * season must be reproducible: same seed + same player actions = same outcome,
 * byte for byte. That is what makes a bug report a save file, and what lets us
 * sim 200 seasons in CI and assert the promotion rate is still sane.
 */
export interface Rng {
  /** Float in [0, 1). */
  next(): number;
  /** Integer in [min, max], inclusive on both ends. */
  int(min: number, max: number): number;
  /** Float in [min, max). */
  float(min: number, max: number): number;
  /** True with probability `p` (0..1). */
  chance(p: number): boolean;
  /** A uniformly chosen element. Throws on an empty array. */
  pick<T>(items: readonly T[]): T;
  /** A new independent stream, so adding a caller cannot shift other streams. */
  fork(label: string): Rng;
  /** Current internal position, for saving mid-season. */
  cursor(): number;
}

/** mulberry32 — small, fast, good enough for a management sim. */
export function createRng(seed: number, cursor = 0): Rng {
  let a = seed >>> 0;
  let steps = 0;

  // Fast-forward to a saved position.
  for (let i = 0; i < cursor; i++) step();

  function step(): number {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    steps++;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  const rng: Rng = {
    next: step,
    int: (min, max) => Math.floor(step() * (max - min + 1)) + min,
    float: (min, max) => min + step() * (max - min),
    chance: (p) => step() < p,
    pick: (items) => {
      if (items.length === 0) throw new Error('rng.pick called with an empty array');
      return items[Math.floor(step() * items.length)]!;
    },
    fork: (label) => createRng(hashString(label) ^ a),
    cursor: () => cursor + steps
  };
  return rng;
}

export function hashString(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** A seed from a human-typeable string, so "test-season-3" is a reproducible game. */
export function seedFrom(text: string): number {
  return hashString(text);
}
