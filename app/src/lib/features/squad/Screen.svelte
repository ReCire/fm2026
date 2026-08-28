<script lang="ts">
  import { strengthOf } from './rules';
  import { game } from '$lib/state/game.svelte';
  import { Panel, Button, Bar, DataTable, toast } from '$lib/ui';
  import { autoLineup, wageBill, teamStrength, isAvailable, rating } from './rules';
  import { formatMoney } from '../finance/rules';

  const squad = $derived(game.modules.squad);
  const sorted = $derived(
    [...squad.players].sort((a, b) => rating(b) - rating(a))
  );
  const inLineup = (id: string) => squad.lineup.includes(id);

  function setLineup() {
    squad.lineup = autoLineup(squad);
    toast('Aufstellung gesetzt', `Teamstärke ${teamStrength(squad, true)}`, 'good');
  }
</script>

<Panel title="Kader" accent="primary" meta="{squad.players.length} Spieler">
  <div class="summary">
    <span>Teamstärke <strong class="tabular">{teamStrength(squad, true)}</strong></span>
    <span>Gehälter <strong class="tabular">{formatMoney(wageBill(squad))}</strong></span>
    <span>Aufgestellt <strong class="tabular">{squad.lineup.length} / 11</strong></span>
  </div>
  <Button doc="squad.autoLineup" onclick={setLineup} explain />
</Panel>

<Panel title="Spieler" accent="accent">
  <DataTable
    columns={[
      { key: 'name', label: 'Name',    role: 'primary' },
      { key: 'pos',  label: 'Pos',     role: 'primary' },
      { key: 'str',  label: 'Stärke',  role: 'secondary', numeric: true },
      { key: 'fit',  label: 'Fitness', role: 'secondary', numeric: true },
      { key: 'wage', label: 'Gehalt',  role: 'detail',    numeric: true },
      { key: 'age',  label: 'Alter',   role: 'detail',    numeric: true }
    ]}
    rows={sorted}
    id={(p) => p.id}
    title={(p) => p.name}
  >
    {#snippet cell(p, key)}
      {#if key === 'name'}
        <span class:out={!isAvailable(p)}>{p.name}</span>
        {#if inLineup(p.id)}<span class="badge">Elf</span>{/if}
        {#if p.injured > 0}<span class="badge hurt">🚑 {p.injured}</span>{/if}
        {#if p.suspended > 0}<span class="badge hurt">🟥 {p.suspended}</span>{/if}
      {:else if key === 'pos'}<span class="dim">{p.pos}</span>
      {:else if key === 'str'}{strengthOf(p)}
      {:else if key === 'fit'}<span class="fitcell"><Bar value={p.fitness} showValue label="Fitness {p.name}" /></span>
      {:else if key === 'age'}{p.age}
      {:else}<span class="dim">{formatMoney(p.wage)}</span>{/if}
    {/snippet}
  </DataTable>
</Panel>

<style>
  .summary { display: flex; flex-wrap: wrap; gap: var(--s3); margin-bottom: var(--s3); color: var(--text-muted); font-size: var(--fs-caption); }
  .summary strong { color: var(--text-main); font-size: var(--fs-body); display: block; }
</style>
