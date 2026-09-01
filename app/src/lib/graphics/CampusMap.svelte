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

  /*
   * The same pitch the stadium screen draws: upright, 68:105. The plan and
   * the stadium page describe one building; the stands set the width and the
   * ratio sets the height, so both views shrink the surface the same way as
   * the ground grows.
   */
  const pitch = $derived.by(() => {
    const w = bowl.w - standDepth * 2;
    const h = Math.min(bowl.h - 48, w / (68 / 105));
    return { x: bowl.x + (bowl.w - w) / 2, y: bowl.y + (bowl.h - h) / 2, w, h };
  });

  /* Unique per instance, so two maps on one page cannot share clip rects. */
  const uid = `cm${Math.random().toString(36).slice(2, 8)}`;

  /*
   * The NAME leads, always.
   *
   * Every unbuilt plot used to open with "+ BAUEN" and bury what could stand
   * there in a truncated subtitle — nineteen plots all titled the same way,
   * which is why "which box is what" had no answer. Now the building names
   * the card whether it exists yet or not, and "+ Bauen" is the status line.
   */
  function label(p: Placed): { name: string; sub: string } {
    if (!p.building) return { name: 'FREI', sub: 'Grundstück' };
    if (p.level < 0) return { name: p.building.name.toUpperCase(), sub: '+ Bauen' };
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

      <!-- The bowl, in the stadium screen's own language: concrete shell,
           crowd ring, upright pitch with real markings. Two views, one
           building. -->
      <defs>
        <pattern id="{uid}-crowd" width="5" height="5" patternUnits="userSpaceOnUse">
          <circle class="head" cx="1.4" cy="1.4" r="1" />
          <circle class="head alt" cx="3.9" cy="3.9" r="1" />
        </pattern>
      </defs>
      <g class="stadium">
        <rect class="shell" x={bowl.x} y={bowl.y} width={bowl.w} height={bowl.h} rx="26" />
        <rect class="crowd" x={bowl.x + 3} y={bowl.y + 3}
          width={bowl.w - 6} height={bowl.h - 6} rx="23"
          fill="url(#{uid}-crowd)" />
        <rect class="apron"
          x={pitch.x - 5} y={pitch.y - 5} width={pitch.w + 10} height={pitch.h + 10} rx="6" />
        <rect class="pitch" x={pitch.x} y={pitch.y} width={pitch.w} height={pitch.h} rx="3" />
        <line class="mark"
          x1={pitch.x} y1={pitch.y + pitch.h / 2}
          x2={pitch.x + pitch.w} y2={pitch.y + pitch.h / 2} />
        <circle class="mark" cx={pitch.x + pitch.w / 2} cy={pitch.y + pitch.h / 2} r={pitch.w * 0.14} />
        <rect class="mark" x={pitch.x + pitch.w * 0.21} y={pitch.y}
          width={pitch.w * 0.58} height={pitch.h * 0.1} />
        <rect class="mark" x={pitch.x + pitch.w * 0.21} y={pitch.y + pitch.h * 0.9}
          width={pitch.w * 0.58} height={pitch.h * 0.1} />
        {#if stadium.flutlicht}
          <!-- Four masts, only when the club owns floodlights. -->
          {#each masts as [cx, cy], i (i)}
            <circle class="mast"
              cx={bowl.x + 10 + cx * (bowl.w - 20)}
              cy={bowl.y + 10 + cy * (bowl.h - 20)} r="4" />
          {/each}
        {/if}
      </g>
      <!-- The plate sits UNDER the bowl, on the grass. Across the bottom of
           the bowl it covered the pitch's lower edge, which made the pitch
           read as off-centre — the pitch was fine, the label was on it. -->
      <g class="plate" aria-hidden="true">
        <rect x={bowl.x + bowl.w / 2 - 78} y={bowl.y + bowl.h + 6} width="156" height="22" rx="4" />
        <text x={bowl.x + bowl.w / 2} y={bowl.y + bowl.h + 21}>
          HAUPTSTADION · {seats.toLocaleString('de-DE')}
        </text>
      </g>

      {#each placed as p (p.plot.id)}
        {@const r = box(p)}
        {@const l = label(p)}
        {@const b = p.level >= 0 ? p.building : null}
        <g
          class="plot {p.building ? accentOf(p.building.category) : ''} {p.level >= 0 ? 'built' : 'empty'}"
          class:klein={p.plot.size === 'klein'}
          class:sel={selected === p.plot.id}
          role="button" tabindex="0" aria-label={aria(p)}
          onclick={() => onselect?.(p.plot.id)}
          onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onselect?.(p.plot.id))}
        >
          <!-- Labels are clipped to their own card. A name that runs onto the
               neighbouring plot reads as belonging to it, which is worse than
               a truncated name — the full text lives in the aria-label and in
               the list below the map either way. -->
          <clipPath id="{uid}-{p.plot.id}">
            <rect x={r.x + 2} y={r.y + 2} width={r.w - 4} height={r.h - 4} rx="4" />
          </clipPath>
          <rect x={r.x} y={r.y} width={r.w} height={r.h} rx="5" />
          <g clip-path="url(#{uid}-{p.plot.id})">
            <text class="name" x={r.x + 8} y={r.y + 19}>{l.name}</text>
            {#if p.plot.size !== 'klein' || p.level < 0}
              <text class="sub" x={r.x + 8} y={r.y + 33}>{l.sub}</text>
            {/if}
          </g>
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

  .stadium .shell { fill: var(--iso-concrete); stroke: var(--border-strong); stroke-width: 1.5; }
  /* No `fill` here: the element carries the crowd pattern as an attribute,
     and a CSS fill — even an inherited one — would paint over it. */
  .stadium .crowd { stroke: none; opacity: 0.5; }
  .head { fill: var(--text-muted); }
  .head.alt { fill: var(--text-dim); }
  .stadium .apron { fill: var(--iso-grass); stroke: none; }
  .stadium .pitch { fill: var(--iso-turf); stroke: none; }
  .stadium .mark { stroke: var(--iso-line); stroke-width: 1.5; fill: none; opacity: 0.55; }
  .stadium .mast { fill: var(--iso-lit); stroke: none; opacity: 0.9; }

  .plate rect { fill: var(--bg-body); opacity: 0.82; }
  .plate text {
    text-anchor: middle; font-size: 13px; font-weight: 700;
    letter-spacing: .04em; fill: var(--text-main);
  }

  /*
   * Label sizes are set for the width the map actually renders at: the SVG's
   * natural 720px scales to ~375px on a phone, so every font here lands at
   * about half its nominal size. 14px nominal is ~7.3px on screen — the floor
   * of legible. The old 10.5px was ~5.5px, which is decoration, not a label.
   */
  .plot { cursor: pointer; }
  .plot > rect { fill: var(--bg-card); stroke: var(--border-strong); stroke-width: 1.5; }
  .plot .name { font-size: 14px; font-weight: 800; letter-spacing: .02em; fill: var(--text-main); }
  .plot .sub { font-size: 11px; fill: var(--text-muted); letter-spacing: .03em; }
  /* The small cards cannot carry 14px without clipping half the word away. */
  .plot.klein .name { font-size: 11.5px; }
  /*
   * :focus AND :focus-visible. With only the latter, a tap left the browser's
   * own focus ring on the <g> — a blue box drawn OUTSIDE the plot's rect,
   * which read as a selection bigger than the thing selected. The selection
   * state below is the visible answer; the UA ring is never it.
   */
  .plot:focus, .plot:focus-visible { outline: none; }
  .plot:focus-visible > rect, .plot:hover > rect { stroke-width: 2.5; }
  .plot.sel > rect { stroke: var(--text-main); stroke-width: 2.5; stroke-dasharray: none; }

  /*
   * An unbuilt plot is an invitation, so it looks like one: dashed and quiet
   * — but dashed IN ITS DISTRICT'S COLOUR, because "which box is what" has to
   * be answerable before anything stands there. The category classes below
   * set the stroke for built and unbuilt alike; `empty` only removes the fill
   * and dashes the line.
   */
  .plot.empty > rect { fill: none; stroke-dasharray: 5 5; opacity: .8; }
  .plot.empty .name { fill: var(--text-muted); font-size: 12px; }
  .plot.empty.klein .name { font-size: 10.5px; }
  .plot.empty .sub { fill: var(--primary-ink); font-weight: 700; }

  /* Category tint on the card. The fill stays a wash so the label keeps a
     legible ground — a saturated card carrying type is the fill-as-ink mistake
     with extra steps. */
  .plot.primary  > rect { stroke: var(--primary); }
  .plot.accent   > rect { stroke: var(--accent); }
  .plot.industry > rect { stroke: var(--industry); }
  .plot.europe   > rect { stroke: var(--europe); }
  .plot.danger   > rect { stroke: var(--danger); }
  .plot.gold     > rect { stroke: var(--gold); }
  .plot.built.primary  > rect { fill: var(--primary-glow); }
  .plot.built.accent   > rect { fill: var(--accent-glow); }
  .plot.built.industry > rect { fill: var(--accent-glow); }
  .plot.built.europe   > rect { fill: var(--primary-glow); }
  .plot.built.danger   > rect { fill: var(--accent-glow); }
  .plot.built.gold     > rect { fill: var(--accent-glow); }

  .pips rect { fill: var(--border-strong); }
  .pips rect.lit { fill: var(--text-main); }
  .secret { fill: var(--purple-ink); }

  .entrance rect { fill: var(--accent); }
  .entrance text {
    text-anchor: middle; font-size: 10.5px; font-weight: 800;
    letter-spacing: .1em; fill: var(--on-fill);
  }

  .scale line { stroke: var(--text-dim); stroke-width: 1; }
  .scale text { font-size: 9px; fill: var(--text-dim); letter-spacing: .06em; }
</style>
