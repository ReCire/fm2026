import { describe, it, expect } from 'vitest';
import {
  roundToStep, marketStrengthBand, refreshMarket, isRefreshDue,
  findListing, signListing, quickSellQuote, quickSell,
  expireOffers, canReceiveOffer, generateOffer, findOffer,
  acceptOffer, rejectOffer, acceptChance, walkAwayChance,
  counterOffer, counterQuotes, counterRoundsLeft, negotiationRng,
  type CounterOutcome
} from './rules';
import { createTransfer, type Offer, type TransferState } from './state';
import { transferContent } from './content';
import { transferDocs } from './docs';
import { createSquad, type SquadState } from '../squad/state';
import { createFinance } from '../finance/state';
import { post } from '../finance/rules';
import { createRng, seedFrom, type Rng } from '$lib/engine/rng';

const c = transferContent;

// ---------------------------------------------------------------------------
// fixtures
// ---------------------------------------------------------------------------

const freshSquad = (seed = 42) => createSquad(createRng(seed));
const freshTransfer = (seed = 7) => createTransfer(createRng(seed));

/**
 * A negotiation with every input pinned: one named player, one bid, and a
 * market value chosen so the demand lands exactly where we want it on the
 * threshold ladder. Everything about the outcome then depends on `rng` alone,
 * which is what lets us assert on rates rather than on single lucky rolls.
 */
function negotiation(opts: { marketValue: number; bid: number; round?: number }) {
  const squad = freshSquad();
  const transfer = freshTransfer();
  const player = squad.players[0]!;
  player.marketValue = opts.marketValue;
  squad.lineup = [player.id];

  const offer: Offer = {
    id: 'bid1',
    playerId: player.id,
    playerName: player.name,
    playerPos: player.pos,
    playerStrength: player.strength,
    marketValue: opts.marketValue,
    clubName: 'SV Testhausen',
    currentBid: opts.bid,
    originalBid: opts.bid,
    round: opts.round ?? 1,
    expiresIn: c.offerExpiryMatchdays,
    status: 'new'
  };
  transfer.offers = [offer];
  return { transfer, squad, player, offer };
}

/** Run the same counter over many well-spread seeds and count the outcomes. */
function outcomeRates(
  multiplier: number,
  setup: { marketValue: number; bid: number },
  runs = 200
): Record<CounterOutcome, number> {
  const tally = {
    accepted: 0, withdrawn: 0, improved: 0, exhausted: 0, unknownOffer: 0
  } as Record<CounterOutcome, number>;
  for (let i = 0; i < runs; i++) {
    const { transfer, squad } = negotiation(setup);
    const rng = createRng(seedFrom(`negotiation-${multiplier}-${i}`));
    tally[counterOffer(transfer, squad, 'bid1', multiplier, rng).outcome] += 1;
  }
  for (const k of Object.keys(tally) as CounterOutcome[]) tally[k] /= runs;
  return tally;
}

// ---------------------------------------------------------------------------
// the threshold ladder — the balance surface, pinned exactly
// ---------------------------------------------------------------------------

describe('acceptChance', () => {
  it('pays 70% of the time for a demand at or under 1.15x market value', () => {
    expect(acceptChance(0.9)).toBe(0.7);
    expect(acceptChance(1.15)).toBe(0.7);
  });
  it('drops to 40% up to 1.40x, then 15% beyond', () => {
    expect(acceptChance(1.1500001)).toBe(0.4);
    expect(acceptChance(1.4)).toBe(0.4);
    expect(acceptChance(1.41)).toBe(0.15);
    expect(acceptChance(50)).toBe(0.15);
  });
  it('never rises with greed', () => {
    let last = 1;
    for (let r = 0.5; r <= 3; r += 0.01) {
      const v = acceptChance(r);
      expect(v).toBeLessThanOrEqual(last);
      last = v;
    }
  });
});

describe('walkAwayChance', () => {
  it('is a mild 10% while the demand stays under 1.25x', () => {
    expect(walkAwayChance(1.0)).toBe(0.1);
    expect(walkAwayChance(1.25)).toBe(0.1);
  });
  it('rises to 25% past 1.25x and 45% past 1.50x', () => {
    expect(walkAwayChance(1.26)).toBe(0.25);
    expect(walkAwayChance(1.5)).toBe(0.25);
    expect(walkAwayChance(1.51)).toBe(0.45);
  });
  /**
   * The crossover that makes the mechanic a decision: below it, asking for more
   * is nearly free; above it, walking away is three times likelier than paying.
   */
  it('overtakes acceptChance somewhere between 1.40x and 1.51x', () => {
    expect(walkAwayChance(1.4)).toBeLessThan(acceptChance(1.4));
    expect(walkAwayChance(1.51)).toBeGreaterThan(acceptChance(1.51));
  });
});

// ---------------------------------------------------------------------------
// counterOffer — rates over many seeds
// ---------------------------------------------------------------------------

describe('counterOffer', () => {
  it('is deterministic for a given seed', () => {
    const a = negotiation({ marketValue: 100_000, bid: 100_000 });
    const b = negotiation({ marketValue: 100_000, bid: 100_000 });
    const ra = counterOffer(a.transfer, a.squad, 'bid1', 1.35, createRng(99));
    const rb = counterOffer(b.transfer, b.squad, 'bid1', 1.35, createRng(99));
    expect(ra.outcome).toBe(rb.outcome);
    expect(ra.bid).toBe(rb.bid);
    expect(ra.demanded).toBe(rb.demanded);
    expect(a.transfer.offers).toEqual(b.transfer.offers);
  });

  it('a whole negotiation replays identically from the same seed', () => {
    const play = () => {
      const { transfer, squad } = negotiation({ marketValue: 250_000, bid: 240_000 });
      const rng = createRng(seedFrom('replay'));
      const log: string[] = [];
      for (let i = 0; i < 6; i++) {
        const r = counterOffer(transfer, squad, 'bid1', 1.15, rng);
        log.push(`${r.outcome}:${r.bid}:${r.demanded}`);
      }
      return log;
    };
    expect(play()).toEqual(play());
  });

  /** A demand at 1.15x market value: the buyer usually just pays. */
  it('usually succeeds when the demand stays near market value', () => {
    const rates = outcomeRates(1.15, { marketValue: 100_000, bid: 100_000 });
    expect(rates.accepted).toBeGreaterThan(0.55);
    expect(rates.accepted).toBeLessThan(0.85);
    expect(rates.withdrawn).toBeLessThan(0.25);
    // Whatever else happens, the offer survives far more often than it dies.
    expect(rates.accepted + rates.improved).toBeGreaterThan(0.75);
  });

  /** The +60% bluff at 1.60x: mostly a way to lose the offer. */
  it('usually fails when the demand is greedy', () => {
    const rates = outcomeRates(1.6, { marketValue: 100_000, bid: 100_000 });
    expect(rates.accepted).toBeLessThan(0.3);
    expect(rates.withdrawn).toBeGreaterThan(0.3);
    expect(rates.withdrawn).toBeGreaterThan(rates.accepted);
  });

  it('is strictly worse to be greedy than to be reasonable', () => {
    const soft = outcomeRates(1.15, { marketValue: 100_000, bid: 100_000 });
    const bluff = outcomeRates(1.6, { marketValue: 100_000, bid: 100_000 });
    expect(bluff.accepted).toBeLessThan(soft.accepted);
    expect(bluff.withdrawn).toBeGreaterThan(soft.withdrawn);
  });

  it('actually removes the offer when the buyer walks away', () => {
    let walked = 0;
    for (let i = 0; i < 200; i++) {
      const { transfer, squad } = negotiation({ marketValue: 100_000, bid: 100_000 });
      const rng = createRng(seedFrom(`walk-${i}`));
      const r = counterOffer(transfer, squad, 'bid1', 1.6, rng);
      if (r.outcome !== 'withdrawn') continue;
      walked += 1;
      expect(transfer.offers).toHaveLength(0);
      expect(findOffer(transfer, 'bid1')).toBeUndefined();
      expect(r.bid).toBe(0);
      // And the player is still ours — a walk-away is not a transfer.
      expect(squad.players.some((p) => p.id === r.offer!.playerId)).toBe(true);
    }
    expect(walked).toBeGreaterThan(20);
  });

  it('pays exactly the demanded, step-rounded sum when it accepts', () => {
    for (let i = 0; i < 200; i++) {
      const { transfer, squad } = negotiation({ marketValue: 137_000, bid: 121_000 });
      const rng = createRng(seedFrom(`exact-${i}`));
      const r = counterOffer(transfer, squad, 'bid1', 1.15, rng);
      if (r.outcome !== 'accepted') continue;
      expect(r.bid).toBe(roundToStep(121_000 * 1.15));
      expect(findOffer(transfer, 'bid1')!.currentBid).toBe(r.bid);
      expect(findOffer(transfer, 'bid1')!.status).toBe('demandAccepted');
      return;
    }
    throw new Error('no acceptance in 200 seeds — the accept band is broken');
  });

  it('meets in the middle when it neither accepts nor walks', () => {
    for (let i = 0; i < 200; i++) {
      const { transfer, squad } = negotiation({ marketValue: 100_000, bid: 100_000 });
      const r = counterOffer(transfer, squad, 'bid1', 1.6, createRng(seedFrom(`mid-${i}`)));
      if (r.outcome !== 'improved') continue;
      expect(r.bid).toBe(roundToStep((100_000 + 160_000) / 2));
      expect(r.bid).toBeGreaterThan(100_000);
      expect(r.bid).toBeLessThan(r.demanded);
      expect(findOffer(transfer, 'bid1')!.status).toBe('improved');
      return;
    }
    throw new Error('no compromise in 200 seeds');
  });

  /**
   * The prototype had no round cap and only aged offers on matchday, so a
   * player could counter forever inside one matchday and grind the bid up.
   */
  it('cannot be countered forever to grind out a better price', () => {
    for (let seed = 0; seed < 40; seed++) {
      const { transfer, squad } = negotiation({ marketValue: 400_000, bid: 380_000 });
      const rng = createRng(seedFrom(`grind-${seed}`));
      let live = 0;
      for (let i = 0; i < 50; i++) {
        const r = counterOffer(transfer, squad, 'bid1', 1.15, rng);
        if (r.outcome === 'improved' || r.outcome === 'accepted') live += 1;
        if (r.outcome === 'withdrawn') break;
      }
      // At most maxCounterRounds - 1 rolls ever happen: round starts at 1.
      expect(live).toBeLessThanOrEqual(c.maxCounterRounds - 1);
    }
  });

  it('reports exhaustion without touching the bid once patience runs out', () => {
    const { transfer, squad } = negotiation({
      marketValue: 100_000, bid: 100_000, round: c.maxCounterRounds
    });
    const r = counterOffer(transfer, squad, 'bid1', 1.15, createRng(5));
    expect(r.outcome).toBe('exhausted');
    expect(findOffer(transfer, 'bid1')!.currentBid).toBe(100_000);
    expect(findOffer(transfer, 'bid1')!.round).toBe(c.maxCounterRounds);
    expect(counterRoundsLeft(findOffer(transfer, 'bid1')!)).toBe(0);
  });

  it('handles an unknown offer id instead of throwing', () => {
    const { transfer, squad } = negotiation({ marketValue: 100_000, bid: 100_000 });
    const r = counterOffer(transfer, squad, 'nope', 1.15, createRng(1));
    expect(r.outcome).toBe('unknownOffer');
    expect(transfer.offers).toHaveLength(1);
  });

  /** The prototype divided by marketValue unguarded: a 0 gave Infinity. */
  it('does not blow up on a player with no market value', () => {
    const { transfer, squad, player } = negotiation({ marketValue: 0, bid: 10_000 });
    player.marketValue = 0;
    const r = counterOffer(transfer, squad, 'bid1', 1.6, createRng(3));
    expect(Number.isFinite(r.marketRatio)).toBe(true);
    expect(r.outcome).not.toBe('unknownOffer');
  });

  it('measures the ratio against the demand, not against the opening bid', () => {
    const { transfer, squad } = negotiation({ marketValue: 200_000, bid: 100_000 });
    const r = counterOffer(transfer, squad, 'bid1', 1.15, createRng(11));
    expect(r.marketRatio).toBeCloseTo(roundToStep(115_000) / 200_000, 5);
  });
});

describe('counterQuotes', () => {
  it('previews all three demands without rolling anything', () => {
    const { offer } = negotiation({ marketValue: 100_000, bid: 100_000 });
    const quotes = counterQuotes(offer);
    expect(quotes).toHaveLength(c.counterOptions.length);
    expect(quotes.map((q) => q.demanded)).toEqual([115_000, 135_000, 160_000]);
    expect(offer.round).toBe(1);
    expect(offer.currentBid).toBe(100_000);
  });

  /**
   * The docs gate cannot see a `doc={expression}`, so the link between the
   * content-driven counter buttons and the registry is pinned here instead.
   */
  it('every counter option points at a real doc entry', () => {
    for (const opt of c.counterOptions) {
      expect(Object.keys(transferDocs)).toContain(opt.doc);
    }
  });
});

// ---------------------------------------------------------------------------
// accepting, rejecting
// ---------------------------------------------------------------------------

describe('acceptOffer', () => {
  it('removes the player and pays the fee exactly once', () => {
    const { transfer, squad, player } = negotiation({ marketValue: 100_000, bid: 120_000 });
    const finance = createFinance(createRng(1));
    const before = finance.money;
    const sizeBefore = squad.players.length;

    const result = acceptOffer(transfer, squad, 'bid1');
    expect(typeof result).not.toBe('string');
    if (typeof result === 'string') throw new Error(result);

    post(finance, {
      season: 1, matchday: 1, source: 'transfer', reason: 'Transfer', amount: result.fee
    });

    expect(result.fee).toBe(120_000);
    expect(squad.players).toHaveLength(sizeBefore - 1);
    expect(squad.players.some((p) => p.id === player.id)).toBe(false);
    expect(squad.lineup).not.toContain(player.id);
    expect(transfer.offers).toHaveLength(0);

    // The classic bug: a second accept of the same offer paying a second time.
    expect(acceptOffer(transfer, squad, 'bid1')).toBe('unknownOffer');
    expect(finance.money).toBe(before + 120_000);
    expect(finance.ledger.filter((e) => e.source === 'transfer')).toHaveLength(1);
  });

  it('credits part of the fee to the transfer budget, not all of it', () => {
    const { transfer, squad } = negotiation({ marketValue: 100_000, bid: 120_000 });
    const result = acceptOffer(transfer, squad, 'bid1');
    if (typeof result === 'string') throw new Error(result);
    expect(result.budgetShare).toBe(Math.round(120_000 * c.offerBudgetShare));
    expect(result.budgetShare).toBeLessThan(result.fee);
  });

  it('refuses to sell the squad below the minimum', () => {
    const { transfer, squad } = negotiation({ marketValue: 100_000, bid: 120_000 });
    squad.players = squad.players.slice(0, c.minSquadSize);
    // The bid targets players[0], which survived the slice.
    transfer.offers[0]!.playerId = squad.players[0]!.id;
    expect(acceptOffer(transfer, squad, 'bid1')).toBe('squadTooSmall');
    expect(squad.players).toHaveLength(c.minSquadSize);
    expect(transfer.offers).toHaveLength(1);
  });

  it('bins a stale offer for a player who already left', () => {
    const { transfer, squad, player } = negotiation({ marketValue: 100_000, bid: 120_000 });
    squad.players = squad.players.filter((p) => p.id !== player.id);
    expect(acceptOffer(transfer, squad, 'bid1')).toBe('playerGone');
    expect(transfer.offers).toHaveLength(0);
  });

  it('handles an unknown offer id', () => {
    const { transfer, squad } = negotiation({ marketValue: 100_000, bid: 120_000 });
    expect(acceptOffer(transfer, squad, 'nope')).toBe('unknownOffer');
  });
});

describe('rejectOffer', () => {
  it('costs the player morale when the bid was well above his value', () => {
    const { transfer, squad, player } = negotiation({ marketValue: 100_000, bid: 200_000 });
    player.morale = 80;
    const r = rejectOffer(transfer, squad, 'bid1');
    expect(r!.moraleLost).toBe(c.rejectMoralePenalty);
    expect(player.morale).toBe(80 - c.rejectMoralePenalty);
    expect(transfer.offers).toHaveLength(0);
  });

  it('leaves morale alone for a lowball bid', () => {
    const { transfer, squad, player } = negotiation({ marketValue: 100_000, bid: 90_000 });
    player.morale = 80;
    expect(rejectOffer(transfer, squad, 'bid1')!.moraleLost).toBe(0);
    expect(player.morale).toBe(80);
  });

  it('never pushes morale below the floor', () => {
    const { transfer, squad, player } = negotiation({ marketValue: 100_000, bid: 300_000 });
    player.morale = c.rejectMoraleFloor + 1;
    rejectOffer(transfer, squad, 'bid1');
    expect(player.morale).toBe(c.rejectMoraleFloor);
  });

  it('is idempotent and survives an unknown id', () => {
    const { transfer, squad, player } = negotiation({ marketValue: 100_000, bid: 200_000 });
    player.morale = 80;
    expect(rejectOffer(transfer, squad, 'bid1')).toBeDefined();
    expect(rejectOffer(transfer, squad, 'bid1')).toBeUndefined();
    expect(rejectOffer(transfer, squad, 'nope')).toBeUndefined();
    // Morale is docked once, not once per click.
    expect(player.morale).toBe(80 - c.rejectMoralePenalty);
    expect(transfer.offers).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// the market
// ---------------------------------------------------------------------------

describe('marketStrengthBand', () => {
  it('scales with the league: bottom division is the prototype baseline', () => {
    expect(marketStrengthBand(3)).toEqual({ min: 50, max: 59 });
  });
  it('gets nine points better per division climbed', () => {
    expect(marketStrengthBand(2)).toEqual({ min: 59, max: 68 });
    expect(marketStrengthBand(1)).toEqual({ min: 68, max: 77 });
    expect(marketStrengthBand(0)).toEqual({ min: 77, max: 86 });
  });
});

describe('refreshMarket', () => {
  const level = (leagueLevel: number, seed = 4) => {
    const transfer = freshTransfer(seed);
    refreshMarket(transfer, createRng(seed), { leagueLevel });
    return transfer;
  };

  it('fills both lists to the configured size', () => {
    const t = level(3);
    expect(t.market).toHaveLength(c.marketSize);
    expect(t.freeAgents).toHaveLength(c.freeAgentSize);
  });

  it('lists players inside the band for the club league level', () => {
    for (const leagueLevel of [0, 1, 2, 3]) {
      const band = marketStrengthBand(leagueLevel);
      const t = level(leagueLevel, 100 + leagueLevel);
      for (const l of t.market) {
        expect(l.player.strength).toBeGreaterThanOrEqual(band.min);
        expect(l.player.strength).toBeLessThanOrEqual(band.max);
      }
      for (const l of t.freeAgents) {
        expect(l.player.strength).toBeGreaterThanOrEqual(
          Math.max(c.freeAgentStrengthFloor, band.min + c.freeAgentMinOffset)
        );
        expect(l.player.strength).toBeLessThanOrEqual(band.max + c.freeAgentMaxOffset);
      }
    }
  });

  it('prices listed players at their market value and free agents off their wage', () => {
    const t = level(2);
    for (const l of t.market) expect(l.fee).toBe(l.player.marketValue);
    for (const l of t.freeAgents) {
      expect(l.fee).toBe(Math.round(l.player.wage * c.signOnFeeWageMultiple));
      // The prototype zeroed a free agent's market value permanently. It must not.
      expect(l.player.marketValue).toBeGreaterThan(0);
    }
  });

  it('applies a scout discount to both lists', () => {
    const plain = freshTransfer(9);
    refreshMarket(plain, createRng(9), { leagueLevel: 2 });
    const cheap = freshTransfer(9);
    refreshMarket(cheap, createRng(9), { leagueLevel: 2, discount: 0.15 });
    expect(cheap.market[0]!.fee).toBe(Math.round(plain.market[0]!.fee * 0.85));
    expect(cheap.freeAgents[0]!.fee).toBe(Math.round(plain.freeAgents[0]!.fee * 0.85));
  });

  it('is deterministic and replaces the previous listings outright', () => {
    const a = level(3, 21);
    const b = level(3, 21);
    expect(a.market.map((l) => l.player.name)).toEqual(b.market.map((l) => l.player.name));

    const t = level(3, 21);
    const first = t.market.map((l) => l.id);
    refreshMarket(t, createRng(22), { leagueLevel: 3 });
    expect(t.market).toHaveLength(c.marketSize);
    expect(t.market.some((l) => first.includes(l.id))).toBe(false);
  });

  it('hands out unique ids across refreshes', () => {
    const t = freshTransfer(3);
    const ids = new Set<string>();
    for (let i = 0; i < 20; i++) {
      refreshMarket(t, createRng(i), { leagueLevel: 3 });
      for (const l of [...t.market, ...t.freeAgents]) ids.add(l.id);
    }
    expect(ids.size).toBe(20 * (c.marketSize + c.freeAgentSize));
  });

  it('resets the refresh clock', () => {
    const t = freshTransfer(3);
    t.sinceRefresh = 9;
    expect(isRefreshDue(t)).toBe(true);
    refreshMarket(t, createRng(1), { leagueLevel: 3 });
    expect(t.sinceRefresh).toBe(0);
    expect(isRefreshDue(t)).toBe(false);
  });
});

describe('signListing', () => {
  it('moves the player into the squad and reports the fee', () => {
    const transfer = freshTransfer();
    const squad = freshSquad();
    const listing = transfer.market[0]!;
    const size = squad.players.length;

    const signing = signListing(transfer, squad, listing.id, listing.fee);
    expect(signing!.fee).toBe(listing.fee);
    expect(squad.players).toHaveLength(size + 1);
    expect(squad.players.at(-1)!.id).toBe(listing.player.id);
    expect(findListing(transfer, listing.id)).toBeUndefined();
  });

  it('refuses when the club cannot pay, leaving the listing alone', () => {
    const transfer = freshTransfer();
    const squad = freshSquad();
    const listing = transfer.market[0]!;
    expect(signListing(transfer, squad, listing.id, listing.fee - 1)).toBeUndefined();
    expect(findListing(transfer, listing.id)).toBeDefined();
    expect(squad.players.some((p) => p.id === listing.player.id)).toBe(false);
  });

  it('cannot sign the same listing twice', () => {
    const transfer = freshTransfer();
    const squad = freshSquad();
    const listing = transfer.market[0]!;
    expect(signListing(transfer, squad, listing.id, 10_000_000)).toBeDefined();
    expect(signListing(transfer, squad, listing.id, 10_000_000)).toBeUndefined();
    expect(squad.players.filter((p) => p.id === listing.player.id)).toHaveLength(1);
  });

  it('signs a free agent for the sign-on fee, not the market value', () => {
    const transfer = freshTransfer();
    const squad = freshSquad();
    const free = transfer.freeAgents[0]!;
    const signing = signListing(transfer, squad, free.id, free.fee);
    expect(signing!.fee).toBe(free.fee);
    expect(signing!.player.marketValue).toBeGreaterThan(free.fee === 0 ? -1 : 0);
    expect(transfer.freeAgents.some((l) => l.id === free.id)).toBe(false);
  });
});

describe('quickSell', () => {
  it('pays the discounted rate the prototype used', () => {
    const squad = freshSquad();
    const p = squad.players[0]!;
    p.marketValue = 200_000;
    expect(quickSellQuote(p)).toBe(160_000);
  });

  it('removes the player from squad, lineup, captaincy and every open offer', () => {
    const { transfer, squad, player } = negotiation({ marketValue: 200_000, bid: 210_000 });
    squad.captainId = player.id;
    const sale = quickSell(transfer, squad, player.id);
    expect(sale!.fee).toBe(160_000);
    expect(sale!.budgetShare).toBe(Math.round(160_000 * c.quickSellBudgetShare));
    expect(squad.players.some((x) => x.id === player.id)).toBe(false);
    expect(squad.lineup).not.toContain(player.id);
    expect(squad.captainId).toBeNull();
    expect(transfer.offers).toHaveLength(0);
  });

  it('refuses at the minimum squad size and for an unknown player', () => {
    const transfer = freshTransfer();
    const squad = freshSquad();
    expect(quickSell(transfer, squad, 'nobody')).toBeUndefined();
    squad.players = squad.players.slice(0, c.minSquadSize);
    expect(quickSell(transfer, squad, squad.players[0]!.id)).toBeUndefined();
    expect(squad.players).toHaveLength(c.minSquadSize);
  });
});

// ---------------------------------------------------------------------------
// incoming offers over time
// ---------------------------------------------------------------------------

describe('generateOffer', () => {
  const world = (seed = 5) => {
    const transfer = freshTransfer(seed);
    const squad = freshSquad(seed);
    return { transfer, squad, rng: createRng(seed) as Rng };
  };

  it('is deterministic for a given seed', () => {
    const a = world(31);
    const b = world(31);
    expect(generateOffer(a.transfer, a.squad, a.rng)).toEqual(
      generateOffer(b.transfer, b.squad, b.rng)
    );
  });

  it('only bids for players at or above the strength floor', () => {
    for (let i = 0; i < 60; i++) {
      const { transfer, squad, rng } = world(i);
      const offer = generateOffer(transfer, squad, rng);
      if (!offer) continue;
      expect(offer.playerStrength).toBeGreaterThanOrEqual(c.offerMinStrength);
      expect(squad.players.some((p) => p.id === offer.playerId)).toBe(true);
    }
  });

  it('opens between 0.85x and 1.20x market value, step-rounded, above the floor', () => {
    for (let i = 0; i < 60; i++) {
      const { transfer, squad, rng } = world(200 + i);
      const offer = generateOffer(transfer, squad, rng);
      if (!offer) continue;
      expect(offer.currentBid).toBeGreaterThanOrEqual(c.minOfferSum);
      expect(offer.currentBid % c.roundingStep).toBe(0);
      const ceiling = offer.marketValue * (c.offerBaseMultiplier + c.offerMultiplierSpread);
      expect(offer.currentBid).toBeLessThanOrEqual(Math.max(c.minOfferSum, roundToStep(ceiling)));
      expect(offer.round).toBe(1);
      expect(offer.status).toBe('new');
      expect(offer.originalBid).toBe(offer.currentBid);
    }
  });

  it('never opens two bids for the same player', () => {
    const { transfer, squad, rng } = world(12);
    for (let i = 0; i < 10; i++) generateOffer(transfer, squad, rng);
    const ids = transfer.offers.map((o) => o.playerId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('gives up when nobody in the squad is worth bidding for', () => {
    const { transfer, squad, rng } = world(8);
    for (const p of squad.players) p.strength = c.offerMinStrength - 1;
    expect(generateOffer(transfer, squad, rng)).toBeUndefined();
    expect(transfer.offers).toHaveLength(0);
  });
});

describe('canReceiveOffer', () => {
  it('is quiet while the squad is too thin to lose anyone', () => {
    const transfer = freshTransfer();
    const squad = freshSquad();
    squad.players = squad.players.slice(0, c.offersRequireSquadSize - 1);
    expect(canReceiveOffer(transfer, squad)).toBe(false);
  });

  it('stops at the concurrent-offer ceiling', () => {
    const transfer = freshTransfer();
    const squad = freshSquad();
    expect(canReceiveOffer(transfer, squad)).toBe(true);
    const rng = createRng(2);
    while (transfer.offers.length < c.maxConcurrentOffers) {
      generateOffer(transfer, squad, rng);
    }
    expect(canReceiveOffer(transfer, squad)).toBe(false);
  });
});

describe('expireOffers', () => {
  it('ages every offer and returns the ones that ran out', () => {
    const { transfer } = negotiation({ marketValue: 100_000, bid: 100_000 });
    const offer = transfer.offers[0]!;
    offer.expiresIn = 2;

    expect(expireOffers(transfer)).toHaveLength(0);
    expect(offer.expiresIn).toBe(1);
    expect(transfer.offers).toHaveLength(1);

    const gone = expireOffers(transfer);
    expect(gone).toHaveLength(1);
    expect(gone[0]!.id).toBe('bid1');
    expect(transfer.offers).toHaveLength(0);
  });

  it('is safe on an empty list', () => {
    const transfer = freshTransfer();
    expect(expireOffers(transfer)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// misc
// ---------------------------------------------------------------------------

describe('roundToStep', () => {
  it('snaps to the 5.000er grid the prototype used', () => {
    expect(roundToStep(112_400)).toBe(110_000);
    expect(roundToStep(112_600)).toBe(115_000);
    expect(roundToStep(0)).toBe(0);
  });
});

describe('negotiationRng', () => {
  it('gives a different roll each time it is asked', () => {
    const t = freshTransfer(1);
    const rolls = new Set<number>();
    for (let i = 0; i < 50; i++) rolls.add(negotiationRng(t, 12_345).next());
    expect(rolls.size).toBe(50);
    expect(t.negotiationCursor).toBe(50);
  });

  it('replays identically from the same seed and cursor', () => {
    const a = freshTransfer(1);
    const b = freshTransfer(1);
    const rollsA = [0, 1, 2].map(() => negotiationRng(a, 999).next());
    const rollsB = [0, 1, 2].map(() => negotiationRng(b, 999).next());
    expect(rollsA).toEqual(rollsB);
  });

  /** Reloading a save must not let the player re-roll a lost negotiation. */
  it('cannot be re-rolled by restoring the same save', () => {
    const before = freshTransfer(1);
    const saved = JSON.parse(JSON.stringify(before)) as TransferState;
    const first = negotiationRng(before, 4_242).next();
    const reloaded = JSON.parse(JSON.stringify(saved)) as TransferState;
    expect(negotiationRng(reloaded, 4_242).next()).toBe(first);
  });
});

describe('createTransfer', () => {
  it('opens with a stocked market, no offers and a fresh id counter', () => {
    const t: TransferState = freshTransfer(1);
    expect(t.market).toHaveLength(c.marketSize);
    expect(t.freeAgents).toHaveLength(c.freeAgentSize);
    expect(t.offers).toEqual([]);
    expect(t.nextId).toBe(c.marketSize + c.freeAgentSize + 1);
  });

  it('is plain JSON-serialisable data — no getters, no functions', () => {
    const t = freshTransfer(1);
    expect(JSON.parse(JSON.stringify(t))).toEqual(t);
  });

  it('produces the same market for the same seed', () => {
    expect(freshTransfer(77)).toEqual(freshTransfer(77));
  });
});

describe('squad interaction', () => {
  it('a sold player leaves no dangling lineup reference', () => {
    const squad: SquadState = freshSquad();
    const transfer = freshTransfer();
    squad.lineup = squad.players.slice(0, 11).map((p) => p.id);
    const victim = squad.players[3]!;
    quickSell(transfer, squad, victim.id);
    for (const id of squad.lineup) {
      expect(squad.players.some((p) => p.id === id)).toBe(true);
    }
  });
});
