<script lang="ts">
  /**
   * A proportion shown as discrete marks rather than a number.
   *
   * Why this exists at all: a bare count invites ranking. "4 Bereiche" next to
   * "8 Bereiche" reads as less, therefore worse — which is exactly wrong when
   * the smaller number describes a tighter, more focused start rather than a
   * poorer one. Marks read as a CUT: this much of the whole, deliberately.
   *
   * Accessibility: the marks are decorative and hidden, because repeating
   * "filled, filled, empty…" eleven times tells a screen-reader user nothing.
   * The `aria-label` carries the fact. Filled and unfilled differ by fill AND
   * by border, never by hue alone, so the greyscale test passes.
   */
  let {
    value,
    total,
    slots = 12,
    label,
    tone = 'primary'
  }: {
    /** How many of `total` are already true. */
    value: number;
    total: number;
    /** How many marks to draw. Fixed, so two Marks side by side are comparable. */
    slots?: number;
    /** Spoken and printed. Must read as a fact, not as a score. */
    label: string;
    tone?: 'primary' | 'accent' | 'muted';
  } = $props();

  const ratio = $derived(total > 0 ? Math.min(1, Math.max(0, value / total)) : 0);
  // At least one mark whenever anything is open: zero filled marks would read
  // as "nothing", and no start offers nothing.
  const lit = $derived(value > 0 ? Math.max(1, Math.round(ratio * slots)) : 0);
</script>

<span class="marks {tone}" role="img" aria-label={label}>
  <span class="track" aria-hidden="true">
    {#each { length: slots } as _, i}
      <i class:on={i < lit}></i>
    {/each}
  </span>
  <span class="caption">{label}</span>
</span>

<style>
  .marks { display: flex; align-items: center; gap: var(--sp-2); flex-wrap: wrap; }
  .track { display: flex; gap: 3px; }
  .track i {
    width: 12px; height: 4px; border-radius: 1px;
    background: transparent; box-shadow: inset 0 0 0 1px var(--border);
  }
  .track i.on { background: var(--primary); box-shadow: none; }
  .accent .track i.on { background: var(--accent); }
  .muted .track i.on { background: var(--text-muted); }
  .caption {
    font-size: var(--fs-micro); color: var(--text-muted);
    font-family: var(--font-num); font-variant-numeric: tabular-nums;
  }
</style>
