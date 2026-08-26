/**
 * Seeded random number generation with genuinely independent streams.
 *
 * Every random decision goes through one of these. `Math.random()` is banned in
 * rules files because a season must be reproducible: same seed + same player
 * actions = the same outcome, byte for byte.
 *
 * WHY NOT mulberry32 (which this used to be): its state advances by a fixed
 * additive step, `a = (a + 0x6d2b79f5) >>> 0`. Two generators seeded `s` and
 * `s + k * 0x6d2b79f5` therefore emit the IDENTICAL sequence offset by k draws.
 * Deriving one seed per module by XOR-ing into a 32-bit space scattered every
 * module onto that single cycle, so "independent streams" were one stream at
 * different offsets — measured at 73 overlapping module/tick pairs within 35
 * seasons, and worsening with every module added. The visible symptom is the
 * exact thing this design exists to prevent: injuries and transfer offers
 * correlating on particular matchdays, reproducibly, for no findable reason.
 *
 * sfc32 carries 128 bits of state seeded through splitmix32, so two streams
 * share a cycle position only by astronomical accident, and there is no
 * additive relationship between seeds that could put them a fixed distance
 * apart.
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
  /**
   * A named sub-stream. Derived from this generator's ORIGINAL seed and the
   * label — never from its live position — so adding a draw upstream cannot
   * reseed anyone downstream.
   */
  fork(label: string): Rng;
  /** How many values this generator has produced. Diagnostics only. */
  drawn(): number;
}

/** splitmix32 — used only to expand a seed into well-mixed state words. */
function splitmix32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x9e3779b9) | 0;
    let t = a ^ (a >>> 16);
    t = Math.imul(t, 0x21f0aaad);
    t = t ^ (t >>> 15);
    t = Math.imul(t, 0x735a2d97);
    return (t ^ (t >>> 15)) >>> 0;
  };
}

export function createRng(seed: number): Rng {
  const seedWord = seed >>> 0;
  const mix = splitmix32(seedWord);
  let a = mix(), b = mix(), c = mix(), d = mix();
  let count = 0;

  // sfc32
  function step(): number {
    a |= 0; b |= 0; c |= 0; d |= 0;
    const t = (((a + b) | 0) + d) | 0;
    d = (d + 1) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    c = (c + t) | 0;
    count++;
    return (t >>> 0) / 4294967296;
  }

  // Discard the first few outputs so the very first draw is not a thin
  // function of the seed.
  for (let i = 0; i < 12; i++) step();
  count = 0;

  const rng: Rng = {
    next: step,
    int: (min, max) => Math.floor(step() * (max - min + 1)) + min,
    float: (min, max) => min + step() * (max - min),
    chance: (p) => step() < p,
    pick: (items) => {
      if (items.length === 0) throw new Error('rng.pick called with an empty array');
      return items[Math.floor(step() * items.length)]!;
    },
    fork: (label) => createRng(mixSeed(seedWord, label)),
    drawn: () => count
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

/**
 * Combine a seed with a stream label into a well-avalanched new seed.
 * XOR alone is not enough: it keeps low-bit structure, which is what let the
 * old scheme place module streams a short fixed distance apart.
 */
export function mixSeed(seed: number, label: string): number {
  let h = (seed ^ hashString(label)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return (h ^ (h >>> 16)) >>> 0;
}

/** A seed from a human-typeable string, so "test-season-3" is a reproducible game. */
export function seedFrom(text: string): number {
  return hashString(text);
}
