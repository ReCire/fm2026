import type { Column } from '$lib/ui';
import type { Player } from './state';
import { strengthOf, isAvailable } from './rules';
import { ATTRIBUTE_LABEL, ATTRIBUTES, type Attribute } from './attributes';

/**
 * How a player reads in a table, defined once.
 *
 * Every screen that lists players was building its own columns, so the same
 * man was a name and a wage on one screen, a name and a strength on another,
 * and a name and an age in the academy. The player then cannot answer the
 * question they actually have — "is this one worth keeping?" — without opening
 * three screens and holding two of them in their head.
 *
 * These are the facts that decide that question, in the order they decide it:
 * how good, what shape, how old, how happy. A screen adds its OWN columns on
 * top (a contract length, a renewal button, a graduation date); it should not
 * be re-deciding what a player looks like.
 */

/** Fitness, morale and availability as one short, scannable string. */
export function conditionOf(p: Player): string {
  if (p.injured > 0) return `verletzt (${p.injured})`;
  if (p.suspended > 0) return `gesperrt (${p.suspended})`;
  return `${p.fitness}%`;
}

/**
 * A sort key that puts the unavailable last regardless of direction.
 *
 * Sorting by raw fitness floats an injured player with 100% fitness to the top
 * of a list you are reading to pick an eleven, which is the opposite of useful.
 */
export function conditionRank(p: Player): number {
  if (p.injured > 0) return -1000 + p.injured;
  if (p.suspended > 0) return -500 + p.suspended;
  return p.fitness;
}

/** The player's strongest facet, named. What makes him HIM. */
export function standoutOf(p: Player): Attribute {
  return ATTRIBUTES.reduce((best, a) => (p.attributes[a] > p.attributes[best] ? a : best));
}

export const playerColumns: Column[] = [
  {
    key: 'name', label: 'Name', role: 'primary',
    sort: (p) => (p as Player).name
  },
  {
    key: 'pos', label: 'Pos', role: 'primary',
    sort: (p) => (p as Player).pos
  },
  {
    key: 'strength', label: 'Stärke', role: 'primary', numeric: true,
    sort: (p) => strengthOf(p as Player)
  },
  {
    key: 'condition', label: 'Zustand', role: 'secondary',
    sort: (p) => conditionRank(p as Player)
  },
  {
    key: 'age', label: 'Alter', role: 'secondary', numeric: true,
    // Youngest first: in a list of players, age is a question about the future.
    firstClick: 'asc',
    sort: (p) => (p as Player).age
  },
  {
    key: 'morale', label: 'Moral', role: 'detail', numeric: true,
    sort: (p) => (p as Player).morale
  },
  {
    key: 'standout', label: 'Stärkste Eigenschaft', role: 'detail',
    sort: (p) => ATTRIBUTE_LABEL[standoutOf(p as Player)]
  },
  {
    key: 'trait', label: 'Talent', role: 'detail',
    sort: (p) => (p as Player).trait
  }
];

/** The rendered value for a shared column. Screens render their own keys. */
export function playerCell(p: Player, key: string): string {
  switch (key) {
    case 'name': return p.name;
    case 'pos': return p.pos;
    case 'strength': return String(strengthOf(p));
    case 'condition': return conditionOf(p);
    case 'age': return `${p.age}`;
    case 'morale': return `${p.morale}`;
    case 'standout': return `${ATTRIBUTE_LABEL[standoutOf(p)]} ${p.attributes[standoutOf(p)]}`;
    case 'trait': return p.trait;
    default: return '';
  }
}

export { strengthOf, isAvailable };
