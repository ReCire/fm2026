import { z } from 'zod';
import type { Rng } from '$lib/engine/rng';

/**
 * Finance owns the club's money and the ledger. It does NOT know where money
 * comes from — stadium posts ticket income, squad posts wages, merch posts
 * sales. Adding a new revenue stream never touches this file.
 */
export const LedgerEntrySchema = z.object({
  season: z.number().int(),
  matchday: z.number().int(),
  source: z.string(),
  reason: z.string(),
  amount: z.number()
});
export type LedgerEntry = z.infer<typeof LedgerEntrySchema>;

export const FinanceSchema = z.object({
  money: z.number(),
  transferBudget: z.number(),
  wageBudget: z.number(),
  loanDebt: z.number().min(0),
  /** Capped ring buffer: a 20-season career must not grow unbounded. */
  ledger: z.array(LedgerEntrySchema).max(2000)
});
export type FinanceState = z.infer<typeof FinanceSchema>;

declare module '$lib/engine/state' {
  interface ModuleStates {
    finance: FinanceState;
  }
}

/** Starting values, taken from the prototype's `game` object. */
export function createFinance(_rng: Rng): FinanceState {
  return {
    money: 150_000,
    transferBudget: 100_000,
    wageBudget: 15_000,
    loanDebt: 0,
    ledger: []
  };
}

export const FINANCE_VERSION = 1;
