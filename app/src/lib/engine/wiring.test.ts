import { describe, it, expect } from 'vitest';
import { Registry } from './registry';
import { modules } from '$lib/modules';
import { installDocs, doc } from '$lib/docs/registry';

/**
 * A feature that exists on disk must actually be wired into the registry.
 *
 * `verify` once went green with a finished screen unreachable and finished
 * tooltips uninstalled: the docs gate scans `docs.ts` files STATICALLY, so the
 * entries counted, while the route resolves `mod.screen?.()` and `docs: {}`
 * meant `installDocs` never saw them. The gate certified UI that did not ship
 * and tooltips that resolved to nothing.
 *
 * Sixth instance of the same shape — the artifact says one thing and contains
 * another, and nothing objects — and that time inside the gate built to catch
 * the fifth.
 *
 * The file lists come from `import.meta.glob`, which is the bundler's own view
 * of the tree. Generated rather than typed: a maintained list would need the
 * same discipline that failed. It also means this runs identically under
 * `svelte-check` and `vitest`, with no Node type dependency.
 */
const featureName = (path: string) => path.split('/features/')[1]!.split('/')[0]!;
const names = (glob: Record<string, unknown>) => new Set(Object.keys(glob).map(featureName));

const SCREENS = names(import.meta.glob('../features/*/Screen.svelte'));
const DOC_FILES = names(import.meta.glob('../features/*/docs.ts'));
const RULES = names(import.meta.glob('../features/*/rules.ts'));
const RULE_TESTS = names(import.meta.glob('../features/*/rules.test.ts'));
const MODULE_FILES = names(import.meta.glob('../features/*/module.ts'));

const registry = new Registry(modules);
installDocs(registry.docs());

describe('features on disk are wired into the registry', () => {
  it('every feature folder is a registered module', () => {
    const registered = new Set(registry.all.map((m) => m.id));
    const orphans = [...MODULE_FILES].filter((d) => !registered.has(d));
    expect(orphans, 'feature folders that no module registers').toEqual([]);
  });

  /**
   * These now guard DISCOVERY rather than hand-wiring.
   *
   * The plumbing used to be two lines in each module.ts and this test caught
   * two people forgetting them. A check that keeps catching the same omission
   * is telling you the omission should not be possible — so `discover.ts` reads
   * both from disk, and these assert the discovery actually worked. The shape
   * of the failure changed; the need for the check did not.
   */
  it('a folder with Screen.svelte registers a screen', () => {
    const missing = [...SCREENS].filter((d) => {
      const mod = registry.byId.get(d);
      return mod && !mod.screen;
    });
    expect(missing, 'features whose screen exists but is unreachable').toEqual([]);
  });

  it('every docs.ts contributes entries — discovery recognises it by shape, so a drifted shape must fail loudly', () => {
    const missing: string[] = [];
    for (const d of DOC_FILES) {
      const mod = registry.byId.get(d);
      if (!mod) continue;
      const ids = Object.keys(mod.docs ?? {});
      if (ids.length === 0) {
        missing.push(`${d} (docs.ts exists but is not passed to the module)`);
        continue;
      }
      // Non-empty is not enough. A tooltip reads the INSTALLED lookup, so that
      // is what has to resolve.
      const uninstalled = ids.filter((id) => doc(id) === undefined);
      if (uninstalled.length > 0) missing.push(`${d} (${uninstalled.length} entries never install)`);
    }
    expect(missing, 'features whose docs exist but never reach a tooltip').toEqual([]);
  });

  it('a folder with rules.ts has tests for them', () => {
    const missing = [...RULES].filter((d) => !RULE_TESTS.has(d));
    expect(missing, 'features with untested rules').toEqual([]);
  });

  it('no doc entry outlives its module', () => {
    const known = new Set(registry.all.map((m) => m.id));
    for (const [, entry] of registry.docs()) {
      expect(known.has(entry.module), `doc from unregistered module "${entry.module}"`).toBe(true);
    }
  });
});
