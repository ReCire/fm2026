<script lang="ts">
  import { ATTRIBUTES, ATTRIBUTE_LABEL, type Attributes, type Attribute } from '$lib/features/squad/attributes';

  /**
   * The five attributes as a shape.
   *
   * This is the whole reason the editor is not a spreadsheet. Five numbers in a
   * column are administrative: you read them one at a time and compare nothing.
   * A pentagon is read in one glance — you see the SHAPE of a player, which is
   * what a scout actually holds in their head. A quick winger and a solid
   * defender are different silhouettes before they are different numbers.
   *
   * It also does the emotional work. A maxed-out player is a perfect pentagon
   * pressed against the frame, and it looks WRONG in a way five 99s in a list
   * never will. That is the point: making a ringer should feel transgressive,
   * not like filling in a form.
   *
   * Weighted overlay: the faint inner outline is what the player's POSITION
   * actually rewards, so the shape shows not just how good they are but whether
   * their strengths are the ones this shirt needs.
   */
  let {
    attributes,
    weights,
    size = 200,
    highlight
  }: {
    attributes: Attributes;
    /** Position weights, drawn as a faint reference ring. Optional. */
    weights?: Record<Attribute, number>;
    size?: number;
    /** The attribute currently being edited, drawn emphasised. */
    highlight?: Attribute | null;
  } = $props();

  const R = 42;
  const CX = 50;
  const CY = 50;

  function point(i: number, value: number) {
    // Start at 12 o'clock and go clockwise, so the first attribute is on top.
    const angle = (Math.PI * 2 * i) / ATTRIBUTES.length - Math.PI / 2;
    const r = (value / 99) * R;
    return [CX + Math.cos(angle) * r, CY + Math.sin(angle) * r] as const;
  }

  const shape = $derived(
    ATTRIBUTES.map((a, i) => point(i, attributes[a]).join(',')).join(' ')
  );

  const ring = $derived(
    weights
      ? ATTRIBUTES.map((a, i) => point(i, Math.min(99, weights[a] * 99 * 2.4)).join(',')).join(' ')
      : null
  );

  const axes = $derived(ATTRIBUTES.map((a, i) => ({ a, at: point(i, 99), label: point(i, 128) })));
</script>

<svg viewBox="0 0 100 100" width={size} height={size} class="radar" role="img"
     aria-label={ATTRIBUTES.map((a) => `${ATTRIBUTE_LABEL[a]} ${attributes[a]}`).join(', ')}>
  <!-- Grid at 25/50/75/99, so a value can be estimated from the shape alone. -->
  {#each [0.25, 0.5, 0.75, 1] as step}
    <polygon
      points={ATTRIBUTES.map((_, i) => point(i, 99 * step).join(',')).join(' ')}
      class="grid" class:outer={step === 1}
    />
  {/each}
  {#each axes as ax}
    <line x1={CX} y1={CY} x2={ax.at[0]} y2={ax.at[1]} class="spoke" />
  {/each}

  {#if ring}
    <!-- What this position rewards. Dashed so it never competes with the
         player's own shape, but present so "wrong strengths" is visible. -->
    <polygon points={ring} class="weights" />
  {/if}

  <polygon points={shape} class="shape" />

  {#each ATTRIBUTES as a, i}
    {@const p = point(i, attributes[a])}
    <circle cx={p[0]} cy={p[1]} r={highlight === a ? 3.2 : 2} class="knob" class:on={highlight === a} />
  {/each}
</svg>

<style>
  .radar { display: block; overflow: visible; }
  .grid { fill: none; stroke: var(--border); stroke-width: 0.5; }
  .grid.outer { stroke: var(--border-strong); stroke-width: 0.8; }
  .spoke { stroke: var(--border); stroke-width: 0.4; }
  .weights { fill: none; stroke: var(--text-dim); stroke-width: 0.7; stroke-dasharray: 2 2; }
  .shape {
    fill: var(--primary); fill-opacity: 0.22;
    stroke: var(--primary); stroke-width: 1.6; stroke-linejoin: round;
    transition: none;
  }
  .knob { fill: var(--primary); }
  .knob.on { fill: var(--accent); }
</style>
