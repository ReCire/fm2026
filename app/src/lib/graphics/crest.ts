/**
 * Club crests, generated from a name and two colours. No binary assets.
 *
 * Ported from fm-03-design's implementation in the prototype. Three decisions
 * carried over deliberately:
 *
 * 1. The divisions are HERALDIC — pale, fess, bend, chevron, quarterly, pile.
 *    Not decoration: telling marks apart at small size and at distance is
 *    exactly the problem heraldry was invented to solve. Six divisions across
 *    colour pairs yields more distinct identities than the roster needs.
 *
 * 2. ONE shield outline for every club. They differ by division and colour,
 *    never by silhouette — ten competing outlines would make the set read as
 *    ten logos rather than one league.
 *
 * 3. The mark SHEDS detail rather than smearing it. Below 34px the initials are
 *    dropped and colour plus division carry the distinction alone. Two letters
 *    inside a 28px shield are a blur, and a blurred mark is worse than no mark.
 */
export const CREST_DIVISIONS = ['pale', 'fess', 'bend', 'chevron', 'quarter', 'pile'] as const;
export type CrestDivision = (typeof CREST_DIVISIONS)[number];

/** Below this, initials are dropped. Callers never have to remember it. */
export const INITIALS_THRESHOLD = 34;

/** The single shield. Every club shares it. */
export const SHIELD_PATH = 'M6 6 H94 V62 C94 88 74 104 50 112 C26 104 6 88 6 62 Z';

export const CREST_VIEWBOX = { width: 100, height: 116 } as const;

/** FNV-1a. Stable across sessions, so a club's crest never changes. */
export function crestHash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

export function divisionFor(name: string): CrestDivision {
  return CREST_DIVISIONS[crestHash(name) % CREST_DIVISIONS.length]!;
}

/** The second-colour shape laid over the first. */
export function divisionPath(division: CrestDivision): string {
  switch (division) {
    case 'pale':    return 'M50 0 H100 V116 H50 Z';
    case 'fess':    return 'M0 58 H100 V116 H0 Z';
    case 'bend':    return 'M0 116 L100 0 V116 Z';
    case 'chevron': return 'M0 116 L50 52 L100 116 Z';
    case 'quarter': return 'M50 0 H100 V58 H50 Z M0 58 H50 V116 H0 Z';
    case 'pile':    return 'M50 116 L14 0 H86 Z';
  }
}

/** Club-form words carry no identity, so they are skipped. */
const STOPWORDS =
  /^(FC|SV|SC|SG|TSV|VfB|VfL|SpVgg|1\.|Borussia|Fortuna|Dynamo|Eintracht|Viktoria)$/i;

export function crestInitials(name: string): string {
  const words = String(name).split(/\s+/).filter((w) => w && !STOPWORDS.test(w));
  if (words.length === 0) return String(name).slice(0, 2).toUpperCase();
  if (words.length === 1) return words[0]!.slice(0, 2).toUpperCase();
  return (words[0]![0]! + words[1]![0]!).toUpperCase();
}

export function showsInitials(size: number): boolean {
  return size >= INITIALS_THRESHOLD;
}

/** Height for a given width, preserving the shield's proportions. */
export function crestHeight(size: number): number {
  return Math.round((size * CREST_VIEWBOX.height) / CREST_VIEWBOX.width);
}
