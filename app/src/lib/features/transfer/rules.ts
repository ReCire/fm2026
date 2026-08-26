import { createRng, mixSeed, type Rng } from '$lib/engine/rng';
import type { Position } from '../squad/positions';
import { POSITIONS } from '../squad/positions';
import type { Player, SquadState } from '../squad/state';
import { createPlayer } from '../squad/rules';
import type { Listing, Offer, TransferState } from './state';
import { transferContent } from './content';

/**
 * Transfer rules, ported from refreshTransferMarket(), triggerNewAITransferOffer(),
 * acceptTransferOffer(), rejectTransferOffer() and counterTransferOffer().
 *
 * Pure functions over plain data. Every die roll takes an injected `rng`, so a
 * negotiation replays byte for byte from its seed — which is the only reason a
 * bug report about "the buyer walked away from a fair offer" can be reproduced.
 *
 * Nothing here touches money. A function that costs or earns something returns
 * the amount and lets the caller post it to the ledger, so the transfer module
 * never needs to know how finance stores a balance.
 */

const c = transferContent;

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

/** Bids and demands are always rounded to a human-looking step. */
export function roundToStep(value: number, step = c.roundingStep): number {
  return Math.round(value / step) * step;
}

function nextId(transfer: TransferState, prefix: string): string {
  const id = `${prefix}${transfer.nextId}`;
  transfer.nextId += 1;
  return id;
}

/** A rival club name. The prototype's generateTeamName(), minus the global set. */
export function clubName(rng: Rng): string {
  return `${rng.pick(c.clubPrefixes)} ${rng.pick(c.clubCities)}`;
}

/**
 * The strength window a club at this league level is shown.
 *
 * `leagueLevel` counts DOWN towards the top flight: 3 is the lowest division,
 * 0 the first. Ported from `minStr = 50 + (3 - game.leagueLevel) * 9`.
 */
export function marketStrengthBand(leagueLevel: number): { min: number; max: number } {
  const min = c.baseMinStrength + (c.weakestLeagueLevel - leagueLevel) * c.strengthPerLeagueLevel;
  return { min: clampStrength(min), max: clampStrength(min + c.strengthSpread) };
}

function clampStrength(v: number): number {
  return Math.max(1, Math.min(99, Math.round(v)));
}

// ---------------------------------------------------------------------------
// the market
// ---------------------------------------------------------------------------

export interface RefreshOptions {
  leagueLevel?: number;
  /**
   * Fee discount, 0..1, from a hired scout or a doctrine perk. Arrives as a
   * plain number so transfer never learns those systems exist.
   */
  discount?: number;
}

/**
 * Turn the market over. Replaces both lists outright — an unsold player does
 * not linger, which is what makes "buy him now or lose him" a real decision.
 */
export function refreshMarket(transfer: TransferState, rng: Rng, opts: RefreshOptions = {}): void {
  const leagueLevel = opts.leagueLevel ?? c.defaultLeagueLevel;
  const discount = 1 - clamp01(opts.discount ?? 0);
  const band = marketStrengthBand(leagueLevel);

  const market: Listing[] = [];
  for (let i = 0; i < c.marketSize; i++) {
    const player = createPlayer(rng, randomPosition(rng), band.min, band.max);
    market.push({
      id: nextId(transfer, 'lst'),
      player,
      fee: Math.max(0, Math.round(player.marketValue * discount))
    });
  }

  const freeMin = clampStrength(Math.max(c.freeAgentStrengthFloor, band.min + c.freeAgentMinOffset));
  const freeMax = clampStrength(Math.max(freeMin, band.max + c.freeAgentMaxOffset));
  const freeAgents: Listing[] = [];
  for (let i = 0; i < c.freeAgentSize; i++) {
    const player = createPlayer(rng, randomPosition(rng), freeMin, freeMax);
    freeAgents.push({
      id: nextId(transfer, 'lst'),
      player,
      // No transfer fee — the cost is the sign-on bonus, a multiple of the wage.
      fee: Math.max(0, Math.round(player.wage * c.signOnFeeWageMultiple * discount))
    });
  }

  transfer.market = market;
  transfer.freeAgents = freeAgents;
  transfer.sinceRefresh = 0;
}

function randomPosition(rng: Rng): Position {
  return rng.pick(POSITIONS);
}

/** True when enough matchdays have passed for the market to turn over. */
export function isRefreshDue(transfer: TransferState): boolean {
  return transfer.sinceRefresh >= c.refreshEveryMatchdays;
}

// ---------------------------------------------------------------------------
// buying
// ---------------------------------------------------------------------------

export interface Signing {
  player: Player;
  fee: number;
}

export function findListing(transfer: TransferState, listingId: string): Listing | undefined {
  return transfer.market.find((l) => l.id === listingId) ?? transfer.freeAgents.find((l) => l.id === listingId);
}

/**
 * Sign a listed player. Returns what it cost so the caller can post it, or
 * undefined when the listing is gone or the club cannot pay.
 *
 * The affordability check lives here rather than in the screen so that the same
 * rule holds for an AI or scripted signing.
 */
export function signListing(
  transfer: TransferState,
  squad: SquadState,
  listingId: string,
  available: number
): Signing | undefined {
  const listing = findListing(transfer, listingId);
  if (!listing) return undefined;
  if (available < listing.fee) return undefined;

  squad.players.push(listing.player);
  transfer.market = transfer.market.filter((l) => l.id !== listingId);
  transfer.freeAgents = transfer.freeAgents.filter((l) => l.id !== listingId);
  return { player: listing.player, fee: listing.fee };
}

// ---------------------------------------------------------------------------
// selling
// ---------------------------------------------------------------------------

/** What an instant sale with no negotiation pays. */
export function quickSellQuote(player: Player): number {
  return Math.round(player.marketValue * c.quickSellRate);
}

export interface Sale {
  player: Player;
  fee: number;
  /** Part of the fee that also raises the transfer budget. */
  budgetShare: number;
}

/**
 * Sell a player outright. Refuses to take the squad below the minimum, and
 * takes the player out of the lineup and out of every open negotiation — the
 * prototype forgot the lineup on one of its two sale paths.
 */
export function quickSell(
  transfer: TransferState,
  squad: SquadState,
  playerId: string
): Sale | undefined {
  if (squad.players.length <= c.minSquadSize) return undefined;
  const player = squad.players.find((p) => p.id === playerId);
  if (!player) return undefined;

  const fee = quickSellQuote(player);
  removeFromSquad(transfer, squad, playerId);
  return { player, fee, budgetShare: Math.round(fee * c.quickSellBudgetShare) };
}

function removeFromSquad(transfer: TransferState, squad: SquadState, playerId: string): void {
  squad.players = squad.players.filter((p) => p.id !== playerId);
  squad.lineup = squad.lineup.filter((id) => id !== playerId);
  if (squad.captainId === playerId) squad.captainId = null;
  transfer.offers = transfer.offers.filter((o) => o.playerId !== playerId);
}

// ---------------------------------------------------------------------------
// incoming offers
// ---------------------------------------------------------------------------

/**
 * Age every open offer by one matchday and drop the ones that ran out.
 * Returns the expired offers so the caller can report them.
 */
export function expireOffers(transfer: TransferState): Offer[] {
  const expired: Offer[] = [];
  for (const o of transfer.offers) {
    o.expiresIn -= 1;
    if (o.expiresIn <= 0) expired.push(o);
  }
  transfer.offers = transfer.offers.filter((o) => o.expiresIn > 0);
  return expired;
}

/** Whether the world is in a state where a new bid may arrive at all. */
export function canReceiveOffer(transfer: TransferState, squad: SquadState): boolean {
  return (
    squad.players.length >= c.offersRequireSquadSize &&
    transfer.offers.length < c.maxConcurrentOffers
  );
}

export interface OfferOptions {
  /**
   * Extra opening-bid multiplier from a negotiator perk, 0..n. The prototype
   * hard-coded `managerRPG.perks.negotiator ? 1.05 : 0.85`; passing the delta
   * keeps this function ignorant of the RPG system.
   */
  bidBonus?: number;
}

/**
 * A rival club opens a bid for one of your players.
 *
 * Ported from triggerNewAITransferOffer(). Returns the new offer, or undefined
 * when nobody in the squad is worth bidding for.
 */
export function generateOffer(
  transfer: TransferState,
  squad: SquadState,
  rng: Rng,
  opts: OfferOptions = {}
): Offer | undefined {
  const targets = squad.players.filter(
    (p) => p.strength >= c.offerMinStrength && !transfer.offers.some((o) => o.playerId === p.id)
  );
  if (targets.length === 0) return undefined;

  const target = rng.pick(targets);
  const multiplier =
    c.offerBaseMultiplier + (opts.bidBonus ?? 0) + rng.next() * c.offerMultiplierSpread;
  const bid = Math.max(c.minOfferSum, roundToStep(target.marketValue * multiplier));

  const offer: Offer = {
    id: nextId(transfer, 'bid'),
    playerId: target.id,
    playerName: target.name,
    playerPos: target.pos,
    playerStrength: target.strength,
    marketValue: target.marketValue,
    clubName: clubName(rng),
    currentBid: bid,
    originalBid: bid,
    round: 1,
    expiresIn: c.offerExpiryMatchdays,
    status: 'new'
  };

  // Newest first: the offers list is a stack of things demanding an answer.
  transfer.offers.unshift(offer);
  return offer;
}

export function findOffer(transfer: TransferState, offerId: string): Offer | undefined {
  return transfer.offers.find((o) => o.id === offerId);
}

/** Why an acceptance was refused, so the screen can say something useful. */
export type AcceptRefusal = 'unknownOffer' | 'squadTooSmall' | 'playerGone';

export interface AcceptedTransfer {
  offer: Offer;
  player: Player;
  fee: number;
  budgetShare: number;
}

/**
 * Take the money. Ported from acceptTransferOffer(), with the two failure paths
 * the prototype handled with alert() turned into return values.
 */
export function acceptOffer(
  transfer: TransferState,
  squad: SquadState,
  offerId: string
): AcceptedTransfer | AcceptRefusal {
  const offer = findOffer(transfer, offerId);
  if (!offer) return 'unknownOffer';
  if (squad.players.length <= c.minSquadSize) return 'squadTooSmall';

  const player = squad.players.find((p) => p.id === offer.playerId);
  if (!player) {
    // The player left by another route. Bin the stale offer rather than leaving
    // it on screen forever, which is what the prototype did on this path.
    transfer.offers = transfer.offers.filter((o) => o.id !== offerId);
    return 'playerGone';
  }

  const fee = offer.currentBid;
  removeFromSquad(transfer, squad, offer.playerId);
  return { offer, player, fee, budgetShare: Math.round(fee * c.offerBudgetShare) };
}

/**
 * Turn a bid down. A player who saw a bid well above his market value pushed
 * away sulks about it — the one lasting consequence of saying no.
 */
export function rejectOffer(
  transfer: TransferState,
  squad: SquadState,
  offerId: string
): { offer: Offer; moraleLost: number } | undefined {
  const offer = findOffer(transfer, offerId);
  if (!offer) return undefined;

  let moraleLost = 0;
  const player = squad.players.find((p) => p.id === offer.playerId);
  if (player && offer.currentBid > player.marketValue * c.rejectMoraleRatio) {
    const before = player.morale;
    player.morale = Math.max(c.rejectMoraleFloor, player.morale - c.rejectMoralePenalty);
    moraleLost = before - player.morale;
  }

  transfer.offers = transfer.offers.filter((o) => o.id !== offerId);
  return { offer, moraleLost };
}

// ---------------------------------------------------------------------------
// the negotiation
// ---------------------------------------------------------------------------

/**
 * Chance the buyer simply pays a demand this far above market value.
 * First band whose ceiling the ratio is at or under wins.
 */
export function acceptChance(marketRatio: number): number {
  const band = c.acceptBands.find((b) => marketRatio <= b.maxRatio);
  return band ? band.chance : c.acceptBands[c.acceptBands.length - 1]!.chance;
}

/**
 * Chance the buyer withdraws rather than haggle further.
 * First band whose floor the ratio is strictly above wins, so the list runs
 * greediest-first.
 */
export function walkAwayChance(marketRatio: number): number {
  const band = c.walkAwayBands.find((b) => marketRatio > b.aboveRatio);
  return band ? band.chance : c.walkAwayBands[c.walkAwayBands.length - 1]!.chance;
}

export type CounterOutcome =
  /** They paid what you asked. */
  | 'accepted'
  /** They tore the offer up and left. */
  | 'withdrawn'
  /** They split the difference and the bid is still live. */
  | 'improved'
  /** Their patience ran out before you rolled. Bid unchanged. */
  | 'exhausted'
  /** No such offer. */
  | 'unknownOffer';

export interface CounterResult {
  outcome: CounterOutcome;
  /** What you asked for. */
  demanded: number;
  /** What is on the table afterwards. */
  bid: number;
  /** demanded ÷ market value — the number every threshold is keyed off. */
  marketRatio: number;
  offer?: Offer;
}

/**
 * Counter a bid. **The most interesting rule in the game.**
 *
 * Ported verbatim from counterTransferOffer(). The whole negotiation hangs on
 * one number: how far your demand exceeds the player's market value. Below
 * 1.15× the buyer usually just pays (70%) and almost never storms off (10%);
 * past 1.50× he is three times likelier to walk than to pay. In between, the
 * common outcome is a compromise at the midpoint — which raises the bid AND
 * raises the ratio your next demand is measured against, so each round of
 * haggling is more dangerous than the last. That escalation is the mechanic;
 * the thresholds are only its dial.
 *
 * Two deviations from the prototype, both deliberate:
 *
 * 1. `maxCounterRounds`. The prototype had no cap and only aged offers on
 *    matchday, so a player could counter an unlimited number of times inside a
 *    single matchday. With a 70% accept and a 10% walk-away chance at low
 *    ratios, spamming +15% was strictly better than accepting — a dominant
 *    strategy that made the whole negotiation free money.
 * 2. A zero market value no longer divides by zero. The prototype's
 *    `demandedSum / p.marketValue` returned Infinity for a player worth
 *    nothing, silently pinning every negotiation for him to the harshest band.
 */
export function counterOffer(
  transfer: TransferState,
  squad: SquadState,
  offerId: string,
  multiplier: number,
  rng: Rng
): CounterResult {
  const offer = findOffer(transfer, offerId);
  if (!offer) {
    return { outcome: 'unknownOffer', demanded: 0, bid: 0, marketRatio: 0 };
  }

  const demanded = roundToStep(offer.currentBid * multiplier);

  if (offer.round >= c.maxCounterRounds) {
    return {
      outcome: 'exhausted',
      demanded,
      bid: offer.currentBid,
      marketRatio: ratioOf(demanded, offer, squad),
      offer
    };
  }

  const marketRatio = ratioOf(demanded, offer, squad);
  offer.round += 1;

  const accept = acceptChance(marketRatio);
  const walkAway = walkAwayChance(marketRatio);
  const roll = rng.next();

  if (roll < accept) {
    offer.currentBid = demanded;
    offer.status = 'demandAccepted';
    return { outcome: 'accepted', demanded, bid: demanded, marketRatio, offer };
  }

  if (roll < accept + walkAway) {
    transfer.offers = transfer.offers.filter((o) => o.id !== offerId);
    return { outcome: 'withdrawn', demanded, bid: 0, marketRatio, offer };
  }

  const compromise = roundToStep((offer.currentBid + demanded) / 2);
  offer.currentBid = compromise;
  offer.status = 'improved';
  return { outcome: 'improved', demanded, bid: compromise, marketRatio, offer };
}

/**
 * Demand measured against what the player is actually worth today, falling back
 * to the value recorded when the bid was made if he has already left.
 */
function ratioOf(demanded: number, offer: Offer, squad: SquadState): number {
  const player = squad.players.find((p) => p.id === offer.playerId);
  const value = player?.marketValue ?? offer.marketValue;
  if (value <= 0) return 1;
  return demanded / value;
}

/** What the three counter buttons would ask for, without rolling anything. */
export function counterQuotes(offer: Offer): { multiplier: number; label: string; doc: string; demanded: number }[] {
  return c.counterOptions.map((o) => ({
    ...o,
    demanded: roundToStep(offer.currentBid * o.multiplier)
  }));
}

/**
 * The RNG a player-initiated negotiation rolls from.
 *
 * Tick hooks are handed a stream by the engine, but a counter-offer happens
 * when the player clicks a button, outside any tick. Deriving the stream from
 * the game seed and advancing a cursor stored in state keeps that roll every
 * bit as reproducible: same save + same clicks = same negotiation, and
 * reloading cannot be used to re-roll a walk-away into an acceptance.
 */
export function negotiationRng(transfer: TransferState, seed: number): Rng {
  /*
   * A counter-offer is rolled on click, outside any tick, so it cannot use the
   * engine's per-module tick stream. It derives a fresh stream from the game
   * seed plus a persisted counter instead.
   *
   * The counter lives in saved state, which is what makes this save-scum
   * resistant: reloading and re-negotiating advances the counter and produces a
   * different stream rather than replaying the same lucky roll.
   *
   * Derived rather than fast-forwarded: the previous version asked createRng to
   * step `cursor` times, which was O(cursor) — a long career would have spent
   * hundreds of thousands of steps on the phone's main thread just to open a
   * negotiation.
   */
  const rng = createRng(mixSeed(seed, `transfer.negotiation.${transfer.negotiationCursor}`));
  transfer.negotiationCursor += 1;
  return rng;
}

/** Counters left on this bid, for the screen. */
export function counterRoundsLeft(offer: Offer): number {
  return Math.max(0, c.maxCounterRounds - offer.round);
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}
