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
const HALF_TIME = 45;
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
  // Held at the interval until the half-time call has been made.
  if (live.minute >= HALF_TIME && live.decided === null) return;

  live.running = true;
  startedAt = Date.now();
  minuteAtStart = live.minute;

  timer = setInterval(() => {
    const current = game.modules.matchday.live;
    if (!current) return stop();

    const elapsed = (Date.now() - startedAt) / 1000;
    const exact = Math.min(90, minuteAtStart + elapsed * MINUTES_PER_SECOND);
    current.minute = Math.floor(exact);

    /*
     * The interval. The clock will not run into the second half until the
     * manager has answered, because a question you can scroll past is not a
     * decision — and the second half literally has not been decided yet.
     */
    if (current.minute >= HALF_TIME && current.decided === null) {
      current.minute = HALF_TIME;
      current.running = false;
      return stop();
    }

    if (exact >= 90) {
      current.minute = 90;
      current.running = false;
      stop();
    }
  }, TICK_MS);
}

/**
 * Whether the clock stopped because the PHONE went away, not the player.
 *
 * The distinction is the whole of this: `pause()` is a decision and is
 * remembered, `release()` is a component unmounting, and this is the operating
 * system taking the screen away mid-match. Only the last one should resume by
 * itself.
 */
let suspended = false;

/**
 * Stop the clock while the tab is hidden, and pick it up on return.
 *
 * Two reasons, and the second is the one that matters on a phone.
 *
 * The battery reason: a 250ms interval that keeps firing behind a locked screen
 * is work nobody asked for, on the most constrained device this game runs on.
 *
 * The real reason: the minute is computed from the WALL CLOCK, so a match left
 * running while you answer a message advances without you. Come back after two
 * minutes and it is over — the ninety minutes you were meant to watch happened
 * to an empty screen. On a phone, being interrupted is not an edge case; it is
 * how the device is used. A match is something you watch, so if you are not
 * there it waits.
 */
if (browser) {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (timer) {
        suspended = true;
        stop();
      }
      return;
    }
    if (!suspended) return;
    suspended = false;
    // `start` re-bases the wall clock on the current minute, so the time spent
    // away is not counted against the match.
    start();
  });
}

export function pause(): void {
  const live = game.modules.matchday.live;
  if (live) live.running = false;
  // A deliberate pause outranks a suspension: coming back to the app must not
  // restart a match the player stopped on purpose before they left.
  suspended = false;
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
  suspended = false;
  stop();
}

/**
 * Jump to the whistle. Always available — nobody should be held in a match.
 *
 * Except by the interval: skipping past an unanswered half-time question would
 * skip a decision that has not been taken, and the second half it decides.
 * `atInterval()` lets the view offer the question instead of the button.
 */
export function skipToEnd(): void {
  const live = game.modules.matchday.live;
  if (!live) return;
  // At the interval the view shows the question instead of this button, and
  // pressing past it would skip a decision the second half depends on.
  if (atInterval()) return;
  stop();
  /*
   * Skipping from the FIRST half walks past the interval without being asked,
   * which is fine — a manager who wants out should not be made to answer. But
   * the match must not stay recorded as undecided: `decided === null` is how
   * everything else knows a question is outstanding, so a skipped match would
   * read as permanently at the interval, at minute 90.
   *
   * Skipping is `halten` — nothing changed — which is exactly what happened.
   */
  if (live.decided === null) live.decided = 'halten';
  live.minute = 90;
  live.running = false;
}

/** True while the clock is waiting on the half-time call. */
export function atInterval(): boolean {
  const live = game.modules.matchday.live;
  return !!live && live.minute >= HALF_TIME && live.minute < 90 && live.decided === null;
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
