import { describe, it, expect } from 'vitest';
import { Registry } from '$lib/engine/registry';
import { modules } from '$lib/modules';
import { narratives } from './content';

const registry = new Registry(modules);
const registered = new Set(registry.all.map((m) => m.id));
/** The only modules an unlock can actually open. Everything else is always on. */
const gated = new Set(registry.all.filter((m) => m.gate).map((m) => m.id));

/**
 * Names in a ladder that point at departments not built yet.
 *
 * Listed out loud so a rename shows up in review instead of becoming a silent
 * no-op, and so this file says which half of the roadmap is fiction.
 */
const ROADMAP = new Set(['fans', 'holding', 'rawMaterials', 'stocks']);

describe('every narrative reaches the whole game', () => {
  it('opens every gated department, eventually', () => {
    /*
     * The one that mattered. `industry` — the merchandise factory economy that
     * is half of the original brief — appeared in exactly one narrative's
     * ladder, so four careers out of five could never see a factory. The
     * architect had just finished building B2B orders for it.
     *
     * A department nobody can reach is the same silent failure as an effect
     * nobody reads, and it presents as a design choice rather than a bug.
     */
    for (const n of narratives) {
      const reachable = new Set([...n.unlockedAtStart, ...n.unlockOrder]);
      const missing = [...gated].filter((id) => !reachable.has(id));
      expect(missing, `${n.id} can never open: ${missing.join(', ')}`).toEqual([]);
    }
  });

  it('never spends a rung on something already open', () => {
    // An ungated module is available from the first minute whatever the ladder
    // says, so naming one costs an unlock and changes nothing. Aufsteiger led
    // with `transfer` and `youth` — both already open — so the first department
    // that actually appeared was the third rung.
    for (const n of narratives) {
      const wasted = n.unlockOrder.filter(
        (id) => registered.has(id) && !gated.has(id)
      );
      expect(wasted, `${n.id} wastes rungs on ungated modules: ${wasted.join(', ')}`).toEqual([]);
    }
  });

  it('names only real modules or declared roadmap entries', () => {
    for (const n of narratives) {
      for (const id of [...n.unlockedAtStart, ...n.unlockOrder]) {
        expect(
          registered.has(id) || ROADMAP.has(id),
          `${n.id} names "${id}", which is neither a module nor on the roadmap`
        ).toBe(true);
      }
    }
  });

  it('never lists the same module twice in one career', () => {
    for (const n of narratives) {
      const all = [...n.unlockedAtStart, ...n.unlockOrder];
      expect(new Set(all).size, `${n.id} repeats an unlock`).toBe(all.length);
    }
  });
});

describe('the ladders still differ', () => {
  it('no two narratives meet the game in the same order', () => {
    /*
     * If every ladder converges on one sequence, the five starts are one start
     * with different opening balances — the whole point of a narrative is that
     * it changes the ORDER you meet the game in.
     *
     * This used to assert `> 1`, which is "not ALL of them are identical" and
     * not what the sentence above says. Two narratives shipped with byte-
     * identical ladders underneath it, and they were only separated later by
     * luck: someone adding europe had to put it somewhere and happened to pick
     * different slots.
     *
     * A test whose comment claims more than its assertion is worse than no
     * test, because it is read as coverage.
     */
    const shapes = narratives.map((n) => n.unlockOrder.join('>'));
    const duplicates = shapes.filter((s, i) => shapes.indexOf(s) !== i);
    expect(duplicates, 'these narratives share an unlock order').toEqual([]);
    expect(new Set(shapes).size).toBe(narratives.length);
  });

  it('gives each start a first rung that its premise explains', () => {
    /*
     * The order is the story, so the FIRST unlock is the thesis. Aufsteiger
     * needs a back office, the academy needs coaches, the free fall needs cash
     * this month, the Erbe is one season from the only prize big enough to
     * clear the debt, and the Investor was never really about football.
     *
     * Pinned because these are the five sentences the ladders are for, and a
     * mechanical reshuffle to satisfy some other rule would quietly cost them.
     */
    const first = Object.fromEntries(narratives.map((n) => [n.id, n.unlockOrder[0]]));
    expect(first).toEqual({
      aufsteiger: 'staff',
      erbe: 'europe',
      investor: 'industry',
      nachwuchs: 'staff',
      absturz: 'sponsors'
    });
  });

  it('gives the Investor its factory first and everyone else last', () => {
    // The premise of that start is that the money came from somewhere other
    // than football. For the other four, industry is the endgame it should be.
    const investor = narratives.find((n) => n.id === 'investor')!;
    expect(investor.unlockOrder[0]).toBe('industry');

    for (const n of narratives.filter((x) => x.id !== 'investor')) {
      const real = n.unlockOrder.filter((id) => gated.has(id));
      expect(real[real.length - 1], `${n.id} opens industry too early`).toBe('industry');
    }
  });
});
