import { describe, it, expect } from 'vitest';
import { Registry } from '$lib/engine/registry';
import { modules } from '$lib/modules';
import { createRng, seedFrom } from '$lib/engine/rng';
import { createLinkedOut } from './state';
import { MODULES_WITH_AUTOPILOT } from './module';
import {
  refresh, isRefreshDue, wageFor, ceilingFor, canHire, hire, dismiss,
  employed, wageBill, moduleFor
} from './rules';
import { hireableRoles, linkedoutContent, roles } from './content';
import type { ProgressionState } from '../progression/state';

const registry = new Registry(modules);
const autopilots = new Set(registry.all.filter((m) => m.autopilot).map((m) => m.id));
const MATCHDAYS = 34;

const progression = (): ProgressionState => ({
  narrativeId: 'aufsteiger', unlocked: [], seen: [], delegated: {},
  tutorialStep: null, started: true
});

describe('the autopilot list', () => {
  it('agrees with the registry', () => {
    /*
     * `module.ts` names the autopilot-carrying modules by hand, because a
     * module cannot import the registry that contains it without a cycle. That
     * is a second source for one fact, so it gets the test that stops it
     * drifting — the drift direction being "offers a hire that silences a
     * department nobody runs", which is the trap this whole gate exists for.
     *
     * `core` is excluded: it has an autopilot and is not a department.
     */
    const real = [...autopilots].filter((id) => id !== 'core').sort();
    expect([...MODULES_WITH_AUTOPILOT].sort()).toEqual(real);
  });

  it('only ever offers roles whose department something can run', () => {
    for (const role of hireableRoles(new Set(MODULES_WITH_AUTOPILOT))) {
      expect(autopilots, `${role.id} is hireable but ${role.module} has no autopilot`)
        .toContain(role.module);
    }
  });
});

describe('the wage ladder', () => {
  /*
   * The number the whole feature lives or dies on.
   *
   * Measured by architecture over three seasons: a competent director leaves
   * the club about €90.000 poorer in cash and one player better off, so a wage
   * much above €30.000 a season makes a good executive strictly worse than
   * doing the job yourself. The prototype's curve priced one at €221.000.
   */
  const CEILING_PER_SEASON = 30_000;

  it('keeps every honest candidate under the ceiling', () => {
    const rng = createRng(seedFrom('wages'));
    for (let competence = 35; competence <= 97; competence++) {
      const perSeason = wageFor(rng, competence) * MATCHDAYS;
      expect(perSeason, `competence ${competence} costs ${perSeason} a season`)
        .toBeLessThan(CEILING_PER_SEASON);
    }
  });

  it('prices the paywalled candidate ABOVE it, on purpose', () => {
    // A Premium profile that was worth buying would make the satire argue the
    // opposite of what it means.
    const rng = createRng(seedFrom('premium'));
    const best = wageFor(rng, linkedoutContent.premium.ceiling)
      * linkedoutContent.premium.wageMultiplier * MATCHDAYS;
    expect(best).toBeGreaterThan(CEILING_PER_SEASON);
  });

  it('rises with competence but not perfectly', () => {
    // A perfectly priced market has no bargains and no traps, so hiring is
    // arithmetic. The bands must overlap or there is nothing to judge.
    const rng = createRng(seedFrom('overlap'));
    const weak = Array.from({ length: 40 }, () => wageFor(rng, 45));
    const strong = Array.from({ length: 40 }, () => wageFor(rng, 80));
    expect(Math.max(...strong)).toBeGreaterThan(Math.max(...weak));
    expect(Math.max(...weak), 'no overlap — the market is a price list')
      .toBeGreaterThan(Math.min(...strong));
  });

  it('lets the league decide who applies', () => {
    // Nobody applies to a Regionalliga club with a 95. Climbing changes who
    // takes your call, which is the same idea as the brand tiers.
    expect(ceilingFor(0)).toBeGreaterThan(ceilingFor(3));
    expect(ceilingFor(99)).toBe(ceilingFor(3));
  });
});

describe('the pool', () => {
  it('draws a field, and only for roles that can be run', () => {
    const state = createLinkedOut(createRng(1));
    const rng = createRng(seedFrom('pool'));
    refresh(state, rng, 1, 3, new Set(MODULES_WITH_AUTOPILOT));

    expect(state.contacts.length).toBeGreaterThanOrEqual(linkedoutContent.contactsPerRefresh[0]);
    for (const c of state.contacts) {
      expect(MODULES_WITH_AUTOPILOT, `${c.roleId} cannot be run`).toContain(moduleFor(c));
    }
  });

  it('draws nothing at all when no department can be handed over', () => {
    // The state the game was in until two autopilots landed. An empty field is
    // the honest answer; a field of unhireable people would not be.
    const state = createLinkedOut(createRng(1));
    refresh(state, createRng(2), 1, 3, new Set());
    expect(state.contacts).toEqual([]);
  });

  it('locks exactly one profile until Premium, and never locks it after', () => {
    const state = createLinkedOut(createRng(1));
    refresh(state, createRng(seedFrom('lock')), 1, 3, new Set(MODULES_WITH_AUTOPILOT));
    expect(state.contacts.filter((c) => c.locked)).toHaveLength(1);

    state.premium = true;
    refresh(state, createRng(seedFrom('lock2')), 5, 3, new Set(MODULES_WITH_AUTOPILOT));
    expect(state.contacts.filter((c) => c.locked)).toHaveLength(0);
  });

  it('turns over on a cadence rather than every week', () => {
    const state = createLinkedOut(createRng(1));
    state.refreshedOn = 10;
    expect(isRefreshDue(state, 11)).toBe(false);
    expect(isRefreshDue(state, 10 + linkedoutContent.refreshEvery)).toBe(true);
  });

  it('gives a real choice per role at every draw', () => {
    /*
     * A pool that offered one candidate for one role would make a bad roll
     * lock a department until the next refresh. Averaged over draws, every
     * hireable role should see more than one name.
     */
    const state = createLinkedOut(createRng(1));
    const rng = createRng(seedFrom('choice'));
    let total = 0;
    const DRAWS = 40;
    for (let i = 0; i < DRAWS; i++) {
      refresh(state, rng, i * 4, 3, new Set(MODULES_WITH_AUTOPILOT));
      total += state.contacts.filter((c) => !c.locked).length;
    }
    const perRolePerDraw = total / DRAWS / MODULES_WITH_AUTOPILOT.length;
    expect(perRolePerDraw, 'a bad roll would lock a department').toBeGreaterThan(1.5);
  });
});

describe('hiring', () => {
  const setup = () => {
    const state = createLinkedOut(createRng(1));
    refresh(state, createRng(seedFrom('hire')), 1, 3, new Set(MODULES_WITH_AUTOPILOT));
    return { state, p: progression(), contact: state.contacts.find((c) => !c.locked)! };
  };

  it('hands the department to progression and keeps the person here', () => {
    // Two facts, two homes. The engine reads the arrangement every tick; the
    // player wants the person. Duplicating either would be a third "two
    // sources, both correct, silently different".
    const { state, p, contact } = setup();
    const moduleId = hire(state, p, contact, 5)!;
    expect(p.delegated[moduleId]).toEqual({
      executiveId: contact.id,
      competence: contact.competence / 100,
      hiredOnMatchday: 5
    });
    expect(state.hired[contact.id]).toBeDefined();
    expect(state.contacts.find((c) => c.id === contact.id)).toBeUndefined();
  });

  it('refuses a locked profile, a taken department, and a wage it cannot pay', () => {
    const { state, p, contact } = setup();
    const locked = state.contacts.find((c) => c.locked)!;
    expect(canHire(state, p, locked, 1_000_000).ok).toBe(false);
    expect(canHire(state, p, contact, 0).ok).toBe(false);

    hire(state, p, contact, 5);
    const rival = state.contacts.find((c) => moduleFor(c) === moduleFor(contact) && !c.locked);
    if (rival) expect(canHire(state, p, rival, 1_000_000).ok).toBe(false);
  });

  it('takes the department back, and the wage with it', () => {
    const { state, p, contact } = setup();
    const moduleId = hire(state, p, contact, 5)!;
    expect(wageBill(state, p)).toBe(contact.wage);

    const gone = dismiss(state, p, moduleId);
    expect(gone?.id).toBe(contact.id);
    expect(p.delegated[moduleId]).toBeUndefined();
    expect(employed(state, p)).toEqual([]);
    expect(wageBill(state, p)).toBe(0);
  });

  it('never lists an executive whose record has been lost', () => {
    // `employed` reads progression and looks the person up here. A delegation
    // whose contact is missing must drop out rather than render as undefined.
    const { state, p, contact } = setup();
    const moduleId = hire(state, p, contact, 5)!;
    delete state.hired[contact.id];
    expect(employed(state, p)).toEqual([]);
    expect(wageBill(state, p)).toBe(0);
    expect(p.delegated[moduleId]).toBeDefined();
  });
});

describe('the roles themselves', () => {
  it('never puts two people in charge of one department', () => {
    const byModule = roles.map((r) => r.module);
    expect(new Set(byModule).size).toBe(byModule.length);
  });
});
