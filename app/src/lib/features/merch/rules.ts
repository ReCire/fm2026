import type { Rng } from '$lib/engine/rng';
import type { MerchState } from './state';
import { merchContent, type MerchItemDef } from './content';

/**
 * Merch rules, ported from `calculateElasticity()` and `simulateMerchSales()`.
 * Pure/mutating functions over plain data — no DOM, no `Math.random()`.
 */

const c = merchContent;

export function itemDef(itemId: string): MerchItemDef | undefined {
  return c.items.find((i) => i.id === itemId);
}

export type MarketTone = 'cheap' | 'low' | 'optimal' | 'expensive' | 'overpriced';

export interface Elasticity {
  factor: number;
  tone: MarketTone;
  label: string;
}

/**
 * How price versus the recommended price moves demand. Bands and factors are
 * verbatim from `calculateElasticity()`; only the presentation (a tone rather
 * than a hard-coded colour) changed, so the screen can pick a status token
 * instead of baking a hex value into a rules file.
 */
export function elasticity(price: number, optimalPrice: number): Elasticity {
  const ratio = price / optimalPrice;
  if (ratio <= 0.6) return { factor: 1.8, tone: 'cheap', label: 'Schleuderpreis' };
  if (ratio <= 0.85) return { factor: 1.35, tone: 'low', label: 'Günstig' };
  if (ratio <= 1.15) return { factor: 1.0, tone: 'optimal', label: 'Optimaler Preis' };
  if (ratio <= 1.45) return { factor: 0.55, tone: 'expensive', label: 'Teuer' };
  return { factor: Math.max(0.08, Math.pow(1 / ratio, 2.5)), tone: 'overpriced', label: 'Überteuert' };
}

/** Online-channel units before the marketing-director bonus, for a given league level. */
export function onlineBaseline(leagueLevel: number): number {
  return c.onlineBaseUnits + Math.max(0, c.weakestLevel - leagueLevel) * c.onlineLevelStep;
}

export interface SellOptions {
  /** Home attendance this matchday. 0 away from home — see module.ts for why. */
  attendance: number;
  won: boolean;
  leagueLevel: number;
  /** The `merch.online` factor from the bus. 1 with nobody hired. */
  onlineFactor: number;
  rng: Rng;
}

export interface SellResult {
  revenue: number;
  unitsSold: number;
}

/**
 * One matchday's sales across the whole catalogue.
 *
 * The crowd channel only has anything to sell on a home matchday (attendance
 * is 0 otherwise); the online channel runs every matchday and is the one a
 * marketing director's bonus actually multiplies, isolated here BEFORE it is
 * combined with the crowd channel so the effect lands where its own
 * documentation says it does.
 */
export function sellMatchday(merch: MerchState, opts: SellOptions): SellResult {
  const resultFactor = opts.won ? c.winMultiplier : c.otherResultMultiplier;
  const crowdUnits = opts.attendance * c.crowdUnitsPerFan * resultFactor;
  const onlineUnits = onlineBaseline(opts.leagueLevel) * opts.onlineFactor;
  const noise = 1 + opts.rng.float(-c.variance, c.variance);
  const totalUnits = (crowdUnits + onlineUnits) * noise;

  let revenue = 0;
  let unitsSold = 0;

  for (const def of c.items) {
    const item = merch.items[def.id];
    if (!item) continue;

    const el = elasticity(item.price, def.optimalPrice);
    const demand = Math.max(0, Math.round(totalUnits * def.weight * el.factor));
    const sold = Math.max(0, Math.min(item.stock, demand));

    item.stock -= sold;
    item.lastSales = { units: sold, revenue: sold * item.price, missed: Math.max(0, demand - sold) };

    revenue += item.lastSales.revenue;
    unitsSold += sold;
  }

  return { revenue, unitsSold };
}

export function setPrice(merch: MerchState, itemId: string, price: number): void {
  const item = merch.items[itemId];
  if (!item) return;
  item.price = Math.max(1, Math.round(price));
}

export interface RestockQuote {
  itemId: string;
  qty: number;
  cost: number;
}

export function restockQuote(itemId: string): RestockQuote | undefined {
  const def = itemDef(itemId);
  if (!def) return undefined;
  return { itemId, qty: def.restockBatch, cost: def.cost * def.restockBatch };
}

/** Adds one wholesale batch to stock. Returns what it cost, or undefined for an unknown item. */
export function restock(merch: MerchState, itemId: string): RestockQuote | undefined {
  const quote = restockQuote(itemId);
  if (!quote) return undefined;
  const item = merch.items[itemId];
  if (!item) return undefined;

  item.stock += quote.qty;
  return quote;
}
