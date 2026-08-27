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
    blocked = false,
    describedBy,
    label,
    explain = false,
    onclick
  }: {
    doc: string;
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
    /**
     * Hard-disabled: out of the tab order, cannot be pressed. Use only when
     * there is genuinely nothing to explain.
     */
    disabled?: boolean;
    /**
     * Unavailable, but still reachable, still announced, and still pressable.
     *
     * The `disabled` attribute drops a control out of the tab order, so a
     * keyboard user tabs to the end of a step and finds nothing — no button, no
     * explanation, no way to discover what is missing. `aria-disabled` keeps it
     * discoverable. Pair it with `describedBy` and an onclick that routes the
     * player to whatever is unmet: an unavailable control must still explain
     * and still lead somewhere. Disabling is not an explanation.
     */
    blocked?: boolean;
    /** Id of the element listing why this is unavailable. */
    describedBy?: string;
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
    class:blocked
    type="button"
    {disabled}
    aria-disabled={blocked ? 'true' : undefined}
    aria-describedby={[entry ? `${docId}-desc` : null, describedBy].filter(Boolean).join(' ') || undefined}
    {onclick}
  >{text}</button>
  <!-- The tooltip belongs in a description, not in the accessible NAME. As a
       label it made a screen reader read the whole sentence on every focus pass
       and in every list-of-buttons enumeration. -->
  {#if entry}<span id="{docId}-desc" class="vh">{entry.tooltip}</span>{/if}
  {#if explain}<Doc id={docId} />{/if}
</span>

<style>
  .wrap { display: inline-flex; align-items: center; gap: 2px; width: 100%; }
  .btn {
    flex: 1;
    border: none;
    border-radius: var(--r-sm);
    padding: var(--s2) var(--s3);
    font-weight: 800;
    font-size: var(--fs-body);
    cursor: pointer;
    transition: transform 0.12s, background 0.15s;
    position: relative;
    /* Apple HIG minimum is 44x44pt. This was 38 under a comment claiming it was
       the HIG figure, which would have propagated the wrong number to every
       component built after it. */
    min-height: var(--tap);
  }
  /* Appearance and hit area are separate concerns: where a control must LOOK
     smaller, the visual box shrinks and the target grows with this instead. */
  .btn::after {
    content: '';
    position: absolute;
    inset: 50% 0 auto;
    height: var(--tap);
    transform: translateY(-50%);
  }
  .vh { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
  .btn:active:not(:disabled) { transform: scale(0.98); }
  .btn:disabled { opacity: 0.45; cursor: not-allowed; }
  /* Looks the same as disabled; behaves completely differently. */
  .btn.blocked { opacity: 0.45; }

  .primary { background: var(--primary); color: var(--on-fill); }
  .secondary { background: #1e293b; color: var(--accent-ink); border: 1px solid var(--border-strong); }
  .ghost { background: transparent; color: var(--text-muted); border: 1px solid var(--border); }
  .danger { background: var(--danger); color: #fff; }
</style>
