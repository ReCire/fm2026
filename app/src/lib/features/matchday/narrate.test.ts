import { describe, it, expect } from 'vitest';
import { narrate, beatsUpTo, scoreAt } from './narrate';
import { createRng } from '$lib/engine/rng';

const run = (ourGoals: number, theirGoals: number, edge = 0, seed = 1) =>
  narrate(createRng(seed), {
    ourGoals, theirGoals, edge,
    ourName: 'SC Ziegelhütte', theirName: 'VfB Oberhausen'
  });

describe('the narration always agrees with the result', () => {
  /**
   * The invariant the whole design rests on: the SIMULATION decides the score
   * and this only tells the story of it. A narrator that could disagree would
   * put the match model and the balance model in conflict, and the one on
   * screen would win — quietly undoing "a better eleven wins more".
   */
  it('ends on exactly the score it was given, across many matches', () => {
    for (let seed = 0; seed < 60; seed++) {
      const scores: [number, number][] = [[0, 0], [1, 0], [0, 3], [2, 2], [5, 1], [4, 4]];
      for (const [a, b] of scores) {
        const beats = run(a, b, 0, seed);
        const last = beats[beats.length - 1]!;
        expect(last.kind).toBe('fulltime');
        expect(last.score, `seed ${seed} for ${a}:${b}`).toEqual([a, b]);
      }
    }
  });

  it('emits exactly as many goals as were scored', () => {
    const beats = run(3, 2);
    expect(beats.filter((b) => b.kind === 'goal' && b.ours)).toHaveLength(3);
    expect(beats.filter((b) => b.kind === 'goal' && !b.ours)).toHaveLength(2);
  });

  it('never lets the running score go backwards', () => {
    const beats = run(3, 3, 0, 9);
    for (let i = 1; i < beats.length; i++) {
      expect(beats[i]!.score[0]).toBeGreaterThanOrEqual(beats[i - 1]!.score[0]);
      expect(beats[i]!.score[1]).toBeGreaterThanOrEqual(beats[i - 1]!.score[1]);
    }
  });
});

describe('a match reads like a match', () => {
  it('opens with kickoff and closes with the whistle', () => {
    const beats = run(1, 1);
    expect(beats[0]!.kind).toBe('kickoff');
    expect(beats.at(-1)!.kind).toBe('fulltime');
  });

  it('always has a halftime, even in a goalless match', () => {
    expect(run(0, 0).some((b) => b.kind === 'halftime')).toBe(true);
    expect(run(4, 0).some((b) => b.kind === 'halftime')).toBe(true);
  });

  it('runs in minute order', () => {
    const beats = run(2, 3, 0, 4);
    for (let i = 1; i < beats.length; i++) {
      expect(beats[i]!.minute).toBeGreaterThanOrEqual(beats[i - 1]!.minute);
    }
  });

  /** A 0:0 must still have things in it, or watching one is worse than a number. */
  it('gives a goalless draw something to watch', () => {
    const beats = run(0, 0, 0, 12);
    const incident = beats.filter((b) => b.kind === 'chance' || b.kind === 'foul');
    expect(incident.length).toBeGreaterThanOrEqual(4);
  });

  it('keeps every goal inside ninety minutes', () => {
    for (let seed = 0; seed < 30; seed++) {
      for (const b of run(4, 4, 0, seed)) {
        expect(b.minute).toBeGreaterThanOrEqual(0);
        expect(b.minute).toBeLessThanOrEqual(90);
      }
    }
  });

  it('gives the stronger side more of the chances', () => {
    let ourShare = 0;
    let theirShare = 0;
    for (let seed = 0; seed < 40; seed++) {
      for (const b of run(1, 1, 25, seed)) {
        if (b.kind !== 'chance') continue;
        b.ours ? ourShare++ : theirShare++;
      }
    }
    expect(ourShare, `${ourShare} vs ${theirShare}`).toBeGreaterThan(theirShare);
  });
});

describe('replay', () => {
  it('is deterministic — the same match tells the same story twice', () => {
    expect(run(2, 1, 10, 77)).toEqual(run(2, 1, 10, 77));
  });

  it('can be resumed at a minute', () => {
    const beats = run(2, 1, 0, 3);
    expect(beatsUpTo(beats, 0).map((b) => b.kind)).toEqual(['kickoff']);
    expect(beatsUpTo(beats, 90).length).toBe(beats.length);
    expect(scoreAt(beats, 90)).toEqual([2, 1]);
    expect(scoreAt(beats, 0)).toEqual([0, 0]);
  });
});
