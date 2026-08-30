import { defineModule } from '$lib/engine/module';
import { MerchSchema, createMerch, MERCH_VERSION } from './state';
import { sellMatchday } from './rules';
import { merchContent } from './content';
import { postToLedger } from '../finance/module';
import { gatedBy } from '../progression/rules';

export default defineModule({
  id: 'merch',
  title: 'Merchandise',
  summary: 'Der Fanshop: Preise, Lager, und der Absatz an Stadion und Online-Shop.',
  nav: { group: 'Wirtschaft', icon: '🛍️', order: 20 },
  requires: ['finance'],
  gate: gatedBy('merch'),

  state: { schema: MerchSchema, create: createMerch, version: MERCH_VERSION },

  hooks: {
    matchday: {
      phase: 'economy',
      /*
       * Deliberately AFTER stadium's hook (order 10), which is what publishes
       * the crowd this module's crowd channel is sized off.
       *
       * `stadium.attendance` is declared here, so the registry — not a
       * hand-picked order number — guarantees stadium has run first. It could
       * not be, briefly: stadium called `provide` without declaring it, which
       * made the key invisible to the wiring check and made honest consumers
       * throw at boot. The engine now refuses an undeclared write, so that
       * cannot come back.
       */
      order: 20,
      consumes: ['league.level', 'league.result', 'merch.online', 'stadium.attendance'],
      run({ state, rng, emit, query, factor }) {
        const merch = state.modules.merch;
        const { season, matchday } = state.meta;

        const attendance = query<number>('stadium.attendance', 0);
        const leagueLevel = query('league.level', merchContent.weakestLevel);
        const result = query<{ goalsFor: number; goalsAgainst: number } | undefined>(
          'league.result',
          undefined
        );
        const won = !!result && result.goalsFor > result.goalsAgainst;
        // A marketing director scales this the same way they scale
        // sponsoring income — see staff/content.ts.
        const onlineFactor = factor('merch.online', 1);

        const { revenue, unitsSold } = sellMatchday(merch, {
          attendance,
          won,
          leagueLevel,
          onlineFactor,
          rng
        });
        if (revenue <= 0) return;

        postToLedger(state.modules.finance, {
          season,
          matchday,
          source: 'merch',
          reason: 'Merchandise-Verkauf',
          amount: revenue
        });

        emit({
          source: 'merch',
          severity: 'good',
          title: `${unitsSold.toLocaleString('de-DE')} Fanartikel verkauft`,
          detail:
            attendance > 0
              ? 'Heimspiel-Andrang plus laufendes Online-Geschäft.'
              : 'Kein Heimspiel heute — nur Online-Geschäft.',
          amount: revenue,
          goto: 'merch'
        });
      }
    }
  }
});
