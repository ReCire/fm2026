import { describe, it, expect } from 'vitest';
import { Registry } from '$lib/engine/registry';
import { modules } from '$lib/modules';
import type { GameState, MetaState, ModuleStates } from '$lib/engine/state';
import { createRng, seedFrom } from '$lib/engine/rng';
import type { ModuleDef, OpenItem } from '$lib/engine/module';

/**
 * The attention contract.
 *
 * The prototype had one table of thirteen closures reaching into every global,
 * so a single file had to know all nineteen departments and broke whenever one
 * of them changed shape. Inverting it means each feature answers for itself —
 * but only if the rules that make a badge MEAN something are enforced in one
 * place rather than remembered nineteen times.
 *
 * These test the enforcement, not any one department's copy.
 */
const registry = new Registry(modules);

function career(): GameState {
  const seed = seedFrom('attention');
  const rng = createRng(seed);
  const mods: Record<string, unknown> = {};
  for (const m of registry.all) mods[m.id] = m.state.create(rng.fork(m.id));
  const meta: MetaState = { seed, season: 1, matchday: 1, tick: 0, createdAt: 0, lastPlayedAt: 0 };
  return { meta, modules: mods as unknown as ModuleStates };
}

const withAttention = () => registry.all.filter((m) => m.attention);

describe('every implementation obeys the contract', () => {
  it('at least one module answers, or the whole mechanism is dead wiring', () => {
    expect(withAttention().length).toBeGreaterThan(0);
  });

  it('returns well-formed items with stable, unique ids', () => {
    const g = career();
    for (const m of withAttention()) {
      const items = m.attention!(g);
      expect(Array.isArray(items), m.id).toBe(true);
      for (const i of items) {
        expect(i.id, `${m.id}: an item without an id cannot be tracked`).toBeTruthy();
        expect(i.label.length, `${m.id}: an empty label is a badge that says nothing`)
          .toBeGreaterThan(0);
        expect(['now', 'soon'], `${m.id}: unknown urgency`).toContain(i.urgency);
      }
      const ids = items.map((i: OpenItem) => i.id);
      expect(new Set(ids).size, `${m.id}: duplicate item ids`).toBe(ids.length);
    }
  });

  /* It runs on render, not on a tick. A department that quietly advanced state
     while drawing a badge would make the game depend on which screen you were
     looking at. */
  it('never writes to state', () => {
    const g = career();
    const before = JSON.stringify(g);
    for (const m of withAttention()) m.attention!(g);
    expect(JSON.stringify(g)).toBe(before);
  });

  it('is deterministic — the same state gives the same badges', () => {
    const g = career();
    for (const m of withAttention()) {
      expect(m.attention!(g)).toEqual(m.attention!(g));
    }
  });

  it('says nothing when nothing is waiting', () => {
    const g = career();
    // A fresh, healthy squad with money in the bank must not badge finance.
    const finance = registry.byId.get('finance') as ModuleDef;
    g.modules.finance.money = 10_000_000;
    expect(finance.attention!(g)).toEqual([]);
  });

  it('names a decision rather than a fact', () => {
    const g = career();
    g.modules.finance.money = -50_000;
    const items = (registry.byId.get('finance') as ModuleDef).attention!(g);
    expect(items.some((i: OpenItem) => i.urgency === 'now')).toBe(true);
  });

  it('escalates as the situation gets worse', () => {
    const g = career();
    const finance = registry.byId.get('finance') as ModuleDef;
    g.modules.finance.money = 10_000_000;
    const rich = finance.attention!(g);
    g.modules.finance.money = -1;
    const broke = finance.attention!(g);
    expect(rich).toEqual([]);
    expect(broke.map((i: OpenItem) => i.urgency)).toContain('now');
  });
});
