import { defineModule } from '$lib/engine/module';
import { postToLedger } from '../finance/module';
import { ContractsSchema, createContracts, CONTRACTS_VERSION } from './state';
import { tickContracts, autoRenew } from './rules';
import { contractsContent } from './content';

/**
 * A contract is a property OF A PLAYER — see squad/state.ts. This module only
 * runs the countdown and reacts to it; it never stores which player owns what.
 */
export default defineModule({
  id: 'contracts',
  title: 'Verträge',
  summary: 'Vertragslaufzeiten, Verlängerungen, und was ein ausgelaufener Vertrag am Ende kostet.',
  nav: { group: 'Sport', icon: '📝', order: 22 },
  requires: ['finance', 'squad'],

  state: { schema: ContractsSchema, create: createContracts, version: CONTRACTS_VERSION },

  /*
   * The one department where doing nothing is itself the decision. A contract
   * you never look at does not lapse into a problem — it lapses into a player
   * walking out for nothing, which is a transfer fee you paid and will not get
   * back. So the label names the loss, not the date.
   */
  attention: (state) => {
    const expiring = state.modules.squad.players.filter(
      (p) => p.contractMatchdays > 0 && p.contractMatchdays <= contractsContent.warnAtMatchdays
    );
    if (expiring.length === 0) return [];
    const soonest = Math.min(...expiring.map((p) => p.contractMatchdays));
    return [
      {
        id: 'contracts.expiring',
        urgency: soonest <= 3 ? ('now' as const) : ('soon' as const),
        label:
          expiring.length === 1
            ? `${expiring[0]!.name} geht ablösefrei, wenn du nicht verlängerst`
            : `${expiring.length} Spieler gehen ablösefrei, wenn du nicht verlängerst`
      }
    ];
  },

  /*
   * What a Kaderplaner does instead of the player.
   *
   * `competence` decides which players are renewed and on what terms — never
   * how fast. An executive who merely acted slowly would be a wage with no
   * trade attached, and the number would stop meaning what the engine does
   * with it.
   */
  autopilot: {
    phase: 'sim',
    order: 30,
    run({ state, emit, delegation }) {
      const squad = state.modules.squad;
      const finance = state.modules.finance;

      // The countdown still runs — an executive does not stop time.
      const outcome = tickContracts(squad);

      const { renewals, released } = autoRenew(
        squad,
        delegation?.competence ?? 0.5,
        Math.max(0, finance.money * contractsContent.autoBudgetShare)
      );

      for (const { player, quote } of renewals) {
        postToLedger(finance, {
          season: state.meta.season,
          matchday: state.meta.matchday,
          source: 'contracts',
          reason: `Verlängerung ${player.name}`,
          amount: -quote.fee
        });
      }

      /*
       * ONE event for the week, naming what was decided. The player traded
       * prompts for outcomes; replacing nineteen prompts with nineteen
       * notifications would be the same interruption with worse timing.
       */
      if (renewals.length > 0 || released.length > 0 || outcome.departed.length > 0) {
        const parts: string[] = [];
        if (renewals.length) parts.push(`${renewals.length} verlängert`);
        if (released.length) parts.push(`${released.length} nicht verlängert`);
        if (outcome.departed.length) parts.push(`${outcome.departed.length} ablösefrei weg`);
        emit({
          source: 'contracts',
          severity: outcome.departed.length > 0 ? 'warn' : 'info',
          title: 'Kaderplanung',
          detail: parts.join(', ') + '.',
          goto: 'contracts'
        });
      }
    }
  },

  hooks: {
    /*
     * The countdown, and what a player negotiates, both belong on the week —
     * that is the time between two matches, and it is where anything a player
     * asks for should arrive. Renewals themselves are a screen action (like
     * a transfer signing), not a tick effect: nobody should get a bill for a
     * decision they did not make.
     */
    week: {
      phase: 'sim',
      order: 30,
      run({ state, emit }) {
        const squad = state.modules.squad;
        const contracts = state.modules.contracts;
        const { warned, departed } = tickContracts(squad);

        for (const player of warned) {
          emit({
            source: 'contracts',
            severity: 'warn',
            title: `${player.name}: Vertrag läuft aus`,
            detail: `Noch ${player.contractMatchdays} Spieltage. Ohne Verlängerung geht er ablösefrei.`,
            goto: 'contracts'
          });
        }

        for (const player of departed) {
          contracts.departures.push({ name: player.name, pos: player.pos });
          emit({
            source: 'contracts',
            severity: 'bad',
            title: `${player.name} verlässt den Verein`,
            detail: 'Vertrag ausgelaufen — ablösefrei, ohne Gegenleistung.',
            goto: 'contracts'
          });
        }
      }
    },

    seasonEnd: {
      phase: 'world',
      run({ state }) {
        // A running tally of "who left this season". Carrying it over would
        // make it mean "who ever left", a different and less useful number.
        state.modules.contracts.departures = [];
      }
    }
  }
});
