import { describe, it, expect } from 'vitest';
import {
  isUnlocked, gatedBy, isDelegated, delegationFor, isSilenced, nextUnlock,
  unlockNext, unlock, applyNarrative, delegate, revoke, unseen, markSeen,
  progressRatio
} from './rules';
import { createProgression, migrateProgression, type ProgressionState } from './state';
import { narratives, narrativeById } from './content';
import { createRng } from '$lib/engine/rng';
import type { GameState } from '$lib/engine/state';

const fresh = (): ProgressionState => createProgression(createRng(1));
const asState = (p: ProgressionState) => ({ modules: { progression: p } } as unknown as GameState);

describe('narrative content', () => {
  it('has unique ids', () => {
    const ids = narratives.map((n) => n.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('never lists the same module both at start and in the unlock order', () => {
    for (const n of narratives) {
      const overlap = n.unlockOrder.filter((id) => n.unlockedAtStart.includes(id));
      expect(overlap, `${n.id} double-lists ${overlap.join(', ')}`).toEqual([]);
    }
  });

  it('always opens with something playable', () => {
    for (const n of narratives) {
      for (const required of ['core', 'finance', 'squad', 'league']) {
        expect(n.unlockedAtStart, `${n.id} missing ${required}`).toContain(required);
      }
    }
  });

  it('offers genuinely different opening orders, not one order reskinned', () => {
    const orders = narratives.map((n) => n.unlockOrder.slice(0, 3).join('>'));
    expect(new Set(orders).size).toBeGreaterThan(1);
  });

  it('spans a real range of starting money, including a negative balance', () => {
    const money = narratives.map((n) => n.startingMoney);
    expect(Math.min(...money)).toBeLessThan(0);
    expect(Math.max(...money)).toBeGreaterThan(1_000_000);
  });
});

describe('isUnlocked', () => {
  it('is false for everything before onboarding has run', () => {
    const p = fresh();
    expect(p.unlocked).toEqual([]);
    expect(isUnlocked(asState(p), 'finance')).toBe(false);
  });

  it('treats missing progression state as locked rather than throwing', () => {
    const empty = { modules: {} } as unknown as GameState;
    expect(isUnlocked(empty, 'finance')).toBe(false);
  });

  it('gatedBy builds a predicate over game state', () => {
    const p = fresh();
    applyNarrative(p, narrativeById('aufsteiger')!);
    const gate = gatedBy('stadium');
    expect(gate(asState(p))).toBe(true);
    expect(gatedBy('industry')(asState(p))).toBe(false);
  });
});

describe('applyNarrative', () => {
  it('opens exactly the narrative’s starting set', () => {
    const p = fresh();
    const n = narrativeById('investor')!;
    applyNarrative(p, n);
    expect([...p.unlocked].sort()).toEqual([...new Set(n.unlockedAtStart)].sort());
    expect(p.narrativeId).toBe('investor');
  });

  it('is idempotent — re-applying does not duplicate unlocks', () => {
    const p = fresh();
    const n = narrativeById('erbe')!;
    applyNarrative(p, n);
    const first = [...p.unlocked];
    applyNarrative(p, n);
    expect(p.unlocked).toEqual(first);
  });
});

describe('unlockNext', () => {
  it('follows the narrative order exactly', () => {
    const p = fresh();
    const n = narrativeById('aufsteiger')!;
    applyNarrative(p, n);
    const { unlocked } = unlockNext(p, 3);
    expect(unlocked).toEqual(n.unlockOrder.slice(0, 3));
  });

  it('stops cleanly when everything is open', () => {
    const p = fresh();
    const n = narrativeById('aufsteiger')!;
    applyNarrative(p, n);
    unlockNext(p, 999);
    const { unlocked, remaining } = unlockNext(p, 5);
    expect(unlocked).toEqual([]);
    expect(remaining).toBe(0);
    expect(nextUnlock(p)).toBeUndefined();
  });

  it('never unlocks the same module twice', () => {
    const p = fresh();
    applyNarrative(p, narrativeById('nachwuchs')!);
    unlockNext(p, 999);
    expect(new Set(p.unlocked).size).toBe(p.unlocked.length);
  });

  it('reports how many remain', () => {
    const p = fresh();
    const n = narrativeById('absturz')!;
    applyNarrative(p, n);
    const { remaining } = unlockNext(p, 2);
    expect(remaining).toBe(n.unlockOrder.length - 2);
  });
});

describe('unlock (out of order)', () => {
  it('opens a module directly and reports whether it changed anything', () => {
    const p = fresh();
    expect(unlock(p, 'underworld')).toBe(true);
    expect(unlock(p, 'underworld')).toBe(false);
    expect(p.unlocked).toContain('underworld');
  });
});

describe('delegation', () => {
  it('carries competence, which is the interesting stat rather than the wage', () => {
    const p = fresh();
    delegate(p, 'merch', { executiveId: 'exec-3', competence: 0.35, hiredOnMatchday: 9 });
    const d = delegationFor(asState(p), 'merch');
    expect(d?.competence).toBe(0.35);
    expect(isSilenced(asState(p), 'merch')).toBe(true);
    expect(isSilenced(asState(p), 'stocks')).toBe(false);
  });

  it('stores a copy, so a later edit to the caller\'s object cannot rewrite state', () => {
    const p = fresh();
    const exec = { executiveId: 'exec-9', competence: 0.5, hiredOnMatchday: 1 };
    delegate(p, 'youth', exec);
    exec.competence = 0.99;
    expect(delegationFor(asState(p), 'youth')?.competence).toBe(0.5);
  });

  it('round-trips', () => {
    const p = fresh();
    expect(isDelegated(asState(p), 'industry')).toBe(false);
    delegate(p, 'industry', { executiveId: 'exec-7', competence: 0.8, hiredOnMatchday: 4 });
    expect(isDelegated(asState(p), 'industry')).toBe(true);
    expect(revoke(p, 'industry')).toBe(true);
    expect(isDelegated(asState(p), 'industry')).toBe(false);
  });

  it('revoking something never delegated is a no-op, not an error', () => {
    expect(revoke(fresh(), 'nothing')).toBe(false);
  });
});

describe('seen / unseen', () => {
  it('reports unlocked-but-unvisited modules', () => {
    const p = fresh();
    applyNarrative(p, narrativeById('aufsteiger')!);
    expect(unseen(p).length).toBe(p.unlocked.length);
    markSeen(p, 'finance');
    expect(unseen(p)).not.toContain('finance');
  });

  it('marking twice does not duplicate', () => {
    const p = fresh();
    markSeen(p, 'squad');
    markSeen(p, 'squad');
    expect(p.seen.filter((s) => s === 'squad')).toHaveLength(1);
  });
});

describe('progressRatio', () => {
  it('runs from 0 to 1 across the narrative', () => {
    const p = fresh();
    applyNarrative(p, narrativeById('aufsteiger')!);
    expect(progressRatio(p)).toBe(0);
    unlockNext(p, 999);
    expect(progressRatio(p)).toBe(1);
  });

  it('returns 1 for an unknown narrative rather than dividing by zero', () => {
    const p = fresh();
    p.narrativeId = 'does-not-exist';
    expect(progressRatio(p)).toBe(1);
  });
});

describe('migration to v2', () => {
  it('carries a v1 bare-string delegation forward rather than dropping it', () => {
    const v1 = {
      narrativeId: 'investor',
      unlocked: ['core', 'finance'],
      seen: ['finance'],
      delegated: { industry: 'exec-4' },
      tutorialStep: 2,
      started: true
    };
    const out = migrateProgression(v1, 1);
    expect(out.delegated.industry).toEqual({
      executiveId: 'exec-4',
      competence: 0.6,
      hiredOnMatchday: 0
    });
    expect(out.narrativeId).toBe('investor');
    expect(out.unlocked).toEqual(['core', 'finance']);
  });

  it('fills sane defaults for a truncated save rather than throwing', () => {
    const out = migrateProgression({}, 1);
    expect(out.narrativeId).toBe('aufsteiger');
    expect(out.unlocked).toEqual([]);
    expect(out.started).toBe(false);
  });

  it('passes a v2 record through untouched', () => {
    const v2 = {
      narrativeId: 'erbe', unlocked: [], seen: [], tutorialStep: null, started: true,
      delegated: { merch: { executiveId: 'e1', competence: 0.9, hiredOnMatchday: 3 } }
    };
    expect(migrateProgression(v2, 2).delegated.merch!.competence).toBe(0.9);
  });
});

describe('silencing is for the player, not the machinery', () => {
  /**
   * Pins the distinction that fm-03-design's autopilot bug turned on: an
   * autopilot reading a view already filtered by `isSilenced` sees nothing to
   * do, because it is by construction running for a hidden department. The two
   * consumers must never share a filtered list.
   */
  it('reports a delegated department as silenced AND still delegated', () => {
    const p = fresh();
    delegate(p, 'industry', { executiveId: 'e1', competence: 0.4, hiredOnMatchday: 3 });
    const s = asState(p);

    // The player's view: hidden.
    expect(isSilenced(s, 'industry')).toBe(true);
    // The machinery's view: present, with everything it needs to act.
    expect(delegationFor(s, 'industry')).toEqual({
      executiveId: 'e1',
      competence: 0.4,
      hiredOnMatchday: 3
    });
  });

  it('a department nobody runs is neither silenced nor delegated', () => {
    const s = asState(fresh());
    expect(isSilenced(s, 'stocks')).toBe(false);
    expect(delegationFor(s, 'stocks')).toBeUndefined();
  });

  it('taking a department back restores it to both views at once', () => {
    const p = fresh();
    delegate(p, 'merch', { executiveId: 'e2', competence: 0.9, hiredOnMatchday: 1 });
    revoke(p, 'merch');
    expect(isSilenced(asState(p), 'merch')).toBe(false);
    expect(delegationFor(asState(p), 'merch')).toBeUndefined();
  });
});
