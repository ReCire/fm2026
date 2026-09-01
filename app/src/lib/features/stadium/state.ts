import { z } from 'zod';

/**
 * What a ticket costs on day one.
 *
 * Exported because `priceAppetite` measures the crowd's patience against it.
 * A second copy of these three numbers in the rules would drift the moment
 * anybody retuned the opening stadium, and the drift would present as fans
 * mysteriously resenting the default price.
 */
export const OPENING_PRICES = { steh: 9, sitz: 15, vip: 45 } as const;
import type { Rng } from '$lib/engine/rng';

export const BlockSchema = z.object({
  name: z.string(),
  cap: z.number().int().min(0),
  foodLvl: z.number().int().min(0).max(3),
  merchLvl: z.number().int().min(0).max(3),
  toiletLvl: z.number().int().min(0).max(3),
  addSeats: z.number().int().min(0),
  cost: z.number().int().min(0)
});
export type Block = z.infer<typeof BlockSchema>;

export const StadiumSchema = z.object({
  blocks: z.record(z.string(), BlockSchema),
  ticketPrices: z.object({
    steh: z.number().min(0),
    sitz: z.number().min(0),
    vip: z.number().min(0)
  }),
  /** Fan mood, 0..100. Drives how full the ground gets. */
  fans: z.number().min(0).max(100),
  flutlicht: z.boolean(),
  rasenheizung: z.boolean(),
  videowalls: z.boolean(),
  dach: z.boolean()
});
export type StadiumState = z.infer<typeof StadiumSchema>;

declare module '$lib/engine/state' {
  interface ModuleStates {
    stadium: StadiumState;
  }
}

/** Blocks and prices ported verbatim from the prototype's `stadium` object. */
/**
 * The ground a fourth-division club actually has.
 *
 * This shipped as a 14.550-seat stadium with Bundesliga ticket prices — €12 to
 * stand, €24 to sit — which produced €169.000 per home game and €2,87 MILLION
 * across a season, against a wage bill of €352.000. Measured, not guessed: a
 * ledger breakdown over a simulated season showed gate receipts were 99% of all
 * income and everything else was rounding.
 *
 * The consequence was that no financial decision in the game could matter. You
 * could not overpay for a player, could not go under on wages, could not be
 * punished for an empty stand. A manager game where you cannot run out of money
 * is a screen with numbers on it.
 *
 * So: a Regionalliga ground at Regionalliga prices. About 3.400 places, a crowd
 * near 2.300, and roughly €27.000 a game — €457.000 across a season against
 * €352.000 of wages. A real margin, small enough that one expansion or one bad
 * run puts you under it, which is what makes the stadium screen a decision
 * rather than a progress bar.
 *
 * `balance.test.ts` asserts the season stays in this region, so it cannot drift
 * back without something going red.
 */
export function createStadium(_rng: Rng): StadiumState {
  return {
    blocks: {
      haupt:      { name: 'Nord-Unterrang',       cap: 500,  foodLvl: 0, merchLvl: 0, toiletLvl: 0, addSeats: 400, cost: 120_000 },
      hauptNord:  { name: 'Nord-Oberrang',        cap: 300,  foodLvl: 0, merchLvl: 0, toiletLvl: 0, addSeats: 300, cost: 105_000 },
      kurve:      { name: 'Südtribüne (Ultras)',  cap: 800,  foodLvl: 0, merchLvl: 0, toiletLvl: 0, addSeats: 600, cost: 100_000 },
      suedOber:   { name: 'Süd-Oberrang',         cap: 300,  foodLvl: 0, merchLvl: 0, toiletLvl: 0, addSeats: 300, cost: 105_000 },
      gegen:      { name: 'Ost-Gegengerade',      cap: 700,  foodLvl: 0, merchLvl: 0, toiletLvl: 0, addSeats: 600, cost: 155_000 },
      west:       { name: 'West-Haupttribüne',    cap: 500,  foodLvl: 0, merchLvl: 0, toiletLvl: 0, addSeats: 400, cost: 135_000 },
      vipLogen:   { name: 'VIP-Logen',            cap: 20,   foodLvl: 0, merchLvl: 0, toiletLvl: 0, addSeats: 10,  cost: 70_000 },
      gaeste:     { name: 'Gäste-Block',          cap: 300,  foodLvl: 0, merchLvl: 0, toiletLvl: 0, addSeats: 300, cost: 65_000 }
    },
    /*
     * Regionalliga prices, not Bundesliga ones. Nine euros to stand and fifteen
     * to sit is what a fourth-tier club in Germany actually charges; €12 and
     * €24 is what a club two divisions higher charges, and the difference was
     * being collected seventeen times a season.
     */
    ticketPrices: { ...OPENING_PRICES },
    fans: 75,
    flutlicht: false,
    rasenheizung: false,
    videowalls: false,
    dach: false
  };
}

export const STADIUM_VERSION = 1;
