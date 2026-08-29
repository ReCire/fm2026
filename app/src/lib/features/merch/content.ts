import { z } from 'zod';

/**
 * Every tunable number the fan shop depends on.
 *
 * The prototype's `simulateMerchSales()` split demand into a stadium, a city
 * and an online channel. Here that becomes two: a CROWD channel that only
 * exists on a home matchday (sized off `stadium.attendance`) and an ONLINE
 * channel that runs every matchday regardless of the fixture — because that
 * second channel is specifically what a marketing director's `merch.online`
 * bonus multiplies (see staff/content.ts), and a bonus that cannot be pointed
 * at anything is the invisible-stat bug this codebase keeps re-finding.
 *
 * Sizing: gate receipts run about 169.000 € a season in Liga 4 against a wage
 * bill of roughly 510.000 €. At Liga 4 / neutral form, an average home crowd
 * of ~9.800 plus the online baseline works out to roughly 2.000 € of
 * merchandise revenue per matchday — about 34.000 € over a season, well under
 * a fifth of gate receipts. See docs.ts for the full arithmetic.
 */

export const MerchItemDefSchema = z.object({
  id: z.string(),
  name: z.string(),
  /** Wholesale cost per unit, paid the moment stock is ordered. */
  cost: z.number().min(0),
  /** The price demand is measured against. Selling away from it moves `elasticity`. */
  optimalPrice: z.number().min(1),
  /** Share of total unit demand this item takes, across every channel. All items must sum to 1. */
  weight: z.number().min(0).max(1),
  initialStock: z.number().int().min(0),
  /** Units added per "Nachbestellen" click. */
  restockBatch: z.number().int().min(1)
});
export type MerchItemDef = z.infer<typeof MerchItemDefSchema>;

export const MerchContentSchema = z
  .object({
    items: z.array(MerchItemDefSchema).min(1),
    /** Units sold in the CROWD channel per attendee, at the optimal price and a non-win result. */
    crowdUnitsPerFan: z.number().min(0),
    /** Multiplier on the crowd channel after a win. */
    winMultiplier: z.number().min(0),
    /** Multiplier on the crowd channel after a draw or a loss. */
    otherResultMultiplier: z.number().min(0),
    /** ONLINE-channel units per matchday at the weakest league level, home or away. */
    onlineBaseUnits: z.number().min(0),
    /** Extra online units per league level above the weakest one. */
    onlineLevelStep: z.number().min(0),
    /** The league level `onlineBaseUnits` describes — Liga 4, where a career starts. */
    weakestLevel: z.number().int().min(0),
    /** Random demand noise applied to the whole matchday, so sales are never a spreadsheet. */
    variance: z.number().min(0).max(1)
  })
  .refine((c) => Math.abs(c.items.reduce((s, i) => s + i.weight, 0) - 1) < 1e-6, {
    message: 'item weights must sum to 1',
    path: ['items']
  });
export type MerchContent = z.infer<typeof MerchContentSchema>;

export const merchContent: MerchContent = MerchContentSchema.parse({
  items: [
    { id: 'jersey', name: 'Heimtrikot', cost: 14, optimalPrice: 65, weight: 0.35, initialStock: 150, restockBatch: 50 },
    { id: 'scarf', name: 'Fan-Schal', cost: 4, optimalPrice: 18, weight: 0.25, initialStock: 300, restockBatch: 100 },
    { id: 'cap', name: 'Kappe', cost: 5, optimalPrice: 22, weight: 0.15, initialStock: 200, restockBatch: 75 },
    { id: 'ball', name: 'Spielball', cost: 9, optimalPrice: 35, weight: 0.25, initialStock: 100, restockBatch: 40 }
  ],
  // 9.800 attendees (Liga 4, average mood) * 0.004 * 0.9 ≈ 35 crowd units at
  // the optimal price on a typical, non-winning home matchday.
  crowdUnitsPerFan: 0.004,
  winMultiplier: 1.3,
  otherResultMultiplier: 0.9,
  onlineBaseUnits: 10,
  onlineLevelStep: 4,
  weakestLevel: 3,
  variance: 0.1
});
