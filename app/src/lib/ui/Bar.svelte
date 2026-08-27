<script lang="ts">
  let {
    value,
    max = 100,
    tone = 'auto',
    label,
    showValue = false
  }: {
    value: number;
    max?: number;
    /** 'auto' colours by how full the bar is — right for fitness and morale. */
    tone?: 'auto' | 'primary' | 'accent' | 'danger';
    label?: string;
    /**
     * Print the figure beside the bar.
     *
     * Without it the bar tells assistive tech the exact number through
     * aria-valuenow and tells a sighted player only "roughly this full" — the
     * screen-reader path is better than the visual one, which is backwards.
     * Where the value is something the player COMPARES between rows, the
     * number has to be on screen: two bars of similar length do not answer
     * "is 78 better than 84".
     */
    showValue?: boolean;
  } = $props();

  const clamped = $derived(Math.max(0, Math.min(max, value)));
  const pct = $derived((clamped / max) * 100);
  const colour = $derived(
    tone !== 'auto' ? `var(--${tone})`
    : pct >= 66 ? 'var(--primary)'
    : pct >= 33 ? 'var(--accent)'
    : 'var(--danger)'
  );
</script>

<!-- Ticks at the band boundaries give the same information as the hue change,
     so the band is readable in greyscale and by anyone who cannot separate
     red from green. aria-valuenow reports the CLAMPED figure: announcing
     "130 of 100" was simply wrong. -->
<span class="wrap" class:withValue={showValue}>
  <span
    class="bar"
    role="meter"
    aria-valuenow={Math.round(clamped)}
    aria-valuemin="0"
    aria-valuemax={max}
    aria-label={label ?? 'Wert'}
  >
    <span class="fill" style="width: {pct}%; background: {colour}"></span>
    {#if tone === 'auto'}
      <i class="tick" style="left: 33%"></i>
      <i class="tick" style="left: 66%"></i>
    {/if}
  </span>
  <!-- The figure is aria-hidden: the meter above already reports it, and
       announcing it twice is noise. This copy is for the eyes only. -->
  {#if showValue}<b class="val" aria-hidden="true">{Math.round(clamped)}</b>{/if}
</span>

<style>
  .wrap { display: block; }
  .wrap.withValue { display: flex; align-items: center; gap: var(--s2); }
  .bar { position: relative; display: block; height: 6px; background: var(--bg-inset); border-radius: 99px; overflow: hidden; flex: 1; min-width: 34px; }
  .val {
    font-family: var(--font-num); font-variant-numeric: tabular-nums;
    font-size: var(--fs-caption); font-weight: 700; color: var(--text-main);
    min-width: 2.2ch; text-align: right;
  }
  .fill { display: block; height: 100%; border-radius: 99px; transition: width 0.3s ease; }
  .tick {
    position: absolute; top: 0; bottom: 0; width: 1px;
    background: var(--bg-body); opacity: 0.9;
  }
</style>
