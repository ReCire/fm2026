<script lang="ts" generics="T">
  import type { Snippet } from 'svelte';
  import type { Column } from './table';
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
    empty = 'Keine Einträge.'
  }: {
    columns: Column[];
    rows: T[];
    cell: Snippet<[T, string]>;
    id: (row: T) => string;
    title?: (row: T) => string;
    empty?: string;
  } = $props();

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
            <th class:num={c.numeric}>{c.label}</th>
          {/each}
        </tr>
      </thead>
      <tbody>
        <!-- Keyed by entity id, never by index. Index keys are the same as no
             key: sort the squad and Svelte reuses DOM nodes positionally, so
             per-row state attaches to the wrong player — which makes the player
             distrust every number on screen, including the correct ones. -->
        {#each rows as r (id(r))}
          <tr>
            {#each columns as c (c.key)}
              <td class:num={c.numeric}>{@render cell(r, c.key)}</td>
            {/each}
          </tr>
        {/each}
      </tbody>
    </table>
  </div>

  <!-- Narrow: rows, not a squeezed table. -->
  <ul class="narrow">
    {#each rows as r (id(r))}
      <li>
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
