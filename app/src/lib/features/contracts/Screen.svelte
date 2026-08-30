<script lang="ts">
  /**
   * Contracts screen. Structure only.
   *
   * A renewal is a screen action, like a transfer signing — it charges the
   * ledger directly rather than through a tick, because nobody should be
   * billed for a decision they did not make.
   */
  import { game } from '$lib/state/game.svelte';
  import { Panel, Button, StatChip, DataTable, toast } from '$lib/ui';
  import { postToLedger, formatMoney } from '../finance/module';
  import { wageBill } from '../squad/rules';
  import type { Player } from '../squad/state';
  import { renewalOptions, renewContract, type RenewalQuote } from './rules';
  import { contractsContent } from './content';

  const squad = $derived(game.modules.squad);
  const contracts = $derived(game.modules.contracts);
  const finance = $derived(game.modules.finance);

  const rows = $derived([...squad.players].sort((a, b) => a.contractMatchdays - b.contractMatchdays));
  const expiringSoon = $derived(
    squad.players.filter((p) => p.contractMatchdays <= contractsContent.warnAtMatchdays).length
  );

  function renew(player: Player, quote: RenewalQuote) {
    if (finance.money < quote.fee) {
      toast('Zu teuer', `Es fehlen ${formatMoney(quote.fee - finance.money)}.`, 'bad');
      return;
    }
    postToLedger(finance, {
      season: game.meta.season,
      matchday: game.meta.matchday,
      source: 'contracts',
      reason: `Vertragsverlängerung ${player.name}`,
      amount: -quote.fee
    });
    renewContract(player, quote);
    toast('Verlängert', `${player.name} — neues Gehalt ${formatMoney(quote.newWage)}`, 'good');
  }
</script>

<Panel title="Verträge" accent="accent">
  <div class="chips">
    <StatChip label="Gehaltssumme" value={formatMoney(wageBill(squad))} doc="squad.wage" />
    <StatChip
      label="Läuft bald aus"
      value={expiringSoon}
      tone={expiringSoon > 0 ? 'warn' : 'neutral'}
      doc="contracts.expiring"
    />
    <StatChip label="Abgänge (Saison)" value={contracts.departures.length} doc="contracts.departures" />
  </div>
</Panel>

<Panel title="Vertragsübersicht" accent="primary" meta="{rows.length} Spieler">
  <DataTable
    columns={[
      { key: 'name', label: 'Name', role: 'primary' },
      { key: 'left', label: 'Restlaufzeit', role: 'primary', numeric: true },
      { key: 'wage', label: 'Gehalt', role: 'secondary', numeric: true },
      { key: 'renew', label: 'Verlängern', role: 'secondary' },
      { key: 'pos', label: 'Pos', role: 'detail' }
    ]}
    rows={rows}
    id={(p) => p.id}
    title={(p) => p.name}
  >
    {#snippet cell(r, key)}
      {#if key === 'name'}
        {r.name}
      {:else if key === 'pos'}
        <span class="dim">{r.pos}</span>
      {:else if key === 'left'}
        <span class:soon={r.contractMatchdays <= contractsContent.warnAtMatchdays}>{r.contractMatchdays}</span>
      {:else if key === 'wage'}
        <span class="dim">{formatMoney(r.wage)}</span>
      {:else}
        <div class="renew-actions">
          {#each renewalOptions(r) as quote (quote.doc)}
            <Button
              doc={quote.doc}
              variant="secondary"
              label="{quote.label} · {formatMoney(quote.fee)}"
              disabled={finance.money < quote.fee}
              onclick={() => renew(r, quote)}
            />
          {/each}
        </div>
      {/if}
    {/snippet}
  </DataTable>
</Panel>

<Panel title="Abgänge" accent="accent" meta="{contracts.departures.length} diese Saison">
  {#if contracts.departures.length === 0}
    <p class="empty">Noch kein ablösefreier Abgang in dieser Saison.</p>
  {:else}
    <ul class="departures">
      {#each contracts.departures as d, i (i)}
        <li><span>{d.name}</span><span class="dim">{d.pos}</span></li>
      {/each}
    </ul>
  {/if}
</Panel>

<style>
  .chips { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: var(--s2); }
  .empty { color: var(--text-muted); font-size: var(--fs-caption); padding: var(--s2) 0; }
  .dim { color: var(--text-dim); }
  .soon { color: var(--neg-ink); font-weight: 800; }

  .renew-actions { display: grid; gap: var(--s1); min-width: 160px; }

  .departures { list-style: none; margin: 0; padding: 0; }
  .departures li {
    display: flex; justify-content: space-between; gap: var(--s2);
    padding: var(--s2) 0; border-bottom: 1px solid var(--border); font-size: var(--fs-body);
  }
  .departures li:last-child { border-bottom: 0; }
</style>
