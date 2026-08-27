<script lang="ts">
  import { game } from '$lib/state/game.svelte';
  import { Panel, StatChip, Button, DataTable } from '$lib/ui';
  import { leagueContent, MATCHDAYS_PER_SEASON } from './content';
  import { standings, playerFixture, levelName, matchdayFixtures } from './rules';

  const league = $derived(game.modules.league);

  /** -1 / 0 mean "follow the game"; anything else is what the player picked. */
  let pickedLevel = $state(-1);
  let pickedMatchday = $state(0);

  const currentMatchday = $derived(Math.min(MATCHDAYS_PER_SEASON, game.meta.matchday));
  const level = $derived(pickedLevel < 0 ? league.playerLevel : pickedLevel);
  const matchday = $derived(pickedMatchday > 0 ? pickedMatchday : currentMatchday);

  const teams = $derived(league.levels[level] ?? []);
  const table = $derived(standings(teams));
  const fixtures = $derived(matchdayFixtures(league, level, matchday));

  const me = $derived(table.find((r) => r.team.name === leagueContent.playerClubName));
  const next = $derived(playerFixture(league, currentMatchday));

  const promotionZone = leagueContent.promotionPlaces;
  const relegationZone = $derived(teams.length - leagueContent.relegationPlaces);
  const isTop = $derived(level === 0);
  const isBottom = $derived(level === league.levels.length - 1);

  const nameAt = (index: number) => teams[index]?.name ?? '—';

  function stepMatchday(delta: number) {
    pickedMatchday = Math.max(1, Math.min(MATCHDAYS_PER_SEASON, matchday + delta));
  }
</script>

<Panel
  title={levelName(league.playerLevel)}
  accent="primary"
  meta="Saison {game.meta.season} · Spieltag {currentMatchday} / {MATCHDAYS_PER_SEASON}"
>
  <div class="chips">
    <StatChip label="Platz" value={me ? `${me.pos}.` : '—'} doc="league.position" />
    <StatChip label="Punkte" value={me?.points ?? 0} doc="league.points" />
    <StatChip
      label="Tordifferenz"
      value={me ? `${me.goalDifference > 0 ? '+' : ''}${me.goalDifference}` : '—'}
      tone={me && me.goalDifference < 0 ? 'bad' : 'neutral'}
      doc="league.goalDifference"
    />
    <StatChip
      label="Nächster Gegner"
      value={next ? `${next.isHome ? 'H' : 'A'} · ${next.opponent}` : 'Saisonende'}
      doc="league.nextMatch"
    />
    <StatChip label="Gegnerstärke" value={next?.opponentStrength ?? '—'} doc="league.strength" />
  </div>
</Panel>

<Panel title="Tabelle" accent="accent" meta={levelName(level)}>
  <div class="levels">
    {#each leagueContent.levels as entry, index (entry.name)}
      <Button
        doc="league.levelSwitch"
        label={entry.name}
        variant={index === level ? 'primary' : 'secondary'}
        onclick={() => (pickedLevel = index)}
      />
    {/each}
  </div>

  <DataTable
    columns={[
      { key: 'pos',    label: '#',     role: 'primary',   numeric: true },
      { key: 'name',   label: 'Verein', role: 'primary' },
      { key: 'points', label: 'Pkt',   role: 'primary',   numeric: true },
      { key: 'played', label: 'Sp',    role: 'secondary', numeric: true },
      { key: 'diff',   label: 'Diff',  role: 'secondary', numeric: true },
      { key: 'goals',  label: 'Tore',  role: 'detail',    numeric: true }
    ]}
    rows={table}
    id={(t) => t.team.name}
    title={(t) => t.team.name}
  >
    {#snippet cell(t, key)}
      {#if key === 'pos'}{t.pos}.
      {:else if key === 'name'}{t.team.name}
      {:else if key === 'played'}{t.team.played}
      {:else if key === 'goals'}{t.team.goalsFor}:{t.team.goalsAgainst}
      {:else if key === 'diff'}{t.goalDifference > 0 ? '+' : ''}{t.goalDifference}
      {:else}{t.points}{/if}
    {/snippet}
  </DataTable>

  <p class="legend">
    {#if !isTop}<span class="key promotion"></span> Aufstieg{/if}
    {#if !isBottom}<span class="key relegation"></span> Abstieg{/if}
  </p>
</Panel>

<Panel title="Spielplan" accent="accent" meta="Spieltag {matchday}">
  <div class="nav">
    <Button doc="league.fixtures" label="◀ Spieltag" variant="secondary" disabled={matchday <= 1} onclick={() => stepMatchday(-1)} />
    <Button doc="league.fixtures" label="Spieltag ▶" variant="secondary" disabled={matchday >= MATCHDAYS_PER_SEASON} onclick={() => stepMatchday(1)} />
  </div>

  {#if fixtures.length === 0}
    <p class="legend">Für diesen Spieltag ist kein Spielplan hinterlegt.</p>
  {:else}
    <ul class="fixtures">
      {#each fixtures as fixture, index (index)}
        <li
          class:us={nameAt(fixture.home) === leagueContent.playerClubName ||
            nameAt(fixture.away) === leagueContent.playerClubName}
        >
          <span class="home">{nameAt(fixture.home)}</span>
          <strong class="tabular">
            {fixture.played ? `${fixture.homeGoals}:${fixture.awayGoals}` : 'vs'}
          </strong>
          <span class="away">{nameAt(fixture.away)}</span>
        </li>
      {/each}
    </ul>
  {/if}
</Panel>

<style>
  .chips { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: var(--s2); }
  .levels { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: var(--s2); margin-bottom: var(--s2); }
  .nav { display: flex; gap: var(--s2); margin-bottom: var(--s2); }



  .legend { display: flex; align-items: center; gap: var(--s2); margin-top: var(--s2); font-size: var(--fs-caption); color: var(--text-muted); }
  .key { display: inline-block; width: 10px; height: 10px; border-radius: 2px; }
  .key.promotion { background: var(--primary); }
  .key.relegation { background: var(--danger); }

  .fixtures { list-style: none; display: grid; gap: var(--s1); }
  .fixtures li {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    gap: var(--s2);
    padding: var(--s2) var(--s2);
    background: var(--bg-inset);
    border: 1px solid var(--border);
    border-radius: var(--r-sm);
    font-size: var(--fs-caption);
  }
  .fixtures li.us { border-color: var(--primary-ink); }
  .fixtures .home { text-align: right; }
  .fixtures .away { text-align: left; color: var(--text-muted); }
  .fixtures strong { color: var(--accent-ink); }
</style>
