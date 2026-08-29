import { browser } from '$app/environment';
import { game } from './game.svelte';

/**
 * The match clock.
 *
 * Runs on its own rather than on a button. That is the whole point: a match you
 * advance by clicking is a spreadsheet with a delay, and the complaint that
 * started this was that pressing the button felt like nothing happening.
 *
 * The clock only drives PRESENTATION — every beat is already decided and
 * stored, so pausing, leaving the screen, or reloading loses nothing, and the
 * match cannot come out differently the second time.
 */
const MATCH_SECONDS = 90;
const TICK_MS = 250;

let timer: ReturnType<typeof setInterval> | null = null;

/** Minutes advanced per tick, so ninety minutes takes MATCH_SECONDS. */
const PER_TICK = 90 / ((MATCH_SECONDS * 1000) / TICK_MS);

export function isRunning(): boolean {
  return timer !== null;
}

export function start(): void {
  if (!browser || timer) return;
  const live = game.modules.matchday.live;
  if (!live || live.minute >= 90) return;

  live.running = true;
  let exact = live.minute;

  timer = setInterval(() => {
    const current = game.modules.matchday.live;
    if (!current) return stop();

    exact = Math.min(90, exact + PER_TICK);
    current.minute = Math.floor(exact);

    if (exact >= 90) {
      current.minute = 90;
      current.running = false;
      stop();
    }
  }, TICK_MS);
}

export function pause(): void {
  const live = game.modules.matchday.live;
  if (live) live.running = false;
  stop();
}

/** Jump to the whistle. Always available — nobody should be held in a match. */
export function skipToEnd(): void {
  stop();
  const live = game.modules.matchday.live;
  if (!live) return;
  live.minute = 90;
  live.running = false;
}

export function dismiss(): void {
  stop();
  game.modules.matchday.live = null;
}

function stop(): void {
  if (timer) clearInterval(timer);
  timer = null;
}

export const MATCH_LENGTH_SECONDS = MATCH_SECONDS;
