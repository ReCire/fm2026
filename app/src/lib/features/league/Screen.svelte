<script lang="ts">
  import { game } from '$lib/state/game.svelte';
  import { Panel, StatChip, Button, DataTable, Leaderboard } from '$lib/ui';
  import Crest from '$lib/graphics/Crest.svelte';
  import { coloursFor } from '$lib/graphics/clubColours';
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

  /* By id, never by name. A name comparison against a constant means the
     player drops out of their own table the moment they rename their club in
     the editor — and the symptom is a silent '—' rather than an error. */
  const me = $derived(table.find((r) => r.team.id === league.playerClubId));
  const next = $derived(playerFixture(league, currentMatchday));

  const promotionZone = leagueContent.promotionPlaces;
  const relegationZone = $derived(teams.length - leagueContent.relegationPlaces);
  const isTop = $derived(level === 0);
  const isBottom = $derived(level === league.levels.length - 1);

  const nameAt = (index: number) => teams[index]?.name ?? '—';
  const idAt = (index: number) => teams[index]?.id ?? '';

  /*
   * Division leaderboards, from what the league actually records.
   *
   * Deliberately team-level. A Torjäger board is the first thing anyone wants
   * from a football stats screen and the match model does not attribute
   * scorers yet — so building one would mean an empty list or an invented one,
   * and an invented statistic is worse than a missing tab. These four are all
   * read straight off the table.
   */
  const boards = $derived([
    {
      title: 'Meiste Tore',
      unit: 'Tore',
      lowBest: false,
      entries: teams.map((t) => ({ id: t.id, name: t.name, value: t.goalsFor, row: t }))
    },
    {
      title: 'Beste Abwehr',
      unit: 'Gegentore',
      lowBest: true,
      entries: teams.map((t) => ({ id: t.id, name: t.name, value: t.goalsAgainst, row: t }))
    },
    {
      title: 'Meiste Siege',
      unit: 'Siege',
      lowBest: false,
      entries: teams.map((t) => ({ id: t.id, name: t.name, value: t.won, row: t }))
    },
    {
      title: 'Unentschieden',
      unit: 'Remis',
      lowBest: false,
      entries: teams.map((t) => ({ id: t.id, name: t.name, value: t.drawn, row: t }))
    }
  ]);

  /** Nothing has been played yet, so every board would read zero across. */
  const anyPlayed = $derived(teams.some((t) => t.played > 0));

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
      /*
       * Column order and labels follow a printed football table, which is what
       * every reader of this screen has already learned: rank, club, played,
       * goals as a SCORE, difference, points. Goals were a `detail` column and
       * therefore hidden on a phone — but "51:22" is the line a football reader
       * checks second, after the points.
       */
      { key: 'pos',    label: '#',      role: 'primary',   numeric: true },
      { key: 'name',   label: 'Verein', role: 'primary' },
      { key: 'played', label: 'Sp.',    role: 'secondary', numeric: true },
      { key: 'goals',  label: 'Tore',   role: 'secondary', numeric: true },
      { key: 'diff',   label: 'Diff.',  role: 'secondary', numeric: true },
      { key: 'points', label: 'Pkt.',   role: 'primary',   numeric: true }
    ]}
    rows={table}
    id={(t) => t.team.name}
    title={(t) => t.team.name}
  >
    {#snippet cell(t, key)}
      {#if key === 'pos'}
        <!--
          The zone as a bar on the rank, not a tinted row.
          A coloured row background fights every value sitting on it and forces
          the text contrast down to keep it readable. A 3px edge marker on the
          number carries the same fact, costs no legibility, and is what a real
          table does. The legend below names both zones in words, because a
          colour on its own is not a channel.
        -->
        <span
          class="zone"
          class:promotion={t.pos <= promotionZone && !isTop}
          class:relegation={t.pos > relegationZone && !isBottom}
        >{t.pos}</span>
      {:else if key === 'name'}
        <span class="club">
          <Crest name={t.team.name} colours={coloursFor(t.team.id)} size={20} plain />
          <span class="clubname" class:mine={t.team.id === league.playerClubId}>{t.team.name}</span>
        </span>
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

<!--
  Team statistics, as the Sportschau app does them: a title, three rows, and
  everything else one tap away.

  Eight stat categories at eighteen rows each is a scroll wall nobody reaches
  the end of. Eight at three rows each is a page. The full list is almost never
  what someone wants and is therefore exactly the wrong default.
-->
{#if anyPlayed}
  <Panel title="Teamstatistik" accent="accent" meta={levelName(level)}>
    {#each boards as board (board.title)}
      <Leaderboard
        title={board.title}
        unit={board.unit}
        lowBest={board.lowBest}
        entries={board.entries}
      >
        {#snippet mark(team)}
          <Crest name={team.name} colours={coloursFor(team.id)} size={22} plain />
        {/snippet}
      </Leaderboard>
    {/each}
  </Panel>
{/if}

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
          class:us={idAt(fixture.home) === league.playerClubId ||
            idAt(fixture.away) === league.playerClubId}
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
  /* A 3px marker on the rank rather than a tinted row — see the cell snippet. */
  .zone {
    display: inline-block; padding-left: var(--s2);
    border-left: 3px solid transparent;
  }
  .zone.promotion { border-left-color: var(--primary); }
  .zone.relegation { border-left-color: var(--danger); }

  .club { display: flex; align-items: center; gap: var(--s2); min-width: 0; }
  .clubname { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  /* Your own club, found by id. Weight rather than colour, so it reads in
     greyscale and does not compete with the promotion and relegation marks. */
  .clubname.mine { font-weight: 800; }

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
