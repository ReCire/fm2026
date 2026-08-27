<script lang="ts">
  import { game } from '$lib/state/game.svelte';
  import { Panel, StatChip, DataTable } from '$lib/ui';
  import { formatMoney, breakdown } from './rules';

  const finance = $derived(game.modules.finance);
  const recent = $derived([...finance.ledger].reverse().slice(0, 40));
  const currentBreakdown = $derived(
    breakdown(finance, game.meta.season, game.meta.matchday - 1)
  );
</script>

<Panel title="Finanzen" accent="accent">
  <div class="chips">
    <StatChip label="Vereins-Konto" value={formatMoney(finance.money)} doc="finance.balance"
              tone={finance.money < 0 ? 'bad' : 'good'} />
    <StatChip label="Transferbudget" value={formatMoney(finance.transferBudget)} doc="finance.transferBudget" />
    <StatChip label="Gehaltsbudget" value={formatMoney(finance.wageBudget)} doc="finance.wageBudget" />
    <StatChip label="Restschuld" value={formatMoney(finance.loanDebt)} doc="finance.takeLoan"
              tone={finance.loanDebt > 0 ? 'warn' : 'neutral'} />
  </div>
</Panel>

{#if currentBreakdown.length}
  <Panel title="Letzter Spieltag" accent="primary">
    <ul class="sources">
      {#each currentBreakdown as row (row.source)}
        <li>
          <span>{row.source}</span>
          <em class="tabular" class:neg={row.amount < 0}>{formatMoney(row.amount)}</em>
        </li>
      {/each}
    </ul>
  </Panel>
{/if}

<Panel title="Buchungen" accent="accent" meta="{finance.ledger.length} Einträge">
  <DataTable
    columns={[
      { key: 'reason', label: 'Grund',  role: 'primary' },
      { key: 'amount', label: 'Betrag', role: 'primary',   numeric: true },
      { key: 'source', label: 'Quelle', role: 'secondary' },
      { key: 'md',     label: 'ST',     role: 'detail' }
    ]}
    rows={recent}
    id={(e) => `${e.season}-${e.matchday}-${e.source}-${e.reason}-${e.amount}`}
    title={(e) => e.reason}
    empty="Noch keine Buchungen — simuliere einen Spieltag."
  >
    {#snippet cell(e, key)}
      {#if key === 'md'}<span class="dim">{e.season}.{e.matchday}</span>
      {:else if key === 'source'}{e.source}
      {:else if key === 'reason'}{e.reason}
      {:else}<span class="tabular" class:neg={e.amount < 0}>{formatMoney(e.amount)}</span>{/if}
    {/snippet}
  </DataTable>
</Panel>

<style>
  .chips { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: var(--sp-2); }
  .sources { list-style: none; }
  .sources li { display: flex; justify-content: space-between; padding: var(--sp-2) 0; border-bottom: 1px solid var(--border); }
  .sources em { font-style: normal; color: var(--primary); }
</style>
