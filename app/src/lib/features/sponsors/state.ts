import { z } from 'zod';
import type { Rng } from '$lib/engine/rng';

/**
 * Sponsors owns one contract slot: a company backs the club for a fixed
 * number of matchdays, then it is over and a fresh set of offers appears.
 *
 * The prototype's `game.sponsor` was a single object set once at game start
 * and never renegotiated — there was no offer, no expiry, no decision. Here
 * the whole point is the decision: a short, rich deal against a smaller, long
 * one, regenerated from the club's league level and recent form every time
 * the slot comes open.
 */

export const MATCH_RESULTS = ['win', 'draw', 'loss'] as const;
export type MatchResult = (typeof MATCH_RESULTS)[number];

export const SponsorOfferSchema = z.object({
  id: z.string(),
  /** Which archetype in content.ts this was rolled from — short/balanced/long. */
  archetypeId: z.string(),
  name: z.string(),
  /** One-off signing bonus, paid the moment the offer is signed. */
  fee: z.number().min(0),
  /** Paid every matchday for as long as the contract runs. */
  periodic: z.number().min(0),
  /** Extra payout on a matchday the club wins. */
  winBonus: z.number().min(0),
  duration: z.number().int().min(1)
});
export type SponsorOffer = z.infer<typeof SponsorOfferSchema>;

export const ActiveSponsorSchema = z.object({
  name: z.string(),
  periodic: z.number().min(0),
  winBonus: z.number().min(0),
  matchdaysRemaining: z.number().int().min(0),
  totalDuration: z.number().int().min(1)
});
export type ActiveSponsor = z.infer<typeof ActiveSponsorSchema>;

export const SponsorsSchema = z.object({
  active: ActiveSponsorSchema.nullable(),
  /** Empty except when the slot is open and waiting for a decision. */
  offers: z.array(SponsorOfferSchema),
  /**
   * Most recent result last. Capped at `sponsorsContent.formWindow` — see
   * content.ts for why a short window rather than a season-long record.
   */
  recentForm: z.array(z.enum(MATCH_RESULTS)),
  /** Monotonic id source, so offer ids never collide and never need `Math.random()`. */
  nextId: z.number().int().min(1)
});
export type SponsorsState = z.infer<typeof SponsorsSchema>;

declare module '$lib/engine/state' {
  interface ModuleStates {
    sponsors: SponsorsState;
  }
}

/**
 * No active contract and no offers at creation: `league.level` is not
 * available yet at state-creation time (every module's `create()` runs in
 * isolation — see AUTHORING.md), so the first matchday tick generates the
 * opening offers from the real league level instead of a guess made here.
 */
export function createSponsors(_rng: Rng): SponsorsState {
  return { active: null, offers: [], recentForm: [], nextId: 1 };
}

export const SPONSORS_VERSION = 1;
