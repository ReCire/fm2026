import { describe, it, expect } from 'vitest';
import { brands, brandsAvailable, brandTierForLeague, BrandCategorySchema } from './brands';
import { cast } from './cast';
import { badges, partitionBadges } from './badges';

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

describe('the badge list a player actually sees', () => {
  /*
   * `partitionBadges` is the display path, extracted out of the screen because
   * this project has no component test — a partition living in a `$derived` can
   * only ever be checked by looking at it, and three bugs in this repo today
   * survived being looked at and died the moment something ran them.
   *
   * The cases below are precisely the ones that are awkward to reach in a live
   * save, which is why they were going to ship on inspection alone.
   */
  const all = new Set(badges.flatMap((b) => b.requires));

  it('hides an unreachable badge completely, rather than greying it', () => {
    // The prototype listed badges for a European cup, four factories and a
    // catering mile that did not exist. They sat there looking like failures.
    const nothing = partitionBadges(new Set<string>(), []);
    const everything = partitionBadges(all, []);
    expect(nothing.total).toBeLessThan(everything.total);
    for (const b of nothing.shown) expect(b.requires).toEqual([]);
  });

  it('shows an earned secret in full', () => {
    /*
     * The correction that mattered, and the branch nobody had seen render.
     * Eight of the twenty-eight are secret; hiding them after they are earned
     * turns a third of the list into a counter and the punchline never lands.
     */
    const secret = badges.find((b) => b.secret)!;
    const after = partitionBadges(all, [secret.id]);
    expect(after.shown.map((b) => b.id)).toContain(secret.id);
    expect(after.earned.has(secret.id)).toBe(true);
  });

  it('never names an unearned secret', () => {
    const before = partitionBadges(all, []);
    for (const b of before.shown) expect(b.secret, `${b.id} is a spoiler`).toBeFalsy();
    expect(before.lockedSecrets).toBe(badges.filter((b) => b.secret).length);
  });

  it('ticks the silhouette count down as secrets land', () => {
    // The count falling from eight to seven says something happened without
    // saying what. A static total says nothing at all.
    const secret = badges.find((b) => b.secret)!;
    const before = partitionBadges(all, []);
    const after = partitionBadges(all, [secret.id]);
    expect(after.lockedSecrets).toBe(before.lockedSecrets - 1);
    expect(after.shown.length).toBe(before.shown.length + 1);
  });

  it('cannot report more earned than exist', () => {
    // A save carrying a badge whose feature has since been removed would
    // otherwise read 23 of 22.
    const stale = partitionBadges(new Set<string>(), ['does-not-exist', ...badges.map((b) => b.id)]);
    expect(stale.earnedCount).toBeLessThanOrEqual(stale.total);
    expect(stale.earned.has('does-not-exist')).toBe(false);
  });

  it('keeps catalogue order', () => {
    // The list is ordered as a progression, so a filter that reorders it turns
    // a designed sequence into an arbitrary one.
    const shown = partitionBadges(all, []).shown.map((b) => b.id);
    const expected = badges.filter((b) => !b.secret).map((b) => b.id);
    expect(shown).toEqual(expected);
  });
});
