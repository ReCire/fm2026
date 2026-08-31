import { describe, it, expect } from 'vitest';
import { Registry } from '$lib/engine/registry';
import { runTick } from '$lib/engine/clock';
import { createRng, seedFrom } from '$lib/engine/rng';
import { modules } from '$lib/modules';
import type { GameState, MetaState, ModuleStates } from '$lib/engine/state';
import { applyNarrative } from '../progression/rules';
import { narratives } from '../progression/content';
import { knowledgeNodes } from '../knowledge/content';
import { INVESTIGATION_FROM } from './content';

/**
 * The whole system, through the real clock.
 *
 * `rules.test.ts` proves the arithmetic; this proves the WIRING, which is the
 * half that has bitten us every time. A rules file can be perfect while
 * `pressureMod` reaches nothing, and the only difference visible from inside
 * the rules is that a number never changes.
 */

const registry = new Registry(modules);

function career(seed = seedFrom('press-tick')): GameState {
  const rng = createRng(seed);
  const mods: Record<string, unknown> = {};
  for (const m of registry.all) mods[m.id] = m.state.create(rng.fork(m.id));
  const meta: MetaState = { seed, season: 1, matchday: 1, tick: 0, createdAt: 0, lastPlayedAt: 0 };
  const g: GameState = { meta, modules: mods as unknown as ModuleStates };
  applyNarrative(g.modules.progression, narratives[0]!);
  g.modules.progression.started = true;
  g.modules.squad.lineup = g.modules.squad.players.slice(0, 11).map((p) => p.id);
  return g;
}

function playMatchdays(g: GameState, count: number): void {
  for (let i = 0; i < count; i++) {
    runTick(registry, g, 'matchday');
    g.meta.matchday += 1;
    g.meta.tick += 1;
  }
}

/** Every node that raises the meter, cheapest first. */
const dirtyNodes = knowledgeNodes.filter((n) => (n.fx?.pressureMod ?? 0) > 0);

describe('a clean career', () => {
  it('never attracts a file, over a whole season', () => {
    const g = career();
    playMatchdays(g, 30);
    expect(g.modules.press.pressure).toBe(0);
    expect(g.modules.press.investigation).toBeNull();
    expect(g.modules.press.finesPaid).toBe(0);
  });

  it('still has something to read', () => {
    /*
     * The reason most of the headlines weigh nothing. A manager who has never
     * done anything opens this screen too, and an empty page for a whole career
     * is the mistake we made with badges nobody could earn.
     */
    const g = career();
    playMatchdays(g, 10);
    expect(g.modules.press.feed.length).toBeGreaterThan(0);
    for (const story of g.modules.press.feed) {
      expect(story.text).not.toMatch(/\{[a-z]+\}/);
      expect(story.outlet.length).toBeGreaterThan(1);
    }
  });
});

describe('a career with envelopes in it', () => {
  it('charges for the doctrine, matchday after matchday', () => {
    /*
     * The wiring assertion. `pressureMod` is thirteen nodes and was worth
     * nothing at all until this path existed — the node was purchasable-
     * looking, priced, described, and reached no consumer.
     */
    const g = career();
    g.modules.knowledge.owned = [dirtyNodes[0]!.id];
    playMatchdays(g, 1);
    expect(g.modules.press.pressure).toBeGreaterThan(0);
  });

  it('opens a file once the club is worth looking at', () => {
    const g = career();
    g.modules.knowledge.owned = dirtyNodes.slice(0, 4).map((n) => n.id);
    playMatchdays(g, 12);
    expect(g.modules.press.pressure).toBeGreaterThanOrEqual(INVESTIGATION_FROM);
    expect(g.modules.press.investigation).not.toBeNull();
  });

  it('eventually costs real money, and says so in the ledger', () => {
    const g = career();
    g.modules.knowledge.owned = dirtyNodes.slice(0, 6).map((n) => n.id);
    playMatchdays(g, 34);
    expect(g.modules.press.finesPaid).toBeGreaterThan(0);
    const fines = g.modules.finance.ledger.filter((e) => e.source === 'press');
    expect(fines.length).toBeGreaterThan(0);
    for (const entry of fines) expect(entry.amount).toBeLessThan(0);
  });

  it('settles rather than pinning at the ceiling', () => {
    /*
     * Proportional decay's whole purpose. A player committed to the
     * Schattenkabinett should find an equilibrium they can live in, not a
     * permanent 100% where nothing they do matters any more — a meter stuck at
     * its maximum is a meter that has stopped being a decision.
     */
    const g = career();
    g.modules.knowledge.owned = dirtyNodes.slice(0, 3).map((n) => n.id);
    playMatchdays(g, 40);
    expect(g.modules.press.pressure).toBeLessThan(100);
  });
});

describe('stopping works', () => {
  it('closes the file, and the club is cleared rather than merely quiet', () => {
    const g = career();
    g.modules.knowledge.owned = dirtyNodes.slice(0, 4).map((n) => n.id);
    playMatchdays(g, 12);
    expect(g.modules.press.investigation).not.toBeNull();

    // Sell the club's soul back. Nothing contributes suspicion any more.
    g.modules.knowledge.owned = [];

    /*
     * One matchday at a time, and assert at the moment it happens rather than
     * at the end. Playing forty and looking afterwards said `cleared` was
     * missing — it had run, and scrolled off a twelve-entry feed. A test that
     * checks the wrong instant reports a working system as broken, which costs
     * exactly as much time as the reverse.
     */
    let closedAfter = -1;
    for (let i = 1; i <= 60 && closedAfter < 0; i++) {
      playMatchdays(g, 1);
      if (g.modules.press.investigation === null) closedAfter = i;
    }

    expect(closedAfter, 'the file never closed on a club that stopped').toBeGreaterThan(0);
    expect(g.modules.press.pressure).toBeLessThan(INVESTIGATION_FROM);
    expect(g.modules.press.feed.some((s) => s.cause === 'cleared')).toBe(true);
  });
});

describe('the manager who bought their way out', () => {
  it('is never raided, however hot the meter runs', () => {
    /*
     * `noPenalties` is five nodes and its own reward: the deep end of the
     * Schattenkabinett is not "cheaper crime", it is immunity from the bill
     * that the shallow end pays. Worth a test because the flag reaches the
     * module by its own bare name — a path with no type checking on it.
     */
    const immuneNode = knowledgeNodes.find((n) => n.flags?.includes('noPenalties'))!;
    const g = career();
    g.modules.knowledge.owned = [immuneNode.id, ...dirtyNodes.slice(0, 6).map((n) => n.id)];
    playMatchdays(g, 40);

    expect(g.modules.press.pressure).toBeGreaterThan(INVESTIGATION_FROM);
    expect(g.modules.press.investigation).toBeNull();
    expect(g.modules.press.finesPaid).toBe(0);
  });
});

describe('determinism', () => {
  it('two careers on one seed write the same headlines', () => {
    const a = career(4242);
    const b = career(4242);
    a.modules.knowledge.owned = dirtyNodes.slice(0, 4).map((n) => n.id);
    b.modules.knowledge.owned = dirtyNodes.slice(0, 4).map((n) => n.id);
    playMatchdays(a, 20);
    playMatchdays(b, 20);
    expect(a.modules.press).toEqual(b.modules.press);
  });
});
