<script lang="ts">
  import { game } from '$lib/state/game.svelte';
  import { Panel, Button, StatChip, Bar, toast } from '$lib/ui';
  import { postToLedger, formatMoney } from '../finance/module';
  import { signOffer, maxSlots } from './rules';
  import type { SponsorOffer } from './state';

  const sponsors = $derived(game.modules.sponsors);
  const finance = $derived(game.modules.finance);

  /*
   * Slots by league: one backer in Liga 4, three at the top. The empty slots
   * render as such rather than disappearing, because "you will have room for
   * two more" is the promotion pitch this screen can make for free.
   */
  const slots = $derived(maxSlots(game.modules.league.playerLevel));
  const freeSlots = $derived(Math.max(0, slots - sponsors.contracts.length));

  const formLabel = $derived(
    sponsors.recentForm.length === 0
      ? 'Noch keine Spiele'
      : sponsors.recentForm
          .map((r) => (r === 'win' ? 'S' : r === 'draw' ? 'U' : 'N'))
          .join(' ')
  );

  function sign(offer: SponsorOffer) {
    const signed = signOffer(sponsors, offer.id, slots);
    if (!signed) return;
    if (signed.fee > 0) {
      postToLedger(finance, {
        season: game.meta.season,
        matchday: game.meta.matchday,
        source: 'sponsors',
        reason: `Handgeld ${signed.name}`,
        amount: signed.fee
      });
    }
    toast('Vertrag unterschrieben', `${signed.name} — ${formatMoney(signed.fee)} Handgeld`, 'good');
  }
</script>

<Panel title="Sponsoring" accent="accent" meta="{sponsors.contracts.length} von {slots} Verträgen">
  {#if sponsors.contracts.length === 0}
    <p class="empty">Kein Vertrag aktiv. Wähle eines der Angebote unten.</p>
  {:else}
    <ul class="contracts">
      {#each sponsors.contracts as active (active.name)}
        <li class="contract">
          <div class="chips">
            <StatChip label="Sponsor" value={active.name} doc="sponsors.active" />
            <StatChip label="Pro Spieltag" value={formatMoney(active.periodic)} doc="sponsors.active" />
            <StatChip label="Siegprämie" value={formatMoney(active.winBonus)} doc="sponsors.active" />
          </div>
          <div class="progress">
            <span>Noch {active.matchdaysRemaining} von {active.totalDuration} Spieltagen</span>
            <Bar
              value={active.matchdaysRemaining}
              max={active.totalDuration}
              tone="primary"
              label="Vertragslaufzeit {active.name}"
              showValue
            />
          </div>
        </li>
      {/each}
    </ul>
  {/if}
  {#if freeSlots > 0 && sponsors.contracts.length > 0}
    <p class="empty">
      {freeSlots === 1 ? 'Ein Vertragsplatz ist frei.' : `${freeSlots} Vertragsplätze sind frei.`}
    </p>
  {/if}
  <StatChip label="Form (letzte 5)" value={formLabel} doc="sponsors.form" />
</Panel>

{#if freeSlots > 0}
  <Panel title="Angebote" accent="primary" meta="{sponsors.offers.length} liegen vor">
    {#if sponsors.offers.length === 0}
      <p class="empty">Zum nächsten Spieltag liegen neue Angebote vor.</p>
    {:else}
      <ul class="offers">
        {#each sponsors.offers as offer (offer.id)}
          <li class="offer">
            <div class="head">
              <strong>{offer.name}</strong>
              <span class="dim">{offer.duration} Spieltage</span>
            </div>
            <div class="terms">
              <StatChip label="Handgeld" value={formatMoney(offer.fee)} doc="sponsors.offers" />
              <StatChip label="Pro Spieltag" value={formatMoney(offer.periodic)} doc="sponsors.offers" />
              <StatChip label="Siegprämie" value={formatMoney(offer.winBonus)} doc="sponsors.offers" />
            </div>
            <Button doc="sponsors.sign" label="Unterschreiben" onclick={() => sign(offer)} />
          </li>
        {/each}
      </ul>
    {/if}
  </Panel>
{/if}

<style>
  .contracts { list-style: none; display: grid; gap: var(--s3); margin-bottom: var(--s2); }
  .contract { display: grid; gap: var(--s2); padding-bottom: var(--s2); border-bottom: 1px solid var(--border); }
  .contract:last-child { border-bottom: 0; }
  .chips { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: var(--s2); }
  .progress { display: grid; gap: var(--s1); font-size: var(--fs-caption); color: var(--text-muted); }
  .empty { color: var(--text-muted); font-size: var(--fs-caption); padding: var(--s2) 0; }

  .offers { list-style: none; display: grid; gap: var(--s2); }
  .offer {
    border: 1px solid var(--border);
    border-radius: var(--r-sm);
    padding: var(--s2);
    display: grid;
    gap: var(--s2);
  }
  .head { display: flex; justify-content: space-between; align-items: baseline; }
  .head span.dim { color: var(--text-muted); font-size: var(--fs-caption); }
  .terms { display: grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap: var(--s2); }
</style>
