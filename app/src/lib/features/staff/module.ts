import { defineModule } from '$lib/engine/module';
import { StaffSchema, createStaff, STAFF_VERSION } from './state';
import { contributions, wageBill, employed } from './rules';
import { postToLedger } from '../finance/module';
import { gatedBy } from '../progression/rules';

export default defineModule({
  id: 'staff',
  title: 'Stab',
  summary: 'Der Betreuerstab: wen du einstellst, und was er tatsächlich bewirkt.',
  nav: { group: 'Verein', icon: '👔', order: 30 },
  requires: ['finance'],
  gate: gatedBy('staff'),

  state: { schema: StaffSchema, create: createStaff, version: STAFF_VERSION },

  hooks: {
    matchday: [
      {
        /*
         * Contribute before anything reads. Staff never applies its own effects
         * and never names the systems it touches — it declares a key and a
         * value, and whoever consumes that key decides what it means.
         *
         * `pre` at order 5, ahead of matchday's own contribution at 10, though
         * the order between contributors is irrelevant: multiplication and
         * addition are commutative. Only reader-after-contributor matters, and
         * the registry enforces that.
         */
        phase: 'pre',
        order: 5,
        contributes: [
          'squad.strengthBonus', 'squad.fitnessLoss', 'squad.injuryRisk',
          'squad.injuryDuration', 'transfer.fee', 'matchday.homeStrength',
          'stadium.fans', 'contracts.demand', 'merch.online', 'sponsors.income'
        ],
        run({ state, modify, addTo }) {
          for (const c of contributions(state.modules.staff)) {
            if (c.factor !== undefined) modify(c.key, c.factor);
            if (c.add !== undefined) addTo(c.key, c.add);
          }
        }
      },
      {
        phase: 'economy',
        order: 30,
        run({ state, emit }) {
          const staff = state.modules.staff;
          const bill = wageBill(staff);
          if (bill === 0) return;

          postToLedger(state.modules.finance, {
            season: state.meta.season,
            matchday: state.meta.matchday,
            source: 'staff',
            reason: 'Gehälter Stab',
            amount: -bill
          });

          if (state.modules.finance.money < 0) {
            emit({
              source: 'staff',
              severity: 'warn',
              title: 'Der Stab kostet mehr als der Verein hat',
              detail: `${employed(staff).length} Angestellte, ${bill.toLocaleString('de-DE')} € pro Spieltag.`,
              goto: 'staff'
            });
          }
        }
      }
    ]
  },

  docs: {}
});

export { isEmployed, employed, available, wageBill, canHire, hire, dismiss, contributions, combinedFactor, combinedAdd, touchedKeys } from './rules';
export { STAFF_ROLES, roleById, type StaffRole } from './content';
