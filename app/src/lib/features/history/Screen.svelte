<script lang="ts">
  import { game } from '$lib/state/game.svelte';
  import { Panel, StatChip, DataTable, type Column } from '$lib/ui';
  import { teamById } from '../league/rules';
  import { careerBestRank, careerBiggestWin } from './rules';
  import type { SeasonRecord } from './state';

  /*
   * Declared here rather than inline because a Svelte template cannot carry a
   * type assertion, and the sort functions need one. A career of twenty
   * seasons earns a "best season first" ordering.
   */
  const SEASON_COLUMNS: Column[] = [
    { key: 'season', label: 'Saison', role: 'primary', numeric: true, sort: (r) => (r as SeasonRecord).season },
    { key: 'league', label: 'Liga', role: 'primary', sort: (r) => (r as SeasonRecord).league },
    { key: 'rank', label: 'Platz', role: 'primary', numeric: true, firstClick: 'asc', sort: (r) => (r as SeasonRecord).rank },
    { key: 'points', label: 'Punkte', role: 'secondary', numeric: true, sort: (r) => (r as SeasonRecord).points },
    { key: 'goals', label: 'Tore', role: 'secondary', numeric: true, sort: (r) => (r as SeasonRecord).goalsFor },
    { key: 'outcome', label: 'Verlauf', role: 'detail' },
    { key: 'win', label: 'Größter Sieg', role: 'detail' }
  ];

  const history = $derived(game.modules.history);
  const league = $derived(game.modules.league);

  const bestRank = $derived(careerBestRank(history.seasons));
  const biggestWin = $derived(careerBiggestWin(history.seasons));
  const rows = $derived([...history.seasons].reverse());

  const OUTCOME_LABEL: Record<SeasonRecord['outcome'], string> = {
    promoted: 'Aufstieg',
    relegated: 'Abstieg',
    stayed: 'Klasse gehalten'
  };

  /* Every club named on this screen — an opponent from a season that may be
     long over — is looked up by id and resolved through the editor's override
     layer. The id is what survives; the fixture that produced it is long
     since overwritten by the next season's schedule. */
  function opponentName(id: string): string {
    const t = teamById(league, id);
    if (!t) return '—';
    return t.name;
  }
</script>

<Panel title="Vereinsgeschichte" accent="accent" meta="{history.seasons.length} Saison{history.seasons.length === 1 ? '' : 'en'}">
  <div class="chips">
    <StatChip label="Saisons" value={history.seasons.length} doc="history.seasons" />
    <StatChip label="Beste Platzierung" value={bestRank ? `${bestRank}.` : '—'} doc="history.bestRank" />
    <StatChip
      label="Größter Sieg"
      value={biggestWin ? `${biggestWin.goalsFor}:${biggestWin.goalsAgainst}` : '—'}
      doc="history.biggestWin"
    />
  </div>
  {#if biggestWin}
    <p class="note">
      {biggestWin.goalsFor}:{biggestWin.goalsAgainst}
      {biggestWin.isHome ? 'gegen' : 'bei'} {opponentName(biggestWin.opponentId)} — Saison {biggestWin.season}
    </p>
  {:else}
    <p class="note">Noch kein Sieg verbucht.</p>
  {/if}
</Panel>

<Panel title="Saisons" accent="primary">
  <DataTable
    columns={SEASON_COLUMNS}
    rows={rows}
    id={(r) => String(r.season)}
    title={(r) => `Saison ${r.season}`}
    empty="Noch keine abgeschlossene Saison."
  >
    {#snippet cell(r, key)}
      {#if key === 'season'}{r.season}
      {:else if key === 'league'}{r.league}
      {:else if key === 'rank'}{r.rank > 0 ? `${r.rank}.` : '—'}
      {:else if key === 'points'}{r.points}
      {:else if key === 'goals'}{r.goalsFor}:{r.goalsAgainst}
      {:else if key === 'outcome'}{OUTCOME_LABEL[r.outcome]}
      {:else if key === 'win'}
        {#if r.biggestWin}{r.biggestWin.goalsFor}:{r.biggestWin.goalsAgainst}
          {r.biggestWin.isHome ? 'H' : 'A'} · {opponentName(r.biggestWin.opponentId)}
        {:else}—{/if}
      {/if}
    {/snippet}
  </DataTable>
</Panel>

<style>
  .chips { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: var(--s2); }
  .note { margin-top: var(--s2); font-size: var(--fs-caption); color: var(--text-muted); }
</style>
