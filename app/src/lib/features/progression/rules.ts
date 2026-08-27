import type { GameState } from '$lib/engine/state';
import type { ProgressionState } from './state';
import { narrativeById, type Narrative } from './content';

/**
 * Unlock and delegation rules. Pure functions over plain data.
 *
 * The central predicate is `isUnlocked`. Every gated module calls it from its
 * own `gate`, which means the dependency always points feature → progression
 * and the engine never learns what an unlock is.
 */

export function isUnlocked(state: GameState, moduleId: string): boolean {
  const p = state.modules.progression as ProgressionState | undefined;
  // Before onboarding finishes there is no progression state to consult; treat
  // everything as locked rather than crashing, so a half-built save is inert
  // rather than dangerous.
  if (!p) return false;
  return p.unlocked.includes(moduleId);
}

/** Convenience for a module manifest: `gate: gatedBy('industry')`. */
export function gatedBy(moduleId: string) {
  return (state: GameState) => isUnlocked(state, moduleId);
}

export function isDelegated(state: GameState, moduleId: string): boolean {
  const p = state.modules.progression as ProgressionState | undefined;
  return Boolean(p && p.delegated[moduleId]);
}

/** What opens next under the current narrative, or undefined if nothing is left. */
export function nextUnlock(p: ProgressionState): string | undefined {
  const narrative = narrativeById(p.narrativeId);
  if (!narrative) return undefined;
  return narrative.unlockOrder.find((id) => !p.unlocked.includes(id));
}

export interface UnlockResult {
  unlocked: string[];
  remaining: number;
}

/**
 * Open the next `count` modules in the narrative's order.
 *
 * Unlocking is driven by progress rather than by time, and always follows the
 * narrative's sequence — so the order a player meets the game in is a design
 * decision recorded in content, not an accident of when they clicked something.
 */
export function unlockNext(p: ProgressionState, count = 1): UnlockResult {
  const opened: string[] = [];
  for (let i = 0; i < count; i++) {
    const next = nextUnlock(p);
    if (!next) break;
    p.unlocked.push(next);
    opened.push(next);
  }
  const narrative = narrativeById(p.narrativeId);
  const total = narrative?.unlockOrder.length ?? 0;
  const done = narrative?.unlockOrder.filter((id) => p.unlocked.includes(id)).length ?? 0;
  return { unlocked: opened, remaining: Math.max(0, total - done) };
}

/** Force one module open, ignoring order. For rewards and for the admin panel. */
export function unlock(p: ProgressionState, moduleId: string): boolean {
  if (p.unlocked.includes(moduleId)) return false;
  p.unlocked.push(moduleId);
  return true;
}

/** Apply a narrative's starting state. Idempotent for a given narrative. */
export function applyNarrative(p: ProgressionState, narrative: Narrative): void {
  p.narrativeId = narrative.id;
  p.unlocked = [...new Set(narrative.unlockedAtStart)];
  p.seen = [];
  p.tutorialStep = 0;
}

export interface Delegation {
  executiveId: string;
  /** 0..1. Drives how well the autopilot resolves this department's items. */
  competence: number;
  hiredOnMatchday: number;
}

export function delegate(
  p: ProgressionState,
  moduleId: string,
  executive: Delegation
): void {
  p.delegated[moduleId] = { ...executive };
}

/** What is running this department, if anything. Passed into autopilot hooks. */
export function delegationFor(
  state: GameState,
  moduleId: string
): Delegation | undefined {
  const p = state.modules.progression as ProgressionState | undefined;
  return p?.delegated[moduleId];
}

/**
 * Should this department's mail and open items be hidden FROM THE PLAYER?
 *
 * The player fantasy is not "a number goes up" — it is "this inbox stops asking
 * me things". Delegation has to actually silence the department, or hiring
 * someone changes nothing the player can feel.
 *
 * ⚠ PLAYER-FACING ONLY. Never filter machinery with this.
 *
 * An autopilot that reads a list already filtered by `isSilenced` sees an empty
 * list — because it is, by construction, running for a department that has been
 * hidden. Every decision it should be making becomes dead code, and it fails
 * silently: no error, no event, just an executive who appears to do nothing.
 * fm-03-design hit exactly this in the LinkedOut autopilot.
 *
 * The rule: silencing is for the player, not for the machinery. Machinery asks
 * `delegationFor()` and reads the department's unfiltered state.
 */
export function isSilenced(state: GameState, moduleId: string): boolean {
  return delegationFor(state, moduleId) !== undefined;
}

export function revoke(p: ProgressionState, moduleId: string): boolean {
  if (!(moduleId in p.delegated)) return false;
  delete p.delegated[moduleId];
  return true;
}

/** Modules opened but not yet visited, for the "new" badge in navigation. */
export function unseen(p: ProgressionState): string[] {
  return p.unlocked.filter((id) => !p.seen.includes(id));
}

export function markSeen(p: ProgressionState, moduleId: string): void {
  if (!p.seen.includes(moduleId)) p.seen.push(moduleId);
}

/** 0..1 through the narrative's unlock sequence. Drives the progress readout. */
export function progressRatio(p: ProgressionState): number {
  const narrative = narrativeById(p.narrativeId);
  if (!narrative || narrative.unlockOrder.length === 0) return 1;
  const done = narrative.unlockOrder.filter((id) => p.unlocked.includes(id)).length;
  return done / narrative.unlockOrder.length;
}
