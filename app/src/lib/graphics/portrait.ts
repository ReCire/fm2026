/**
 * Generated manager portraits — geometry, not illustration.
 *
 * The same constraint as the crest: no binary assets, everything derived from
 * a seed. But a portrait has a second constraint a crest does not — it depicts
 * a person, and a cartoon face invites the player to read a specific someone
 * into it. So these are built from primitives in the Bauhaus manner: a head, a
 * collar, and one distinguishing feature. Recognisable apart, specific to
 * nobody.
 *
 * Deterministic from the id, so a manager's portrait never changes mid-career.
 */
export const HAIR = ['crop', 'parted', 'bald', 'swept', 'curls', 'cap'] as const;
export const FEATURE = ['none', 'glasses', 'beard', 'moustache', 'scarf'] as const;

export type Hair = (typeof HAIR)[number];
export type Feature = (typeof FEATURE)[number];

export function portraitHash(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

export interface PortraitTraits {
  hair: Hair;
  feature: Feature;
  /** Skin and hair are drawn from the same warm range, kept deliberately
   *  neutral: these are shapes, not an attempt at likeness. */
  skinStep: number;
  hairStep: number;
}

export function traitsFor(seed: string): PortraitTraits {
  const h = portraitHash(seed);
  return {
    hair: HAIR[h % HAIR.length]!,
    feature: FEATURE[Math.floor(h / 7) % FEATURE.length]!,
    skinStep: Math.floor(h / 31) % 5,
    hairStep: Math.floor(h / 131) % 4
  };
}

/** Five warm tones, evenly spaced. Not a claim about anyone; a palette. */
export const SKIN = ['#F0D5BE', '#E0B894', '#C89468', '#9C6B45', '#6E4A30'] as const;
export const HAIRCOL = ['#2B2320', '#4A3728', '#8A6A45', '#B9B2A8'] as const;
