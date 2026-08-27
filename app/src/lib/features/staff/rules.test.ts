import { describe, it, expect } from 'vitest';
import {
  isEmployed, employed, available, wageBill, canHire, hire, dismiss,
  contributions, combinedFactor, combinedAdd, touchedKeys
} from './rules';
import { createStaff, type StaffState } from './state';
import { STAFF_ROLES, roleById } from './content';
import { createRng } from '$lib/engine/rng';

const fresh = (): StaffState => createStaff(createRng(1));
const anyRole = () => STAFF_ROLES[0]!;

describe('content', () => {
  it('has unique ids', () => {
    const ids = STAFF_ROLES.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('gives every role at least one effect that actually does something', () => {
    for (const r of STAFF_ROLES) {
      expect(r.effects.length, r.id).toBeGreaterThan(0);
      for (const e of r.effects) {
        expect(e.factor !== undefined || e.add !== undefined, `${r.id} -> ${e.key}`).toBe(true);
      }
    }
  });

  it('prices every role above its own wage, so hiring is a decision not a formality', () => {
    for (const r of STAFF_ROLES) expect(r.cost, r.id).toBeGreaterThan(r.wage);
  });

  it('describes every role in the player’s terms', () => {
    for (const r of STAFF_ROLES) expect(r.blurb.length, r.id).toBeGreaterThan(20);
  });

  /**
   * A factor of exactly 1 or an add of exactly 0 is an effect that does nothing
   * — the invisible-stat failure, written directly into content.
   */
  it('has no effect that resolves to no change', () => {
    for (const r of STAFF_ROLES) {
      for (const e of r.effects) {
        if (e.factor !== undefined) expect(e.factor, `${r.id} -> ${e.key}`).not.toBe(1);
        if (e.add !== undefined) expect(e.add, `${r.id} -> ${e.key}`).not.toBe(0);
      }
    }
  });
});

describe('hiring', () => {
  it('refuses when the money is not there, and says how much is missing', () => {
    const s = fresh();
    const r = anyRole();
    const res = canHire(s, r.id, r.cost - 1);
    expect(res.ok).toBe(false);
    expect(res.reason).toMatch(/Es fehlen/);
  });

  it('refuses a second hire of the same role, by name', () => {
    const s = fresh();
    const r = anyRole();
    hire(s, r.id, 3);
    expect(canHire(s, r.id, 999_999).reason).toContain(r.name);
  });

  it('refuses an unknown role rather than throwing', () => {
    expect(canHire(fresh(), 'nobody', 999_999).ok).toBe(false);
  });

  it('records the matchday, so tenure is knowable later', () => {
    const s = fresh();
    hire(s, anyRole().id, 12);
    expect(s.hired[anyRole().id]).toBe(12);
  });

  it('round-trips', () => {
    const s = fresh();
    const r = anyRole();
    expect(hire(s, r.id, 1)).toBe(true);
    expect(isEmployed(s, r.id)).toBe(true);
    expect(dismiss(s, r.id)).toBe(true);
    expect(isEmployed(s, r.id)).toBe(false);
  });

  it('dismissing someone never employed is a no-op, not an error', () => {
    expect(dismiss(fresh(), 'physio')).toBe(false);
  });

  it('employed and available always partition the roster', () => {
    const s = fresh();
    hire(s, 'physio', 1);
    hire(s, 'scout', 1);
    expect(employed(s).length + available(s).length).toBe(STAFF_ROLES.length);
  });
});

describe('wages', () => {
  it('is zero with nobody employed', () => {
    expect(wageBill(fresh())).toBe(0);
  });
  it('sums only the employed', () => {
    const s = fresh();
    hire(s, 'physio', 1);
    expect(wageBill(s)).toBe(roleById('physio')!.wage);
  });
});

describe('contributions', () => {
  it('are empty with nobody employed', () => {
    expect(contributions(fresh())).toEqual([]);
  });

  it('name their source, so the player can see what they bought', () => {
    const s = fresh();
    hire(s, 'physio', 1);
    for (const c of contributions(s)) expect(c.from).toBe(roleById('physio')!.name);
  });

  it('combine multiplicatively on a shared key', () => {
    const s = fresh();
    hire(s, 'fitCoach', 1);
    expect(combinedFactor(s, 'squad.fitnessLoss')).toBeCloseTo(0.7, 5);
  });

  it('combine additively on a shared key', () => {
    const s = fresh();
    hire(s, 'coTrainer', 1);
    expect(combinedAdd(s, 'squad.strengthBonus')).toBe(2);
  });

  it('returns the identity for a key nobody touches', () => {
    expect(combinedFactor(fresh(), 'nothing.here')).toBe(1);
    expect(combinedAdd(fresh(), 'nothing.here')).toBe(0);
  });

  it('lists every key the backroom touches, for the effects summary', () => {
    const s = fresh();
    hire(s, 'physio', 1);
    expect(touchedKeys(s)).toEqual(['squad.injuryDuration', 'squad.injuryRisk']);
  });

  /**
   * The point of the declarative design: staff never names a system, so a role
   * can be added or removed without any other module knowing.
   */
  it('lets a role be removed without stranding anything', () => {
    const s = fresh();
    for (const r of STAFF_ROLES) hire(s, r.id, 1);
    const before = touchedKeys(s).length;
    dismiss(s, 'physio');
    expect(touchedKeys(s).length).toBeLessThanOrEqual(before);
    expect(contributions(s).every((c) => c.from !== roleById('physio')!.name)).toBe(true);
  });
});
