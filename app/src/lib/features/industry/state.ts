import { z } from 'zod';
import type { Rng } from '$lib/engine/rng';
import { industryContent } from './content';
import { refreshContracts } from './rules';

/**
 * The supply chain the club owns.
 *
 * Prices live in state because they MOVE — a market you cannot watch drift is
 * a price list. Everything static about a material or a factory stays in
 * content, so retuning the economy is a content edit.
 */
export const IndustrySchema = z.object({
  /** Material id → current price and warehouse stock. */
  materials: z.record(z.string(), z.object({
    price: z.number().min(0),
    stock: z.number().int().min(0),
    /** Change since last week, for the arrow. */
    delta: z.number()
  })),
  /** Factory id → level owned. Absent means not bought. */
  factories: z.record(z.string(), z.number().int().min(0)),
  warehouseLevel: z.number().int().min(1),
  /** What the plants made last week, for the report. */
  lastRun: z.array(z.object({
    factoryId: z.string(),
    units: z.number().int().min(0),
    materialCost: z.number().min(0),
    /** What the same units would have cost wholesale — the reason to own it. */
    wholesale: z.number().min(0)
  })),
  /**
   * Finished units waiting for a buyer, by `merch` item id.
   *
   * A stock of its own rather than straight onto the shop shelf: the shop sells
   * about nineteen units a week and the plants make hundreds, so pushing
   * production directly into it would bury a fan shop under scarves. Two
   * outlets draw from here — a B2B contract, or a transfer to the shop.
   */
  goods: z.record(z.string(), z.number().int().min(0)),
  /** Orders currently on the desk. */
  contracts: z.array(z.object({
    id: z.string(),
    club: z.string(),
    item: z.string(),
    units: z.number().int().min(1),
    payout: z.number().int().min(0),
    expiresIn: z.number().int().min(0)
  })),
  /** Contracts fulfilled over the career, for the report. */
  fulfilled: z.number().int().min(0),
  /** Total saved against wholesale, over the career. */
  saved: z.number()
});
export type IndustryState = z.infer<typeof IndustrySchema>;

declare module '$lib/engine/state' {
  interface ModuleStates {
    industry: IndustryState;
  }
}

export function createIndustry(_rng: Rng): IndustryState {
  const materials: IndustryState['materials'] = {};
  for (const m of industryContent.materials) {
    materials[m.id] = { price: m.basePrice, stock: m.initialStock, delta: 0 };
  }
  const industry: IndustryState = {
    materials, factories: {}, warehouseLevel: 1,
    goods: {}, contracts: [], fulfilled: 0, lastRun: [], saved: 0
  };
  /*
   * Orders on the desk from the first visit.
   *
   * They otherwise only appear on the first week tick, so the panel that
   * explains why a factory is worth owning greeted a new player with "Zurzeit
   * liegt nichts an." — the one screen where the answer had to be visible
   * showed the question instead.
   */
  refreshContracts(industry, _rng);
  return industry;
}

export const INDUSTRY_VERSION = 1;
