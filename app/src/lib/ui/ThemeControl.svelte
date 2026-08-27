<script lang="ts">
  import { theme, setTheme, CHOICES, THEME_LABEL } from '$lib/shell';

  /**
   * Three-way theme control.
   *
   * A segmented control rather than a cycling icon button, for two reasons.
   * There are three states, and one icon cannot honestly show which of three
   * is active — a moon tells you nothing about whether "system" is chosen.
   * And a cycling button makes the player tap through states they do not want
   * to reach the one they do.
   *
   * It lives at the foot of the drawer rather than in the header because it is
   * set once and then forgotten. A rarely-used control does not earn the most
   * valuable space on the screen.
   *
   * Marked up as a radiogroup, not buttons: the three are one choice with one
   * answer, and that is what a radiogroup means to assistive tech.
   */
  let { label = 'Darstellung' }: { label?: string } = $props();
</script>

<div class="theme">
  <span class="label" id="theme-label">{label}</span>
  <div class="seg" role="radiogroup" aria-labelledby="theme-label">
    {#each CHOICES as c (c)}
      <button
        type="button"
        role="radio"
        aria-checked={theme.choice === c}
        class:on={theme.choice === c}
        onclick={() => setTheme(c)}
      >{THEME_LABEL[c]}</button>
    {/each}
  </div>
</div>

<style>
  .theme { padding: var(--s3) var(--s2) var(--s4); }
  .label {
    display: block;
    font-size: var(--fs-caption);
    font-weight: 700;
    letter-spacing: 1.6px;
    text-transform: uppercase;
    color: var(--text-dim);
    margin-bottom: var(--s2);
  }
  .seg {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    border: 1px solid var(--border);
    border-radius: var(--r-sm);
    overflow: hidden;
  }
  .seg button {
    background: transparent;
    border: 0;
    border-right: 1px solid var(--border);
    color: var(--text-muted);
    font-family: inherit;
    font-size: var(--fs-caption);
    font-weight: 600;
    padding: 0 var(--s1);
    min-height: var(--tap);
    cursor: pointer;
  }
  .seg button:last-child { border-right: 0; }
  /* The selected state is carried by inverted ground plus weight, not by hue —
     it survives greyscale, which a coloured text label would not. */
  .seg button.on {
    background: var(--text-main);
    color: var(--bg-body);
    font-weight: 800;
  }
  .seg button:focus-visible { outline: 2px solid var(--primary); outline-offset: -2px; }
</style>
