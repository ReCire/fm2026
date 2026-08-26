import { describe, it, expect } from 'vitest';
import { designIntent, intentFor, intentByModule } from './design-intent';
import { Registry } from '$lib/engine/registry';
import { modules } from '$lib/modules';

const registry = new Registry(modules);

/**
 * Design intent is data, so it can be checked like data. These tests stop the
 * record rotting into a list of half-filled notes, and stop an entry being
 * quietly orphaned once its module lands.
 */
describe('design intent', () => {
  it('is complete for every entry', () => {
    for (const d of designIntent) {
      expect(d.constant, `${d.id} constant`).toBeTruthy();
      expect(d.value, `${d.id} value`).toBeTruthy();
      expect(d.module, `${d.id} module`).toBeTruthy();
      expect(d.source, `${d.id} source`).toBeTruthy();
      // The two fields that carry the actual knowledge get a length floor:
      // a one-word "why" is the failure this record exists to prevent.
      expect(d.rationale.length, `${d.id} rationale too short`).toBeGreaterThan(40);
      expect(d.failureMode.length, `${d.id} failureMode too short`).toBeGreaterThan(40);
    }
  });

  it('has no duplicate ids', () => {
    const ids = designIntent.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('names its module as the id prefix, so entries cannot drift from their owner', () => {
    for (const d of designIntent) {
      expect(d.id.startsWith(`${d.module}.`), `${d.id} should start with "${d.module}."`).toBe(true);
    }
  });

  /**
   * The point of the record: once a module is ported, its rationale should be
   * visible to the player, not sitting in a holding pen. This test lists the
   * entries that still need wiring, and fails once a ported module leaves one
   * stranded.
   */
  it('surfaces rationale for every module that has already been ported', () => {
    const docs = registry.docs();
    const ported = new Set(registry.all.map((m) => m.id));
    const stranded: string[] = [];

    for (const d of designIntent) {
      if (!ported.has(d.module)) continue; // not ported yet — fine
      const surfaced = [...docs.values()].some(
        (entry) => entry.module === d.module && (entry.why ?? '').length > 0
      );
      if (!surfaced) stranded.push(d.id);
    }

    expect(stranded, 'ported modules with design intent that reaches no doc entry').toEqual([]);
  });

  it('looks entries up by id and by module', () => {
    expect(intentFor('squad.injuryBaseRisk')?.value).toContain('0.055');
    expect(intentFor('nope.nothing')).toBeUndefined();
    expect(intentByModule('doctrine').length).toBeGreaterThanOrEqual(4);
  });
});
