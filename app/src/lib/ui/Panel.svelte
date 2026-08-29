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

  /*
   * An explicit map rather than `var(--{accent}-ink)`.
   *
   * Composing a token name at runtime defeats every static check downstream —
   * which is how every panel heading in the app came to be a fill used as type,
   * at 2.81:1 on the light card, with the fill/ink gate unable to see it. The
   * literals below ARE checkable, so if one of these ever became a fill the
   * gate would say so.
   *
   * The prop and its values are unchanged; only the indirection is gone.
   */
  const INK: Record<NonNullable<typeof accent>, string> = {
    accent: 'var(--accent-ink)',
    primary: 'var(--primary-ink)',
    industry: 'var(--industry-ink)',
    europe: 'var(--europe-ink)',
    danger: 'var(--danger-ink)',
    gold: 'var(--gold-ink)'
  };
  const ink = $derived(INK[accent]);
</script>

<section class="panel">
  {#if title}
    <!-- `-ink`, not the bare fill. The title is TYPE, and a fill is not legible
         as type on a light ground: accent measured 2.81:1 and primary 3.63:1 on
         the white card, so every panel heading in the app failed AA in day
         mode. -->
    <header style="--panel-accent: {ink}">
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
