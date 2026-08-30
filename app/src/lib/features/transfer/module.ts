import { defineModule } from '$lib/engine/module';
import { TransferSchema, createTransfer, TRANSFER_VERSION, migrateTransfer } from './state';
import { refreshMarket, isRefreshDue, expireOffers, canReceiveOffer, generateOffer, autoAnswerOffers } from './rules';
import { transferContent } from './content';
// The sanctioned cross-module surface: a narrow public API plus a declared
// dependency. A transfer the PLAYER makes moves money from the screen; one a
// delegated department makes has no screen to post from, so the autopilot
// books it here.
import { formatMoney, postToLedger } from '../finance/module';

export default defineModule({
  id: 'transfer',
  title: 'Transfermarkt',
  summary: 'Spielerkäufe, ablösefreie Verpflichtungen und Verhandlungen über eingehende Angebote.',
  nav: { group: 'Sport', icon: '🔁', order: 20 },
  requires: ['finance', 'squad'],

  state: {
    schema: TransferSchema, create: createTransfer,
    version: TRANSFER_VERSION, migrate: migrateTransfer
  },

  /*
   * An offer is the clearest `now` in the game: it expires, it is worth money,
   * and ignoring it is a decision you did not know you were making.
   */
  attention: (state) => {
    const { offers } = state.modules.transfer;
    if (offers.length === 0) return [];
    const closing = offers.filter((o) => o.expiresIn <= 1).length;
    const best = offers.reduce((a, b) => (b.currentBid > a.currentBid ? b : a));
    return [
      {
        id: 'transfer.offers',
        urgency: closing > 0 ? ('now' as const) : ('soon' as const),
        label:
          offers.length === 1
            ? `Angebot über ${formatMoney(best.currentBid)} für ${best.playerName} — unbeantwortet`
            : `${offers.length} Angebote unbeantwortet, das höchste über ${formatMoney(best.currentBid)}`
      }
    ];
  },

  /*
   * What a Transferchef does instead of the player.
   *
   * Every bid on the desk is answered this tick regardless of competence — an
   * executive who merely answered slowly would be a wage with no trade
   * attached. What competence buys is the price they hold out for, and whether
   * they notice they are selling the eleven.
   */
  autopilot: {
    phase: 'world',
    order: 10,
    run({ state, emit, delegation }) {
      const transfer = state.modules.transfer;
      const squad = state.modules.squad;

      // Bids still expire on their own; the department does not stop the world.
      expireOffers(transfer);

      const decisions = autoAnswerOffers(transfer, squad, delegation?.competence ?? 0.5);
      const sold = decisions.filter((d) => d.accepted);

      for (const d of sold) {
        postToLedger(state.modules.finance, {
          season: state.meta.season,
          matchday: state.meta.matchday,
          source: 'transfer',
          reason: `Verkauf ${d.offer.playerName}`,
          amount: d.fee
        });
      }

      if (decisions.length > 0) {
        emit({
          source: 'transfer',
          severity: sold.length > 0 ? 'info' : 'good',
          title: 'Transferbüro',
          detail: sold.length > 0
            ? `${sold.length} verkauft, ${decisions.length - sold.length} abgelehnt.`
            : `${decisions.length} Angebot(e) abgelehnt.`,
          amount: sold.reduce((sum, d) => sum + d.fee, 0) || undefined,
          goto: 'transfer'
        });
      }
    }
  },

  hooks: {
    /**
     * World phase: this is the outside world acting on the club, not a
     * consequence of the match. It runs after the economy so a bid that arrives
     * today is answered with today's balance already known.
     */
    matchday: {
      phase: 'world',
      order: 10,
      consumes: ['transfer.feeFactor'],
      run({ state, rng, emit, query, factor }) {
        const transfer = state.modules.transfer;
        // Cached for the screen, which cannot read a bus that lives one tick.
        transfer.feeFactor = factor('transfer.feeFactor');
        const squad = state.modules.squad;

        // Both of these belong to modules that do not exist yet. Asking through
        // the tick bus means transfer works today and gets better on its own
        // the day `league` and `staff` land.
        const leagueLevel = query('league.level', transferContent.defaultLeagueLevel);
        const discount = query('staff.scoutDiscount', 0);

        transfer.sinceRefresh += 1;
        if (isRefreshDue(transfer)) {
          refreshMarket(transfer, rng, { leagueLevel, discount });
        }

        for (const gone of expireOffers(transfer)) {
          emit({
            source: 'transfer',
            severity: 'info',
            title: `Angebot für ${gone.playerName} verfallen`,
            detail: `${gone.clubName} hat die Anfrage zurückgezogen.`,
            goto: 'transfer'
          });
        }

        if (canReceiveOffer(transfer, squad) && rng.chance(transferContent.newOfferChance)) {
          const offer = generateOffer(transfer, squad, rng, {
            bidBonus: query('manager.negotiatorBonus', 0)
          });
          if (offer) {
            emit({
              source: 'transfer',
              severity: 'info',
              title: `Transferanfrage für ${offer.playerName}`,
              detail: `${offer.clubName} bietet ${formatMoney(offer.currentBid)} — Marktwert ${formatMoney(offer.marketValue)}.`,
              amount: offer.currentBid,
              goto: 'transfer'
            });
          }
        }
      }
    }
  }
});
