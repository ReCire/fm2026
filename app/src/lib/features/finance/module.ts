import { defineModule } from '$lib/engine/module';
import { wageBill } from '../squad/rules';
import { FinanceSchema, createFinance, FINANCE_VERSION, migrateFinance } from './state';
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
    version: FINANCE_VERSION,
    migrate: migrateFinance
  },

  /*
   * Now that the club can actually run out of money, this is the department
   * most worth interrupting the player about — and for a year it could not have
   * been, because gate receipts were twenty times the wage bill and the balance
   * only ever went up.
   */
  attention: (state) => {
    const f = state.modules.finance;
    const items = [];
    if (f.money < 0) {
      items.push({
        id: 'finance.overdrawn',
        urgency: 'now' as const,
        label: `Konto überzogen — ${Math.round(f.money).toLocaleString('de-DE')} €`
      });
    } else if (f.money < wageBill(state.modules.squad) * 4) {
      // Four matchdays of wages: enough warning to sell someone, rather than a
      // notice that arrives once it is already too late to act on.
      items.push({
        id: 'finance.thin',
        urgency: 'soon' as const,
        label: 'Rücklagen decken keine vier Spieltage Gehalt mehr'
      });
    }
    return items;
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
      consumes: ['finance.opsIncome', 'finance.opsIncomeMod', 'finance.opex', 'finance.transferBudget'],
      run({ state, emit, total, factor }) {
        const finance = state.modules.finance;
        const { season, matchday } = state.meta;

        /*
         * Operating income the club earns away from the pitch — a doctrine that
         * builds a business rather than a team. Booked here, last in the
         * economy phase, so it lands on the same balance as everything else and
         * shows up in the ledger where the player looks for it.
         */
        /*
         * `opsIncomeMod` scales the whole line — it is what `investorMod`
         * maps to, and the 50+1 node's −20% is a POLITICAL cost: member
         * control cools outside capital. A factor on the total rather than a
         * second total, so it also scales ops income from nodes bought later.
         */
        const ops = Math.round(total('finance.opsIncome') * factor('finance.opsIncomeMod', 1));
        if (ops !== 0) {
          post(finance, {
            season, matchday, source: 'finance',
            reason: 'Betriebseinnahmen', amount: ops
          });
        }

        // Running costs, scaled. Applied to the wage budget rather than to
        // wages themselves: this is what the club can AFFORD to run, and squad
        // already owns what it actually pays.
        const opex = factor('finance.opex');
        if (opex !== 1) finance.wageBudget = Math.round(finance.wageBudget * opex);

        const budget = factor('finance.transferBudget');
        if (budget !== 1) finance.transferBudget = Math.round(finance.transferBudget * budget);

        /*
         * Recorded here because this hook runs last in the economy phase, after
         * every module has posted its income and its costs — so the balance is
         * final for the tick. Checking earlier would miss a club that went
         * under only once the wages landed.
         *
         * Never cleared. "Ever in debt" is a fact about a career, not a state
         * of the account, and the two are opposite stories on an identical
         * balance sheet.
         */
        if (finance.money < 0 || finance.loanDebt > 0) finance.everInDebt = true;

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
