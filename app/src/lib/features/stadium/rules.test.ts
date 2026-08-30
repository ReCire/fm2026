import { describe, it, expect } from 'vitest';
import { capacity, attendanceFactor, attendance, ticketIncome, expansionQuote } from './rules';
import { createStadium } from './state';
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
