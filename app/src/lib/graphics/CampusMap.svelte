<script lang="ts">
  import {
    project, topFace, rightFace, leftFace, gable, stand, mast, byDepth, viewBoxFor,
    shade, type Footprint, type Solid
  } from './iso';
  import { SITE, layout, heightOf, type Placed } from './campus';
  import type { StadiumState } from '$lib/features/stadium/state';

  let {
    stadium,
    /** Campus module state when it exists: building id → built level. */
    levels = {},
    clubName = '',
    /** Called when a plot is tapped, so the screen can open a build sheet. */
    onselect
  }: {
    stadium: StadiumState;
    levels?: Record<string, number>;
    clubName?: string;
    onselect?: (plotId: string) => void;
  } = $props();

  const placed = $derived(layout(levels));
  const blocks = $derived(stadium.blocks);
  const cap = (id: string) => blocks[id]?.cap ?? 0;

  /*
   * Stand height from actual block capacity.
   *
   * Logarithmic, not linear. A ground goes from 3.420 seats to 60.000 across a
   * career — linear would leave the fourth-division stands as a one-pixel kerb
   * and the top flight overflowing the frame. A log curve keeps the FIRST
   * expansion visible, which is the one the player is deciding about.
   */
  const rake = (seats: number) => Math.max(0.9, Math.log10(Math.max(seats, 50) / 50) * 2.8);

  // North is the far edge, south the near one, so the near stand is drawn last
  // and everything inside the bowl reads as being behind it.
  const stands = $derived([
    { side: 'north' as const, fp: { x: 8, y: 5, w: 8, d: 3 }, seats: cap('haupt') + cap('hauptNord') },
    { side: 'west' as const, fp: { x: 5, y: 8, w: 3, d: 8 }, seats: cap('west') },
    { side: 'east' as const, fp: { x: 16, y: 8, w: 3, d: 8 }, seats: cap('gegen') + cap('vipLogen') },
    { side: 'south' as const, fp: { x: 8, y: 16, w: 8, d: 3 }, seats: cap('kurve') + cap('suedOber') }
  ]);

  const pitch: Solid = { x: 8, y: 8, w: 8, d: 8, h: 0 };
  const apron: Solid = { x: 4, y: 4, w: 16, d: 16, h: 0 };
  const ground: Solid = { x: -1, y: -1, w: SITE.w + 2, d: SITE.d + 2, h: 0 };

  /** Only where the club actually owns floodlights. The glow IS the upgrade. */
  const pylons = $derived(
    stadium.flutlicht ? [mast(5, 5, 7), mast(19, 5, 7), mast(5, 19, 7), mast(19, 19, 7)] : []
  );

  const ordered = $derived(byDepth(placed));
  const viewBox = viewBoxFor([ground as Footprint]);
  const centre = project(12, 12, 0);

  const solidFor = (p: Placed): Solid => ({ ...p.footprint, h: heightOf(p) });

  /** A pitch, a yard and a pool are flat; everything else is a solid. */
  const isFlat = (p: Placed) =>
    !p.building || p.level < 0 || p.building.shape === 'pitch' || p.building.shape === 'yard';

  const isGabled = (p: Placed) =>
    !!p.building && p.level >= 0 && (p.building.shape === 'shed' || p.building.shape === 'hall');

  function materialFor(p: Placed): string {
    if (!p.building || p.level < 0) return 'var(--iso-tarmac)';
    switch (p.building.shape) {
      case 'pitch': return 'var(--iso-turf)';
      case 'yard': return 'var(--iso-concrete)';
      case 'water': return 'var(--iso-water)';
      case 'tower': return 'var(--iso-glass)';
      default:
        /*
         * Level 0 of a founding building is corrugated iron, not concrete.
         * The bottom of the ladder has to look POOR rather than merely small —
         * four rusting containers is a fact about your club you want to fix,
         * where a small grey box is just a small grey box.
         */
        return p.level === 0 && p.building.costs[0] === 0
          ? 'var(--iso-rust)'
          : 'var(--iso-concrete)';
    }
  }

  function markAt(p: Placed) {
    const f = p.footprint;
    const [x, y] = project(f.x + f.w / 2, f.y + f.d / 2, heightOf(p) + 0.35);
    return { x, y };
  }

  function plotLabel(p: Placed): string {
    if (!p.building) return `Freies Grundstück, ${p.plot.size}`;
    if (p.level < 0) return `${p.building.name} — noch nicht gebaut`;
    return `${p.building.name}, Ausbaustufe ${p.level + 1} von ${p.building.costs.length}`;
  }

  const summary = $derived.by(() => {
    const standing = placed.filter((p) => p.building && p.level >= 0).length;
    const free = placed.length - standing;
    const seats = Object.values(blocks).reduce((n, b) => n + b.cap, 0);
    const light = stadium.flutlicht ? 'mit Flutlicht' : 'ohne Flutlicht';
    return `${clubName || 'Vereinsgelände'}: Stadion mit ${seats.toLocaleString('de-DE')} Plätzen ${light}, ${standing} Gebäude, ${free} freie Grundstücke.`;
  });
</script>

<!--
  The campus, drawn from the club's own state.

  Every dimension here is read from something: stand height from block capacity,
  the masts from `stadium.flutlicht`, building heights from their built level.
  Nothing is decoration standing in for a number — if the picture is wrong, the
  club is wrong.

  Which is also what rules out a drawn sprite sheet. Sprites would look better
  on day one and would show a ground the player does not own, and a picture of
  the club that stops being a picture OF the club is wallpaper.
-->
<figure class="campus">
  <svg {viewBox} role="img" aria-label={summary} preserveAspectRatio="xMidYMid meet">
    <polygon points={topFace(ground)} fill="var(--iso-grass)" />
    <polygon points={topFace(apron)} fill="var(--iso-tarmac)" />

    <!-- Far stands first: nothing here depth-tests, so draw order is the only
         thing stopping the south stand painting over the pitch. -->
    {#each stands as s (s.side)}
      {@const back = rake(s.seats)}
      {@const g = stand(s.fp, s.side, 0.3, back)}
      <polygon points={g.outer} fill="var(--iso-concrete)" />
      <polygon points={g.outer} fill="#000" opacity={shade('left')} />
      <polygon points={g.flank} fill="var(--iso-concrete)" />
      <polygon points={g.flank} fill="#000" opacity={shade('right')} />
      <polygon points={g.top} fill="var(--iso-stand)" />
      <polygon points={g.top} fill="#000" opacity={shade('right')} />
      <polygon points={g.inner} fill="var(--iso-concrete)" />
      <polygon points={g.inner} fill="#000" opacity={shade('left')} />
      <!-- Terrace steps. A raked plane and a loading ramp are the same polygon;
           the steps are the only thing that says "people stand here". Three
           lines read as a terrace and survive the map being 340px wide. -->
      {#each [0.34, 0.58, 0.82] as t (t)}
        {@const lvl = 0.3 + (back - 0.3) * t}
        {@const step = stand(s.fp, s.side, lvl, lvl)}
        <polygon points={step.top} fill="none" stroke="#000" stroke-width="1" opacity="0.22" />
      {/each}
      {#if stadium.dach}
        {@const roof = stand(s.fp, s.side, back + 1.6, back + 1.9)}
        <polygon points={roof.top} fill="var(--iso-roof)" opacity="0.92" />
      {/if}
    {/each}

    <polygon points={topFace(pitch)} fill="var(--iso-turf)" />
    <polygon
      points={topFace({ x: 8.7, y: 8.7, w: 6.6, d: 6.6, h: 0 })}
      fill="none" stroke="var(--iso-line)" stroke-width="1.2" opacity="0.6"
    />
    <ellipse
      cx={centre[0]} cy={centre[1]} rx="24" ry="12"
      fill="none" stroke="var(--iso-line)" stroke-width="1.2" opacity="0.6"
    />

    {#if stadium.flutlicht}
      <polygon points={topFace(pitch)} fill="var(--iso-lit)" opacity="0.13" />
    {/if}
    {#each pylons as p, i (i)}
      <line x1={p.x1} y1={p.y1} x2={p.x2} y2={p.y2} stroke="var(--iso-roof)" stroke-width="2.5" />
      <circle cx={p.x2} cy={p.y2} r="4" fill="var(--iso-lit)" opacity="0.9" />
    {/each}

    {#each ordered as p (p.plot.id)}
      {@const s = solidFor(p)}
      <g
        class="plot"
        role="button"
        tabindex="0"
        aria-label={plotLabel(p)}
        onclick={() => onselect?.(p.plot.id)}
        onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && onselect?.(p.plot.id)}
      >
        {#if isFlat(p)}
          <polygon points={topFace({ ...p.footprint, h: 0 })} fill={materialFor(p)} />
          {#if p.level < 0}
            <!-- Empty ground is fenced and dashed, the "+ BAUEN" plot. It is
                 an invitation, so it has to look like one rather than like a
                 gap in the drawing. -->
            <polygon
              points={topFace({ ...p.footprint, h: 0 })}
              fill="none" stroke="var(--iso-line)" stroke-width="1.5"
              stroke-dasharray="4 9" opacity="0.32"
            />
          {/if}
        {:else}
          <polygon points={rightFace(s)} fill={materialFor(p)} />
          <polygon points={rightFace(s)} fill="#000" opacity={shade('right')} />
          <polygon points={leftFace(s)} fill={materialFor(p)} />
          <polygon points={leftFace(s)} fill="#000" opacity={shade('left')} />
          {#if isGabled(p)}
            {@const roof = gable(s, 0.6)}
            <polygon points={roof.right} fill="var(--iso-roof)" />
            <polygon points={roof.left} fill="var(--iso-roof)" />
            <polygon points={roof.left} fill="#000" opacity={shade('left')} />
          {:else}
            <polygon points={topFace(s)} fill="var(--iso-roof)" />
          {/if}
        {/if}

        {#if p.concealed}
          <!-- A secret facility marks its host and never gets a plot of its
               own. A Bunker with a sign on it is not a bunker. -->
          <circle cx={markAt(p).x} cy={markAt(p).y + 8} r="3.5" fill="var(--purple)" opacity="0.85" />
        {/if}
      </g>
    {/each}
  </svg>
</figure>

<style>
  .campus {
    margin: 0;
    background: var(--iso-sky);
    border-radius: var(--r-md);
    overflow: hidden;
  }
  .campus svg { display: block; width: 100%; height: auto; }
  /*
   * The plot IS the control. A hit area on a diagonal cannot be padded out to
   * 44px without overlapping its neighbour, so the footprint carries the tap —
   * which on this projection is comfortably bigger than a fingertip even at
   * the 2x2 size.
   */
  .plot { cursor: pointer; }
  .plot:hover polygon, .plot:focus-visible polygon {
    stroke: var(--iso-line);
    stroke-width: 1.5;
  }
  .plot:focus-visible { outline: none; }
</style>
