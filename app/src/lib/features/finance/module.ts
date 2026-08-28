import { defineModule } from '$lib/engine/module';
import { FinanceSchema, createFinance, FINANCE_VERSION } from './state';
import { post, loanInterest } from './rules';
import { financeContent } from './content';

export default defineModule({
  id: 'finance',
  title: 'Finanzen',
  summary: 'Vereinskonto, Budgets, Kredite und das Spieltags-Kontobuch.',
  nav: { group: 'Verein', icon: '💰', order: 10, primary: true },

  state: {
    schema: FinanceSchema,
    create: createFinance,
    version: FINANCE_VERSION
  },

  hooks: {
    /**
     * Runs LAST in the economy phase (order 100), after every other module has
     * posted its income and costs — so interest is charged on the real balance
     * and the board reacts to the final number, not a half-built one.
     */
    matchday: {
      phase: 'economy',
      order: 100,
      run({ state, emit }) {
        const finance = state.modules.finance;
        const { season, matchday } = state.meta;

        if (finance.loanDebt > 0) {
          const interest = loanInterest(finance.loanDebt, financeContent.loanRatePerMatchday);
          post(finance, { season, matchday, source: 'finance', reason: 'Kreditzinsen', amount: -interest });
          emit({
            source: 'finance',
            severity: 'info',
            title: 'Kreditzinsen abgebucht',
            amount: -interest
          });
        }

        if (finance.money < -financeContent.toleratedOverdraft) {
          emit({
            source: 'finance',
            severity: 'bad',
            title: 'Der Vorstand ist alarmiert',
            detail: 'Das Vereinskonto liegt deutlich im Minus. Verkäufe oder ein Kredit sind jetzt nötig.',
            goto: 'finance'
          });
        }
      }
    }
  }
});

/**
 * Public API for modules that declare `requires: ['finance']`.
 * Cross-module *control flow* goes through the tick bus; cross-module *data*
 * goes through a narrow, explicit surface like this one. That is layering, and
 * it is checked at boot — not the free-for-all the prototype had.
 */
export { post as postToLedger } from './rules';
export { formatMoney } from './rules';
