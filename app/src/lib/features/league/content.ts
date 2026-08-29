import { z } from 'zod';

/**
 * League content: every number the pyramid depends on.
 *
 * The prototype scattered these through `initLeagues()`, `simulateFullSeason()`
 * and `concludeSeasonAndAdvance()` as literals — `82 - (l * 10)`, `myRank <= 2`,
 * `myRank >= 16`, `+ 1500000`. Here they are one validated table, so the balance
 * of the pyramid can be edited, diffed and reverted without touching a formula.
 */

export const LeagueLevelSchema = z.object({
  /** Shown in the header, the nav and every promotion message. */
  name: z.string().min(1),
  /**
   * Strength floor for a generated club in this division. The prototype used
   * `82 - level * 10`; the ten-point gap between divisions is what makes a
   * promotion feel like a step up rather than a rename.
   */
  baseStrength: z.number().int().min(1).max(99)
});
export type LeagueLevel = z.infer<typeof LeagueLevelSchema>;

export const LeagueContentSchema = z
  .object({
    /** Top to bottom. Index 0 is the first division; the player starts at the last. */
    levels: z.array(LeagueLevelSchema).min(2),
    /** The division the player's club starts in. */
    startLevel: z.number().int().min(0),

    /**
     * Clubs per division. Must be even: the round-robin below pairs every team
     * in every round and has no bye slot, so an odd count would silently drop
     * a club from the schedule (it did exactly that in the prototype).
     */
    teamsPerLevel: z.number().int().min(2),
    /** Strength window above `baseStrength`, so a division is not uniform. */
    strengthSpread: z.number().int().min(1),

    pointsForWin: z.number().int().min(0),
    pointsForDraw: z.number().int().min(0),
    pointsForLoss: z.number().int().min(0),

    /** Clubs going up from every division below the first. */
    promotionPlaces: z.number().int().min(0),
    /** Clubs going down from every division above the last. */
    relegationPlaces: z.number().int().min(0),
    /** Places in the first division that qualify for Europe. */
    europePlaces: z.number().int().min(0),

    /** Paid to the club's account the moment promotion is confirmed. */
    promotionBonus: z.number().min(0),

    /**
     * Goal model, ported verbatim from `simulateFullSeason()`:
     *   goals = floor(rng * goalBase + max(0, strengthEdge) * strengthGoalFactor)
     */
    goalBase: z.number().min(0),
    strengthGoalFactor: z.number().min(0).max(1),
    /** Strength added to the home side. `calcTeamStrength(true)` used +3. */
    homeAdvantage: z.number().int().min(0),

    /** Returned by `opponentStrength()` for a club that is in no division. */
    unknownOpponentStrength: z.number().int().min(1).max(99),
    /** Club name = one prefix + one city. 16 × 50 = 800 possible names. */
    prefixPool: z.array(z.string().min(1)).min(1),
    cityPool: z.array(z.string().min(1)).min(1)
  })
  .refine((c) => c.teamsPerLevel % 2 === 0, {
    message: 'teamsPerLevel must be even — the round-robin has no bye slot.',
    path: ['teamsPerLevel']
  })
  .refine((c) => c.promotionPlaces === c.relegationPlaces, {
    message:
      'promotionPlaces must equal relegationPlaces, otherwise divisions grow or shrink every season.',
    path: ['relegationPlaces']
  })
  .refine((c) => c.promotionPlaces * 2 <= c.teamsPerLevel, {
    message: 'promotionPlaces * 2 must fit inside a division.',
    path: ['promotionPlaces']
  })
  .refine((c) => c.startLevel < c.levels.length, {
    message: 'startLevel must name an existing division.',
    path: ['startLevel']
  })
  .refine((c) => c.europePlaces <= c.teamsPerLevel, {
    message: 'europePlaces must fit inside a division.',
    path: ['europePlaces']
  });

export type LeagueContent = z.infer<typeof LeagueContentSchema>;

export const leagueContent: LeagueContent = LeagueContentSchema.parse({
  levels: [
    { name: '1. Bundesliga', baseStrength: 82 },
    { name: '2. Liga', baseStrength: 72 },
    { name: '3. Liga', baseStrength: 62 },
    { name: '4. Liga (Regionalliga)', baseStrength: 52 }
  ],
  startLevel: 3,

  teamsPerLevel: 18,
  strengthSpread: 6,

  pointsForWin: 3,
  pointsForDraw: 1,
  pointsForLoss: 0,

  /*
   * Three up, three down.
   *
   * Not a balance number — a tutorial requirement. Aufsteiger is the default
   * start and its whole premise is survival ("Halte die Klasse. Danach reden
   * wir weiter."). At two down, the clearly-worst side in the division survived
   * more than half the time, so the tutorial spent a season teaching that its
   * own stated threat was mostly theatre.
   *
   * Every improvement system in the game — transfers, youth, training,
   * delegation — is ultimately justified by "or else you go down". That
   * justification has to bite. Three also matches German lower-league practice,
   * and the player starts in the lower leagues.
   *
   * The symmetry invariant below is untouched: league size conservation was
   * always correct, and three-and-three satisfies it. The invariant was right
   * and the content was wrong.
   */
  promotionPlaces: 3,
  relegationPlaces: 3,
  europePlaces: 4,

  promotionBonus: 1_500_000,

  goalBase: 3,
  strengthGoalFactor: 0.05,
  homeAdvantage: 3,

  unknownOpponentStrength: 75,
  prefixPool: [
    'FC', 'SV', 'SpVgg', 'SC', 'VfB', 'VfL', 'SG', 'TSV',
    '1. FC', 'Borussia', 'Fortuna', 'Dynamo', 'Rot-Weiß', 'Blau-Weiß',
    'Eintracht', 'Viktoria'
  ],
  cityPool: [
    'München', 'Dortmund', 'Berlin', 'Leipzig', 'Hamburg', 'Frankfurt', 'Stuttgart',
    'Bremen', 'Köln', 'Düsseldorf', 'Hannover', 'Nürnberg', 'Kaiserslautern', 'Dresden',
    'Bielefeld', 'Bochum', 'Augsburg', 'Mainz', 'Freiburg', 'Rostock', 'Magdeburg',
    'Karlsruhe', 'Münster', 'Essen', 'Wiesbaden', 'Osnabrück', 'Saarbrücken', 'Ulm',
    'Regensburg', 'Braunschweig', 'Fürth', 'Elversberg', 'Aachen', 'Erfurt', 'Halle',
    'Paderborn', 'Kiel', 'Sandhausen', 'Ingolstadt', 'Jena', 'Zwickau', 'Cottbus',
    'Chemnitz', 'Offenbach', 'Würzburg', 'Mannheim', 'Duisburg', 'Oberhausen',
    'Krefeld', 'Lübeck'
  ]
});

/** Matchdays in a season: home and away against everyone else. */
export const MATCHDAYS_PER_SEASON = (leagueContent.teamsPerLevel - 1) * 2;
