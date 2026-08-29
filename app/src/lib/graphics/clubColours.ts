import { clubById } from '$lib/features/onboarding/content';

/**
 * Colours for any club in the pyramid, designed or generated.
 *
 * `LeagueTeam` carries an id, a name and a strength — no colours, because a
 * generated club has no designer. But a league table where six rows of eighteen
 * have a crest and twelve have a blank square does not read as "these six are
 * special"; it reads as broken.
 *
 * So every club resolves to a pair. Designed clubs use their hand-picked one;
 * everyone else gets one from a curated set, chosen by their id.
 *
 * The set is CURATED rather than generated from the hash directly. Hashing into
 * HSL produces pairs that sometimes fail contrast, and "usually legible" is not
 * a property — a club whose crest is unreadable would appear for one player and
 * nobody else, in one seed, and never be found. Sixteen verified pairs make
 * contrast a fact of the data rather than a hope about the algorithm.
 *
 * This does NOT make generated clubs feel designed. A crest from a shared set
 * is livery, not character: what makes the hand-written clubs particular is the
 * flavour line and the chosen palette, and neither is conferred here. A
 * generated club stays the blank slate the editor exists to fill.
 */
const PAIRS: readonly (readonly [string, string])[] = [
  ['#1B3A6B', '#E9E3D2'], ['#7A1F2B', '#EDE2CB'], ['#1E5945', '#EFE7D0'], ['#4A2F6B', '#E8E1D4'],
  ['#8A4A16', '#F0E7D2'], ['#14484F', '#EAE3CE'], ['#5C2438', '#ECE4D3'], ['#2A5230', '#EDE6CF'],
  ['#3B3F7A', '#E9E4D6'], ['#6B3A14', '#EFE6CE'], ['#123F52', '#E8E2D0'], ['#4F1F2E', '#EEE5D2'],
  ['#25543C', '#ECE5CD'], ['#5A3A6E', '#EAE2D2'], ['#7A3320', '#F0E8D4'], ['#1F4668', '#E9E2CE']
];

/**
 * Every pair clears the same bar the designed clubs do, checked rather than
 * assumed: the two tones at 4.5:1 against each other, because the initials sit
 * on an inescutcheon; and the shield at 3:1 against both grounds, where a
 * two-tone shield counts as visible if EITHER tone separates.
 */
export const VERIFIED_PAIRS = PAIRS.length;

function hash(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/** The designed pair if this club has one, otherwise a stable pair from its id. */
export function coloursFor(clubId: string): readonly [string, string] {
  const designed = clubById(clubId);
  if (designed) return designed.colours;
  return PAIRS[hash(clubId) % PAIRS.length]!;
}

/** Whether this club was hand-written. The editor lists both but says which. */
export function isDesigned(clubId: string): boolean {
  return clubById(clubId) !== undefined;
}
