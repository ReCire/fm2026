import { describe, it, expect } from 'vitest';
import {
  doctrines,
  doctrineIds,
  doctrinesInOrder,
  affinity,
  affinityOf,
  coreNodes,
  knowledgeNodes,
  synthesisDefs,
  buildSynthesisNodes,
  fxLabels,
  revealLabels,
  grantLabels,
  FX_KEYS,
  FLAG_KEYS,
  flagLabels,
  tierCost,
  leagueCostMultiplier,
  nodeById
} from './content';

/*
 * The tree is 140 nodes of pure data, which is exactly the size at which
 * nobody reads it again. Everything asserted here is something that would be
 * silently wrong rather than broken — a node nothing can reach, a prerequisite
 * pointing at another doctrine, an effect with no consumer. None of it would
 * throw; the game would just quietly contain a dead upgrade.
 */

describe('doctrines', () => {
  it('are eight, ordered 1..8 with no gaps', () => {
    expect(doctrines).toHaveLength(8);
    expect([...doctrines].map((d) => d.order).sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it('run pitch to crime, and every reader gets that order', () => {
    /*
     * The gradient is the argument: youth work leads to sports psychology
     * leads to analytics, and you are four steps into a career before anyone
     * mentions an envelope. Opening the menu with Schattenkabinett is a
     * different game — it offers you a bribe on day one.
     *
     * Asserted through `doctrineIds` rather than the literal, because that is
     * what every list, tab and tree actually reads.
     */
    expect(doctrineIds).toEqual([
      'talent', 'psyche', 'data', 'curve', 'brand', 'industry', 'politics', 'shadow'
    ]);
    expect(doctrinesInOrder[0]!.id).toBe('talent');
    expect(doctrinesInOrder[7]!.id).toBe('shadow');
  });

  it('are separable without colour', () => {
    // WCAG 1.4.1. Colour is the channel a doctrine is most tempting to lean
    // on and the one a player may not have.
    expect(new Set(doctrines.map((d) => d.shape)).size).toBe(8);
    expect(new Set(doctrines.map((d) => d.glyph)).size).toBe(8);
    expect(new Set(doctrines.map((d) => d.abbr)).size).toBe(8);
  });

  it('carry fourteen nodes each, in the same tier shape', () => {
    for (const d of doctrines) {
      const own = coreNodes.filter((n) => n.doctrine === d.id);
      expect(own, d.id).toHaveLength(14);
      const byTier = [1, 2, 3, 4, 5].map((t) => own.filter((n) => n.tier === t).length);
      expect(byTier, `${d.id} tier shape`).toEqual([4, 4, 3, 2, 1]);
    }
  });

  it('end in exactly one capstone, gated at rank 12', () => {
    for (const d of doctrines) {
      const caps = coreNodes.filter((n) => n.doctrine === d.id && n.minRank);
      expect(caps, `${d.id} capstones`).toHaveLength(1);
      expect(caps[0]!.minRank).toBe(12);
      expect(caps[0]!.tier).toBe(5);
    }
  });
});

describe('prerequisites', () => {
  it('all resolve to a real node', () => {
    for (const n of knowledgeNodes) {
      for (const r of n.req) {
        expect(nodeById.get(r), `${n.id} requires missing node ${r}`).toBeDefined();
      }
    }
  });

  it('never cross a doctrine boundary', () => {
    // A cross-doctrine prerequisite would make one doctrine silently gate
    // another — the specialisation choice would stop being a choice, and
    // nothing on screen would say so.
    for (const n of coreNodes) {
      for (const r of n.req) {
        expect(nodeById.get(r)!.doctrine, `${n.id} -> ${r}`).toBe(n.doctrine);
      }
    }
  });

  it('always point at a lower tier', () => {
    for (const n of coreNodes) {
      for (const r of n.req) {
        expect(nodeById.get(r)!.tier, `${n.id} -> ${r}`).toBeLessThan(n.tier);
      }
    }
  });

  it('leave every node reachable from a tier-1 start', () => {
    // The failure this catches is a node whose chain of requirements loops or
    // dead-ends: it renders, it prices, it can never be bought, and you would
    // only find out by trying to buy it.
    const owned = new Set(coreNodes.filter((n) => n.req.length === 0).map((n) => n.id));
    for (let pass = 0; pass < 6; pass++) {
      for (const n of coreNodes) {
        if (n.req.every((r) => owned.has(r))) owned.add(n.id);
      }
    }
    const stranded = coreNodes.filter((n) => !owned.has(n.id)).map((n) => n.id);
    expect(stranded, 'nodes no sequence of purchases can reach').toEqual([]);
  });

  it('gives every doctrine a tier-1 entry that needs nothing', () => {
    for (const d of doctrineIds) {
      const open = coreNodes.filter((n) => n.doctrine === d && n.req.length === 0);
      expect(open.length, `${d} has no way in`).toBeGreaterThan(0);
    }
  });
});

describe('effects', () => {
  it('are all labelled', () => {
    // Typed as Record<FxKey, …>, so this can only fail if FX_KEYS and the
    // node table disagree — which is the case worth catching.
    for (const key of FX_KEYS) {
      expect(typeof fxLabels[key], key).toBe('function');
      expect(fxLabels[key](0.25).length, `${key} produced an empty label`).toBeGreaterThan(3);
    }
  });

  it('has no key declared that no node uses', () => {
    const used = new Set(knowledgeNodes.flatMap((n) => Object.keys(n.fx)));
    expect([...FX_KEYS].filter((k) => !used.has(k)), 'declared but unused').toEqual([]);
  });

  it('reveals and grants are labelled wherever a node names one', () => {
    for (const n of knowledgeNodes) {
      for (const r of n.reveal ?? []) {
        expect(Object.keys(revealLabels), `${n.id} reveals ${r}`).toContain(r);
      }
      if (n.grants) {
        expect(Object.keys(grantLabels), `${n.id} grants ${n.grants}`).toContain(n.grants);
      }
    }
  });

  it('describes a value rather than restating the key', () => {
    /*
     * ×0.7 and ×1.6 on one key are opposite kinds of news. A label that reads
     * the same for both is not describing the effect, it is naming it.
     *
     * This is the assertion that found the flag split. Three keys —
     * `pressureDecay`, `noPenalties`, `contractFree` — ignored their value
     * entirely, because they were never quantities: all three carried `1` on
     * every node, and `noPenalties` carried it on five. They are switches now,
     * and switches are not in FX_KEYS.
     */
    for (const key of FX_KEYS) {
      expect(fxLabels[key](0.2), key).not.toBe(fxLabels[key](-0.2));
    }
  });

  it('keeps switches out of the numbers, and labels them too', () => {
    for (const key of FLAG_KEYS) {
      expect(FX_KEYS as readonly string[], `${key} is both a flag and a number`).not.toContain(key);
      expect(flagLabels[key].length, key).toBeGreaterThan(3);
    }
    const flagged = knowledgeNodes.filter((n) => n.flags?.length);
    expect(flagged.length, 'no node carries a flag — the split lost them').toBeGreaterThan(0);
    for (const n of flagged) {
      for (const f of n.flags!) {
        expect(FLAG_KEYS as readonly string[], `${n.id} flags ${f}`).toContain(f);
      }
    }
  });
});

describe('syntheses', () => {
  it('cover every unordered pair of doctrines exactly once', () => {
    expect(synthesisDefs).toHaveLength((8 * 7) / 2);
    const seen = new Set(synthesisDefs.map((s) => [...s.pair].sort().join('|')));
    expect(seen.size, 'a pair is duplicated').toBe(28);
    for (const a of doctrineIds) {
      for (const b of doctrineIds) {
        if (a >= b) continue;
        expect(seen.has([a, b].sort().join('|')), `no synthesis for ${a}+${b}`).toBe(true);
      }
    }
  });

  it('price and gate themselves from the affinity matrix', () => {
    const built = buildSynthesisNodes();
    for (const n of built) {
      const [a, b] = n.pair!;
      const aff = affinityOf(a, b);
      expect(n.affinity).toBe(aff);
      if (aff === 'allied') expect([n.gate, n.costMult]).toEqual([5, 0.7]);
      if (aff === 'hostile') expect([n.gate, n.costMult]).toEqual([8, 1.5]);
      if (aff === 'neutral') expect([n.gate, n.costMult]).toEqual([6, 1.0]);
    }
  });

  it('moves when the matrix moves', () => {
    // The tunable-changes-something rule. If this ever passes with the two
    // sides equal, the affinity matrix has stopped reaching the tree.
    const allied = buildSynthesisNodes().filter((n) => n.affinity === 'allied');
    const hostile = buildSynthesisNodes().filter((n) => n.affinity === 'hostile');
    expect(allied.length).toBeGreaterThan(0);
    expect(hostile.length).toBeGreaterThan(0);
    expect(allied[0]!.costMult).toBeLessThan(hostile[0]!.costMult!);
    expect(allied[0]!.gate).toBeLessThan(hostile[0]!.gate!);
  });
});

describe('affinity', () => {
  it('names only real doctrines', () => {
    for (const key of Object.keys(affinity)) {
      for (const side of key.split('|')) {
        expect(doctrineIds, `affinity key ${key}`).toContain(side);
      }
    }
  });

  it('is stored once per pair, and reads the same both ways', () => {
    for (const key of Object.keys(affinity)) {
      const [a, b] = key.split('|') as [string, string];
      expect(affinity[`${b}|${a}`], `${key} is also stored reversed`).toBeUndefined();
      expect(affinityOf(a, b)).toBe(affinityOf(b, a));
    }
  });

  it('leaves a doctrine no relationship with itself but "self"', () => {
    for (const d of doctrineIds) expect(affinityOf(d, d)).toBe('self');
  });
});

describe('cost ladder', () => {
  it('rises with every tier in both currencies', () => {
    for (let t = 2; t <= 5; t++) {
      expect(tierCost[t]![0], `tier ${t} Wissenspunkte`).toBeGreaterThan(tierCost[t - 1]![0]);
      expect(tierCost[t]![1], `tier ${t} euros`).toBeGreaterThan(tierCost[t - 1]![1]);
    }
  });

  it('charges a top-flight club more than a fourth-division one', () => {
    // Without this the money gate exists only for poor clubs: the Investor
    // start opens at €6.000.000 and would buy tiers 1-4 without noticing.
    expect(leagueCostMultiplier).toHaveLength(4);
    for (let l = 1; l < 4; l++) {
      expect(leagueCostMultiplier[l - 1], `level ${l}`).toBeGreaterThan(leagueCostMultiplier[l]!);
    }
    expect(leagueCostMultiplier[3]).toBe(1);
  });
});

describe('the whole tree', () => {
  it('is 140 nodes with unique ids', () => {
    expect(knowledgeNodes).toHaveLength(140);
    expect(new Set(knowledgeNodes.map((n) => n.id)).size).toBe(140);
  });

  it('gives every node an effect, a reason and an icon', () => {
    for (const n of knowledgeNodes) {
      // Not every node moves a number. Five are pure grants — they hand you a
      // named bundle instead — and asserting `fx` alone would have declared
      // those broken. What must never be true is a node that does nothing at
      // all through ANY of the four channels.
      const does =
        Object.keys(n.fx).length + (n.reveal?.length ?? 0) + (n.flags?.length ?? 0) + (n.grants ? 1 : 0);
      expect(does, `${n.id} does nothing`).toBeGreaterThan(0);
      expect(n.lore.length, `${n.id} has no lore`).toBeGreaterThan(20);
      expect(n.icon.length, `${n.id} has no icon`).toBeGreaterThan(0);
      expect(n.name.length, `${n.id} has no name`).toBeGreaterThan(2);
    }
  });

  it('never repeats a name or a piece of lore', () => {
    // Duplicated lore is the tell that a node was filled in rather than
    // designed, and at 140 it is not something a reader would notice.
    expect(new Set(knowledgeNodes.map((n) => n.name)).size, 'duplicate name').toBe(140);
    expect(new Set(knowledgeNodes.map((n) => n.lore)).size, 'duplicate lore').toBe(140);
  });
});
