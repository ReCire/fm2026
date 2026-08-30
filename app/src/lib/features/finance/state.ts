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
  /**
   * True once the club has ever been overdrawn or carried a loan.
   *
   * A counter rather than a derivation, because it cannot be derived: a club
   * that cleared its debts and a club that never borrowed have identical
   * balance sheets and opposite stories. Set during the tick, never on render,
   * and never cleared — "ever" is the whole word.
   */
  everInDebt: z.boolean(),
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
    everInDebt: false,
    ledger: []
  };
}

/** v2: remembers whether the club was ever in the red. */
export const FINANCE_VERSION = 2;

export function migrateFinance(old: unknown, _from: number): FinanceState {
  const base = old as FinanceState;
  return {
    ...base,
    // A v1 save cannot say whether it was ever in debt, only whether it is now.
    // Guessing "no" would hand a career a clean record it may not have earned.
    everInDebt: base.everInDebt ?? (base.money < 0 || base.loanDebt > 0)
  };
}
