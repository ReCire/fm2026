import type { Rng } from '$lib/engine/rng';

/**
 * Turn a finished result into ninety minutes of things happening.
 *
 * The score is decided by the simulation, not by the narration. That ordering
 * matters: it keeps "a better eleven wins more" true — the property the whole
 * balance effort establishes — while giving the player something to watch. A
 * live engine that re-decided the outcome would put the match model and the
 * balance model in disagreement, and the one on screen would win.
 *
 * So this is a NARRATOR. It places the goals that were already scored, and
 * fills the gaps with the near-misses that make a 0:0 feel like a match rather
 * than a number.
 */
export type BeatKind =
  | 'kickoff' | 'goal' | 'chance' | 'save' | 'foul' | 'card'
  | 'injury' | 'halftime' | 'fulltime';

export interface Beat {
  minute: number;
  kind: BeatKind;
  /** True when it is our club doing it. */
  ours: boolean;
  text: string;
  /** Running score after this beat. */
  score: [number, number];
}

export interface NarrationInput {
  ourGoals: number;
  theirGoals: number;
  ourName: string;
  theirName: string;
  /** Ours minus theirs. Drives how much of the play runs our way. */
  edge: number;
}

const FULL_TIME = 90;

/** Minutes at which goals land, spread across the match rather than clustered. */
function goalMinutes(rng: Rng, count: number): number[] {
  const minutes = new Set<number>();
  let guard = 0;
  while (minutes.size < count && guard++ < 200) {
    // Slightly back-loaded, the way real scoring is.
    const m = Math.min(FULL_TIME, Math.max(2, Math.round(rng.float(3, 93))));
    if (![...minutes].some((existing) => Math.abs(existing - m) < 3)) minutes.add(m);
  }
  return [...minutes].sort((a, b) => a - b);
}

const CHANCE_TEXT = [
  'Kopfball knapp über die Latte.',
  'Aus zwanzig Metern — der Torhüter ist da.',
  'Der Querpass kommt einen Schritt zu spät.',
  'Abgefälscht zur Ecke.',
  'Der Nachschuss wird geblockt.',
  'Allein vor dem Tor, und drüber.'
];

const FOUL_TEXT = [
  'Rustikal von hinten. Der Schiedsrichter lässt die Karte stecken.',
  'Taktisches Foul im Mittelfeld.',
  'Ein Einsteigen, das der Zuschauerraum lauter kommentiert als der Schiedsrichter.'
];

/**
 * The whole match as an ordered list of beats.
 *
 * Deterministic from the rng, so the same match replays identically — a live
 * view that told a different story on reload would make the watching feel
 * arbitrary, and arbitrary is the thing being fixed.
 */
export function narrate(rng: Rng, input: NarrationInput): Beat[] {
  const { ourGoals, theirGoals, ourName, theirName, edge } = input;

  const ourMinutes = goalMinutes(rng, ourGoals);
  const theirMinutes = goalMinutes(rng, theirGoals);

  const scored: { minute: number; ours: boolean }[] = [
    ...ourMinutes.map((minute) => ({ minute, ours: true })),
    ...theirMinutes.map((minute) => ({ minute, ours: false }))
  ].sort((a, b) => a.minute - b.minute);

  // More chances when the game is open; a share of them ours in proportion to
  // the edge, so a stronger side visibly presses rather than merely winning.
  const chanceCount = rng.int(4, 8);
  const ourShare = Math.max(0.2, Math.min(0.8, 0.5 + edge / 60));

  const filler: { minute: number; ours: boolean; kind: BeatKind }[] = [];
  for (let i = 0; i < chanceCount; i++) {
    filler.push({
      minute: rng.int(2, FULL_TIME - 1),
      ours: rng.chance(ourShare),
      kind: rng.chance(0.7) ? 'chance' : 'foul'
    });
  }

  const beats: Beat[] = [];
  let us = 0;
  let them = 0;

  beats.push({
    minute: 0, kind: 'kickoff', ours: true,
    text: `Anpfiff. ${ourName} gegen ${theirName}.`,
    score: [0, 0]
  });

  const timeline = [
    ...scored.map((g) => ({ ...g, kind: 'goal' as BeatKind })),
    ...filler
  ].sort((a, b) => a.minute - b.minute);

  let halftimeDone = false;
  for (const event of timeline) {
    if (!halftimeDone && event.minute > 45) {
      beats.push({
        minute: 45, kind: 'halftime', ours: true,
        text: 'Halbzeit.', score: [us, them]
      });
      halftimeDone = true;
    }

    if (event.kind === 'goal') {
      if (event.ours) us++; else them++;
      beats.push({
        minute: event.minute, kind: 'goal', ours: event.ours,
        text: event.ours ? `TOR für ${ourName}!` : `Tor für ${theirName}.`,
        score: [us, them]
      });
    } else if (event.kind === 'chance') {
      beats.push({
        minute: event.minute, kind: 'chance', ours: event.ours,
        text: rng.pick(CHANCE_TEXT), score: [us, them]
      });
    } else {
      beats.push({
        minute: event.minute, kind: 'foul', ours: event.ours,
        text: rng.pick(FOUL_TEXT), score: [us, them]
      });
    }
  }

  if (!halftimeDone) {
    beats.push({ minute: 45, kind: 'halftime', ours: true, text: 'Halbzeit.', score: [us, them] });
  }

  beats.push({
    minute: FULL_TIME, kind: 'fulltime', ours: true,
    text: `Abpfiff. ${us}:${them}.`,
    score: [us, them]
  });

  return beats.sort((a, b) => a.minute - b.minute);
}

/** Where in the timeline a given minute sits, for a scrubbing or resuming view. */
export function beatsUpTo(beats: readonly Beat[], minute: number): Beat[] {
  return beats.filter((b) => b.minute <= minute);
}

export function scoreAt(beats: readonly Beat[], minute: number): [number, number] {
  const seen = beatsUpTo(beats, minute);
  return seen.length > 0 ? seen[seen.length - 1]!.score : [0, 0];
}
