<script lang="ts">
  import { game } from '$lib/state/game.svelte';
  import { Panel, StatChip, Button, DataTable, Leaderboard, Tabs } from '$lib/ui';
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

  /*
   * One view at a time.
   *
   * The screen was four stacked panels — summary, table, statistics, fixtures
   * — which on a phone is close to a minute of scrolling to reach the bottom.
   * Tabs turn "scroll past what you did not want" into "tap what you did".
   *
   * The summary stays ABOVE the strip because it answers "how am I doing",
   * which is why you opened the screen, and because it is four chips.
   */
  let view = $state('tabelle');

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

<Tabs
  label="Ligaansicht"
  bind:active={view}
  tabs={[
    { id: 'tabelle', label: 'Tabelle' },
    { id: 'spielplan', label: 'Spieltag' },
    { id: 'statistik', label: 'Teamstatistik' }
  ]}
/>

<div id="panel-tabelle" role="tabpanel" aria-labelledby="tab-tabelle" hidden={view !== 'tabelle'}>
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
</div>

<!--
  Team statistics, as the Sportschau app does them: a title, three rows, and
  everything else one tap away.

  Eight stat categories at eighteen rows each is a scroll wall nobody reaches
  the end of. Eight at three rows each is a page. The full list is almost never
  what someone wants and is therefore exactly the wrong default.
-->
<div id="panel-statistik" role="tabpanel" aria-labelledby="tab-statistik" hidden={view !== 'statistik'}>
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
{:else}
  <Panel title="Teamstatistik" accent="accent">
    <p class="legend">Noch kein Spiel gespielt — es gibt nichts zu ranken.</p>
  </Panel>
{/if}
</div>

<div id="panel-spielplan" role="tabpanel" aria-labelledby="tab-spielplan" hidden={view !== 'spielplan'}>
<Panel title="Spielplan" accent="accent" meta="Spieltag {matchday}">
  <div class="nav">
    <Button doc="league.fixtures" label="◀ Spieltag" variant="secondary" disabled={matchday <= 1} onclick={() => stepMatchday(-1)} />
    <Button doc="league.fixtures" label="Spieltag ▶" variant="secondary" disabled={matchday >= MATCHDAYS_PER_SEASON} onclick={() => stepMatchday(1)} />
  </div>

  {#if fixtures.length === 0}
    <p class="legend">Für diesen Spieltag ist kein Spielplan hinterlegt.</p>
  {:else}
    <!--
      Two stacked rows per fixture, not "Heim vs Auswärts" across one line.

      Three columns gave each club a third of the width, so "Borussia
      Mönchengladbach" was an ellipsis on every phone and the score sat between
      two truncations. Stacked, each club gets the full width, the two goal
      figures line up as a scoreboard column, and the crest does the scanning.

      This is how every football app on a phone lays out a fixture, and the
      reason is the same everywhere: club names are long and screens are narrow.
    -->
    <ul class="fixtures">
      {#each fixtures as fixture, index (index)}
        {@const homeId = idAt(fixture.home)}
        {@const awayId = idAt(fixture.away)}
        {@const done = fixture.played}
        {@const homeWon = done && (fixture.homeGoals ?? 0) > (fixture.awayGoals ?? 0)}
        {@const awayWon = done && (fixture.awayGoals ?? 0) > (fixture.homeGoals ?? 0)}
        <li class:us={homeId === league.playerClubId || awayId === league.playerClubId}>
          <div class="side" class:won={homeWon} class:lost={done && awayWon}>
            <Crest name={nameAt(fixture.home)} colours={coloursFor(homeId)} size={20} plain />
            <span class="team">{nameAt(fixture.home)}</span>
            <span class="goals tabular">{done ? fixture.homeGoals : ''}</span>
          </div>
          <div class="side" class:won={awayWon} class:lost={done && homeWon}>
            <Crest name={nameAt(fixture.away)} colours={coloursFor(awayId)} size={20} plain />
            <span class="team">{nameAt(fixture.away)}</span>
            <span class="goals tabular">{done ? fixture.awayGoals : ''}</span>
          </div>
          {#if !done}<span class="pending">noch nicht gespielt</span>{/if}
        </li>
      {/each}
    </ul>
  {/if}
</Panel>
</div>

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

  .fixtures { list-style: none; margin: 0; padding: 0; display: grid; gap: var(--s2); }
  .fixtures li {
    padding: var(--s2) var(--s3);
    background: var(--bg-inset);
    border: 1px solid var(--border);
    border-left: 3px solid transparent;
    border-radius: var(--r-sm);
  }
  .fixtures li.us { border-left-color: var(--primary); }

  .side {
    display: grid;
    grid-template-columns: 20px 1fr auto;
    align-items: center; gap: var(--s2);
    min-height: 30px;
  }
  .team {
    font-size: var(--fs-body);
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    color: var(--text-muted);
  }
  .goals { font-size: var(--fs-body); color: var(--text-muted); }

  /*
   * The winner in weight, the loser dimmed. Not green and red: a fixture list
   * is read as a block and eighteen coloured rows is a bag of sweets — and a
   * draw would need a third colour that means "neither", which no palette has.
   */
  .side.won .team, .side.won .goals { color: var(--text-main); font-weight: 800; }
  .side.lost .team, .side.lost .goals { opacity: .72; }

  .pending {
    display: block; padding-top: var(--s1);
    font-size: var(--fs-caption); color: var(--text-dim);
  }
</style>
