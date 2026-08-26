<script lang="ts">
  let {
    value,
    max = 100,
    tone = 'auto',
    label
  }: {
    value: number;
    max?: number;
    /** 'auto' colours by how full the bar is — right for fitness and morale. */
    tone?: 'auto' | 'primary' | 'accent' | 'danger';
    label?: string;
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
<div
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
</div>

<style>
  .bar { position: relative; height: 6px; background: rgba(0, 0, 0, 0.5); border-radius: 99px; overflow: hidden; }
  .fill { display: block; height: 100%; border-radius: 99px; transition: width 0.3s ease; }
  .tick {
    position: absolute; top: 0; bottom: 0; width: 1px;
    background: var(--bg-body); opacity: 0.9;
  }
</style>
