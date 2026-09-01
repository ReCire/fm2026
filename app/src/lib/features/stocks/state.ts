import { z } from 'zod';
import { instruments, stocksContent, DRIVERS } from './content';

/**
 * Das Depot.
 *
 * The prototype's stock market never assigned `.price` — read in three places,
 * written in none, so a holding was worth what it cost for a decade. Buying was
 * always right and selling always wrong, and two doctrine nodes raised an
 * interest rate. Nobody noticed because the dividend WORKED: it paid every
 * matchday, the bonus applied, the number went up.
 *
 * So the state that matters here is `prices`, and everything else exists to
 * make a price worth reading.
 */

export const HoldingSchema = z.object({
  shares: z.number().int().min(0),
  /**
   * What the shares cost, fees included.
   *
   * Kept so the screen can show a gain rather than only a value. It is NOT
   * what dividends pay on — see `dividendFor` — because a dividend on the
   * purchase price would let a collapsed holding keep paying as though nothing
   * had happened, which is the savings account returning through a side door.
   */
  spent: z.number().min(0)
});
export type Holding = z.infer<typeof HoldingSchema>;

export const StocksSchema = z.object({
  prices: z.record(z.string(), z.number().min(0)),
  /** Newest LAST, capped at `stocksContent.history`. For the chart. */
  history: z.record(z.string(), z.array(z.number().min(0))),
  holdings: z.record(z.string(), HoldingSchema),
  /**
   * What each driver read at the last close.
   *
   * The market moves on the CHANGE in the club's world, not on its level —
   * otherwise a big club's holdings would rise every week forever, which is
   * the savings account again with an extra step. Storing last week's reading
   * is what makes "you know you are expanding the stadium before Stadionpark
   * Immobilien AG does" a real edge rather than a slogan.
   */
  lastDrivers: z.record(z.string(), z.number()),
  /** Career totals, for the screen. */
  dividendsPaid: z.number().min(0),
  feesPaid: z.number().min(0),
  /** Profit and loss actually taken. Negative is allowed and is the point. */
  realised: z.number()
});
export type StocksState = z.infer<typeof StocksSchema>;

declare module '$lib/engine/state' {
  interface ModuleStates {
    stocks: StocksState;
  }
}

export function createStocks(): StocksState {
  const prices: Record<string, number> = {};
  const history: Record<string, number[]> = {};
  for (const i of instruments) {
    prices[i.id] = i.base;
    history[i.id] = [i.base];
  }
  const lastDrivers: Record<string, number> = {};
  for (const d of DRIVERS) lastDrivers[d] = 0;
  return {
    prices,
    history,
    holdings: {},
    lastDrivers,
    dividendsPaid: 0,
    feesPaid: 0,
    realised: 0
  };
}

export const STOCKS_VERSION = 1;
export { stocksContent };
