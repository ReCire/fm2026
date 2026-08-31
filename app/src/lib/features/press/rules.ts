import type { Rng } from '$lib/engine/rng';
import {
  bandFor, headlines, pressContent, INVESTIGATION_FROM,
  type Cause, type Headline
} from './content';
import type { PressState, Story } from './state';

/**
 * Ermittlungsdruck: the meter, and the two things that read it.
 *
 * Pure functions over plain data. Nothing here posts to the ledger or emits an
 * event — `module.ts` does that, so a test can run a whole season of scandal
 * without a game around it.
 */

/* ─────────────────────────────────────────────────────────────────────────
 * The meter
 * ───────────────────────────────────────────────────────────────────────── */

/**
 * What bleeds off in a matchday where nothing happens.
 *
 * PROPORTIONAL, not flat. A flat −2 means a club at 90 and a club at 30 both
 * take fifteen matchdays to come clean, so the deep end of the Schattenkabinett
 * costs the same as dipping a toe in it. Proportional decay makes the meter
 * self-limiting instead: at any pressure, the amount that bleeds off scales
 * with how hot you are, so a player who keeps buying nodes settles at a
 * survivable equilibrium rather than pinning at 100 forever.
 *
 * It is also why there is no spiral. A raid raises the meter, a higher meter
 * raises the raid chance — but decay rises with it too, and the arithmetic
 * comes out negative at every pressure. Worth checking again if either number
 * moves; the test does.
 */
export function decayOf(pressure: number, rate = pressContent.decayPerMatchday): number {
  return pressure * rate;
}

/** Clamp to the range the schema promises. Everything writing pressure uses this. */
export function clampPressure(value: number): number {
  return Math.max(0, Math.min(100, value));
}

/* ─────────────────────────────────────────────────────────────────────────
 * Stories
 * ───────────────────────────────────────────────────────────────────────── */

const PLACEHOLDER = /\{(club|opponent|n|sum)\}/g;

/** Fill a headline template. An unknown placeholder is left visible on purpose. */
export function fill(text: string, vars: Partial<Record<string, string | number>>): string {
  return text.replace(PLACEHOLDER, (match, key: string) => {
    const value = vars[key];
    return value === undefined ? match : String(value);
  });
}

/** One headline of a given cause, or undefined if the content has none. */
export function pickHeadline(rng: Rng, cause: Cause): Headline | undefined {
  const pool = headlines.filter((h) => h.cause === cause);
  return pool.length > 0 ? rng.pick(pool) : undefined;
}

/**
 * Write a story into the feed and move the meter by its weight.
 *
 * The two are done together, always, and that is the whole reason this is one
 * function. A meter that can move without a headline underneath it is a mood
 * ring — the player sees the needle jump and has no way to find out why, which
 * is the failure the feed exists to prevent.
 */
export function publish(state: PressState, story: Story): void {
  state.feed.unshift(story);
  if (state.feed.length > pressContent.feedLength) {
    state.feed.length = pressContent.feedLength;
  }
  state.pressure = clampPressure(state.pressure + story.weight);
}

export interface MatchResult {
  goalsFor: number;
  goalsAgainst: number;
  isHome: boolean;
  opponent: string;
}

/**
 * What the papers found to write about this matchday, most newsworthy first.
 *
 * Returns causes rather than headlines so the caller owns the RNG draw and the
 * template fill — a pure list of reasons is testable without a seed.
 *
 * Only ONE football story runs per matchday. A defeat that was also a hiding
 * that also extended a winless run is one story with three angles, and printing
 * all three would bury the one cause that actually moves the meter under noise
 * the meter ignores.
 */
export function causesFor(state: PressState, result: MatchResult | undefined): Cause[] {
  const c = pressContent;
  if (!result) return ['quiet'];

  const conceded = result.goalsAgainst - result.goalsFor;
  if (conceded > 0 && result.goalsAgainst >= c.thrashingAt) return ['thrashing'];
  if (state.unbeaten >= c.streakAt) return ['streak'];
  if (conceded > 0) return ['defeat'];
  return ['quiet'];
}

/** Update the two run counters. Called once per matchday, before `causesFor`. */
export function recordResult(state: PressState, result: MatchResult): void {
  const won = result.goalsFor > result.goalsAgainst;
  const lost = result.goalsFor < result.goalsAgainst;
  state.winless = won ? 0 : state.winless + 1;
  state.unbeaten = lost ? 0 : state.unbeaten + 1;
}

/* ─────────────────────────────────────────────────────────────────────────
 * The Verband
 * ───────────────────────────────────────────────────────────────────────── */

/**
 * Whether a file should be open right now.
 *
 * The prototype had no file. Above 25% it rolled a raid every matchday and, on
 * a hit, took money straight off the balance — a punishment with no decision in
 * front of it and nothing the player could have seen coming.
 *
 * Opening the file first, visibly, changes nothing about the eventual cost and
 * everything about whether the cost is fair. It is also the only thing that
 * makes Medien-Training worth BUYING rather than worth having bought: there is
 * now a stretch of matchdays in which lowering the needle is a live move.
 */
export function shouldOpenFile(pressure: number, immune: boolean): boolean {
  return !immune && pressure >= INVESTIGATION_FROM;
}

/**
 * The Verband does not raid the same club every other week.
 *
 * Written as fiction; it is here as arithmetic. The uncapped curve crosses
 * decay at exactly 70 and beats it above that — a raid adds up to 14 to the
 * meter, a hotter meter raids more often, and past 70 the loop runs away on
 * its own with the player unable to affect it. A doom spiral that only starts
 * in the band the screen calls "Razzia möglich" is the worst possible place
 * for one, because it is where a player is already in trouble and looking for
 * a way back.
 *
 * The cap is what makes the meter fall at every pressure. The margin at 70 is
 * thin on purpose — a committed Schattenkabinett player contributing suspicion
 * every matchday still climbs, which is the bill they signed for. What they
 * get is a system where STOPPING works.
 */
const RAID_CHANCE_CAP = 0.3;

/**
 * Chance of a raid on a matchday with the file open.
 *
 * The prototype's curve, kept: `(pressure − 20) × 0.008` — a 4% roll just over
 * the threshold, rising to the cap at 57.5%. Slow enough that being briefly
 * noticed is survivable, steep enough that living in the red is not a strategy.
 */
export function raidChance(pressure: number): number {
  return Math.min(RAID_CHANCE_CAP, Math.max(0, (pressure - 20) * 0.008));
}

/**
 * What a raid takes off the meter once it is over.
 *
 * The prototype's number, and it took two failing tests to understand why it
 * was there. Without it the raid headlines — 10 to 14, plus 4 or 5 for the
 * fine that follows — are pure input to the meter that caused them, and the
 * loop has a fixed point at around 60%: a club that sells every doctrine node
 * it owns and does nothing for forty matchdays still has an open file and is
 * still being raided, because the raids are now sustaining themselves.
 *
 * A meter with no route back to zero is not a temperature, it is a sentence.
 *
 * So the raid RESOLVES: they came, they took the boxes, and the thing they
 * were curious about is now a matter of record rather than a suspicion. The
 * headlines still run at their full weight, which is what the boardroom will
 * read — that is where "the pictures are worse than the fine" belongs, and it
 * is the difference between the two consequences rather than a second helping
 * of the same one.
 *
 * The net move is downward, so a raid is survivable. What stops it being
 * FARMED is the fine, which scales with the needle and is therefore most
 * expensive exactly when a player would want to trigger one deliberately.
 */
export const RAID_RESOLVES = 30;

/** What they take. Scales with the needle, so the deep end pays for the deep end. */
export function fineFor(pressure: number, penaltyFactor = 1): number {
  return Math.round(pressure * pressContent.finePerPoint * penaltyFactor);
}

/** The label, glyph and explanation for the current reading. */
export function bandOf(state: PressState) {
  return bandFor(state.pressure);
}

/**
 * A one-line summary for the shell, without opening the screen.
 *
 * `null` when there is nothing to say, which for most careers is always — and
 * a badge that appears on a clean club is how a player learns to stop reading
 * badges.
 */
export function statusOf(state: PressState): string | null {
  if (state.investigation) {
    return state.investigation.raids > 0
      ? `Akte offen, ${state.investigation.raids} Durchsuchung${state.investigation.raids === 1 ? '' : 'en'}`
      : 'Akte offen';
  }
  if (state.pressure >= INVESTIGATION_FROM) return 'Auffällig';
  return null;
}
