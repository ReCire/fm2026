import type { Rng } from '$lib/engine/rng';
import { industryContent, materialById, factoryById, type Factory, type Contract } from './content';
import type { IndustryState } from './state';

const C = industryContent;

/**
 * The supply chain, as arithmetic.
 *
 * One question runs through all of it: is a unit cheaper to MAKE than to buy?
 * `merch` already sells a wholesale price per item, so every number here is
 * measured against one the player already knows.
 */

export function warehouseCapacity(industry: IndustryState): number {
  return industry.warehouseLevel * C.warehousePerLevel;
}

export function storedTotal(industry: IndustryState): number {
  return Object.values(industry.materials).reduce((sum, m) => sum + m.stock, 0);
}

export function spaceLeft(industry: IndustryState): number {
  return Math.max(0, warehouseCapacity(industry) - storedTotal(industry));
}

export function levelOf(industry: IndustryState, factoryId: string): number {
  const level = industry.factories[factoryId];
  return level === undefined ? -1 : level;
}

export function owns(industry: IndustryState, factoryId: string): boolean {
  return levelOf(industry, factoryId) >= 0;
}

export function maxLevel(f: Factory): number {
  return f.costs.length - 1;
}

/** What buying or upgrading this plant costs next, or undefined at the top. */
export function nextCost(industry: IndustryState, f: Factory): number | undefined {
  const next = levelOf(industry, f.id) + 1;
  return next > maxLevel(f) ? undefined : f.costs[next];
}

/** Units per week at the level currently owned. Zero when unowned. */
export function outputOf(industry: IndustryState, f: Factory): number {
  const level = levelOf(industry, f.id);
  return level < 0 ? 0 : (f.outputPerWeek[level] ?? 0);
}

/**
 * Move every price a little, within its band.
 *
 * Deliberately slow. A commodity market that swings forty percent a week is a
 * slot machine, and the decision this exists to support — buy now or wait — is
 * only a decision if there is a trend worth reading.
 */
export function driftPrices(industry: IndustryState, rng: Rng): void {
  for (const m of C.materials) {
    const entry = industry.materials[m.id];
    if (!entry) continue;
    const before = entry.price;
    /*
     * Pulled gently back toward base as well as pushed randomly, so a run of
     * bad luck cannot park a material at its ceiling for a season. A market
     * with no mean reversion is a market with a permanent winner.
     */
    const toward = (m.basePrice - entry.price) * 0.12;
    const noise = m.basePrice * rng.float(-C.weeklyDrift, C.weeklyDrift);
    const next = Math.min(m.maxPrice, Math.max(m.minPrice, entry.price + toward + noise));
    entry.price = Math.round(next * 100) / 100;
    entry.delta = Math.round((entry.price - before) * 100) / 100;
  }
}

export interface BuyQuote {
  units: number;
  cost: number;
  /** Trimmed to what the warehouse can actually hold. */
  limitedBySpace: boolean;
}

export function buyQuote(industry: IndustryState, materialId: string, wanted: number): BuyQuote {
  const entry = industry.materials[materialId];
  if (!entry) return { units: 0, cost: 0, limitedBySpace: false };
  const units = Math.max(0, Math.min(wanted, spaceLeft(industry)));
  return {
    units,
    cost: Math.round(units * entry.price),
    limitedBySpace: units < wanted
  };
}

/** Take delivery. The caller charges, so the money leaves through the ledger. */
export function buyMaterial(industry: IndustryState, materialId: string, units: number): number {
  const quote = buyQuote(industry, materialId, units);
  const entry = industry.materials[materialId];
  if (!entry || quote.units === 0) return 0;
  entry.stock += quote.units;
  return quote.cost;
}

export interface ProducedBatch {
  factoryId: string;
  /** The `merch` item id this stock belongs to. */
  itemId: string;
  units: number;
  materialCost: number;
  wholesale: number;
}

/**
 * Run the plants for a week.
 *
 * Each makes as many units as its material stock allows, up to its rated
 * output. Nothing is produced on credit: a factory with an empty warehouse
 * simply stands idle, which is the consequence that makes the commodity market
 * worth watching at all.
 *
 * Returns what was made rather than pushing it anywhere — the module posts the
 * units into `merch` and the cost into the ledger, because a rules file that
 * reached into two other modules would be the coupling this architecture spends
 * its whole budget avoiding.
 */
export function produce(industry: IndustryState, wholesaleOf: (itemId: string) => number): ProducedBatch[] {
  const batches: ProducedBatch[] = [];

  for (const f of C.factories) {
    const rated = outputOf(industry, f);
    if (rated <= 0) continue;

    const entry = industry.materials[f.material];
    if (!entry) continue;

    const affordable = f.perUnit > 0 ? Math.floor(entry.stock / f.perUnit) : rated;
    const units = Math.min(rated, affordable);
    if (units <= 0) continue;

    const used = units * f.perUnit;
    entry.stock = Math.max(0, Math.round(entry.stock - used));

    batches.push({
      factoryId: f.id,
      itemId: f.produces,
      units,
      materialCost: Math.round(used * entry.price),
      wholesale: Math.round(units * wholesaleOf(f.produces))
    });
  }

  return batches;
}

export function goodsOf(industry: IndustryState, itemId: string): number {
  return industry.goods[itemId] ?? 0;
}

/**
 * Put this week's production into finished goods.
 *
 * Separate from `produce` so the batch can be reported before it is banked,
 * and so nothing writes to two places at once.
 */
export function bankGoods(industry: IndustryState, batches: ProducedBatch[]): void {
  for (const b of batches) {
    industry.goods[b.itemId] = goodsOf(industry, b.itemId) + b.units;
  }
}

/** Whether an order can be filled from the shelf right now. */
export function canFulfil(industry: IndustryState, contract: Contract): boolean {
  return goodsOf(industry, contract.item) >= contract.units;
}

/**
 * Fill an order. Returns the payout, or undefined when the goods are not there.
 *
 * Nothing is produced to order and nothing is filled on credit: a contract you
 * cannot cover is a contract you watch expire, which is what makes accepting
 * one a bet on your own production rather than a free button.
 */
export function fulfil(industry: IndustryState, contract: Contract): number | undefined {
  if (!canFulfil(industry, contract)) return undefined;
  industry.goods[contract.item] = goodsOf(industry, contract.item) - contract.units;
  industry.contracts = industry.contracts.filter((c) => c.id !== contract.id);
  industry.fulfilled += 1;
  return contract.payout;
}

/** Age the desk by a week and drop what nobody took. */
export function expireContracts(industry: IndustryState): Contract[] {
  const gone: Contract[] = [];
  for (const c of industry.contracts) {
    c.expiresIn -= 1;
    if (c.expiresIn <= 0) gone.push(c as Contract);
  }
  industry.contracts = industry.contracts.filter((c) => c.expiresIn > 0);
  return gone;
}

/** Top the desk back up to `openContracts`, from the catalogue. */
export function refreshContracts(industry: IndustryState, rng: Rng): void {
  const open = new Set(industry.contracts.map((c) => c.id));
  const available = C.contracts.filter((c) => !open.has(c.id));
  while (industry.contracts.length < C.openContracts && available.length > 0) {
    const pick = available.splice(rng.int(0, available.length - 1), 1)[0]!;
    industry.contracts.push({ ...pick });
  }
}

/**
 * Move finished goods onto the shop shelf.
 *
 * Free, which is the point: `merch` otherwise restocks at a wholesale price per
 * unit, so a club that makes its own stock stops paying it. This is where
 * "cheaper to make than to buy" actually pays out — it is just not the reason
 * to own a factory, because the shop only absorbs a trickle.
 */
export function toShop(industry: IndustryState, itemId: string, units: number): number {
  const have = goodsOf(industry, itemId);
  const moved = Math.max(0, Math.min(units, have));
  industry.goods[itemId] = have - moved;
  return moved;
}

/** What owning the plants saved this week against buying the same units. */
export function savingOf(batches: ProducedBatch[]): number {
  return batches.reduce((sum, b) => sum + (b.wholesale - b.materialCost), 0);
}

/** Weeks of production the warehouse can still support, per factory. */
export function weeksOfStock(industry: IndustryState, f: Factory): number {
  const rated = outputOf(industry, f);
  const entry = industry.materials[f.material];
  if (rated <= 0 || !entry || f.perUnit <= 0) return 0;
  return Math.floor(entry.stock / (rated * f.perUnit));
}

export function canUpgradeWarehouse(industry: IndustryState): boolean {
  return industry.warehouseLevel < C.maxWarehouseLevel;
}
