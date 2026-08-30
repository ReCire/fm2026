import { z } from 'zod';

/**
 * Cup content: the bracket size, the round calendar, and the prize ladder.
 *
 * Ported from `cupTournament` in the prototype — `roundNames`, `matchdays` and
 * `prizes` were three parallel arrays indexed by hand; here they are one
 * validated table, checked once at load rather than trusted at every call site.
 */
export const CupContentSchema = z
  .object({
    /** Clubs in the first round. Must be a power of two — no byes, ever. */
    bracketSize: z.number().int().min(2),
    /** One name per round, e.g. "Achtelfinale". */
    roundNames: z.array(z.string().min(1)).min(1),
    /**
     * The LEAGUE matchday each round is tied to.
     *
     * The tie itself is decided on the `week` tick immediately before that
     * matchday — the Pokal is a midweek fixture, not a second match bolted onto
     * Saturday. `[4, 12, 20, 28, 34]` is the prototype's own spacing, carried
     * over unchanged: a round every six to eight weeks, the final on the
     * season's last matchday.
     */
    roundMatchdays: z.array(z.number().int().min(1)).min(1),
    /**
     * Prize money for winning that round's tie, paid the moment it is won.
     *
     * Sized against a fourth-division club that starts on €150.000 and takes
     * about €169.000 in gate receipts across a whole season. The ported figures
     * paid €215.000 for winning ONE first-round tie — more than a season at the
     * turnstiles, for ninety minutes — which would have made every other
     * financial decision in the game irrelevant, and the economy is already too
     * generous.
     *
     * These are shaped so an early exit is a nice week, a quarter-final changes
     * your summer, and the final is the season. That curve is the cup: the
     * money is not the reason to care until suddenly it is.
     */
    prizes: z.array(z.number().min(0)).min(1),
    /** Strength assumed for a club that cannot be found in the pyramid. Should not normally trigger. */
    unknownStrength: z.number().int().min(1).max(99)
  })
  .refine(
    (c) => c.roundNames.length === c.roundMatchdays.length && c.roundNames.length === c.prizes.length,
    { message: 'roundNames, roundMatchdays and prizes must all have the same length' }
  )
  .refine((c) => 2 ** c.roundNames.length === c.bracketSize, {
    message: 'bracketSize must halve exactly once per round (one name per halving)',
    path: ['bracketSize']
  });
export type CupContent = z.infer<typeof CupContentSchema>;

export const cupContent: CupContent = CupContentSchema.parse({
  bracketSize: 32,
  roundNames: ['1. Runde', 'Achtelfinale', 'Viertelfinale', 'Halbfinale', 'Finale'],
  roundMatchdays: [4, 12, 20, 28, 34],
  prizes: [25_000, 55_000, 120_000, 260_000, 550_000],
  unknownStrength: 60
});
