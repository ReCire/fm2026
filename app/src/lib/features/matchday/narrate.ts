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
export const BEAT_KINDS = [
  'kickoff', 'goal', 'chance', 'save', 'foul', 'card',
  'injury', 'halftime', 'fulltime'
] as const;
export type BeatKind = (typeof BEAT_KINDS)[number];

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

/** Minutes at which goals land, spread across the window rather than clustered. */
function goalMinutes(rng: Rng, count: number, from = 0, to = FULL_TIME): number[] {
  const minutes = new Set<number>();
  const lo = Math.max(from + 1, 2);
  const span = Math.max(1, to - lo);
  // A short window cannot hold three-minute gaps between four goals; relax the
  // spacing rather than spin the guard out and silently drop goals the score
  // has already promised.
  const spacing = Math.max(1, Math.min(3, Math.floor(span / Math.max(1, count))));
  let guard = 0;
  while (minutes.size < count && guard++ < 400) {
    // Slightly back-loaded, the way real scoring is.
    const m = Math.min(to, Math.max(lo, Math.round(rng.float(lo, to + 3))));
    if (![...minutes].some((existing) => Math.abs(existing - m) < spacing)) minutes.add(m);
  }
  // The guard can still run out in a very short window. Fill deterministically
  // rather than return fewer goals than the score says were scored.
  for (let m = lo; minutes.size < count && m <= to; m++) minutes.add(m);
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
  return buildWindow(rng, {
    from: 0,
    startUs: 0,
    startThem: 0,
    addUs: input.ourGoals,
    addThem: input.theirGoals,
    ourName: input.ourName,
    theirName: input.theirName,
    edge: input.edge,
    kickoff: true
  });
}

interface WindowInput {
  /** Beats are placed after this minute. */
  from: number;
  startUs: number;
  startThem: number;
  addUs: number;
  addThem: number;
  ourName: string;
  theirName: string;
  edge: number;
  kickoff: boolean;
}

/**
 * The beats of one stretch of a match.
 *
 * Extracted so that the second half can be told again after the manager
 * changes something at the interval, without the first half being re-rolled
 * underneath the player who just watched it.
 */
function buildWindow(rng: Rng, w: WindowInput): Beat[] {
  const ourMinutes = goalMinutes(rng, w.addUs, w.from, FULL_TIME);
  const theirMinutes = goalMinutes(rng, w.addThem, w.from, FULL_TIME);

  const scored: { minute: number; ours: boolean }[] = [
    ...ourMinutes.map((minute) => ({ minute, ours: true })),
    ...theirMinutes.map((minute) => ({ minute, ours: false }))
  ].sort((a, b) => a.minute - b.minute);

  // More chances when the game is open; a share of them ours in proportion to
  // the edge, so a stronger side visibly presses rather than merely winning.
  // Scaled to the window, so a second half does not get a whole match's worth.
  const share = (FULL_TIME - w.from) / FULL_TIME;
  const chanceCount = Math.max(1, Math.round(rng.int(4, 8) * share));
  const ourShare = Math.max(0.2, Math.min(0.8, 0.5 + w.edge / 60));

  /*
   * At most one CHANCE or FOUL per minute. Two of them in the same minute
   * reads as a glitch rather than as a busy match, and when two also drew the
   * same text the feed's keys collided and Svelte tore the whole list down
   * mid-match. Goals win the minute; the whistles are free to share one, because
   * a 90th-minute winner followed by full time is the best beat in football.
   */
  const taken = new Set<number>(scored.map((g) => g.minute));
  const filler: { minute: number; ours: boolean; kind: BeatKind }[] = [];
  for (let i = 0; i < chanceCount; i++) {
    const minute = rng.int(Math.max(2, w.from + 1), FULL_TIME - 1);
    const ours = rng.chance(ourShare);
    const kind: BeatKind = rng.chance(0.7) ? 'chance' : 'foul';
    if (taken.has(minute)) continue;
    taken.add(minute);
    filler.push({ minute, ours, kind });
  }

  const beats: Beat[] = [];
  let us = w.startUs;
  let them = w.startThem;

  if (w.kickoff) {
    beats.push({
      minute: 0, kind: 'kickoff', ours: true,
      text: `Anpfiff. ${w.ourName} gegen ${w.theirName}.`,
      score: [0, 0]
    });
  }

  const timeline = [
    ...scored.map((g) => ({ ...g, kind: 'goal' as BeatKind })),
    ...filler
  ].sort((a, b) => a.minute - b.minute);

  let halftimeDone = w.from >= 45;
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
        text: event.ours ? `TOR für ${w.ourName}!` : `Tor für ${w.theirName}.`,
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

/**
 * Tell the rest of the match again, onto a different final score.
 *
 * Everything the player has already watched is kept exactly as it was — the
 * first half is history the moment it has been seen, and re-rolling it under
 * them would make the whole live view feel arbitrary, which is the thing being
 * fixed. Only what has not happened yet is decided again.
 *
 * The caller must pass a final score at least as large as the one already on
 * the board: a 2:0 first half cannot end 1:1.
 */
export function continueFrom(
  rng: Rng,
  beats: readonly Beat[],
  fromMinute: number,
  input: NarrationInput
): Beat[] {
  /*
   * Everything up to and including the split minute is history — the whistle
   * for half time included, since that is the moment the player is standing
   * at. Only the final whistle is dropped, because the match it ended is about
   * to end differently.
   */
  const kept = beats.filter((b) => b.minute <= fromMinute && b.kind !== 'fulltime');
  const [us, them] = kept.length > 0 ? kept[kept.length - 1]!.score : [0, 0];

  const addUs = Math.max(0, input.ourGoals - us);
  const addThem = Math.max(0, input.theirGoals - them);

  return [
    ...kept,
    ...buildWindow(rng, {
      from: fromMinute,
      startUs: us,
      startThem: them,
      addUs,
      addThem,
      ourName: input.ourName,
      theirName: input.theirName,
      edge: input.edge,
      kickoff: false
    })
  ].sort((a, b) => a.minute - b.minute);
}

/** Where in the timeline a given minute sits, for a scrubbing or resuming view. */
export function beatsUpTo(beats: readonly Beat[], minute: number): Beat[] {
  return beats.filter((b) => b.minute <= minute);
}

export function scoreAt(beats: readonly Beat[], minute: number): [number, number] {
  const seen = beatsUpTo(beats, minute);
  return seen.length > 0 ? seen[seen.length - 1]!.score : [0, 0];
}
