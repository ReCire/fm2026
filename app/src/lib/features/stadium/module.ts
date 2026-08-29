import { defineModule } from '$lib/engine/module';
import { StadiumSchema, createStadium, STADIUM_VERSION } from './state';
import { ticketIncome, attendance, capacity } from './rules';
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
      consumes: ['league.isHome'],
      run({ state, emit, provide, query }) {
        const stadium = state.modules.stadium;
        const { season, matchday } = state.meta;

        /*
         * Home games only — which this did NOT do.
         *
         * The comment claimed it and the code never checked, so the club took
         * gate receipts thirty-four times a season instead of seventeen. In
         * Liga 4 that is around +158k a matchday against a wage bill of 15k:
         * the balance climbed from 150k to 780k in four games, and no financial
         * decision in the game could matter because you could not run out of
         * money. Found by playing four matchdays and watching the number.
         */
        if (!query<boolean>('league.isHome', false)) return;

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
  }
});
