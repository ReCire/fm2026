import { defineModule } from '$lib/engine/module';
import { StocksSchema, createStocks, STOCKS_VERSION } from './state';
import { closeMarket, totalDividend, portfolioValue, unrealised } from './rules';
import { instruments, copy } from './content';
import { postToLedger, formatMoney } from '../finance/module';
import { capacity } from '../stadium/rules';
import { gatedBy } from '../progression/rules';

/**
 * Das Depot.
 *
 * Two data syntheses buy `stockBonus` and paid into a market whose prices never
 * moved — the prototype read `.price` in three places and wrote it in none, so
 * a holding was worth what it cost for a decade and the doctrine raised an
 * interest rate. The dividend worked perfectly, which is why nobody noticed.
 *
 * Three of the four instruments track the club's own world, so the manager
 * knows something the market does not: you know you are expanding the stadium
 * before Stadionpark Immobilien AG does. Exactly one tracks nothing — two would
 * be a casino, none would be a spreadsheet — and it is the one that looks most
 * like football, pays worst and swings hardest.
 */
export default defineModule({
  id: 'stocks',
  title: copy.title,
  summary:
    'Vier Papiere, deren Kurse sich bewegen — drei davon nach dem, was in deinem Verein passiert.',
  nav: { group: 'Wirtschaft', icon: '📈', order: 40 },
  requires: ['finance', 'stadium', 'league'],
  gate: gatedBy('stocks'),

  state: { schema: StocksSchema, create: createStocks, version: STOCKS_VERSION },

  hooks: {
    matchday: {
      phase: 'economy',
      /*
       * Order 20 — after stadium builds at 10 and sponsors at 15, so the
       * capacity the market reacts to is the capacity that exists after this
       * matchday's construction. Reading it before would have Stadionpark
       * respond to an expansion a week late, forever, and nothing would ever
       * look wrong.
       */
      order: 20,
      consumes: ['league.level', 'stocks.yield'],
      run({ state, rng, emit, query, factor }) {
        const stocks = state.modules.stocks;
        const { season, matchday } = state.meta;

        closeMarket(stocks, rng, {
          stadium: capacity(state.modules.stadium),
          support: state.modules.stadium.fans,
          // Inverted: `playerLevel` counts downward, and a driver whose sign is
          // the opposite of the thing it names is how a promotion crashes the
          // index that tracks promotions.
          division: -query<number>('league.level', 3),
          none: 0
        });

        const dividend = Math.round(totalDividend(stocks, factor('stocks.yield', 1)));
        if (dividend > 0) {
          stocks.dividendsPaid += dividend;
          postToLedger(state.modules.finance, {
            season, matchday, source: 'stocks', reason: 'Dividenden', amount: dividend
          });
        }

        /*
         * Reported only when the portfolio has actually moved against the
         * player. A market that announces itself every week is a market the
         * player stops reading, and the gain is already visible on the screen
         * they went to in order to buy the thing.
         */
        const swing = unrealised(stocks);
        const held = portfolioValue(stocks);
        if (held > 0 && swing < -held * 0.15) {
          emit({
            source: 'stocks',
            severity: 'warn',
            title: 'Das Depot steht im Minus',
            detail: `${formatMoney(Math.round(swing))} unter Einstand.`,
            goto: 'stocks'
          });
        }
      }
    }
  }
});

export { instruments };
