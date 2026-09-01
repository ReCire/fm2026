import { PLOT_SIZES, buildings, buildingById, effectiveLevels, type Building, type PlotSize } from '$lib/content/campus';

/**
 * The site plan.
 *
 * Fixed rather than generated. A procedurally arranged campus would be
 * different every time the player looked at it, and the entire value of this
 * view is that it is a PLACE — you learn where the youth pitches are, and next
 * season you notice they have a building on them. A layout that shuffles is a
 * chart, not a ground.
 *
 * The stadium sits in the middle at 8×8. Everything else is arranged in four
 * bands around it with one-tile gaps for the roads, which is also how real
 * grounds are laid out: the car park is between the stand and the road because
 * that is where the space was.
 */
/** A rectangle on the site grid, in tiles. */
export interface Footprint {
  x: number;
  y: number;
  w: number;
  d: number;
}

export const SITE = { w: 24, d: 24 } as const;
/*
 * Portrait, matching the stadium screen's own bowl. The plan and the stadium
 * page describe the same building, and for a while they disagreed about its
 * shape — landscape here, portrait there — which reads as two different
 * grounds. 7×10 keeps the bowl inside the ring roads (they run at 6.6 and
 * 17.4 on both axes) and gives the pitch the same upright 68:105 the stadium
 * screen draws.
 */
export const BOWL: Footprint = { x: 8.5, y: 7, w: 7, d: 10 };

export interface Plot {
  id: string;
  size: PlotSize;
  x: number;
  y: number;
  /** Which side of the ground it sits on. Used for the label anchor. */
  band: 'west' | 'north' | 'east' | 'south';
}

const plot = (id: string, size: PlotSize, x: number, y: number, band: Plot['band']): Plot => ({
  id, size, x, y, band
});

export const plots: Plot[] = [
  // West band — the training side. Traditionally the cheap end of a ground.
  plot('w1', 'gross', 1, 1, 'west'),
  plot('w2', 'mittel', 1, 6, 'west'),
  plot('w3', 'mittel', 1, 10, 'west'),
  plot('w4', 'klein', 1, 14, 'west'),
  plot('w5', 'klein', 4, 14, 'west'),

  // North band — what the road sees first, so it is where the money goes.
  plot('n1', 'mittel', 6, 1, 'north'),
  plot('n2', 'gross', 10, 1, 'north'),
  plot('n3', 'mittel', 15, 1, 'north'),
  plot('n4', 'klein', 19, 1, 'north'),
  plot('n5', 'klein', 19, 4, 'north'),

  // East band — service and medical, close to the players' entrance.
  plot('e1', 'mittel', 18, 7, 'east'),
  plot('e2', 'gross', 18, 11, 'east'),
  plot('e3', 'klein', 18, 16, 'east'),
  plot('e4', 'klein', 21, 16, 'east'),

  // South band — the fans' side: turnstiles, shop, the Vereinsheim.
  plot('s1', 'klein', 1, 18, 'south'),
  plot('s2', 'mittel', 4, 18, 'south'),
  plot('s3', 'gross', 8, 18, 'south'),
  plot('s4', 'mittel', 13, 18, 'south'),
  plot('s5', 'klein', 17, 20, 'south')
];

export const plotById: ReadonlyMap<string, Plot> = new Map(plots.map((p) => [p.id, p]));

export function footprintOf(p: Plot): Footprint {
  const { w, d } = PLOT_SIZES[p.size];
  return { x: p.x, y: p.y, w, d };
}

/**
 * Which building stands on which plot.
 *
 * Written down rather than assigned at runtime, for the same reason the plan
 * is fixed: the Vereinsheim is by the south turnstiles every season, and that
 * is what makes noticing it has grown possible at all.
 *
 * A plot with no assignment is genuinely empty ground and renders as such —
 * fenced gravel with a `+ BAUEN` marker, which is the invitation.
 */
export const ASSIGNMENT: Record<string, string> = {
  // West: everything you do between Saturdays.
  w1: 'jugendplatz',
  w2: 'trainingsplatz',
  w3: 'sportwissenschaft',
  w4: 'kraftraum',
  w5: 'ernaehrung',

  // North: the show side.
  n1: 'scouting',
  n2: 'datenzentrum',
  n3: 'mini_arena',
  n4: 'taktikraum',
  n5: 'videoanalyse',

  // East: medical.
  e1: 'reha',
  e2: 'klinik',
  e3: 'physio',
  e4: 'hydro',

  // South: the public.
  s1: 'vereinsheim',
  s2: 'fanzone',
  s3: 'merchfabrik',
  s4: 'wohnheim',
  s5: 'museum'
};

/*
 * Four buildings have no plot: hoehenkammer, hackerlab, privatklinik,
 * tresorraum, bunker. Three of those are Geheimnisse, and that is deliberate —
 * a secret facility that occupies a labelled plot on the site plan is not a
 * secret. They attach to a host building when built (the bunker under the south
 * stand, the vault under the main stand) and are drawn as a mark on the host
 * rather than as a structure of their own.
 */
export const HIDDEN_HOSTS: Record<string, string> = {
  bunker: 's3',
  tresorraum: 's1',
  privatklinik: 'e2',
  hackerlab: 'n2',
  hoehenkammer: 'w3'
};

export interface Placed {
  plot: Plot;
  footprint: Footprint;
  building: Building | null;
  /** −1 when the plot is empty ground, otherwise the built level. */
  level: number;
  /** A secret facility hidden inside this plot's building. */
  concealed: Building | null;
}

/**
 * The campus as it currently stands.
 *
 * `levels` is the campus module's state when it exists. Until then this
 * renders every founding building at level 0 and everything else as empty
 * ground — which is exactly what a fourth-division club looks like, so the
 * placeholder and the real thing agree on the only case that ships today.
 */
export function layout(stored: Record<string, number> = {}): Placed[] {
  // One rule for "what level is this", shared with the catalogue. See
  // `effectiveLevels` — the map and the price list disagreeing about whether
  // the club owns its own changing rooms was exactly this function guessing.
  const levels = effectiveLevels(stored);
  const concealedByHost = new Map<string, Building>();
  for (const [buildingId, plotId] of Object.entries(HIDDEN_HOSTS)) {
    if ((levels[buildingId] ?? -1) >= 0) {
      const b = buildingById.get(buildingId);
      if (b) concealedByHost.set(plotId, b);
    }
  }

  return plots.map((p) => {
    const building = buildingById.get(ASSIGNMENT[p.id] ?? '') ?? null;
    const level = building ? (levels[building.id] ?? -1) : -1;
    return {
      plot: p,
      footprint: footprintOf(p),
      building,
      level,
      concealed: concealedByHost.get(p.id) ?? null
    };
  });
}

/** Height for a placed building, or 0 for empty ground. */
export function heightOf(placed: Placed): number {
  if (!placed.building || placed.level < 0) return 0;
  const hs = placed.building.heights;
  return hs[Math.min(placed.level, hs.length - 1)] ?? 0;
}

/**
 * How developed the ground is, 0..1.
 *
 * Counts levels actually standing against every level that could stand. Used
 * for the one line of text under the map, because a player looking at their own
 * campus can see that it is sparse but cannot see how sparse — and "9 von 54
 * Ausbaustufen" is the sentence that turns a picture into a target.
 */
export function development(stored: Record<string, number> = {}): { built: number; possible: number } {
  const levels = effectiveLevels(stored);
  let built = 0;
  let possible = 0;
  for (const b of buildings) {
    possible += b.costs.length;
    built += Math.max(0, (levels[b.id] ?? -1) + 1);
  }
  return { built, possible };
}
