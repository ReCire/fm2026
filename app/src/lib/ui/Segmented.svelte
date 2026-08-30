<script lang="ts">
  let {
    options,
    active = $bindable(),
    label,
    scroll = false
  }: {
    options: { id: string; label: string }[];
    active: string;
    /** Names the set for assistive tech: "Zeitraum", "Kategorie". */
    label: string;
    /**
     * Two to four options — GESAMT / HEIM / AUSWÄRTS — split a track evenly and
     * never scroll. A longer set (campus's building categories) scrolls
     * sideways instead: forcing ten categories into equal columns would leave
     * each one too narrow to read its own label.
     */
    scroll?: boolean;
  } = $props();

  /*
   * A track, not a tab strip.
   *
   * Tabs.svelte switches which PANEL is showing, with an underline on the
   * active label — that is a destination. Segmented switches which SLICE of
   * the same panel is showing (gesamt/heim/auswärts, a category), which reads
   * as a single control with one setting rather than a set of places to go —
   * so every option is a filled pill inside a sunken track, and the active
   * one is the only one that reads as "on". Sportschau's GESAMT/HEIM/AUSWÄRTS
   * strip is exactly this: a track, not a set of destinations.
   */
  let strip = $state<HTMLElement | null>(null);

  $effect(() => {
    const el = strip?.querySelector<HTMLElement>('[aria-selected="true"]');
    el?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  });

  function onkeydown(e: KeyboardEvent, index: number) {
    const delta = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!delta) return;
    e.preventDefault();
    const next = (index + delta + options.length) % options.length;
    active = options[next]!.id;
    const buttons = strip?.querySelectorAll<HTMLElement>('[role="tab"]');
    buttons?.[next]?.focus();
  }
</script>

<div class="track" class:scroll role="tablist" aria-label={label} bind:this={strip}>
  {#each options as option, i (option.id)}
    <!-- docs-check-ignore: switching the slice shown is a view control, not a game action -->
    <button
      role="tab"
      aria-selected={active === option.id}
      tabindex={active === option.id ? 0 : -1}
      class:on={active === option.id}
      onclick={() => (active = option.id)}
      onkeydown={(e) => onkeydown(e, i)}
    >{option.label}</button>
  {/each}
</div>

<style>
  .track {
    display: flex;
    gap: 2px;
    padding: 2px;
    background: var(--bg-sunken);
    border: 1px solid var(--border);
    border-radius: var(--r-lg);
  }
  .track.scroll {
    overflow-x: auto;
    scrollbar-width: none;
    -webkit-overflow-scrolling: touch;
  }
  .track.scroll::-webkit-scrollbar { display: none; }

  button {
    min-height: var(--tap);
    padding: 0 var(--s3);
    background: none;
    border: 0;
    border-radius: calc(var(--r-lg) - 2px);
    font: inherit;
    font-size: var(--fs-caption);
    font-weight: 700;
    color: var(--text-muted);
    cursor: pointer;
    white-space: nowrap;
  }
  /* Even split for a short, fixed set; auto width when the track scrolls —
     an auto-width segment in a flex:1 track would stretch to fill whatever
     space its neighbours left over, so the two layouts need different rules. */
  .track:not(.scroll) button { flex: 1 1 0; }
  .track.scroll button { flex: 0 0 auto; }

  button.on {
    background: var(--primary);
    color: var(--on-fill);
  }
  button:focus-visible { outline: 2px solid var(--text-main); outline-offset: 2px; }
</style>
