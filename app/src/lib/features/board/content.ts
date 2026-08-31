import { z } from 'zod';
import { cast, type CastId, type CastMember } from '$lib/content/cast';

/**
 * Der Vorstand — trust, and what it is actually measured against.
 *
 * The one decision this file makes, and everything else follows from it:
 *
 * ┌───────────────────────────────────────────────────────────────────────┐
 * │ The board does not grade RESULTS. It grades results against what it   │
 * │ EXPECTED, and what it expected comes from your money.                 │
 * └───────────────────────────────────────────────────────────────────────┘
 *
 * Eighth with the eighth-largest budget is a pass. Eighth with the largest is
 * the beginning of the end. Without that, a manager who wins promotion is safe
 * forever and a manager in the Regionalliga is doomed by arithmetic, and the
 * fourth division stops being playable — which is where this game starts.
 *
 * It is also the satire. A supervisory board with the ninth budget demanding
 * European football is not a joke I had to write; it is the default setting of
 * German club football, and `ambitions` below is where it lives.
 */

/* ─────────────────────────────────────────────────────────────────────────
 * What the board reads
 * ───────────────────────────────────────────────────────────────────────── */

/**
 * The press input is the FEED, not the meter — and this is a change.
 *
 * We had the board reading `press.pressure` as doubt. It cannot: a raid RESOLVES
 * the meter, so the single loudest week in a career would arrive in the
 * boardroom as relief. The Verband's file is private. What a supervisory board
 * actually sees is the newspaper on the table, and the newspaper ran the
 * pictures.
 *
 * So the board reads story weight, at this rate, in both directions — a
 * `cleared` verdict at −14 hands back exactly what the raid at +14 took. The
 * board believes the paper, which is the most realistic thing about it.
 *
 * This is the transmission that makes the two consequences genuinely two: the
 * needle falls and the boardroom still saw the pictures.
 */
export const doubtPerStoryWeight = 0.55;

/**
 * What an OPEN FILE costs the boardroom per matchday, on top of what was printed.
 *
 * Named for what it does rather than for what it is attached to: it is
 * subtracted, like `doubtPerStoryWeight`, and a `trustPerOpenFile` that took
 * trust away would be the second name in this file to mean its own opposite.
 *
 * It exists because the feed carries MOMENTS and an investigation is a standing
 * condition. Without it, eleven quiet matchdays under investigation read in the
 * boardroom as a club that is fine — the papers have moved on, so nothing
 * arrives, so nothing changes, while the Verband is still holding a file with
 * the club's name on it. That is not what a supervisory board is like.
 *
 * Deliberately small enough that it can never compete with a raid: a full
 * season under permanent investigation costs about twelve trust, while one
 * raid's headline costs nearly eight in an afternoon. The file is a weight; the
 * raid is an event. If the weight ever out-argued the event, a player would
 * rationally stop caring which week the ermittler actually came.
 */
export const doubtPerOpenFile = 0.35;

/**
 * Sporting trust and bought trust are not the same substance.
 *
 * `board.trust` is earned per season; `board.floor` is a number seven doctrine
 * nodes buy, below which trust cannot fall. If the screen renders both as
 * "Vorstandsvertrauen +8" then the Diplomatenloge is a training ground with a
 * better icon. One is a result; the other is a reason the result stopped
 * mattering.
 */
export const SOURCES = {
  earned: {
    label: 'Erarbeitet',
    note: 'Der Vorstand ist zufrieden mit dem, was auf dem Platz passiert. Das kann nächste Saison wieder weg sein.'
  },
  floor: {
    label: 'Abgesichert',
    note: 'Unter diesen Wert fällt das Vertrauen nicht mehr. Nicht, weil die Ergebnisse stimmen — sondern weil die Frage nicht mehr gestellt wird.'
  }
} as const;
export type TrustSource = keyof typeof SOURCES;

/* ─────────────────────────────────────────────────────────────────────────
 * Bands
 * ───────────────────────────────────────────────────────────────────────── */

export const BandSchema = z.object({
  id: z.enum(['rueckhalt', 'zufrieden', 'zweifel', 'trainerfrage']),
  /** Lower bound, inclusive. */
  from: z.number().int().min(0).max(100),
  label: z.string(),
  /** Never colour alone: this is the number a player checks in a hurry. */
  mark: z.string(),
  means: z.string(),
  /**
   * What the chairwoman says. She is the one who counts the votes, and her line
   * is always the true one.
   */
  vogt: z.string(),
  /**
   * What the president says. He is warm one band longer than the situation
   * deserves, because that is what presidents are for — and a manager who
   * listens only to him is a manager who is surprised in May. The number is on
   * the same screen, so the player is never misled about the mechanic, only
   * about the tone.
   */
  kuhlmann: z.string()
});
export type Band = z.infer<typeof BandSchema>;

export const bands: Band[] = z.array(BandSchema).parse([
  {
    id: 'rueckhalt',
    from: 70,
    label: 'Rückendeckung',
    mark: '●●',
    means: 'Der Aufsichtsrat verteidigt dich, auch wenn er es nicht müsste. Jetzt ist der Moment für die teuren Entscheidungen.',
    vogt: 'Wir haben uns auf diesen Weg verständigt und wir gehen ihn zu Ende.',
    kuhlmann: 'Ich sage es seit dem ersten Tag: der Mann ist ein Glücksfall für diesen Verein.'
  },
  {
    id: 'zufrieden',
    from: 45,
    label: 'Zufrieden',
    mark: '●',
    means: 'Niemand redet über den Trainer. Der beruhigendste Zustand, den dieser Beruf kennt.',
    vogt: 'Die Entwicklung ist in Ordnung. Wir sehen uns das weiter an.',
    kuhlmann: 'Läuft doch! Was sollen die Fragen?'
  },
  {
    id: 'zweifel',
    from: 20,
    label: 'Zweifel',
    mark: '○',
    means: 'Es wird über dich gesprochen, wenn du nicht im Raum bist. Noch ohne Ergebnis.',
    vogt: 'Wir erwarten in den nächsten Wochen eine Reaktion der Mannschaft.',
    kuhlmann: 'Der Trainer hat mein vollstes Vertrauen.'
  },
  {
    id: 'trainerfrage',
    from: 0,
    label: 'Trainerfrage',
    mark: '△',
    means: 'Die Frage ist gestellt. Der Aufsichtsrat hat bereits Namen auf einem Zettel.',
    vogt: 'Ich werde mich zu Personalspekulationen nicht äußern.',
    kuhlmann: 'Der Trainer hat mein vollstes Vertrauen.'
  }
]);

export function bandFor(trust: number): Band {
  return bands.find((b) => trust >= b.from) ?? bands[bands.length - 1]!;
}

/**
 * Who said it, so the surface can put a face on the line without a lookup table.
 *
 * Resolved at load and thrown on rather than defaulted. An unattributed quote in
 * a boardroom is a system message with quotation marks around it — the whole
 * reason these two exist is that the decision arrives from a person you have
 * been managing badly since the fourth division. A renamed cast key should stop
 * the module, the way the registry stops on a key nobody provides.
 */
function voice(id: CastId): CastMember {
  const member = cast[id];
  if (!member) throw new Error(`board: unbekannte Person "${id}"`);
  return member;
}

export const VOICES: Record<'vogt' | 'kuhlmann', CastMember> = {
  vogt: voice('board'),
  kuhlmann: voice('president')
};

/*
 * "Der Trainer hat mein vollstes Vertrauen" is on TWO bands, word for word.
 *
 * Not an oversight and not a copy-paste. It is the only sentence in German
 * football that means the opposite of itself, and its power comes from being
 * identical in the week it is true and the week it is a countdown. Repeating it
 * verbatim is the joke; varying it would explain the joke.
 */

/* ─────────────────────────────────────────────────────────────────────────
 * Expectation
 * ───────────────────────────────────────────────────────────────────────── */

export const AmbitionSchema = z.object({
  level: z.number().int().min(0),
  /**
   * Where this board believes a club like theirs belongs, as a fraction of the
   * table. 0 is the title, 1 is last.
   */
  target: z.number().min(0).max(1),
  /**
   * How hard that belief pulls the expectation away from what the money says.
   * Highest at the top, because the delusion scales with the boardroom.
   */
  pull: z.number().min(0).max(1),
  /** Below this fraction of the table, it is a failure whatever the budget. */
  disaster: z.number().min(0).max(1),
  /** What the failure is called out loud. */
  disasterWord: z.string()
});
export type Ambition = z.infer<typeof AmbitionSchema>;

export const ambitions: Ambition[] = z.array(AmbitionSchema).parse([
  { level: 0, target: 0.15, pull: 0.35, disaster: 0.85, disasterWord: 'Abstiegskampf' },
  { level: 1, target: 0.2, pull: 0.3, disaster: 0.85, disasterWord: 'Abstiegskampf' },
  { level: 2, target: 0.3, pull: 0.22, disaster: 0.85, disasterWord: 'Abstiegskampf' },
  /*
   * The Regionalliga board has almost no pull, and that is the whole reason a
   * fourth-division career is playable. They want to survive. Give them the
   * same ambition as a Bundesliga supervisory board and the game's opening
   * hours become unwinnable by arithmetic rather than by play.
   */
  { level: 3, target: 0.45, pull: 0.12, disaster: 0.9, disasterWord: 'Abstiegsgefahr' }
]);

export function ambitionFor(level: number): Ambition {
  return ambitions.find((a) => a.level === level) ?? ambitions[ambitions.length - 1]!;
}

/**
 * How much of last May the board still has in mind, when it sets this year's bar.
 *
 * This is what re-prices overachievement, and it must be here rather than in
 * rules because it is a character trait and not a formula detail: a board that
 * forgot every season would let one good year fund a decade, and a board that
 * remembered perfectly would punish a promotion by immediately demanding
 * another one. A third is the amount that makes success feel earned and
 * slightly unfair, which is correct.
 */
export const memoryOfLastSeason = 0.35;

export interface ExpectationInput {
  level: number;
  /** Where the club's budget ranks in its own division. 1 is the richest. */
  budgetRank: number;
  /** Where it finished last season, or null after a promotion or on debut. */
  lastRank: number | null;
  clubs: number;
}

/**
 * The bar, as a table position.
 *
 * Money first, last season second, boardroom vanity third — and clamped to a
 * table position that exists. Deliberately not a hidden score: the number this
 * returns is printed on the screen in so many words, because a manager sacked
 * for missing a target he was never told is the single most resented thing a
 * football game can do.
 */
export function expectedRank(input: ExpectationInput): number {
  const { level, budgetRank, lastRank, clubs } = input;
  const a = ambitionFor(level);

  const base =
    lastRank === null
      ? budgetRank
      : budgetRank * (1 - memoryOfLastSeason) + lastRank * memoryOfLastSeason;

  const target = a.target * clubs;
  const pulled = base - (base - target) * a.pull;

  return Math.max(1, Math.min(clubs, Math.round(pulled)));
}

/**
 * The place below which the season is a failure whatever the bar said.
 *
 * Never above the bar, and that clamp is not a detail. A flat fraction of the
 * table put the fourth division's poorest club on a published target of 17th
 * and a failure line of 16th: the board hands you a goal and sacks you for
 * reaching it. So the disaster line is club-specific and takes the same inputs
 * as the bar — which means the worst-funded club in a division can only fail
 * by finishing last, and that is exactly right.
 */
export function disasterRank(input: ExpectationInput): number {
  const flat = Math.max(1, Math.round(ambitionFor(input.level).disaster * input.clubs));
  return Math.max(flat, expectedRank(input));
}

/**
 * Did this finish count as a disaster?
 *
 * Exported so nothing has to decide whether the line is inclusive. Writing the
 * comparison out twice is how a manager gets dismissed for the exact place his
 * board asked him to reach, and an off-by-one in a sacking is not a rounding
 * error — it is the single most resented thing this game could do.
 */
export function isDisaster(rank: number, input: ExpectationInput): boolean {
  return rank > disasterRank(input);
}

/**
 * The demand, in words, DERIVED from the number rather than written beside it.
 *
 * Two sources for one promise is how the doctrine order ended up wrong and how
 * the campus sold containers it had already drawn. The board says "Aufstieg"
 * because the expectation is a promotion place, never because a table in this
 * file says level 1 boards want promotion.
 */
export function demandFor(expected: number, clubs: number, promotionPlaces = 2): string {
  if (expected === 1) return 'Meisterschaft';
  if (expected <= promotionPlaces) return 'Aufstieg';
  if (expected <= Math.max(3, Math.round(clubs * 0.2))) return 'Aufstiegsrennen';
  if (expected <= Math.round(clubs * 0.35)) return 'Oberes Tabellendrittel';
  if (expected <= Math.round(clubs * 0.6)) return 'Gesichertes Mittelfeld';
  return 'Klassenerhalt';
}

/* ─────────────────────────────────────────────────────────────────────────
 * Numbers
 * ───────────────────────────────────────────────────────────────────────── */

export const BoardContentSchema = z.object({
  /** Where a new manager starts. Benefit of the doubt, and not much of it. */
  startingTrust: z.number().min(0).max(100),
  /**
   * Trust per place ABOVE the bar, at season end. Smaller than the penalty,
   * because a board rewards less than it punishes and then quietly raises the
   * bar — see `memoryOfLastSeason`, which charges you for it a second time.
   */
  perRankOver: z.number().min(0),
  /** Trust per place BELOW the bar, at season end. */
  perRankUnder: z.number().min(0),
  /** Cap on the whole season verdict, either way. One year cannot end the story twice. */
  seasonCap: z.number().min(0),
  /**
   * Drift per place away from the bar, per matchday.
   *
   * Small on purpose. The board meets four times a year; this is the corridor
   * talk in between, and it exists so the screen is worth opening in November
   * rather than being a page that changes once every May.
   */
  perMatchdayPerRank: z.number().min(0),
  /** Cap on that drift per matchday, so one wild table swing is not a verdict. */
  matchdayCap: z.number().min(0),
  /** Promotion, on top of the verdict. Relegation is worth more than promotion. */
  promotionBonus: z.number().min(0),
  relegationPenalty: z.number().min(0),
  /** Below this the board says it out loud and sets a survival target. */
  ultimatumAt: z.number().min(0).max(100),
  /** The ultimatum runs this many matchdays. Missing it ends the job. */
  ultimatumMatchdays: z.number().int().min(1)
});
export type BoardContent = z.infer<typeof BoardContentSchema>;

export const boardContent: BoardContent = BoardContentSchema.parse({
  startingTrust: 60,
  perRankOver: 4,
  perRankUnder: 5,
  seasonCap: 30,
  perMatchdayPerRank: 0.12,
  matchdayCap: 0.6,
  promotionBonus: 15,
  relegationPenalty: 30,
  ultimatumAt: 20,
  ultimatumMatchdays: 8
});

/**
 * Zero is the sack, and nothing else is.
 *
 * A separate probability roll for dismissal would make the trust number
 * decorative — the player would learn that the meter is a suggestion and that
 * the real rule is invisible, which is the prototype's raid problem in a
 * different costume. One visible number, one threshold, and an ultimatum
 * before it so the last stretch is playable rather than merely observed.
 */
export const SACK_AT = 0;

export const copy = {
  title: 'Vorstand',
  trust: 'Vertrauen',
  demand: 'Saisonziel',
  expectation: 'Erwarteter Tabellenplatz',
  /** Under the gauge, always, because the bar is the mechanic. */
  measured:
    'Der Vorstand bewertet nicht den Platz, sondern den Platz im Verhältnis zum Etat. Achter mit dem achtgrößten Etat ist in Ordnung. Achter mit dem größten ist ein Problem.',
  ultimatum:
    'Der Aufsichtsrat hat ein Ziel gesetzt. Wird es verfehlt, endet die Zusammenarbeit.',
  /** When a doctrine floor has made the sack impossible. */
  secured:
    'Das Vertrauen kann nicht mehr unter diesen Wert fallen. Die Trainerfrage wird in diesem Verein nicht mehr gestellt.',
  floorLabel: 'Abgesichert bis'
} as const;
