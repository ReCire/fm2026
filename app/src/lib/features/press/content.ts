import { z } from 'zod';

/**
 * Ermittlungsdruck — what the dirty half of the tree costs you.
 *
 * Not media temperature. The meter does not rise because you lost; it rises
 * because of what you have been doing, and nine of the thirteen nodes that
 * touch it RAISE it — the Schattenkabinett, the Diplomatenloge, and every
 * shadow synthesis. Four lower it, and three of those four are media
 * operations. So this is not something a doctrine buys. It is the bill.
 *
 * ┌───────────────────────────────────────────────────────────────────────┐
 * │ One meter, two consequences.                                          │
 * │                                                                       │
 * │ The board reads it as DOUBT. The Verband reads it as PROBABLE CAUSE.  │
 * │ A club can be loved and raided, or clean and sacked, and those are     │
 * │ different failures because they come from different places.            │
 * └───────────────────────────────────────────────────────────────────────┘
 *
 * Which makes the Schattenkabinett a real bargain rather than a free lunch
 * with sinister lore: every envelope raises the temperature, the temperature
 * costs you the job, and Medien-Training and a friendly Dachverband are how
 * you survive having taken the envelopes. The buyer of silence is always the
 * manager who already did the thing.
 */

/* ─────────────────────────────────────────────────────────────────────────
 * Bands
 * ───────────────────────────────────────────────────────────────────────── */

export const BandSchema = z.object({
  id: z.enum(['sauber', 'auffaellig', 'akte', 'razzia']),
  /** Lower bound, inclusive. */
  from: z.number().int().min(0).max(100),
  label: z.string(),
  /**
   * A glyph, because the band must never be carried by colour alone — this is
   * the number a player checks in a hurry, and four shades of amber is not a
   * channel.
   */
  mark: z.string(),
  /** What this reading actually means for the club. */
  means: z.string()
});
export type Band = z.infer<typeof BandSchema>;

export const bands: Band[] = z.array(BandSchema).parse([
  {
    id: 'razzia',
    from: 70,
    label: 'Razzia möglich',
    mark: '▲▲',
    means:
      'Es ist keine Frage mehr, ob jemand nachsieht, sondern wann. Der Justiziar hat die Ordner schon sortiert.'
  },
  {
    id: 'akte',
    from: 45,
    label: 'Akte offen',
    mark: '▲',
    means:
      'Beim Verband liegt etwas mit deinem Vereinsnamen darauf. Es passiert nichts — bis es passiert.'
  },
  {
    id: 'auffaellig',
    from: 25,
    label: 'Auffällig',
    mark: '■',
    means:
      'Ab hier schaut jemand hin. Jeder Spieltag ist ein Wurf darauf, ob diesmal jemand genauer hinsieht.'
  },
  {
    id: 'sauber',
    from: 0,
    label: 'Unauffällig',
    mark: '▽',
    means: 'Nichts, was jemanden interessiert. Der billigste Zustand, den ein Verein haben kann.'
  }
]);

export function bandFor(pressure: number): Band {
  return bands.find((b) => pressure >= b.from) ?? bands[bands.length - 1]!;
}

/**
 * Below this, nobody opens a file. Content rather than a rule so the surface
 * and the tick cannot disagree about where the danger starts.
 */
export const INVESTIGATION_FROM = 25;

/* ─────────────────────────────────────────────────────────────────────────
 * The feed
 * ───────────────────────────────────────────────────────────────────────── */

/**
 * Why something was written.
 *
 * `weight` is what it adds to the meter — and most of these are ZERO.
 *
 * The feed and the meter are deliberately not the same thing. A defeat gets
 * written about and does not make the Verband curious; an envelope makes the
 * Verband curious whether or not anybody writes about it. Keeping the colour
 * in the feed at weight zero is what stops a clean manager opening an empty
 * screen for a whole career — which is the mistake we have now made twice with
 * badges nobody could earn and departments nobody could delegate.
 */
export const CAUSES = [
  'suspicion',
  'raid',
  'fine',
  'cleared',
  'defeat',
  'thrashing',
  'streak',
  'promotion',
  'quiet'
] as const;
export type Cause = (typeof CAUSES)[number];

export const HeadlineSchema = z.object({
  cause: z.enum(CAUSES),
  /** `{club}`, `{opponent}`, `{n}` and `{sum}` are filled at write time. */
  text: z.string().min(10),
  /**
   * Added to the meter. Zero for anything that is only football — and zero for
   * every `suspicion` headline, which is the part worth reading twice.
   *
   * A suspicion story is a REPORT of something the player was already quoted a
   * number for: a doctrine node's "+3 Ermittlungsdruck", or the price of a
   * sabotage. Press writes it into the feed weighing what was actually done, so
   * a weight here as well would be charged on top — which is exactly what it
   * was doing, turning an advertised +18 into a needle that moved 25.
   *
   * Templates rather than generated prose: a headline is a joke with a fixed
   * rhythm, and the rhythm is what makes it read as a headline rather than as
   * a sentence about football.
   */
  weight: z.number().int(),
  /**
   * How big a thing this sentence is about, for `suspicion` only.
   *
   * A separate field rather than reusing `weight`, because one field with two
   * meanings is the failure this whole change is fixing. `weight` answers "what
   * did this do to the meter"; `severity` answers "how loud a sentence is
   * this". Beraterhonorare and a Parkhaus voucher are not the same news, and
   * the amount is what decides which one runs.
   */
  severity: z.number().int().min(1).optional()
});
export type Headline = z.infer<typeof HeadlineSchema>;

export const headlines: Headline[] = z.array(HeadlineSchema).min(24).parse([
  // ── Verdacht. Das Einzige, was den Zeiger bewegt. ──────────────────────
  { cause: 'suspicion', text: 'Beraterhonorare bei {club}: die Zahlen und die Lücken', weight: 0, severity: 5 },
  { cause: 'suspicion', text: 'Verband prüft Vorgänge bei {club}', weight: 0, severity: 6 },
  { cause: 'suspicion', text: 'Anonyme Quelle: „Da läuft etwas, das nicht laufen sollte."', weight: 0, severity: 6 },
  { cause: 'suspicion', text: 'Was wusste der Trainer? Und ab wann?', weight: 0, severity: 7 },
  { cause: 'suspicion', text: 'Wer ist eigentlich die Gesellschaft, der euer Trainingsgelände gehört?', weight: 0, severity: 7 },
  { cause: 'suspicion', text: 'Ein Parkhaus, ein Umschlag, und viele offene Fragen', weight: 0, severity: 8 },

  // ── Razzia. Der Moment, in dem beide Konsequenzen sich berühren. ───────
  { cause: 'raid', text: 'RAZZIA bei {club}: Ermittler tragen Kisten aus der Geschäftsstelle', weight: 12 },
  { cause: 'raid', text: 'Sieben Uhr morgens, und vor dem Vereinsheim stehen Kamerateams', weight: 14 },
  { cause: 'raid', text: '„Wir kooperieren vollumfänglich" — {club} zur Durchsuchung', weight: 10 },

  { cause: 'fine', text: 'Verband verhängt {sum} gegen {club}', weight: 4 },
  { cause: 'fine', text: 'Geldstrafe für {club}: teuer, aber nicht das Teuerste daran', weight: 5 },

  // ── Freigesprochen. Der einzige Weg nach unten, der nicht Zeit heißt. ──
  { cause: 'cleared', text: 'Verfahren gegen {club} eingestellt. Kein Kommentar von irgendwem.', weight: -14 },
  { cause: 'cleared', text: 'Alles rechtens, sagt der Verband. Alles rechtens, sagt der Verein.', weight: -12 },

  /*
   * Everything below carries weight 0.
   *
   * It is what the papers print in a week when nothing is wrong, and it is the
   * reason this screen is worth opening for a manager who has never done
   * anything. Take it out and Presse is an empty page for most careers.
   */
  { cause: 'defeat', text: 'Wieder nichts: {club} verliert bei {opponent}', weight: 0 },
  { cause: 'defeat', text: '„Wir haben die Situation im Griff" — hat er das wirklich gesagt?', weight: 0 },
  { cause: 'defeat', text: 'Zuschauer verlassen das Stadion in der 70. Minute', weight: 0 },
  { cause: 'defeat', text: 'Kein Plan, kein Punkt: die Fragen nach der Niederlage bei {opponent}', weight: 0 },

  { cause: 'thrashing', text: '{n} Gegentore. Das ist keine Niederlage mehr, das ist eine Auskunft.', weight: 0 },
  { cause: 'thrashing', text: 'Debakel bei {opponent}: Wie lange noch?', weight: 0 },

  { cause: 'streak', text: '{n} Spiele ungeschlagen: plötzlich reden alle über {club}', weight: 0 },
  { cause: 'streak', text: 'Der Trainer, über den vor vier Wochen niemand ein gutes Wort verlor', weight: 0 },
  { cause: 'streak', text: 'Auswärtssieg bei {opponent} — und keiner hatte damit gerechnet', weight: 0 },

  { cause: 'promotion', text: 'AUFSTIEG! Und der Mann, der gesagt hat, es geht nicht?', weight: 0 },
  { cause: 'promotion', text: 'Was für eine Saison. {club} ist oben.', weight: 0 },

  { cause: 'quiet', text: 'Wie geht es eigentlich der Rasenheizung von {club}?', weight: 0 },
  { cause: 'quiet', text: 'Kolumne: Warum Fußball früher besser war (Teil {n})', weight: 0 },
  { cause: 'quiet', text: 'Torwarttrainer im Interview: „Wir arbeiten."', weight: 0 },
  { cause: 'quiet', text: 'Platzwart seit 31 Jahren: „Ich habe hier alles gesehen."', weight: 0 }
]);

/**
 * Which causes can move the meter. The screen uses this to mark them.
 *
 * DECLARED rather than derived from the weights, and that changed with the
 * suspicion fix: every suspicion headline now carries weight 0 in content while
 * still being the only cause a player can deliberately cause, so deriving this
 * from the table would quietly drop it and the feed would stop marking the one
 * line the player paid for.
 *
 * A design fact deserves to be stated, and the tests below check the table
 * against it in both directions rather than the other way round.
 */
export const WEIGHTED: ReadonlySet<Cause> = new Set<Cause>([
  'suspicion', 'raid', 'fine', 'cleared'
]);

/**
 * Suspicion headlines, mildest first.
 *
 * Ordered here rather than at the call site so the six sentences have exactly
 * one authority on which of them is the loudest.
 */
const suspicionLadder: readonly Headline[] = headlines
  .filter((h) => h.cause === 'suspicion')
  .sort((a, b) => (a.severity ?? 0) - (b.severity ?? 0));

/**
 * Where a suspicion stops being paperwork and starts being a car park.
 *
 * Sized against what actually reaches the meter: a doctrine node contributes 3
 * or 4, and a serious sabotage runs to the high teens. Below `quiet` is the
 * cost of doing business; above `loud` is a thing somebody will remember.
 */
export const suspicionScale = { quiet: 5, loud: 14 } as const;

/**
 * Which sentences fit a movement of this size.
 *
 * Returns candidates rather than one headline, so the RNG stays in rules where
 * the seed lives — the same split as `pickHeadline`. An 18-point sabotage
 * should read as a Parkhaus and an envelope; a +3 node should read as consultancy
 * fees with gaps in them. A flat draw across all six made the loudest purchase
 * in the game announce itself as a filing query two thirds of the time.
 */
export function suspicionCandidates(amount: number): readonly Headline[] {
  const n = suspicionLadder.length;
  const third = Math.max(1, Math.round(n / 3));
  if (amount <= suspicionScale.quiet) return suspicionLadder.slice(0, third);
  if (amount >= suspicionScale.loud) return suspicionLadder.slice(n - third);
  const middle = suspicionLadder.slice(third, n - third);
  return middle.length > 0 ? middle : suspicionLadder;
}

/* ─────────────────────────────────────────────────────────────────────────
 * Numbers
 * ───────────────────────────────────────────────────────────────────────── */

export const PressContentSchema = z.object({
  /**
   * How much of the meter bleeds off each matchday.
   *
   * The most important number in the file. Too fast and a scandal is forgotten
   * before the board notices, which makes the whole Schattenkabinett free; too
   * slow and one season of envelopes ends a career that cannot recover.
   */
  decayPerMatchday: z.number().min(0).max(1),
  /** Euro per point of pressure when a fine lands. */
  finePerPoint: z.number().int().min(0),
  /** Goals conceded before a defeat is written up as a hiding. */
  thrashingAt: z.number().int().min(1),
  /** Winless run before it is a story. */
  winlessAt: z.number().int().min(1),
  /** Unbeaten run before it is a story the other way. */
  streakAt: z.number().int().min(1),
  /** How many headlines the feed keeps. */
  feedLength: z.number().int().min(1)
});
export type PressContent = z.infer<typeof PressContentSchema>;

export const pressContent: PressContent = PressContentSchema.parse({
  /*
   * Zero baseline, unlike a media meter. A club that has done nothing is not
   * under investigation at a low level — it is not under investigation.
   */
  decayPerMatchday: 0.08,
  finePerPoint: 1_200,
  thrashingAt: 4,
  winlessAt: 5,
  streakAt: 4,
  feedLength: 12
});

/**
 * The two ways the needle comes down, which are not the same thing.
 *
 * A Schattenkabinett node and a Kurvenrepublik node can both reduce the meter.
 * If the screen renders both as "−3 Presse-Druck" then the two doctrines are
 * one doctrine with different icons.
 *
 * Both are bought by a manager who has already done something — that is the
 * part I had backwards. Nobody buys silence about a thing that did not happen.
 */
export const QUIET = {
  suppressed: {
    label: 'Es wird nicht geschrieben',
    note: 'Jemand hat mit jemandem gesprochen. Die Geschichte existiert, sie erscheint nur nicht.'
  },
  goodwill: {
    label: 'Es wird freundlich geschrieben',
    note: 'Die Geschichte erscheint, und sie ist auf deiner Seite. Das ist etwas anderes als Stille.'
  }
} as const;
export type QuietKind = keyof typeof QUIET;

export const copy = {
  title: 'Presse',
  gauge: 'Ermittlungsdruck',
  feed: 'Was geschrieben wurde',
  /** A brand-new career, and the correct state to be in. */
  empty: 'Noch hat niemand über dich geschrieben. Das ist der beste Zustand, den es gibt.',
  /** Under the gauge when the needle is at zero. */
  clean: 'Gegen diesen Verein liegt nichts vor.',
  /** Under the gauge once a file could be opened. */
  exposed:
    'Ab 25 % prüft der Verband an jedem Spieltag, ob er genauer hinsieht. Die Strafe wächst mit dem Ausschlag.',
  /** When a doctrine node has made investigations impossible. */
  immune: 'Es wird keine Akte mehr geöffnet. Warum, steht in keinem Protokoll.'
} as const;
