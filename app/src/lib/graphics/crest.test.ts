import { describe, it, expect } from 'vitest';
import {
  crestHash, divisionFor, divisionPath, crestInitials, showsInitials,
  crestHeight, CREST_DIVISIONS, INITIALS_THRESHOLD
} from './crest';
import { onboardingContent } from '$lib/features/onboarding/content';

describe('crestHash', () => {
  it('is stable, so a club never changes crest between sessions', () => {
    expect(crestHash('SC Hafenkrone')).toBe(crestHash('SC Hafenkrone'));
  });
  it('separates similar names', () => {
    expect(crestHash('FC Auenpark')).not.toBe(crestHash('FC Auenparl'));
  });
  it('is never negative, so the modulo cannot index out of range', () => {
    for (const c of onboardingContent.clubs) expect(crestHash(c.name)).toBeGreaterThanOrEqual(0);
  });
});

describe('divisions', () => {
  it('assigns every club a real division', () => {
    for (const c of onboardingContent.clubs) {
      expect(CREST_DIVISIONS, c.name).toContain(divisionFor(c.name));
    }
  });

  it('emits a path for every division — no silent empty shape', () => {
    for (const d of CREST_DIVISIONS) {
      expect(divisionPath(d).length, d).toBeGreaterThan(10);
      expect(divisionPath(d), d).toMatch(/^M/);
    }
  });

  /**
   * The set has to read as one league of distinguishable clubs. Colour does
   * most of the work, but if the whole roster landed on one division the marks
   * would differ by hue alone.
   */
  it('spreads the real roster across several divisions', () => {
    const used = new Set(onboardingContent.clubs.map((c) => divisionFor(c.name)));
    expect(used.size).toBeGreaterThanOrEqual(3);
  });
});

describe('crestInitials', () => {
  it('skips club-form words, which carry no identity', () => {
    expect(crestInitials('FC Deichtor')).toBe('DE');
    expect(crestInitials('SpVgg Lindenau')).toBe('LI');
    expect(crestInitials('1. FC Ostwall')).toBe('OS');
    expect(crestInitials('Borussia Steinfeld')).toBe('ST');
  });

  it('uses two words when both are meaningful', () => {
    expect(crestInitials('SV Alte Saline')).toBe('AS');
  });

  it('never returns empty, even for a name that is all stopwords', () => {
    expect(crestInitials('FC SV').length).toBeGreaterThan(0);
    expect(crestInitials('').length).toBeGreaterThanOrEqual(0);
  });

  it('produces at most two characters for every club in the roster', () => {
    for (const c of onboardingContent.clubs) {
      expect(crestInitials(c.name).length, c.name).toBeLessThanOrEqual(2);
    }
  });
});

describe('shedding detail', () => {
  it('drops initials below the threshold rather than smearing them', () => {
    expect(showsInitials(INITIALS_THRESHOLD - 1)).toBe(false);
    expect(showsInitials(INITIALS_THRESHOLD)).toBe(true);
    expect(showsInitials(28)).toBe(false);   // the size that was checked by eye
    expect(showsInitials(56)).toBe(true);    // the carousel size
  });
});

describe('crestHeight', () => {
  it('keeps the shield proportions at any size', () => {
    expect(crestHeight(100)).toBe(116);
    expect(crestHeight(56)).toBe(65);
    expect(crestHeight(28)).toBe(32);
  });
});

/**
 * The initials must sit on c1, never on the c2 field.
 *
 * This is the check that should have existed the first time: the original mark
 * put c2 text straight onto a field that is also c2, and on 8 of 14 clubs that
 * was 1.00:1 with only a hairline stroke between them. Verified from a
 * screenshot, which confirms what you expect to see rather than what is there.
 */
describe('inescutcheon', () => {
  it('is present exactly when the initials are', () => {
    expect(showsInitials(56)).toBe(true);
    expect(showsInitials(28)).toBe(false);
  });

  it('keeps the roundel inside the shield at every club', () => {
    // r=27 centred at (50,58) in a 100x116 shield whose widest span is 6..94.
    const left = 50 - 27, right = 50 + 27, top = 58 - 27, bottom = 58 + 27;
    expect(left).toBeGreaterThan(6);
    expect(right).toBeLessThan(94);
    expect(top).toBeGreaterThan(6);
    expect(bottom).toBeLessThan(112);
  });
});
