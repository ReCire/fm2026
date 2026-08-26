import type { LedgerEntry, FinanceState } from './state';

/**
 * Pure finance rules. No DOM, no components, no Math.random().
 *
 * Everything here is a plain function over plain data, which is why rules.test.ts
 * is three lines per case and why we can sim 200 seasons in CI.
 */

const LEDGER_CAP = 2000;

export interface PostOptions {
  season: number;
  matchday: number;
  source: string;
  reason: string;
  amount: number;
}

/** Record money in or out. The single way the club's balance ever changes. */
export function post(finance: FinanceState, entry: PostOptions): void {
  finance.money += entry.amount;
  finance.ledger.push({ ...entry });
  if (finance.ledger.length > LEDGER_CAP) {
    finance.ledger.splice(0, finance.ledger.length - LEDGER_CAP);
  }
}

/** Net result of one matchday, reconstructed from the ledger alone. */
export function matchdayNet(finance: FinanceState, season: number, matchday: number): number {
  return finance.ledger
    .filter((e) => e.season === season && e.matchday === matchday)
    .reduce((sum, e) => sum + e.amount, 0);
}

/** Grouped totals for the finance screen. */
export function breakdown(
  finance: FinanceState,
  season: number,
  matchday: number
): { source: string; amount: number }[] {
  const bySource = new Map<string, number>();
  for (const e of finance.ledger) {
    if (e.season !== season || e.matchday !== matchday) continue;
    bySource.set(e.source, (bySource.get(e.source) ?? 0) + e.amount);
  }
  return [...bySource.entries()]
    .map(([source, amount]) => ({ source, amount }))
    .sort((a, b) => b.amount - a.amount);
}

/**
 * Interest on the club loan, charged per matchday.
 * Ported from the prototype's loan handling, expressed as a rate so it is
 * tunable content rather than a magic number.
 */
export function loanInterest(debt: number, ratePerMatchday: number): number {
  return Math.round(debt * ratePerMatchday);
}

/** Can the club afford this, counting the overdraft the board tolerates? */
export function canAfford(finance: FinanceState, cost: number, overdraft = 0): boolean {
  return finance.money - cost >= -overdraft;
}

export function formatMoney(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(2)} Mio. €`;
  return `${sign}${Math.round(abs).toLocaleString('de-DE')} €`;
}
