<script lang="ts">
  import type { KnowledgeNode, DoctrineShape } from '$lib/features/knowledge/content';

  let {
    nodes,
    owned,
    shape,
    /** Node ids that could be bought right now. */
    affordable = new Set<string>(),
    /** Node ids whose effects are not wired yet, so they are not for sale. */
    dormant = new Set<string>(),
    selected = null,
    onselect,
    priceOf
  }: {
    nodes: KnowledgeNode[];
    owned: ReadonlySet<string>;
    shape: DoctrineShape;
    affordable?: ReadonlySet<string>;
    dormant?: ReadonlySet<string>;
    selected?: string | null;
    onselect?: (id: string) => void;
    /** What a node costs, so the price sits on its face. */
    priceOf?: (node: KnowledgeNode) => { points: number; money: number };
  } = $props();

  /*
   * A tree, not a list.
   *
   * The list was accurate and told you nothing you would act on. What a player
   * needs from this screen is not "here are fourteen items" — it is "how far in
   * am I, what is the next thing, and what does it cost me to keep going". That
   * is a SHAPE question, and only a shape answers it: the rows are the tiers,
   * the lines are the prerequisites, and the gap between what you own and the
   * capstone is a distance you can see.
   *
   * The prototype had this and the port lost it, which is worth naming: the
   * tree was the first thing Eric described about the whole game.
   */
  const COL = 98;
  const ROW = 158;
  const R = 26;
  const PAD = { x: 54, top: 46, bottom: 34 };

  const tiers = $derived.by(() => {
    const byTier = new Map<number, KnowledgeNode[]>();
    for (const n of nodes) {
      const list = byTier.get(n.tier) ?? [];
      list.push(n);
      byTier.set(n.tier, list);
    }
    return [...byTier.entries()].sort((a, b) => a[0] - b[0]);
  });

  const widest = $derived(Math.max(...tiers.map(([, list]) => list.length), 1));
  const width = $derived(widest * COL + PAD.x * 2);
  const height = $derived(tiers.length * ROW + PAD.top + PAD.bottom);

  /** Centred rows, so the tree narrows toward the capstone like a real tree. */
  const positions = $derived.by(() => {
    const map = new Map<string, { x: number; y: number; tier: number }>();
    tiers.forEach(([tier, list], row) => {
      const offset = (widest - list.length) / 2;
      list.forEach((n, i) => {
        map.set(n.id, {
          x: PAD.x + (offset + i) * COL + COL / 2,
          y: PAD.top + row * ROW + R,
          tier
        });
      });
    });
    return map;
  });

  /** Prerequisite edges, drawn under the nodes. */
  const edges = $derived.by(() =>
    nodes.flatMap((n) =>
      n.req
        .map((r) => ({ from: positions.get(r), to: positions.get(n.id), lit: owned.has(r) }))
        .filter((e): e is { from: { x: number; y: number; tier: number }; to: { x: number; y: number; tier: number }; lit: boolean } => !!e.from && !!e.to)
    )
  );

  const state = (n: KnowledgeNode) =>
    owned.has(n.id) ? 'owned'
    : dormant.has(n.id) ? 'dormant'
    : affordable.has(n.id) ? 'open'
    : 'locked';

  /*
   * The doctrine's silhouette, not a circle with a colour.
   *
   * Eight doctrines told apart by hue alone would fail WCAG 1.4.1 and, worse,
   * would look like one tree painted eight ways. A Kurvenrepublik node is an
   * arch because a terrace is an arch; the shape is the doctrine's argument in
   * one mark.
   */
  function marker(s: DoctrineShape, cx: number, cy: number, r: number): string {
    const p = (a: number, rad = r) =>
      `${(cx + Math.cos(a) * rad).toFixed(1)},${(cy + Math.sin(a) * rad).toFixed(1)}`;
    const ngon = (sides: number, rot: number) =>
      Array.from({ length: sides }, (_, i) => p(rot + (i * 2 * Math.PI) / sides)).join(' ');
    switch (s) {
      case 'triangle-down': return `M${p(-Math.PI / 2 + Math.PI)} L${p(Math.PI / 6)} L${p((5 * Math.PI) / 6)} Z`;
      case 'triangle-up':   return `M${p(-Math.PI / 2)} L${p(Math.PI / 6)} L${p((5 * Math.PI) / 6)} Z`;
      case 'square':        return `M${ngon(4, Math.PI / 4).split(' ').join(' L')} Z`;
      case 'diamond':       return `M${ngon(4, -Math.PI / 2).split(' ').join(' L')} Z`;
      case 'hexagon':       return `M${ngon(6, -Math.PI / 2).split(' ').join(' L')} Z`;
      case 'arch':          return `M${cx - r},${cy + r} L${cx - r},${cy} A${r},${r} 0 0 1 ${cx + r},${cy} L${cx + r},${cy + r} Z`;
      case 'ring':
      case 'circle':
      default:              return `M${cx - r},${cy} a${r},${r} 0 1,0 ${r * 2},0 a${r},${r} 0 1,0 ${-r * 2},0`;
    }
  }

  const TIER_LABEL: Record<number, string> = {
    1: 'Grundlagen', 2: 'Aufbau', 3: 'Ausbau', 4: 'Elite', 5: 'Vermächtnis', 6: 'Synthese'
  };

  /*
   * Two lines, never three.
   *
   * Splitting on every word gave "Regionales / Scout / Netz" three lines deep,
   * which ran straight through the tier rule below it — the label of one row
   * colliding with the heading of the next, which reads as a broken layout
   * rather than a long name. Greedy packing into two balanced lines keeps every
   * node the same height, so the rows stay rows.
   */
  /** 25.000 → "25K". A price on a 90px-wide node has room for four characters. */
  const short = (money: number) =>
    money >= 1_000_000 ? `${Math.round(money / 100_000) / 10}M` : `${Math.round(money / 1000)}K`;

  function wrap(name: string): string[] {
    const words = name.split(/[\s-]+/);
    if (words.length <= 1) return words;
    let best = 1;
    let bestDiff = Infinity;
    for (let i = 1; i < words.length; i++) {
      const a = words.slice(0, i).join(' ').length;
      const b = words.slice(i).join(' ').length;
      if (Math.abs(a - b) < bestDiff) { bestDiff = Math.abs(a - b); best = i; }
    }
    return [words.slice(0, best).join(' '), words.slice(best).join(' ')];
  }
</script>

<div class="scroll">
  <svg viewBox="0 0 {width} {height}" width={width} height={height} role="presentation">
    <!-- Tier bands. The row IS the cost step, so labelling the row means each
         node does not have to repeat it. -->
    {#each tiers as [tier], row (tier)}
      <text class="tier" x="8" y={PAD.top + row * ROW - 16}>{TIER_LABEL[tier] ?? `Stufe ${tier}`}</text>
      <line
        class="rule"
        x1="8" x2={width - 8}
        y1={PAD.top + row * ROW - 10} y2={PAD.top + row * ROW - 10}
      />
    {/each}

    {#each edges as e, i (i)}
      <!-- Straight down, then across: an elbow reads as a dependency where a
           bezier reads as decoration, and at this density curves cross into an
           unreadable knot. -->
      <path
        class="edge" class:lit={e.lit}
        d="M{e.from.x},{e.from.y + R} V{e.from.y + R + (ROW - R * 2) / 2} H{e.to.x} V{e.to.y - R}"
      />
    {/each}

    {#each nodes as n (n.id)}
      {@const pos = positions.get(n.id)}
      {#if pos}
        {@const st = state(n)}
        {@const cost = priceOf?.(n)}
        <g
          class="node {st}" class:sel={selected === n.id}
          role="button" tabindex="0"
          aria-label="{n.name}, {TIER_LABEL[n.tier]}, {st === 'owned' ? 'freigeschaltet' : st === 'open' ? 'verfügbar' : st === 'dormant' ? 'noch nicht wirksam' : 'gesperrt'}"
          aria-pressed={selected === n.id}
          onclick={() => onselect?.(n.id)}
          onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onselect?.(n.id))}
        >
          <path class="mark" d={marker(shape, pos.x, pos.y, R)} />
          {#if shape === 'ring'}
            <circle class="hole" cx={pos.x} cy={pos.y} r={R * 0.45} />
          {/if}
          <!--
            The node's own icon, not its tier number.

            Every node in the catalogue carries one and the tree was rendering
            none of them — fourteen identical outlines with a digit inside,
            where the content had a brauner Umschlag, a Bolzplatz and a
            Rechenzentrum sitting unused. The tier is already the row.
          -->
          <text class="icon" x={pos.x} y={pos.y + 6}>{n.icon}</text>
          {#each wrap(n.name) as word, wi (wi)}
            <text class="label" x={pos.x} y={pos.y + R + 14 + wi * 11}>{word}</text>
          {/each}
          <!--
            The price on the face of the node.

            This is what turns a diagram into something you plan against: you
            can see the whole doctrine and what each step costs without opening
            anything. Owned nodes say so instead, in a word rather than a tick,
            because a tick and an empty space look alike at a glance.
          -->
          <text class="cost" x={pos.x} y={pos.y + R + 14 + wrap(n.name).length * 11 + 2}>
            {#if st === 'owned'}AKTIV
            {:else if st === 'dormant'}—
            {:else if cost}{cost.points} WP · {short(cost.money)}
            {/if}
          </text>
        </g>
      {/if}
    {/each}
  </svg>
</div>

<style>
  /* Horizontal scroll inside its own box — the page body must never scroll
     sideways, and a five-wide tier is wider than a phone. */
  .scroll { overflow-x: auto; overflow-y: hidden; -webkit-overflow-scrolling: touch; }
  svg { display: block; }

  .tier {
    font-size: 10px; font-weight: 700; letter-spacing: .1em;
    text-transform: uppercase; fill: var(--text-dim);
  }
  .rule { stroke: var(--border); stroke-width: 1; }

  .edge { fill: none; stroke: var(--border-strong); stroke-width: 2; opacity: .5; }
  .edge.lit { stroke: var(--doctrine-tint, var(--primary)); opacity: 1; }

  .node { cursor: pointer; }
  .node .mark {
    fill: var(--bg-sunken);
    stroke: var(--border-strong);
    stroke-width: 2;
  }
  .hole { fill: var(--bg-card); }
  .icon { text-anchor: middle; font-size: 19px; pointer-events: none; }
  .cost {
    text-anchor: middle; font-size: 9px; font-weight: 700;
    letter-spacing: .04em; fill: var(--text-dim); pointer-events: none;
  }
  .label {
    text-anchor: middle; font-size: 9.5px; font-weight: 600;
    fill: var(--text-muted); pointer-events: none;
  }

  /* Owned: filled in the doctrine's own colour. */
  .node.owned .mark { fill: var(--doctrine-tint, var(--primary)); stroke: var(--doctrine-tint, var(--primary)); }
  .node.owned .label { fill: var(--text-main); }
  .node.owned .cost { fill: var(--doctrine-tint, var(--primary)); }

  /* Open: outlined, not filled. The difference between "yours" and "you could
     have this" has to survive greyscale, so it is fill-versus-outline and not
     two shades of the same colour. */
  .node.open .mark { stroke: var(--doctrine-tint, var(--primary)); stroke-width: 2.5; }
  .node.open .label { fill: var(--text-main); }
  .node.open .cost { fill: var(--text-muted); }

  /* Dormant: dashed. Not greyed — grey reads as "locked, keep playing", and
     these are not locked, they are unfinished. The dash says "not yet a thing"
     without pretending the player did something wrong. */
  .node.dormant .mark { stroke-dasharray: 4 4; opacity: .6; }
  .node.dormant .icon, .node.dormant .label, .node.dormant .cost { opacity: .45; }

  .node.sel .mark { stroke: var(--text-main); stroke-width: 3; }
  .node:focus-visible { outline: none; }
  .node:focus-visible .mark { stroke: var(--text-main); stroke-width: 3; }

  @media (prefers-reduced-motion: no-preference) {
    .mark { transition: fill .18s ease, stroke .18s ease; }
  }
</style>
