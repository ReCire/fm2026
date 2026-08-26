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
</script>

<div class="chip {tone}">
  <span class="label">
    {label}
    {#if docId}<Doc id={docId} />{/if}
  </span>
  <strong class="tabular">{value}</strong>
</div>

<style>
  .chip {
    background: rgba(0, 0, 0, 0.4);
    border: 1px solid var(--border);
    padding: var(--sp-2) var(--sp-3);
    border-radius: var(--r-sm);
    min-width: 0;
  }
  .label {
    font-size: var(--fs-micro);
    color: var(--text-muted);
    display: flex;
    align-items: center;
    gap: 2px;
  }
  strong { font-size: var(--fs-base); color: var(--text-main); display: block; }
  .good strong { color: var(--primary); }
  .bad strong { color: var(--danger); }
  .warn strong { color: var(--accent); }
</style>
