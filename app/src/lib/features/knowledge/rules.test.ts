import { describe, it, expect } from 'vitest';
import { Registry } from '$lib/engine/registry';
import { runTick } from '$lib/engine/clock';
import { createRng, seedFrom } from '$lib/engine/rng';
import { modules } from '$lib/modules';
import type { GameState, MetaState, ModuleStates } from '$lib/engine/state';
import { applyNarrative } from '../progression/rules';
import { narratives } from '../progression/content';
import {
  EFFECTS, CONTRIBUTED, dormancyOf, isLive, census, rankOf, costOf, canBuy,
  ownedEffects, ownedFlags, SCREEN_READ
} from './rules';
import { knowledgeNodes, nodeById, tierCost, leagueCostMultiplier, FX_KEYS, doctrines } from './content';
import { createKnowledge } from './state';

const registry = new Registry(modules);
const consumed = registry.consumedKeys();
/* A hook consumer OR a screen that honours the key directly — see SCREEN_READ. */
const reachable = new Set([...consumed, ...SCREEN_READ]);

function career(): GameState {
  const seed = seedFrom('knowledge');
  const rng = createRng(seed);
  const mods: Record<string, unknown> = {};
  for (const m of registry.all) mods[m.id] = m.state.create(rng.fork(m.id));
  const meta: MetaState = { seed, season: 1, matchday: 1, tick: 0, createdAt: 0, lastPlayedAt: 0 };
  const g: GameState = { meta, modules: mods as unknown as ModuleStates };
  applyNarrative(g.modules.progression, narratives[0]!);
  g.modules.progression.started = true;
  return g;
}

const liveNode = () => knowledgeNodes.find((n) => isLive(n, consumed) && n.req.length === 0)!;

describe('the dormancy gate', () => {
  /*
   * The gate exists because the two vocabularies had NO overlap when the tree
   * landed: the content names effects in the game's language
   * (`transferDiscount`), the bus names them by consumer
   * (`squad.strengthBonus`). Measured at the time: zero of fifty-three keys, so
   * all 140 nodes would have been upgrades that changed nothing — sold at up to
   * €750.000 each.
   */
  it('refuses to sell a node whose effect reaches nothing', () => {
    const g = career();
    const dead = knowledgeNodes.find((n) => !isLive(n, consumed))!;
    g.modules.knowledge.points = 99;
    const check = canBuy(g.modules.knowledge, dead, {
      money: 100_000_000, leagueLevel: 3, consumed
    });
    expect(check.ok, `${dead.id} is dormant and was purchasable`).toBe(false);
  });

  it('distinguishes not-yet-mapped from mapped-but-unread', () => {
    /*
     * Both are dormant; they are different jobs. `unmapped` means somebody must
     * decide which bus key an effect belongs to and whether it adds or
     * multiplies. `unread` means that decision is made and the feature that
     * would read it does not ask for it yet.
     *
     * Right now NO node is `unread`, because every key in EFFECTS has a
     * consumer — that is the healthy state, not a gap, so the distinction is
     * asserted by construction rather than by finding one of each.
     */
    const unmapped = knowledgeNodes.find((n) => dormancyOf(n, consumed) === 'unmapped');
    expect(unmapped, 'no unmapped node — has every key been wired already?').toBeTruthy();

    const mapped = knowledgeNodes.find((n) => isLive(n, consumed) && Object.keys(n.fx ?? {}).length > 0)!;
    expect(dormancyOf(mapped, new Set()), 'a mapped node with no consumer must read as unread')
      .toBe('unread');
  });

  /* Derived from the registry at boot, never baked into content. A stored flag
     goes stale in the direction of "marked dormant but actually works", which
     is the half nobody notices. */
  it('follows the registry, so wiring a key makes its nodes live with no content edit', () => {
    /* Pick a node held back ONLY by an unread bus key — one with no reveal or
       grant, since those are gated by a hand-kept list rather than by the
       registry and widening `consumed` cannot free them. */
    const node = knowledgeNodes.find((n) =>
      dormancyOf(n, consumed) === 'unread'
      && !(n.reveal?.length) && !n.grants
      && Object.keys(n.fx ?? {}).every((k) => EFFECTS[k as keyof typeof EFFECTS])
    );
    if (!node) return;
    const busKeys = Object.keys(node.fx ?? {})
      .map((k) => EFFECTS[k as keyof typeof EFFECTS]!.key);
    const widened = new Set([...consumed, ...busKeys, ...(node.flags ?? [])]);
    expect(dormancyOf(node, widened)).toBe('live');
  });

  it('some of the tree is live, or the feature is decoration', () => {
    const c = census(consumed);
    expect(c.live, 'nothing is purchasable at all').toBeGreaterThan(0);
    expect(c.inert, 'a node with no effect of any kind').toBe(0);
    expect(c.live + c.unmapped + c.unread + c.inert).toBe(knowledgeNodes.length);
  });

  it('every mapped key names a bus key that is spelled like one', () => {
    for (const [fx, effect] of Object.entries(EFFECTS)) {
      expect(effect!.key, `${fx} maps to a key with no namespace`).toMatch(/^[a-z]+\.[a-zA-Z]+$/);
      expect(['factor', 'total', 'discount', 'max']).toContain(effect!.arity);
    }
  });

  it('declares every key it can write, or the tick throws', () => {
    for (const effect of Object.values(EFFECTS)) {
      expect(CONTRIBUTED, `${effect!.key} is written but not declared`).toContain(effect!.key);
    }
  });

  it('maps only keys the content actually has', () => {
    for (const key of Object.keys(EFFECTS)) {
      expect(FX_KEYS as readonly string[], `${key} is not an fx key`).toContain(key);
    }
  });
});

describe('what a node costs', () => {
  it('charges flat Wissenspunkte and division-scaled money', () => {
    const node = knowledgeNodes.find((n) => n.tier === 1 && !n.costMult)!;
    const [points, money] = tierCost[1]!;
    expect(costOf(node, 3)).toEqual({ points, money: Math.round(money * leagueCostMultiplier[3]!) });
    expect(costOf(node, 0)).toEqual({ points, money: Math.round(money * leagueCostMultiplier[0]!) });
  });

  /* The point of the multiplier: a flat price means the Investor start buys the
     bottom four tiers on day one while the Aufsteiger spends a fifth of
     everything on one node — the money gate existing only for the poor club. */
  it('costs a top-flight club more in cash than a fourth-division one', () => {
    const node = knowledgeNodes.find((n) => n.tier === 3)!;
    expect(costOf(node, 0).money).toBeGreaterThan(costOf(node, 3).money);
    expect(costOf(node, 0).points).toBe(costOf(node, 3).points);
  });

  it('applies a synthesis multiplier', () => {
    const synth = knowledgeNodes.find((n) => n.costMult !== undefined);
    if (!synth) return;
    const base = tierCost[synth.tier]![1] * leagueCostMultiplier[3]!;
    expect(costOf(synth, 3).money).toBe(Math.round(base * synth.costMult!));
  });
});

describe('buying', () => {
  it('refuses a node whose prerequisites are missing, and names them', () => {
    const g = career();
    g.modules.knowledge.points = 99;
    const gated = knowledgeNodes.find((n) => n.req.length > 0 && isLive(n, consumed));
    if (!gated) return;
    const check = canBuy(g.modules.knowledge, gated, { money: 1e9, leagueLevel: 3, consumed });
    expect(check.ok).toBe(false);
    expect(check.reason).toContain('Setzt voraus');
  });

  it('refuses when the points are not there, and says how many are missing', () => {
    const g = career();
    const node = liveNode();
    g.modules.knowledge.points = 0;
    const check = canBuy(g.modules.knowledge, node, { money: 1e9, leagueLevel: 3, consumed });
    expect(check.ok).toBe(false);
    // Singular or plural — the copy declines, the assertion should not.
    expect(check.reason).toMatch(/Wissenspunkte?/);
  });

  it('refuses when the club cannot pay', () => {
    const g = career();
    const node = liveNode();
    g.modules.knowledge.points = 99;
    expect(canBuy(g.modules.knowledge, node, { money: 0, leagueLevel: 3, consumed }).ok).toBe(false);
  });

  it('allows a live tier-1 node with points and money', () => {
    const g = career();
    const node = liveNode();
    g.modules.knowledge.points = 99;
    expect(canBuy(g.modules.knowledge, node, { money: 1e9, leagueLevel: 3, consumed }))
      .toEqual({ ok: true, reason: '' });
  });

  it('refuses to buy the same node twice', () => {
    const g = career();
    const node = liveNode();
    g.modules.knowledge.points = 99;
    g.modules.knowledge.owned.push(node.id);
    expect(canBuy(g.modules.knowledge, node, { money: 1e9, leagueLevel: 3, consumed }).ok).toBe(false);
  });

  it('counts a doctrine rank from what is owned', () => {
    const k = createKnowledge(createRng(1));
    const node = liveNode();
    expect(rankOf(k, node.doctrine)).toBe(0);
    k.owned.push(node.id);
    expect(rankOf(k, node.doctrine)).toBe(1);
  });
});

describe('effects reach the bus', () => {
  it('sums absolute keys and multiplies fractional ones', () => {
    const k = createKnowledge(createRng(1));
    const strengthNode = knowledgeNodes.find((n) => n.fx?.strength && isLive(n, consumed));
    if (strengthNode) {
      k.owned.push(strengthNode.id);
      const { totals } = ownedEffects(k);
      expect(totals.get('squad.strengthBonus')).toBe(strengthNode.fx.strength);
    }

    const k2 = createKnowledge(createRng(1));
    const riskNode = knowledgeNodes.find((n) => n.fx?.injuryRisk && isLive(n, consumed));
    if (riskNode) {
      k2.owned.push(riskNode.id);
      const { factors } = ownedEffects(k2);
      // A -0.15 label reads "15% less" and must apply as 0.85, not as -0.15.
      expect(factors.get('squad.injuryRisk')).toBeCloseTo(1 + riskNode.fx.injuryRisk!, 6);
    }
  });

  it('ignores an unmapped key rather than writing it somewhere wrong', () => {
    const k = createKnowledge(createRng(1));
    const unmapped = knowledgeNodes.find((n) =>
      Object.keys(n.fx ?? {}).every((key) => !EFFECTS[key as keyof typeof EFFECTS])
    );
    if (!unmapped) return;
    k.owned.push(unmapped.id);
    const { totals, factors } = ownedEffects(k);
    expect(totals.size + factors.size).toBe(0);
  });

  it('never counts a flag — it is a switch, not a quantity', () => {
    const k = createKnowledge(createRng(1));
    const flagged = knowledgeNodes.filter((n) => n.flags?.includes('noPenalties')).slice(0, 3);
    for (const n of flagged) k.owned.push(n.id);
    if (flagged.length > 1) {
      expect(ownedFlags(k).size).toBe(1);
      expect([...ownedFlags(k)]).toEqual(['noPenalties']);
    }
  });

  /*
   * The end-to-end one. An owned node must change the number the simulation
   * uses — otherwise this is the invisible-stat failure again, at 140 nodes.
   */
  it('an owned strength node makes the side measurably stronger', () => {
    const node = knowledgeNodes.find((n) => n.fx?.strength && isLive(n, consumed));
    if (!node) return;

    const play = (owned: boolean) => {
      const g = career();
      if (owned) g.modules.knowledge.owned.push(node.id);
      runTick(registry, g, 'week');
      runTick(registry, g, 'matchday');
      return g.modules.matchday.lastReport?.ourStrength ?? 0;
    };
    expect(play(true)).toBeGreaterThan(play(false));
  });
});

describe('learning is slow and is not a reward for winning', () => {
  it('accrues points over a season without any results', () => {
    const g = career();
    const before = g.modules.knowledge.points;
    for (let i = 0; i < 12; i++) { runTick(registry, g, 'week'); runTick(registry, g, 'matchday'); }
    expect(g.modules.knowledge.points).toBeGreaterThan(before);
  });

  /* Tying points to results compounds: the club already winning learns fastest
     and pulls away, which is the opposite of a tree of hard choices. */
  it('a season of wins earns no more than a season of losses', () => {
    const run = (strength: number) => {
      const g = career();
      for (const p of g.modules.squad.players) {
        p.attributes = { technik: strength, tempo: strength, kraft: strength, uebersicht: strength, mentalitaet: strength };
      }
      for (let i = 0; i < 20; i++) { runTick(registry, g, 'week'); runTick(registry, g, 'matchday'); }
      return g.modules.knowledge.earned;
    };
    expect(run(95)).toBe(run(20));
  });

  it('nobody completes the tree in a career', () => {
    const perSeason = 34 / 3 + 5;
    const wholeTree = knowledgeNodes.reduce((sum, n) => sum + (tierCost[n.tier]?.[0] ?? 1), 0);
    expect(wholeTree / perSeason, 'the whole tree in under fifteen seasons').toBeGreaterThan(15);
  });
});

describe('the gate does not wave through its own blind spot', () => {
  /*
   * A node whose only effect is a `reveal` was passing as "informational,
   * therefore live" — five of them — even though nothing in the game reads a
   * reveal. That is the failure the gate exists to prevent, waved through by
   * the gate itself: an upgrade sold for real money that shows the player
   * nothing new. Reveals and grants cannot be derived from the registry (a
   * component consumes them, not a hook), so they have a hand-kept list, and it
   * is empty until a screen honours one.
   */
  it('holds back a node whose only effect is an unread reveal', () => {
    const revealOnly = knowledgeNodes.find(
      (n) => Object.keys(n.fx ?? {}).length === 0 && !n.flags?.length && (n.reveal?.length ?? 0) > 0
    );
    if (!revealOnly) return;
    expect(dormancyOf(revealOnly, consumed)).toBe('unread');
  });

  it('every live node has an effect that reaches the bus', () => {
    for (const node of knowledgeNodes.filter((n) => isLive(n, consumed))) {
      const fx = Object.keys(node.fx ?? {});
      expect(fx.length + (node.flags?.length ?? 0), `${node.id} is live with no effect`)
        .toBeGreaterThan(0);
      for (const key of fx) {
        const effect = EFFECTS[key as keyof typeof EFFECTS];
        expect(effect, `${node.id}: ${key} is unmapped`).toBeTruthy();
        /* Reachable means a hook consumes it OR a screen honours it directly —
           an action taken by clicking can never read a bus that lives for one
           tick, so those consumers are listed rather than derived. */
        const reachable = consumed.has(effect!.key) || SCREEN_READ.has(effect!.key);
        expect(reachable, `${node.id}: ${effect!.key} reaches nothing`).toBe(true);
      }
    }
  });
});

describe('the four arities', () => {
  /*
   * Three of these summed would be wrong in a way that still runs. The arity is
   * the difference between a node doing what its own label says and a node
   * doing the opposite of it.
   */
  const owning = (...ids: string[]) => {
    const k = createKnowledge(createRng(1));
    k.owned.push(...ids);
    return ownedEffects(k);
  };
  const withFx = (key: string) =>
    knowledgeNodes.filter((n) => (n.fx as Record<string, number>)?.[key] !== undefined);

  it('a discount lowers the thing its label says it lowers', () => {
    // `transferDiscount: 0.08` reads "−8% Ablösesummen". As a plain factor it
    // would apply as ×1.08 and RAISE the fee the node advertises reducing.
    const nodes = withFx('transferDiscount');
    if (nodes.length === 0) return;
    const { factors } = owning(nodes[0]!.id);
    expect(factors.get('transfer.feeFactor')!).toBeLessThan(1);
  });

  it('a floor takes the highest, never the sum', () => {
    const nodes = withFx('moraleFloor');
    if (nodes.length < 2) return;
    const values = nodes.slice(0, 2).map((n) => (n.fx as Record<string, number>).moraleFloor!);
    const { totals } = owning(nodes[0]!.id, nodes[1]!.id);
    expect(totals.get('squad.moraleFloor')).toBe(Math.max(...values));
    expect(totals.get('squad.moraleFloor')).not.toBe(values[0]! + values[1]!);
  });

  it('totals do stack, because two bonuses are two bonuses', () => {
    const nodes = withFx('strength').filter((n) => isLive(n, consumed));
    if (nodes.length < 2) return;
    const values = nodes.slice(0, 2).map((n) => (n.fx as Record<string, number>).strength!);
    const { totals } = owning(nodes[0]!.id, nodes[1]!.id);
    expect(totals.get('squad.strengthBonus')).toBe(values[0]! + values[1]!);
  });

  it('factors compound rather than add', () => {
    const nodes = withFx('injuryRisk');
    if (nodes.length < 2) return;
    const values = nodes.slice(0, 2).map((n) => (n.fx as Record<string, number>).injuryRisk!);
    const { factors } = owning(nodes[0]!.id, nodes[1]!.id);
    expect(factors.get('squad.injuryRisk')!).toBeCloseTo((1 + values[0]!) * (1 + values[1]!), 6);
  });
});

describe('an effect reaches every tick that reads it', () => {
  /*
   * `training` consumes `training.devPerSeason` on the WEEK tick. Contributing
   * only on matchday left no producer for it, and the boot check refused to
   * start — correctly. A club does not forget what it knows between Saturdays.
   */
  it('contributes on every tick kind some module consumes an effect on', () => {
    const kinds = ['matchday', 'week'] as const;
    for (const kind of kinds) {
      const consumedHere = new Set(
        registry.hooks(kind).flatMap(({ hook }) => hook.consumes ?? [])
      );
      const contributedHere = new Set(
        registry.hooks(kind)
          .filter(({ module }) => module.id === 'knowledge')
          .flatMap(({ hook }) => hook.contributes ?? [])
      );
      for (const effect of Object.values(EFFECTS)) {
        if (!consumedHere.has(effect!.key)) continue;
        expect(contributedHere, `${effect!.key} is read on "${kind}" with nothing producing it`)
          .toContain(effect!.key);
      }
    }
  });
});

describe('the tree is mostly buyable', () => {
  /*
   * Eric held a push over this: "the whole doctrine system looks much better on
   * the index.html, also, it feels more full."
   *
   * He was right, and the gate was the cause — 23 of 140 nodes purchasable
   * against the prototype's 140, so the centrepiece of the game read as a
   * fraction of the thing it was ported from. The gate was still the correct
   * call: selling upgrades that reach nothing, at up to €750.000 each, is worse
   * than showing them locked. The answer was never to open it. The answer was
   * to make the nodes true, which meant writing nineteen more sentences between
   * the content's vocabulary and the bus's.
   *
   * This asserts the SHAPE — most of the tree is live, and no doctrine is a
   * dead end — rather than a count, so wiring another key is not a red test.
   */
  it('most of the tree can actually be bought', () => {
    const c = census(reachable);
    expect(c.live / knowledgeNodes.length, `only ${c.live} of ${knowledgeNodes.length} are live`)
      .toBeGreaterThan(0.5);
  });

  it('every doctrine has something to buy, so none is a dead end', () => {
    for (const d of doctrines) {
      const own = knowledgeNodes.filter((n) => n.doctrine === d.id);
      const live = own.filter((n) => isLive(n, reachable)).length;
      expect(live, `${d.name} has nothing purchasable at all`).toBeGreaterThan(2);
    }
  });

  /*
   * What is left is honest: the remaining nodes need modules nobody has built.
   * If this list shrinks to nothing while `live` has not moved, something is
   * being mapped to a key that reaches nowhere.
   */
  it('what stays locked is waiting on a feature, not on a mapping', () => {
    const c = census(reachable);
    expect(c.unmapped + c.unread).toBe(knowledgeNodes.length - c.live);
    expect(c.inert, 'a node with no effect of any kind').toBe(0);
  });
});
