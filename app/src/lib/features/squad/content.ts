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
  /** Fitness lost by a starter each matchday, and regained by a substitute. */
  fitnessLossPerMatch: z.number().int().min(0),
  fitnessRecoveryPerMatch: z.number().int().min(0),
  /** Base chance a starter picks up an injury. */
  injuryBaseRisk: z.number().min(0).max(1),
  /** Multiplier applied when a player starts below this fitness. */
  tiredFitnessThreshold: z.number().int(),
  tiredInjuryMultiplier: z.number().min(1)
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

  fitnessLossPerMatch: 12,
  fitnessRecoveryPerMatch: 15,
  injuryBaseRisk: 0.055,
  tiredFitnessThreshold: 55,
  tiredInjuryMultiplier: 1.8
});
