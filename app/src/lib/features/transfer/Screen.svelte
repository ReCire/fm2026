<script lang="ts">
  /**
   * Transfer screen. Structure only — no decoration.
   *
   * Every control routes through the `Button` primitive and therefore through
   * the doc registry, so the label, the tooltip and the aria-label all come
   * from docs.ts. The negotiation buttons are generated from
   * `transferContent.counterOptions`, which is why their doc ids are pinned by
   * a test rather than by the docs gate's regex.
   */
  import { game } from '$lib/state/game.svelte';
  import { Panel, Button, StatChip, DataTable, toast } from '$lib/ui';
  import { postToLedger, formatMoney } from '../finance/module';
  import {
    signListing, quickSell, quickSellQuote, negotiationRng,
    acceptOffer, rejectOffer, counterOffer, counterQuotes, counterRoundsLeft
  } from './rules';
  import type { Offer } from './state';

  const transfer = $derived(game.modules.transfer);
  const squad = $derived(game.modules.squad);
  const finance = $derived(game.modules.finance);

  const sellable = $derived([...squad.players].sort((a, b) => b.marketValue - a.marketValue));
  const moneyTone = $derived(finance.money < 0 ? 'bad' : 'good');

  function book(reason: string, amount: number) {
    postToLedger(finance, {
      season: game.meta.season,
      matchday: game.meta.matchday,
      source: 'transfer',
      reason,
      amount
    });
  }

  function sign(listingId: string, kind: 'Ablöse' | 'Handgeld') {
    const signing = signListing(transfer, squad, listingId, finance.money);
    if (!signing) {
      toast('Nicht möglich', 'Das Vereinskonto reicht für diese Verpflichtung nicht.', 'bad');
      return;
    }
    book(`${kind} ${signing.player.name}`, -signing.fee);
    toast('Verpflichtet', `${signing.player.name} — ${formatMoney(signing.fee)}`, 'good');
  }

  function sellNow(playerId: string) {
    const sale = quickSell(transfer, squad, playerId);
    if (!sale) {
      toast('Nicht möglich', 'Der Kader darf nicht unter elf Spieler fallen.', 'bad');
      return;
    }
    book(`Blitzverkauf ${sale.player.name}`, sale.fee);
    finance.transferBudget += sale.budgetShare;
    toast('Verkauft', `${sale.player.name} — ${formatMoney(sale.fee)}`, 'good');
  }

  function accept(offerId: string) {
    const result = acceptOffer(transfer, squad, offerId);
    if (result === 'squadTooSmall') {
      toast('Transfer unzulässig', 'Der Kader muss mindestens elf Spieler umfassen.', 'bad');
      return;
    }
    if (result === 'playerGone') {
      toast('Angebot hinfällig', 'Dieser Spieler gehört dir nicht mehr.', 'warn');
      return;
    }
    if (result === 'unknownOffer') return;

    book(`Transfer ${result.player.name} zu ${result.offer.clubName}`, result.fee);
    finance.transferBudget += result.budgetShare;
    toast('Transfer perfekt', `${result.player.name} — ${formatMoney(result.fee)}`, 'good');
  }

  function reject(offerId: string) {
    const result = rejectOffer(transfer, squad, offerId);
    if (!result) return;
    if (result.moraleLost > 0) {
      toast(
        'Angebot abgelehnt',
        `${result.offer.playerName} verliert ${result.moraleLost} Moral.`,
        'warn'
      );
    } else {
      toast('Angebot abgelehnt', `${result.offer.clubName} zieht sich zurück.`, 'info');
    }
  }

  function counter(offerId: string, multiplier: number) {
    const rng = negotiationRng(transfer, game.meta.seed);
    const result = counterOffer(transfer, squad, offerId, multiplier, rng);
    switch (result.outcome) {
      case 'accepted':
        toast('Forderung akzeptiert', `Neues Gebot: ${formatMoney(result.bid)}.`, 'good');
        break;
      case 'withdrawn':
        toast(
          'Verhandlungsabbruch',
          `${result.offer?.clubName} hält ${formatMoney(result.demanded)} für unverschämt.`,
          'bad'
        );
        break;
      case 'improved':
        toast('Käufer bessert nach', `Letztes Angebot: ${formatMoney(result.bid)}.`, 'info');
        break;
      case 'exhausted':
        toast('Geduld am Ende', 'Der Käufer verhandelt nicht weiter.', 'warn');
        break;
      default:
        break;
    }
  }

  function statusText(o: Offer): string {
    if (o.status === 'demandAccepted') {
      return `${o.clubName} akzeptiert deine Forderung. Vollzug bereit.`;
    }
    if (o.status === 'improved') {
      return `${o.clubName} bessert nach — ${o.round}. Runde.`;
    }
    return 'Neues schriftliches Angebot eingegangen.';
  }

  function overMarket(o: Offer): string {
    const diff = o.currentBid - o.marketValue;
    return `${diff < 0 ? '' : '+'}${formatMoney(diff)} zum Marktwert`;
  }
</script>

<Panel title="Transfermarkt" accent="accent">
  <div class="chips">
    <StatChip label="Vereins-Konto" value={formatMoney(finance.money)} tone={moneyTone} doc="finance.balance" />
    <StatChip label="Transferbudget" value={formatMoney(finance.transferBudget)} doc="finance.transferBudget" />
    <StatChip label="Auf dem Markt" value={transfer.market.length} doc="transfer.market" />
    <StatChip label="Anfragen" value={transfer.offers.length} doc="transfer.offers" />
  </div>
</Panel>

<Panel title="Transferanfragen" accent="primary" meta="{transfer.offers.length} offen">
  {#if transfer.offers.length === 0}
    <p class="empty">Derzeit liegen keine Anfragen für deine Spieler vor.</p>
  {:else}
    <ul class="offers">
      {#each transfer.offers as offer (offer.id)}
        <li class="offer">
          <div class="head">
            <span>{offer.clubName}</span>
            <span class="dim">gültig noch {offer.expiresIn} Spieltage</span>
          </div>

          <div class="who">
            <span><strong>{offer.playerName}</strong> · {offer.playerPos} · Stärke {offer.playerStrength}</span>
            <span class="dim tabular">Marktwert {formatMoney(offer.marketValue)}</span>
          </div>

          <div class="bid">
            <strong class="tabular">{formatMoney(offer.currentBid)}</strong>
            <span class="dim tabular">{overMarket(offer)}</span>
          </div>

          <p class="status">{statusText(offer)}</p>

          <div class="row two">
            <Button
              doc="transfer.accept"
              label="Annehmen · {formatMoney(offer.currentBid)}"
              onclick={() => accept(offer.id)}
            />
            <Button doc="transfer.reject" variant="danger" onclick={() => reject(offer.id)} />
          </div>

          <div class="counters">
            <StatChip
              label="Verhandlung"
              value="Runde {offer.round} · noch {counterRoundsLeft(offer)}"
              doc="transfer.negotiationRound"
            />
            <div class="row three">
              {#each counterQuotes(offer) as quote (quote.doc)}
                <Button
                  doc={quote.doc}
                  variant="secondary"
                  disabled={counterRoundsLeft(offer) === 0}
                  label="{quote.label} · {formatMoney(quote.demanded)}"
                  onclick={() => counter(offer.id, quote.multiplier)}
                />
              {/each}
            </div>
          </div>
        </li>
      {/each}
    </ul>
  {/if}
</Panel>

<Panel title="Verfügbare Spieler" accent="accent" meta="{transfer.market.length} Angebote">
  <DataTable
    columns={[
      { key: 'name', header: 'Name' },
      { key: 'pos', header: 'Pos' },
      { key: 'str', header: 'Stärke', numeric: true },
      { key: 'wage', header: 'Gehalt', numeric: true },
      { key: 'buy', header: 'Ablöse' }
    ]}
    rows={transfer.market}
    empty="Der Markt ist leer — der nächste Spieltag bringt neue Spieler."
  >
    {#snippet row(listing)}
      <tr>
        <td>
          {listing.player.name}
          {#if listing.player.trait !== 'Kein'}<small>{listing.player.trait}</small>{/if}
        </td>
        <td class="dim">{listing.player.pos}</td>
        <td class="tabular num">{listing.player.strength}</td>
        <td class="tabular num dim">{formatMoney(listing.player.wage)}</td>
        <td class="action">
          <Button
            doc="transfer.buy"
            label="Kaufen · {formatMoney(listing.fee)}"
            disabled={finance.money < listing.fee}
            onclick={() => sign(listing.id, 'Ablöse')}
          />
        </td>
      </tr>
    {/snippet}
  </DataTable>
</Panel>

<Panel title="Ablösefreie Spieler" accent="primary" meta="{transfer.freeAgents.length} Spieler">
  <DataTable
    columns={[
      { key: 'name', header: 'Name' },
      { key: 'pos', header: 'Pos' },
      { key: 'str', header: 'Stärke', numeric: true },
      { key: 'wage', header: 'Gehalt', numeric: true },
      { key: 'sign', header: 'Handgeld' }
    ]}
    rows={transfer.freeAgents}
    empty="Zurzeit ist kein vertragsloser Spieler verfügbar."
  >
    {#snippet row(listing)}
      <tr>
        <td>{listing.player.name}</td>
        <td class="dim">{listing.player.pos}</td>
        <td class="tabular num">{listing.player.strength}</td>
        <td class="tabular num dim">{formatMoney(listing.player.wage)}</td>
        <td class="action">
          <Button
            doc="transfer.signFree"
            variant="secondary"
            label="Verpflichten · {formatMoney(listing.fee)}"
            disabled={finance.money < listing.fee}
            onclick={() => sign(listing.id, 'Handgeld')}
          />
        </td>
      </tr>
    {/snippet}
  </DataTable>
</Panel>

<Panel title="Eigene Spieler abgeben" accent="accent" meta="{squad.players.length} im Kader">
  <p class="empty">Ein Blitzverkauf bringt sofort Geld, aber weniger als ein ausgehandelter Transfer.</p>
  <DataTable
    columns={[
      { key: 'name', header: 'Name' },
      { key: 'pos', header: 'Pos' },
      { key: 'str', header: 'Stärke', numeric: true },
      { key: 'mv', header: 'Marktwert', numeric: true },
      { key: 'sell', header: 'Verkauf' }
    ]}
    rows={sellable}
  >
    {#snippet row(player)}
      <tr>
        <td>{player.name}</td>
        <td class="dim">{player.pos}</td>
        <td class="tabular num">{player.strength}</td>
        <td class="tabular num dim">{formatMoney(player.marketValue)}</td>
        <td class="action">
          <Button
            doc="transfer.quickSell"
            variant="ghost"
            label="Blitzverkauf · {formatMoney(quickSellQuote(player))}"
            onclick={() => sellNow(player.id)}
          />
        </td>
      </tr>
    {/snippet}
  </DataTable>
</Panel>

<style>
  .chips { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: var(--sp-2); }
  .empty { color: var(--text-muted); font-size: var(--fs-small); padding: var(--sp-2) 0 var(--sp-3); }

  .offers { list-style: none; display: grid; gap: var(--sp-3); }
  .offer {
    border: 1px solid var(--border);
    border-radius: var(--r-sm);
    padding: var(--sp-3);
    display: grid;
    gap: var(--sp-2);
  }
  .head, .who, .bid { display: flex; justify-content: space-between; align-items: baseline; gap: var(--sp-3); }
  .head { font-size: var(--fs-small); }
  .who { font-size: var(--fs-base); }
  .bid strong { font-size: var(--fs-title); color: var(--primary); }
  .status { font-size: var(--fs-small); color: var(--text-muted); }

  .row { display: grid; gap: var(--sp-2); }
  .two { grid-template-columns: 2fr 1fr; }
  .three { grid-template-columns: repeat(3, 1fr); }
  .counters { display: grid; gap: var(--sp-2); }

  td { padding: var(--sp-2) var(--sp-3); border-bottom: 1px solid var(--border); font-size: var(--fs-base); vertical-align: middle; }
  td.num { text-align: right; }
  td.action { min-width: 150px; }
  .dim { color: var(--text-muted); }
  small { display: block; color: var(--text-dim); font-size: var(--fs-micro); }
</style>
