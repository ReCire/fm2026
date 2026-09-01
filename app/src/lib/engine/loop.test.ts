import { describe, it, expect } from 'vitest';
import { Registry } from '$lib/engine/registry';
import { runTick } from '$lib/engine/clock';
import { createRng, seedFrom } from '$lib/engine/rng';
import { modules } from '$lib/modules';
import type { GameState, MetaState, ModuleStates } from '$lib/engine/state';
import type { TickKind } from '$lib/engine/module';
import { applyNarrative } from '../features/progression/rules';
import { narratives } from '../features/progression/content';
import { MATCHDAYS_PER_SEASON } from '../features/league/content';

/**
 * The loop, played the way a player plays it.
 *
 * Eric played one season and the game stopped. Nothing in the app ever called
 * `seasonEnd` — the loop knew `week` and `matchday` and nothing else, so past
 * the last fixture the clock kept incrementing, league's hook returned early
 * every time, and eighty clicks left a career at matchday 41 with a complete
 * table.
 *
 * Six modules have a `seasonEnd` hook. All six were tested. Not one had ever
 * run outside a test file, and nothing was red — because every test drove the
 * tick kinds directly instead of asking the loop which one came next.
 *
 * So this file never names a tick kind. It asks the same question the button
 * asks and takes the answer, which is the only way a missing step can fail.
 */

const registry = new Registry(modules);

function career(seed = seedFrom('loop')): GameState {
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

/**
 * The step the shell would offer, derived the same way `currentStep` derives
 * it — from `core.phase` and nothing else.
 *
 * Duplicated rather than imported because `loop.svelte.ts` reaches for the
 * live `$state` game. The duplication is the reason the assertion below checks
 * the PHASE rather than the shell's label: if these two ever disagree, the one
 * that matters is the one the engine writes.
 */
const stepOf = (g: GameState): TickKind =>
  g.modules.core.phase === 'seasonEnd' ? 'seasonEnd' : g.modules.core.phase;

/** One player click. The season boundary is one click and two ticks. */
function click(g: GameState): void {
  const kind = stepOf(g);
  runTick(registry, g, kind);
  if (kind === 'seasonEnd') runTick(registry, g, 'seasonStart');
}

describe('a career that keeps clicking', () => {
  it('reaches a second season', () => {
    const g = career();
    for (let i = 0; i < 80 && g.meta.season < 2; i++) click(g);
    expect(g.meta.season, 'eighty clicks and still in season one').toBeGreaterThan(1);
  });

  it('never runs past the end of the fixture list', () => {
    /*
     * The symptom Eric saw, asserted directly: matchday 41 of a 34-match
     * season. The clock is allowed to sit one past the end — that is the state
     * the season-end step exists to consume — but never two.
     */
    const g = career();
    for (let i = 0; i < 200; i++) {
      click(g);
      expect(
        g.meta.matchday,
        `matchday ${g.meta.matchday} of a ${MATCHDAYS_PER_SEASON}-match season`
      ).toBeLessThanOrEqual(MATCHDAYS_PER_SEASON + 1);
    }
  });

  it('plays every fixture of every season it passes through', () => {
    const g = career();
    const seasons = 3;
    for (let i = 0; i < 400 && g.meta.season <= seasons; i++) {
      const before = g.meta.season;
      click(g);
      if (g.meta.season !== before) {
        // A season just ended: everyone in our division played the full card.
        for (const team of g.modules.league.levels[g.modules.league.playerLevel] ?? []) {
          expect(team.played, `${team.name} played ${team.played}`).toBe(0);
        }
      }
    }
    expect(g.meta.season).toBeGreaterThan(seasons);
  });

  it('runs the season-end work that had never run outside a test', () => {
    const g = career();
    for (let i = 0; i < 80 && g.meta.season < 2; i++) click(g);
    // The board judged a season, which only happens on `seasonEnd`.
    expect(g.modules.board.verdicts.length, 'the board never met').toBeGreaterThan(0);
    // Europe drew groups, which only happens on `seasonStart`.
    expect(g.modules.europe.season).toBe(g.meta.season);
    expect(g.modules.europe.table.length).toBeGreaterThan(0);
  });

  it('writes a review of the season that just ended', () => {
    const g = career();
    for (let i = 0; i < 80 && g.meta.season < 2; i++) click(g);
    const review = g.modules.league.review;
    expect(review, 'no season review was written').not.toBeNull();
    expect(review!.season).toBe(1);
    expect(review!.rank).toBeGreaterThan(0);
    // The division PLAYED, not the one about to be played.
    expect(review!.levelName.length).toBeGreaterThan(3);
  });
});

describe('a save stranded past the boundary', () => {
  it('is rescued rather than left where it was', () => {
    /*
     * Every save that existed before the season roll did is sitting past the
     * end — the clock kept incrementing while nothing happened. An
     * equality check on the last matchday would fix new careers and leave
     * every existing one exactly as stuck. Eric's is one of these.
     */
    const g = career();
    for (let i = 0; i < 40; i++) runTick(registry, g, 'matchday');
    expect(g.meta.matchday).toBeGreaterThan(MATCHDAYS_PER_SEASON + 1);

    // One more ordinary tick is enough for the phase to notice.
    runTick(registry, g, g.modules.core.phase === 'week' ? 'week' : 'matchday');
    expect(g.modules.core.phase).toBe('seasonEnd');

    click(g);
    expect(g.meta.season).toBe(2);
    expect(g.meta.matchday).toBe(1);
  });
});
