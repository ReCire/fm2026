import { createRng, mixSeed, type Rng } from '$lib/engine/rng';
import { POSITIONS } from '../squad/positions';
import { createPlayer } from '../squad/rules';
import type { Player } from '../squad/state';
import type { YouthState } from './state';
import { youthContent } from './content';

/**
 * Youth academy rules. Pure functions over plain data, RNG always injected.
 */

function clampStrength(v: number): number {
  return Math.max(1, Math.min(99, Math.round(v)));
}

export function levelUpgradeCost(level: number): number {
  return Math.round(level * youthContent.levelUpgradeCost);
}

export function capacity(level: number): number {
  return youthContent.baseCapacity + (level - 1) * youthContent.capacityPerLevel;
}

/** The strength window a prospect is drawn from at this level. */
export function strengthBand(level: number): { min: number; max: number } {
  const min = clampStrength(youthContent.strengthBase + (level - 1) * youthContent.strengthPerLevel);
  return { min, max: clampStrength(min + youthContent.strengthSpread) };
}

/** What scouting one new prospect costs right now. */
export function scoutCost(level: number): number {
  const discount = Math.min(1 - youthContent.scoutCostFloor, (level - 1) * youthContent.scoutCostDiscountPerLevel);
  return Math.max(0, Math.round(youthContent.scoutCost * (1 - discount)));
}

export function canUpgrade(youth: YouthState): boolean {
  return youth.level < youthContent.maxLevel;
}

export function canScout(youth: YouthState): boolean {
  return youth.prospects.length < capacity(youth.level);
}

export function upgrade(youth: YouthState): void {
  if (!canUpgrade(youth)) return;
  youth.level += 1;
}

/**
 * A fresh prospect: `createPlayer`'s usual shape — attributes, wage, market
 * value, trait, a first contract — with the age overridden to a teenager.
 * Wage and market value are driven by strength alone (see squad/rules.ts), so
 * overriding age afterwards cannot leave them inconsistent with anything else
 * `createPlayer` produces.
 */
export function scoutProspect(rng: Rng, level: number): Player {
  const pos = rng.pick(POSITIONS);
  const band = strengthBand(level);
  const prospect = createPlayer(rng, pos, band.min, band.max);
  prospect.age = rng.int(youthContent.scoutAgeMin, youthContent.scoutAgeMax);
  return prospect;
}

/**
 * A Juwel: the same act as scouting, aimed higher and younger.
 *
 * Deliberately built on `scoutProspect`'s own band rather than on a fixed
 * range, so a doctrine that improves the academy improves its jewels too. The
 * prototype used a flat 62–72 regardless of academy level, which made the node
 * worth less every time the club got better at youth work — the one direction
 * an academy doctrine should never point.
 */
export function scoutJewel(rng: Rng, level: number): Player {
  const band = strengthBand(level);
  const bonus = youthContent.wonderkidBonus;
  const prospect = createPlayer(rng, rng.pick(POSITIONS), band.min + bonus, band.max + bonus);
  // The youngest the academy takes them. Age is half the gift.
  prospect.age = youthContent.scoutAgeMin;
  prospect.record.debutAge = prospect.age;
  return prospect;
}

export function scout(youth: YouthState, rng: Rng): Player | undefined {
  if (!canScout(youth)) return undefined;
  const prospect = scoutProspect(rng, youth.level);
  youth.prospects.push(prospect);
  return prospect;
}

/**
 * The RNG a player-initiated scouting trip rolls from.
 *
 * Scouting happens on a button click, outside any tick, so it cannot use the
 * engine's per-module tick stream — it derives a fresh one from the game seed
 * plus a cursor persisted in state, exactly as `transfer.negotiationRng` does,
 * so reloading a save cannot be used to re-roll a bad prospect into a better one.
 */
export function scoutRng(youth: YouthState, seed: number): Rng {
  const rng = createRng(mixSeed(seed, `youth.scout.${youth.scoutCursor}`));
  youth.scoutCursor += 1;
  return rng;
}

export interface SeasonOutcome {
  /** Prospects who came of age and moved to the first team. */
  graduates: Player[];
}

/**
 * A season passing over the academy: every prospect ages by one year, and
 * whoever reaches `graduationAge` graduates — the caller pushes them onto
 * `squad.players`, this function only decides who is ready and removes them
 * from the academy's own list.
 */
export function ageProspects(youth: YouthState): SeasonOutcome {
  const graduates: Player[] = [];
  const remaining: Player[] = [];

  for (const p of youth.prospects) {
    p.age += 1;
    if (p.age >= youthContent.graduationAge) graduates.push(p);
    else remaining.push(p);
  }

  youth.prospects = remaining;
  return { graduates };
}
