import { describe, it, expect } from 'vitest';
import { elasticity, onlineBaseline, restock, restockQuote, sellMatchday, setPrice } from './rules';
import { createMerch } from './state';
import { merchContent } from './content';
import { createRng } from '$lib/engine/rng';
import { Registry } from '$lib/engine/registry';
import { runTick } from '$lib/engine/clock';
import { createRng as createSeededRng, seedFrom } from '$lib/engine/rng';
import { modules } from '$lib/modules';
import type { GameState, MetaState, ModuleStates } from '$lib/engine/state';
import { applyNarrative, unlock } from '../progression/rules';
import { narratives } from '../progression/content';
import { hire } from '../staff/rules';

const base = () => createMerch(createRng(1));

describe('elasticity', () => {
  it('is neutral at the optimal price', () => {
    expect(elasticity(65, 65).factor).toBe(1.0);
    expect(elasticity(65, 65).tone).toBe('optimal');
  });

  it('rewards a price well under the optimum with more demand', () => {
    expect(elasticity(30, 65).factor).toBeGreaterThan(1);
    expect(elasticity(30, 65).tone).toBe('cheap');
  });

  it('punishes a price well over the optimum with less demand', () => {
    expect(elasticity(150, 65).factor).toBeLessThan(0.2);
    expect(elasticity(150, 65).tone).toBe('overpriced');
  });
});

describe('onlineBaseline', () => {
  it('is the base amount at the weakest league', () => {
    expect(onlineBaseline(merchContent.weakestLevel)).toBe(merchContent.onlineBaseUnits);
  });

  it('grows the higher the club plays', () => {
    expect(onlineBaseline(0)).toBeGreaterThan(onlineBaseline(3));
  });
});

describe('sellMatchday', () => {
  it('sells nothing away from home beyond the online baseline', () => {
    const merch = base();
    const result = sellMatchday(merch, {
      attendance: 0,
      won: false,
      leagueLevel: 3,
      onlineFactor: 1,
      rng: createRng(1)
    });
    expect(result.unitsSold).toBeGreaterThan(0); // online channel still runs
    expect(result.revenue).toBeGreaterThan(0);
  });

  it('sells more with a bigger crowd', () => {
    const small = sellMatchday(base(), { attendance: 2000, won: false, leagueLevel: 3, onlineFactor: 1, rng: createRng(1) });
    const big = sellMatchday(base(), { attendance: 15000, won: false, leagueLevel: 3, onlineFactor: 1, rng: createRng(1) });
    expect(big.revenue).toBeGreaterThan(small.revenue);
  });

  it('sells more after a win than after a draw or a loss', () => {
    const lose = sellMatchday(base(), { attendance: 9000, won: false, leagueLevel: 3, onlineFactor: 1, rng: createRng(7) });
    const win = sellMatchday(base(), { attendance: 9000, won: true, leagueLevel: 3, onlineFactor: 1, rng: createRng(7) });
    expect(win.revenue).toBeGreaterThan(lose.revenue);
  });

  it('the online factor moves revenue even with no crowd at all', () => {
    const flat = sellMatchday(base(), { attendance: 0, won: false, leagueLevel: 3, onlineFactor: 1, rng: createRng(3) });
    const boosted = sellMatchday(base(), { attendance: 0, won: false, leagueLevel: 3, onlineFactor: 1.6, rng: createRng(3) });
    expect(boosted.revenue).toBeGreaterThan(flat.revenue);
  });

  it('never sells more than is in stock, and records the shortfall', () => {
    const merch = base();
    for (const id of Object.keys(merch.items)) merch.items[id]!.stock = 1;
    const result = sellMatchday(merch, { attendance: 20000, won: true, leagueLevel: 0, onlineFactor: 1.6, rng: createRng(1) });
    for (const item of Object.values(merch.items)) {
      expect(item.stock).toBeGreaterThanOrEqual(0);
      expect(item.lastSales.missed).toBeGreaterThan(0);
    }
    expect(result.unitsSold).toBeLessThanOrEqual(4);
  });
});

describe('setPrice', () => {
  it('never lets a price drop below 1', () => {
    const merch = base();
    setPrice(merch, 'jersey', -50);
    expect(merch.items.jersey!.price).toBe(1);
  });

  it('rounds to a whole number', () => {
    const merch = base();
    setPrice(merch, 'jersey', 42.7);
    expect(merch.items.jersey!.price).toBe(43);
  });
});

describe('restock', () => {
  it('adds the batch quantity to stock and quotes its cost', () => {
    const merch = base();
    const before = merch.items.jersey!.stock;
    const quote = restock(merch, 'jersey');
    expect(quote).toBeDefined();
    expect(merch.items.jersey!.stock).toBe(before + quote!.qty);
    expect(quote!.cost).toBe(restockQuote('jersey')!.cost);
  });

  it('returns undefined for an unknown item', () => {
    expect(restock(base(), 'nope')).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// wiring: the marketing director's 'merch.online' bonus must actually land
// ---------------------------------------------------------------------------

const registry = new Registry(modules);

function newGame(seedText: string, withStaff: string[] = []): GameState {
  const seed = seedFrom(seedText);
  const rng = createSeededRng(seed);
  const mods: Record<string, unknown> = {};
  for (const m of registry.all) mods[m.id] = m.state.create(rng.fork(m.id));
  const meta: MetaState = { seed, season: 1, matchday: 1, tick: 0, createdAt: 0, lastPlayedAt: 0 };
  const g: GameState = { meta, modules: mods as unknown as ModuleStates };
  applyNarrative(g.modules.progression, narratives[0]!);
  g.modules.progression.started = true;
  unlock(g.modules.progression, 'staff');
  unlock(g.modules.progression, 'merch');
  for (const id of withStaff) hire(g.modules.staff, id, 0);
  return g;
}

describe('merch effects reach the ledger', () => {
  it('a marketing director increases merch income over a few matchdays', () => {
    // Both games share a seed, so they play the identical fixture list and
    // crowd sizes — the only thing that can move revenue apart is the online
    // channel the marketing director's factor multiplies. Kept short so
    // neither run's stock runs out and masks the difference.
    const without = newGame('merchmkt');
    const with_ = newGame('merchmkt', ['marketingDir']);

    const revenue = (g: GameState) => {
      let total = 0;
      for (let i = 0; i < 5; i++) {
        const before = g.modules.finance.ledger.length;
        runTick(registry, g, 'matchday');
        total += g.modules.finance.ledger
          .slice(before)
          .filter((e) => e.source === 'merch')
          .reduce((s, e) => s + e.amount, 0);
      }
      return total;
    };

    expect(revenue(with_)).toBeGreaterThan(revenue(without));
  });
});
