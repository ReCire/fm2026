import { z } from 'zod';

/**
 * Every number training depends on.
 *
 * The shape that matters: development is HARDER the better a player already is,
 * and it reverses with age. Without both, a squad trained for six seasons is
 * eleven ninety-nines and the transfer market has nothing left to sell.
 */
export const TrainingContentSchema = z.object({
  /** Base chance per matchday that a focused attribute gains a point. */
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
  /** Over peakAgeTo, chance per matchday that an attribute DECLINES. */
  declinePerYearOver: z.number().min(0).max(1),
  /** A player following the team focus develops at this share of a personal one. */
  teamFocusShare: z.number().min(0).max(1),
  intensity: z.object({
    locker: z.object({ gain: z.number(), fitnessLoss: z.number(), injuryRisk: z.number() }),
    normal: z.object({ gain: z.number(), fitnessLoss: z.number(), injuryRisk: z.number() }),
    hart:   z.object({ gain: z.number(), fitnessLoss: z.number(), injuryRisk: z.number() })
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
    locker: { gain: 0.6, fitnessLoss: 0.85, injuryRisk: 0.85 },
    normal: { gain: 1.0, fitnessLoss: 1.0,  injuryRisk: 1.0 },
    hart:   { gain: 1.6, fitnessLoss: 1.2,  injuryRisk: 1.35 }
  }
});

export const FOCUS_LABEL: Record<string, string> = {
  allgemein: 'Allgemein',
  technik: 'Technik',
  tempo: 'Tempo',
  kraft: 'Kraft',
  uebersicht: 'Übersicht',
  mentalitaet: 'Mentalität'
};

export const INTENSITY_LABEL: Record<string, string> = {
  locker: 'Locker',
  normal: 'Normal',
  hart: 'Hart'
};
