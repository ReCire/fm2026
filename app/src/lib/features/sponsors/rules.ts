import type { Rng } from '$lib/engine/rng';
import type { ActiveSponsor, MatchResult, SponsorOffer, SponsorsState } from './state';
import { sponsorsContent } from './content';

/**
 * Sponsors rules. Pure/mutating functions over plain data, ported from the
 * IDEA of the prototype's `game.sponsor` (a base + a win bonus) and its kit
 * suppliers (a signing fee vs. a running income) — recombined into offers
 * that arrive, get chosen, run out, and get replaced, which the prototype
 * never did after game start.
 */

const c = sponsorsContent;

function roundToStep(value: number, step: number): number {
  return Math.round(value / step) * step;
}

/**
 * How much bigger an offer gets per league level above Liga 4.
 * `leagueLevel` counts down towards the top flight — 0 is the best division —
 * so a promoted club sees richer sponsors without this file knowing anything
 * about promotion.
 */
export function levelFactor(leagueLevel: number): number {
  return 1 + Math.max(0, c.weakestLevel - leagueLevel) * c.levelStep;
}

/**
 * How much recent form moves an offer, 0.85 (a bad run) .. 1.15 (a hot one).
 * Empty history — the very first offers of a career — is neutral rather than
 * penalised for a season that has not happened yet.
 */
export function formFactor(recentForm: readonly MatchResult[]): number {
  if (recentForm.length === 0) return 1;
  const score = recentForm.reduce((s, r) => s + (r === 'win' ? 1 : r === 'draw' ? 0.5 : 0), 0);
  const winRate = score / recentForm.length;
  return c.formFloor + winRate * c.formSpread;
}

function nextId(sponsors: SponsorsState): string {
  const id = `spons${sponsors.nextId}`;
  sponsors.nextId += 1;
  return id;
}

/**
 * Fresh offers, one per archetype. Replaces whatever was on the table —
 * exactly transfer's `refreshMarket` shape: an offer that sits unanswered
 * does not linger, so signing is a decision under a clock rather than a menu
 * you get to browse whenever the mood strikes.
 */
export function refreshOffers(sponsors: SponsorsState, rng: Rng, leagueLevel: number): void {
  const scale = levelFactor(leagueLevel) * formFactor(sponsors.recentForm);
  const usedNames = new Set<string>();

  sponsors.offers = c.archetypes.map((a) => {
    const noise = 1 + rng.float(-c.variance, c.variance);
    let name = rng.pick(c.names);
    for (let guard = 0; usedNames.has(name) && guard < 10; guard++) name = rng.pick(c.names);
    usedNames.add(name);

    return {
      id: nextId(sponsors),
      archetypeId: a.id,
      name,
      fee: Math.max(0, roundToStep(a.fee * scale * noise, c.feeRoundingStep)),
      periodic: Math.max(0, roundToStep(a.periodic * scale * noise, c.payoutRoundingStep)),
      winBonus: Math.max(0, roundToStep(a.winBonus * scale * noise, c.payoutRoundingStep)),
      duration: a.duration
    };
  });
}

export function findOffer(sponsors: SponsorsState, offerId: string): SponsorOffer | undefined {
  return sponsors.offers.find((o) => o.id === offerId);
}

export interface SignedSponsor {
  name: string;
  fee: number;
}

/**
 * Sign one offer. Whatever else was on the table disappears with it — you are
 * choosing ONE backer, not stacking them.
 */
export function signOffer(sponsors: SponsorsState, offerId: string): SignedSponsor | undefined {
  const offer = findOffer(sponsors, offerId);
  if (!offer) return undefined;

  sponsors.active = {
    name: offer.name,
    periodic: offer.periodic,
    winBonus: offer.winBonus,
    matchdaysRemaining: offer.duration,
    totalDuration: offer.duration
  };
  sponsors.offers = [];
  return { name: offer.name, fee: offer.fee };
}

/** What the active contract pays out this matchday, before any staff modifier. */
export function matchdayPayout(active: ActiveSponsor, won: boolean): number {
  return active.periodic + (won ? active.winBonus : 0);
}

export interface ContractExpiry {
  name: string;
}

/**
 * Age the active contract by one matchday. Returns who just left when the
 * contract runs out, so the caller can tell the player and open the market
 * back up.
 */
export function advanceContract(sponsors: SponsorsState): ContractExpiry | undefined {
  const active = sponsors.active;
  if (!active) return undefined;

  active.matchdaysRemaining -= 1;
  if (active.matchdaysRemaining > 0) return undefined;

  sponsors.active = null;
  return { name: active.name };
}

/** Record one matchday's result. Keeps only the most recent `formWindow` entries. */
export function recordResult(sponsors: SponsorsState, result: MatchResult): void {
  sponsors.recentForm = [...sponsors.recentForm, result].slice(-c.formWindow);
}
