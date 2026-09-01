<script lang="ts">
  import { strengthOf } from './rules';
  import { game } from '$lib/state/game.svelte';
  import { Panel, Button, Bar, DataTable, Leaderboard, toast, type Column } from '$lib/ui';
  import { autoLineup, toggleLineup, wageBill, teamStrength, isAvailable, rating } from './rules';
  import { conditionRank } from './playerColumns';
  import type { Player } from './state';
  import { formatMoney } from '../finance/rules';

  /*
   * Declared here rather than inline because a Svelte template cannot carry a
   * type assertion, and the sort functions need one. Every column sorts:
   * a 22-man squad you cannot order by wage or age is a list you have to
   * read twice.
   */
  const COLUMNS: Column[] = [
    { key: 'name', label: 'Name',    role: 'primary',   sort: (p) => (p as Player).name },
    { key: 'pos',  label: 'Pos',     role: 'primary',   sort: (p) => (p as Player).pos },
    { key: 'str',  label: 'Stärke',  role: 'secondary', numeric: true, sort: (p) => strengthOf(p as Player) },
    // Sorted by condition rather than raw fitness, so the injured do not
    // float to the top of a list read to pick an eleven.
    { key: 'fit',  label: 'Fitness', role: 'secondary', numeric: true, sort: (p) => conditionRank(p as Player) },
    { key: 'wage', label: 'Gehalt',  role: 'detail',    numeric: true, sort: (p) => (p as Player).wage },
    { key: 'age',  label: 'Alter',   role: 'detail',    numeric: true, firstClick: 'asc', sort: (p) => (p as Player).age },
    // In the eleven first when sorted — the lineup IS the interesting subset.
    { key: 'elf',  label: 'Startelf', role: 'secondary', sort: (p) => (game.modules.squad.lineup.includes((p as Player).id) ? 0 : 1), firstClick: 'asc' }
  ];

  const squad = $derived(game.modules.squad);
  const sorted = $derived(
    [...squad.players].sort((a, b) => rating(b) - rating(a))
  );
  const inLineup = (id: string) => squad.lineup.includes(id);

  function setLineup() {
    squad.lineup = autoLineup(squad);
    toast('Aufstellung gesetzt', `Teamstärke ${teamStrength(squad, true)}`, 'good');
  }

  function toggle(p: Player) {
    const change = toggleLineup(squad, p.id);
    if (change === 'full') return toast('Elf ist voll', 'Erst jemanden rausnehmen, dann aufstellen.', 'warn');
    if (change === 'unavailable') return toast('Nicht verfügbar', `${p.name} kann nicht aufgestellt werden.`, 'warn');
    toast(
      change === 'added' ? 'Aufgestellt' : 'Auf der Bank',
      `${p.name} — ${squad.lineup.length} / 11 · Teamstärke ${teamStrength(squad, true)}`,
      'good'
    );
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

<!-- The team itself, right under the header. The leaderboards used to sit
     here, which meant opening "my squad" showed statistics before it showed
     the squad — the one list every visit to this screen is actually for. -->
<Panel title="Spieler" accent="accent">
  <DataTable
    columns={COLUMNS}
    rows={sorted}
    id={(p) => p.id}
    title={(p) => p.name}
    highlight={(p) => inLineup(p.id)}
  >
    {#snippet cell(p, key)}
      {#if key === 'name'}
        <span class:out={!isAvailable(p)}>{p.name}</span>
        {#if p.injured > 0}<span class="badge hurt">🚑 {p.injured}</span>{/if}
        {#if p.suspended > 0}<span class="badge hurt">🟥 {p.suspended}</span>{/if}
      {:else if key === 'pos'}<span class="dim">{p.pos}</span>
      {:else if key === 'str'}{strengthOf(p)}
      {:else if key === 'fit'}<span class="fitcell"><Bar value={p.fitness} showValue label="Fitness {p.name}" /></span>
      {:else if key === 'age'}{p.age}
      {:else if key === 'elf'}
        <Button
          doc="squad.toggleLineup"
          variant={inLineup(p.id) ? 'ghost' : 'secondary'}
          label={inLineup(p.id) ? 'Rausnehmen' : 'Aufstellen'}
          disabled={!inLineup(p.id) && (!isAvailable(p) || squad.lineup.length >= 11)}
          onclick={() => toggle(p)}
        />
      {:else}<span class="dim">{formatMoney(p.wage)}</span>{/if}
    {/snippet}
  </DataTable>
</Panel>

<!--
  Who has actually done the work.

  The squad table answers "how good is he", which is a scouting question. This
  answers "what has he done here", which is the one a manager asks in the third
  season — and it is the only place in the game where a player's career is
  visible as a career rather than as five current attributes.

  Top three then everything, the Sportschau pattern: three boards at three rows
  is a glance, three boards at twenty-two rows is a scroll.
-->
{#if squad.players.some((p) => p.record.matches > 0)}
  <Panel title="Bestenliste" accent="primary" meta="{squad.players.length} Spieler">
    <!--
      Torjäger first, because it is the first thing anyone wants from a football
      stats screen — and the only one of these boards a player would look up
      without being prompted.

      Scoped to our own squad, and that is not a limitation to hide. The match
      model does not name opposition scorers, so a division-wide board would
      have to invent them — and an invented statistic is indistinguishable from
      a real one, which makes it worse than a missing tab. Here the screen is
      the squad, so "Torjäger" already means ours without a qualifier.

      The subtitle carries appearances, because 14 goals in 34 games and 14 in
      9 are different players and the ranking cannot tell them apart.
    -->
    <Leaderboard
      title="Torjäger"
      unit="Tore"
      entries={squad.players
        .filter((p) => p.record.goals > 0)
        .map((p) => ({
          id: p.id,
          name: p.name,
          sub: `${p.pos} · ${p.record.matches} ${p.record.matches === 1 ? 'Spiel' : 'Spiele'}`,
          value: p.record.goals,
          row: p
        }))}
      empty="Noch kein Tor gefallen."
    />
    <Leaderboard
      title="Einsätze"
      unit="Spiele"
      entries={squad.players.map((p) => ({
        id: p.id, name: p.name, sub: p.pos, value: p.record.matches, row: p
      }))}
    />
    <Leaderboard
      title="Weiße Westen"
      unit="Spiele ohne Gegentor"
      entries={squad.players
        .filter((p) => p.pos === 'TW' || p.pos === 'ABW')
        .map((p) => ({ id: p.id, name: p.name, sub: p.pos, value: p.record.cleanSheets, row: p }))}
      empty="Noch kein Spiel ohne Gegentor."
    />
    <Leaderboard
      title="Weiteste Entwicklung"
      unit="Punkte"
      entries={squad.players.map((p) => ({
        id: p.id,
        name: p.name,
        sub: `${p.record.debutStrength} → ${strengthOf(p)}`,
        value: strengthOf(p) - p.record.debutStrength,
        row: p
      }))}
      format={(v) => (v > 0 ? `+${v}` : String(v))}
    />
  </Panel>
{/if}

<style>
  .summary { display: flex; flex-wrap: wrap; gap: var(--s3); margin-bottom: var(--s3); color: var(--text-muted); font-size: var(--fs-caption); }
  .summary strong { color: var(--text-main); font-size: var(--fs-body); display: block; }
</style>
