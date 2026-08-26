import { describe, it, expect, beforeEach } from 'vitest';
import { history, pushSnapshot, popSnapshot, clearHistory } from './history.svelte';
import type { GameState } from '$lib/engine/state';

/**
 * The undo buffer had no test, which is exactly how it shipped capped at one
 * step instead of twelve: `undo()` routed through `replaceGame()`, which called
 * `clearHistory()`. Everything passed, the constant said 12, and the button
 * greyed out after a single press.
 */
const stateAt = (tick: number, money: number): GameState =>
  ({
    meta: { seed: 1, season: 1, matchday: tick + 1, tick, createdAt: 0, lastPlayedAt: 0 },
    modules: { finance: { money } }
  }) as unknown as GameState;

beforeEach(() => clearHistory());

describe('history buffer', () => {
  it('stores and returns snapshots in reverse order', () => {
    pushSnapshot(stateAt(0, 100));
    pushSnapshot(stateAt(1, 200));
    expect(popSnapshot()!.meta.tick).toBe(1);
    expect(popSnapshot()!.meta.tick).toBe(0);
    expect(popSnapshot()).toBeUndefined();
  });

  it('keeps twelve steps, not one', () => {
    for (let i = 0; i < 12; i++) pushSnapshot(stateAt(i, i * 10));
    expect(history.entries.length).toBe(12);
    for (let i = 11; i >= 0; i--) {
      expect(popSnapshot()!.meta.tick, `step ${11 - i}`).toBe(i);
    }
  });

  it('drops the OLDEST entry past the cap, never the newest', () => {
    for (let i = 0; i < 20; i++) pushSnapshot(stateAt(i, i));
    expect(history.entries.length).toBe(12);
    expect(history.entries[0]!.tick).toBe(8);
    expect(popSnapshot()!.meta.tick).toBe(19);
  });

  it('snapshots are detached copies, so later mutation cannot rewrite history', () => {
    const live = stateAt(0, 100);
    pushSnapshot(live);
    (live.modules as any).finance.money = 999;
    expect((popSnapshot()!.modules as any).finance.money).toBe(100);
  });

  it('clearHistory empties it', () => {
    pushSnapshot(stateAt(0, 1));
    clearHistory();
    expect(history.entries.length).toBe(0);
    expect(popSnapshot()).toBeUndefined();
  });
});
