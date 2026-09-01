import { describe, it, expect } from 'vitest';
import { Registry } from '$lib/engine/registry';
import { runTick } from '$lib/engine/clock';
import { createRng, seedFrom } from '$lib/engine/rng';
import { modules } from '$lib/modules';
import type { GameState, MetaState, ModuleStates } from '$lib/engine/state';
import { applyNarrative } from '../progression/rules';
import { narratives } from '../progression/content';
import { knowledgeNodes } from '../knowledge/content';
import { europeContent as C } from './content';
import { PLAYER } from './state';
import { playerIn } from './rules';

/**
 * The Champions Cup through the real clock.
 *
 * `rules.test.ts` proves the tournament; this proves it is REACHED — that
 * qualification travels from league to europe, that the prize reaches the
 * ledger, and that five Politik syntheses now multiply something. All three
 * are invisible from inside a rules file.
 */

const registry = new Registry(modules);

function career(seed = seedFrom('europe-tick'), qualified = true): GameState {
  const rng = createRng(seed);
  const mods: Record<string, unknown> = {};
  for (const m of registry.all) mods[m.id] = m.state.create(rng.fork(m.id));
  const meta: MetaState = { seed, season: 1, matchday: 1, tick: 0, createdAt: 0, lastPlayedAt: 0 };
  const g: GameState = { meta, modules: mods as unknown as ModuleStates };
  applyNarrative(g.modules.progression, narratives[0]!);
  g.modules.progression.started = true;
  g.modules.squad.lineup = g.modules.squad.players.slice(0, 11).map((p) => p.id);
  g.modules.league.inEurope = qualified;
  /*
   * Unlocked by hand, because the module is gated behind the progression
   * ladder and a gated module's hooks do not run at all. Worth doing rather
   * than removing the gate: the ladder test insists on it, and a rung spent on
   * a department that was already open promises nothing.
   */
  g.modules.progression.unlocked.push('europe');
  runTick(registry, g, 'seasonStart');
  return g;
}

function playTo(g: GameState, matchday: number): void {
  while (g.meta.matchday <= matchday) {
    runTick(registry, g, 'matchday');
    g.meta.matchday += 1;
    g.meta.tick += 1;
  }
}

const euroNodes = knowledgeNodes.filter((n) => (n.fx?.euroBonus ?? 0) > 0);

describe('qualification reaching the draw', () => {
  it('puts our club in the groups when league said so', () => {
    const g = career();
    expect(g.modules.europe.playerIn).toBe(true);
    expect([...g.modules.europe.groups.A, ...g.modules.europe.groups.B]).toContain(PLAYER);
  });

  it('runs the tournament without us when it did not', () => {
    const g = career(undefined, false);
    expect(g.modules.europe.playerIn).toBe(false);
    expect(g.modules.europe.table).toHaveLength(C.groupSize * 2);
    expect([...g.modules.europe.groups.A, ...g.modules.europe.groups.B]).not.toContain(PLAYER);
  });
});

describe('a season of it', () => {
  it('plays every group round on its own matchday and no others', () => {
    const g = career();
    playTo(g, C.groupMatchdays[0]! - 1);
    expect(g.modules.europe.matches).toHaveLength(0);

    // Two fixtures per group, two groups, so a round is four matches — every
    // one of the eight clubs plays on every European matchday.
    playTo(g, C.groupMatchdays[0]!);
    expect(g.modules.europe.matches).toHaveLength(4);
    for (const club of [...g.modules.europe.groups.A, ...g.modules.europe.groups.B]) {
      const played = g.modules.europe.matches.filter((m) => m.home === club || m.away === club);
      expect(played, `${club} sat out the first round`).toHaveLength(1);
    }
  });

  it('reaches a played final with a champion who was in it', () => {
    const g = career(4242);
    playTo(g, C.finalMatchday);

    const e = g.modules.europe;
    expect(e.final, 'the final was never seeded').not.toBeNull();
    expect(e.final!.winner, 'the final was never played').not.toBeNull();
    expect(e.champion).toBe(e.final!.winner);
    expect([e.final!.home, e.final!.away]).toContain(e.champion);
  });

  it('puts the prize money through the ledger, where it can be found', () => {
    const g = career(4242);
    playTo(g, C.finalMatchday);

    const entries = g.modules.finance.ledger.filter((e) => e.source === 'europe');
    if (g.modules.europe.prizeMoney > 0) {
      expect(entries.length).toBeGreaterThan(0);
      const banked = entries.reduce((sum, e) => sum + e.amount, 0);
      expect(banked).toBe(g.modules.europe.prizeMoney);
    }
  });

  it('pays a club that is only watching exactly nothing', () => {
    const g = career(4242, false);
    playTo(g, C.finalMatchday);
    expect(g.modules.europe.prizeMoney).toBe(0);
    expect(g.modules.finance.ledger.filter((e) => e.source === 'europe')).toHaveLength(0);
  });
});

describe('the five Politik syntheses', () => {
  it('multiply a campaign, which is the only place they pay off at all', () => {
    /*
     * The wiring assertion. `euroBonus` is the deepest and most expensive
     * corner of the tree and until the competition existed it paid into
     * nothing — five nodes that were priced, described and unreachable.
     */
    const plain = career(4242);
    const rich = career(4242);
    rich.modules.knowledge.owned = euroNodes.map((n) => n.id);

    playTo(plain, C.finalMatchday);
    playTo(rich, C.finalMatchday);

    expect(plain.modules.europe.prizeMoney).toBeGreaterThan(0);
    expect(rich.modules.europe.prizeMoney).toBeGreaterThan(plain.modules.europe.prizeMoney);
  });
});

describe('a new season', () => {
  it('wipes the tournament rather than carrying last year into it', () => {
    const g = career(4242);
    playTo(g, C.finalMatchday);
    expect(g.modules.europe.matches.length).toBeGreaterThan(0);

    g.meta.season += 1;
    g.meta.matchday = 1;
    runTick(registry, g, 'seasonStart');

    expect(g.modules.europe.season).toBe(g.meta.season);
    expect(g.modules.europe.matches).toHaveLength(0);
    expect(g.modules.europe.champion).toBeNull();
    expect(g.modules.europe.prizeMoney).toBe(0);
  });
});

describe('determinism', () => {
  it('two careers on one seed lift the same trophy', () => {
    const a = career(777);
    const b = career(777);
    playTo(a, C.finalMatchday);
    playTo(b, C.finalMatchday);
    expect(a.modules.europe).toEqual(b.modules.europe);
  });
});
