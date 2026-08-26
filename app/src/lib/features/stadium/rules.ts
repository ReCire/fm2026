import type { StadiumState } from './state';

/**
 * Stadium rules, ported from getAttendanceFactor() and the ticket half of
 * applyMatchdayFinances(). The prototype computed capacity with a getter on the
 * state object, which does not survive JSON serialisation — so it is a function
 * here, and the state stays plain data that saves cleanly.
 */

export function capacity(stadium: StadiumState): number {
  return Object.values(stadium.blocks).reduce((sum, b) => sum + b.cap, 0);
}

export function vipCapacity(stadium: StadiumState): number {
  return stadium.blocks.vipLogen?.cap ?? 50;
}

/**
 * How full the ground gets, 0.3 .. 1.2.
 *
 * Comfort (food, merch and toilet levels across all blocks) nudges attendance
 * up by at most 10%; fan mood does the heavy lifting. Verbatim from the
 * prototype so the balance carries over unchanged.
 */
export function attendanceFactor(stadium: StadiumState): number {
  let totalComfort = 0;
  for (const b of Object.values(stadium.blocks)) {
    totalComfort += (b.foodLvl + b.merchLvl + b.toiletLvl) / 9;
  }
  const avgComfortBonus = 0.9 + (totalComfort / 8) * 0.2;
  return clamp((stadium.fans / 100) * avgComfortBonus, 0.3, 1.2);
}

export function attendance(stadium: StadiumState): number {
  return Math.round(capacity(stadium) * attendanceFactor(stadium));
}

/**
 * Gate receipts. The 0.5 / 0.45 split is the prototype's assumption that half
 * the crowd stands, 45% sits, and the VIP boxes are counted separately.
 */
export function ticketIncome(stadium: StadiumState): number {
  const att = attendance(stadium);
  const p = stadium.ticketPrices;
  return Math.round(att * 0.5 * p.steh + att * 0.45 * p.sitz + vipCapacity(stadium) * p.vip);
}

/** What an upgrade costs and what it adds, so the UI never guesses. */
export function expansionQuote(stadium: StadiumState, blockId: string) {
  const block = stadium.blocks[blockId];
  if (!block) return undefined;
  return { cost: block.cost, seats: block.addSeats, newCap: block.cap + block.addSeats };
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}
