<script lang="ts">
  import { docLabel, doc } from '$lib/docs/registry';
  import Doc from '$lib/docs/Doc.svelte';

  let {
    /**
     * Doc id. Required — a control with no documentation does not ship.
     * `npm run docs:check` enforces this at build time.
     */
    doc: docId,
    variant = 'primary',
    disabled = false,
    label,
    explain = false,
    onclick
  }: {
    doc: string;
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
    disabled?: boolean;
    /** Overrides the registry label. Use sparingly — the registry is the source. */
    label?: string;
    /** Show the ⓘ affordance next to the button (touch-friendly tooltips). */
    explain?: boolean;
    onclick?: () => void;
  } = $props();

  const entry = $derived(doc(docId));
  const text = $derived(docLabel(docId, label));
</script>

<span class="wrap">
  <button
    class="btn {variant}"
    type="button"
    {disabled}
    title={entry?.tooltip}
    aria-label={entry ? `${text} — ${entry.tooltip}` : text}
    {onclick}
  >{text}</button>
  {#if explain}<Doc id={docId} />{/if}
</span>

<style>
  .wrap { display: inline-flex; align-items: center; gap: 2px; width: 100%; }
  .btn {
    flex: 1;
    border: none;
    border-radius: var(--r-sm);
    padding: var(--sp-3) var(--sp-5);
    font-weight: 800;
    cursor: pointer;
    transition: transform 0.12s, background 0.15s;
    /* Apple's minimum comfortable touch target. */
    min-height: 38px;
  }
  .btn:active:not(:disabled) { transform: scale(0.98); }
  .btn:disabled { opacity: 0.45; cursor: not-allowed; }

  .primary { background: var(--primary); color: #000; }
  .secondary { background: #1e293b; color: var(--accent); border: 1px solid var(--border-strong); }
  .ghost { background: transparent; color: var(--text-muted); border: 1px solid var(--border); }
  .danger { background: var(--danger); color: #fff; }
</style>
