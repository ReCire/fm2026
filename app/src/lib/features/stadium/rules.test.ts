import { describe, it, expect } from 'vitest';
import { capacity, attendanceFactor, attendance, ticketIncome, expansionQuote, priceAppetite } from './rules';
import { createStadium, OPENING_PRICES } from './state';
import { createRng } from '$lib/engine/rng';

const base = () => createStadium(createRng(1));

describe('capacity', () => {
  /* Derived from the blocks, not restated. A hardcoded total is a second copy
     of the content that goes stale the moment the ground is resized — which is
     exactly what happened when it was rescaled from a Bundesliga stadium to the
     Regionalliga one a fourth-division club actually has. */
  it('sums every block including the VIP boxes', () => {
    const s = base();
    const byHand = Object.values(s.blocks).reduce((sum, b) => sum + b.cap, 0);
    expect(capacity(s)).toBe(byHand);
    expect(byHand, 'a fourth-division ground, not a Bundesliga one').toBeLessThan(6000);
  });
});

describe('attendanceFactor', () => {
  it('tracks fan mood at zero comfort', () => {
    const s = base();
    // 75 fans, no comfort upgrades -> 0.75 * 0.9
    expect(attendanceFactor(s)).toBeCloseTo(0.675, 5);
  });

  it('never drops below 0.3 however bad the mood gets', () => {
    const s = base();
    s.fans = 0;
    expect(attendanceFactor(s)).toBe(0.3);
  });

  /**
   * Documents a real finding from the port: with the prototype's eight blocks,
   * comfort tops out at totalComfort = 8, so the bonus caps at 1.1 and the 1.2
   * ceiling in the formula is unreachable. Left as-is deliberately — it is
   * headroom for more blocks — but pinned by a test so it is a decision rather
   * than an accident.
   */
  it('tops out at 1.1 with the current eight blocks, not the 1.2 ceiling', () => {
    const s = base();
    s.fans = 100;
    for (const b of Object.values(s.blocks)) { b.foodLvl = 3; b.merchLvl = 3; b.toiletLvl = 3; }
    expect(attendanceFactor(s)).toBeCloseTo(1.1, 5);
  });

  it('would clamp at 1.2 if more blocks were ever added', () => {
    const s = base();
    s.fans = 100;
    for (const b of Object.values(s.blocks)) { b.foodLvl = 3; b.merchLvl = 3; b.toiletLvl = 3; }
    // The ceiling needs totalComfort >= 12, i.e. twelve fully upgraded blocks.
    for (let i = 1; i <= 4; i++) {
      s.blocks[`extra${i}`] = { name: `Neu ${i}`, cap: 1000, foodLvl: 3, merchLvl: 3, toiletLvl: 3, addSeats: 0, cost: 0 };
    }
    expect(attendanceFactor(s)).toBe(1.2);
  });

  it('rewards comfort upgrades', () => {
    const s = base();
    const before = attendanceFactor(s);
    s.blocks.kurve!.foodLvl = 3;
    expect(attendanceFactor(s)).toBeGreaterThan(before);
  });
});

describe('ticketIncome', () => {
  it('prices standing, seated and VIP separately', () => {
    const s = base();
    const att = attendance(s);              // capacity * 0.675
    const p = s.ticketPrices;
    const vip = s.blocks.vipLogen!.cap;
    const expected = Math.round(att * 0.5 * p.steh + att * 0.45 * p.sitz + vip * p.vip);
    expect(ticketIncome(s)).toBe(expected);
  });

  it('rises when prices rise', () => {
    const s = base();
    const before = ticketIncome(s);
    s.ticketPrices.steh = 20;
    expect(ticketIncome(s)).toBeGreaterThan(before);
  });
});

describe('expansionQuote', () => {
  it('reports cost and the resulting capacity', () => {
    const s = base();
    const block = s.blocks.kurve!;
    expect(expansionQuote(s, 'kurve'))
      .toEqual({ cost: block.cost, seats: block.addSeats, newCap: block.cap + block.addSeats });
  });
  it('returns undefined for a block that does not exist', () => {
    expect(expansionQuote(base(), 'nope')).toBeUndefined();
  });
});

describe('what a ticket price costs', () => {
  /*
   * Before `priceAppetite`, ticket prices did NOTHING to the size of the
   * crowd. `attendanceFactor` read comfort and mood; `ticketIncome` multiplied
   * the crowd by whatever the slider said. So raising prices raised revenue at
   * any value, forever, and the control's answer was always "higher" — every
   * wire attached, the number moving, and no decision at the end of it.
   */
  const priced = (steh: number, sitz: number, vip: number) => {
    const s = base();
    s.fans = 75;
    s.ticketPrices = { steh, sitz, vip };
    return s;
  };
  const opening = OPENING_PRICES;
  const scaled = (k: number) =>
    priced(opening.steh * k, opening.sitz * k, opening.vip * k);

  it('charges nothing for charging the opening price', () => {
    expect(priceAppetite(scaled(1))).toBeCloseTo(1, 6);
  });

  it('empties the ground as the price climbs', () => {
    expect(priceAppetite(scaled(1.5))).toBeLessThan(priceAppetite(scaled(1)));
    expect(priceAppetite(scaled(2.5))).toBeLessThan(priceAppetite(scaled(1.5)));
  });

  it('fills it a little when the tickets are cheap, and only a little', () => {
    /*
     * Asymmetric deliberately. A symmetric curve makes a permanent price CUT
     * the right answer instead of a permanent rise — the same free lever
     * pointed the other way.
     */
    const cheap = priceAppetite(scaled(0.5));
    const dear = priceAppetite(scaled(1.5));
    expect(cheap).toBeGreaterThan(1);
    expect(cheap - 1).toBeLessThan(1 - dear);
  });

  it('leaves somebody in the ground however dear it gets', () => {
    expect(priceAppetite(scaled(20))).toBeGreaterThan(0);
  });

  it('has a wrong answer at BOTH ends, which is what makes it a decision', () => {
    /*
     * The property the whole change exists for. Income must not be monotonic
     * in price: if it rises all the way, the slider is a free lever; if it
     * falls all the way, nobody would ever touch it.
     */
    const incomes = [0.5, 1, 1.5, 2, 3, 5].map((k) => ticketIncome(scaled(k)));
    const best = Math.max(...incomes);
    const peak = incomes.indexOf(best);
    expect(peak, 'the cheapest price earns the most — nobody would ever raise it')
      .toBeGreaterThan(0);
    expect(peak, 'the dearest price earns the most — the slider is a free lever')
      .toBeLessThan(incomes.length - 1);
  });

  it('is what three doctrine nodes move, and they move it the right way', () => {
    const dear = scaled(1.6);
    expect(priceAppetite(dear, 0.25)).toBeGreaterThan(priceAppetite(dear, 0));
  });

  it('does not let tolerance make an outrageous price free', () => {
    /*
     * The node raises where resistance STARTS; it does not remove it. A
     * tolerance that made any price costless would put the free lever back
     * behind a purchase.
     */
    expect(priceAppetite(scaled(4), 0.3)).toBeLessThan(1);
  });
});
