import { z } from 'zod';
import type { Rng } from '$lib/engine/rng';
import { PlayerSchema } from '../squad/state';
import { transferContent } from './content';
import { refreshMarket } from './rules';

/**
 * A player on offer, listed or contract-free.
 *
 * The prototype carried these as bare player objects and marked a free agent by
 * setting `p.marketValue = 0` and hanging a `signOnFee` property off him. That
 * destroyed the player's value permanently — he joined your squad worth
 * nothing, so no rival ever bid a sensible sum for him again. Here the price
 * lives on the listing and the player keeps his real market value.
 */
export const ListingSchema = z.object({
  id: z.string(),
  player: PlayerSchema,
  /** What the club pays to sign him: transfer fee, or sign-on for a free agent. */
  fee: z.number().min(0)
});
export type Listing = z.infer<typeof ListingSchema>;

/** Where a negotiation currently stands. Rendered to German in the screen. */
export const OFFER_STATUS = ['new', 'improved', 'demandAccepted'] as const;
export type OfferStatus = (typeof OFFER_STATUS)[number];

/**
 * A rival club's bid for one of your players.
 *
 * The player's details are copied onto the offer rather than looked up, because
 * an offer must still render sensibly for a player who has meanwhile left —
 * that is the case the prototype crashed through with an `alert()`.
 */
export const OfferSchema = z.object({
  id: z.string(),
  playerId: z.string(),
  playerName: z.string(),
  playerPos: z.string(),
  playerStrength: z.number().int(),
  /** Market value at the moment the bid was made. The negotiation is keyed off it. */
  marketValue: z.number().min(0),
  clubName: z.string(),
  currentBid: z.number().min(0),
  originalBid: z.number().min(0),
  /** Negotiation rounds used so far. 1 = the opening bid, untouched. */
  round: z.number().int().min(1),
  /** Matchdays left before the club loses interest. */
  expiresIn: z.number().int().min(0),
  status: z.enum(OFFER_STATUS)
});
export type Offer = z.infer<typeof OfferSchema>;

export const TransferSchema = z.object({
  market: z.array(ListingSchema),
  freeAgents: z.array(ListingSchema),
  offers: z.array(OfferSchema),
  /** Counts up to `refreshEveryMatchdays`, then the market turns over. */
  sinceRefresh: z.number().int().min(0),
  /**
   * Monotonic id source. The prototype minted ids with
   * `Math.random().toString(36)`, which is neither reproducible from a seed nor
   * collision-proof; a counter is both.
   */
  nextId: z.number().int().min(1)
});
export type TransferState = z.infer<typeof TransferSchema>;

declare module '$lib/engine/state' {
  interface ModuleStates {
    transfer: TransferState;
  }
}

export function createTransfer(rng: Rng): TransferState {
  const transfer: TransferState = {
    market: [],
    freeAgents: [],
    offers: [],
    sinceRefresh: 0,
    nextId: 1
  };
  refreshMarket(transfer, rng, { leagueLevel: transferContent.defaultLeagueLevel });
  return transfer;
}

export const TRANSFER_VERSION = 1;
