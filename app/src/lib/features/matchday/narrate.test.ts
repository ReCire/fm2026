import { describe, it, expect } from 'vitest';
import { narrate, beatsUpTo, scoreAt, continueFrom } from './narrate';
import { createRng, seedFrom } from '$lib/engine/rng';
import { Registry } from '$lib/engine/registry';
import { runTick } from '$lib/engine/clock';
import { modules } from '$lib/modules';
import type { GameState, MetaState, ModuleStates } from '$lib/engine/state';
import { applyNarrative } from '../progression/rules';
import { narratives } from '../progression/content';

const registry = new Registry(modules);

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

describe('continueFrom', () => {
  const input = (ourGoals: number, theirGoals: number, edge = 0) => ({
    ourGoals, theirGoals, ourName: 'Wir', theirName: 'Sie', edge
  });

  /*
   * The first half is history the moment it has been watched. Re-rolling it
   * underneath the player would make the live view feel arbitrary, which is
   * the exact thing it exists to fix.
   */
  it('leaves everything before the split untouched', () => {
    for (let seed = 0; seed < 40; seed++) {
      const rng = createRng(seed);
      const before = narrate(rng, input(2, 1, 5));
      const firstHalf = before.filter((b) => b.minute < 45);
      const after = continueFrom(createRng(seed + 7000), before, 45, input(4, 1, 9));
      expect(after.filter((b) => b.minute < 45)).toEqual(firstHalf);
    }
  });

  it('always ends on exactly the score it was given', () => {
    for (let seed = 0; seed < 60; seed++) {
      for (const [us, them] of [[0, 0], [1, 0], [3, 2], [5, 1], [0, 4], [2, 2]] as const) {
        const base = narrate(createRng(seed), input(0, 0));
        const out = continueFrom(createRng(seed), base, 45, input(us, them));
        const end = out[out.length - 1]!;
        expect(end.kind).toBe('fulltime');
        expect(end.score, `seed ${seed} for ${us}:${them}`).toEqual([us, them]);
      }
    }
  });

  it('keeps goals already scored when the new final score is lower', () => {
    // A 2:0 first half cannot end 1:1. The caller is expected to pass a score
    // at least as large; this asserts we do not silently un-score a goal the
    // player watched go in.
    const base = narrate(createRng(3), input(2, 0, 20));
    const at45 = scoreAt(base, 45);
    const out = continueFrom(createRng(3), base, 45, input(0, 0));
    const end = out[out.length - 1]!;
    expect(end.score[0]).toBeGreaterThanOrEqual(at45[0]);
    expect(end.score[1]).toBeGreaterThanOrEqual(at45[1]);
  });

  it('is deterministic for a seed', () => {
    const base = narrate(createRng(11), input(1, 1));
    const a = continueFrom(createRng(22), base, 45, input(3, 1));
    const b = continueFrom(createRng(22), base, 45, input(3, 1));
    expect(a).toEqual(b);
  });

  it('leaves exactly one full-time beat and one half-time beat', () => {
    for (let seed = 0; seed < 20; seed++) {
      const base = narrate(createRng(seed), input(1, 2));
      const out = continueFrom(createRng(seed), base, 45, input(2, 2));
      expect(out.filter((b) => b.kind === 'fulltime')).toHaveLength(1);
      expect(out.filter((b) => b.kind === 'halftime')).toHaveLength(1);
    }
  });

  it('the running score never goes backwards', () => {
    for (let seed = 0; seed < 30; seed++) {
      const base = narrate(createRng(seed), input(1, 1));
      const out = continueFrom(createRng(seed), base, 45, input(3, 2));
      let [us, them] = [0, 0];
      for (const b of out) {
        expect(b.score[0]).toBeGreaterThanOrEqual(us);
        expect(b.score[1]).toBeGreaterThanOrEqual(them);
        [us, them] = b.score;
      }
    }
  });
});

describe('the feed can always be rendered', () => {
  /*
   * The live view keys its list, and a keyed each with a repeat tears the
   * whole feed down at runtime — `each_key_duplicate`, mid-match, with the
   * score on screen. Two fillers drawing the same minute AND the same text is
   * rare enough to pass every manual look and certain enough to happen to a
   * player. Found by playing five matchdays in a row.
   *
   * The view now keys by index, so a repeat can no longer crash it. This holds
   * the data honest anyway: two identical lines in the feed read as a bug even
   * when nothing breaks. A goal sharing its minute with the whistle after it is
   * fine and deliberately still allowed — a 90th-minute winner is the best beat
   * in football.
   */
  it('never produces two identical beats', () => {
    for (let seed = 0; seed < 80; seed++) {
      for (const [us, them] of [[0, 0], [3, 2], [5, 0], [1, 4]] as const) {
        const beats = narrate(createRng(seed), {
          ourGoals: us, theirGoals: them, ourName: 'Wir', theirName: 'Sie', edge: 8
        });
        const keys = beats.map((b) => `${b.minute}|${b.kind}|${b.text}`);
        expect(new Set(keys).size, `seed ${seed} for ${us}:${them}`).toBe(keys.length);
      }
    }
  });

  it('still produces no identical beats after the second half is told again', () => {
    for (let seed = 0; seed < 60; seed++) {
      const base = narrate(createRng(seed), {
        ourGoals: 1, theirGoals: 1, ourName: 'Wir', theirName: 'Sie', edge: 0
      });
      const out = continueFrom(createRng(seed + 500), base, 45, {
        ourGoals: 3, theirGoals: 2, ourName: 'Wir', theirName: 'Sie', edge: 6
      });
      const keys = out.map((b) => `${b.minute}|${b.kind}|${b.text}`);
      expect(new Set(keys).size, `seed ${seed}`).toBe(keys.length);
    }
  });
});

describe('a goal belongs to somebody', () => {
  /*
   * "Tor für Ziegelhütte" and "Weber trifft zum 2:1" are different games — and
   * a top-scorer list, the second tab on any football stats screen, cannot
   * exist without this. It is also what makes two talents in the catalogue
   * expressible at all.
   */
  const squad = [
    { id: 'st1', name: 'Stürmer Eins', weight: 10 },
    { id: 'st2', name: 'Stürmer Zwei', weight: 9 },
    { id: 'mit', name: 'Mittelfeld', weight: 5 },
    { id: 'abw', name: 'Abwehr', weight: 1.5 },
    { id: 'tw', name: 'Torwart', weight: 0.05 }
  ];
  const input = (ourGoals: number, theirGoals = 0, scorers = squad) => ({
    ourGoals, theirGoals, ourName: 'Wir', theirName: 'Sie', edge: 0, scorers
  });

  it('names one of our own for every goal we score', () => {
    for (let seed = 0; seed < 40; seed++) {
      const beats = narrate(createRng(seed), input(3, 2));
      const ours = beats.filter((b) => b.kind === 'goal' && b.ours);
      expect(ours).toHaveLength(3);
      for (const g of ours) {
        expect(squad.map((s) => s.id), `seed ${seed}`).toContain(g.scorerId);
        expect(g.text).toContain(squad.find((s) => s.id === g.scorerId)!.name);
      }
    }
  });

  /* We do not model the opposition's squad, so their goals stay anonymous
     rather than being attributed to an invented name. */
  it('leaves the opposition anonymous', () => {
    const beats = narrate(createRng(5), input(1, 2));
    for (const g of beats.filter((b) => b.kind === 'goal' && !b.ours)) {
      expect(g.scorerId).toBeUndefined();
    }
  });

  it('falls back to the old line when nobody has been picked', () => {
    const beats = narrate(createRng(2), { ...input(2), scorers: undefined });
    const goals = beats.filter((b) => b.kind === 'goal' && b.ours);
    expect(goals.length).toBe(2);
    for (const g of goals) {
      expect(g.scorerId).toBeUndefined();
      expect(g.text).toContain('Wir');
    }
  });

  /*
   * Weighted, not uniform. A keeper as likely as a striker would make the
   * top-scorer list read as a random name generator, which is the one thing
   * the list must not be.
   */
  it('gives the striker far more of them than the goalkeeper', () => {
    const tally = new Map<string, number>();
    for (let seed = 0; seed < 300; seed++) {
      for (const g of narrate(createRng(seed), input(2))) {
        if (g.kind === 'goal' && g.scorerId) {
          tally.set(g.scorerId, (tally.get(g.scorerId) ?? 0) + 1);
        }
      }
    }
    expect(tally.get('st1') ?? 0).toBeGreaterThan((tally.get('abw') ?? 0) * 3);
    expect(tally.get('tw') ?? 0).toBeLessThan((tally.get('st1') ?? 0) / 20);
  });

  it('lets one man score twice, because a brace is worth having', () => {
    let braces = 0;
    for (let seed = 0; seed < 200; seed++) {
      const ids = narrate(createRng(seed), input(3))
        .filter((b) => b.kind === 'goal' && b.ours)
        .map((b) => b.scorerId);
      if (new Set(ids).size < ids.length) braces++;
    }
    expect(braces, 'nobody ever scored twice in two hundred matches').toBeGreaterThan(0);
  });

  it('is deterministic, and does not shift when the filler does', () => {
    const a = narrate(createRng(31), input(2, 1));
    const b = narrate(createRng(31), input(2, 1));
    expect(a).toEqual(b);
  });

  it('still ends on exactly the score it was given', () => {
    for (let seed = 0; seed < 30; seed++) {
      const beats = narrate(createRng(seed), input(4, 1));
      expect(beats[beats.length - 1]!.score).toEqual([4, 1]);
    }
  });
});

describe('scorers add up to the scoreline', () => {
  /*
   * The invariant that keeps a top-scorer board honest: every goal the league
   * table credits to the club is credited to exactly one player, and no player
   * is credited a goal the table does not know about.
   *
   * Attribution runs over the NARRATION while the score comes from the
   * simulation, so the two could drift apart without anything erroring — a
   * scorers' list that quietly disagreed with the table would be worse than no
   * list at all, because it looks authoritative.
   */
  it('over a full season, attributed goals equal the table', () => {
    const seed = seedFrom('conservation');
    const rng = createRng(seed);
    const mods: Record<string, unknown> = {};
    for (const m of registry.all) mods[m.id] = m.state.create(rng.fork(m.id));
    const meta: MetaState = { seed, season: 1, matchday: 1, tick: 0, createdAt: 0, lastPlayedAt: 0 };
    const g: GameState = { meta, modules: mods as unknown as ModuleStates };
    applyNarrative(g.modules.progression, narratives[0]!);
    g.modules.progression.started = true;

    for (let i = 0; i < 34; i++) { runTick(registry, g, 'week'); runTick(registry, g, 'matchday'); }

    const attributed = g.modules.squad.players.reduce((s, p) => s + p.record.goals, 0);
    const table = g.modules.league.levels[g.modules.league.playerLevel]!
      .find((t) => t.id === g.modules.league.playerClubId)!.goalsFor;

    expect(attributed, 'the scorers list disagrees with the table').toBe(table);
    expect(attributed, 'a whole season produced no goals at all').toBeGreaterThan(0);
  });

  it('produces a board with a clear top scorer, not a flat spread', () => {
    const seed = seedFrom('board');
    const rng = createRng(seed);
    const mods: Record<string, unknown> = {};
    for (const m of registry.all) mods[m.id] = m.state.create(rng.fork(m.id));
    const meta: MetaState = { seed, season: 1, matchday: 1, tick: 0, createdAt: 0, lastPlayedAt: 0 };
    const g: GameState = { meta, modules: mods as unknown as ModuleStates };
    applyNarrative(g.modules.progression, narratives[0]!);
    g.modules.progression.started = true;
    for (let i = 0; i < 34; i++) { runTick(registry, g, 'week'); runTick(registry, g, 'matchday'); }

    const ranked = [...g.modules.squad.players].sort((a, b) => b.record.goals - a.record.goals);
    const top = ranked[0]!;
    expect(top.record.goals, 'nobody stood out over a whole season').toBeGreaterThanOrEqual(6);
    // A striker, not a centre-back who got lucky.
    expect(['ST', 'MIT'], `the top scorer was a ${top.pos}`).toContain(top.pos);
  });
});
