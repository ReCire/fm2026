<script lang="ts">
  import Doc from '$lib/docs/Doc.svelte';
  let {
    label,
    value,
    tone = 'neutral',
    doc: docId
  }: {
    label: string;
    value: string | number;
    tone?: 'neutral' | 'good' | 'bad' | 'warn';
    doc?: string;
  } = $props();

  const GLYPH = { good: '▲', bad: '▼', warn: '!', neutral: '■' } as const;
  const toneLabel = { good: 'positiv', bad: 'negativ', warn: 'Warnung', neutral: '' } as const;
</script>

<div class="chip {tone}">
  <span class="label">
    {label}
    {#if docId}<Doc id={docId} />{/if}
  </span>
  <strong class="tabular">
    <!-- Non-colour channel. The greyscale test: convert the screen to grey and
         every state must still be distinguishable. Hue alone fails WCAG 1.4.1,
         and in a UI that is entirely numbers-plus-status it fails everywhere at
         once. The glyph is aria-hidden because `toneLabel` carries the same
         meaning to assistive tech as words. -->
    {#if tone !== 'neutral'}<i class="glyph" aria-hidden="true">{GLYPH[tone]}</i>{/if}
    {value}
    {#if tone !== 'neutral'}<span class="vh">({toneLabel[tone]})</span>{/if}
  </strong>
</div>

<style>
  .chip {
    background: var(--bg-inset);
    border: 1px solid var(--border);
    padding: var(--s2) var(--s2);
    border-radius: var(--r-sm);
    min-width: 0;
  }
  .label {
    font-size: var(--fs-caption);
    color: var(--text-muted);
    display: flex;
    align-items: center;
    gap: 2px;
  }
  strong { font-size: var(--fs-body); color: var(--text-main); display: block; }
  .good strong { color: var(--pos-ink); }
  .bad strong { color: var(--neg-ink); }
  .warn strong { color: var(--accent-ink); }
  .vh { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
</style>
