import { describe, it, expect } from 'vitest';
import { Registry } from '$lib/engine/registry';
import { modules } from '$lib/modules';
import {
  categories, categoryIds, roles, roleById, bands, bandFor,
  hireableRoles, pendingRoles, blurbs, firstNames, lastNames,
  competenceCeiling, linkedoutContent
} from './content';

const registry = new Registry(modules);
const registered = new Set(registry.all.map((m) => m.id));
const withAutopilot = new Set(registry.all.filter((m) => m.autopilot).map((m) => m.id));

describe('roles', () => {
  it('name a real module and a real category', () => {
    for (const r of roles) {
      expect(registered, `${r.id} delegates "${r.module}", which is not a module`).toContain(r.module);
      expect(categoryIds, `${r.id} is filed under "${r.category}"`).toContain(r.category);
    }
  });

  it('never puts two people in charge of one department', () => {
    const byModule = roles.map((r) => r.module);
    expect(new Set(byModule).size, 'two roles delegate the same module').toBe(byModule.length);
  });

  it('only offers departments that something can actually run', () => {
    /*
     * The gate, and the reason it exists.
     *
     * `clock.ts` runs a delegated module's autopilot INSTEAD of its normal
     * hook — and falls back to the normal hook when there is no autopilot,
     * while `isSilenced` hides the department from the player either way. So
     * hiring into a department with no autopilot buys a wage, a silent nav
     * entry, and offers that expire unanswered because nobody can see them and
     * nothing replaced the player.
     *
     * Today this list is empty, and that is the correct state of the game
     * rather than a broken test: no department has an autopilot yet.
     */
    for (const r of hireableRoles(withAutopilot)) {
      expect(withAutopilot, `${r.id} is hireable but ${r.module} has no autopilot`).toContain(r.module);
    }
  });

  it('lights a role up the moment its autopilot lands', () => {
    const before = hireableRoles(withAutopilot).length;
    const after = hireableRoles(new Set([...withAutopilot, 'transfer'])).length;
    expect(after, 'the gate does not move when an autopilot appears').toBeGreaterThan(before);
  });

  it('shows the rest as pending rather than hiding them', () => {
    // Unlike a badge, an undelegable department is worth naming: the player
    // can see the shape of the thing they will eventually be able to hand
    // over, and the copy says why they cannot yet.
    const pending = pendingRoles(registered, withAutopilot);
    expect(pending.length, 'nothing is pending — is every department delegable?').toBeGreaterThan(0);
    for (const r of pending) expect(withAutopilot).not.toContain(r.module);
  });

  it('describes what leaves your desk, not what the department is called', () => {
    for (const r of roles) {
      expect(r.takesOver.length, `${r.id} has no promise attached`).toBeGreaterThan(40);
      expect(
        r.takesOver.toLowerCase().includes(r.title.toLowerCase()),
        `${r.id} restates its own title instead of naming decisions`
      ).toBe(false);
    }
  });
});

describe('competence bands', () => {
  it('cover the whole range, highest first', () => {
    expect(bands[bands.length - 1]!.from).toBe(0);
    for (let i = 1; i < bands.length; i++) {
      expect(bands[i - 1]!.from, `band ${i} is out of order`).toBeGreaterThan(bands[i]!.from);
    }
  });

  it('resolve a band at every value from 0 to 100', () => {
    for (let v = 0; v <= 100; v++) expect(bandFor(v), `no band for ${v}`).toBeDefined();
    expect(bandFor(0).id).toBe('thin');
    expect(bandFor(100).id).toBe('strong');
  });

  it('are separable without colour', () => {
    expect(new Set(bands.map((b) => b.mark)).size).toBe(bands.length);
    expect(new Set(bands.map((b) => b.label)).size).toBe(bands.length);
  });

  it('never promises speed', () => {
    /*
     * The engine's contract is that a mediocre executive decides BADLY, not
     * slowly — visible on the balance sheet rather than in a prompt. If this
     * copy sells competence as a convenience tier, the number stops meaning
     * what the engine does with it, and the wage stops being a trade.
     */
    for (const b of bands) {
      expect(b.means, `${b.id} sells competence as speed`).not.toMatch(
        /schnell|langsam|zügig|dauert länger|Tempo/i
      );
      expect(b.means.length).toBeGreaterThan(30);
    }
  });
});

describe('the world', () => {
  it('raises the ceiling as you climb', () => {
    expect(competenceCeiling).toHaveLength(4);
    for (let l = 1; l < competenceCeiling.length; l++) {
      expect(competenceCeiling[l - 1], `level ${l}`).toBeGreaterThan(competenceCeiling[l]!);
    }
  });

  it('has enough people not to repeat itself immediately', () => {
    // 20 x 16 names against five to seven contacts a refresh.
    expect(firstNames.length * lastNames.length).toBeGreaterThan(300);
    expect(blurbs.length).toBeGreaterThan(linkedoutContent.contactsPerRefresh[1]);
    expect(new Set(blurbs).size).toBe(blurbs.length);
    expect(new Set(categories.map((c) => c.note)).size).toBe(categories.length);
  });

  it('sells premium visibility, never premium ability', () => {
    // The satire only works while the paywall is annoying and ignorable. The
    // moment it sells a better executive it stops being a joke about career
    // networks and becomes one.
    expect(linkedoutContent.premium.wageMultiplier).toBeGreaterThan(1);
    expect(roleById.size).toBe(roles.length);
  });
});
