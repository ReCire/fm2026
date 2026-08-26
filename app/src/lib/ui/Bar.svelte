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

  const pct = $derived(Math.max(0, Math.min(100, (value / max) * 100)));
  const colour = $derived(
    tone !== 'auto' ? `var(--${tone})`
    : pct >= 66 ? 'var(--primary)'
    : pct >= 33 ? 'var(--accent)'
    : 'var(--danger)'
  );
</script>

<div class="bar" role="meter" aria-valuenow={value} aria-valuemin="0" aria-valuemax={max} aria-label={label}>
  <span style="width: {pct}%; background: {colour}"></span>
</div>

<style>
  .bar { height: 5px; background: rgba(0, 0, 0, 0.5); border-radius: 99px; overflow: hidden; }
  .bar span { display: block; height: 100%; border-radius: 99px; transition: width 0.3s ease; }
</style>
