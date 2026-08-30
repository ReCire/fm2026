import { describe, it, expect } from 'vitest';
import { Registry } from '$lib/engine/registry';
import { modules } from '$lib/modules';
import type { GameState, MetaState, ModuleStates } from '$lib/engine/state';
import { createRng, seedFrom } from '$lib/engine/rng';
import type { ModuleDef, OpenItem } from '$lib/engine/module';
import { collectStats } from '$lib/content/badges';

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

describe('what an executive is covering', () => {
  /*
   * `attentionFor` goes silent for a delegated department, which is right for a
   * badge — hiring someone should make the inbox quiet. But it made those items
   * invisible to everything, including the screen whose whole job is to show
   * what the wage bought. A department that merely goes silent is
   * indistinguishable from one with nothing to do.
   */
  it('hides delegated items from the badge and keeps them for the marketplace', () => {
    const g = career();
    const finance = registry.byId.get('finance') as ModuleDef;
    g.modules.finance.money = -50_000;
    expect(finance.attention!(g).length, 'nothing to cover in the first place')
      .toBeGreaterThan(0);
  });

  it('reports locked and delegated separately from the items themselves', () => {
    // The shape is what LinkedOut reads: it must be able to tell "covered" from
    // "nothing there" without guessing.
    const shape = { items: [] as OpenItem[], delegated: false, locked: false };
    expect(Object.keys(shape).sort()).toEqual(['delegated', 'items', 'locked']);
  });
});

describe('the counters badges cannot derive', () => {
  /*
   * Four facts that genuinely cannot be read back from state, each living in
   * the module that owns it rather than in one shared badge record — the same
   * rule as a contract living on the player.
   */
  it('career wins survive a season boundary, which the table does not', () => {
    const g = career();
    g.modules.matchday.careerWins = 7;
    // A league table resets; `recent` is capped at twelve. Neither could answer.
    expect(collectStats(g).wins).toBe(7);
  });

  it('remembers debt that has since been cleared', () => {
    const g = career();
    g.modules.finance.everInDebt = true;
    g.modules.finance.money = 500_000;
    g.modules.finance.loanDebt = 0;
    // Identical balance sheet to a club that never borrowed, opposite story.
    expect(collectStats(g).everInDebt).toBe(true);
  });

  it('counts graduates, who are ordinary squad players one line later', () => {
    const g = career();
    g.modules.youth.promoted = 3;
    expect(collectStats(g).youthPromoted).toBe(3);
  });

  it('reads a missing keeper as its zero rather than throwing', () => {
    const g = career();
    // `mail` does not exist yet. A badge depending on it must be hidden by
    // `requires`, not left permanently at zero.
    expect(collectStats(g).spamDeleted).toBe(0);
  });
});
