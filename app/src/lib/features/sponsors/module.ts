import { defineModule } from '$lib/engine/module';
import { SponsorsSchema, createSponsors, SPONSORS_VERSION } from './state';
import { advanceContract, matchdayPayout, recordResult, refreshOffers } from './rules';
import { sponsorsContent } from './content';
import { postToLedger } from '../finance/module';
import { gatedBy } from '../progression/rules';

export default defineModule({
  id: 'sponsors',
  title: 'Sponsoring',
  summary: 'Ein Sponsoringvertrag: Handgeld, laufende Zahlungen, Siegprämie — und sein Ablauf.',
  nav: { group: 'Wirtschaft', icon: '🤝', order: 10 },
  requires: ['finance'],
  gate: gatedBy('sponsors'),

  state: { schema: SponsorsSchema, create: createSponsors, version: SPONSORS_VERSION },

  hooks: {
    matchday: {
      phase: 'economy',
      // After stadium (10), before finance closes the books (100). Ordering
      // against staff's 'pre'-phase contribution never matters: 'pre' always
      // runs before 'economy', whatever the order number.
      order: 15,
      consumes: ['league.level', 'league.result', 'sponsors.income'],
      run({ state, rng, emit, query, factor }) {
        const sponsors = state.modules.sponsors;
        const { season, matchday } = state.meta;

        const level = query('league.level', sponsorsContent.weakestLevel);
        const result = query<{ goalsFor: number; goalsAgainst: number } | undefined>(
          'league.result',
          undefined
        );

        if (result) {
          const outcome: 'win' | 'draw' | 'loss' =
            result.goalsFor > result.goalsAgainst
              ? 'win'
              : result.goalsFor === result.goalsAgainst
                ? 'draw'
                : 'loss';
          recordResult(sponsors, outcome);
        }

        if (sponsors.active) {
          const won = !!result && result.goalsFor > result.goalsAgainst;
          // A marketing director scales sponsoring income the same way they
          // scale merch's online channel — see staff/content.ts.
          const incomeFactor = factor('sponsors.income', 1);
          const payout = Math.round(matchdayPayout(sponsors.active, won) * incomeFactor);

          if (payout > 0) {
            postToLedger(state.modules.finance, {
              season,
              matchday,
              source: 'sponsors',
              reason: `${sponsors.active.name} — Sponsoring`,
              amount: payout
            });
          }

          const expired = advanceContract(sponsors);
          if (expired) {
            emit({
              source: 'sponsors',
              severity: 'info',
              title: `Vertrag mit ${expired.name} ausgelaufen`,
              detail: 'Neue Angebote liegen vor.',
              goto: 'sponsors'
            });
          }
        }

        if (!sponsors.active && sponsors.offers.length === 0) {
          refreshOffers(sponsors, rng, level);
          emit({
            source: 'sponsors',
            severity: 'info',
            title: 'Neue Sponsoring-Angebote',
            detail: `${sponsors.offers.length} Angebote liegen vor.`,
            goto: 'sponsors'
          });
        }
      }
    }
  }
});
