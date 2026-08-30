/**
 * Isometric projection, generated rather than drawn.
 *
 * Same bet as the crests and the portraits: no binary assets. A drawn sprite
 * sheet would look better on day one and would then show a ground the club
 * does not own — the whole point of this view is that the stands are as tall as
 * your stands, and the plots are empty because yours are.
 *
 * Standard 2:1 dimetric, the Age-of-Empires/C&C projection: one grid step is
 * 64px across and 32px down, so tiles read as squares seen from about 30°.
 *
 *      screen_x = (x − y) · tile.w / 2
 *      screen_y = (x + y) · tile.h / 2 − z · LIFT
 *
 * +x runs to the lower right, +y to the lower left, +z straight up. The near
 * corner of any footprint is therefore the one with the largest x + y, which is
 * what the painter's-algorithm sort at the bottom of this file depends on.
 */

export const TILE = { w: 64, h: 32 } as const;

/** Screen pixels per unit of height. Chosen so a 4-unit block reads as tall. */
export const LIFT = 18;

export type Point = readonly [number, number];

export function project(x: number, y: number, z = 0): Point {
  return [((x - y) * TILE.w) / 2, ((x + y) * TILE.h) / 2 - z * LIFT];
}

const poly = (points: Point[]) => points.map(([x, y]) => `${round(x)},${round(y)}`).join(' ');
const round = (n: number) => Math.round(n * 100) / 100;

/**
 * Face brightness, applied as a flat overlay rather than as three colours.
 *
 * Isometric art has one albedo per material and three light levels; giving a
 * roof its own token separately from its own wall is how a building ends up
 * lit by two different suns. `top` is the reference at 1 — the others are
 * multipliers a caller turns into an overlay alpha.
 */
export const FACE = { top: 1, right: 0.78, left: 0.56 } as const;
export type Face = keyof typeof FACE;

/** The darkening overlay for a face, as an alpha on black. */
export function shade(face: Face): number {
  return 1 - FACE[face];
}

export interface Footprint {
  /** Grid position of the far corner. */
  x: number;
  y: number;
  /** Size in tiles. */
  w: number;
  d: number;
}

export interface Solid extends Footprint {
  /** Height in LIFT units. Zero renders as a flat pad. */
  h: number;
}

/** The lid. Also the whole shape when `h` is 0 — a pitch, a car park, a pad. */
export function topFace({ x, y, w, d, h }: Solid): string {
  return poly([
    project(x, y, h),
    project(x + w, y, h),
    project(x + w, y + d, h),
    project(x, y + d, h)
  ]);
}

/** The wall facing lower-right. */
export function rightFace({ x, y, w, d, h }: Solid): string {
  return poly([
    project(x + w, y, h),
    project(x + w, y + d, h),
    project(x + w, y + d, 0),
    project(x + w, y, 0)
  ]);
}

/** The wall facing lower-left. */
export function leftFace({ x, y, w, d, h }: Solid): string {
  return poly([
    project(x, y + d, h),
    project(x + w, y + d, h),
    project(x + w, y + d, 0),
    project(x, y + d, 0)
  ]);
}

/**
 * A pitched roof: one ridge running along the longer axis.
 *
 * Kept for the small buildings, because a flat-topped box at tier 0 and a
 * flat-topped box at tier 4 differ only in size, and "bigger box" is not a
 * story. A clubhouse with a gable and a data centre with a flat deck are
 * different KINDS of building at a glance.
 */
export function gable(solid: Solid, rise: number): { left: string; right: string } {
  const { x, y, w, d, h } = solid;
  const peak = h + rise;
  const alongX = w >= d;
  if (alongX) {
    const midY = y + d / 2;
    return {
      right: poly([
        project(x, midY, peak),
        project(x + w, midY, peak),
        project(x + w, y, h),
        project(x, y, h)
      ]),
      left: poly([
        project(x, midY, peak),
        project(x + w, midY, peak),
        project(x + w, y + d, h),
        project(x, y + d, h)
      ])
    };
  }
  const midX = x + w / 2;
  return {
    right: poly([
      project(midX, y, peak),
      project(midX, y + d, peak),
      project(x + w, y + d, h),
      project(x + w, y, h)
    ]),
    left: poly([
      project(midX, y, peak),
      project(midX, y + d, peak),
      project(x, y + d, h),
      project(x, y, h)
    ])
  };
}

/**
 * A stand: a wedge that rises away from the pitch.
 *
 * `side` names which edge of the bowl it sits on, and the rake always climbs
 * outward — a terrace whose high side faced the pitch would block the thing
 * the crowd is there to watch, and it reads instantly as wrong even to someone
 * who could not say why.
 */
export type Side = 'north' | 'south' | 'east' | 'west';

export function stand(
  { x, y, w, d }: Footprint,
  side: Side,
  front: number,
  back: number
): { top: string; outer: string; inner: string; flank: string } {
  // Which edge is the pitch on? The rake climbs away from it.
  const nearIsPitch = side === 'north' || side === 'west';
  const along = side === 'north' || side === 'south';

  let a: Point, b: Point, c: Point, e: Point;
  if (along) {
    const pitchY = nearIsPitch ? y + d : y;
    const outerY = nearIsPitch ? y : y + d;
    a = project(x, pitchY, front);
    b = project(x + w, pitchY, front);
    c = project(x + w, outerY, back);
    e = project(x, outerY, back);
  } else {
    const pitchX = nearIsPitch ? x + w : x;
    const outerX = nearIsPitch ? x : x + w;
    a = project(pitchX, y, front);
    b = project(pitchX, y + d, front);
    c = project(outerX, y + d, back);
    e = project(outerX, y, back);
  }

  // The outer wall, from the raked edge down to the ground.
  const outerPts: Point[] = along
    ? (() => {
        const outerY = nearIsPitch ? y : y + d;
        return [
          project(x, outerY, back),
          project(x + w, outerY, back),
          project(x + w, outerY, 0),
          project(x, outerY, 0)
        ];
      })()
    : (() => {
        const outerX = nearIsPitch ? x : x + w;
        return [
          project(outerX, y, back),
          project(outerX, y + d, back),
          project(outerX, y + d, 0),
          project(outerX, y, 0)
        ];
      })();

  /*
   * The wall facing the pitch.
   *
   * Without it the near stands disappear. A stand rakes away from the pitch,
   * so the south and east ones rise TOWARD the camera — at 2.8 units over
   * three tiles their top plane is almost exactly edge-on in this projection
   * and collapses to a line. The far stands looked like a stadium and the near
   * ones looked like nothing, which read as a bug in the drawing rather than
   * as a bowl. The inner wall is the face you actually see from here, and it
   * is also the honest one: it is the wall the crowd sits above.
   */
  const innerPts: Point[] = along
    ? (() => {
        const pitchY = nearIsPitch ? y + d : y;
        return [
          project(x, pitchY, front),
          project(x + w, pitchY, front),
          project(x + w, pitchY, 0),
          project(x, pitchY, 0)
        ];
      })()
    : (() => {
        const pitchX = nearIsPitch ? x + w : x;
        return [
          project(pitchX, y, front),
          project(pitchX, y + d, front),
          project(pitchX, y + d, 0),
          project(pitchX, y, 0)
        ];
      })();

  /* The raked face seen from outside the bowl, from the top edge to the ground. */
  const flankPts: Point[] = along
    ? (() => {
        const pitchY = nearIsPitch ? y + d : y;
        const outerY = nearIsPitch ? y : y + d;
        const nearX = x + w;
        return [
          project(nearX, pitchY, front),
          project(nearX, outerY, back),
          project(nearX, outerY, 0),
          project(nearX, pitchY, 0)
        ];
      })()
    : (() => {
        const pitchX = nearIsPitch ? x + w : x;
        const outerX = nearIsPitch ? x : x + w;
        const nearY = y + d;
        return [
          project(pitchX, nearY, front),
          project(outerX, nearY, back),
          project(outerX, nearY, 0),
          project(pitchX, nearY, 0)
        ];
      })();

  return {
    top: poly([a, b, c, e]),
    outer: poly(outerPts),
    inner: poly(innerPts),
    flank: poly(flankPts)
  };
}

/** A vertical line, for floodlight masts and flagpoles. */
export function mast(x: number, y: number, height: number): { x1: number; y1: number; x2: number; y2: number } {
  const [bx, by] = project(x, y, 0);
  const [tx, ty] = project(x, y, height);
  return { x1: round(bx), y1: round(by), x2: round(tx), y2: round(ty) };
}

/**
 * Painter's algorithm.
 *
 * Nothing here does depth testing, so the only thing keeping a building from
 * being drawn through the stand in front of it is the order. Sorting by the
 * near corner works while footprints do not interlock, which the plot grid
 * guarantees by construction — every building sits inside its own plot.
 */
export function byDepth<T extends { footprint: Footprint }>(items: T[]): T[] {
  return [...items].sort((p, q) => {
    const a = p.footprint;
    const b = q.footprint;
    return a.x + a.d + a.y + a.w - (b.x + b.d + b.y + b.w);
  });
}

/** The bounding box of a set of footprints, in screen pixels, with padding. */
export function viewBoxFor(footprints: Footprint[], pad = 40, headroom = 120): string {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const f of footprints) {
    for (const [gx, gy] of [
      [f.x, f.y],
      [f.x + f.w, f.y],
      [f.x + f.w, f.y + f.d],
      [f.x, f.y + f.d]
    ] as const) {
      const [sx, sy] = project(gx, gy, 0);
      minX = Math.min(minX, sx);
      maxX = Math.max(maxX, sx);
      minY = Math.min(minY, sy);
      maxY = Math.max(maxY, sy);
    }
  }
  // Headroom above, because buildings grow upward out of their footprint and
  // the tallest thing on the ground is the one you most want to see.
  return [
    round(minX - pad),
    round(minY - headroom),
    round(maxX - minX + pad * 2),
    round(maxY - minY + headroom + pad)
  ].join(' ');
}
