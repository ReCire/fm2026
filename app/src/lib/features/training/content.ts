import { z } from 'zod';

/**
 * Every number training depends on.
 *
 * The shape that matters: development is HARDER the better a player already is,
 * and it reverses with age. Without both, a squad trained for six seasons is
 * eleven ninety-nines and the transfer market has nothing left to sell.
 */
/**
 * `rest` is fitness recovered over the week, in points, absolutely.
 *
 * It is the ONLY thing that puts fitness back. Squad used to hand every
 * non-starter +21 on matchday as well, so two systems were recovering the same
 * number: with training added on top, the whole squad sat above 90 and fitness
 * stopped being a constraint at all. Recovery belongs to the week — that is
 * what a week is — and the matchday only spends it.
 *
 * Against a 12-point cost per match: a regular starter gains 5 a week on
 * locker, loses 1 on normal and loses 6 on hart. So an everyday eleven wears
 * down unless you ease off or rotate, which is the decision this is for.
 */
const INTENSITY = z.object({
  gain: z.number(),
  rest: z.number().int().min(0).max(40),
  fitnessLoss: z.number(),
  injuryRisk: z.number()
});

export const TrainingContentSchema = z.object({
  /** Base chance per training week that a focused attribute gains a point. */
  baseGain: z.number().min(0).max(1),
  /**
   * Above this value, gains get progressively rarer. Set near the top of the
   * range a player can realistically be coached to.
   */
  diminishFrom: z.number().int().min(1).max(99),
  /** How sharply gains fall away past `diminishFrom`. */
  diminishRate: z.number().min(0).max(1),
  /** Ages between these gain at full rate; either side is scaled. */
  peakAgeFrom: z.number().int(),
  peakAgeTo: z.number().int(),
  /** Under peakAgeFrom, gains are multiplied by this per year of youth. */
  youthBonusPerYear: z.number().min(0),
  /** Over peakAgeTo, chance per training week that an attribute DECLINES. */
  declinePerYearOver: z.number().min(0).max(1),
  /** A player following the team focus develops at this share of a personal one. */
  teamFocusShare: z.number().min(0).max(1),

  intensity: z.object({
    locker: INTENSITY,
    normal: INTENSITY,
    hart:   INTENSITY
  })
});
export type TrainingContent = z.infer<typeof TrainingContentSchema>;

export const trainingContent: TrainingContent = TrainingContentSchema.parse({
  baseGain: 0.055,
  diminishFrom: 70,
  diminishRate: 0.045,
  peakAgeFrom: 18,
  peakAgeTo: 27,
  youthBonusPerYear: 0.12,
  declinePerYearOver: 0.02,
  teamFocusShare: 0.6,
  intensity: {
    // Harder training develops faster and costs fitness AND injury risk — two
    // prices, so it cannot be strictly better the way a single axis would be.
    locker: { gain: 0.6, rest: 17, fitnessLoss: 0.85, injuryRisk: 0.85 },
    normal: { gain: 1.0, rest: 11, fitnessLoss: 1.0,  injuryRisk: 1.0 },
    hart:   { gain: 1.6, rest: 6,  fitnessLoss: 1.2,  injuryRisk: 1.35 }
  }
});

export const INTENSITY_LABEL: Record<string, string> = {
  locker: 'Locker',
  normal: 'Normal',
  hart: 'Hart'
};

export const INTENSITY_BLURB: Record<string, string> = {
  locker: 'Schont die Beine. Weniger Fortschritt, aber die Elf geht frisch ins Spiel.',
  normal: 'Der ausgewogene Weg. Solide Entwicklung bei vertretbarem Risiko.',
  hart: 'Deutlich schnellere Entwicklung — auf Kosten von Fitness und mit spürbar mehr Verletzungen.'
};
