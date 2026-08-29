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
       * `stadium.attendance` is NOT in `consumes` below even though it is
       * queried: stadium's own hook calls `provide('stadium.attendance', …)`
       * but never declares `provides: ['stadium.attendance']` on its Hook
       * object, so the registry has nothing to check that key against and
       * would refuse to boot the moment anything declared consuming it. That
       * is a pre-existing gap in stadium/module.ts, outside this feature's
       * files — flagged in the port report rather than patched here. Ordering
       * against stadium is therefore kept correct by hand (order: 20 here,
       * order: 10 there) instead of by the registry.
       */
      order: 20,
      consumes: ['league.level', 'league.result', 'merch.online'],
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
