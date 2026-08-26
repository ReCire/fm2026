<script lang="ts">
  import type { Snippet } from 'svelte';
  let {
    open = $bindable(false),
    title,
    children
  }: { open?: boolean; title: string; children: Snippet } = $props();

  function onkeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') open = false;
  }
</script>

<svelte:window {onkeydown} />

{#if open}
  <!-- Bottom sheet rather than a modal dialog: on a phone this is reachable
       with a thumb, and it is what replaces the prototype's alert(). -->
  <div class="scrim" role="presentation" onclick={() => (open = false)}></div>
  <div class="sheet" role="dialog" aria-modal="true" aria-label={title}>
    <header>
      <h3>{title}</h3>
      <button type="button" aria-label="Schließen" onclick={() => (open = false)}>✕</button>
    </header>
    <div class="body">{@render children()}</div>
  </div>
{/if}

<style>
  .scrim {
    position: fixed;
    inset: 0;
    background: rgba(3, 6, 12, 0.66);
    backdrop-filter: blur(2px);
    z-index: 399;
  }
  .sheet {
    position: fixed;
    left: 0; right: 0; bottom: 0;
    z-index: 400;
    max-height: 80dvh;
    overflow-y: auto;
    background: linear-gradient(180deg, #131c2e 0%, #0a0f1a 100%);
    border-top: 2px solid var(--primary);
    border-radius: var(--r-lg) var(--r-lg) 0 0;
    box-shadow: 0 -14px 44px rgba(0, 0, 0, 0.85);
    padding: var(--sp-5);
    /* Clears the iPhone home indicator. */
    padding-bottom: calc(var(--sp-6) + var(--safe-bottom));
    animation: rise 0.24s cubic-bezier(0.22, 1, 0.36, 1);
  }
  @keyframes rise { from { transform: translateY(100%); } to { transform: translateY(0); } }
  header { display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--sp-4); }
  h3 { font-size: var(--fs-title); color: var(--accent); font-weight: 800; }
  header button {
    background: none; border: none; color: var(--text-muted);
    font-size: 16px; cursor: pointer; min-width: 32px; min-height: 32px;
  }
  .body { font-size: var(--fs-body); }
</style>
