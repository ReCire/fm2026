<script lang="ts">
  import { game } from '$lib/state/game.svelte';
  import { Panel, StatChip, Bar, DataTable, type Column } from '$lib/ui';
  import { budgetRank, levelName, standings } from '../league/rules';
  import { ownedEffects } from '../knowledge/rules';
  import { bands, copy, SOURCES, VOICES, boardContent } from './content';
  import { bandOf, barFor, matchdaysLeft } from './rules';
  import type { Verdict } from './state';

  /**
   * Vorstand — the number, the bar it is measured against, and the two people.
   *
   * The bar is the mechanic, so the bar is on the screen before anything else
   * happens. A manager dismissed for missing a target he was never shown is the
   * worst thing this game could do, and "shown" means shown in October, not
   * quoted back in the sacking notice.
   */

  const board = $derived(game.modules.board);
  const league = $derived(game.modules.league);
  const knowledge = $derived(game.modules.knowledge);

  const band = $derived(bandOf(board));
  const trust = $derived(Math.round(board.trust));

  const table = $derived(standings(league.levels[league.playerLevel] ?? []));
  const clubs = $derived(table.length);
  const rank = $derived(table.findIndex((r) => r.team.id === league.playerClubId) + 1);

  /*
   * The same function the tick calls, with the same inputs — one rule, two
   * callers. Recomputing the bar here with a formula of its own is how the
   * doctrine order came to disagree with itself, and a board screen that
   * printed a different target from the one being enforced would be worse than
   * printing none.
   */
  const bar = $derived(
    barFor(board, {
      level: league.playerLevel,
      budgetRank: budgetRank(league),
      clubs
    })
  );

  /** The bought floor. `max` arity: the highest node wins, they do not stack. */
  const floor = $derived(ownedEffects(knowledge).totals.get('board.floor') ?? 0);
  const secured = $derived(floor > 0 && board.trust <= floor + 1);

  const left = $derived(matchdaysLeft(board, game.meta.matchday));

  /*
   * Ahead of, at, or behind the bar — as a word, because "Platz 8, erwartet 8"
   * asks the player to do the subtraction on a screen whose entire subject is
   * that subtraction.
   */
  const against = $derived(
    rank === 0
      ? null
      : rank < bar.rank
        ? { word: `${bar.rank - rank} Plätze über dem Ziel`, tone: 'good' as const }
        : rank > bar.rank
          ? { word: `${rank - bar.rank} Plätze unter dem Ziel`, tone: 'bad' as const }
          : { word: 'genau auf dem Ziel', tone: 'neutral' as const }
  );

  const columns: Column[] = [
    { key: 'season', label: 'Saison', role: 'primary', numeric: true, sort: (v) => (v as Verdict).season },
    { key: 'demand', label: 'Ziel', role: 'secondary' },
    { key: 'result', label: 'Platz / erwartet', role: 'secondary' },
    { key: 'delta', label: 'Vertrauen', role: 'primary', numeric: true, sort: (v) => (v as Verdict).delta },
    { key: 'after', label: 'Stand danach', role: 'detail', numeric: true }
  ];

  const history = $derived([...board.verdicts].reverse());
  const signed = (n: number) => (n > 0 ? `+${Math.round(n)}` : `${Math.round(n)}`);
</script>

{#if board.sacked}
  <!-- Terminal, and it says so plainly rather than leaving the player to work
       it out from a gauge stuck at zero. -->
  <Panel title="Freigestellt" accent="danger">
    <p class="lead">
      {VOICES.vogt.name} hat die Zusammenarbeit beendet. {board.verdicts.length}
      {board.verdicts.length === 1 ? 'Saison' : 'Saisons'} auf dieser Bank.
    </p>
  </Panel>
{/if}

<Panel
  title={copy.trust}
  accent={band.id === 'trainerfrage' ? 'danger' : band.id === 'rueckhalt' ? 'gold' : 'accent'}
  meta="{band.mark} {band.label}"
>
  <div class="gauge">
    <strong class="value tabular">{trust}<span class="unit"> %</span></strong>
    <p class="means">{band.means}</p>
  </div>

  <Bar
    value={board.trust}
    max={100}
    tone={band.id === 'trainerfrage' ? 'danger' : 'primary'}
    label={copy.trust}
  />

  <!-- Two people, not "der Vorstand". The chairwoman counts the votes and the
       president is warm one band too long; both are shown together so the
       player can hear the difference rather than be misled by either. -->
  <div class="voices">
    <blockquote>
      <p>„{band.vogt}"</p>
      <cite>{VOICES.vogt.name}, {VOICES.vogt.role}</cite>
    </blockquote>
    <blockquote>
      <p>„{band.kuhlmann}"</p>
      <cite>{VOICES.kuhlmann.name}, {VOICES.kuhlmann.role}</cite>
    </blockquote>
  </div>

  {#if floor > 0}
    <p class="rule">
      <strong>{SOURCES.floor.label}:</strong> {copy.floorLabel} {floor} %. {SOURCES.floor.note}
      {#if secured}<br />{copy.secured}{/if}
    </p>
  {/if}
</Panel>

{#if board.ultimatum && left !== null}
  <Panel
    title="Frist des Aufsichtsrats"
    accent="danger"
    meta={left === 0 ? 'letzter Spieltag' : `noch ${left} Spieltage`}
  >
    <div class="chips">
      <StatChip label="Ziel" value={board.ultimatum.demand} tone="warn" doc="board.ultimatum" />
      <StatChip
        label="Mindestens Platz"
        value={board.ultimatum.targetRank}
        tone="warn"
        doc="board.ultimatum"
      />
      <StatChip
        label="Aktuell"
        value={rank > 0 ? `Platz ${rank}` : '—'}
        tone={rank > 0 && rank <= board.ultimatum.targetRank ? 'good' : 'bad'}
        doc="board.expectation"
      />
    </div>
    <p class="rule">{copy.ultimatum}</p>
  </Panel>
{/if}

<Panel title={copy.demand} accent="primary" meta={levelName(league.playerLevel)}>
  <div class="chips">
    <StatChip label={copy.demand} value={bar.demand} doc="board.expectation" />
    <StatChip
      label={copy.expectation}
      value="Platz {bar.rank} von {clubs}"
      doc="board.expectation"
    />
    <StatChip label="Etat in der Liga" value="Rang {budgetRank(league)}" doc="board.expectation" />
    {#if against}
      <StatChip label="Stand" value={against.word} tone={against.tone} doc="board.trust" />
    {/if}
  </div>
  <p class="rule">{copy.measured}</p>
</Panel>

<Panel
  title="Bilanz des Aufsichtsrats"
  accent="accent"
  meta={history.length > 0 ? `${history.length} Saisons` : undefined}
>
  {#if history.length === 0}
    <p class="empty">
      Noch keine abgeschlossene Saison. Der Vorstand urteilt im Mai, nicht im November — dazwischen
      bewegt sich das Vertrauen nur langsam.
    </p>
  {:else}
    <DataTable
      {columns}
      rows={history}
      id={(v: Verdict) => `s${v.season}`}
      title={(v: Verdict) => `Saison ${v.season + 1}`}
      defaultSort="season"
    >
      {#snippet cell(v: Verdict, key: string)}
        {#if key === 'season'}
          {v.season + 1}
        {:else if key === 'demand'}
          {v.demand}{#if v.promoted}<span class="tag">Aufstieg</span>{/if}{#if v.relegated}<span
              class="tag">Abstieg</span
            >{/if}
        {:else if key === 'result'}
          {v.actual} / {v.expected}
        {:else if key === 'delta'}
          <span class:up={v.delta > 0} class:down={v.delta < 0}>{signed(v.delta)}</span>
        {:else if key === 'after'}
          {Math.round(v.trustAfter)} %
        {/if}
      {/snippet}
    </DataTable>
  {/if}
</Panel>

<Panel title="Die Skala" accent="accent">
  <!-- Printed, not implied. The threshold a career ends at has to be readable
       long before it is reached. -->
  <ol class="scale">
    {#each [...bands].reverse() as b (b.id)}
      <li class:here={b.id === band.id}>
        <i aria-hidden="true">{b.mark}</i>
        <span class="from tabular">{b.from} %</span>
        <span class="name">{b.label}</span>
      </li>
    {/each}
  </ol>
  <p class="rule">
    Unter {boardContent.ultimatumAt} % setzt der Aufsichtsrat eine Frist über
    {boardContent.ultimatumMatchdays} Spieltage. Bei 0 % endet die Zusammenarbeit — und nur dann.
    Es gibt keinen zweiten, verdeckten Würfelwurf.
  </p>
</Panel>

<style>
  .gauge { display: grid; gap: var(--s1); margin-bottom: var(--s2); }
  .value { font-size: 2.6rem; line-height: 1; color: var(--text-main); }
  .value .unit { font-size: var(--fs-body); color: var(--text-muted); }
  .means { font-size: var(--fs-caption); color: var(--text-muted); margin: 0; }
  .lead { margin: 0; color: var(--text-main); }

  .voices { display: grid; gap: var(--s2); margin-top: var(--s2); }
  blockquote {
    margin: 0;
    padding: var(--s1) var(--s2);
    border-left: 3px solid var(--border-strong);
    background: var(--bg-inset);
    border-radius: var(--r-sm);
  }
  blockquote p { margin: 0; font-size: var(--fs-body); color: var(--text-main); }
  blockquote cite {
    display: block;
    margin-top: 2px;
    font-style: normal;
    font-size: var(--fs-caption);
    color: var(--text-muted);
  }

  .chips { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: var(--s2); }
  .rule { margin: var(--s2) 0 0; font-size: var(--fs-caption); color: var(--text-muted); }
  .empty { color: var(--text-muted); font-size: var(--fs-caption); padding: var(--s2) 0; margin: 0; }

  .scale { list-style: none; display: grid; gap: 2px; margin: 0; padding: 0; font-size: var(--fs-caption); }
  .scale li {
    display: grid;
    grid-template-columns: 1.6rem 3.2rem 1fr;
    align-items: baseline;
    gap: var(--s1);
    padding: 2px var(--s1);
    border-radius: var(--r-sm);
    color: var(--text-muted);
  }
  .scale li.here {
    background: var(--bg-inset);
    color: var(--text-main);
    font-weight: 600;
    box-shadow: inset 2px 0 0 var(--primary);
  }
  .scale .from { text-align: right; }

  .tag {
    margin-left: var(--s1);
    padding: 0 6px;
    border: 1px solid var(--border-strong);
    border-radius: var(--r-sm);
    font-size: var(--fs-caption);
    color: var(--text-muted);
  }
  .up { color: var(--pos-ink); font-weight: 700; }
  .down { color: var(--neg-ink); font-weight: 700; }
</style>
