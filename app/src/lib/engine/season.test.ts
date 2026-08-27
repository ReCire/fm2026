import { describe, it, expect } from 'vitest';
import { Registry } from '$lib/engine/registry';
import { runTick } from '$lib/engine/clock';
import { createRng, seedFrom } from '$lib/engine/rng';
import { modules } from '$lib/modules';
import type { GameState, MetaState, ModuleStates } from '$lib/engine/state';
import { applyNarrative } from '$lib/features/progression/rules';
import { narratives } from '$lib/features/progression/content';
import { standings } from '$lib/features/league/rules';

const registry = new Registry(modules);
function newGame(seedText: string): GameState {
  const seed = seedFrom(seedText);
  const rng = createRng(seed);
  const mods: Record<string, unknown> = {};
  for (const m of registry.all) mods[m.id] = m.state.create(rng.fork(m.id));
  const meta: MetaState = { seed, season: 1, matchday: 1, tick: 0, createdAt: 0, lastPlayedAt: 0 };
  const g = { meta, modules: mods as unknown as ModuleStates };
  applyNarrative(g.modules.progression, narratives[0]!);
  g.modules.progression.started = true;
  return g;
}

describe('a full season through every registered module', () => {
  it('plays 34 matchdays and a season end without a single failed tick', () => {
    const g = newGame('full-season');
    const failures: string[] = [];
    for (let i = 0; i < 34; i++) {
      const r = runTick(registry, g, 'matchday');
      failures.push(...r.failed);
    }
    const end = runTick(registry, g, 'seasonEnd');
    failures.push(...end.failed);

    expect(failures).toEqual([]);
    expect(g.meta.season).toBe(2);
  });

  it('leaves a coherent world afterwards', () => {
    const g = newGame('coherent');
    for (let i = 0; i < 34; i++) runTick(registry, g, 'matchday');

    const table = standings(g.modules.league.levels[g.modules.league.playerLevel] ?? []);
    expect(table.length).toBeGreaterThan(1);
    // Every club played the same number of games.
    const played = new Set(table.map((r) => r.team.played));
    expect(played.size).toBe(1);

    // Nobody is outside their own bounds.
    for (const p of g.modules.squad.players) {
      expect(p.fitness).toBeGreaterThanOrEqual(0);
      expect(p.fitness).toBeLessThanOrEqual(100);
      expect(p.morale).toBeGreaterThanOrEqual(0);
      expect(p.morale).toBeLessThanOrEqual(100);
    }
    // The ledger stayed bounded and money actually moved.
    expect(g.modules.finance.ledger.length).toBeLessThanOrEqual(2000);
    expect(g.modules.finance.money).not.toBe(150_000);
    // And the matchday module recorded results.
    expect(g.modules.matchday.recent.length).toBeGreaterThan(0);
  });

  it('is reproducible across a whole season', () => {
    const a = newGame('repro');
    const b = newGame('repro');
    for (let i = 0; i < 34; i++) { runTick(registry, a, 'matchday'); runTick(registry, b, 'matchday'); }
    expect(a.modules).toEqual(b.modules);
  });

  /**
   * Guards OBSERVABILITY, not balance.
   *
   * A tactical choice the player cannot see the effect of is the same failure
   * as a stat that only resolves in aggregate financials — they pick an option
   * and never learn whether it did anything. Which style is BETTER is a design
   * decision and deliberately not asserted here; that it makes a visible
   * difference is an engineering guarantee and is.
   *
   * A single seed is not enough: the tactical swing is a fraction of a goal per
   * match, so two seasons coinciding exactly is ordinary luck rather than a
   * broken feature. Measured across ten seasons it lands around 8 of 10.
   */
  it('makes tactics observable across a run of seasons', () => {
    let differed = 0;
    for (let s = 0; s < 10; s++) {
      const off = newGame(`tactics-${s}`);
      const def = newGame(`tactics-${s}`);
      off.modules.matchday.style = 'offensiv';
      def.modules.matchday.style = 'defensiv';
      for (let i = 0; i < 34; i++) { runTick(registry, off, 'matchday'); runTick(registry, def, 'matchday'); }

      const find = (g: GameState) =>
        (g.modules.league.levels[g.modules.league.playerLevel] ?? [])
          .find((t) => t.name === 'FC Anstoß Pro')!;
      const o = find(off), d = find(def);
      if (o.goalsFor !== d.goalsFor || o.won !== d.won) differed++;
    }
    expect(differed, 'tactical choice had no visible effect in most seasons').toBeGreaterThanOrEqual(6);
  });
});
