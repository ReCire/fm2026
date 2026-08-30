<script lang="ts" module>
  /** One ranked line. `row` is whatever the caller wants back in the mark. */
  export interface Entry<T> {
    id: string;
    name: string;
    /** Club, position, whatever qualifies the name. Optional. */
    sub?: string;
    /** The number this board ranks by. Higher is better unless `lowBest`. */
    value: number;
    row: T;
  }
</script>

<script lang="ts" generics="T">
  import type { Snippet } from 'svelte';
  import { rankEntries } from './rank';

  let {
    title,
    /** Column heading over the value. "Tore", "km", "Quote". */
    unit,
    entries,
    /** Ranks ascending — fewest goals conceded wins. */
    lowBest = false,
    /** How many before the fold. Three is the Sportschau number and it is right. */
    top = 3,
    format = (v: number) => String(v),
    /** Optional mark before the name: a crest, a portrait, a position chip. */
    mark,
    empty = 'Noch keine Daten.'
  }: {
    title: string;
    unit: string;
    entries: Entry<T>[];
    lowBest?: boolean;
    top?: number;
    format?: (value: number) => string;
    mark?: Snippet<[T]>;
    empty?: string;
  } = $props();

  /*
   * Top three, then everything.
   *
   * Taken from the Sportschau app, and it is the idea that makes a stats screen
   * possible on a phone at all: eight categories at eighteen rows each is a
   * scroll wall nobody reaches the end of, and eight categories at three rows
   * each is one page. The full list is one tap away and almost nobody wants it,
   * which is exactly why it should not be the default.
   */
  let expanded = $state(false);

  /* Sorting and the tie rule live in `rank.ts` so they can be tested — an
     off-by-one in the skip only shows when two entries happen to be level. */
  const ranked = $derived(rankEntries(entries, lowBest));

  const shown = $derived(expanded ? ranked : ranked.slice(0, top));
  const hidden = $derived(Math.max(0, ranked.length - top));
</script>

<section class="board">
  <h3>{title}</h3>

  {#if ranked.length === 0}
    <p class="empty">{empty}</p>
  {:else}
    <div class="head" aria-hidden="true">
      <span>Platz</span>
      <span class="unit">{unit}</span>
    </div>
    <ol>
      {#each shown as e (e.id)}
        <!--
          Rank one is the only thing set in bold. Hierarchy without colour, so
          it survives greyscale and does not spend an accent on a leaderboard
          that will sit next to seven others.
        -->
        <li class:first={e.rank === 1}>
          <span class="rank tabular">{e.rank}</span>
          {#if mark}<span class="mark">{@render mark(e.row)}</span>{/if}
          <span class="who">
            <span class="name">{e.name}</span>
            {#if e.sub}<span class="sub">{e.sub}</span>{/if}
          </span>
          <span class="value tabular">{format(e.value)}</span>
        </li>
      {/each}
    </ol>

    {#if hidden > 0}
      <!-- docs-check-ignore: expands this list in place, not a game action -->
      <button class="more" onclick={() => (expanded = !expanded)} aria-expanded={expanded}>
        {expanded ? 'Weniger anzeigen' : `Alle anzeigen (${ranked.length})`}
        <span class="chev" aria-hidden="true">{expanded ? '▲' : '▼'}</span>
      </button>
    {/if}
  {/if}
</section>

<style>
  .board { display: grid; }
  h3 {
    margin: 0; padding: var(--s3) 0 var(--s2);
    font-size: var(--fs-title); font-weight: 800; color: var(--text-main);
  }

  .head {
    display: flex; justify-content: space-between;
    padding-bottom: var(--s1); border-bottom: 1px solid var(--border);
    font-size: var(--fs-caption); color: var(--text-dim);
    letter-spacing: .04em;
  }

  ol { list-style: none; margin: 0; padding: 0; }
  li {
    display: grid;
    grid-template-columns: 22px auto 1fr auto;
    align-items: center; gap: var(--s2);
    min-height: var(--tap);
    padding: var(--s2) 0;
    border-bottom: 1px solid var(--border);
    color: var(--text-muted);
  }
  li:last-child { border-bottom: 0; }
  li.first { color: var(--text-main); }
  li.first .name { font-weight: 800; }

  .rank { font-size: var(--fs-caption); color: var(--text-dim); text-align: center; }
  .mark { display: flex; align-items: center; }
  .who { display: grid; min-width: 0; }
  .name {
    font-size: var(--fs-body); font-weight: 600; color: var(--text-main);
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .sub { font-size: var(--fs-caption); color: var(--text-muted); }
  .value {
    font-size: var(--fs-body); font-weight: 700; color: var(--text-main);
    white-space: nowrap;
  }
  li.first .value { font-size: var(--fs-title); }

  .more {
    display: flex; align-items: center; justify-content: space-between;
    width: 100%; min-height: var(--tap); padding: 0;
    background: none; border: 0; border-top: 1px solid var(--border);
    font: inherit; font-size: var(--fs-caption); font-weight: 700;
    letter-spacing: .06em; text-transform: uppercase;
    color: var(--text-muted); cursor: pointer;
  }
  .more:hover, .more:focus-visible { color: var(--text-main); }
  .chev { font-size: 9px; }

  .empty { padding: var(--s4) 0; color: var(--text-dim); font-size: var(--fs-caption); }
</style>
