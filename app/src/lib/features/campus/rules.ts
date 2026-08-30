import { buildings, totalCost, buildable, type Building } from '$lib/content/campus';
import type { CampusState } from './state';

/**
 * What the club has built, what it may build, and what the next step costs.
 *
 * No I/O and no tick: building is something the player does on a screen, so
 * everything here is a pure question the screen can ask.
 */

/** Level owned, or -1 for a plot that is still grass. */
export function levelOf(campus: CampusState, buildingId: string): number {
  const level = campus.built[buildingId];
  return level === undefined ? -1 : level;
}

export function isBuilt(campus: CampusState, buildingId: string): boolean {
  return levelOf(campus, buildingId) >= 0;
}

/** The top level this building has. `costs.length - 1`, named. */
export function maxLevel(b: Building): number {
  return b.costs.length - 1;
}

export function isMaxed(campus: CampusState, b: Building): boolean {
  return levelOf(campus, b.id) >= maxLevel(b);
}

/**
 * What the next step costs, or undefined when there is no next step.
 *
 * The first entry in `costs` is the price of EXISTING at level 0, which is
 * often zero — several buildings start as a shed the club already has. So
 * "build" and "upgrade" are the same operation at different indices, and there
 * is no separate first-purchase path to get wrong.
 */
export function nextCost(campus: CampusState, b: Building): number | undefined {
  const next = levelOf(campus, b.id) + 1;
  if (next > maxLevel(b)) return undefined;
  return b.costs[next];
}

export interface BuildCheck {
  ok: boolean;
  /** Why not, in the player's words. Empty when ok. */
  reason: string;
}

export interface BuildContext {
  money: number;
  /** Which modules exist, for the same gate the badges and roles use. */
  registered: ReadonlySet<string>;
  /** Doctrine rank per id, for buildings that need one. */
  ranks: Record<string, number>;
}

export function canBuild(campus: CampusState, b: Building, ctx: BuildContext): BuildCheck {
  /*
   * The same gate as a dormant knowledge node and an undelegable department: a
   * building whose effect has nowhere to land must not be for sale. `module`
   * names where the effect goes, and if that module is not in the game the
   * building is a very expensive drawing.
   */
  if (b.module && !ctx.registered.has(b.module)) {
    return { ok: false, reason: 'Noch nicht verfügbar — der zugehörige Bereich fehlt im Spiel.' };
  }

  if (b.doctrine) {
    const rank = ctx.ranks[b.doctrine.id] ?? 0;
    if (rank < b.doctrine.rank) {
      return { ok: false, reason: `Erfordert Rang ${b.doctrine.rank} in der passenden Doktrin.` };
    }
  }

  const cost = nextCost(campus, b);
  if (cost === undefined) return { ok: false, reason: 'Vollständig ausgebaut.' };
  if (ctx.money < cost) return { ok: false, reason: 'Der Verein kann sich das gerade nicht leisten.' };

  return { ok: true, reason: '' };
}

/**
 * Build or upgrade. The caller charges, so the money leaves through the ledger
 * like every other cost in the game.
 */
export function build(campus: CampusState, b: Building): number | undefined {
  const cost = nextCost(campus, b);
  if (cost === undefined) return undefined;
  campus.built[b.id] = levelOf(campus, b.id) + 1;
  campus.invested += cost;
  return cost;
}

/** What the club has spent to reach where it is. For the summary. */
export function investedIn(campus: CampusState, b: Building): number {
  const level = levelOf(campus, b.id);
  return level < 0 ? 0 : totalCost(b, level);
}

/** How much of the campus is standing, counted over what is sellable. */
export function progress(campus: CampusState, registered: ReadonlySet<string>): {
  built: number; total: number;
} {
  const sellable = buildable(registered);
  return {
    built: sellable.filter((b) => isBuilt(campus, b.id)).length,
    total: sellable.length
  };
}

/** Every building, with what a screen needs to draw and price it. */
export function catalogue(campus: CampusState, ctx: BuildContext) {
  return buildings.map((b) => ({
    building: b,
    level: levelOf(campus, b.id),
    maxed: isMaxed(campus, b),
    cost: nextCost(campus, b),
    check: canBuild(campus, b, ctx)
  }));
}
