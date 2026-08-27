import type { StaffState } from './state';
import { STAFF_ROLES, roleById, type StaffRole } from './content';

/**
 * Staff rules. Pure functions over plain data.
 *
 * Nothing here knows what any effect key means. A role declares a key and a
 * value; the module contributes it to the bus; whoever consumes that key
 * applies it. Adding a role is a content edit, and removing one cannot strand a
 * check in another system.
 */

export function isEmployed(staff: StaffState, roleId: string): boolean {
  return roleId in staff.hired;
}

export function employed(staff: StaffState): StaffRole[] {
  return STAFF_ROLES.filter((r) => isEmployed(staff, r.id));
}

export function available(staff: StaffState): StaffRole[] {
  return STAFF_ROLES.filter((r) => !isEmployed(staff, r.id));
}

/** Per-matchday wage bill for the backroom. */
export function wageBill(staff: StaffState): number {
  return employed(staff).reduce((sum, r) => sum + r.wage, 0);
}

export interface HireResult {
  ok: boolean;
  reason?: string;
  cost: number;
}

/**
 * Can this role be hired right now?
 *
 * Reported rather than silently refused: a greyed-out card with no explanation
 * is the same failure as a disabled button with no reason attached.
 */
export function canHire(staff: StaffState, roleId: string, money: number): HireResult {
  const role = roleById(roleId);
  if (!role) return { ok: false, reason: 'Diese Position gibt es nicht.', cost: 0 };
  if (isEmployed(staff, roleId)) {
    return { ok: false, reason: `${role.name} ist bereits angestellt.`, cost: role.cost };
  }
  if (money < role.cost) {
    return {
      ok: false,
      reason: `Es fehlen ${Math.round(role.cost - money).toLocaleString('de-DE')} €.`,
      cost: role.cost
    };
  }
  return { ok: true, cost: role.cost };
}

export function hire(staff: StaffState, roleId: string, matchday: number): boolean {
  if (!roleById(roleId) || isEmployed(staff, roleId)) return false;
  staff.hired[roleId] = matchday;
  return true;
}

export function dismiss(staff: StaffState, roleId: string): boolean {
  if (!isEmployed(staff, roleId)) return false;
  delete staff.hired[roleId];
  return true;
}

export interface Contribution {
  key: string;
  factor?: number;
  add?: number;
  from: string;
}

/**
 * Everything the current backroom contributes, flattened.
 *
 * Returned as data rather than applied here so it can be tested without a tick,
 * and shown to the player as "what your staff is actually doing" — a stat that
 * resolves nowhere the player can see it is a stat that may as well not exist.
 */
export function contributions(staff: StaffState): Contribution[] {
  return employed(staff).flatMap((role) =>
    role.effects.map((e) => ({ key: e.key, factor: e.factor, add: e.add, from: role.name }))
  );
}

/** The combined multiplier for one key, for display. */
export function combinedFactor(staff: StaffState, key: string): number {
  return contributions(staff)
    .filter((c) => c.key === key && c.factor !== undefined)
    .reduce((f, c) => f * c.factor!, 1);
}

/** The combined addend for one key, for display. */
export function combinedAdd(staff: StaffState, key: string): number {
  return contributions(staff)
    .filter((c) => c.key === key && c.add !== undefined)
    .reduce((t, c) => t + c.add!, 0);
}

/** Every key the current backroom touches, for the effects summary. */
export function touchedKeys(staff: StaffState): string[] {
  return [...new Set(contributions(staff).map((c) => c.key))].sort();
}
