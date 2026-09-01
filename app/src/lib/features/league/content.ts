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
  /**
   * How far above its band a division's clubs can develop, and how fast.
   *
   * AI clubs used to be frozen for the life of a career while the player's
   * squad trained every week. One season of ordinary training put a level side
   * eight points clear of a division that had not moved, so a manager who did
   * nothing but press the button finished fifth — and by season two the
   * pyramid meant nothing at all.
   *
   * `developHeadroom` is set so each level's ceiling is exactly the next
   * level's floor: master your division and you arrive in the one above as a
   * competitive newcomer, which is the promotion story the pyramid is for.
   * The chance is proportional to the REMAINING gap, so growth decelerates the
   * way a player's does past `diminishFrom` — nobody runs away with it.
   */
  developHeadroom: z.number().int().min(0),
  developRate: z.number().min(0).max(1),

    pointsForWin: z.number().int().min(0),
    pointsForDraw: z.number().int().min(0),
    pointsForLoss: z.number().int().min(0),

    /** Clubs going up from every division below the first. */
    /**
     * Places promoted AUTOMATICALLY. The German system's two, not three.
     *
     * Third place does not go up — it earns the right to play for it. See
     * `playoffPlace`.
     */
    promotionPlaces: z.number().int().min(0),
    /** Clubs going down from every division above the last. */
    relegationPlaces: z.number().int().min(0),
    /**
     * Die Relegation: the finishing place, in the LOWER division, that earns a
     * two-legged tie against the division above.
     *
     * The distinctive rule in German football and the reason 3rd and 16th are
     * the two most watched positions in the table. 17th and 18th go down and
     * the top two come up; the last place in each division is decided by a
     * play-off between the club that nearly stayed and the club that nearly
     * went up.
     *
     * Real, at both boundaries we model it on: Bundesliga 16th versus 2.
     * Bundesliga 3rd, and 2. Bundesliga 16th versus 3. Liga 3rd. We apply the
     * same pattern at the bottom boundary too, where the real system differs —
     * the 3. Liga relegates four to a Regionalliga that is five parallel
     * divisions with a rotating draw, and modelling that needs a pyramid this
     * one does not have.
     */
    playoffPlace: z.number().int().min(1),
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
  developHeadroom: 4,
  developRate: 0.06,

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
  promotionPlaces: 2,
  relegationPlaces: 2,
  playoffPlace: 3,
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
