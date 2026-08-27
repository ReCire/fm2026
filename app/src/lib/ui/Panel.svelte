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
    <header style="--panel-accent: var(--{accent})">
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
