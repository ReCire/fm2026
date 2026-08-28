import type { Rng } from '$lib/engine/rng';
import type { Position } from './positions';
import type { Player, SquadState } from './state';
import { squadContent } from './content';
import { overallFor, uniform, type Attributes } from './attributes';

/**
 * Squad rules. Pure functions over plain data, RNG always injected.
 *
 * Everything the prototype did with a bare `Math.random()` now takes an `rng`
 * argument, which is what makes a season reproducible from its seed.
 */

/**
 * A player's overall rating in the position they actually play.
 *
 * Derived rather than stored so the five attributes are the single source of
 * truth. Everything that used to read `p.strength` reads this instead, which
 * means the editor changes one thing and the whole game follows.
 */
export function strengthOf(p: { attributes: Attributes; pos: Position }): number {
  return overallFor(p.attributes, p.pos);
}

/** Market value from strength, via the piecewise curve in content.ts. */
export function marketValue(strength: number): number {
  let value = 0;
  for (const band of squadContent.valueCurve) {
    if (strength > band.fromStrength) {
      value += (strength - band.fromStrength) * band.perPoint;
    }
  }
  return Math.round(value);
}

/** Wage per matchday. First band whose ceiling the player is at or under wins. */
export function wage(strength: number, value = marketValue(strength)): number {
  const band =
    squadContent.wageBands.find((b) => strength <= b.upToStrength) ??
    squadContent.wageBands[squadContent.wageBands.length - 1]!;
  return Math.round(band.base + value * band.perValue);
}

export function createPlayer(
  rng: Rng,
  pos: Position,
  minStrength: number,
  maxStrength: number,
  forceTrait?: string
): Player {
  const target = rng.int(minStrength, maxStrength);
  /*
   * Generate around the target rather than at it. A player whose five numbers
   * are identical is a spreadsheet row; the spread is what makes one midfielder
   * different from another at the same overall, and what gives the editor
   * something to notice and adjust.
   *
   * The overall lands close to `target` because the position weights sum to 1,
   * so a symmetric spread averages out.
   */
  const attributes = shiftToBand(
    spreadAround(rng, target, 12),
    pos,
    minStrength,
    maxStrength
  );
  const strength = overallFor(attributes, pos);
  const value = marketValue(strength);
  const trait = forceTrait ?? (rng.chance(squadContent.traitChance) ? rng.pick(squadContent.traits) : 'Kein');
  return {
    id: `p${rng.int(100_000, 999_999)}-${strength}`,
    attributes,
    name: `${rng.pick(squadContent.firstNames)} ${rng.pick(squadContent.lastNames)}`,
    pos,
    fitness: rng.int(85, 100),
    morale: rng.int(60, 90),
    age: rng.int(18, 34),
    marketValue: value,
    wage: wage(strength, value),
    trait,
    injured: 0,
    suspended: 0,
    individualFocus: 'allgemein'
  };
}

/**
 * Slide a spread until its overall sits inside the requested band.
 *
 * Callers ask for a band and rely on it — the transfer market picks players by
 * league level, so a striker drifting above the band would put a Bundesliga
 * player in a fourth-division shop window. Because the position weights sum to
 * 1, adding the same delta to every attribute moves the overall by exactly that
 * delta, so the spread is preserved and only the level shifts.
 */
function shiftToBand(a: Attributes, pos: Position, min: number, max: number): Attributes {
  const current = overallFor(a, pos);
  const wanted = Math.max(min, Math.min(max, current));
  const delta = wanted - current;
  if (delta === 0) return a;
  const shift = (v: number) => Math.max(1, Math.min(99, v + delta));
  return {
    technik: shift(a.technik), tempo: shift(a.tempo), kraft: shift(a.kraft),
    uebersicht: shift(a.uebersicht), mentalitaet: shift(a.mentalitaet)
  };
}

/** Five values scattered around a target, each clamped to the legal range. */
function spreadAround(rng: Rng, target: number, spread: number): Attributes {
  const one = () => Math.max(1, Math.min(99, target + rng.int(-spread, spread)));
  return {
    technik: one(), tempo: one(), kraft: one(), uebersicht: one(), mentalitaet: one()
  };
}

export function isAvailable(p: Player): boolean {
  return p.injured === 0 && p.suspended === 0;
}

/**
 * Pick the best available eleven in a 1-4-4-2 shape, falling back to whoever is
 * left if a position is short. The prototype's autoLineup(), made total: it can
 * no longer return a lineup of fewer than eleven while fit players sit out.
 */
export function autoLineup(squad: SquadState): string[] {
  const available = squad.players.filter(isAvailable);
  const byPos = (pos: Position) =>
    available.filter((p) => p.pos === pos).sort((a, b) => rating(b) - rating(a));

  const picked: Player[] = [
    ...byPos('TW').slice(0, 1),
    ...byPos('ABW').slice(0, 4),
    ...byPos('MIT').slice(0, 4),
    ...byPos('ST').slice(0, 2)
  ];

  if (picked.length < 11) {
    const chosen = new Set(picked.map((p) => p.id));
    const rest = available
      .filter((p) => !chosen.has(p.id))
      .sort((a, b) => rating(b) - rating(a));
    picked.push(...rest.slice(0, 11 - picked.length));
  }

  return picked.map((p) => p.id);
}

/**
 * Effective quality right now.
 *
 * Fitness is a DEVIATION FROM NORMAL, not a multiplier.
 *
 * `strength * fitness/100` meant a squad at 58% fitness — which is simply what
 * mid-season looks like — rated 40% below its own paper strength, while every
 * AI club carried a static number and never tired. The player alone paid a
 * fitness tax. Measured symptom: a squad at exactly its league's table strength
 * finished 15th of 18.
 *
 * Rating against a baseline fixes the asymmetry without removing the mechanic:
 * a normally-rotated squad meets the league at face value, a fresh one has a
 * genuine edge, and an exhausted one is genuinely worse.
 */
export function rating(p: Player): number {
  const { fitnessWeight: w, fitnessBaseline: base } = squadContent;
  return strengthOf(p) * (1 + (w * (p.fitness - base)) / 100);
}

/**
 * Team strength for the match engine.
 * Ported from calcTeamStrength(). Bonuses that used to be read directly off
 * other systems (staff, doctrine, sabotage) are passed in as one number, so
 * this stays a pure function and other modules stay uncoupled.
 */
export function teamStrength(squad: SquadState, isHome: boolean, externalBonus = 0): number {
  const starting = squad.players.filter((p) => squad.lineup.includes(p.id));
  if (starting.length === 0) return 50;

  const sum = starting.reduce((acc, p) => acc + rating(p), 0);
  let bonus = externalBonus + (isHome ? 3 : 0);
  if (starting.some((p) => p.trait === 'Leader')) bonus += 2;

  return Math.round(sum / Math.max(11, starting.length) + bonus);
}

export function wageBill(squad: SquadState): number {
  return squad.players.reduce((sum, p) => sum + p.wage, 0);
}

export interface MatchdayOutcome {
  injuries: { player: Player; matchdays: number }[];
  recovered: Player[];
}

/**
 * Post-match effects: fitness, recovery, and new injuries.
 * Ported from processPostMatchRoutine(), minus everything that belonged to
 * other systems — those now have their own hooks.
 */
export function applyPostMatch(
  squad: SquadState,
  rng: Rng,
  opts: {
    injuryRiskMultiplier?: number;
    fitnessLossMultiplier?: number;
    /** A physio shortens layoffs without preventing them. */
    injuryDurationMultiplier?: number;
  } = {}
): MatchdayOutcome {
  const c = squadContent;
  const loss = Math.max(2, Math.round(c.fitnessLossPerMatch * (opts.fitnessLossMultiplier ?? 1)));
  const outcome: MatchdayOutcome = { injuries: [], recovered: [] };

  for (const p of squad.players) {
    if (squad.lineup.includes(p.id)) {
      p.fitness = Math.max(10, p.fitness - loss);
    } else {
      p.fitness = Math.min(100, p.fitness + c.fitnessRecoveryPerMatch);
    }

    if (p.injured > 0) {
      p.injured -= 1;
      if (p.injured === 0) outcome.recovered.push(p);
    }
    if (p.suspended > 0) p.suspended -= 1;
  }

  const baseRisk = c.injuryBaseRisk * (opts.injuryRiskMultiplier ?? 1);
  for (const p of squad.players) {
    if (!squad.lineup.includes(p.id) || p.injured > 0) continue;
    const risk = baseRisk * (p.fitness < c.tiredFitnessThreshold ? c.tiredInjuryMultiplier : 1);
    if (rng.chance(risk)) {
      const matchdays = Math.max(
        1,
        Math.round(rng.int(1, 6) * (opts.injuryDurationMultiplier ?? 1))
      );
      p.injured = matchdays;
      outcome.injuries.push({ player: p, matchdays });
    }
  }

  // An injured player cannot stay in the eleven. The prototype patched this up
  // afterwards with an alert(); here it just cannot happen.
  if (outcome.injuries.length > 0) {
    squad.lineup = autoLineup(squad);
  }

  return outcome;
}
