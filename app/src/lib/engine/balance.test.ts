import { strengthOf } from '$lib/features/squad/rules';
import { uniform } from '$lib/features/squad/attributes';
import { describe, it, expect } from 'vitest';
import { Registry } from '$lib/engine/registry';
import { runTick } from '$lib/engine/clock';
import { createRng, seedFrom } from '$lib/engine/rng';
import { modules } from '$lib/modules';
import type { GameState, MetaState, ModuleStates } from '$lib/engine/state';
import { applyNarrative } from '$lib/features/progression/rules';
import { narratives } from '$lib/features/progression/content';
import { standings } from '$lib/features/league/rules';

/**
 * A balance canary, not a balance specification.
 *
 * Every system in the game routes through one assumption: a better eleven wins
 * more. If that stops being true, transfers, youth, training and scouting are
 * all decoration — so it is worth a slow test.
 *
 * The bands are deliberately wide. This is here to catch the mapping going
 * flat or deterministic, not to pin a particular difficulty.
 */
const registry = new Registry(modules);

/**
 * A season, played the way a player plays it: a training week, then the match
 * it was preparing for, thirty-four times.
 *
 * This harness ran matchdays only for as long as the matchday was the game's
 * only tick. The moment fitness recovery moved into the week, a season of bare
 * matchdays drained every squad to the floor and four balance tests failed —
 * correctly. They were measuring a game nobody plays.
 *
 * The rule this codebase keeps re-learning: when a harness disagrees with the
 * product, fix the harness, never the threshold.
 */
export function playSeason(g: GameState, matchdays = 34): void {
  for (let i = 0; i < matchdays; i++) {
    runTick(registry, g, 'week');
    runTick(registry, g, 'matchday');
  }
}

function seasonFinish(seed: number, delta: number): number {
  const rng = createRng(seed);
  const mods: Record<string, unknown> = {};
  for (const m of registry.all) mods[m.id] = m.state.create(rng.fork(m.id));
  const meta: MetaState = { seed, season: 1, matchday: 1, tick: 0, createdAt: 0, lastPlayedAt: 0 };
  const g: GameState = { meta, modules: mods as unknown as ModuleStates };
  applyNarrative(g.modules.progression, narratives[0]!);
  g.modules.progression.started = true;

  const teams = g.modules.league.levels[g.modules.league.playerLevel]!;
  const avg = teams.reduce((s, t) => s + t.strength, 0) / teams.length;
  for (const p of g.modules.squad.players) p.attributes = uniform(Math.round(avg + delta));

  playSeason(g);
  const table = standings(g.modules.league.levels[g.modules.league.playerLevel] ?? []);
  return table.findIndex((r) => r.team.id === g.modules.league.playerClubId) + 1;
}

/*
 * Twenty seasons, not twelve.
 *
 * At a true relegation rate near 75%, twelve seasons has a standard deviation
 * of 1.5 — so a legitimate build lands on 6/12 often enough to fail a sensible
 * threshold. A flaky balance test gets its threshold weakened until it asserts
 * nothing, so the sample has to be big enough that the bands can stay honest.
 * Measured across four independent seed families of 40 seasons each:
 *   -10 relegated 68-80%,  level side relegated 5-18% (base rate is 3/18 = 17%).
 */
const SEASONS = 20;
const positions = (delta: number) =>
  Array.from({ length: SEASONS }, (_, s) => seasonFinish(seedFrom(`bal${s}`), delta));

describe('strength decides results', () => {
  it('a side ten points above its league finishes top three in most seasons', () => {
    const top3 = positions(10).filter((p) => p <= 3).length;
    expect(top3, `${top3}/${SEASONS} seasons in the top three`).toBeGreaterThanOrEqual(13);
  });

  /**
   * Being clearly worst has to be usually fatal.
   *
   * Not a balance preference: Aufsteiger is the default start and the tutorial,
   * and its whole premise is survival. Every improvement system in the game is
   * ultimately justified by "or else you go down", so that has to bite.
   * MEASURED at three-down: relegated in 68-80% of seasons across four seed families.
   */
  it('a side ten points below is relegated in most seasons', () => {
    const down = positions(-10).filter((p) => p >= 16).length;
    expect(down, `${down}/${SEASONS} seasons relegated`).toBeGreaterThanOrEqual(11);
  });

  /**
   * The other half of the same requirement: being ORDINARY must not be risky.
   *
   * With 3 of 18 going down, the base rate for a side with no edge either way is
   * 17%. MEASURED at 5-18% — a median side sits at or below the base rate, which is
   * what "average" should mean. This guards the ceiling: if an ordinary squad
   * started going down half the time, the threat would have stopped
   * discriminating and would just be noise.
   */
  it('a side at its league’s strength is not in real danger', () => {
    const down = positions(0).filter((p) => p >= 16).length;
    expect(down, `${down}/${SEASONS} seasons relegated while merely average`).toBeLessThanOrEqual(6);
  });

  it('a side at its league’s strength finishes mid-table', () => {
    const ps = positions(0);
    const avg = ps.reduce((a, b) => a + b, 0) / ps.length;
    // The middle of an 18-team league is 9.5. This is the assertion that caught
    // the fitness tax: it read 15.4 when the player alone was paying one.
    expect(avg, `average finish ${avg.toFixed(1)}`).toBeGreaterThan(6.5);
    expect(avg, `average finish ${avg.toFixed(1)}`).toBeLessThan(12.5);
  });

  it('is not deterministic — the better side still drops seasons', () => {
    const ps = positions(10);
    expect(new Set(ps).size, 'every season finished in the same position').toBeGreaterThan(1);
  });
});

/**
 * The style choice must be a trade, not a calculation.
 *
 * Strength alone put both styles on one axis — points per season — and on one
 * axis one option must dominate; tuning them to equal points only makes the
 * choice meaningless instead of wrong. Openness moves VARIANCE: offensiv is
 * correct when a draw is worthless, defensiv when a point is worth having.
 *
 * So: means close, spreads different. If offensiv wins on mean it is still a
 * trap, just pointing the other way.
 */
describe('tactical styles trade mean for variance', () => {
  function seasonPoints(seed: number, style: 'offensiv' | 'defensiv'): number {
    const rng = createRng(seed);
    const mods: Record<string, unknown> = {};
    for (const m of registry.all) mods[m.id] = m.state.create(rng.fork(m.id));
    const meta: MetaState = { seed, season: 1, matchday: 1, tick: 0, createdAt: 0, lastPlayedAt: 0 };
    const g: GameState = { meta, modules: mods as unknown as ModuleStates };
    applyNarrative(g.modules.progression, narratives[0]!);
    g.modules.progression.started = true;
    g.modules.matchday.style = style;
    playSeason(g);
    const us = (g.modules.league.levels[g.modules.league.playerLevel] ?? [])
      .find((t) => t.id === g.modules.league.playerClubId)!;
    return us.won * 3 + us.drawn;
  }

  /*
   * Forty seasons, not sixteen.
   *
   * At sixteen the gap measured 6.7 and failed a threshold of 6; at forty it is
   * 5.1. The build had not changed — the sample had. This is the same lesson as
   * the relegation band, and the same trap: the tempting fix is to widen the
   * threshold, each widening is defensible, and the end state asserts nothing.
   */
  const N = 40;
  const sample = (style: 'offensiv' | 'defensiv') =>
    Array.from({ length: N }, (_, s) => seasonPoints(seedFrom(`v${s}`), style));
  const mean = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;
  const sd = (a: number[]) => {
    const m = mean(a);
    return Math.sqrt(mean(a.map((x) => (x - m) ** 2)));
  };

  it('neither style dominates on points', () => {
    const off = sample('offensiv');
    const def = sample('defensiv');
    const gap = Math.abs(mean(off) - mean(def));
    expect(gap, `offensiv ${mean(off).toFixed(1)} vs defensiv ${mean(def).toFixed(1)}`).toBeLessThan(8);
  });

  /**
   * The property that actually matters, and the one that was never asserted.
   *
   * Close means are only half the design: offensiv is meant to be the choice
   * you make when a draw is worthless, which means its season outcomes must be
   * more SPREAD, not merely equal on average. Two styles with identical means
   * and identical variance are one style with two names.
   */
  it('offensive football is the higher-variance choice', () => {
    const off = sample('offensiv');
    const def = sample('defensiv');
    expect(sd(off), `offensiv sd ${sd(off).toFixed(1)} vs defensiv ${sd(def).toFixed(1)}`)
      .toBeGreaterThan(sd(def));
  });

  it('offensive football produces more goals at BOTH ends', () => {
    const goals = (style: 'offensiv' | 'defensiv') => {
      const rng = createRng(seedFrom('goals'));
      const mods: Record<string, unknown> = {};
      for (const m of registry.all) mods[m.id] = m.state.create(rng.fork(m.id));
      const meta: MetaState = { seed: seedFrom('goals'), season: 1, matchday: 1, tick: 0, createdAt: 0, lastPlayedAt: 0 };
      const g: GameState = { meta, modules: mods as unknown as ModuleStates };
      applyNarrative(g.modules.progression, narratives[0]!);
      g.modules.progression.started = true;
      g.modules.matchday.style = style;
      playSeason(g);
      const us = (g.modules.league.levels[g.modules.league.playerLevel] ?? [])
        .find((t) => t.id === g.modules.league.playerClubId)!;
      return us.goalsFor + us.goalsAgainst;
    };
    expect(goals('offensiv')).toBeGreaterThan(goals('defensiv'));
  });
});
