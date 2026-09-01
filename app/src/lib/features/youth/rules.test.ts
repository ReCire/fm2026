import { describe, it, expect } from 'vitest';
import {
  levelUpgradeCost, capacity, strengthBand, scoutCost, canUpgrade, canScout,
  upgrade, scout, scoutProspect, scoutRng, ageProspects, scoutJewel
} from './rules';
import { createYouth } from './state';
import { strengthOf } from '../squad/rules';
import { youthContent } from './content';
import { createRng } from '$lib/engine/rng';
import { NO_TALENT } from '$lib/content/talents';

const fresh = (seed = 1) => createYouth(createRng(seed));

describe('capacity', () => {
  it('grows with level', () => {
    expect(capacity(2)).toBeGreaterThan(capacity(1));
  });
});

describe('strengthBand', () => {
  it('rises with level', () => {
    expect(strengthBand(3).min).toBeGreaterThan(strengthBand(1).min);
  });
  it('stays within legal bounds even at the max level', () => {
    const band = strengthBand(youthContent.maxLevel);
    expect(band.min).toBeGreaterThanOrEqual(1);
    expect(band.max).toBeLessThanOrEqual(99);
  });
});

describe('scoutCost', () => {
  it('gets cheaper with level, down to the floor', () => {
    const base = scoutCost(1);
    expect(scoutCost(3)).toBeLessThan(base);
    expect(scoutCost(youthContent.maxLevel)).toBeGreaterThanOrEqual(
      Math.round(youthContent.scoutCost * youthContent.scoutCostFloor)
    );
  });
});

describe('levelUpgradeCost', () => {
  it('rises with level, so the ceiling keeps costing more', () => {
    expect(levelUpgradeCost(3)).toBeGreaterThan(levelUpgradeCost(1));
  });
});

describe('scoutProspect', () => {
  it('is a young player — the entire bet the academy makes', () => {
    const rng = createRng(5);
    for (let i = 0; i < 50; i++) {
      const p = scoutProspect(rng, 1);
      expect(p.age).toBeGreaterThanOrEqual(youthContent.scoutAgeMin);
      expect(p.age).toBeLessThan(youthContent.graduationAge);
    }
  });

  it('respects the level strength band', () => {
    const rng = createRng(9);
    const band = strengthBand(2);
    for (let i = 0; i < 50; i++) {
      const p = scoutProspect(rng, 2);
      expect(strengthOf(p)).toBeGreaterThanOrEqual(band.min);
      expect(strengthOf(p)).toBeLessThanOrEqual(band.max);
    }
  });

  it('is deterministic for a given seed', () => {
    const a = scoutProspect(createRng(7), 2);
    const b = scoutProspect(createRng(7), 2);
    expect(a).toEqual(b);
  });
});

describe('upgrade', () => {
  it('raises the level by one, up to the cap', () => {
    const y = fresh();
    upgrade(y);
    expect(y.level).toBe(2);
  });
  it('refuses past maxLevel', () => {
    const y = fresh();
    y.level = youthContent.maxLevel;
    upgrade(y);
    expect(y.level).toBe(youthContent.maxLevel);
    expect(canUpgrade(y)).toBe(false);
  });
});

describe('scout', () => {
  it('adds a prospect while there is room', () => {
    const y = fresh();
    const before = y.prospects.length;
    scout(y, createRng(2));
    expect(y.prospects.length).toBe(before + 1);
  });

  it('refuses once the academy is full', () => {
    const y = fresh();
    while (canScout(y)) scout(y, createRng(y.prospects.length + 1));
    const before = y.prospects.length;
    const result = scout(y, createRng(99));
    expect(result).toBeUndefined();
    expect(y.prospects.length).toBe(before);
  });
});

describe('scoutRng', () => {
  it('advances the cursor so two scouting trips never reuse a stream', () => {
    const y = fresh();
    const before = y.scoutCursor;
    scoutRng(y, 123);
    expect(y.scoutCursor).toBe(before + 1);
  });

  it('is fully reproducible from the same save and the same seed', () => {
    const a = fresh();
    const b = fresh();
    const p1 = scoutProspect(scoutRng(a, 42), a.level);
    const p2 = scoutProspect(scoutRng(b, 42), b.level);
    expect(p1).toEqual(p2);
  });
});

describe('ageProspects', () => {
  it('ages every prospect by one year', () => {
    const y = fresh();
    const before = y.prospects.map((p) => p.age);
    ageProspects(y);
    expect(y.prospects.map((p) => p.age)).toEqual(before.map((a) => a + 1));
  });

  it('graduates whoever reaches graduationAge, and removes them from the academy', () => {
    const y = fresh();
    y.prospects[0]!.age = youthContent.graduationAge - 1;
    const outcome = ageProspects(y);
    expect(outcome.graduates.map((p) => p.age)).toEqual([youthContent.graduationAge]);
    expect(y.prospects).toHaveLength(0);
  });

  it('leaves a prospect who has not come of age in the academy', () => {
    const y = fresh();
    y.prospects[0]!.age = youthContent.scoutAgeMin;
    const outcome = ageProspects(y);
    expect(outcome.graduates).toHaveLength(0);
    expect(y.prospects).toHaveLength(1);
  });
});

describe('Juwelen', () => {
  /*
   * `wonderkid` is three doctrine nodes and was unmapped until now. The
   * prototype's version generated a flat 62–72 regardless of academy level and
   * stamped a trait on at birth; both are things this port has explicit
   * doctrine against.
   */
  it('is better and younger than the ordinary intake', () => {
    const level = 3;
    const jewel = scoutJewel(createRng(9), level);
    const band = strengthBand(level);
    expect(strengthOf(jewel)).toBeGreaterThan(band.max);
    expect(jewel.age).toBe(youthContent.scoutAgeMin);
  });

  it('gets better as the academy does, rather than worse', () => {
    /*
     * The prototype's flat band made this node worth LESS every time the club
     * improved at youth work — the one direction an academy doctrine must
     * never point. Built on the academy's own band instead, so the two
     * investments compound.
     */
    const early = strengthOf(scoutJewel(createRng(4), 1));
    const late = strengthOf(scoutJewel(createRng(4), 5));
    expect(late).toBeGreaterThan(early);
  });

  it('arrives with no title, because the title has to be earned', () => {
    /*
     * The rule from content/talents.ts, asserted where it can be broken: a
     * Jahrhunderttalent who is seventeen and already eighty is a spawn roll
     * wearing a medal. Every `earn` predicate tests a CHANGE, and a name
     * stamped on at birth would make all of them decorative.
     */
    for (let seed = 0; seed < 20; seed++) {
      const jewel = scoutJewel(createRng(seed), 3);
      expect(jewel.trait, 'a jewel was born with a name on it').toBe(NO_TALENT);
    }
  });

  it('records the debut it actually arrived at', () => {
    /*
     * `debutStrength` and `debutAge` are what every talent measures a change
     * FROM. A jewel whose record said he debuted at the ordinary band would be
     * credited with fourteen points he was given rather than earned.
     */
    const jewel = scoutJewel(createRng(2), 3);
    expect(jewel.record.debutAge).toBe(jewel.age);
    expect(jewel.record.debutStrength).toBe(strengthOf(jewel));
  });
});
