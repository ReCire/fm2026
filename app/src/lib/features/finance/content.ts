import { z } from 'zod';

/**
 * Tunable finance content. Every number the balance depends on lives here, not
 * in rules.ts — so it can be edited in the Data Studio, reviewed as a diff, and
 * reverted on its own without touching the formula that consumes it.
 */
export const FinanceContentSchema = z.object({
  /** Interest charged on the club loan, per matchday. */
  loanRatePerMatchday: z.number().min(0).max(0.05),
  /** Overdraft the board tolerates before it intervenes. */
  toleratedOverdraft: z.number().min(0),
  /** Fixed running costs charged every matchday, before variable opex. */
  baseOpex: z.number().min(0),
  /** Share of ticket income that goes straight back out as running costs. */
  opexTicketShare: z.number().min(0).max(1)
});
export type FinanceContent = z.infer<typeof FinanceContentSchema>;

export const financeContent: FinanceContent = FinanceContentSchema.parse({
  loanRatePerMatchday: 0.004,
  toleratedOverdraft: 50_000,
  // Both lifted from applyMatchdayFinances() in the prototype:
  //   opex = (ticketIncome * 0.12 + 4500)
  baseOpex: 4_500,
  opexTicketShare: 0.12
});
