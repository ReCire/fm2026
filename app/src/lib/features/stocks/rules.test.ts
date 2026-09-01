import { describe, it, expect } from 'vitest';
import { createRng } from '$lib/engine/rng';
import {
  buy, clampPrice, closeMarket, costToBuy, dividendFor, driverSignal, priceMove,
  priceOf, portfolioValue, proceedsOf, sell, sharesOf, totalDividend,
  unrealised, valueOf, type DriverReadings
} from './rules';
import { createStocks } from './state';
import { instruments, instrumentById, stocksContent as C } from './content';

const fresh = () => createStocks();
const rng = (seed = 5) => createRng(seed);
const quiet: DriverReadings = { stadium: 0, support: 0, division: 0, none: 0 };

const steadiest = [...instruments].sort((a, b) => a.volatility - b.volatility)[0]!;
const wildest = [...instruments].sort((a, b) => b.volatility - a.volatility)[0]!;

/** Run a season of closes and report the range each price covered. */
function ranges(seed: number, readings: DriverReadings = quiet) {
  const s = fresh();
  const stream = rng(seed);
  for (let i = 0; i < 34; i++) closeMarket(s, stream, readings);
  return Object.fromEntries(
    instruments.map((i) => {
      const series = s.history[i.id]!;
      return [i.id, (Math.max(...series) - Math.min(...series)) / i.base];
    })
  );
}

describe('prices actually move', () => {
  /*
   * The whole feature. The prototype read `.price` in three places and wrote it
   * in none, so a holding was worth what it cost for a decade — buying was
   * always right, selling always wrong, and two doctrine nodes raised an
   * interest rate. Nobody noticed because the dividend worked perfectly.
   */
  it('is not the same number a season later', () => {
    const s = fresh();
    const before = { ...s.prices };
    const stream = rng();
    for (let i = 0; i < 34; i++) closeMarket(s, stream, quiet);
    for (const i of instruments) {
      expect(s.prices[i.id], `${i.id} never moved`).not.toBe(before[i.id]);
    }
  });

  it('moves the ones nobody owns, too', () => {
    /*
     * A market that only ticks while you are holding it is a savings account
     * that hides when you look away. The player has to be able to watch
     * something they did not buy and regret it.
     */
    const s = fresh();
    expect(Object.keys(s.holdings)).toHaveLength(0);
    closeMarket(s, rng(), quiet);
    expect(instruments.every((i) => s.prices[i.id] !== i.base)).toBe(true);
  });

  it('goes down as well as up, over a career', () => {
    const s = fresh();
    const stream = rng(3);
    let fell = 0;
    for (let i = 0; i < 200; i++) {
      const before = priceOf(s, wildest.id);
      closeMarket(s, stream, quiet);
      if (priceOf(s, wildest.id) < before) fell += 1;
    }
    // Symmetric noise: a market with a built-in drift is a savings account
    // whichever way the drift points.
    expect(fell).toBeGreaterThan(60);
    expect(fell).toBeLessThan(140);
  });

  it('stays inside the band its content declares', () => {
    const s = fresh();
    const stream = rng(9);
    for (let i = 0; i < 500; i++) closeMarket(s, stream, quiet);
    for (const i of instruments) {
      for (const p of s.history[i.id]!) {
        expect(p).toBeGreaterThanOrEqual(i.base * i.floor);
        expect(p).toBeLessThanOrEqual(i.base * i.ceiling);
      }
    }
  });

  it('keeps only as much history as the chart asks for', () => {
    const s = fresh();
    const stream = rng();
    for (let i = 0; i < C.history * 3; i++) closeMarket(s, stream, quiet);
    for (const i of instruments) expect(s.history[i.id]!.length).toBe(C.history);
  });

  it('clamps rather than throwing on a price outside the band', () => {
    expect(clampPrice(steadiest, 0)).toBe(steadiest.base * steadiest.floor);
    expect(clampPrice(steadiest, 1e9)).toBe(steadiest.base * steadiest.ceiling);
  });
});

describe('what the manager knows', () => {
  it('turns a change in the club into a signal, not a level', () => {
    /*
     * On the CHANGE, or a big club's holdings would rise every week forever —
     * the savings account again with an extra step.
     */
    expect(driverSignal('stadium', 5000, 5000)).toBe(0);
    expect(driverSignal('stadium', 7000, 5000)).toBeGreaterThan(0);
    expect(driverSignal('stadium', 3000, 5000)).toBeLessThan(0);
  });

  it('never lets one enormous expansion move a price more than volatility allows', () => {
    expect(driverSignal('stadium', 500_000, 0)).toBe(1);
    expect(driverSignal('support', -500, 0)).toBe(-1);
  });

  it('gives the Fan-Token ETF nothing to know', () => {
    /*
     * Exactly one instrument tracks nothing. Two would be a casino, none would
     * be a spreadsheet — and the joke only works if the other three genuinely
     * are connected, which is what the next test holds.
     */
    expect(driverSignal('none', 999, 0)).toBe(0);
    const untracked = instruments.filter((i) => i.driver === 'none');
    expect(untracked).toHaveLength(1);
  });

  it('makes a tracked instrument respond to its own driver', () => {
    /*
     * Vary the input, assert the output moves. Compared against the SAME seed
     * with a flat world, so the only difference is the news.
     */
    const tracked = instruments.find((i) => i.driver === 'stadium')!;
    const flat = fresh();
    const building = fresh();
    closeMarket(flat, rng(11), quiet);
    closeMarket(building, rng(11), { ...quiet, stadium: 4_000 });
    expect(priceOf(building, tracked.id)).toBeGreaterThan(priceOf(flat, tracked.id));
  });

  it('leaves the untracked one alone when the club changes', () => {
    const untracked = instruments.find((i) => i.driver === 'none')!;
    const flat = fresh();
    const busy = fresh();
    closeMarket(flat, rng(11), quiet);
    closeMarket(busy, rng(11), { stadium: 9_000, support: 40, division: 2, none: 0 });
    expect(priceOf(busy, untracked.id)).toBe(priceOf(flat, untracked.id));
  });
});

describe('the shape of the choice', () => {
  it('trades yield against volatility, so none of the four is simply best', () => {
    /*
     * An instrument that paid best AND moved least would be the only correct
     * answer, and four instruments with one correct answer is one instrument
     * with three distractions.
     */
    const byYield = [...instruments].sort((a, b) => b.dividend - a.dividend);
    for (let i = 1; i < byYield.length; i++) {
      expect(
        byYield[i]!.volatility,
        `${byYield[i]!.id} pays less than ${byYield[i - 1]!.id} AND moves less`
      ).toBeGreaterThan(byYield[i - 1]!.volatility);
    }
  });

  it('makes the football-looking one the worst bet', () => {
    const token = instruments.find((i) => i.driver === 'none')!;
    expect(token.dividend).toBe(Math.min(...instruments.map((i) => i.dividend)));
    expect(token.volatility).toBe(Math.max(...instruments.map((i) => i.volatility)));
  });

  it('actually produces different ranges over a season', () => {
    /*
     * The content says the volatilities differ; this says the market delivers
     * it. A table that trades yield against a number nothing reads would be
     * the fifth failure shape with extra steps.
     */
    const r = ranges(17);
    expect(r[wildest.id]!).toBeGreaterThan(r[steadiest.id]!);
  });
});

describe('trading', () => {
  it('charges the fee on the way in and again on the way out', () => {
    /*
     * Both crossings, deliberately. Without it, buying and selling every
     * matchday on a hunch costs nothing and churning is optimal — a fee is
     * what makes holding a position a position rather than a habit.
     */
    const s = fresh();
    const id = steadiest.id;
    const raw = priceOf(s, id) * C.lotSize;
    expect(costToBuy(s, id)).toBeGreaterThan(raw);
    expect(proceedsOf(s, id)).toBeLessThan(raw);
  });

  it('is small enough that a correct call still pays for itself', () => {
    /*
     * The other half of the same number. A fee that outran the steadiest
     * instrument's own swing would make every trade a loss and the market
     * unplayable — which reads as "the market is hard" rather than as a bug.
     */
    expect(C.fee * 2).toBeLessThan(steadiest.volatility);
  });

  it('refuses what the club cannot afford, and says why', () => {
    const s = fresh();
    const out = buy(s, steadiest.id, 0);
    expect(out.ok).toBe(false);
    expect(out.ok === false && out.reason.length).toBeGreaterThan(5);
    expect(sharesOf(s, steadiest.id)).toBe(0);
  });

  it('refuses to sell what is not held', () => {
    const s = fresh();
    expect(sell(s, steadiest.id).ok).toBe(false);
  });

  it('books the loss when a holding has fallen', () => {
    const s = fresh();
    buy(s, steadiest.id, 1_000_000);
    s.prices[steadiest.id] = steadiest.base * 0.5;
    const out = sell(s, steadiest.id);
    expect(out.ok).toBe(true);
    expect(s.realised).toBeLessThan(0);
  });

  it('books the profit when it has risen', () => {
    const s = fresh();
    buy(s, steadiest.id, 1_000_000);
    s.prices[steadiest.id] = steadiest.base * 2;
    sell(s, steadiest.id);
    expect(s.realised).toBeGreaterThan(0);
  });

  it('leaves a partial sale carrying its own share of what was paid', () => {
    /*
     * `spent` falls proportionally, not by the sale price. Subtracting the
     * proceeds would let a rising holding book a profit twice and drive
     * `spent` negative — a loss the screen would then report as a gain.
     */
    const s = fresh();
    buy(s, steadiest.id, 1_000_000, 4);
    const spentBefore = s.holdings[steadiest.id]!.spent;
    s.prices[steadiest.id] = steadiest.base * 3;
    sell(s, steadiest.id, 2);
    const holding = s.holdings[steadiest.id]!;
    expect(holding.shares).toBe(C.lotSize * 2);
    expect(holding.spent).toBeCloseTo(spentBefore / 2, 6);
    expect(holding.spent).toBeGreaterThan(0);
  });

  it('forgets a position entirely once it is fully sold', () => {
    const s = fresh();
    buy(s, steadiest.id, 1_000_000);
    sell(s, steadiest.id);
    expect(s.holdings[steadiest.id]).toBeUndefined();
    expect(portfolioValue(s)).toBe(0);
  });
});

describe('dividends', () => {
  it('pay on what a holding is worth NOW, not on what it cost', () => {
    /*
     * The load-bearing one. A dividend on the purchase price would let a
     * collapsed holding keep paying as though nothing had happened, which is
     * the savings account returning through a side door.
     */
    const s = fresh();
    buy(s, steadiest.id, 1_000_000);
    const full = dividendFor(s, steadiest.id);
    s.prices[steadiest.id] = steadiest.base * 0.5;
    expect(dividendFor(s, steadiest.id)).toBeCloseTo(full / 2, 6);
  });

  it('pay nothing on an empty portfolio', () => {
    expect(totalDividend(fresh())).toBe(0);
  });

  it('are multiplied by the doctrine, which is what those two nodes buy', () => {
    const s = fresh();
    buy(s, steadiest.id, 1_000_000);
    expect(totalDividend(s, 1.5)).toBeCloseTo(totalDividend(s) * 1.5, 6);
  });
});

describe('reporting', () => {
  it('shows a gain that matches value minus cost', () => {
    const s = fresh();
    buy(s, wildest.id, 1_000_000);
    expect(unrealised(s)).toBeCloseTo(valueOf(s, wildest.id) - s.holdings[wildest.id]!.spent, 6);
  });

  it('starts a fresh depot at exactly nothing', () => {
    const s = fresh();
    expect(portfolioValue(s)).toBe(0);
    expect(unrealised(s)).toBe(0);
    expect(s.realised).toBe(0);
    for (const i of instruments) expect(priceOf(s, i.id)).toBe(i.base);
  });
});

describe('determinism', () => {
  it('two markets on one seed close identically', () => {
    const a = fresh();
    const b = fresh();
    const sa = rng(88);
    const sb = rng(88);
    for (let i = 0; i < 30; i++) {
      closeMarket(a, sa, quiet);
      closeMarket(b, sb, quiet);
    }
    expect(a).toEqual(b);
  });
});
