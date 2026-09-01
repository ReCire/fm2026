import { levelName } from './rules';

/**
 * What a season WAS, in one word, and how loudly to say it.
 *
 * The screen must not compute this. It is the third time today the rule has
 * applied and the clearest case for it: the interesting outcomes — a playoff
 * survived, a first European place — are the ones that are hardest to reach in
 * a live save, so a classification living in a `$derived` is a set of branches
 * nobody will ever see render before a player does.
 *
 * ┌───────────────────────────────────────────────────────────────────────┐
 * │ Two axes, not one.                                                    │
 * │                                                                       │
 * │ `volume` is how much room it gets. `tone` is how it feels. They come  │
 * │ apart at exactly one place and that place matters: RELEGATION is as   │
 * │ loud as promotion and is not a celebration.                           │
 * │                                                                       │
 * │ Collapsed into a single "importance" number, the screen would either  │
 * │ throw confetti at a relegation or bury it in a line of grey text, and │
 * │ both are worse than a plain sentence.                                 │
 * └───────────────────────────────────────────────────────────────────────┘
 *
 * And the sixth case is most seasons: eleventh, nothing happened, and the
 * screen should be brief and not pretend otherwise. A celebration that fires at
 * the same volume for mid-table is a celebration nobody believes the next time.
 */

/**
 * The facts a classification needs, structurally.
 *
 * Deliberately narrower than `SeasonReview` so this file does not have to
 * change when a field is added to it, and so the tests can construct a case in
 * four lines rather than sixteen.
 */
export interface ReviewFacts {
  /** The division just PLAYED. 0 is the top. */
  level: number;
  rank: number;
  champion: boolean;
  promoted: boolean;
  relegated: boolean;
  europe: boolean;
  playoff: { won: boolean; direction: 'up' | 'down' } | null;
}

export const OUTCOMES = [
  'meisterschaft',
  'meister',
  'aufstiegRelegation',
  'aufstieg',
  'europa',
  'klassenerhalt',
  'abstieg',
  'saison'
] as const;
export type Outcome = (typeof OUTCOMES)[number];

export type Tone = 'triumph' | 'freude' | 'erleichterung' | 'bitter' | 'neutral';

export interface Celebration {
  outcome: Outcome;
  /** 0 is a line of text, 3 is the whole screen. */
  volume: 0 | 1 | 2 | 3;
  tone: Tone;
  /** The word, as large as the volume allows. */
  headline: string;
  /** One sentence under it. Never a number the headline already gave. */
  line: string;
}

/**
 * Classify. First match wins, and the order is the design.
 *
 * The one case worth arguing about is `europa`, which was not in the original
 * list of five: a club that finishes third in the first division is not
 * champion, cannot be promoted, and is not relegated — so every rule above it
 * says "nothing happened, be brief", and qualifying for Europe for the first
 * time in a club's history would have arrived as a grey line about eleventh
 * place. That is the same shape as a badge nobody can earn: the moment exists
 * in the data and no surface says it.
 */
export function celebrate(r: ReviewFacts): Celebration {
  const division = levelName(r.level);

  // A first-division title is not a bigger version of a third-division title.
  // It is the end of the ladder, and nothing else in the game is.
  if (r.champion && r.level === 0) {
    return {
      outcome: 'meisterschaft',
      volume: 3,
      tone: 'triumph',
      headline: 'DEUTSCHER MEISTER',
      line: 'Es gibt nichts mehr über dieser Liga. Nur noch die Frage, ob es sich wiederholen lässt.'
    };
  }

  if (r.champion) {
    return {
      outcome: 'meister',
      volume: 3,
      tone: 'triumph',
      headline: `MEISTER DER ${division.toUpperCase()}`,
      line: 'Erster. Nicht durchgerutscht, nicht in der Relegation — vorne durchmarschiert.'
    };
  }

  /*
   * Promoted through the playoff, and it gets the same volume as an automatic
   * promotion for a reason: over two legs against a division above, it is the
   * harder of the two and the one with the better story. What it does not get
   * is the same WORD — "Aufstieg" and "Aufstieg über die Relegation" are
   * different sentences and a player who lived through the second one will
   * notice if the game shrugs and calls it the first.
   */
  if (r.promoted && r.playoff?.won) {
    return {
      outcome: 'aufstiegRelegation',
      volume: 3,
      tone: 'freude',
      headline: 'AUFSTIEG ÜBER DIE RELEGATION',
      line: 'Zwei Spiele, ein Gesamtergebnis, und ab jetzt sagt niemand mehr, es sei glücklich gewesen.'
    };
  }

  if (r.promoted) {
    return {
      outcome: 'aufstieg',
      volume: 3,
      tone: 'freude',
      headline: 'AUFGESTIEGEN',
      line: `Die ${division} ist abgehakt. Nächste Saison eine Liga höher.`
    };
  }

  if (r.europe) {
    return {
      outcome: 'europa',
      volume: 2,
      tone: 'freude',
      headline: 'EUROPAPOKAL ERREICHT',
      line: `Platz ${r.rank}. Nächste Saison spielt dieser Verein international.`
    };
  }

  /*
   * Survived it. Relief is not joy and the copy must not confuse the two — a
   * club that has just spent two legs finding out whether it still exists at
   * this level does not want to be congratulated.
   */
  if (r.playoff && r.playoff.direction === 'down' && r.playoff.won && !r.relegated) {
    return {
      outcome: 'klassenerhalt',
      volume: 2,
      tone: 'erleichterung',
      headline: 'KLASSE GEHALTEN',
      line: 'Die Relegation überstanden. Gefeiert wird trotzdem, und niemand redet darüber, wie knapp es war.'
    };
  }

  /*
   * As loud as a promotion, and not a celebration. This is the whole reason
   * `volume` and `tone` are separate fields.
   */
  if (r.relegated) {
    return {
      outcome: 'abstieg',
      volume: 3,
      tone: 'bitter',
      headline: 'ABGESTIEGEN',
      line: `Platz ${r.rank} in der ${division}. Nächste Saison eine Liga tiefer, mit diesem Kader und diesen Verträgen.`
    };
  }

  return {
    outcome: 'saison',
    volume: 0,
    tone: 'neutral',
    headline: `Saison beendet — Platz ${r.rank}`,
    line: `${division}, die Klasse gehalten. Kein Aufstieg, kein Abstieg, keine Geschichte.`
  };
}

/** Whether this is worth taking over the screen for at all. */
export function isMoment(c: Celebration): boolean {
  return c.volume >= 2;
}
