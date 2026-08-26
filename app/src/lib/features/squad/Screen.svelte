<script lang="ts">
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
      { key: 'name', header: 'Name' },
      { key: 'pos', header: 'Pos' },
      { key: 'str', header: 'Stärke', numeric: true },
      { key: 'fit', header: 'Fitness' },
      { key: 'wage', header: 'Gehalt', numeric: true }
    ]}
    rows={sorted}
  >
    {#snippet row(p)}
      <tr class:starting={inLineup(p.id)} class:out={!isAvailable(p)}>
        <td>
          {p.name}
          {#if inLineup(p.id)}<span class="badge">Elf</span>{/if}
          {#if p.injured > 0}<span class="badge hurt">🚑 {p.injured}</span>{/if}
          {#if p.suspended > 0}<span class="badge hurt">🟥 {p.suspended}</span>{/if}
          {#if p.trait !== 'Kein'}<small>{p.trait}</small>{/if}
        </td>
        <td class="dim">{p.pos}</td>
        <td class="tabular num">{p.strength}</td>
        <td class="fit"><Bar value={p.fitness} label="Fitness {p.name}" /></td>
        <td class="tabular num dim">{formatMoney(p.wage)}</td>
      </tr>
    {/snippet}
  </DataTable>
</Panel>

<style>
  .summary { display: flex; flex-wrap: wrap; gap: var(--sp-5); margin-bottom: var(--sp-4); color: var(--text-muted); font-size: var(--fs-small); }
  .summary strong { color: var(--text-main); font-size: var(--fs-body); display: block; }
  td { padding: var(--sp-2) var(--sp-3); border-bottom: 1px solid var(--border); font-size: var(--fs-base); vertical-align: middle; }
  td.num { text-align: right; }
  .dim { color: var(--text-muted); }
  .fit { width: 70px; }
  .starting td:first-child { border-left: 2px solid var(--primary); }
  .out { opacity: 0.5; }
  .badge { font-size: var(--fs-micro); background: var(--primary-glow); color: var(--primary); padding: 1px 4px; border-radius: 3px; margin-left: 4px; }
  .badge.hurt { background: rgba(255,23,68,0.18); color: var(--danger); }
  small { display: block; color: var(--text-dim); font-size: var(--fs-micro); }
</style>
