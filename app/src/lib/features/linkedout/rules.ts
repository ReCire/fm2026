import type { Rng } from '$lib/engine/rng';
import type { LinkedOutState, Contact } from './state';
import type { ProgressionState } from '../progression/state';
import { delegate, revoke } from '../progression/rules';
import {
  roleById,
  hireableRoles,
  competenceCeiling,
  linkedoutContent,
  blurbs,
  firstNames,
  lastNames,
  bandFor,
  type Role
} from './content';

/**
 * How the network behaves. Pure functions over plain data.
 *
 * The one rule underneath all of it: `competence` is the interesting number and
 * the wage is not. A weak executive decides everything, on time, and some of it
 * is wrong — so nothing here may make competence look like speed or like a
 * convenience tier.
 */

export function contactName(rng: Rng): string {
  return `${rng.pick(firstNames)} ${rng.pick(lastNames)}`;
}

/**
 * The ceiling on who applies, by league level.
 *
 * Nobody applies to a Regionalliga club with a 95. This is the same idea as the
 * brand tiers: the world tells you where you are without a number saying so,
 * and climbing changes who takes your call.
 */
export function ceilingFor(leagueLevel: number): number {
  return competenceCeiling[leagueLevel] ?? competenceCeiling[competenceCeiling.length - 1]!;
}

/**
 * Wage from competence, imperfectly, and the imperfection is the point.
 *
 * A perfectly priced market has no bargains and no traps, so hiring becomes
 * arithmetic rather than judgement. The noise is what leaves room for a good
 * decision and a bad one.
 */
export function wageFor(rng: Rng, competence: number): number {
  const { curve, noise, step } = linkedoutContent.wageFromCompetence;
  const raw = competence * competence * curve + rng.next() * noise;
  return Math.max(step, Math.round(raw / step) * step);
}

export function makeContact(
  rng: Rng,
  state: LinkedOutState,
  role: Role,
  leagueLevel: number,
  locked = false
): Contact {
  const ceiling = ceilingFor(leagueLevel);
  const base = Math.round(rng.float(38, ceiling));
  const competence = locked
    ? Math.min(linkedoutContent.premium.ceiling, base + linkedoutContent.premium.competenceBonus)
    : Math.max(35, Math.min(ceiling, base));
  const wage = Math.round(
    wageFor(rng, competence) * (locked ? linkedoutContent.premium.wageMultiplier : 1)
  );

  return {
    id: `lo${state.nextId++}`,
    name: contactName(rng),
    roleId: role.id,
    competence,
    wage,
    // 45% first degree, then 25% second, the rest third. Pure texture.
    degree: rng.chance(0.45) ? 1 : rng.chance(0.45) ? 2 : 3,
    blurb: rng.pick(blurbs),
    locked
  };
}

/**
 * Is the pool stale?
 *
 * A pool that never turns over is a menu, and a menu has no moment in it. The
 * decision to hire someone only exists because next week these people are
 * somewhere else.
 */
export function isRefreshDue(state: LinkedOutState, matchday: number): boolean {
  return matchday - state.refreshedOn >= linkedoutContent.refreshEvery;
}

/**
 * Draw a new field.
 *
 * Only roles whose department can actually be handed over — a module with no
 * `autopilot` would be silenced without anyone running it, so listing a
 * candidate for one would be selling a wage in exchange for a department going
 * dark. Everything else shows as pending on the surface instead, which is a
 * roadmap rather than a lie.
 */
export function refresh(
  state: LinkedOutState,
  rng: Rng,
  matchday: number,
  leagueLevel: number,
  modulesWithAutopilot: ReadonlySet<string>
): void {
  state.refreshedOn = matchday;

  const roles = hireableRoles(modulesWithAutopilot);
  if (roles.length === 0) {
    state.contacts = [];
    return;
  }

  const [min, max] = linkedoutContent.contactsPerRefresh;
  const count = rng.int(min, max);
  const fresh: Contact[] = [];
  for (let i = 0; i < count; i++) {
    fresh.push(makeContact(rng, state, rng.pick(roles), leagueLevel));
  }

  /*
   * One locked profile per refresh, unless Premium.
   *
   * It is always better than anything else on the page, which is the joke and
   * also why it must never be purchasable: a paywall that sold a better
   * executive would stop being satire about career networks and become one.
   * Premium reveals the name. That is all it does.
   */
  if (!state.premium) {
    fresh.splice(Math.min(2, fresh.length), 0, makeContact(rng, state, rng.pick(roles), leagueLevel, true));
  }

  state.contacts = fresh;
}

/** Which department this contact would take over, or undefined if the role is gone. */
export function moduleFor(contact: Contact): string | undefined {
  return roleById.get(contact.roleId)?.module;
}

export interface HireCheck {
  ok: boolean;
  reason: string;
}

export function canHire(
  state: LinkedOutState,
  progression: ProgressionState,
  contact: Contact,
  money: number
): HireCheck {
  if (contact.locked) {
    return { ok: false, reason: 'Profil gesperrt. LinkedOut Premium zeigt den Namen.' };
  }
  const moduleId = moduleFor(contact);
  if (!moduleId) return { ok: false, reason: 'Diese Position gibt es nicht mehr.' };
  if (progression.delegated[moduleId]) {
    return { ok: false, reason: 'Diese Abteilung ist bereits übergeben.' };
  }
  /*
   * A matchday's wage up front, so hiring costs something at the moment you do
   * it rather than only in a ledger line four weeks later. Without it the
   * decision has no weight at the point it is made.
   */
  if (money < contact.wage) {
    return { ok: false, reason: 'Der Verein kann sich das Gehalt gerade nicht leisten.' };
  }
  return { ok: true, reason: '' };
}

/**
 * Hand a department over.
 *
 * Competence goes to `progression` as 0..1 because that is what the engine
 * hands the autopilot; the person stays here. One fact, one home, each.
 */
export function hire(
  state: LinkedOutState,
  progression: ProgressionState,
  contact: Contact,
  matchday: number
): string | undefined {
  const moduleId = moduleFor(contact);
  if (!moduleId) return undefined;

  delegate(progression, moduleId, {
    executiveId: contact.id,
    competence: contact.competence / 100,
    hiredOnMatchday: matchday
  });
  state.hired[contact.id] = { ...contact };
  state.contacts = state.contacts.filter((c) => c.id !== contact.id);
  return moduleId;
}

/** Take a department back. The person leaves the payroll and the record. */
export function dismiss(
  state: LinkedOutState,
  progression: ProgressionState,
  moduleId: string
): Contact | undefined {
  const entry = progression.delegated[moduleId];
  if (!entry) return undefined;
  const contact = state.hired[entry.executiveId];
  revoke(progression, moduleId);
  if (contact) delete state.hired[entry.executiveId];
  return contact;
}

/** Everyone currently running a department, with the department they run. */
export function employed(
  state: LinkedOutState,
  progression: ProgressionState
): { moduleId: string; contact: Contact }[] {
  return Object.entries(progression.delegated)
    .map(([moduleId, entry]) => ({ moduleId, contact: state.hired[entry.executiveId] }))
    .filter((row): row is { moduleId: string; contact: Contact } => !!row.contact);
}

/** What the executives cost per matchday, together. */
export function wageBill(state: LinkedOutState, progression: ProgressionState): number {
  return employed(state, progression).reduce((sum, row) => sum + row.contact.wage, 0);
}

/**
 * Whether this hire is worth the money, in the player's terms.
 *
 * Not a score. A band and a wage, so the surface can put the two next to each
 * other and let the player decide — which is the actual decision, and one the
 * game should not make for them.
 */
export function appraise(contact: Contact) {
  return { band: bandFor(contact.competence), wage: contact.wage };
}
