import type { MatchdayState, Report, Formation, Style, Talk } from './state';
import type { Player } from '../squad/state';
import { strengthOf } from '../squad/rules';
import { matchdayContent as C } from './content';
import { sabotageById, canArrange } from './sabotage';
import { postToLedger } from '../finance/module';
import type { FinanceState } from '../finance/state';

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

/** How open the chosen style makes the game — for both sides. */
export function goalChance(m: MatchdayState): number {
  return C.style[m.style].goalChance;
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

/**
 * Who might score, and how likely each of them is.
 *
 * Weighted by position first and quality second. The position spread is wide on
 * purpose — a keeper scoring as often as a striker would make the top-scorer
 * list read as a random name generator, and the list is the whole reason this
 * exists. Quality then separates the two forwards from each other.
 *
 * A defender still scores sometimes, because he does.
 */
const SCORING_WEIGHT: Record<string, number> = {
  ST: 10,
  MIT: 5,
  ABW: 1.5,
  TW: 0.05
};

export function scorersFor(squad: { players: readonly Player[]; lineup: readonly string[] }) {
  return squad.players
    .filter((p) => squad.lineup.includes(p.id))
    .map((p) => ({
      id: p.id,
      name: p.name,
      // Quality tilts within a position rather than across it: a good defender
      // is still far less likely to score than a poor striker.
      weight: (SCORING_WEIGHT[p.pos] ?? 1) * (0.6 + strengthOf(p) / 100)
    }));
}

/**
 * Arrange something for Saturday.
 *
 * The money leaves through the ledger like every other cost in the game — a
 * purchase that silently decremented a balance would be invisible in the one
 * place a player looks to understand where their money went, and this is
 * precisely the purchase somebody will later want to find.
 *
 * The Ermittlungsdruck is NOT charged here. It is charged when the match is
 * played, in matchday's `pre` hook, because that is when the thing actually
 * happens — arranging it and then not playing should not make anybody curious.
 */
export function arrangeSabotage(
  m: MatchdayState,
  finance: FinanceState,
  meta: { season: number; matchday: number },
  id: string
): { ok: true } | { ok: false; reason: string } {
  const sabotage = sabotageById.get(id);
  if (!sabotage) return { ok: false, reason: 'Diese Operation gibt es nicht.' };
  if (m.plannedSabotage) {
    return { ok: false, reason: 'Für dieses Spiel ist bereits etwas arrangiert.' };
  }
  if (!canArrange(sabotage, finance.money)) {
    return { ok: false, reason: 'Das Vereinskonto gibt das nicht her.' };
  }

  postToLedger(finance, {
    season: meta.season,
    matchday: meta.matchday,
    source: 'matchday',
    reason: `Beratungshonorar — ${sabotage.label}`,
    amount: -sabotage.moneyCost
  });
  m.plannedSabotage = sabotage.id;
  return { ok: true };
}

/**
 * Call it off, and get nothing back.
 *
 * The money is gone. Somebody has already been paid, and a refund would make
 * arranging one a free option to browse — which is the whole point of it
 * costing money before it costs you anything else.
 */
export function cancelSabotage(m: MatchdayState): void {
  m.plannedSabotage = null;
}
