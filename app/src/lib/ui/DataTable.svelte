<script lang="ts" generics="T">
  import type { Snippet } from 'svelte';
  import type { Column } from './table';

  let {
    columns,
    rows,
    row,
    empty = 'Keine Einträge.'
  }: {
    columns: Column[];
    rows: T[];
    row: Snippet<[T]>;
    empty?: string;
  } = $props();
</script>

{#if rows.length === 0}
  <p class="empty">{empty}</p>
{:else}
  <div class="scroll">
    <table>
      <thead>
        <tr>
          {#each columns as c (c.key)}
            <th class:num={c.numeric} data-hide-below={c.hideBelow}>{c.header}</th>
          {/each}
        </tr>
      </thead>
      <tbody>
        {#each rows as r, i (i)}{@render row(r)}{/each}
      </tbody>
    </table>
  </div>
{/if}

<style>
  /* Wide tables scroll inside their own box; the page body never moves sideways. */
  .scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; }
  table { border-collapse: collapse; width: 100%; font-size: var(--fs-base); }
  th {
    text-align: left;
    font-size: var(--fs-micro);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--text-dim);
    padding: var(--sp-2) var(--sp-3);
    border-bottom: 1px solid var(--border);
    white-space: nowrap;
  }
  .num { text-align: right; }
  .empty { color: var(--text-muted); font-size: var(--fs-small); padding: var(--sp-4) 0; }
</style>
