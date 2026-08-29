import { strengthOf } from '$lib/features/squad/rules';
import { uniform } from '$lib/features/squad/attributes';
import { describe, it, expect } from 'vitest';
import { Registry } from '$lib/engine/registry';
import { runTick } from '$lib/engine/clock';
import { createRng, seedFrom } from '$lib/engine/rng';
import { modules } from '$lib/modules';
import type { GameState, MetaState, ModuleStates } from '$lib/engine/state';

const registry = new Registry(modules);
function freshGame(seedText = 'ordering'): GameState {
  const seed = seedFrom(seedText);
  const rng = createRng(seed);
  const mods: Record<string, unknown> = {};
  for (const m of registry.all) mods[m.id] = m.state.create(rng.fork(m.id));
  const meta: MetaState = { seed, season: 1, matchday: 1, tick: 0, createdAt: 0, lastPlayedAt: 0 };
  return { meta, modules: mods as unknown as ModuleStates };
}

/**
 * The lineup must reach the simulation.
 *
 * This shipped broken: squad published `squad.strength` in `post`, league read
 * it in `sim`, so league silently took its fallback and the player's team
 * selection had no effect on their own results. `matchday` now publishes in
 * `pre`, and the registry refuses to boot on a consumer-before-provider pair.
 */
describe('provide/query ordering', () => {
  it('lets the lineup decide the result', () => {
    const strong = freshGame();
    const weak = freshGame();
    // Make one squad drastically better than the other.
    for (const p of strong.modules.squad.players) { p.attributes = uniform(95); p.fitness = 100; }
    for (const p of weak.modules.squad.players)   { p.attributes = uniform(25); p.fitness = 40; }

    runTick(registry, strong, 'matchday');
    runTick(registry, weak, 'matchday');

    const ours = (g: GameState) =>
      g.modules.league.levels[g.modules.league.playerLevel]!
        .find((t) => t.id === g.modules.league.playerClubId)!;
    const s = ours(strong);
    const w = ours(weak);

    // If the lineup mattered, a 95-rated eleven would not post the identical
    // scoreline as a 25-rated one on the same seed.
    expect({ gf: s.goalsFor, ga: s.goalsAgainst }).not.toEqual({ gf: w.goalsFor, ga: w.goalsAgainst });
    // And the better side should be the one that did better.
    expect(s.goalsFor - s.goalsAgainst).toBeGreaterThan(w.goalsFor - w.goalsAgainst);
  });

  it('refuses to boot when a consumer is ordered before its provider', () => {
    const broken = modules.map((m) =>
      m.id === 'matchday'
        ? {
            ...m,
            hooks: {
              matchday: {
                phase: 'world' as const,      // after league's `sim`
                provides: ['squad.strength'],
                run() {}
              }
            }
          }
        : m
    );
    expect(() => new Registry(broken)).toThrow(/runs LATER/);
  });

  it('refuses to boot when a consumed key has no provider at all', () => {
    // Strip BOTH providers of squad.strength — matchday's pre hook and squad's
    // own post hook — leaving league consuming a key nobody publishes.
    const orphan = modules.map((m) => {
      if (m.id === 'matchday') return { ...m, hooks: {} };
      if (m.id === 'squad') {
        const hooks = Array.isArray(m.hooks?.matchday) ? m.hooks.matchday : [];
        return {
          ...m,
          hooks: { matchday: hooks.map((h) => ({ ...h, provides: [] })) }
        };
      }
      return m;
    });
    expect(() => new Registry(orphan)).toThrow(/no enabled module declares/);
  });

  it('names both sides and the tick kind, so the message is actionable', () => {
    const broken = modules.map((m) =>
      m.id === 'matchday'
        ? { ...m, hooks: { matchday: { phase: 'world' as const, provides: ['squad.strength'], run() {} } } }
        : m
    );
    let message = '';
    try { new Registry(broken); } catch (e) { message = (e as Error).message; }
    expect(message).toContain('squad.strength');
    expect(message).toContain('league');
    expect(message).toContain('matchday');
    expect(message).toContain('matchday');
  });
});
