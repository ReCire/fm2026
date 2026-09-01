import { describe, it, expect } from 'vitest';
import {
  instruments, instrumentById, stocksContent, DRIVERS, driverCopy, copy
} from './content';

describe('the market has a decision in it', () => {
  it('trades yield against volatility, with no dominant instrument', () => {
    /*
     * The whole point of having four. An instrument that paid the most AND
     * moved the least would be the only correct answer, and four instruments
     * with one correct answer is one instrument with three distractions.
     *
     * Sorted by dividend, volatility must fall — steady pays, wild does not.
     */
    const byYield = [...instruments].sort((a, b) => b.dividend - a.dividend);
    const vols = byYield.map((i) => i.volatility);
    expect(vols, 'an instrument dominates on both axes').toEqual(
      [...vols].sort((a, b) => a - b)
    );
  });

  it('makes knowing something worth less than certainty and more than nothing', () => {
    // At 0 this is a slot machine; at 1 it is a spreadsheet the player has
    // already filled in. An informed guess should be usually right and never
    // safe.
    expect(stocksContent.driverShare).toBeGreaterThan(0.2);
    expect(stocksContent.driverShare).toBeLessThan(0.8);
  });

  it('charges for churn', () => {
    /*
     * Without a fee, buying and selling every matchday on a hunch is free and
     * the optimal play is to churn. A fee is what makes a position a position
     * rather than a habit.
     */
    expect(stocksContent.fee).toBeGreaterThan(0);
    // ...but never so much that a correct call cannot pay for itself: two
    // crossings must cost less than one average move of the steadiest holding.
    const steadiest = Math.min(...instruments.map((i) => i.volatility));
    expect(stocksContent.fee * 2).toBeLessThan(steadiest);
  });

  it('never lets a price reach zero or run away', () => {
    // A holding worth nothing is a dead row the player cannot act on, and an
    // unbounded one turns the whole economy into one lucky season.
    for (const i of instruments) {
      expect(i.floor, `${i.name} can go to nothing`).toBeGreaterThan(0);
      expect(i.ceiling).toBeGreaterThan(1);
      expect(i.floor).toBeLessThan(1);
    }
  });
});

describe('what moves a price', () => {
  it('connects most of the market to the club, and one thing to nothing', () => {
    /*
     * A manager should have an edge, and should also be able to LEARN that one
     * of these is pure noise — which only works if the others genuinely are
     * not. Exactly one untethered instrument: two and the market is a casino,
     * none and it is a spreadsheet.
     */
    const untethered = instruments.filter((i) => i.driver === 'none');
    expect(untethered).toHaveLength(1);
    expect(instruments.length - untethered.length).toBeGreaterThanOrEqual(3);
  });

  it('puts the wildest swing on the thing nobody can read', () => {
    // And the joke lands only if it is also true mechanically: the instrument
    // that looks like the football one has no football in it.
    const noise = instruments.find((i) => i.driver === 'none')!;
    expect(noise.volatility).toBe(Math.max(...instruments.map((i) => i.volatility)));
    expect(noise.dividend).toBe(Math.min(...instruments.map((i) => i.dividend)));
  });

  it('explains every driver it uses', () => {
    // A driver with no copy is a price movement the player cannot attribute,
    // which is the mood-ring failure the press feed exists to prevent.
    for (const d of DRIVERS) {
      expect(driverCopy[d]?.label, `${d} has no label`).toBeTruthy();
      expect(driverCopy[d]?.note.length ?? 0).toBeGreaterThan(20);
    }
    for (const i of instruments) expect(DRIVERS).toContain(i.driver);
  });

  it('has no two instruments a player could confuse', () => {
    expect(new Set(instruments.map((i) => i.id)).size).toBe(instruments.length);
    expect(new Set(instruments.map((i) => i.name)).size).toBe(instruments.length);
    expect(instrumentById.size).toBe(instruments.length);
  });
});

describe('the copy', () => {
  it('says the prices move', () => {
    /*
     * The prototype's did not. `stockMarket[key].price` was never assigned in
     * 8.697 lines — the only `.price =` belongs to the merchandise screen — so
     * SAFT SE was 120 € at kick-off and 120 € a decade later. The dividend was
     * credited every matchday, which is why nothing looked broken: a feature
     * that ran correctly and contained no game.
     */
    expect(copy.rule).toContain('bewegen sich');
  });

  it('says where the doctrine nodes land, and where they do not', () => {
    // Two data-synthesis nodes raise dividends and nothing else. Saying so is
    // half of it; saying they do NOT touch the price is the other half, or a
    // player buys them expecting an edge on the market.
    expect(copy.bonus).toContain('Dividenden');
    expect(copy.bonus).toContain('Kurs');
  });
});
