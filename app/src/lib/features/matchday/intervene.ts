import type { Style } from './state';

/**
 * The half-time decision.
 *
 * The problem this solves is a specific one: watching a match you cannot touch
 * is television, and the complaint that started all of this was that
 * interacting with the game felt as if it had no consequence. So the manager
 * gets one real decision at the interval, and it changes the second half.
 *
 * The shape that keeps it honest:
 *
 *  - The swing is BOUNDED and small next to the strength gap. A tactical call
 *    can win you a close game; it cannot beat a side ten points better. If it
 *    could, the eleven you picked would stop mattering, and every balance
 *    guarantee in the project is about the eleven mattering.
 *
 *  - Every option costs something. An option with only an upside is not a
 *    decision, it is a button you press every week — the same reason both
 *    levers for `offensiv` had to be made to do different things.
 *
 *  - Doing nothing is a real option, listed first, and it is genuinely fine.
 */
export interface Option {
  id: string;
  label: string;
  /** What it does, in the player's language. */
  detail: string;
  /** Added to our strength for the second half. Bounded by SWING_CAP. */
  swing: number;
  /** Extra fitness taken out of the starting eleven, in points. */
  fitnessCost: number;
  /** Multiplier on this match's remaining injury risk. */
  injuryRisk: number;
  /** Morale applied to the eleven afterwards. */
  morale: number;
}

export interface Decision {
  minute: number;
  /** The situation, phrased from the scoreboard the player is looking at. */
  question: string;
  options: Option[];
}

/**
 * The most a half-time call can move the second half.
 *
 * Six points against a division whose clubs sit within a six-point band: enough
 * to turn a close match, never enough to overturn a mismatch. Tuned to be
 * smaller than the gap between two adjacent divisions (ten), so a cup upset
 * still has to come from the draw and the eleven rather than from a button.
 */
export const SWING_CAP = 6;

const HOLD: Option = {
  id: 'halten',
  label: 'Nichts ändern',
  detail: 'Weiter wie in der ersten Halbzeit. Kostet nichts.',
  swing: 0,
  fitnessCost: 0,
  injuryRisk: 1,
  morale: 0
};

const PUSH: Option = {
  id: 'aufmachen',
  label: 'Aufmachen',
  detail: 'Alles nach vorne. Mehr Druck, offener nach hinten — und es geht in die Beine.',
  swing: 4,
  fitnessCost: 6,
  injuryRisk: 1.3,
  morale: 2
};

const SHUT: Option = {
  id: 'zumachen',
  label: 'Zumachen',
  detail: 'Tief stehen und das Ergebnis über die Zeit bringen. Nach vorne passiert wenig.',
  swing: 2,
  fitnessCost: 2,
  injuryRisk: 0.8,
  morale: -1
};

const ROCKET: Option = {
  id: 'donnerwetter',
  label: 'Donnerwetter',
  detail: 'Eine laute Kabine. Wirkt sofort, hinterlässt aber Spuren in der Stimmung.',
  swing: 5,
  fitnessCost: 4,
  injuryRisk: 1.15,
  morale: -4
};

const REST: Option = {
  id: 'schonen',
  label: 'Kräfte schonen',
  detail: 'Das Spiel ist gelaufen. Spart Körner für die Woche danach.',
  swing: -3,
  fitnessCost: -5,
  injuryRisk: 0.6,
  morale: 0
};

/**
 * What the manager is asked at the interval, given the half-time score.
 *
 * The question is built from the scoreboard rather than fixed, because "you are
 * two down" and "you are two up" are not the same decision wearing different
 * numbers — and being offered `Zumachen` while losing 0:2 is the kind of menu
 * that tells a player nobody was reading the situation.
 */
export function halfTimeDecision(us: number, them: number, style: Style): Decision {
  const diff = us - them;

  if (diff >= 2) {
    return {
      minute: 45,
      question: `Sie führen ${us}:${them}. Verwalten oder nachlegen?`,
      options: [HOLD, SHUT, REST, PUSH]
    };
  }
  if (diff === 1) {
    return {
      minute: 45,
      question: `Knappe Führung, ${us}:${them}. Absichern oder das zweite Tor suchen?`,
      options: [HOLD, SHUT, PUSH]
    };
  }
  if (diff === 0) {
    return {
      minute: 45,
      question: `${us}:${them} zur Pause. Wie geht es weiter?`,
      options: [HOLD, PUSH, SHUT, ROCKET]
    };
  }
  if (diff === -1) {
    return {
      minute: 45,
      question: `Sie liegen ${us}:${them} zurück. Noch sind fünfundvierzig Minuten zu spielen.`,
      // Already playing for the win — the calm option is not the same as the
      // one that opens up further, so it is not offered twice.
      options: style === 'offensiv' ? [HOLD, ROCKET, PUSH] : [HOLD, PUSH, ROCKET]
    };
  }
  return {
    minute: 45,
    question: `${us}:${them}. Das wird schwer.`,
    options: [HOLD, PUSH, ROCKET, REST]
  };
}

export function optionById(decision: Decision, id: string): Option | undefined {
  return decision.options.find((o) => o.id === id);
}

/** The swing an option is actually allowed, after the cap. */
export function cappedSwing(option: Option): number {
  return Math.max(-SWING_CAP, Math.min(SWING_CAP, option.swing));
}
