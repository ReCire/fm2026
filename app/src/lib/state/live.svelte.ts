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

/**
 * Where the clock started, in real time. The minute is COMPUTED from this
 * rather than accumulated per interval.
 *
 * Counting ticks assumes the interval fires when it was asked to, and it does
 * not: a browser throttles a hidden tab's timers to roughly one a second, so
 * a match watched in a background tab ran at a quarter speed and ninety
 * minutes took six real ones. On a phone, where the tab is backgrounded every
 * time the player answers a message, that is the normal case rather than the
 * edge one. Reading the wall clock makes throttling cost smoothness instead of
 * time — the match arrives when it should, in bigger steps.
 */
let startedAt = 0;
let minuteAtStart = 0;

/** Match minutes per real second. */
const MINUTES_PER_SECOND = 90 / MATCH_SECONDS;

export function isRunning(): boolean {
  return timer !== null;
}

export function start(): void {
  if (!browser || timer) return;
  const live = game.modules.matchday.live;
  if (!live || live.minute >= 90) return;

  live.running = true;
  startedAt = Date.now();
  minuteAtStart = live.minute;

  timer = setInterval(() => {
    const current = game.modules.matchday.live;
    if (!current) return stop();

    const elapsed = (Date.now() - startedAt) / 1000;
    const exact = Math.min(90, minuteAtStart + elapsed * MINUTES_PER_SECOND);
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

/**
 * Drop the timer without deciding the match is paused.
 *
 * The difference matters: `pause()` is the PLAYER stopping the clock and is
 * remembered, `release()` is a component unmounting and must not be. A view
 * that wrote `running = false` on its own teardown turned every navigation
 * away into a pause the player never asked for — and, worse, the teardown ran
 * on every tick of the clock it was driving, so the match stopped after one
 * second and stayed stopped.
 */
export function release(): void {
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
