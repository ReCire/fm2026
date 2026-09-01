import { describe, it, expect } from 'vitest';
import { Registry } from '$lib/engine/registry';
import { runTick } from '$lib/engine/clock';
import { createRng, seedFrom } from '$lib/engine/rng';
import { modules } from '$lib/modules';
import type { GameState, MetaState, ModuleStates } from '$lib/engine/state';
import { applyNarrative } from '../progression/rules';
import { narratives } from '../progression/content';
import { knowledgeNodes } from '../knowledge/content';
import { boardContent } from './content';
import { MATCHDAYS_PER_SEASON } from '../league/content';

/**
 * The boardroom, through the real clock.
 *
 * `rules.test.ts` proves the arithmetic; this proves that press actually
 * reaches it. That is the half with a history: `pressureMod` was thirteen
 * priced, described, purchasable-looking nodes that reached no consumer, and
 * nothing inside a rules file can tell you so.
 */

const registry = new Registry(modules);

function career(seed = seedFrom('board-tick')): GameState {
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

/*
 * `runTick` advances `meta.matchday` and `meta.tick` ITSELF — see clock.ts.
 *
 * Every harness written today also advanced them by hand, so each of these
 * loops was stepping two matchdays at a time. Nothing failed: press and board
 * count ticks rather than dates, and the europe test passed because all six
 * European matchdays happen to be odd numbers and an every-other-week clock
 * lands on odd numbers. A test that passes because of the parity of a content
 * constant is a test that has told you nothing.
 *
 * senior-frontend found it from the other end, reporting that badges "never
 * seem to actually land" on a real save.
 */
function playMatchdays(g: GameState, count: number): void {
  for (let i = 0; i < count; i++) runTick(registry, g, 'matchday');
}

/** A whole season, including the end-of-season meeting. */
function playSeason(g: GameState): void {
  const left = Math.max(0, MATCHDAYS_PER_SEASON - g.meta.matchday + 1);
  playMatchdays(g, left);
  // `seasonEnd` rolls the season and resets the matchday on its own too.
  runTick(registry, g, 'seasonEnd');
}

const dirtyNodes = knowledgeNodes.filter((n) => (n.fx?.pressureMod ?? 0) > 0);

describe('a career nobody writes about', () => {
  it('keeps its job through a season, and is judged once', () => {
    const g = career();
    playSeason(g);
    expect(g.modules.board.sacked).toBe(false);
    expect(g.modules.board.verdicts).toHaveLength(1);
  });

  it('is told the bar in words as well as in a table position', () => {
    const g = career();
    playSeason(g);
    const verdict = g.modules.board.verdicts[0]!;
    expect(verdict.expected).toBeGreaterThan(0);
    expect(verdict.demand.length).toBeGreaterThan(3);
    expect(verdict.trustAfter).toBe(g.modules.board.trust);
  });
});

describe('the transmission', () => {
  it('charges the boardroom for what the papers printed', () => {
    /*
     * The wiring assertion, and the reason both halves exist. A club that buys
     * suspicion gets written about, and the boardroom must read it — but the
     * board consumes no press key by name, so nothing but running the tick can
     * show that the story actually arrived.
     */
    const clean = career(9001);
    const dirty = career(9001);
    dirty.modules.knowledge.owned = dirtyNodes.slice(0, 6).map((n) => n.id);

    playMatchdays(clean, 20);
    playMatchdays(dirty, 20);

    expect(dirty.modules.press.pressure).toBeGreaterThan(clean.modules.press.pressure);
    expect(dirty.modules.board.trust).toBeLessThan(clean.modules.board.trust);
  });

  it('does not let the same defeat be punished twice', () => {
    /*
     * The board reads the story, never the scoreline. Every football headline
     * weighs zero, so a losing season must move trust only through the table
     * drift — and a club with an empty press feed and a club with a full one
     * of weightless stories must land in the same place.
     */
    const g = career();
    playMatchdays(g, 20);
    const football = g.modules.press.feed.filter(
      (s) => s.cause === 'defeat' || s.cause === 'thrashing' || s.cause === 'quiet'
    );
    expect(football.length).toBeGreaterThan(0);
    for (const story of football) expect(story.weight).toBe(0);
  });
});

describe('the last stretch', () => {
  it('states a target before it ends anybody, and never the other way round', () => {
    /*
     * The property that must hold on every path: no career reaches `sacked`
     * without an ultimatum having been visible first. A lose condition that
     * arrives unannounced is a bug report.
     */
    const g = career(31337);
    g.modules.knowledge.owned = dirtyNodes.slice(0, 8).map((n) => n.id);

    let sawUltimatum = false;
    for (let i = 0; i < MATCHDAYS_PER_SEASON * 3 && !g.modules.board.sacked; i++) {
      playMatchdays(g, 1);
      if (g.modules.board.ultimatum) sawUltimatum = true;
      if (g.meta.matchday > MATCHDAYS_PER_SEASON) runTick(registry, g, 'seasonEnd');
    }

    if (g.modules.board.sacked) {
      expect(sawUltimatum, 'sacked without the board ever stating a target').toBe(true);
    }
    expect(g.modules.board.trust).toBeGreaterThanOrEqual(0);
  });

  it('leaves a sacked manager sacked, whatever happens afterwards', () => {
    const g = career();
    g.modules.board.sacked = true;
    g.modules.board.trust = 0;
    playMatchdays(g, 10);
    expect(g.modules.board.sacked).toBe(true);
  });
});

describe('the floor seven nodes buy', () => {
  it('makes the trainer question un-askable', () => {
    const floorNode = knowledgeNodes.find((n) => (n.fx?.boardFloor ?? 0) > 0)!;
    const g = career();
    g.modules.knowledge.owned = [floorNode.id, ...dirtyNodes.slice(0, 8).map((n) => n.id)];
    g.modules.board.trust = 1;

    playMatchdays(g, MATCHDAYS_PER_SEASON);

    expect(g.modules.board.trust).toBeGreaterThanOrEqual(floorNode.fx!.boardFloor!);
    expect(g.modules.board.sacked).toBe(false);
  });
});

describe('determinism', () => {
  it('two careers on one seed reach the same boardroom', () => {
    const a = career(777);
    const b = career(777);
    a.modules.knowledge.owned = dirtyNodes.slice(0, 4).map((n) => n.id);
    b.modules.knowledge.owned = dirtyNodes.slice(0, 4).map((n) => n.id);
    playSeason(a);
    playSeason(b);
    expect(a.modules.board).toEqual(b.modules.board);
  });
});
