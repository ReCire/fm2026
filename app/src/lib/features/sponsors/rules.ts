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
 *
 * Compounding rather than additive. `1 + levels * step` topped out at about
 * double, so a Bundesliga club winning everything saw offers a Regionalliga
 * club could nearly match on a good run — sponsorship money was the one line
 * that did not know the club had climbed. Compounding at 0.75 per level puts
 * the top flight around 5.4× Liga 4, before form and before the extra slots.
 */
export function levelFactor(leagueLevel: number): number {
  return (1 + c.levelStep) ** Math.max(0, c.weakestLevel - leagueLevel);
}

/**
 * How many sponsor contracts the club can hold at once, by league level.
 *
 * One local backer in Liga 4, a full commercial department at the top. The
 * slots are the honest answer to "why is my sponsoring capped": it is not,
 * but a fourth-division shirt only has room for one logo.
 */
export function maxSlots(leagueLevel: number): number {
  return Math.min(c.maxSlots, 1 + Math.max(0, c.weakestLevel - leagueLevel));
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
 * Sign one offer into a free slot.
 *
 * Only the SIGNED offer leaves the table. While slots remain open the rest
 * stay signable — with three slots, "which one" becomes "which ones, in which
 * order", and the short/balanced/long shapes finally coexist. The table
 * clears once every slot is filled.
 */
export function signOffer(
  sponsors: SponsorsState,
  offerId: string,
  slots: number
): SignedSponsor | undefined {
  const offer = findOffer(sponsors, offerId);
  if (!offer || sponsors.contracts.length >= slots) return undefined;

  sponsors.contracts.push({
    name: offer.name,
    periodic: offer.periodic,
    winBonus: offer.winBonus,
    matchdaysRemaining: offer.duration,
    totalDuration: offer.duration
  });
  sponsors.offers = sponsors.offers.filter((o) => o.id !== offerId);
  if (sponsors.contracts.length >= slots) sponsors.offers = [];
  return { name: offer.name, fee: offer.fee };
}

/** What one running contract pays out this matchday, before any staff modifier. */
export function matchdayPayout(active: ActiveSponsor, won: boolean): number {
  return active.periodic + (won ? active.winBonus : 0);
}

/** What every running contract pays together. */
export function totalPayout(sponsors: SponsorsState, won: boolean): number {
  return sponsors.contracts.reduce((sum, a) => sum + matchdayPayout(a, won), 0);
}

export interface ContractExpiry {
  name: string;
}

/**
 * Age every running contract by one matchday. Returns who just left when a
 * contract runs out, so the caller can tell the player and open the market
 * back up.
 */
export function advanceContracts(sponsors: SponsorsState): ContractExpiry[] {
  const expired: ContractExpiry[] = [];
  for (const active of sponsors.contracts) {
    active.matchdaysRemaining -= 1;
    if (active.matchdaysRemaining <= 0) expired.push({ name: active.name });
  }
  if (expired.length > 0) {
    sponsors.contracts = sponsors.contracts.filter((a) => a.matchdaysRemaining > 0);
  }
  return expired;
}

/** Record one matchday's result. Keeps only the most recent `formWindow` entries. */
export function recordResult(sponsors: SponsorsState, result: MatchResult): void {
  sponsors.recentForm = [...sponsors.recentForm, result].slice(-c.formWindow);
}
