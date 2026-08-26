<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    open = $bindable(false),
    title,
    children
  }: { open?: boolean; title: string; children: Snippet } = $props();

  let sheet = $state<HTMLElement | null>(null);
  let heading = $state<HTMLElement | null>(null);
  let opener: HTMLElement | null = null;

  const FOCUSABLE =
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

  /*
   * Real modality, or none at all.
   *
   * This used to declare role="dialog" aria-modal="true" and implement none of
   * it — no focus move, no trap, no restore, and a background that stayed fully
   * reachable. Claiming modality you do not implement is worse than not claiming
   * it: assistive technology tells the user the background is unavailable while
   * Tab walks them straight into it, with no way out and no indication why.
   */
  $effect(() => {
    if (!open) return;

    opener = document.activeElement as HTMLElement | null;
    // Focus the heading rather than the first control, so a screen reader
    // announces what this sheet IS before what can be done in it.
    queueMicrotask(() => heading?.focus());

    // The rest of the app is genuinely unavailable while this is up.
    const siblings = [...document.body.children].filter((el) => !el.contains(sheet));
    for (const el of siblings) el.setAttribute('inert', '');

    return () => {
      for (const el of siblings) el.removeAttribute('inert');
      opener?.focus?.();
      opener = null;
    };
  });

  function onkeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      e.stopPropagation();
      open = false;
      return;
    }

    if (e.key !== 'Tab' || !sheet) return;

    const items = [...sheet.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
      (el) => el.offsetParent !== null
    );
    if (items.length === 0) {
      e.preventDefault();
      return;
    }

    const first = items[0]!;
    const last = items[items.length - 1]!;
    const active = document.activeElement;

    if (e.shiftKey && (active === first || active === heading)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  }
</script>

{#if open}
  <div class="scrim" role="presentation" onclick={() => (open = false)}></div>

  <!-- The key handler lives on the sheet rather than on window: focus is
       trapped inside, so nothing else can receive these keys, and six mounted
       sheets no longer all fire on one Escape press. -->
  <div
    class="sheet"
    bind:this={sheet}
    role="dialog"
    aria-modal="true"
    aria-labelledby="sheet-title"
    tabindex="-1"
    {onkeydown}
  >
    <header>
      <h3 id="sheet-title" bind:this={heading} tabindex="-1">{title}</h3>
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
    bottom: 0;
    z-index: 400;
    /* Landscape on a notched phone: viewport-fit=cover means the notch overlays
       the page, so the first ~44px of text sat underneath it. */
    left: var(--safe-left);
    right: var(--safe-right);
    max-height: 80dvh;
    overflow-y: auto;
    /* Stops a scroll past the end of the sheet chaining to the page behind it. */
    overscroll-behavior: contain;
    background: linear-gradient(180deg, #131c2e 0%, #0a0f1a 100%);
    border-top: 2px solid var(--primary);
    border-radius: var(--r-lg) var(--r-lg) 0 0;
    box-shadow: 0 -14px 44px rgba(0, 0, 0, 0.85);
    padding: var(--s3);
    padding-bottom: calc(var(--s4) + var(--safe-bottom));
    animation: rise 0.24s cubic-bezier(0.22, 1, 0.36, 1);
  }
  @keyframes rise { from { transform: translateY(100%); } to { transform: translateY(0); } }
  header { display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--s3); }
  h3 { font-size: var(--fs-title); color: var(--accent); font-weight: 800; }
  h3:focus-visible { outline: 2px solid var(--primary); outline-offset: 4px; }
  header button {
    background: none; border: none; color: var(--text-muted);
    font-size: var(--fs-title); cursor: pointer;
    min-width: var(--tap); min-height: var(--tap);
  }
  .body { font-size: var(--fs-body); }
</style>
