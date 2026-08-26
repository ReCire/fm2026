import { describe, it, expect } from 'vitest';
import { post, matchdayNet, breakdown, loanInterest, canAfford, formatMoney } from './rules';
import { createFinance } from './state';
import { createRng } from '$lib/engine/rng';

const rng = createRng(1);
const base = () => createFinance(rng);
const at = (amount: number, source = 'stadium', reason = 'Ticket') => ({
  season: 1, matchday: 1, source, reason, amount
});

describe('post', () => {
  it('moves money and records the reason', () => {
    const f = base();
    post(f, at(5_000));
    expect(f.money).toBe(155_000);
    expect(f.ledger).toHaveLength(1);
    expect(f.ledger[0]!.reason).toBe('Ticket');
  });

  it('lets the balance go negative — the board reacts, the ledger does not lie', () => {
    const f = base();
    post(f, at(-200_000));
    expect(f.money).toBe(-50_000);
  });

  it('caps the ledger so a 20-season career cannot grow unbounded', () => {
    const f = base();
    for (let i = 0; i < 2_100; i++) post(f, at(1));
    expect(f.ledger.length).toBe(2_000);
    // The cap drops the OLDEST entries, never the newest.
    expect(f.money).toBe(152_100);
  });
});

describe('matchdayNet and breakdown', () => {
  it('nets only the requested matchday', () => {
    const f = base();
    post(f, at(10_000));
    post(f, at(-4_000, 'squad', 'Gehälter'));
    post(f, { season: 1, matchday: 2, source: 'stadium', reason: 'Ticket', amount: 999 });
    expect(matchdayNet(f, 1, 1)).toBe(6_000);
  });

  it('groups by source, biggest first', () => {
    const f = base();
    post(f, at(10_000));
    post(f, at(-4_000, 'squad', 'Gehälter'));
    post(f, at(2_000, 'merch', 'Trikots'));
    expect(breakdown(f, 1, 1)).toEqual([
      { source: 'stadium', amount: 10_000 },
      { source: 'merch', amount: 2_000 },
      { source: 'squad', amount: -4_000 }
    ]);
  });
});

describe('loanInterest', () => {
  it('rounds to whole euros', () => {
    expect(loanInterest(250_000, 0.004)).toBe(1_000);
    expect(loanInterest(1, 0.004)).toBe(0);
  });
  it('is zero without debt', () => {
    expect(loanInterest(0, 0.004)).toBe(0);
  });
});

describe('canAfford', () => {
  it('respects the tolerated overdraft', () => {
    const f = base();
    expect(canAfford(f, 200_000)).toBe(false);
    expect(canAfford(f, 200_000, 50_000)).toBe(true);
    expect(canAfford(f, 200_001, 50_000)).toBe(false);
  });
});

describe('formatMoney', () => {
  it('switches to millions where it helps readability', () => {
    expect(formatMoney(1_500_000)).toBe('1.50 Mio. €');
    expect(formatMoney(-25_000_000)).toBe('-25.00 Mio. €');
  });
  it('keeps smaller sums exact', () => {
    expect(formatMoney(150_000)).toBe('150.000 €');
    expect(formatMoney(-4_500)).toBe('-4.500 €');
  });
});
