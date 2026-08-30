import { z } from 'zod';
import type { Rng } from '$lib/engine/rng';
import { merchContent } from './content';

/**
 * Merch owns the fan-shop catalogue: price and stock per item, and what sold
 * last matchday. Names, costs and the "recommended" price are content, not
 * state — they never change on their own, only the player's price does.
 */

export const MerchSalesSchema = z.object({
  units: z.number().int().min(0),
  revenue: z.number().min(0),
  missed: z.number().int().min(0)
});
export type MerchSales = z.infer<typeof MerchSalesSchema>;

export const MerchItemSchema = z.object({
  price: z.number().min(1),
  stock: z.number().int().min(0),
  lastSales: MerchSalesSchema
});
export type MerchItem = z.infer<typeof MerchItemSchema>;

export const MerchSchema = z.object({
  items: z.record(z.string(), MerchItemSchema)
});
export type MerchState = z.infer<typeof MerchSchema>;

declare module '$lib/engine/state' {
  interface ModuleStates {
    merch: MerchState;
  }
}

/** Every catalogue item starts at its recommended price — see content.ts. */
export function createMerch(_rng: Rng): MerchState {
  const items: MerchState['items'] = {};
  for (const def of merchContent.items) {
    items[def.id] = {
      price: def.optimalPrice,
      stock: def.initialStock,
      lastSales: { units: 0, revenue: 0, missed: 0 }
    };
  }
  return { items };
}

export const MERCH_VERSION = 1;
