import { defineModule } from '$lib/engine/module';
import { LinkedOutSchema, createLinkedOut, LINKEDOUT_VERSION } from './state';
import { isRefreshDue, refresh, employed, wageBill } from './rules';
import { roleById } from './content';
import { postToLedger } from '../finance/module';

/**
 * LinkedOut: the marketplace for people who run departments instead of you.
 *
 * Ungated. A career network exists whether or not you are ready to use it, and
 * gating it behind an unlock would mean the one screen that explains what
 * delegation IS only appears after you would have wanted it.
 *
 * Which modules can actually be handed over is a separate question, answered by
 * the registry rather than by a gate — see `hireableRoles`. Today that is
 * `transfer` and `contracts`; everything else shows as pending with the reason.
 */
export default defineModule({
  id: 'linkedout',
  title: 'LinkedOut',
  summary: 'Das Netzwerk: wer eine Abteilung übernehmen könnte, und was er dafür verlangt.',
  nav: { group: 'Verein', icon: '🤝', order: 35 },
  requires: ['finance', 'progression'],

  state: { schema: LinkedOutSchema, create: createLinkedOut, version: LINKEDOUT_VERSION },

  /*
   * Deliberately no `attention`.
   *
   * An empty inbox on the network is what a club that has not hired anyone
   * looks like, for most of a career — the same case as the campus item the
   * architect wrote and removed on the same day. A badge that is on from the
   * first minute until you happen to hire someone is not a call to act, it is
   * a permanent decoration, and it takes every other department's badge down
   * with it.
   */

  hooks: {
    /*
     * The field turns over on the week tick, not the matchday.
     *
     * Hiring an executive is a between-games decision, and the week is where
     * the game already puts those. Refreshing on a matchday would mean the
     * pool changed while the player was reading a result.
     */
    week: {
      phase: 'world',
      order: 40,
      consumes: ['league.level'],
      run({ state, rng, emit, query }) {
        const lo = state.modules.linkedout;
        const matchday = state.meta.matchday;

        /*
         * Which departments can be handed over is derived here rather than
         * stored, because the answer changes when a module gains an autopilot
         * and a stored copy would go stale in the direction of "offers a hire
         * that silences a department nobody runs".
         */
        const withAutopilot = new Set(
          [...MODULES_WITH_AUTOPILOT].filter((id) => id in state.modules)
        );

        if (isRefreshDue(lo, matchday)) {
          const before = lo.contacts.length;
          refresh(lo, rng, matchday, query<number>('league.level', 3), withAutopilot);
          /*
           * Only announced when the field actually changes from nothing to
           * something. A "new contacts available" event every three weeks for a
           * career is the toast equivalent of a badge that is always on.
           */
          if (before === 0 && lo.contacts.length > 0) {
            emit({
              source: 'linkedout',
              severity: 'info',
              title: 'Neue Kontakte auf LinkedOut',
              detail: 'Jemand könnte eine Abteilung übernehmen — und dann selbst entscheiden.',
              goto: 'linkedout'
            });
          }
        }
      }
    },

    /*
     * Executives are paid on the matchday, with everyone else, so the wage
     * shows up in the same ledger the player already reads rather than in a
     * line of its own that only this screen explains.
     */
    matchday: {
      phase: 'economy',
      order: 30,
      run({ state, emit }) {
        const lo = state.modules.linkedout;
        const bill = wageBill(lo, state.modules.progression);
        if (bill <= 0) return;

        postToLedger(state.modules.finance, {
          season: state.meta.season,
          matchday: state.meta.matchday,
          source: 'linkedout',
          reason: 'Gehälter Führungskräfte',
          amount: -bill
        });

        /*
         * The one event this module raises unprompted: your executives cost
         * more than they can plausibly be saving you. Not a rule the engine
         * enforces — just the moment worth noticing.
         */
        const team = employed(lo, state.modules.progression);
        if (team.length > 0 && state.modules.finance.money < bill * 4) {
          emit({
            source: 'linkedout',
            severity: 'warn',
            title: 'Die Führungsebene wird teuer',
            detail: `${team.length} Führungskräfte kosten ${Math.round(bill).toLocaleString('de-DE')} € pro Spieltag.`,
            goto: 'linkedout'
          });
        }
      }
    }
  }
});

/**
 * Which modules ship an autopilot.
 *
 * Named here rather than read off the registry because a module cannot import
 * the registry that contains it without a cycle. A test asserts this list and
 * the registry agree, so it cannot drift into offering a hire for a department
 * that would go dark.
 */
export const MODULES_WITH_AUTOPILOT: readonly string[] = ['transfer', 'contracts'];

/** The department a hired contact is running, for the shell's labels. */
export function departmentOf(roleId: string): string | undefined {
  return roleById.get(roleId)?.module;
}
