<script lang="ts" generics="T">
  import type { Snippet } from 'svelte';
  import type { Column, SortState } from './table';
  import { sortRows, nextSort } from './table';
  import Sheet from './Sheet.svelte';

  let {
    columns,
    rows,
    /** Renders one column's value for one row. Called for both layouts. */
    cell,
    /** Stable identity per row. Required: index keys attach state to the wrong row. */
    id,
    /** Row heading for the phone layout's detail sheet. */
    title,
    empty = 'Keine Einträge.',
    defaultSort,
    highlight
  }: {
    columns: Column[];
    rows: T[];
    cell: Snippet<[T, string]>;
    id: (row: T) => string;
    title?: (row: T) => string;
    empty?: string;
    /** Column key to order by on first render. */
    defaultSort?: string;
    /**
     * Marks a row as THE row — the player's own club in a league table, their
     * own entry in a ranking. One per table by convention. It gets a filled
     * background and an edge bar, because "where am I?" is the first question
     * every ranking is asked and bold text alone does not survive a glance.
     */
    highlight?: (row: T) => boolean;
  } = $props();

  /*
   * Sorting lives in the component so every table in the game sorts the same
   * way, and so a screen cannot accidentally sort the array it was handed —
   * which would reorder the squad itself rather than the view of it.
   */
  const sortable = $derived(columns.filter((c) => c.sort));
  let sort = $state<SortState>(null);
  $effect(() => {
    if (sort === null && defaultSort) {
      const c = columns.find((x) => x.key === defaultSort && x.sort);
      if (c) sort = nextSort(c, null);
    }
  });
  const ordered = $derived(sortRows(rows, columns, sort));

  const primary = $derived(columns.filter((c) => c.role === 'primary'));
  const secondary = $derived(columns.filter((c) => c.role === 'secondary'));
  const detail = $derived(columns.filter((c) => c.role === 'detail'));

  let openRow = $state<T | null>(null);
</script>

{#if rows.length === 0}
  <p class="empty">{empty}</p>
{:else}
  <!-- Wide: a real table, every column. -->
  <div class="wide">
    <table>
      <thead>
        <tr>
          {#each columns as c (c.key)}
            <th class:num={c.numeric} aria-sort={sort?.key === c.key
              ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
              {#if c.sort}
                <!-- The header IS the control; a separate sort button beside it
                     would be a second target for the same job. -->
                <!-- docs-check-ignore: column sort, named by the column itself -->
                <button type="button" class="sort" class:on={sort?.key === c.key}
                        onclick={() => (sort = nextSort(c, sort))}>
                  {c.label}
                  <!-- A glyph, not colour: which way a column is sorted has to
                       survive greyscale, and an arrow is the only thing anyone
                       looks for. -->
                  <i aria-hidden="true">{sort?.key === c.key ? (sort.dir === 'asc' ? '▲' : '▼') : '↕'}</i>
                </button>
              {:else}
                {c.label}
              {/if}
            </th>
          {/each}
        </tr>
      </thead>
      <tbody>
        <!-- Keyed by entity id, never by index. Index keys are the same as no
             key: sort the squad and Svelte reuses DOM nodes positionally, so
             per-row state attaches to the wrong player — which makes the player
             distrust every number on screen, including the correct ones. -->
        {#each ordered as r (id(r))}
          <tr class:hl={highlight?.(r)}>
            {#each columns as c (c.key)}
              <td class:num={c.numeric}>{@render cell(r, c.key)}</td>
            {/each}
          </tr>
        {/each}
      </tbody>
    </table>
  </div>

  <!-- Narrow: rows, not a squeezed table. Sorting is a row of chips rather
       than a select, because a select hides every option behind a tap and
       renders in the OS's own idea of a form control — the one element on the
       screen that looks like a tax office. A chip per column shows what you
       can sort by at a glance; tapping the active chip again reverses it,
       which is the same contract the wide layout's headers keep. -->
  {#if sortable.length > 0}
    <div class="sortbar" role="group" aria-label="Sortieren nach">
      {#each sortable as c (c.key)}
        <!-- docs-check-ignore: view ordering, named by the column itself; changes nothing in the game -->
        <button type="button" class="chip" class:on={sort?.key === c.key}
                aria-pressed={sort?.key === c.key}
                onclick={() => (sort = nextSort(c, sort))}>
          {c.label}
          {#if sort?.key === c.key}<i aria-hidden="true">{sort.dir === 'asc' ? '▲' : '▼'}</i>{/if}
        </button>
      {/each}
    </div>
  {/if}
  <ul class="narrow">
    {#each ordered as r (id(r))}
      <li class:hl={highlight?.(r)}>
        <div class="lines">
          <p class="line1">
            {#each primary as c (c.key)}<span class:num={c.numeric}>{@render cell(r, c.key)}</span>{/each}
          </p>
          {#if secondary.length}
            <p class="line2">
              {#each secondary as c (c.key)}
                <span><em>{c.label}</em> <b class:num={c.numeric}>{@render cell(r, c.key)}</b></span>
              {/each}
            </p>
          {/if}
        </div>
        {#if detail.length}
          <!-- docs-check-ignore: row disclosure, not a game control — its name comes from the row -->
          <button
            type="button"
            class="more"
            aria-label="Details{title ? `: ${title(r)}` : ''}"
            onclick={() => (openRow = r)}
          >⋯</button>
        {/if}
      </li>
    {/each}
  </ul>

  {#if openRow}
    {@const row = openRow}
    <Sheet open={true} title={title ? title(row) : 'Details'}>
      <dl>
        {#each [...secondary, ...detail] as c (c.key)}
          <dt>{c.label}</dt>
          <dd class:num={c.numeric}>{@render cell(row, c.key)}</dd>
        {/each}
      </dl>
      <!-- docs-check-ignore: sheet dismissal, labelled inline -->
      <button type="button" class="close" onclick={() => (openRow = null)}>Schließen</button>
    </Sheet>
  {/if}
{/if}

<style>
  .empty { color: var(--text-muted); font-size: var(--fs-caption); padding: var(--s3) 0; }

  .sort {
    display: inline-flex; align-items: center; gap: 4px;
    /* Headers only render in the wide layout, so this is a tablet control
       rather than a phone one — but a tablet is still a finger. */
    min-height: var(--tap); background: none; border: 0; padding: 0; cursor: pointer;
    font: inherit; font-size: var(--fs-caption); text-transform: uppercase;
    letter-spacing: 0.06em; color: var(--text-dim);
  }
  .sort:hover { color: var(--text-main); }
  .sort.on { color: var(--text-main); }
  .sort i { font-style: normal; font-size: 9px; opacity: 0.55; }
  .sort.on i { opacity: 1; }
  .sort:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }

  .sortbar {
    display: flex; gap: var(--s2); padding: var(--s2) 0;
    overflow-x: auto; -webkit-overflow-scrolling: touch;
  }
  .chip {
    flex: 0 0 auto; min-height: var(--tap); padding: 0 var(--s3);
    display: inline-flex; align-items: center; gap: 4px;
    background: var(--bg-inset); border: 1px solid var(--border);
    border-radius: var(--r-lg); color: var(--text-muted);
    font: inherit; font-size: var(--fs-caption); font-weight: 700; cursor: pointer;
  }
  .chip.on { background: var(--primary); border-color: var(--primary); color: var(--on-fill); }
  .chip i { font-style: normal; font-size: 9px; }
  .chip:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }

  .wide { overflow-x: auto; -webkit-overflow-scrolling: touch; }
  table { border-collapse: collapse; width: 100%; font-size: var(--fs-body); }
  th {
    text-align: left;
    font-size: var(--fs-caption);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--text-dim);
    padding: var(--s2);
    border-bottom: 1px solid var(--border);
    white-space: nowrap;
  }
  td { padding: var(--s2); border-bottom: 1px solid var(--border); }
  .num { text-align: right; font-variant-numeric: tabular-nums; }

  /*
   * The highlighted row: a filled ground plus a 3px edge bar, the pattern the
   * Sportschau table uses for "your club". Two channels on purpose — the fill
   * alone dies in greyscale, the bar alone is easy to scroll past.
   */
  tr.hl td { background: var(--primary-glow); font-weight: 700; }
  tr.hl td:first-child { box-shadow: inset 3px 0 0 var(--primary); }
  .narrow li.hl {
    background: var(--primary-glow);
    box-shadow: inset 3px 0 0 var(--primary);
    margin: 0 calc(var(--s2) * -1);
    padding-left: var(--s2); padding-right: var(--s2);
    border-radius: var(--r-sm);
  }
  .narrow li.hl .line1 { font-weight: 800; }

  .narrow { display: none; list-style: none; }
  .narrow li {
    display: flex; align-items: center; gap: var(--s2);
    padding: var(--s2) 0; border-bottom: 1px solid var(--border);
    min-height: var(--tap);
  }
  .lines { flex: 1; min-width: 0; }
  .line1 { display: flex; gap: var(--s2); font-size: var(--fs-body); font-weight: 700; }
  .line2 { display: flex; flex-wrap: wrap; gap: var(--s3); font-size: var(--fs-caption); color: var(--text-muted); margin-top: 2px; }
  .line2 em { font-style: normal; }
  .line2 b { color: var(--text-main); font-weight: 700; }
  .more {
    flex: none; background: none; border: none; color: var(--text-muted);
    min-width: var(--tap); min-height: var(--tap); cursor: pointer; font-size: var(--fs-title);
  }
  dl { display: grid; grid-template-columns: auto 1fr; gap: var(--s1) var(--s3); margin-bottom: var(--s3); }
  dt { color: var(--text-muted); font-size: var(--fs-caption); }
  dd { text-align: right; }
  .close {
    width: 100%; min-height: var(--tap);
    background: #1e293b; color: var(--accent-ink);
    border: 1px solid var(--border-strong); border-radius: var(--r-sm); cursor: pointer;
  }

  @media (max-width: 767px) {
    .wide { display: none; }
    .narrow { display: block; }
  }
</style>
