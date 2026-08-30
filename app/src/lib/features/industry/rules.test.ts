import { describe, it, expect } from 'vitest';
import { createRng } from '$lib/engine/rng';
import { Registry } from '$lib/engine/registry';
import { runTick } from '$lib/engine/clock';
import { modules } from '$lib/modules';
import type { GameState, MetaState, ModuleStates } from '$lib/engine/state';
import { applyNarrative, unlock } from '../progression/rules';
import { narratives } from '../progression/content';
import { seedFrom } from '$lib/engine/rng';
import { industryContent, factoryById } from './content';
import { merchContent } from '../merch/content';
import { createIndustry } from './state';
import {
  warehouseCapacity, storedTotal, spaceLeft, levelOf, owns, maxLevel, nextCost,
  outputOf, driftPrices, buyQuote, buyMaterial, produce, savingOf, weeksOfStock,
  goodsOf, bankGoods, canFulfil, fulfil, expireContracts, refreshContracts, toShop
} from './rules';

const registry = new Registry(modules);
const fresh = () => createIndustry(createRng(1));
const wholesaleOf = (id: string) => merchContent.items.find((i) => i.id === id)?.cost ?? 0;

function career(seedText = 'industry'): GameState {
  const seed = seedFrom(seedText);
  const rng = createRng(seed);
  const mods: Record<string, unknown> = {};
  for (const m of registry.all) mods[m.id] = m.state.create(rng.fork(m.id));
  const meta: MetaState = { seed, season: 1, matchday: 1, tick: 0, createdAt: 0, lastPlayedAt: 0 };
  const g: GameState = { meta, modules: mods as unknown as ModuleStates };
  applyNarrative(g.modules.progression, narratives[0]!);
  g.modules.progression.started = true;
  unlock(g.modules.progression, 'industry');
  unlock(g.modules.progression, 'merch');
  return g;
}

describe('the chain connects to the shop it exists for', () => {
  /*
   * The whole justification for this feature. `merch` already restocks at a
   * wholesale price, so a factory is worth owning only if it puts the same
   * units on the same shelf for less. A plant producing into a warehouse
   * nobody sells from would be a second economy running beside the club.
   */
  it('every factory makes something the fan shop actually sells', () => {
    const sold = new Set(merchContent.items.map((i) => i.id));
    for (const f of industryContent.factories) {
      expect(sold, `${f.id} produces "${f.produces}", which no shop item matches`)
        .toContain(f.produces);
    }
  });

  it('production lands in finished goods, not straight on the shop shelf', () => {
    const g = career();
    const f = industryContent.factories[0]!;
    g.modules.industry.factories[f.id] = 0;
    const shelfBefore = g.modules.merch.items[f.produces]!.stock;

    runTick(registry, g, 'week');

    expect(goodsOf(g.modules.industry, f.produces), 'the plant produced into nowhere')
      .toBeGreaterThan(0);
    /* The shop sells about nineteen units a week and the plants make hundreds.
       Pushing production straight into `merch` would bury a fan shop under
       scarves — measured before it shipped, which is the only reason it did not. */
    expect(g.modules.merch.items[f.produces]!.stock, 'production flooded the shop')
      .toBe(shelfBefore);
  });

  it('making a unit beats buying one at base prices, or the shelf transfer is pointless', () => {
    for (const f of industryContent.factories) {
      const m = industryContent.materials.find((x) => x.id === f.material)!;
      const made = m.basePrice * f.perUnit;
      expect(made, `${f.id}: making costs more than buying even at base price`)
        .toBeLessThan(wholesaleOf(f.produces));
    }
  });

  /*
   * Payback is measured against CONTRACTS, because that is what a factory is
   * for. Measured against the fan shop it was twenty-eight seasons for the ball
   * plant, which is how the whole scale problem surfaced.
   */
  it('pays for itself out of contract work within a few seasons', () => {
    for (const f of industryContent.factories) {
      const m = industryContent.materials.find((x) => x.id === f.material)!;
      const order = industryContent.contracts.find((c) => c.item === f.produces);
      expect(order, `${f.produces} has no B2B demand at all`).toBeTruthy();

      const perUnit = order!.payout / order!.units - m.basePrice * f.perUnit;
      expect(perUnit, `${f.id}: an order pays less than the material costs`).toBeGreaterThan(0);

      const weekly = perUnit * f.outputPerWeek[0]!;
      const seasons = f.costs[0]! / (weekly * 34);
      expect(seasons, `${f.id} pays back in ${seasons.toFixed(1)} seasons`).toBeGreaterThan(0.4);
      expect(seasons, `${f.id} pays back in ${seasons.toFixed(1)} seasons`).toBeLessThan(5);
    }
  });
});

describe('the market moves, but not like a slot machine', () => {
  it('stays inside every material’s band, over a long run', () => {
    const industry = fresh();
    for (let week = 0; week < 400; week++) driftPrices(industry, createRng(week));
    for (const m of industryContent.materials) {
      const price = industry.materials[m.id]!.price;
      expect(price, `${m.id} left its band`).toBeGreaterThanOrEqual(m.minPrice);
      expect(price).toBeLessThanOrEqual(m.maxPrice);
    }
  });

  /* Without mean reversion a market has a permanent winner: buy once at a low
     and be right forever. */
  it('is pulled back toward base rather than wandering off', () => {
    const industry = fresh();
    const m = industryContent.materials[0]!;
    industry.materials[m.id]!.price = m.maxPrice;
    for (let week = 0; week < 60; week++) driftPrices(industry, createRng(week));
    expect(industry.materials[m.id]!.price).toBeLessThan(m.maxPrice);
  });

  it('reports the change, so the arrow is not a guess', () => {
    const industry = fresh();
    driftPrices(industry, createRng(7));
    for (const m of industryContent.materials) {
      const e = industry.materials[m.id]!;
      expect(Math.abs(e.delta), `${m.id} moved further than one week allows`)
        .toBeLessThanOrEqual(m.basePrice * industryContent.weeklyDrift + m.basePrice * 0.13);
    }
  });

  it('is deterministic for a seed', () => {
    const a = fresh(); const b = fresh();
    for (let i = 0; i < 20; i++) { driftPrices(a, createRng(i)); driftPrices(b, createRng(i)); }
    expect(a.materials).toEqual(b.materials);
  });
});

describe('the warehouse is the constraint that makes buying a decision', () => {
  it('trims an order to the space left rather than refusing it', () => {
    const industry = fresh();
    const room = spaceLeft(industry);
    const quote = buyQuote(industry, 'cotton', room + 5000);
    expect(quote.units).toBe(room);
    expect(quote.limitedBySpace).toBe(true);
  });

  it('buys nothing at all when the warehouse is full', () => {
    const industry = fresh();
    industry.materials.cotton!.stock = warehouseCapacity(industry);
    for (const id of ['wool', 'leather', 'plastic']) industry.materials[id]!.stock = 0;
    expect(buyQuote(industry, 'wool', 100).units).toBe(0);
    expect(buyMaterial(industry, 'wool', 100)).toBe(0);
  });

  it('counts every material against one capacity', () => {
    const industry = fresh();
    const total = industryContent.materials
      .reduce((sum, m) => sum + industry.materials[m.id]!.stock, 0);
    expect(storedTotal(industry)).toBe(total);
  });
});

describe('a factory with no material stands still', () => {
  /* The consequence that makes the commodity market worth watching. Nothing is
     produced on credit. */
  it('produces nothing when the warehouse is empty', () => {
    const industry = fresh();
    const f = industryContent.factories[0]!;
    industry.factories[f.id] = 0;
    industry.materials[f.material]!.stock = 0;
    expect(produce(industry, wholesaleOf)).toEqual([]);
  });

  it('produces only as much as the material allows', () => {
    const industry = fresh();
    const f = industryContent.factories[0]!;
    industry.factories[f.id] = 0;
    industry.materials[f.material]!.stock = Math.floor(f.perUnit * 5);
    const [batch] = produce(industry, wholesaleOf);
    expect(batch!.units).toBeLessThanOrEqual(5);
    expect(batch!.units).toBeGreaterThan(0);
  });

  it('consumes the material it used', () => {
    const industry = fresh();
    const f = industryContent.factories[0]!;
    industry.factories[f.id] = 0;
    const before = industry.materials[f.material]!.stock;
    const [batch] = produce(industry, wholesaleOf);
    expect(industry.materials[f.material]!.stock)
      .toBe(Math.round(before - batch!.units * f.perUnit));
  });

  it('an unowned factory produces nothing at all', () => {
    expect(produce(fresh(), wholesaleOf)).toEqual([]);
  });

  it('reports the saving against wholesale, which is the point', () => {
    const industry = fresh();
    const f = industryContent.factories[0]!;
    industry.factories[f.id] = 0;
    const batches = produce(industry, wholesaleOf);
    expect(savingOf(batches)).toBeGreaterThan(0);
  });

  it('reports weeks of stock left, so idleness is foreseeable', () => {
    const industry = fresh();
    const f = industryContent.factories[0]!;
    industry.factories[f.id] = 0;
    expect(weeksOfStock(industry, f)).toBeGreaterThan(0);
    industry.materials[f.material]!.stock = 0;
    expect(weeksOfStock(industry, f)).toBe(0);
  });
});

describe('owning and upgrading', () => {
  it('an unbought plant reads as -1, not level zero', () => {
    const industry = fresh();
    const f = industryContent.factories[0]!;
    expect(levelOf(industry, f.id)).toBe(-1);
    expect(owns(industry, f.id)).toBe(false);
    expect(outputOf(industry, f)).toBe(0);
  });

  it('walks the cost list one step at a time and stops at the top', () => {
    const industry = fresh();
    const f = industryContent.factories[0]!;
    for (let level = 0; level <= maxLevel(f); level++) {
      expect(nextCost(industry, f)).toBe(f.costs[level]);
      industry.factories[f.id] = level;
    }
    expect(nextCost(industry, f)).toBeUndefined();
  });

  it('each level produces more than the one below', () => {
    for (const f of industryContent.factories) {
      for (let i = 1; i < f.outputPerWeek.length; i++) {
        expect(f.outputPerWeek[i]!, `${f.id} level ${i} is not an upgrade`)
          .toBeGreaterThan(f.outputPerWeek[i - 1]!);
      }
    }
  });
});

describe('B2B is the demand that justifies a plant', () => {
  it('every produced item has somebody who orders it in bulk', () => {
    for (const f of industryContent.factories) {
      const orders = industryContent.contracts.filter((c) => c.item === f.produces);
      expect(orders.length, `nobody ever orders ${f.produces}`).toBeGreaterThan(0);
      // In bulk: an order the fan shop could absorb is not a reason for a factory.
      expect(Math.max(...orders.map((o) => o.units))).toBeGreaterThan(100);
    }
  });

  it('will not deliver what is not on the shelf', () => {
    const industry = fresh();
    const c = { ...industryContent.contracts[0]! };
    industry.contracts = [c];
    expect(canFulfil(industry, c)).toBe(false);
    expect(fulfil(industry, c)).toBeUndefined();
    expect(industry.contracts, 'a failed delivery removed the order').toHaveLength(1);
  });

  it('delivers, pays, and consumes the goods exactly once', () => {
    const industry = fresh();
    const c = { ...industryContent.contracts[0]! };
    industry.contracts = [c];
    industry.goods[c.item] = c.units + 25;

    expect(fulfil(industry, c)).toBe(c.payout);
    expect(goodsOf(industry, c.item)).toBe(25);
    expect(industry.contracts).toHaveLength(0);
    expect(industry.fulfilled).toBe(1);
    // And cannot be delivered twice.
    expect(fulfil(industry, c)).toBeUndefined();
  });

  it('ages the desk and drops what nobody took', () => {
    const industry = fresh();
    industry.contracts = [{ ...industryContent.contracts[0]!, expiresIn: 1 }];
    expect(expireContracts(industry)).toHaveLength(1);
    expect(industry.contracts).toHaveLength(0);
  });

  it('keeps the desk stocked without ever offering the same order twice', () => {
    const industry = fresh();
    refreshContracts(industry, createRng(3));
    expect(industry.contracts).toHaveLength(industryContent.openContracts);
    refreshContracts(industry, createRng(4));
    const ids = industry.contracts.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('moving goods to the shop is free and capped at what exists', () => {
    const industry = fresh();
    industry.goods.jersey = 30;
    expect(toShop(industry, 'jersey', 100)).toBe(30);
    expect(goodsOf(industry, 'jersey')).toBe(0);
    expect(toShop(industry, 'jersey', 10)).toBe(0);
  });

  it('banks a batch into goods', () => {
    const industry = fresh();
    bankGoods(industry, [{ factoryId: 'x', itemId: 'jersey', units: 12, materialCost: 1, wholesale: 2 }]);
    expect(goodsOf(industry, 'jersey')).toBe(12);
  });
});

describe('the badge', () => {
  it('names an idle plant and says nothing otherwise', () => {
    const g = career();
    const mod = registry.byId.get('industry')!;
    expect(mod.attention!(g), 'a club with no factories was nagged').toEqual([]);

    const f = industryContent.factories[0]!;
    g.modules.industry.factories[f.id] = 0;
    g.modules.industry.materials[f.material]!.stock = 0;
    const items = mod.attention!(g);
    expect(items.map((i) => i.id)).toContain('industry.idle');
    expect(items[0]!.urgency).toBe('now');
  });

  it('flags an order that can be delivered, because it expires', () => {
    const g = career();
    const mod = registry.byId.get('industry')!;
    const c = { ...industryContent.contracts[0]! };
    g.modules.industry.contracts = [c];
    g.modules.industry.goods[c.item] = c.units;
    expect(mod.attention!(g).map((i) => i.id)).toContain('industry.ready');
  });
});

describe('content holds together', () => {
  it('every factory names a material that exists', () => {
    for (const f of industryContent.factories) {
      expect(industryContent.materials.map((m) => m.id), `${f.id}`).toContain(f.material);
      expect(factoryById(f.id)).toBeTruthy();
    }
  });

  it('one factory per shop item — no two plants make the same thing', () => {
    const made = industryContent.factories.map((f) => f.produces);
    expect(new Set(made).size).toBe(made.length);
  });
});
