<script lang="ts">
  import { game } from '$lib/state/game.svelte';
  import { Panel, StatChip, DataTable, type Column } from '$lib/ui';
  import { formatMoney } from '../finance/module';
  import { teamById } from '../league/rules';
  import { clubById, europeContent, copy } from './content';
  import { standings } from './rules';
  import { PLAYER, type EuroEntry, type Tie } from './state';

  /**
   * Champions Cup — a competition the player watches for most of a career.
   *
   * That is the design constraint the whole screen is built around. Europe is
   * reachable only from the first division, so a fourth-division manager may
   * open this page for ten seasons before appearing in it, and it has to be
   * worth opening in all ten. The eight names are the point: they run every
   * season regardless, so by the time you qualify you already know who they are
   * and which of them you did not want.
   */

  const europe = $derived(game.modules.europe);
  const league = $derived(game.modules.league);

  /** Our club under its own name, since PLAYER is a sentinel and not in the list. */
  const ourName = $derived(teamById(league, league.playerClubId)?.name ?? 'Dein Verein');
  const nameOf = (id: string | null): string =>
    id === null ? '—' : id === PLAYER ? ourName : (clubById.get(id)?.name ?? id);

  const groupA = $derived(europe.groups.A.length > 0 ? standings(europe, 'A') : []);
  const groupB = $derived(europe.groups.B.length > 0 ? standings(europe, 'B') : []);
  const started = $derived(europe.table.length > 0);

  const columns: Column[] = [
    { key: 'club', label: 'Verein', role: 'primary' },
    { key: 'played', label: 'Sp', role: 'secondary', numeric: true },
    { key: 'goals', label: 'Tore', role: 'secondary', numeric: true },
    { key: 'points', label: 'Pkt', role: 'primary', numeric: true }
  ];

  /**
   * A knockout line, with "n. E." when it went to penalties.
   *
   * Most of what makes a scoreline read as a cup tie rather than as a league
   * result is that three-character suffix — it is the difference between losing
   * and going out, and the player should not have to open anything to see it.
   */
  function score(tie: Tie): string {
    if (tie.homeGoals === null || tie.awayGoals === null) return '– : –';
    return `${tie.homeGoals} : ${tie.awayGoals}${tie.onPenalties ? ' n. E.' : ''}`;
  }

  const ours = (id: string | null) => id === PLAYER;
</script>

<Panel
  title={copy.title}
  accent={europe.playerIn ? 'europe' : 'accent'}
  meta={europe.champion ? `Sieger: ${nameOf(europe.champion)}` : undefined}
>
  <p class="lead">{europe.playerIn ? copy.qualified : copy.watching}</p>
  {#if europe.playerIn}
    <div class="chips">
      <StatChip
        label="Prämien diese Saison"
        value={formatMoney(europe.prizeMoney)}
        tone={europe.prizeMoney > 0 ? 'good' : 'neutral'}
        doc="europe.prizes"
      />
      <StatChip
        label="Gruppenspiele"
        value="Spieltag {europeContent.groupMatchdays.join(', ')}"
        doc="europe.groups"
      />
      <StatChip
        label="Halbfinale / Finale"
        value="Spieltag {europeContent.semiMatchday} / {europeContent.finalMatchday}"
        doc="europe.knockout"
      />
    </div>
  {/if}
</Panel>

{#if started}
  <div class="groups">
    {#each [{ id: 'A', rows: groupA }, { id: 'B', rows: groupB }] as g (g.id)}
      <Panel title="Gruppe {g.id}" accent="primary">
        <DataTable
          {columns}
          rows={g.rows}
          id={(e: EuroEntry) => e.clubId}
          title={(e: EuroEntry) => nameOf(e.clubId)}
        >
          {#snippet cell(e: EuroEntry, key: string)}
            {#if key === 'club'}
              <!-- Our own row is marked by a word, not only by weight: a bold
                   line is invisible to anyone reading a table by its numbers. -->
              <span class:us={ours(e.clubId)}>{nameOf(e.clubId)}</span>
              {#if ours(e.clubId)}<span class="tag">dein Verein</span>{/if}
            {:else if key === 'played'}
              {e.played}
            {:else if key === 'goals'}
              {e.goalsFor}:{e.goalsAgainst}
            {:else if key === 'points'}
              {e.points}
            {/if}
          {/snippet}
        </DataTable>
      </Panel>
    {/each}
  </div>

  <Panel title={copy.knockout} accent="gold">
    <ol class="ties">
      {#each europe.semis as tie, i (i)}
        <li class="tie" class:involved={ours(tie.home) || ours(tie.away)}>
          <span class="stage">Halbfinale {i + 1}</span>
          {#if tie.home === null || tie.away === null}
            <span class="pending">{copy.noSemi}</span>
          {:else}
            <span class="pairing">
              <span class:us={ours(tie.home)}>{nameOf(tie.home)}</span>
              <strong class="tabular">{score(tie)}</strong>
              <span class:us={ours(tie.away)}>{nameOf(tie.away)}</span>
            </span>
            {#if tie.winner}<span class="won">weiter: {nameOf(tie.winner)}</span>{/if}
          {/if}
        </li>
      {:else}
        <li class="tie"><span class="pending">{copy.noSemi}</span></li>
      {/each}

      <li class="tie final" class:involved={ours(europe.final?.home ?? null) || ours(europe.final?.away ?? null)}>
        <span class="stage">Finale</span>
        {#if !europe.final || europe.final.home === null || europe.final.away === null}
          <span class="pending">{copy.noFinal}</span>
        {:else}
          <span class="pairing">
            <span class:us={ours(europe.final.home)}>{nameOf(europe.final.home)}</span>
            <strong class="tabular">{score(europe.final)}</strong>
            <span class:us={ours(europe.final.away)}>{nameOf(europe.final.away)}</span>
          </span>
          {#if europe.final.winner}
            <span class="won">Sieger: {nameOf(europe.final.winner)}</span>
          {/if}
        {/if}
      </li>
    </ol>
  </Panel>
{/if}

<Panel title="Prämien" accent="accent">
  <!-- The ladder, printed. Five doctrine nodes multiply exactly these numbers
       and nothing else in the game, so a player weighing the politics branch
       has to be able to read what they are buying a share of. -->
  <dl class="prizes">
    <div><dt>Gruppensieg</dt><dd class="tabular">{formatMoney(europeContent.groupWin)}</dd></div>
    <div><dt>Unentschieden</dt><dd class="tabular">{formatMoney(europeContent.groupDraw)}</dd></div>
    <div><dt>Halbfinale erreicht</dt><dd class="tabular">{formatMoney(europeContent.reachSemi)}</dd></div>
    <div><dt>Finale erreicht</dt><dd class="tabular">{formatMoney(europeContent.reachFinal)}</dd></div>
    <div><dt>Titel</dt><dd class="tabular">{formatMoney(europeContent.win)}</dd></div>
  </dl>
  <p class="rule">{copy.prizes}</p>
</Panel>

<style>
  .lead { margin: 0 0 var(--s2); color: var(--text-main); }
  .chips { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: var(--s2); }
  .rule { margin: var(--s2) 0 0; font-size: var(--fs-caption); color: var(--text-muted); }

  .groups { display: grid; gap: var(--s2); }
  @media (min-width: 900px) {
    .groups { grid-template-columns: 1fr 1fr; }
  }

  .us { font-weight: 700; color: var(--text-main); }
  .tag {
    margin-left: var(--s1);
    padding: 0 6px;
    border: 1px solid var(--border-strong);
    border-radius: var(--r-sm);
    font-size: var(--fs-caption);
    color: var(--text-muted);
    white-space: nowrap;
  }

  .ties { list-style: none; display: grid; gap: var(--s1); margin: 0; padding: 0; }
  .tie {
    display: grid;
    gap: 2px;
    padding: var(--s2) var(--s1);
    border-radius: var(--r-sm);
    border-left: 3px solid transparent;
  }
  /* A tie we are in gets a ground and a rail. The names inside are already
     marked, so this is a second channel rather than the only one. */
  .tie.involved { background: var(--bg-inset); border-left-color: var(--europe); }
  .tie.final .stage { color: var(--gold-ink); font-weight: 700; }
  .stage { font-size: var(--fs-caption); color: var(--text-muted); }
  .pairing {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    gap: var(--s1);
    align-items: baseline;
  }
  .pairing span:last-child { text-align: right; }
  .pending { font-size: var(--fs-caption); color: var(--text-muted); }
  .won { font-size: var(--fs-caption); color: var(--primary-ink); }

  .prizes { display: grid; gap: 2px; margin: 0; }
  .prizes div {
    display: flex;
    justify-content: space-between;
    gap: var(--s2);
    padding: 2px var(--s1);
    font-size: var(--fs-caption);
  }
  .prizes dt { color: var(--text-muted); }
  .prizes dd { margin: 0; color: var(--text-main); font-weight: 600; }
</style>
