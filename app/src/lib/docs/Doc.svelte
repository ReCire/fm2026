<script lang="ts">
  import { doc } from './registry';
  import Sheet from '$lib/ui/Sheet.svelte';

  /** Doc id, e.g. "finance.takeLoan". */
  let { id }: { id: string } = $props();

  const entry = $derived(doc(id));
  let open = $state(false);
</script>

{#if entry}
  <button
    class="doc-btn"
    type="button"
    aria-label="Erklärung: {entry.label}"
    onclick={() => (open = true)}
  >ⓘ</button>

  <Sheet bind:open title={entry.label}>
    <p class="tip">{entry.tooltip}</p>
    {#if entry.why}
      <h4>Warum es das gibt</h4>
      <p class="why">{entry.why}</p>
    {/if}
    {#if entry.related?.length}
      <h4>Hängt zusammen mit</h4>
      <ul>
        {#each entry.related as rel (rel)}
          <li>{doc(rel)?.label ?? rel}</li>
        {/each}
      </ul>
    {/if}
    {#if entry.since}<p class="since">Seit Version {entry.since}</p>{/if}
  </Sheet>
{/if}

<style>
  .doc-btn {
    background: none;
    border: none;
    color: var(--text-muted);
    font-size: 12px;
    line-height: 1;
    padding: 2px 4px;
    cursor: pointer;
    border-radius: 4px;
    /* Touch targets stay tappable even though the glyph is small. */
    min-width: 24px;
    min-height: 24px;
  }
  .doc-btn:hover, .doc-btn:focus-visible { color: var(--primary); }
  .tip { margin: 0 0 10px; color: var(--text-main); }
  .why { margin: 0 0 10px; color: var(--text-muted); font-style: italic; }
  h4 {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--text-muted);
    margin: 12px 0 4px;
  }
  ul { margin: 0; padding-left: 16px; color: var(--text-muted); }
  .since { color: var(--text-muted); font-size: 10px; margin: 12px 0 0; }
</style>
