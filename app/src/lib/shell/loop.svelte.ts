import { game, advance, advanceSeason } from '$lib/state/game.svelte';
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
  kind: 'week' | 'matchday' | 'seasonEnd';
  /** Doc id for the button that takes it. Labels come from the registry. */
  doc: string;
  /** What the player is standing in front of, for a heading. */
  title: string;
}

const WEEK: Step = { kind: 'week', doc: 'game.week', title: 'Trainingswoche' };
const MATCH: Step = { kind: 'matchday', doc: 'game.advance', title: 'Spieltag' };
const SEASON: Step = { kind: 'seasonEnd', doc: 'game.seasonEnd', title: 'Saisonabschluss' };

export function currentStep(): Step {
  const phase = game.modules.core.phase;
  if (phase === 'seasonEnd') return SEASON;
  return phase === 'week' ? WEEK : MATCH;
}

/**
 * Take the step the loop is actually on. Never a choice of two buttons.
 *
 * The season boundary is ONE step and TWO ticks. `seasonEnd` settles the
 * season — promotion, the Relegation ties, contracts, graduations, the board's
 * verdict — and `seasonStart` draws what the new one looks like, and a player
 * who stopped between them would be standing in a season that had ended and
 * not begun, with Europe's groups undrawn.
 *
 * Run through `advanceSeason` rather than as two `advance` calls, so undo
 * snapshots once around the pair. Otherwise "undo" lands halfway across the
 * boundary: the table already reset, the verdict already recorded, and no way
 * back to the season the player wanted to look at again.
 */
export function takeStep(): TickResult {
  const step = currentStep();
  return step.kind === 'seasonEnd' ? advanceSeason() : advance(step.kind);
}
