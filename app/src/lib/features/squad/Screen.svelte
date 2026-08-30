<script lang="ts">
  import { strengthOf } from './rules';
  import { game } from '$lib/state/game.svelte';
  import { Panel, Button, Bar, DataTable, Leaderboard, toast } from '$lib/ui';
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
