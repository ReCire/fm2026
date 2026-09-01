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

  /*
   * Not "you could afford an expansion" — that is true for most of a career
   * and is a nudge to spend, not a thing waiting on you. A sold-out ground
   * turning people away is money you are actively losing every home game, and
   * it is the only stadium state the player cannot see from anywhere else.
   */
  attention: (state) => {
    const s = state.modules.stadium;
    const seats = capacity(s);
    const wanted = attendance(s);
    if (wanted <= seats) return [];
    return [
      {
        id: 'stadium.soldout',
        urgency: 'soon' as const,
        label: `Ausverkauft — rund ${wanted - seats} Zuschauer passen nicht ins Stadion`
      }
    ];
  },

  hooks: {
    matchday: {
      phase: 'economy',
      order: 10,
      consumes: [
        'league.isHome', 'stadium.fanGain', 'stadium.fanFloor',
        'stadium.ticketRevenue', 'stadium.priceTolerance'
      ],
      /*
       * Declared, not merely called.
       *
       * `provide('stadium.attendance', …)` was here from the beginning and this
       * line was not, so `assertContextWiring` could not see the producer: any
       * module that honestly declared it in `consumes` made the registry throw
       * at boot, and the only way to read the crowd was to query it
       * undeclared — which is exactly the unchecked coupling the wiring test
       * exists to prevent. Found by a merch module trying to do it properly.
       */
      provides: ['stadium.attendance'],
      run({ state, emit, provide, query, total, factor }) {
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

        /*
         * Fan mood, moved. Worth saying plainly: nothing else in the game
         * touches this number — it has sat at 75 since the module was written,
         * so results do not yet change the atmosphere and a doctrine node is
         * the first thing that ever will. That is a gap in stadium, not in the
         * node.
         */
        const gain = total('stadium.fanGain');
        if (gain !== 0) stadium.fans = Math.max(0, Math.min(100, stadium.fans + gain));

        // A floor, not a bonus: a doctrine that buys the crowd's patience keeps
        // them from walking away, it does not manufacture enthusiasm.
        const floor = total('stadium.fanFloor');
        if (floor > 0) stadium.fans = Math.max(stadium.fans, floor);

        /*
         * How much the crowd puts up with. Three doctrine nodes raise it, and
         * it is the counterweight to a ticket price that had none: before
         * `priceAppetite` existed, the slider's answer was always "higher".
         */
        const tolerance = factor('stadium.priceTolerance', 1) - 1;
        const att = attendance(stadium, tolerance);
        const income = Math.round(
          ticketIncome(stadium, tolerance) * factor('stadium.ticketRevenue')
        );

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
