import { describe, it, expect } from 'vitest';
import { Registry } from '$lib/engine/registry';
import { modules } from '$lib/modules';
import { narratives } from './content';
import { unlockNext, applyNarrative, setBuildableModules } from './rules';

/**
 * A narrative may only promise what the game can deliver.
 *
 * `unlockOrder` named `rawMaterials` for weeks — a module that never existed
 * and never will, because materials live inside `industry`. Progression walks
 * the list and "unlocks" it, so a career silently spent one of its unlock slots
 * on nothing and every later department arrived three matchdays late. Nothing
 * errored; the ladder was simply one rung shorter than it read.
 *
 * The same check catches the opposite mistake: a department that no narrative
 * ever opens is a department nobody can reach, which is a feature built and
 * shipped to nobody.
 */
const registry = new Registry(modules);
const known = new Set(registry.all.map((m) => m.id));

describe('the unlock ladders', () => {
  it('step over a rung with nothing behind it instead of spending a slot on it', () => {
    const p = { narrativeId: '', unlocked: [] as string[], seen: [] as string[],
                delegated: {}, started: true, tutorialStep: 0 } as never as Parameters<typeof unlockNext>[0];
    const withGhosts = narratives.find((n) => n.unlockOrder.some((id) => !known.has(id)));
    if (!withGhosts) return;
    applyNarrative(p, withGhosts);
    setBuildableModules(known);

    const { unlocked } = unlockNext(p, 1);
    expect(unlocked, 'one press opened nothing real').toHaveLength(1);
    expect(known, 'a phantom rung was announced as a department').toContain(unlocked[0]!);
  });

  it('never unlock the same department twice in one career', () => {
    for (const n of narratives) {
      const all = [...n.unlockedAtStart, ...n.unlockOrder];
      expect(new Set(all).size, `"${n.id}" opens something twice`).toBe(all.length);
    }
  });

  it('reach every gated department from at least one start', () => {
    const reachable = new Set(narratives.flatMap((n) => [...n.unlockedAtStart, ...n.unlockOrder]));
    const gated = registry.all.filter((m) => m.gate).map((m) => m.id);
    const orphans = gated.filter((id) => !reachable.has(id));
    expect(orphans, 'gated departments no career can ever open').toEqual([]);
  });

  /* A roadmap entry is allowed — the ladder skips it — but it must be a name
     somebody intends to build, not a typo. This lists them so a rename shows up
     in review rather than silently becoming a no-op. */
  it('names its roadmap entries out loud', () => {
    const ghosts = new Set(
      narratives.flatMap((n) => [...n.unlockedAtStart, ...n.unlockOrder])
        .filter((id) => !known.has(id))
    );
    expect([...ghosts].sort()).toEqual(['fans', 'holding', 'rawMaterials']);
  });
});
