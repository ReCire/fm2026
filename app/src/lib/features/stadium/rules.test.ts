import { describe, it, expect } from 'vitest';
import { capacity, attendanceFactor, attendance, ticketIncome, expansionQuote } from './rules';
import { createStadium } from './state';
import { createRng } from '$lib/engine/rng';

const base = () => createStadium(createRng(1));

describe('capacity', () => {
  it('sums every block including the VIP boxes', () => {
    // 2000 + 1500 + 3000 + 1500 + 3000 + 2000 + 50 + 1500
    expect(capacity(base())).toBe(14_550);
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
    const att = attendance(s);              // 14550 * 0.675 = 9821
    const expected = Math.round(att * 0.5 * 12 + att * 0.45 * 24 + 50 * 80);
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
    expect(expansionQuote(base(), 'kurve')).toEqual({ cost: 130_000, seats: 1000, newCap: 4000 });
  });
  it('returns undefined for a block that does not exist', () => {
    expect(expansionQuote(base(), 'nope')).toBeUndefined();
  });
});
