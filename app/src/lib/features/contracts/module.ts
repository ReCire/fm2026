import { defineModule } from '$lib/engine/module';
import { ContractsSchema, createContracts, CONTRACTS_VERSION } from './state';
import { tickContracts } from './rules';

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
