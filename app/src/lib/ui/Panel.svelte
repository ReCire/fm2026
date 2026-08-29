<script lang="ts">
  import type { Snippet } from 'svelte';
  let {
    title,
    accent = 'accent',
    meta,
    children,
    actions
  }: {
    title?: string;
    accent?: 'accent' | 'primary' | 'industry' | 'europe' | 'danger' | 'gold';
    meta?: string;
    children: Snippet;
    actions?: Snippet;
  } = $props();
</script>

<section class="panel">
  {#if title}
    <!-- `-ink`, not the bare fill. The title is TYPE, and a fill is not
         legible as type on a light ground: accent measured 2.81:1 and primary
         3.63:1 on the white card, so every panel heading in the app failed AA
         in day mode. The fill/ink gate could not see it because the token name
         is composed from a prop at runtime, so a static search for
         `color: var(--accent)` finds nothing here. -->
    <header style="--panel-accent: var(--{accent}-ink)">
      <h2>{title}</h2>
      <div class="right">
        {#if meta}<span class="meta">{meta}</span>{/if}
        {#if actions}{@render actions()}{/if}
      </div>
    </header>
  {/if}
  {@render children()}
</section>

<style>
  .panel {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--r-md);
    padding: var(--s3);
    margin-bottom: var(--s3);
    box-shadow: var(--shadow-card);
  }
  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--s2);
    border-bottom: 1px solid var(--border);
    padding-bottom: var(--s2);
    margin-bottom: var(--s2);
  }
  h2 { font-size: var(--fs-title); font-weight: 800; color: var(--panel-accent); }
  .right { display: flex; align-items: center; gap: var(--s2); }
  .meta { font-size: var(--fs-caption); color: var(--text-muted); }
</style>
