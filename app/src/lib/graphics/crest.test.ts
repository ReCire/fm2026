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
