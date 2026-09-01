import { z } from 'zod';

/**
 * Der Champions Cup — eight clubs, two groups, and the only trophy in the game
 * a fourth-division manager can spend a whole career failing to reach.
 *
 * Ported from `europeTournament` in the prototype, with three things changed on
 * purpose. Two of them are the reason this file exists at all.
 *
 * ┌───────────────────────────────────────────────────────────────────────┐
 * │ 1. The prototype's semi-finals were HARDCODED.                        │
 * │                                                                       │
 * │    `{ home: a1, away: b2, homeGoals: 2, awayGoals: 1, winner: a1 }`   │
 * │    — the same scoreline, the same winner, every season. The second    │
 * │    semi always went to the group runner-up, so topping group B was    │
 * │    strictly worse than finishing second in it.                        │
 * │                                                                       │
 * │ 2. The final was not PLAYED.                                          │
 * │                                                                       │
 * │    `weWin = (final1 === us || final2 === us)`. Reaching the final was │
 * │    winning the final, and the scoreline was the literal string        │
 * │    "3 : 1". A trophy that cannot be lost is not a trophy, it is a     │
 * │    receipt for having qualified.                                      │
 * └───────────────────────────────────────────────────────────────────────┘
 *
 * Neither is fixable from content, so neither is fixed here — but this file is
 * shaped so that a rules implementation which kept them would fail its own
 * tests: `KNOCKOUT` declares ties to be played, not results to be printed.
 *
 * The third change is mine and is a straight call: the prototype's eight clubs
 * were Real Madrid, Manchester City, FC Bayern, Paris SG, Inter Mailand, FC
 * Barcelona and Arsenal. Every other name in this game is invented — the German
 * pyramid is generated from real cities and made-up prefixes, and the fifty-five
 * brands are all parody. Seven real trademarks in the one competition the player
 * spends a career chasing would be the only place the joke stops, and it would
 * stop at the most important moment in the game.
 *
 * So: real cities, invented clubs, same as the Bundesliga list. A German club is
 * deliberately NOT among them — the pyramid generates its own, and a fixed
 * "FC Bayern" in Europe that never appears in the league table the player is
 * climbing would be a hole with a famous name in it.
 */

/* ─────────────────────────────────────────────────────────────────────────
 * The eight
 * ───────────────────────────────────────────────────────────────────────── */

export const EuroClubSchema = z.object({
  id: z.string().min(2),
  name: z.string().min(3),
  /** Real city, invented club. The convention the German pyramid already uses. */
  city: z.string().min(3),
  country: z.string().min(2),
  /**
   * Base strength. The prototype rolled 84–89 for all eight, which made them
   * interchangeable: there was no such thing as a good draw or a bad one, and
   * the group stage was six coin flips with names attached.
   */
  strength: z.number().int().min(70).max(99)
});
export type EuroClub = z.infer<typeof EuroClubSchema>;

/**
 * The seven who are always there, hardest first.
 *
 * A spread of eleven points rather than the prototype's flat five, so the draw
 * means something the moment it is made. Landing Real Castilla in your group is
 * a different season from landing Sporting Belém, and a player should be able
 * to feel that before a ball is kicked.
 */
export const euroClubs: EuroClub[] = z.array(EuroClubSchema).parse([
  { id: 'castilla', name: 'Real Castilla', city: 'Madrid', country: 'Spanien', strength: 91 },
  { id: 'albion', name: 'Manchester Albion', city: 'Manchester', country: 'England', strength: 89 },
  { id: 'lombardia', name: 'AC Lombardia', city: 'Mailand', country: 'Italien', strength: 87 },
  { id: 'racing', name: 'Racing Paris', city: 'Paris', country: 'Frankreich', strength: 86 },
  { id: 'amstel', name: 'AFC Amstel', city: 'Amsterdam', country: 'Niederlande', strength: 83 },
  { id: 'belem', name: 'Sporting Belém', city: 'Lissabon', country: 'Portugal', strength: 82 },
  { id: 'besiktepe', name: 'Beşiktepe SK', city: 'Istanbul', country: 'Türkei', strength: 80 }
]);

/**
 * Who takes the eighth place when the player did not qualify.
 *
 * The tournament runs either way, which is the prototype's own decision and a
 * good one: a competition that only exists in the seasons you are in it is a
 * screen that appears and disappears, and the player never builds a sense of
 * who these clubs are. Watching Mersey City win it twice while you are stuck in
 * the third division is what makes qualifying mean something.
 */
export const standIn: EuroClub = EuroClubSchema.parse({
  id: 'mersey',
  name: 'Mersey City',
  city: 'Liverpool',
  country: 'England',
  strength: 85
});

export const clubById = new Map(
  [...euroClubs, standIn].map((c) => [c.id, c] as const)
);

/* ─────────────────────────────────────────────────────────────────────────
 * The calendar
 * ───────────────────────────────────────────────────────────────────────── */

export const EuropeContentSchema = z
  .object({
    /** Clubs per group. Two groups of this size fill the tournament. */
    groupSize: z.number().int().min(2),
    /**
     * League matchdays the group games are played on. The prototype's own
     * spacing, kept: every fourth matchday, clear of the cup rounds at 4, 12,
     * 20, 28 and 34 so a club is never asked to play twice in one week.
     */
    groupMatchdays: z.array(z.number().int().min(1)).min(2),
    semiMatchday: z.number().int().min(1),
    finalMatchday: z.number().int().min(1),
    /**
     * Prize money, and the one number in this file most likely to be wrong.
     *
     * Europe is reachable only from the top division, so these sit an order
     * above the cup's ladder (€25.000 to €550.000) without the same worry — a
     * first-division club is not a Regionalliga club with a bigger balance.
     *
     * The prototype paid €1.500.000 per group win, €8.000.000 for reaching the
     * semis and €25.000.000 for the trophy, against a promotion bonus of
     * €1.500.000. That made Europe roughly sixteen times a promotion and the
     * only thing in the game worth optimising for. These keep the shape — a
     * group win is a good week, the trophy is a decade — while leaving the
     * league the thing you actually manage.
     */
    groupWin: z.number().min(0),
    groupDraw: z.number().min(0),
    reachSemi: z.number().min(0),
    reachFinal: z.number().min(0),
    win: z.number().min(0)
  })
  .refine((c) => c.semiMatchday > Math.max(...c.groupMatchdays), {
    message: 'the semi-final must come after every group game',
    path: ['semiMatchday']
  })
  .refine((c) => c.finalMatchday > c.semiMatchday, {
    message: 'the final must come after the semi-final',
    path: ['finalMatchday']
  })
  .refine((c) => c.win > c.reachFinal && c.reachFinal > c.reachSemi, {
    /*
     * Winning must pay more than losing the final, which must pay more than
     * losing the semi. Obvious, and worth a refine: the prototype paid
     * €8.000.000 for reaching the last four and nothing at all for losing the
     * final, so a beaten finalist earned exactly what a beaten semi-finalist
     * earned and the second-biggest night of a career was worth zero.
     */
    message: 'the prize ladder must reward getting further',
    path: ['win']
  })
  .refine((c) => new Set(c.groupMatchdays).size === c.groupMatchdays.length, {
    message: 'a group matchday is listed twice',
    path: ['groupMatchdays']
  });
export type EuropeContent = z.infer<typeof EuropeContentSchema>;

export const europeContent: EuropeContent = EuropeContentSchema.parse({
  groupSize: 4,
  groupMatchdays: [3, 7, 11, 15, 19, 23],
  semiMatchday: 27,
  finalMatchday: 31,
  groupWin: 600_000,
  groupDraw: 200_000,
  reachSemi: 2_500_000,
  reachFinal: 4_000_000,
  win: 8_000_000
});

/**
 * Who plays whom, by group matchday.
 *
 * Indices into a group of four. Three fixtures cover a single round-robin, and
 * the six group matchdays run it twice — home and away, which is why the
 * pattern repeats rather than extending: matchdays 4 to 6 are the reverse of
 * 1 to 3, and `rules` swaps the venue.
 *
 * Written out rather than derived with `index % 3`, because the modulo version
 * is correct and unreadable, and the first thing anybody asks of this table is
 * "does everyone play everyone" — a question a literal table answers by being
 * looked at, and the test below answers for certain.
 */
export const GROUP_ROUNDS: readonly (readonly [number, number][])[] = [
  [[0, 1], [2, 3]],
  [[0, 2], [1, 3]],
  [[0, 3], [1, 2]]
];

/**
 * The knockout, declared as TIES rather than as results.
 *
 * This is the shape the prototype did not have. Its semi-finals were two object
 * literals with the winners already in them, so no implementation was ever
 * asked to play them. A pairing that names two slots and no scoreline cannot be
 * satisfied by printing a result.
 */
export const KNOCKOUT = {
  semis: [
    { home: { group: 'A', place: 1 }, away: { group: 'B', place: 2 } },
    { home: { group: 'B', place: 1 }, away: { group: 'A', place: 2 } }
  ],
  /** The winners of the two semis, whoever they turn out to be. */
  final: { home: { semi: 0 }, away: { semi: 1 } }
} as const;

export const copy = {
  title: 'Champions Cup',
  groups: 'Gruppenphase',
  knockout: 'K.-o.-Runde',
  /** When the club is not in it, which for most of a career is the case. */
  watching:
    'Dein Verein ist nicht qualifiziert. Der Wettbewerb wird trotzdem gespielt — irgendwann stehst du hier drin.',
  qualified: 'Qualifiziert. Sechs Gruppenspiele, dann wird es kurz.',
  /** Under the prize table. */
  prizes:
    'Die Prämien gelten für jedes Spiel und jede erreichte Runde. Politik-Knoten im Wissensbaum erhöhen sie — das ist der einzige Ort, an dem sich diese fünf Knoten auszahlen.',
  noSemi: 'Halbfinale steht noch nicht fest.',
  noFinal: 'Finale steht noch nicht fest.'
} as const;
