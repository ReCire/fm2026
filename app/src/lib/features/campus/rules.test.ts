import { describe, it, expect } from 'vitest';
import { createRng } from '$lib/engine/rng';
import { Registry } from '$lib/engine/registry';
import { modules } from '$lib/modules';
import { buildings, buildable, totalCost } from '$lib/content/campus';
import { createCampus } from './state';
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

const freeToBuild = () =>
  buildable(registered).find((b) => !b.doctrine && (b.costs[0] ?? 0) === 0)
  ?? buildable(registered)[0]!;

describe('an unbuilt plot is grass, not a building at level zero', () => {
  it('reports -1 for something never built', () => {
    const c = fresh();
    expect(levelOf(c, buildings[0]!.id)).toBe(-1);
    expect(isBuilt(c, buildings[0]!.id)).toBe(false);
  });

  it('level 0 is a real, owned building', () => {
    const c = fresh();
    const b = freeToBuild();
    build(c, b);
    expect(levelOf(c, b.id)).toBe(0);
    expect(isBuilt(c, b.id)).toBe(true);
  });
});

describe('building and upgrading are the same operation', () => {
  /* `costs[0]` is the price of EXISTING at level 0, often zero. Treating the
     first purchase as a special case is how a separate, untested first-build
     path gets written. */
  it('walks the cost list one index at a time', () => {
    const c = fresh();
    const b = freeToBuild();
    for (let level = 0; level <= maxLevel(b); level++) {
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
    build(c, b);
    build(c, b);
    expect(investedIn(c, b)).toBe(totalCost(b, 1));
    expect(c.invested).toBe(totalCost(b, 1));
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
  it('counts only what is actually sellable', () => {
    const c = fresh();
    const { built, total } = progress(c, registered);
    expect(built).toBe(0);
    expect(total).toBe(buildable(registered).length);
    expect(total, 'nothing is buildable at all').toBeGreaterThan(0);
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
