<script lang="ts">
  let {
    tabs,
    active = $bindable(),
    label
  }: {
    tabs: { id: string; label: string; badge?: number }[];
    active: string;
    /** Names the set for assistive tech: "Ligaansicht", "Statistik". */
    label: string;
  } = $props();

  /*
   * One screen, several views — the Sportschau strip.
   *
   * A league screen is a table AND a fixture list AND four stat boards, and
   * stacking them makes one page you scroll for a minute to reach the bottom
   * of. Tabs turn "scroll past what you did not want" into "tap what you did",
   * which on a phone is the whole difference.
   *
   * It scrolls sideways rather than wrapping. A strip that wraps to three rows
   * pushes the content off the screen, which is the space it was meant to save
   * — and a football audience already reads horizontal tab strips, because
   * every app in the category has one.
   */
  let strip = $state<HTMLElement | null>(null);

  /* Keep the active tab in view when it changes from outside a tap. */
  $effect(() => {
    const el = strip?.querySelector<HTMLElement>('[aria-selected="true"]');
    el?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  });

  /*
   * Arrow keys move between tabs, which is what the tablist pattern promises.
   * Without it a keyboard user tabs into the strip and can only reach the one
   * button that happens to be selected — the roles would be announcing a
   * behaviour that is not there.
   */
  function onkeydown(e: KeyboardEvent, index: number) {
    const delta = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!delta) return;
    e.preventDefault();
    const next = (index + delta + tabs.length) % tabs.length;
    active = tabs[next]!.id;
    const buttons = strip?.querySelectorAll<HTMLElement>('[role="tab"]');
    buttons?.[next]?.focus();
  }
</script>

<div class="strip" role="tablist" aria-label={label} bind:this={strip}>
  {#each tabs as tab, i (tab.id)}
    <!-- docs-check-ignore: switching view is navigation, not a game action -->
    <button
      role="tab"
      id="tab-{tab.id}"
      aria-selected={active === tab.id}
      aria-controls="panel-{tab.id}"
      tabindex={active === tab.id ? 0 : -1}
      class:on={active === tab.id}
      onclick={() => (active = tab.id)}
      onkeydown={(e) => onkeydown(e, i)}
    >
      {tab.label}
      {#if tab.badge}<span class="badge">{tab.badge}</span>{/if}
    </button>
  {/each}
</div>

<style>
  .strip {
    display: flex;
    gap: var(--s4);
    overflow-x: auto;
    scrollbar-width: none;
    border-bottom: 1px solid var(--border);
    margin-bottom: var(--s3);
    -webkit-overflow-scrolling: touch;
  }
  .strip::-webkit-scrollbar { display: none; }

  button {
    flex: 0 0 auto;
    min-height: var(--tap);
    padding: 0 0 var(--s2);
    background: none;
    border: 0;
    /* The underline IS the selection, so it is on every tab and transparent
       until chosen — otherwise the strip shifts by three pixels on every tap. */
    border-bottom: 3px solid transparent;
    font: inherit;
    font-size: var(--fs-caption);
    font-weight: 700;
    letter-spacing: .06em;
    text-transform: uppercase;
    color: var(--text-muted);
    cursor: pointer;
    white-space: nowrap;
  }
  button.on {
    color: var(--text-main);
    border-bottom-color: var(--accent);
  }
  button:focus-visible { outline: 2px solid var(--text-main); outline-offset: 2px; }

  .badge {
    display: inline-block;
    margin-left: var(--s1);
    padding: 0 5px;
    border-radius: 8px;
    background: var(--danger);
    color: var(--on-fill-alt, #fff);
    font-size: 10px;
    font-weight: 800;
  }
</style>
