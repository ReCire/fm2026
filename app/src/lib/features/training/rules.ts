import type { Rng } from '$lib/engine/rng';
import type { Player, SquadState } from '../squad/state';
import { ATTRIBUTES, type Attribute, type Focus } from '../squad/attributes';
import { trainingContent } from './content';
import type { Intensity, TrainingState } from './state';

/**
 * A training week, as arithmetic.
 *
 * Nothing here reads the clock or the RNG on its own — the tick hands both in.
 * That is what lets the balance tests run four hundred simulated weeks in a
 * loop and get the same answer every time.
 */

/** What this player actually works on: their own choice, else the team's. */
export function focusOf(player: Player, team: TrainingState): Focus {
  return player.individualFocus === 'allgemein' ? team.teamFocus : player.individualFocus;
}

/**
 * How likely one point of progress is this week, 0..1.
 *
 * Three forces, multiplied rather than added, so none of them can be ignored by
 * making another one large:
 *
 *  - `age` — a nineteen-year-old improves fast, a thirty-year-old declines.
 *  - `ceiling` — the better someone already is, the rarer the next point.
 *  - `intensity` — how hard you are willing to work them.
 *
 * Without the ceiling, six seasons of training produce eleven 99s and the
 * transfer market has nothing left to sell you.
 */
export function gainChance(
  player: Player,
  attribute: Attribute,
  intensity: Intensity,
  personal: boolean
): number {
  const c = trainingContent;
  const value = player.attributes[attribute];

  let chance = c.baseGain * c.intensity[intensity].gain;

  if (!personal) chance *= c.teamFocusShare;

  if (player.age < c.peakAgeFrom) {
    chance *= 1 + (c.peakAgeFrom - player.age) * c.youthBonusPerYear;
  } else if (player.age > c.peakAgeTo) {
    // Past the peak, improvement does not merely slow — see declineChance.
    chance *= Math.max(0, 1 - (player.age - c.peakAgeTo) * 0.15);
  }

  if (value > c.diminishFrom) {
    chance *= Math.max(0, 1 - (value - c.diminishFrom) * c.diminishRate);
  }

  return Math.max(0, Math.min(1, chance));
}

/** The chance an ageing player LOSES a point somewhere this week. */
export function declineChance(player: Player): number {
  const c = trainingContent;
  if (player.age <= c.peakAgeTo) return 0;
  return Math.min(1, (player.age - c.peakAgeTo) * c.declinePerYearOver);
}

/** Fitness recovered by a week at this intensity. The only source of recovery. */
export function restFor(intensity: Intensity): number {
  return trainingContent.intensity[intensity].rest;
}

export interface WeekChange {
  playerId: string;
  name: string;
  attribute: string;
  delta: number;
}

export interface WeekOutcome {
  changes: WeekChange[];
  /** Players whose injury ran out this week. */
  recovered: Player[];
}

/**
 * Run one training week over the squad. Mutates players in place — the same
 * way matchday applies its morale delta — and returns what it did so the
 * screen can show it instead of announcing a number that moved off-screen.
 */
export function trainWeek(
  training: TrainingState,
  squad: SquadState,
  rng: Rng,
  /**
   * Extra strength per player per SEASON, from the doctrine.
   *
   * Converted to an independent per-week roll at `devPerSeason / 34`, so a node
   * labelled "+2 Stärke-Entwicklung pro Spieler und Saison" delivers exactly
   * two points a season in expectation. Folding it into `gainChance` as a
   * multiplier would have been easier and would have made the label a lie —
   * the promised figure has to be the delivered one.
   */
  devPerSeason = 0
): WeekOutcome {
  const outcome: WeekOutcome = { changes: [], recovered: [] };
  const rest = restFor(training.intensity);

  for (const player of squad.players) {
    /*
     * An injured player rests. They recover fitness and their lay-off counts
     * down, but they do not train — a squad that develops fastest while its
     * best man is in a cast is not modelling anything.
     */
    if (player.injured > 0) {
      player.injured -= 1;
      player.fitness = Math.min(100, player.fitness + rest);
      if (player.injured === 0) outcome.recovered.push(player);
      continue;
    }

    player.fitness = Math.min(100, player.fitness + rest);

    const focus = focusOf(player, training);
    const personal = player.individualFocus !== 'allgemein';
    // 'allgemein' spreads the week's work over all five, which is why it never
    // wins a race but never leaves a hole either.
    const worked: Attribute[] = focus === 'allgemein' ? [...ATTRIBUTES] : [focus];
    const share = focus === 'allgemein' ? 1 / ATTRIBUTES.length : 1;

    for (const attribute of worked) {
      if (player.attributes[attribute] >= 99) continue;
      if (!rng.chance(gainChance(player, attribute, training.intensity, personal) * share)) continue;
      player.attributes[attribute] += 1;
      record(training, outcome, player, attribute, 1);
    }

    if (devPerSeason > 0 && rng.chance(devPerSeason / 34)) {
      const attribute = focus === 'allgemein' ? rng.pick(ATTRIBUTES) : focus;
      if (player.attributes[attribute] < 99) {
        player.attributes[attribute] += 1;
        record(training, outcome, player, attribute, 1);
      }
    }

    if (rng.chance(declineChance(player))) {
      const attribute = rng.pick(ATTRIBUTES);
      if (player.attributes[attribute] > 1) {
        player.attributes[attribute] -= 1;
        record(training, outcome, player, attribute, -1);
      }
    }
  }

  return outcome;
}

function record(
  training: TrainingState,
  outcome: WeekOutcome,
  player: Player,
  attribute: Attribute,
  delta: number
): void {
  outcome.changes.push({ playerId: player.id, name: player.name, attribute, delta });
  const forPlayer = (training.season[player.id] ??= {});
  forPlayer[attribute] = (forPlayer[attribute] ?? 0) + delta;
}

/** Net points a player has gained this season, for the squad list. */
export function seasonProgress(training: TrainingState, playerId: string): number {
  const forPlayer = training.season[playerId];
  if (!forPlayer) return 0;
  return Object.values(forPlayer).reduce((sum, n) => sum + n, 0);
}
