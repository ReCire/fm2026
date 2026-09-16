import type { FansState, FanGroupState } from './state';
import { fanGroups, fansContent, type FanAction } from './content';

/**
 * The fans' arithmetic. Pure, so a matchday's effect on the Kurve can be
 * checked without a screen — see AUTHORING.md.
 */

export function clampMood(value: number): number {
  return Math.max(0, Math.min(100, value));
}

/** Ordnerdienst → Sicherheitsquote. Same curve the prototype used. */
export function safetyOf(stewards: number): number {
  return Math.min(fansContent.safetyCap, Math.round(stewards / fansContent.safetyDivisor));
}

export function groupDef(id: string) {
  return fanGroups.find((g) => g.id === id);
}

/** Four moods, turned into the one number the rest of the club sees. */
export function overallMood(state: FansState): number {
  let sum = 0;
  let weight = 0;
  for (const group of state.groups) {
    const def = groupDef(group.id);
    if (!def) continue;
    sum += group.mood * def.weight;
    weight += def.weight;
  }
  return weight > 0 ? sum / weight : 0;
}

export interface MatchOutcome {
  goalsFor: number;
  goalsAgainst: number;
}

/**
 * How a result moves every faction, before the outcome is applied.
 *
 * The same delta for all four rather than four separate curves — a defeat is
 * one afternoon experienced by everybody in the ground at once, and giving
 * the loge its own smaller reaction would need a second, invented number this
 * feature has no source for.
 */
export function driftFor(result: MatchOutcome): number {
  if (result.goalsFor > result.goalsAgainst) return fansContent.winBoost;
  if (result.goalsFor < result.goalsAgainst) return fansContent.lossPenalty;
  return fansContent.drawBoost;
}

export function applyResult(state: FansState, result: MatchOutcome): void {
  const delta = driftFor(result);
  for (const group of state.groups) group.mood = clampMood(group.mood + delta);
}

export function canAfford(money: number, action: FanAction): boolean {
  return money >= action.cost;
}

/** Boosts every faction. The caller charges the cost through the ledger. */
export function applyAction(state: FansState, action: FanAction): void {
  for (const group of state.groups) group.mood = clampMood(group.mood + action.boost);
}

/** Factions worth a look: mood below the threshold. */
export function unhappy(state: FansState): FanGroupState[] {
  return state.groups.filter((g) => g.mood < fansContent.attentionAt);
}
