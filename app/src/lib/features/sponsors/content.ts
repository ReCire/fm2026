import { z } from 'zod';

/**
 * Every tunable number the sponsoring slot depends on.
 *
 * The three archetypes below are the whole feature: a short, rich deal; a
 * balanced middle; and a long, modest one. All three describe the SAME club —
 * Liga 4, neutral recent form — and are scaled up together by `levelFactor`
 * and `formFactor` in rules.ts, so climbing the pyramid or going on a run
 * makes every offer bigger without changing the shape of the choice.
 *
 * Sizing: gate receipts run about 169.000 € a season in Liga 4 against a wage
 * bill of roughly 510.000 €. Sponsors is meant to be a real but MINOR income
 * line next to the gate, not a second stadium — so these numbers are tuned so
 * that even chaining short deals back-to-back all season lands well under
 * gate receipts. See docs.ts for the number-by-number reasoning.
 */

export const SponsorArchetypeSchema = z.object({
  id: z.string(),
  label: z.string(),
  /** One-off signing bonus, at Liga 4 / neutral form. */
  fee: z.number().min(0),
  /** Paid every matchday for the contract's duration, at Liga 4 / neutral form. */
  periodic: z.number().min(0),
  /** Extra payout on a win, at Liga 4 / neutral form. */
  winBonus: z.number().min(0),
  duration: z.number().int().min(1)
});
export type SponsorArchetype = z.infer<typeof SponsorArchetypeSchema>;

export const SponsorsContentSchema = z.object({
  archetypes: z.array(SponsorArchetypeSchema).min(1),
  /** Sponsor company names. Offers draw from this pool without repeats where possible. */
  names: z.array(z.string().min(1)).min(1),
  /** Extra multiplier per league level ABOVE `weakestLevel`. league.level counts down to 0 at the top. */
  levelStep: z.number().min(0),
  /** The league level every archetype's base numbers describe — Liga 4, where a career starts. */
  weakestLevel: z.number().int().min(0),
  /** How many recent results `formFactor` looks at. */
  formWindow: z.number().int().min(1),
  /** Multiplier at 0% recent win rate. */
  formFloor: z.number().min(0),
  /** Added to `formFloor` at a 100% recent win rate. */
  formSpread: z.number().min(0),
  /** Random spread applied to every rolled offer, so the table is never a lookup. */
  variance: z.number().min(0).max(1),
  /** Fee sums are rounded to this step, so they look like a human quoted them. */
  feeRoundingStep: z.number().min(1),
  /** Periodic and win-bonus sums are rounded to this smaller step. */
  payoutRoundingStep: z.number().min(1)
});
export type SponsorsContent = z.infer<typeof SponsorsContentSchema>;

export const sponsorsContent: SponsorsContent = SponsorsContentSchema.parse({
  archetypes: [
    /*
     * Big money now, gone in six matchdays — good for a club that needs cash
     * THIS window (a transfer, a stadium block) and is willing to be back at
     * the negotiating table a lot.
     */
    { id: 'short', label: 'Kurzzeitig', fee: 10_000, periodic: 250, winBonus: 150, duration: 6 },
    { id: 'balanced', label: 'Ausgewogen', fee: 5_000, periodic: 380, winBonus: 120, duration: 12 },
    /*
     * Almost no signing bonus, but it keeps paying for two-thirds of a season
     * without you having to think about it again.
     */
    { id: 'long', label: 'Langfristig', fee: 2_000, periodic: 500, winBonus: 100, duration: 24 }
  ],
  names: [
    'Sparkasse Niederrhein',
    'Autohaus Grundmann',
    'Brauerei Falkenstein',
    'Radio Sportwelle',
    'Media Losch',
    'Fleischerei Vogt',
    'Häusler Bau',
    'Rheinland Versicherung',
    'TechnoPark Solutions',
    'Grüne Wiese Energie'
  ],
  levelStep: 0.35,
  weakestLevel: 3,
  formWindow: 5,
  formFloor: 0.85,
  formSpread: 0.3,
  variance: 0.1,
  feeRoundingStep: 500,
  payoutRoundingStep: 10
});
