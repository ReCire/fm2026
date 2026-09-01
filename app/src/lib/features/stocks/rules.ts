import type { Rng } from '$lib/engine/rng';
import {
  instruments, instrumentById, stocksContent, type Driver, type Instrument
} from './content';
import type { StocksState } from './state';

/**
 * A market with prices in it.
 *
 * The one thing the prototype did not have: `.price` was read in three places
 * and written in none, so every holding was worth what it cost forever. Every
 * function here exists to make a price move, and to make moving it a decision
 * rather than an interest rate.
 */

const C = stocksContent;

/* ─────────────────────────────────────────────────────────────────────────
 * What the club knows
 * ───────────────────────────────────────────────────────────────────────── */

export interface DriverReadings {
  /** Stadium capacity. Rises when the club builds. */
  stadium: number;
  /** Fan satisfaction, 0..100. */
  support: number;
  /**
   * League level, INVERTED so that up is up.
   *
   * `playerLevel` counts downward — 0 is the top division — and a driver whose
   * sign is the opposite of the thing it names is how a promotion ends up
   * crashing the index that tracks promotions.
   */
  division: number;
  /** Tracks nothing. The Fan-Token ETF's driver, and deliberately inert. */
  none: number;
}

/**
 * How far a driver moved since the last close, as a fraction of its own scale.
 *
 * Clamped to ±1 so one enormous stadium expansion cannot move a price by more
 * than a matchday's volatility allows. The scale per driver is what makes a
 * one-division promotion comparable to a two-thousand-seat stand: without it,
 * capacity — which counts in thousands — would drown every other signal.
 */
const DRIVER_SCALE: Record<Driver, number> = {
  stadium: 2_000,
  support: 12,
  division: 1,
  none: 1
};

export function driverSignal(driver: Driver, now: number, before: number): number {
  if (driver === 'none') return 0;
  const moved = (now - before) / DRIVER_SCALE[driver];
  return Math.max(-1, Math.min(1, moved));
}

/* ─────────────────────────────────────────────────────────────────────────
 * Prices
 * ───────────────────────────────────────────────────────────────────────── */

/**
 * One matchday's move, as a fraction of the current price.
 *
 * `driverShare` of it is what the club did; the rest is noise. At zero the
 * market is a slot machine and at one it is a spreadsheet the player has
 * already filled in — a little under half means an informed guess is usually
 * right and never safe, which is the only setting under which knowing
 * something is worth anything.
 */
export function priceMove(instrument: Instrument, signal: number, roll: number): number {
  const informed = signal * C.driverShare;
  const noise = roll * (1 - C.driverShare);
  return (informed + noise) * instrument.volatility;
}

/** Keep a price inside the band its content declares. */
export function clampPrice(instrument: Instrument, price: number): number {
  return Math.max(
    instrument.base * instrument.floor,
    Math.min(instrument.base * instrument.ceiling, price)
  );
}

/**
 * Close the market for the matchday.
 *
 * Every instrument moves, including the ones nobody owns — a market that only
 * ticks while you are holding it is a savings account that hides when you look
 * away, and the player has to be able to watch something they did not buy and
 * regret it.
 */
export function closeMarket(
  state: StocksState,
  rng: Rng,
  readings: DriverReadings
): void {
  for (const instrument of instruments) {
    const driver = instrument.driver;
    const before = state.lastDrivers[driver] ?? readings[driver];
    const signal = driverSignal(driver, readings[driver], before);
    // Symmetric around zero: a market with a built-in drift is a savings
    // account whichever way the drift points.
    const roll = rng.next() * 2 - 1;
    const price = state.prices[instrument.id] ?? instrument.base;
    const moved = clampPrice(instrument, price * (1 + priceMove(instrument, signal, roll)));

    state.prices[instrument.id] = moved;
    const series = state.history[instrument.id] ?? [];
    series.push(moved);
    if (series.length > C.history) series.splice(0, series.length - C.history);
    state.history[instrument.id] = series;
  }

  for (const driver of Object.keys(readings) as Driver[]) {
    state.lastDrivers[driver] = readings[driver];
  }
}

/* ─────────────────────────────────────────────────────────────────────────
 * Positions
 * ───────────────────────────────────────────────────────────────────────── */

export function priceOf(state: StocksState, id: string): number {
  return state.prices[id] ?? instrumentById.get(id)?.base ?? 0;
}

export function sharesOf(state: StocksState, id: string): number {
  return state.holdings[id]?.shares ?? 0;
}

/** What a holding is worth right now. */
export function valueOf(state: StocksState, id: string): number {
  return sharesOf(state, id) * priceOf(state, id);
}

/** The whole portfolio, at today's prices. */
export function portfolioValue(state: StocksState): number {
  return instruments.reduce((sum, i) => sum + valueOf(state, i.id), 0);
}

/** What a lot costs, fee included. Shown before the click, not after. */
export function costToBuy(state: StocksState, id: string, lots = 1): number {
  const gross = priceOf(state, id) * C.lotSize * lots;
  return gross * (1 + C.fee);
}

/** What a sale actually puts in the bank, fee already taken. */
export function proceedsOf(state: StocksState, id: string, lots = 1): number {
  const gross = priceOf(state, id) * C.lotSize * lots;
  return gross * (1 - C.fee);
}

export type TradeResult =
  | { ok: true; amount: number }
  | { ok: false; reason: string };

/**
 * Buy, charging the fee on the way in.
 *
 * The fee is charged on BOTH crossings deliberately. Without it, buying and
 * selling every matchday on a hunch costs nothing and churning is optimal — a
 * fee is what makes holding a position a position rather than a habit. It is
 * small enough that a correct call still pays for itself.
 */
export function buy(state: StocksState, id: string, money: number, lots = 1): TradeResult {
  if (!instrumentById.has(id)) return { ok: false, reason: 'Dieses Papier gibt es nicht.' };
  if (lots < 1) return { ok: false, reason: 'Nichts zu kaufen.' };
  const cost = costToBuy(state, id, lots);
  if (cost > money) return { ok: false, reason: 'Das Vereinskonto gibt das nicht her.' };

  const holding = state.holdings[id] ?? { shares: 0, spent: 0 };
  holding.shares += C.lotSize * lots;
  holding.spent += cost;
  state.holdings[id] = holding;
  state.feesPaid += cost - priceOf(state, id) * C.lotSize * lots;
  return { ok: true, amount: cost };
}

/**
 * Sell, charging the fee on the way out and booking the profit or the loss.
 *
 * `spent` is reduced proportionally rather than by the sale price, so a partial
 * sale leaves the remaining shares carrying their own share of what was paid.
 * Subtracting the proceeds instead would let a rising holding book a profit
 * twice and drive `spent` negative.
 */
export function sell(state: StocksState, id: string, lots = 1): TradeResult {
  const holding = state.holdings[id];
  const shares = C.lotSize * lots;
  if (!holding || holding.shares < shares) {
    return { ok: false, reason: 'So viele Anteile hält der Verein nicht.' };
  }

  const gross = priceOf(state, id) * shares;
  const net = proceedsOf(state, id, lots);
  const share = shares / holding.shares;
  const basis = holding.spent * share;

  holding.shares -= shares;
  holding.spent -= basis;
  if (holding.shares === 0) delete state.holdings[id];

  state.feesPaid += gross - net;
  state.realised += net - basis;
  return { ok: true, amount: net };
}

/* ─────────────────────────────────────────────────────────────────────────
 * Income
 * ───────────────────────────────────────────────────────────────────────── */

/**
 * The matchday dividend, on CURRENT value rather than on what was paid.
 *
 * On value, deliberately and load-bearingly. A dividend on the purchase price
 * would let a collapsed holding keep paying as though nothing had happened,
 * which is exactly the savings account this whole feature exists to replace,
 * arriving through a side door.
 */
export function dividendFor(state: StocksState, id: string, yieldFactor = 1): number {
  const instrument = instrumentById.get(id);
  if (!instrument) return 0;
  return valueOf(state, id) * instrument.dividend * yieldFactor;
}

export function totalDividend(state: StocksState, yieldFactor = 1): number {
  return instruments.reduce((sum, i) => sum + dividendFor(state, i.id, yieldFactor), 0);
}

/** Unrealised gain or loss across the portfolio, for the screen. */
export function unrealised(state: StocksState): number {
  return instruments.reduce((sum, i) => {
    const holding = state.holdings[i.id];
    if (!holding) return sum;
    return sum + (valueOf(state, i.id) - holding.spent);
  }, 0);
}
