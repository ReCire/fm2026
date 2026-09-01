<script lang="ts">
  import type { StadiumState } from '$lib/features/stadium/state';
  import { capacity, attendanceFactor } from '$lib/features/stadium/rules';

  /**
   * The stadium, and only the stadium.
   *
   * The stadium screen used to show the whole site plan, which put the one
   * thing the screen is about in the middle of nineteen plots that belong to
   * a different page. This is the bowl on its own, portrait like every
   * top-down photo of a real ground — the pitch at 68:105, the stands as a
   * ring whose depth per side IS that side's capacity. Expand the Südtribüne
   * and the south band visibly thickens; that is the "adding on" made
   * literal, no progress bar required.
   */
  let {
    stadium,
    /** Block ids whose next expansion the club can afford right now. */
    affordable = []
  }: {
    stadium: StadiumState;
    affordable?: string[];
  } = $props();

  /* Which stand each block builds onto. Unknown keys land in the east. */
  const SIDE: Record<string, 'nord' | 'sued' | 'ost' | 'west'> = {
    haupt: 'nord', hauptNord: 'nord',
    kurve: 'sued', suedOber: 'sued',
    gegen: 'ost', gaeste: 'ost',
    west: 'west', vipLogen: 'west'
  };

  const sideCap = (side: string) =>
    Object.entries(stadium.blocks)
      .filter(([id]) => (SIDE[id] ?? 'ost') === side)
      .reduce((sum, [, b]) => sum + b.cap, 0);

  const nordCap = $derived(sideCap('nord'));
  const suedCap = $derived(sideCap('sued'));
  const ostCap = $derived(sideCap('ost'));
  const westCap = $derived(sideCap('west'));

  /*
   * Depth from capacity, log-scaled so the first expansion moves the wall and
   * the fiftieth still does: 300 seats ≈ 26px, 1.000 ≈ 32px, 20.000 ≈ 57px.
   */
  const depth = (cap: number) =>
    20 + Math.round((46 * Math.log10(1 + cap / 300)) / Math.log10(1 + 60000 / 300));

  const nordD = $derived(depth(nordCap));
  const suedD = $derived(depth(suedCap));
  const ostD = $derived(depth(ostCap));
  const westD = $derived(depth(westCap));

  /* The pitch: 68:105, portrait — the reason the whole figure is taller than
     it is wide, which is what was wrong with the square campus bowl. */
  const PW = 170;
  const PH = 262;
  const PAD = 16;
  const PLATE = 30;

  const W = $derived(PAD + westD + PW + ostD + PAD);
  const H = $derived(PAD + nordD + PH + suedD + PAD + PLATE);
  const px = $derived(PAD + westD);
  const py = $derived(PAD + nordD);

  const bowl = $derived({
    x: PAD, y: PAD,
    w: westD + PW + ostD,
    h: nordD + PH + suedD,
    r: Math.min(52, Math.min(nordD, suedD, ostD, westD) + 26)
  });

  const seats = $derived(capacity(stadium));
  /* The crowd pattern breathes with the mood: a well-run ground reads full. */
  const crowdOpacity = $derived(0.3 + Math.min(1.2, attendanceFactor(stadium)) * 0.45);

  const cranes = $derived.by(() => {
    const sides = new Set(affordable.map((id) => SIDE[id] ?? 'ost'));
    return {
      nord: sides.has('nord'), sued: sides.has('sued'),
      ost: sides.has('ost'), west: sides.has('west')
    };
  });

  const vipBoxes = $derived(Math.max(2, Math.min(8, Math.ceil((stadium.blocks.vipLogen?.cap ?? 0) / 10))));
  const masts = $derived([
    [bowl.x + 6, bowl.y + 6], [bowl.x + bowl.w - 6, bowl.y + 6],
    [bowl.x + 6, bowl.y + bowl.h - 6], [bowl.x + bowl.w - 6, bowl.y + bowl.h - 6]
  ] as const);

  /* Mowing stripes: pure charm, zero information, cheap to draw. */
  const stripes = $derived(Array.from({ length: 6 }, (_, i) => py + (PH / 6) * i));

  const fmt = (n: number) => n.toLocaleString('de-DE');
  const uid = `sb${Math.random().toString(36).slice(2, 8)}`;
</script>

<figure class="ground">
  <svg viewBox="0 0 {W} {H}" role="img"
       aria-label="Stadion mit {fmt(seats)} Plätzen: Nord {fmt(nordCap)}, Süd {fmt(suedCap)}, Ost {fmt(ostCap)}, West {fmt(westCap)}.">
    <defs>
      <pattern id="{uid}-crowd" width="5" height="5" patternUnits="userSpaceOnUse">
        <circle cx="1.4" cy="1.4" r="1" class="head" />
        <circle cx="3.9" cy="3.9" r="1" class="head alt" />
      </pattern>
    </defs>

    <!-- The bowl: concrete shell, then the crowd ring, then the pitch. -->
    <rect class="shell" class:roofed={stadium.dach}
          x={bowl.x} y={bowl.y} width={bowl.w} height={bowl.h} rx={bowl.r} />
    <rect class="crowd" x={bowl.x + 4} y={bowl.y + 4}
          width={bowl.w - 8} height={bowl.h - 8} rx={bowl.r - 4}
          fill="url(#{uid}-crowd)" opacity={crowdOpacity} />

    <!-- Apron and pitch. -->
    <rect class="apron" x={px - 7} y={py - 7} width={PW + 14} height={PH + 14} rx="8" />
    <rect class="pitch" x={px} y={py} width={PW} height={PH} rx="3" />
    {#each stripes as y, i (y)}
      {#if i % 2 === 0}
        <rect class="stripe" x={px} y={y} width={PW} height={PH / 6} />
      {/if}
    {/each}

    <!-- Markings: halfway line, circle, both boxes, both spots. -->
    <g class="mark">
      <line x1={px} y1={py + PH / 2} x2={px + PW} y2={py + PH / 2} />
      <circle cx={px + PW / 2} cy={py + PH / 2} r="24" />
      <circle class="spot" cx={px + PW / 2} cy={py + PH / 2} r="1.6" />
      <rect x={px + PW * 0.21} y={py} width={PW * 0.58} height="28" />
      <rect x={px + PW * 0.37} y={py} width={PW * 0.26} height="10" />
      <rect x={px + PW * 0.21} y={py + PH - 28} width={PW * 0.58} height="28" />
      <rect x={px + PW * 0.37} y={py + PH - 10} width={PW * 0.26} height="10" />
      <circle class="spot" cx={px + PW / 2} cy={py + 19} r="1.4" />
      <circle class="spot" cx={px + PW / 2} cy={py + PH - 19} r="1.4" />
    </g>

    <!-- Capacity per stand, printed in the stand it counts. -->
    <g class="cap">
      <text x={px + PW / 2} y={bowl.y + nordD / 2 + 6}>{fmt(nordCap)}</text>
      <text x={px + PW / 2} y={py + PH + suedD / 2 + 8}>{fmt(suedCap)}</text>
      <text x={bowl.x + westD / 2 + 2} y={py + PH / 2 + 3}>{fmt(westCap)}</text>
      <text x={px + PW + ostD / 2 - 2} y={py + PH / 2 + 3}>{fmt(ostCap)}</text>
    </g>

    <!-- The VIP boxes: a row of little windows on the main stand. -->
    {#if (stadium.blocks.vipLogen?.cap ?? 0) > 0}
      <g class="vip" aria-hidden="true">
        {#each Array.from({ length: vipBoxes }) as _, i (i)}
          <rect x={px - 13} y={py + PH / 2 - vipBoxes * 6 + i * 12} width="6" height="8" rx="1" />
        {/each}
      </g>
    {/if}

    <!-- Gäste: the fenced-off corner every German ground has. -->
    {#if (stadium.blocks.gaeste?.cap ?? 0) > 0}
      <g class="gaeste" aria-hidden="true">
        <line x1={px + PW + 2} y1={py + PH - 34} x2={px + PW + ostD - 4} y2={py + PH - 46} />
        <text x={px + PW + ostD / 2} y={py + PH - 14}>GÄSTE</text>
      </g>
    {/if}

    {#if stadium.videowalls}
      <g class="wall" aria-hidden="true">
        <rect x={px + PW - 30} y={py - 12} width="26" height="7" rx="1.5" />
        <rect x={px + 4} y={py + PH + 5} width="26" height="7" rx="1.5" />
      </g>
    {/if}

    {#if stadium.flutlicht}
      {#each masts as [cx, cy], i (i)}
        <g class="mast" aria-hidden="true">
          <circle {cx} {cy} r="7" class="glow" />
          <circle {cx} {cy} r="3" />
        </g>
      {/each}
    {/if}

    <!-- Where the club could build TODAY: a little crane on the stand whose
         next expansion the account covers. Decoration with a fact inside. -->
    {#each [
      { on: cranes.nord, x: px + PW / 2 + 52, y: bowl.y + nordD / 2 + 7 },
      { on: cranes.sued, x: px + PW / 2 + 52, y: py + PH + suedD / 2 + 9 },
      { on: cranes.west, x: bowl.x + westD / 2 + 2, y: py + PH / 2 - 30 },
      { on: cranes.ost, x: px + PW + ostD / 2 - 2, y: py + PH / 2 - 30 }
    ] as c, i (i)}
      {#if c.on}
        <text class="crane" x={c.x} y={c.y} aria-hidden="true">🏗️</text>
      {/if}
    {/each}

    <!-- The plate lives UNDER the bowl. On the campus map it sat across the
         pitch, which is why the pitch read as off-centre: it was not, the
         label was. -->
    <g class="plate">
      <text x={W / 2} y={H - 10}>{fmt(seats)} PLÄTZE · {Math.round(attendanceFactor(stadium) * 100)}% AUSLASTUNG</text>
    </g>
  </svg>
</figure>

<style>
  .ground { margin: 0; }
  /* Portrait and centred: the figure caps its own width so the bowl fills
     the middle of the screen instead of stretching flat across it. */
  svg { display: block; width: 100%; max-width: 360px; height: auto; margin: 0 auto; }

  .shell { fill: var(--iso-concrete); stroke: var(--border-strong); stroke-width: 2; }
  /* The roof reads as a brighter rim, the way a top-down photo shows one. */
  .shell.roofed { stroke: var(--accent); stroke-width: 5; }
  .head { fill: var(--text-muted); }
  .head.alt { fill: var(--text-dim); }

  .apron { fill: var(--iso-grass); }
  .pitch { fill: var(--iso-turf); }
  .stripe { fill: var(--text-main); opacity: 0.045; }
  .mark line, .mark rect, .mark circle { stroke: var(--iso-line); stroke-width: 1.4; fill: none; opacity: 0.6; }
  .mark .spot { fill: var(--iso-line); stroke: none; }

  .cap text {
    text-anchor: middle; font-size: 12px; font-weight: 800;
    font-variant-numeric: tabular-nums; fill: var(--text-main);
    paint-order: stroke; stroke: var(--iso-concrete); stroke-width: 3;
  }

  .vip rect { fill: var(--gold, #c9a227); opacity: 0.9; }
  .gaeste line { stroke: var(--iso-line); stroke-width: 1.2; stroke-dasharray: 3 2; opacity: 0.7; }
  .gaeste text { text-anchor: middle; font-size: 7.5px; font-weight: 800; letter-spacing: 0.08em; fill: var(--text-muted); }

  .wall rect { fill: var(--bg-body); stroke: var(--border-strong); stroke-width: 1; }
  .mast circle { fill: var(--iso-lit); }
  .mast .glow { opacity: 0.25; }

  .crane { font-size: 13px; text-anchor: middle; }

  .plate text {
    text-anchor: middle; font-size: 12px; font-weight: 800;
    letter-spacing: 0.06em; fill: var(--text-muted);
    font-variant-numeric: tabular-nums;
  }
</style>
