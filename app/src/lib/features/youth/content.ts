import { z } from 'zod';

/**
 * Every number the youth academy depends on.
 *
 * The shape that matters: a prospect is deliberately WEAK right now. The bet
 * is entirely on `training/content.ts`'s `youthBonusPerYear` — a player under
 * `peakAgeFrom` (18) develops far faster than anyone else in the squad — so a
 * graduate only pays off if you keep training him for a season or two after he
 * arrives. Nothing here stores a "potential"; the existing age-based training
 * math is the whole mechanic.
 */
export const YouthContentSchema = z.object({
  maxLevel: z.number().int().min(1),
  /** Cost to raise the academy from level N to N+1 = N × this. */
  levelUpgradeCost: z.number().min(0),
  /** Prospect slots at level 1. */
  baseCapacity: z.number().int().min(1),
  /** Extra slots per level above 1. */
  capacityPerLevel: z.number().int().min(0),
  /** Strength floor at level 1. */
  strengthBase: z.number().int().min(1).max(99),
  /** Extra strength floor per level above 1 — a better academy finds better raw talent. */
  strengthPerLevel: z.number().int().min(0),
  /** Width of the strength window a scouted prospect is drawn from. */
  strengthSpread: z.number().int().min(0),
  /** A prospect is scouted in at this age range… */
  scoutAgeMin: z.number().int().min(14),
  scoutAgeMax: z.number().int().min(14),
  /** …and automatically graduates into the first team at this age. */
  graduationAge: z.number().int().min(15),
  /** Base cost of scouting one new prospect. */
  scoutCost: z.number().min(0),
  /** Scouting gets cheaper per level above 1 — better infrastructure, better contacts. */
  scoutCostDiscountPerLevel: z.number().min(0).max(1),
  /** Scouting can never get cheaper than this share of the base cost. */
  scoutCostFloor: z.number().min(0).max(1)
});
export type YouthContent = z.infer<typeof YouthContentSchema>;

export const youthContent: YouthContent = YouthContentSchema.parse({
  maxLevel: 5,
  levelUpgradeCost: 30_000,

  baseCapacity: 2,
  capacityPerLevel: 1,

  strengthBase: 28,
  strengthPerLevel: 3,
  strengthSpread: 10,

  scoutAgeMin: 15,
  scoutAgeMax: 17,
  graduationAge: 18,

  scoutCost: 12_000,
  scoutCostDiscountPerLevel: 0.06,
  scoutCostFloor: 0.6
});
