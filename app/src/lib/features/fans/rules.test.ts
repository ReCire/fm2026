import { describe, it, expect } from 'vitest';
import { createRng } from '$lib/engine/rng';
import { fanGroups, fansContent } from './content';
import { createFans } from './state';
import {
  applyAction, applyResult, canAfford, clampMood, driftFor, groupDef,
  overallMood, safetyOf, unhappy
} from './rules';

const fresh = () => createFans(createRng(1));

describe('mood', () => {
  it('clamps to 0..100', () => {
    expect(clampMood(-5)).toBe(0);
    expect(clampMood(150)).toBe(100);
    expect(clampMood(42)).toBe(42);
  });

  it('starts every faction the same and known to content.ts', () => {
    const fans = fresh();
    expect(fans.groups).toHaveLength(fanGroups.length);
    for (const g of fans.groups) expect(groupDef(g.id)).toBeDefined();
  });
});

describe('overallMood', () => {
  it('is the weighted average when every faction agrees', () => {
    const fans = fresh();
    for (const g of fans.groups) g.mood = 80;
    expect(overallMood(fans)).toBeCloseTo(80);
  });

  it('weighs factions by their share, not evenly', () => {
    const fans = fresh();
    // Push only the heaviest faction down; the average should move less than
    // an even split would, because the other three still outweigh it.
    const heaviest = [...fanGroups].sort((a, b) => b.weight - a.weight)[0]!;
    for (const g of fans.groups) g.mood = g.id === heaviest.id ? 0 : 100;
    const evenAverage = 75; // what a flat mean over 4 groups would give
    expect(overallMood(fans)).toBeGreaterThan(0);
    expect(overallMood(fans)).not.toBeCloseTo(evenAverage, 0);
  });
});

describe('safetyOf', () => {
  it('follows the prototype curve and caps at the content value', () => {
    expect(safetyOf(0)).toBe(0);
    expect(safetyOf(100)).toBe(Math.round(100 / fansContent.safetyDivisor));
    expect(safetyOf(10_000)).toBe(fansContent.safetyCap);
  });
});

describe('matchday drift', () => {
  it('rewards a win, punishes a loss, leaves a draw at its own baseline', () => {
    expect(driftFor({ goalsFor: 2, goalsAgainst: 0 })).toBe(fansContent.winBoost);
    expect(driftFor({ goalsFor: 0, goalsAgainst: 2 })).toBe(fansContent.lossPenalty);
    expect(driftFor({ goalsFor: 1, goalsAgainst: 1 })).toBe(fansContent.drawBoost);
  });

  it('moves every faction by the same amount and clamps', () => {
    const fans = fresh();
    for (const g of fans.groups) g.mood = 99;
    applyResult(fans, { goalsFor: 3, goalsAgainst: 0 });
    for (const g of fans.groups) expect(g.mood).toBe(100);

    for (const g of fans.groups) g.mood = 1;
    applyResult(fans, { goalsFor: 0, goalsAgainst: 3 });
    for (const g of fans.groups) expect(g.mood).toBe(0);
  });
});

describe('actions', () => {
  const action = { id: 'choreo', label: 'Mega-Choreo', desc: '', cost: 8000, boost: 6 };

  it('is affordable exactly at the cost, not a cent under', () => {
    expect(canAfford(8000, action)).toBe(true);
    expect(canAfford(7999, action)).toBe(false);
  });

  it('boosts every faction by the action boost', () => {
    const fans = fresh();
    const before = fans.groups.map((g) => g.mood);
    applyAction(fans, action);
    fans.groups.forEach((g, i) => expect(g.mood).toBe(clampMood(before[i]! + action.boost)));
  });
});

describe('unhappy', () => {
  it('lists only factions below the threshold', () => {
    const fans = fresh();
    fans.groups[0]!.mood = fansContent.attentionAt - 1;
    fans.groups[1]!.mood = fansContent.attentionAt;
    const bad = unhappy(fans);
    expect(bad.map((g) => g.id)).toEqual([fans.groups[0]!.id]);
  });
});
