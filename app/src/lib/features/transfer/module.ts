import { defineModule } from '$lib/engine/module';
import { TransferSchema, createTransfer, TRANSFER_VERSION } from './state';
import { refreshMarket, isRefreshDue, expireOffers, canReceiveOffer, generateOffer } from './rules';
import { transferContent } from './content';
// The sanctioned cross-module surface: a narrow public API plus a declared
// dependency. Imported but unused for control flow — a transfer only moves
// money when the player pushes a button, and the screen posts it there.
import { formatMoney } from '../finance/module';

export default defineModule({
  id: 'transfer',
  title: 'Transfermarkt',
  summary: 'Spielerkäufe, ablösefreie Verpflichtungen und Verhandlungen über eingehende Angebote.',
  nav: { group: 'Sport', icon: '🔁', order: 20 },
  requires: ['finance', 'squad'],

  state: { schema: TransferSchema, create: createTransfer, version: TRANSFER_VERSION },

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

  hooks: {
    /**
     * World phase: this is the outside world acting on the club, not a
     * consequence of the match. It runs after the economy so a bid that arrives
     * today is answered with today's balance already known.
     */
    matchday: {
      phase: 'world',
      order: 10,
      run({ state, rng, emit, query }) {
        const transfer = state.modules.transfer;
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
