import type { StadiumState } from './state';
import { OPENING_PRICES } from './state';

/**
 * How hard the crowd pushes back on the price of a ticket.
 *
 * Asymmetric on purpose. Overcharging empties the ground faster than
 * undercutting fills it, because a symmetric curve would make a permanent
 * price CUT the right answer instead of a permanent rise — the same free lever
 * pointed the other way.
 *
 * The numbers are chosen so the slider has a wrong answer at both ends and an
 * optimum in between: a twenty percent rise costs about a tenth of the crowd
 * and still earns more, doubling the price roughly breaks even, and past that
 * the ground empties faster than the price makes up for. A test holds that
 * shape rather than the constants.
 */
const C = {
  openingPrices: OPENING_PRICES,
  /**
   * How steeply the crowd thins as the price rises, as an exponential rate.
   *
   * Exponential and NOT linear-with-a-floor, which is what this was first
   * written as and what the test caught. A floor means the crowd stops
   * shrinking while the price keeps climbing, so income tends to
   * `price × floor` and rises without limit — at five times the opening price
   * the ground was a third full and earning nearly twice as much. A floor is a
   * free lever with a speed limit on it.
   *
   * Decaying instead puts the optimum at `1/rate − 1`: at 0.7 the best price
   * is about forty percent over the opening one, and past that the ground
   * empties faster than the price makes up for.
   */
  pricePainPull: 0.7,
  /** Crowd gained per unit of undercutting, and the cap on it. */
  priceBargainPull: 0.2,
  priceBargainCap: 0.08
} as const;

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
export function attendanceFactor(stadium: StadiumState, tolerance = 0, demand = 1): number {
  let totalComfort = 0;
  for (const b of Object.values(stadium.blocks)) {
    totalComfort += (b.foodLvl + b.merchLvl + b.toiletLvl) / 9;
  }
  const avgComfortBonus = 0.9 + (totalComfort / 8) * 0.2;
  /*
   * The mood-and-comfort clamp is the prototype's, kept verbatim — but the
   * price effect is applied OUTSIDE it, and that is not a detail.
   *
   * Inside, the 0.3 floor stops the crowd shrinking while the price keeps
   * climbing, so income turns upward again past double: measured, the ground
   * bottomed out at 1.026 and five times the opening price earned more than
   * twice what the default did. The floor exists to stop bad MOOD emptying a
   * ground entirely, which is a different claim from "there is a price at
   * which nobody comes" — and there is.
   */
  const mood = clamp((stadium.fans / 100) * avgComfortBonus, 0.3, 1.2);
  /*
   * `demand` is what `ticketDemand` buys — standing room, and more of it. It
   * multiplies OUTSIDE the mood clamp for the same reason the price does: the
   * clamp is about how bad a mood can get, not about how many people a
   * doctrine can bring through the gate.
   */
  return mood * priceAppetite(stadium, tolerance) * demand;
}

/**
 * What the ticket prices do to the size of the crowd.
 *
 * Nothing did, before this. `attendanceFactor` read comfort and mood, and
 * `ticketIncome` multiplied the crowd by whatever the slider said — so raising
 * prices raised revenue with no counterweight, at any value, forever. The
 * slider was a control whose answer was always "higher", which is the fifth
 * failure shape: every wire attached, the number moves, and there is no
 * decision at the end of it.
 *
 * Measured against the opening prices rather than an absolute, so the
 * reference travels with any retune of the starting stadium. Pricing at the
 * default costs nothing; doubling everything empties a third of the ground.
 *
 * `tolerance` is what three doctrine nodes buy — a club whose fans put up with
 * more. It raises the price the crowd treats as normal, so it does not make
 * tickets free, it moves where the resistance starts.
 */
export function priceAppetite(stadium: StadiumState, tolerance = 0): number {
  const p = stadium.ticketPrices;
  const base = C.openingPrices;
  // Weighted the way the gate receipts are: half stand, 45% sit, the boxes are
  // a rounding error on the crowd even when they are not on the income.
  const charged = p.steh * 0.5 + p.sitz * 0.45 + p.vip * 0.05;
  const normal = (base.steh * 0.5 + base.sitz * 0.45 + base.vip * 0.05) * (1 + tolerance);
  if (normal <= 0) return 1;

  const over = charged / normal - 1;
  if (over <= 0) {
    /*
     * Undercutting brings a few more in, and far less than overcharging drives
     * away. A symmetric curve would make a permanent price cut the right
     * answer instead of a permanent rise — the same free lever pointed the
     * other way.
     */
    return clamp(1 - over * C.priceBargainPull, 1, 1 + C.priceBargainCap);
  }
  return Math.exp(-over * C.pricePainPull);
}

export function attendance(stadium: StadiumState, tolerance = 0, demand = 1): number {
  // Capped at the ground's own size. Demand that exceeds capacity is a queue,
  // not a crowd, and a stadium selling more seats than it has is the kind of
  // number nobody notices until it appears on a balance sheet.
  return Math.min(capacity(stadium), Math.round(capacity(stadium) * attendanceFactor(stadium, tolerance, demand)));
}

/**
 * Gate receipts. The 0.5 / 0.45 split is the prototype's assumption that half
 * the crowd stands, 45% sits, and the VIP boxes are counted separately.
 */
export function ticketIncome(stadium: StadiumState, tolerance = 0, demand = 1): number {
  const att = attendance(stadium, tolerance, demand);
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
