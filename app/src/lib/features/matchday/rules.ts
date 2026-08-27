import type { MatchdayState, Report, Formation, Style, Talk } from './state';
import { matchdayContent as C } from './content';

/**
 * Pre-match rules. Pure functions over plain data.
 *
 * The one job that matters here: produce the strength the team actually takes
 * into the match, BEFORE the simulation runs. Everything else is presentation.
 */

export interface TacticalModifiers {
  formation: number;
  style: number;
  talk: number;
  total: number;
}

/** What the chosen shape and mood are worth, in strength points. */
export function modifiers(m: MatchdayState, isHome: boolean): TacticalModifiers {
  const formation = isHome ? C.formation[m.formation].home : C.formation[m.formation].away;
  const style = C.style[m.style].strength;
  const talk = C.talk[m.talk].strength;
  return { formation, style, talk, total: formation + style + talk };
}

/**
 * The strength league should use for our fixture.
 *
 * `base` is the squad's own rating. Home advantage is NOT added here — league
 * applies it to both sides uniformly, and adding it twice for us was one of the
 * things that made the player's record flatter than the table around it.
 */
export function effectiveStrength(m: MatchdayState, base: number, isHome: boolean): number {
  return Math.max(1, Math.round(base + modifiers(m, isHome).total));
}

export function fitnessMultiplier(m: MatchdayState): number {
  return C.style[m.style].fitnessCost;
}

export function moraleDelta(m: MatchdayState): number {
  return C.talk[m.talk].morale;
}

export interface Readiness {
  ready: boolean;
  /** Human-readable reasons the team is not ready. Empty when it is. */
  problems: string[];
}

/**
 * Is the team fit to play?
 *
 * Reported rather than enforced: the match happens whether or not the manager
 * prepared, exactly as it would in life. The player should know they are about
 * to field ten men, not be prevented from doing it.
 */
export function readiness(
  lineupSize: number,
  availableCount: number,
  averageFitness: number
): Readiness {
  const problems: string[] = [];
  if (lineupSize < 11) {
    problems.push(`Nur ${lineupSize} von 11 Positionen besetzt.`);
  }
  if (availableCount < 11) {
    problems.push(`Nur ${availableCount} Spieler einsatzbereit.`);
  }
  if (averageFitness > 0 && averageFitness < 60) {
    problems.push(`Die Elf startet mit ${Math.round(averageFitness)}% Fitness.`);
  }
  return { ready: problems.length === 0, problems };
}

export type Outcome = 'win' | 'draw' | 'loss';

export function outcomeOf(r: Report): Outcome {
  if (r.goalsFor > r.goalsAgainst) return 'win';
  if (r.goalsFor < r.goalsAgainst) return 'loss';
  return 'draw';
}

export function scoreline(r: Report): string {
  return `${r.goalsFor}:${r.goalsAgainst}`;
}

const RECENT_CAP = 12;

/** Record a result. Newest first, capped, so a long career stays bounded. */
export function recordResult(m: MatchdayState, report: Report): void {
  m.lastReport = report;
  m.recent.unshift(report);
  if (m.recent.length > RECENT_CAP) m.recent.length = RECENT_CAP;
}

/** Recent form, newest first — 'S' Sieg, 'U' Unentschieden, 'N' Niederlage. */
export function form(m: MatchdayState, count = 5): Outcome[] {
  return m.recent.slice(0, count).map(outcomeOf);
}

export function formLetters(m: MatchdayState, count = 5): string {
  return form(m, count)
    .map((o) => (o === 'win' ? 'S' : o === 'loss' ? 'N' : 'U'))
    .join('');
}

export function describeFormation(f: Formation): string { return C.formation[f].label; }
export function describeStyle(s: Style): string { return C.style[s].label; }
export function describeTalk(t: Talk): string { return C.talk[t].label; }
