import { z } from 'zod';
import { POSITIONS } from './positions';

/**
 * Squad content: names, traits, and the value/wage curves.
 *
 * `calculatePlayerWage` in the prototype was four nested ternaries with eight
 * magic numbers. Here it is a table of named bands, which is what makes it
 * editable in the Data Studio and reviewable as a diff.
 */
export const WageBandSchema = z.object({
  /** Applies to players at or below this strength. */
  upToStrength: z.number().int().min(1).max(99),
  base: z.number().min(0),
  perValue: z.number().min(0).max(0.1)
});

export const SquadContentSchema = z.object({
  firstNames: z.array(z.string()).min(1),
  lastNames: z.array(z.string()).min(1),
  traits: z.array(z.string()).min(1),
  /** Chance a generated player has a trait at all. */
  traitChance: z.number().min(0).max(1),
  wageBands: z.array(WageBandSchema).min(1),
  /** Market value curve: value = sum over thresholds passed. */
  valueCurve: z.array(z.object({
    fromStrength: z.number().int(),
    perPoint: z.number().min(0)
  })).min(1),
  startingSquad: z.array(z.tuple([z.enum(POSITIONS), z.number().int(), z.number().int(), z.number().int()])),
  /**
   * Fitness lost by a starter each matchday, and regained by a substitute.
   *
   * Recovery is deliberately larger than loss: with 19 players and 11 starting,
   * a rotated squad settles near `fitnessBaseline` and meets the league at face
   * value. Tuned by measurement, not feel — at 15 a squad at exactly its
   * league's table strength finished 11th of 18; at 21 it finishes 9.7th, which
   * is the middle.
   */
  fitnessLossPerMatch: z.number().int().min(0),
  /**
   * How far fitness can swing a rating, 0..1, measured AGAINST A BASELINE.
   *
   * AI clubs carry a static strength and never tire, so any formula that only
   * subtracts for tiredness taxes the player and nobody else. Measured: it made
   * the eleven read 23 points below its own league, and a squad at exactly the
   * table's strength finished 15th of 18.
   *
   * So fitness is a DEVIATION. A squad at `fitnessBaseline` rates at face value
   * and meets the league on equal terms; keeping it fresher is a real edge,
   * letting it collapse is a real penalty, and neither is a hidden tax.
   */
  fitnessWeight: z.number().min(0).max(1),
  /** The fitness a normally-rotated squad sits at. The zero point. */
  fitnessBaseline: z.number().min(0).max(100),
  /** Base chance a starter picks up an injury. */
  injuryBaseRisk: z.number().min(0).max(1),
  /** Multiplier applied when a player starts below this fitness. */
  tiredFitnessThreshold: z.number().int(),
  tiredInjuryMultiplier: z.number().min(1),
  /**
   * How many matchdays a fresh contract runs, at the moment a player is
   * created.
   *
   * Lives here rather than in `contracts` because every path that mints a
   * player — the starting squad, the transfer market, a youth graduate — goes
   * through `createPlayer`, and a player without this would be a player
   * without a contract. `contracts` owns the countdown and the renewal; squad
   * only owns "what a brand new deal looks like". A season is 34 matchdays
   * (18 teams, double round-robin), so this is roughly one to three seasons.
   */
  initialContract: z.object({
    min: z.number().int().min(1),
    max: z.number().int().min(1)
  })
});
export type SquadContent = z.infer<typeof SquadContentSchema>;

export const squadContent: SquadContent = SquadContentSchema.parse({
  firstNames: ['Max','Lukas','Leon','Felix','Jonas','Elias','Noah','Julian','Tim','Moritz','Jan','Tom','David','Paul','Alexander','Daniel','Tobias','Florian','Marco','Kevin','Nico','Sven'],
  lastNames: ['Müller','Schmidt','Schneider','Fischer','Weber','Meyer','Wagner','Becker','Schulz','Hoffmann','Schäfer','Koch','Bauer','Richter','Klein','Wolf','Schröder','Neumann','Schwarz','Zimmermann','Hartmann','Lange'],
  traits: ['Tor-Instinkt','Freistoß-Gott','Elfmeter-Killer','Leader','Eisenfuß','Flügelflitzer','Zweikampfmonster'],
  traitChance: 0.35,

  // Ported from calculatePlayerWage()'s ternary chain.
  wageBands: [
    { upToStrength: 58, base: 300,    perValue: 0.008 },
    { upToStrength: 68, base: 1_200,  perValue: 0.006 },
    { upToStrength: 77, base: 5_000,  perValue: 0.0045 },
    { upToStrength: 99, base: 25_000, perValue: 0.0035 }
  ],

  // Ported from calculatePlayerMarketValue().
  valueCurve: [
    { fromStrength: 40, perPoint: 2_000 },
    { fromStrength: 60, perPoint: 18_000 },
    { fromStrength: 75, perPoint: 90_000 },
    { fromStrength: 85, perPoint: 400_000 }
  ],

  startingSquad: [
    ['TW', 2, 48, 58],
    ['ABW', 6, 46, 60],
    ['MIT', 7, 46, 61],
    ['ST', 4, 47, 62]
  ],

  fitnessWeight: 0.35,
  fitnessBaseline: 70,
  fitnessLossPerMatch: 12,
  injuryBaseRisk: 0.055,
  tiredFitnessThreshold: 55,
  tiredInjuryMultiplier: 1.8,
  initialContract: { min: 34, max: 102 }
});
