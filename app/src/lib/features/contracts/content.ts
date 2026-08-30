import { z } from 'zod';

/**
 * Every number a contract negotiation depends on.
 *
 * The shape that matters: a renewal costs more the better a player already is
 * and the younger he is — a good young player knows his price will only rise,
 * an old one is grateful for one more deal. Without both forces a renewal
 * would just be a flat tax, and letting a contract lapse would never look like
 * the cheaper option it should sometimes be.
 */
export const RenewOptionSchema = z.object({
  /** How many matchdays this option adds. */
  matchdays: z.number().int().min(1),
  label: z.string(),
  /** Doc id in docs.ts. Pinned by a test, because the docs gate cannot see it. */
  doc: z.string()
});
export type RenewOption = z.infer<typeof RenewOptionSchema>;

export const ContractsContentSchema = z.object({
  /**
   * Matchdays in a season, for turning "seasons" into the unit contracts
   * actually count in. 18 clubs per division, double round-robin — see
   * `league/content.ts`. Contracts does not import league for this: the
   * number is stable enough to be a constant here, and importing another
   * feature's content for one integer is not a seam worth building.
   */
  matchdaysPerSeason: z.number().int().min(1),
  /**
   * Remaining matchdays at which the "contract expiring" warning fires.
   * Fires exactly once, at the crossing point — not every week below it — so
   * it is a nudge rather than a weekly nag.
   */
  warnAtMatchdays: z.number().int().min(0),
  renewOptions: z.array(RenewOptionSchema).min(1),

  /** Every renewal costs at least this much extra wage, before adjustment. */
  baseDemand: z.number().min(0),
  /** Strength above this adds demand — the better he is, the more he asks. */
  demandStrengthFrom: z.number().int().min(1).max(99),
  demandPerStrengthPoint: z.number().min(0),
  /** Below this age, every year of youth adds demand. */
  demandAgeUnder: z.number().int(),
  demandPerYearYoung: z.number().min(0),
  /** Above this age, every year TAKES demand away. */
  demandAgeOver: z.number().int(),
  demandDiscountPerYearOld: z.number().min(0),
  /** The demand factor is clamped here, so a renewal is never free money and
   *  never a guaranteed ruin. */
  minDemandFactor: z.number(),
  maxDemandFactor: z.number(),
  /** Immediate signing fee, per season added = marketValue × this × (1 + demand). */
  feeRatePerSeason: z.number().min(0),
  /**
   * A delegated department will not shrink the squad below this.
   *
   * Not a rule about football — a rule about an autopilot. Nobody hires a
   * director of football and expects to come back to nine players, and an
   * executive who can empty the club is a bug wearing a job title.
   */
  minSquadSizeForRelease: z.number().int().min(1),
  /**
   * How much of the balance a delegated department may commit in one week.
   *
   * Finite on purpose: it is the constraint that makes the ORDER matter. With
   * an unlimited budget every director renews everybody and competence
   * measures nothing.
   */
  autoBudgetShare: z.number().min(0).max(1)
});
export type ContractsContent = z.infer<typeof ContractsContentSchema>;

export const contractsContent: ContractsContent = ContractsContentSchema.parse({
  matchdaysPerSeason: 34,
  warnAtMatchdays: 6,

  renewOptions: [
    { matchdays: 34, label: '+1 Saison', doc: 'contracts.renewShort' },
    { matchdays: 68, label: '+2 Saisons', doc: 'contracts.renewLong' }
  ],

  baseDemand: 0.05,
  demandStrengthFrom: 60,
  demandPerStrengthPoint: 0.01,
  demandAgeUnder: 24,
  demandPerYearYoung: 0.03,
  demandAgeOver: 30,
  demandDiscountPerYearOld: 0.04,
  minDemandFactor: -0.3,
  maxDemandFactor: 1.2,
  feeRatePerSeason: 0.04,
  minSquadSizeForRelease: 16,
  autoBudgetShare: 0.15
});
