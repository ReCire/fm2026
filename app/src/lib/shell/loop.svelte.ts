import { game, advance } from '$lib/state/game.svelte';
import type { TickResult } from '$lib/engine/clock';

/**
 * Which step of the loop the player is standing on.
 *
 * One place, because the alternative is every screen deciding for itself
 * whether to offer "train" or "play" — and the first screen to get it wrong
 * hands the player a button that skips the week entirely. A week you can walk
 * past is not a week; it is a screen with a button on it.
 *
 * The phase itself lives in `core` state and is flipped by the engine at the
 * end of every tick, so a tick advanced from anywhere — a test, the debug
 * panel, an autopilot — moves the loop along too.
 */
export interface Step {
  kind: 'week' | 'matchday';
  /** Doc id for the button that takes it. Labels come from the registry. */
  doc: string;
  /** What the player is standing in front of, for a heading. */
  title: string;
}

const WEEK: Step = { kind: 'week', doc: 'game.week', title: 'Trainingswoche' };
const MATCH: Step = { kind: 'matchday', doc: 'game.advance', title: 'Spieltag' };

export function currentStep(): Step {
  return game.modules.core.phase === 'week' ? WEEK : MATCH;
}

/** Take the step the loop is actually on. Never a choice of two buttons. */
export function takeStep(): TickResult {
  return advance(currentStep().kind);
}
