import { defineModule } from '$lib/engine/module';
import { StadiumSchema, createStadium, STADIUM_VERSION } from './state';
import { ticketIncome, attendance, capacity } from './rules';
import { stadiumDocs } from './docs';
import { postToLedger } from '../finance/module';

export default defineModule({
  id: 'stadium',
  title: 'Stadion',
  summary: 'Ausbau, Komfort, Ticketpreise und die Zuschauereinnahmen jedes Heimspiels.',
  nav: { group: 'Verein', icon: '🏟️', order: 20 },
  requires: ['finance'],

  state: { schema: StadiumSchema, create: createStadium, version: STADIUM_VERSION },

  hooks: {
    matchday: {
      phase: 'economy',
      order: 10,
      run({ state, emit, provide }) {
        const stadium = state.modules.stadium;
        const { season, matchday } = state.meta;

        // Home games only. Which side we are on is decided by the league
        // module and read off the tick context, so stadium does not need to
        // know how fixtures work.
        const att = attendance(stadium);
        const income = ticketIncome(stadium);

        postToLedger(state.modules.finance, {
          season, matchday, source: 'stadium', reason: 'Zuschauereinnahmen', amount: income
        });

        // Other modules (merch) size their sales off the crowd without
        // importing anything from here.
        provide('stadium.attendance', att);

        emit({
          source: 'stadium',
          severity: 'good',
          title: `${att.toLocaleString('de-DE')} Zuschauer`,
          detail: `${Math.round((att / Math.max(1, capacity(stadium))) * 100)}% Auslastung`,
          amount: income,
          goto: 'stadium'
        });
      }
    }
  },

  screen: () => import('./Screen.svelte'),
  docs: stadiumDocs
});
