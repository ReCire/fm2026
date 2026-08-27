<script lang="ts">
  import { toasts, dismiss } from './toasts.svelte';

  // A 3px coloured left border was the only thing separating an injury from a
  // gate receipt. Severity now has a glyph as well.
  const GLYPH = { good: '▲', bad: '▼', warn: '!', info: '■' } as const;
</script>

<!-- Replaces alert(). Non-blocking, styleable, and it does not say
     "anstoss.vercel.app says" on an installed iOS app. -->
<div class="stack" aria-live="polite">
  {#each toasts.items as t (t.id)}
    <button class="toast {t.severity}" type="button" onclick={() => dismiss(t.id)}>
      <strong><i class="glyph" aria-hidden="true">{GLYPH[t.severity]}</i>{t.title}</strong>
      {#if t.detail}<span>{t.detail}</span>{/if}
    </button>
  {/each}
</div>

<style>
  .stack {
    position: fixed;
    left: var(--s3); right: var(--s3);
    bottom: calc(64px + var(--safe-bottom));
    z-index: 500;
    display: flex;
    flex-direction: column;
    gap: var(--s2);
    pointer-events: none;
  }
  .toast {
    pointer-events: auto;
    text-align: left;
    background: #131c2e;
    border: 1px solid var(--border-strong);
    border-left: 3px solid var(--text-muted);
    border-radius: var(--r-sm);
    padding: var(--s2) var(--s3);
    color: var(--text-main);
    box-shadow: var(--shadow-card);
    cursor: pointer;
    animation: slide 0.2s ease;
  }
  @keyframes slide { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
  .toast strong { display: block; font-size: var(--fs-body); }
  .toast span { display: block; font-size: var(--fs-caption); color: var(--text-muted); margin-top: 2px; }
  .good { border-left-color: var(--primary); }
  .warn { border-left-color: var(--accent); }
  .bad { border-left-color: var(--danger); }
  .info { border-left-color: var(--blue); }
</style>
