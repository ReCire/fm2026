import { describe, it, expect } from 'vitest';
import { createRng } from '$lib/engine/rng';
import { Registry } from '$lib/engine/registry';
import { modules } from '$lib/modules';
import { buildings, buildable, totalCost } from '$lib/content/campus';
import { createCampus, migrateCampus } from './state';
import {
  levelOf, isBuilt, maxLevel, isMaxed, nextCost, canBuild, build,
  investedIn, progress, catalogue, type BuildContext
} from './rules';

const registry = new Registry(modules);
const registered = new Set(registry.all.map((m) => m.id));
const fresh = () => createCampus(createRng(1));
const ctx = (over: Partial<BuildContext> = {}): BuildContext => ({
  money: 100_000_000, registered, ranks: {}, ...over
});

/* Something that can actually be stepped: not doctrine-gated, and with room
   left above whatever the club was founded with. */
const freeToBuild = () =>
  buildable(registered).find((b) => !b.doctrine && b.costs.length > 1)
  ?? buildable(registered)[0]!;

/**
 * A club is not founded on an empty field.
 *
 * `costs[0] === 0` means "the club already has this" — four containers still
 * count as a Kabinentrakt. `built: {}` said it owned nothing, so the map drew
 * the containers while the catalogue offered to sell the manager the changing
 * rooms they were standing in, for €0. Both halves right, silently disagreeing.
 */
const founding = () => buildings.filter((b) => (b.costs[0] ?? 0) === 0);
const mustBeBuilt = () => buildable(registered).find((b) => (b.costs[0] ?? 0) > 0 && !b.doctrine);

describe('what the club starts with', () => {
  it('owns everything that costs nothing to have', () => {
    const c = fresh();
    expect(founding().length, 'no founding buildings at all').toBeGreaterThan(0);
    for (const b of founding()) {
      expect(levelOf(c, b.id), `${b.id} costs nothing and is not owned`).toBe(0);
      expect(isBuilt(c, b.id)).toBe(true);
    }
  });

  it('never offers a founding building for sale at zero', () => {
    const c = fresh();
    for (const b of founding()) {
      // It is already at level 0; the next step is a real upgrade with a price.
      const cost = nextCost(c, b);
      if (cost !== undefined) expect(cost, `${b.id} upgrade is free`).toBeGreaterThan(0);
    }
  });

  it('a plot that has to be paid for is grass until it is', () => {
    const c = fresh();
    const b = mustBeBuilt();
    if (!b) return;
    expect(levelOf(c, b.id)).toBe(-1);
    expect(isBuilt(c, b.id)).toBe(false);
    build(c, b);
    expect(levelOf(c, b.id)).toBe(0);
    expect(isBuilt(c, b.id)).toBe(true);
  });

  it('a migration does not reset a club that has already upgraded', () => {
    const upgraded = { built: { [founding()[0]!.id]: 2 }, invested: 500 };
    const after = migrateCampus(upgraded, 1);
    expect(after.built[founding()[0]!.id], 'the seed overwrote real progress').toBe(2);
    // ...and still seeds the ones the save never mentioned.
    for (const b of founding()) expect(after.built[b.id]).toBeGreaterThanOrEqual(0);
  });
});

describe('building and upgrading are the same operation', () => {
  /* `costs[0]` is the price of EXISTING at level 0, often zero. Treating the
     first purchase as a special case is how a separate, untested first-build
     path gets written. */
  it('walks the cost list one index at a time', () => {
    const c = fresh();
    const b = freeToBuild();
    for (let level = levelOf(c, b.id) + 1; level <= maxLevel(b); level++) {
      expect(nextCost(c, b)).toBe(b.costs[level]);
      build(c, b);
    }
    expect(nextCost(c, b), 'a fully built thing still had a next step').toBeUndefined();
    expect(isMaxed(c, b)).toBe(true);
  });

  it('refuses to build past the top', () => {
    const c = fresh();
    const b = freeToBuild();
    for (let i = 0; i <= maxLevel(b); i++) build(c, b);
    expect(build(c, b)).toBeUndefined();
    expect(levelOf(c, b.id)).toBe(maxLevel(b));
  });

  it('records what was spent, cumulatively', () => {
    const c = fresh();
    const b = freeToBuild();
    const start = levelOf(c, b.id);
    build(c, b);
    // `investedIn` counts from level 0, including whatever the club was founded
    // with; `invested` counts only what this club actually paid.
    expect(investedIn(c, b)).toBe(totalCost(b, start + 1));
    expect(c.invested).toBe(b.costs[start + 1]);
  });
});

describe('the gate', () => {
  /*
   * The same rule as a dormant doctrine node and an undelegable department: a
   * building whose effect has nowhere to land must not be for sale. This
   * codebase has shipped "complete, correct, connected to nothing" eleven
   * times; a building is just an expensive version of it.
   */
  it('refuses a building whose module is not in the game', () => {
    const orphan = buildings.find((b) => b.module && !registered.has(b.module));
    if (!orphan) return;
    expect(canBuild(fresh(), orphan, ctx()).ok).toBe(false);
  });

  it('sells a building whose module exists', () => {
    expect(canBuild(fresh(), freeToBuild(), ctx()).ok).toBe(true);
  });

  it('follows the registry, so a building lights up when its module lands', () => {
    const orphan = buildings.find((b) => b.module && !registered.has(b.module));
    if (!orphan) return;
    const widened = new Set([...registered, orphan.module!]);
    expect(canBuild(fresh(), orphan, ctx({ registered: widened })).ok).toBe(true);
  });

  it('holds back a building behind a doctrine rank, and names it', () => {
    const gated = buildable(registered).find((b) => b.doctrine);
    if (!gated) return;
    const check = canBuild(fresh(), gated, ctx());
    expect(check.ok).toBe(false);
    expect(check.reason).toContain('Rang');

    const ranked = { [gated.doctrine!.id]: gated.doctrine!.rank };
    expect(canBuild(fresh(), gated, ctx({ ranks: ranked })).ok).toBe(true);
  });

  it('refuses when the club cannot pay', () => {
    const b = buildable(registered).find((x) => (x.costs[0] ?? 0) > 0);
    if (!b) return;
    expect(canBuild(fresh(), b, ctx({ money: 0 })).ok).toBe(false);
  });

  it('says so when there is nothing left to build', () => {
    const c = fresh();
    const b = freeToBuild();
    for (let i = 0; i <= maxLevel(b); i++) build(c, b);
    expect(canBuild(c, b, ctx()).reason).toContain('ausgebaut');
  });
});

describe('the summary', () => {
  it('counts only what is actually sellable, and starts with the founding set', () => {
    const c = fresh();
    const { built, total } = progress(c, registered);
    expect(total).toBe(buildable(registered).length);
    expect(total, 'nothing is buildable at all').toBeGreaterThan(0);
    // Not zero: a club is founded with the things that cost nothing to have.
    expect(built).toBe(buildable(registered).filter((b) => (b.costs[0] ?? 0) === 0).length);
    expect(built).toBeLessThan(total);
  });

  it('every building appears in the catalogue exactly once', () => {
    const rows = catalogue(fresh(), ctx());
    expect(rows).toHaveLength(buildings.length);
    expect(new Set(rows.map((r) => r.building.id)).size).toBe(buildings.length);
  });

  /*
   * Campus deliberately has NO `attention`. The first version badged an empty
   * campus — but that is simply what a fourth-division club looks like, so the
   * badge would have been lit for several seasons before the player could
   * afford to change it: true, permanent, and a nudge to spend rather than
   * something waiting on a decision.
   */
  it('does not badge itself, because nothing here is ever waiting', () => {
    expect(registry.byId.get('campus')!.attention).toBeUndefined();
  });
});
