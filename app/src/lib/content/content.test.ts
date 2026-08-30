import { describe, it, expect } from 'vitest';
import { brands, brandsAvailable, brandTierForLeague, BrandCategorySchema } from './brands';
import { cast } from './cast';

const categories = BrandCategorySchema.options;

describe('brands', () => {
  it('can always find someone willing to deal, at every level', () => {
    // The failure this catches is a category whose cheapest name is tier 2:
    // a fourth-division club would then have no possible sponsor, and the
    // screen would render an empty list rather than an error.
    for (let level = 0; level < 4; level++) {
      for (const cat of categories) {
        expect(brandsAvailable(cat, level).length, `${cat} at level ${level}`).toBeGreaterThan(0);
      }
    }
  });

  it('opens up as you climb', () => {
    // The tunable-changes-something rule, pointed at the tier ceiling: if
    // promotion stops widening the field, the table has stopped reaching
    // anything.
    const bottom = categories.reduce((n, c) => n + brandsAvailable(c, 3).length, 0);
    const top = categories.reduce((n, c) => n + brandsAvailable(c, 0).length, 0);
    expect(top).toBeGreaterThan(bottom);
  });

  it('holds the sponsor tier steady across the promotion to the top flight', () => {
    // Levels 0 and 1 share a ceiling deliberately — see brands.ts.
    expect(brandTierForLeague[0]).toBe(brandTierForLeague[1]);
    expect(brandTierForLeague[2]).toBeLessThan(brandTierForLeague[1]!);
    expect(brandTierForLeague[3]).toBeLessThan(brandTierForLeague[2]!);
  });

  it('never repeats a name or a tagline across the whole world', () => {
    const all = Object.values(brands).flat();
    expect(new Set(all.map((b) => b.name)).size, 'duplicate brand name').toBe(all.length);
    expect(new Set(all.map((b) => b.tagline)).size, 'duplicate tagline').toBe(all.length);
  });

  it('gives every category a small name to fall back on', () => {
    for (const cat of categories) {
      expect(brands[cat].some((b) => b.tier === 1), `${cat} has no tier-1 name`).toBe(true);
    }
  });
});

describe('cast', () => {
  it('is eleven distinct people', () => {
    const members = Object.values(cast);
    expect(members).toHaveLength(11);
    expect(new Set(members.map((m) => m.name)).size).toBe(11);
  });

  it('carries no colour', () => {
    // tokens.css is the only file allowed to define one, and a character's
    // tint would compete with the domain tint of wherever they appear.
    for (const [id, m] of Object.entries(cast)) {
      expect(Object.keys(m).sort(), `${id}`).toEqual(['name', 'role']);
    }
  });
});
