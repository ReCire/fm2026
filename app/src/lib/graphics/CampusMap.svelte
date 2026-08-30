<script lang="ts">
  import { SITE, BOWL, layout, type Placed } from './campus';
  import { categories } from '$lib/content/campus';
  import type { StadiumState } from '$lib/features/stadium/state';
  import { capacity } from '$lib/features/stadium/rules';

  let {
    stadium,
    /** Campus state: building id → built level. */
    levels = {},
    clubName = '',
    selected = null,
    onselect
  }: {
    stadium: StadiumState;
    levels?: Record<string, number>;
    clubName?: string;
    selected?: string | null;
    onselect?: (plotId: string) => void;
  } = $props();

  /*
   * A site plan, seen straight down. Not an isometric view.
   *
   * The isometric version was mine and it was wrong. Skewing the plan buys a
   * sense of volume and costs the two things this screen is for: a label on a
   * rotated card is unreadable at phone size, and a footprint drawn on the
   * diagonal is half the width it should be. A Klinik you cannot name is a grey
   * box, and a grey box is worse than a list.
   *
   * Flat and orthogonal, every building is a card that holds its own name, its
   * category and its level. It reads at 375px, which is the only size that
   * matters.
   */
  const TILE = 30;
  const W = SITE.w * TILE;
  const H = SITE.d * TILE;

  const placed = $derived(layout(levels));
  const seats = $derived(capacity(stadium));

  const accentOf = (categoryId: string) =>
    categories.find((c) => c.id === categoryId)?.accent ?? 'primary';

  const box = (p: Placed) => ({
    x: p.footprint.x * TILE,
    y: p.footprint.y * TILE,
    w: p.footprint.w * TILE,
    h: p.footprint.d * TILE
  });

  const bowl = { x: BOWL.x * TILE, y: BOWL.y * TILE, w: BOWL.w * TILE, h: BOWL.d * TILE };

  /*
   * The pitch shrinks inside the bowl as the stands grow.
   *
   * Capacity has to stay visible now that height is gone. A bigger ground means
   * deeper stands, so the playing surface takes proportionally LESS of the same
   * footprint — which is what actually happens to a ground when a tier goes on
   * top. Log-scaled, so the first expansion moves it rather than the fiftieth.
   */
  const standDepth = $derived(Math.min(46, 14 + Math.log10(Math.max(seats, 1000) / 1000) * 26));

  const HINT: Record<string, string> = { klein: 'KLEIN', mittel: 'MITTEL', gross: 'GROSS' };

  function label(p: Placed): { name: string; sub: string } {
    if (!p.building) return { name: '+ BAUEN', sub: HINT[p.plot.size] ?? '' };
    if (p.level < 0) return { name: '+ BAUEN', sub: `${HINT[p.plot.size]} — ${p.building.name}` };
    return { name: p.building.name.toUpperCase(), sub: `Stufe ${p.level + 1}` };
  }

  function aria(p: Placed): string {
    if (!p.building) return `Freies Grundstück, Größe ${p.plot.size}`;
    if (p.level < 0) return `${p.building.name}, Bauplatz frei, Größe ${p.plot.size}`;
    return `${p.building.name}, Ausbaustufe ${p.level + 1} von ${p.building.levels.length}`;
  }

  const summary = $derived.by(() => {
    const standing = placed.filter((p) => p.building && p.level >= 0).length;
    return `${clubName || 'Vereinsgelände'}: Stadion mit ${seats.toLocaleString('de-DE')} Plätzen, ${standing} Gebäude, ${placed.length - standing} freie Bauplätze.`;
  });

  /* Roads run in the gaps between the four bands — the plan's own structure. */
  const roads = [
    { x: 0, y: 6.6 * TILE, w: W, h: 5 },
    { x: 0, y: 17.4 * TILE, w: W, h: 5 },
    { x: 6.6 * TILE, y: 0, w: 5, h: H },
    { x: 17.4 * TILE, y: 0, w: 5, h: H }
  ];

  const cols = Array.from({ length: SITE.w / 2 }, (_, i) => i * 2 * TILE);
  const rowsY = Array.from({ length: SITE.d / 2 }, (_, i) => i * 2 * TILE);
  const masts = [[0, 0], [1, 0], [0, 1], [1, 1]] as const;
</script>

<figure class="campus">
  <div class="scroll">
    <svg viewBox="0 0 {W} {H}" width={W} height={H} role="img" aria-label={summary}>
      <rect x="0" y="0" width={W} height={H} fill="var(--iso-grass)" />

      <!-- Survey grid. Faint on purpose: it says "plan" without competing with
           anything that carries information. -->
      <g class="grid" aria-hidden="true">
        {#each cols as x (x)}<line x1={x} y1="0" x2={x} y2={H} />{/each}
        {#each rowsY as y (y)}<line x1="0" y1={y} x2={W} y2={y} />{/each}
      </g>

      {#each roads as r, i (i)}
        <rect class="road" x={r.x} y={r.y} width={r.w} height={r.h} />
      {/each}

      <g class="stadium">
        <rect x={bowl.x} y={bowl.y} width={bowl.w} height={bowl.h} rx="14" />
        <rect class="pitch"
          x={bowl.x + standDepth} y={bowl.y + standDepth}
          width={bowl.w - standDepth * 2} height={bowl.h - standDepth * 2} rx="3" />
        <line class="mark"
          x1={bowl.x + standDepth} y1={bowl.y + bowl.h / 2}
          x2={bowl.x + bowl.w - standDepth} y2={bowl.y + bowl.h / 2} />
        <circle class="mark" cx={bowl.x + bowl.w / 2} cy={bowl.y + bowl.h / 2} r="22" />
        {#if stadium.flutlicht}
          <!-- Four masts, only when the club owns floodlights. -->
          {#each masts as [cx, cy], i (i)}
            <circle class="mast"
              cx={bowl.x + 10 + cx * (bowl.w - 20)}
              cy={bowl.y + 10 + cy * (bowl.h - 20)} r="4" />
          {/each}
        {/if}
      </g>
      <g class="plate" aria-hidden="true">
        <rect x={bowl.x + 6} y={bowl.y + bowl.h - 30} width={bowl.w - 12} height="24" rx="4" />
        <text x={bowl.x + bowl.w / 2} y={bowl.y + bowl.h - 13}>
          HAUPTSTADION · {seats.toLocaleString('de-DE')}
        </text>
      </g>

      {#each placed as p (p.plot.id)}
        {@const r = box(p)}
        {@const l = label(p)}
        {@const b = p.level >= 0 ? p.building : null}
        <g
          class="plot {b ? accentOf(b.category) : 'empty'}"
          class:sel={selected === p.plot.id}
          role="button" tabindex="0" aria-label={aria(p)}
          onclick={() => onselect?.(p.plot.id)}
          onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onselect?.(p.plot.id))}
        >
          <rect x={r.x} y={r.y} width={r.w} height={r.h} rx="5" />
          <text class="name" x={r.x + 8} y={r.y + 17}>{l.name}</text>
          {#if p.plot.size !== 'klein' || p.level < 0}
            <text class="sub" x={r.x + 8} y={r.y + 29}>{l.sub}</text>
          {/if}
          {#if b && b.levels.length > 1}
            <!-- Level as marks, not "2/3". A count invites ranking; marks read
                 as a position on a ladder, which is what it is. -->
            <g class="pips" aria-hidden="true">
              {#each b.levels as _, i (i)}
                <rect class:lit={i <= p.level}
                  x={r.x + 8 + i * 9} y={r.y + r.h - 13} width="6" height="4" rx="1" />
              {/each}
            </g>
          {/if}
          {#if p.concealed}
            <!-- A concealed facility marks its host and is never named on the
                 plan. A Bunker with a sign on it is not a bunker. -->
            <circle class="secret" cx={r.x + r.w - 11} cy={r.y + 11} r="3.5" />
          {/if}
        </g>
      {/each}

      <g class="entrance" aria-hidden="true">
        <rect x={W / 2 - 66} y={H - 24} width="132" height="18" rx="3" />
        <text x={W / 2} y={H - 11}>HAUPTEINGANG</text>
      </g>

      <!-- Scale bar. A plan without one is a diagram. -->
      <g class="scale" aria-hidden="true">
        <line x1="12" y1={H - 14} x2={12 + 3 * TILE} y2={H - 14} />
        <line x1="12" y1={H - 18} x2="12" y2={H - 10} />
        <line x1={12 + 3 * TILE} y1={H - 18} x2={12 + 3 * TILE} y2={H - 10} />
        <text x="12" y={H - 21}>0 — 50 m</text>
      </g>
    </svg>
  </div>
</figure>

<style>
  .campus { margin: 0; background: var(--iso-sky); border-radius: var(--r-md); }
  .scroll { overflow: hidden; }
  /*
   * The whole plan, always, scaled to the width it is given.
   *
   * It used to render at its natural 720px and scroll sideways, which on a
   * phone meant a full screen of map before you reached anything and a pan to
   * see the far half. The plan is ORIENTATION — it answers "what does my club
   * look like" — and the list below it is what you actually buy from. An
   * overview that needs panning is neither.
   *
   * The trade is that a 2x2 plot lands near 29px on a phone, under the 44px
   * touch minimum. That is deliberate and it is why every plot also appears as
   * a full-width row in the list: the map is the convenient path, never the
   * only one.
   */
  svg { display: block; width: 100%; height: auto; }

  .grid line { stroke: var(--iso-line); stroke-width: 0.5; opacity: 0.07; }
  .road { fill: var(--iso-tarmac); opacity: 0.85; }

  .stadium rect { fill: var(--iso-concrete); stroke: var(--border-strong); stroke-width: 1.5; }
  .stadium .pitch { fill: var(--iso-turf); stroke: none; }
  .stadium .mark { stroke: var(--iso-line); stroke-width: 1.5; fill: none; opacity: 0.55; }
  .stadium .mast { fill: var(--iso-lit); stroke: none; opacity: 0.9; }

  .plate rect { fill: var(--bg-body); opacity: 0.82; }
  .plate text {
    text-anchor: middle; font-size: 11px; font-weight: 700;
    letter-spacing: .04em; fill: var(--text-main);
  }

  .plot { cursor: pointer; }
  .plot > rect { fill: var(--bg-card); stroke: var(--border-strong); stroke-width: 1.5; }
  .plot .name { font-size: 10.5px; font-weight: 800; letter-spacing: .02em; fill: var(--text-main); }
  .plot .sub { font-size: 8.5px; fill: var(--text-muted); letter-spacing: .04em; }
  .plot:focus-visible { outline: none; }
  .plot:focus-visible > rect, .plot:hover > rect { stroke-width: 2.5; }
  .plot.sel > rect { stroke: var(--text-main); stroke-width: 2.5; }

  /* An empty plot is an invitation, so it looks like one: dashed, quiet, and
     labelled with what would fit there. */
  .plot.empty > rect { fill: none; stroke: var(--primary-ink); stroke-dasharray: 5 5; opacity: .75; }
  .plot.empty .name { fill: var(--primary-ink); font-size: 10px; }
  .plot.empty .sub { fill: var(--text-dim); }

  /* Category tint on the card. The fill stays a wash so the label keeps a
     legible ground — a saturated card carrying type is the fill-as-ink mistake
     with extra steps. */
  .plot.primary  > rect { stroke: var(--primary);  fill: var(--primary-glow); }
  .plot.accent   > rect { stroke: var(--accent);   fill: var(--accent-glow); }
  .plot.industry > rect { stroke: var(--industry); fill: var(--accent-glow); }
  .plot.europe   > rect { stroke: var(--europe);   fill: var(--primary-glow); }
  .plot.danger   > rect { stroke: var(--danger);   fill: var(--accent-glow); }
  .plot.gold     > rect { stroke: var(--gold);     fill: var(--accent-glow); }

  .pips rect { fill: var(--border-strong); }
  .pips rect.lit { fill: var(--text-main); }
  .secret { fill: var(--purple-ink); }

  .entrance rect { fill: var(--accent); }
  .entrance text {
    text-anchor: middle; font-size: 9px; font-weight: 800;
    letter-spacing: .1em; fill: var(--on-fill);
  }

  .scale line { stroke: var(--text-dim); stroke-width: 1; }
  .scale text { font-size: 8px; fill: var(--text-dim); letter-spacing: .06em; }
</style>
