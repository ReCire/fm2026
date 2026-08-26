import { z } from 'zod';
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
export function createStadium(_rng: Rng): StadiumState {
  return {
    blocks: {
      haupt:      { name: 'Nord-Unterrang',       cap: 2000, foodLvl: 0, merchLvl: 0, toiletLvl: 0, addSeats: 500,  cost: 160_000 },
      hauptNord:  { name: 'Nord-Oberrang',        cap: 1500, foodLvl: 0, merchLvl: 0, toiletLvl: 0, addSeats: 500,  cost: 140_000 },
      kurve:      { name: 'Südtribüne (Ultras)',  cap: 3000, foodLvl: 0, merchLvl: 0, toiletLvl: 0, addSeats: 1000, cost: 130_000 },
      suedOber:   { name: 'Süd-Oberrang',         cap: 1500, foodLvl: 0, merchLvl: 0, toiletLvl: 0, addSeats: 500,  cost: 140_000 },
      gegen:      { name: 'Ost-Gegengerade',      cap: 3000, foodLvl: 0, merchLvl: 0, toiletLvl: 0, addSeats: 1000, cost: 210_000 },
      west:       { name: 'West-Haupttribüne',    cap: 2000, foodLvl: 0, merchLvl: 0, toiletLvl: 0, addSeats: 500,  cost: 180_000 },
      vipLogen:   { name: 'VIP-Logen',            cap: 50,   foodLvl: 0, merchLvl: 0, toiletLvl: 0, addSeats: 25,   cost: 95_000 },
      gaeste:     { name: 'Gäste-Block',          cap: 1500, foodLvl: 0, merchLvl: 0, toiletLvl: 0, addSeats: 500,  cost: 85_000 }
    },
    ticketPrices: { steh: 12, sitz: 24, vip: 80 },
    fans: 75,
    flutlicht: false,
    rasenheizung: false,
    videowalls: false,
    dach: false
  };
}

export const STADIUM_VERSION = 1;
