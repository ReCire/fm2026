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
   * Position in the negotiation RNG stream.
   *
   * A counter-offer is rolled when the player clicks, not during a tick, so it
   * cannot use the tick's RNG. Persisting the cursor keeps the roll seeded and
   * replayable anyway: the same save, the same clicks, the same answer — and
   * reloading a save does not re-roll a negotiation into a better outcome.
   */
  negotiationCursor: z.number().int().min(0),
  /**
   * What the club currently pays for a signing, as a multiplier.
   *
   * Cached from the bus every matchday because a signing happens when the
   * player clicks, outside any tick — and the context bus lives for exactly one
   * tick. Reading it live from the screen is impossible; recomputing it there
   * would mean the screen owning a second copy of the rule, which is how the
   * matchday screen came to show 60 while the match used 62.
   */
  feeFactor: z.number().min(0),
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
    negotiationCursor: 0,
    feeFactor: 1,
    nextId: 1
  };
  refreshMarket(transfer, rng, { leagueLevel: transferContent.defaultLeagueLevel });
  return transfer;
}

/** v2: caches the fee multiplier, which a screen cannot read off the bus. */
export const TRANSFER_VERSION = 2;

export function migrateTransfer(old: unknown, _from: number): TransferState {
  const base = old as TransferState;
  return { ...base, feeFactor: base.feeFactor ?? 1 };
}
