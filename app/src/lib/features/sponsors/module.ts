import { defineModule } from '$lib/engine/module';
import { SponsorsSchema, createSponsors, migrateSponsors, SPONSORS_VERSION } from './state';
import { advanceContracts, totalPayout, maxSlots, recordResult, refreshOffers } from './rules';
import { sponsorsContent } from './content';
import { postToLedger } from '../finance/module';
import { gatedBy } from '../progression/rules';

export default defineModule({
  id: 'sponsors',
  title: 'Sponsoring',
  summary: 'Sponsorenverträge: Handgeld, laufende Zahlungen, Siegprämien — und ihr Ablauf.',
  nav: { group: 'Wirtschaft', icon: '🤝', order: 10 },
  requires: ['finance'],
  gate: gatedBy('sponsors'),

  state: {
    schema: SponsorsSchema, create: createSponsors,
    version: SPONSORS_VERSION, migrate: migrateSponsors
  },

  /*
   * Only flagged when there is something to sign. A club with no sponsor and
   * no offers has nothing to decide here, and a badge over an empty screen is
   * how a player learns to stop trusting badges.
   */
  attention: (state) => {
    const s = state.modules.sponsors;
    if (s.offers.length > 0) {
      return [
        {
          id: 'sponsors.unsigned',
          urgency: 'now' as const,
          label:
            s.offers.length === 1
              ? 'Ein Sponsorenangebot liegt vor, ein Vertragsplatz ist frei'
              : `${s.offers.length} Sponsorenangebote liegen vor, mindestens ein Vertragsplatz ist frei`
        }
      ];
    }
    const endangered = s.contracts.filter((a) => a.matchdaysRemaining <= 6);
    if (endangered.length > 0) {
      const soonest = Math.min(...endangered.map((a) => a.matchdaysRemaining));
      return [
        {
          id: 'sponsors.running-out',
          urgency: soonest <= 2 ? ('now' as const) : ('soon' as const),
          label:
            endangered.length === 1
              ? `${endangered[0]!.name} läuft aus — die Anschlussfinanzierung steht nicht`
              : `${endangered.length} Sponsorenverträge laufen aus — die Anschlussfinanzierung steht nicht`
        }
      ];
    }
    return [];
  },

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

        if (sponsors.contracts.length > 0) {
          const won = !!result && result.goalsFor > result.goalsAgainst;
          // A marketing director scales sponsoring income the same way they
          // scale merch's online channel — see staff/content.ts.
          const incomeFactor = factor('sponsors.income', 1);
          const payout = Math.round(totalPayout(sponsors, won) * incomeFactor);

          if (payout > 0) {
            const names = sponsors.contracts.map((a) => a.name).join(', ');
            postToLedger(state.modules.finance, {
              season,
              matchday,
              source: 'sponsors',
              reason: `${names} — Sponsoring`,
              amount: payout
            });
          }

          for (const expired of advanceContracts(sponsors)) {
            emit({
              source: 'sponsors',
              severity: 'info',
              title: `Vertrag mit ${expired.name} ausgelaufen`,
              detail: 'Neue Angebote liegen vor.',
              goto: 'sponsors'
            });
          }
        }

        if (sponsors.contracts.length < maxSlots(level) && sponsors.offers.length === 0) {
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
