import { describe, it, expect } from 'vitest';
import { Registry } from '$lib/engine/registry';
import { runTick } from '$lib/engine/clock';
import { createRng, seedFrom } from '$lib/engine/rng';
import { modules } from '$lib/modules';
import type { GameState, MetaState, ModuleStates } from '$lib/engine/state';
import { applyNarrative } from '../progression/rules';
import { narratives } from '../progression/content';
import { tickContracts } from './rules';
import { strengthOf } from '../squad/rules';
import { contractsContent } from './content';

const registry = new Registry(modules);

function career(seedText = 'floor'): GameState {
  const seed = seedFrom(seedText);
  const rng = createRng(seed);
  const mods: Record<string, unknown> = {};
  for (const m of registry.all) mods[m.id] = m.state.create(rng.fork(m.id));
  const meta: MetaState = { seed, season: 1, matchday: 1, tick: 0, createdAt: 0, lastPlayedAt: 0 };
  const g: GameState = { meta, modules: mods as unknown as ModuleStates };
  applyNarrative(g.modules.progression, narratives[0]!);
  g.modules.progression.started = true;
  return g;
}

describe('the board will not let you empty the club', () => {
  /*
   * Measured, not feared: three simulated seasons of never opening the
   * contracts screen left a club with ONE player and an average strength of
   * 31. That is a broken mechanic, not a difficulty setting.
   *
   * The board steps in rather than an emergency signing appearing — a rescue
   * renewal reuses machinery that runs every week, where a signing path that
   * exists only in failure states is a second transfer system nobody tests.
   */
  it('a career of total neglect still has a squad after three seasons', () => {
    const g = career('neglect');
    for (let season = 0; season < 3; season++) {
      for (let i = 0; i < 34; i++) { runTick(registry, g, 'week'); runTick(registry, g, 'matchday'); }
      runTick(registry, g, 'seasonEnd');
    }
    expect(g.modules.squad.players.length, 'the club emptied out again')
      .toBeGreaterThanOrEqual(contractsContent.minSquadSizeForRelease - 1);
  });

  it('lets players go freely while there are plenty', () => {
    const g = career('plenty');
    // Everybody expiring at once, well above the floor: most should still walk.
    for (const p of g.modules.squad.players) p.contractMatchdays = 1;
    const { departed, rescued } = tickContracts(g.modules.squad);
    expect(departed.length, 'nobody left at all — the floor is rescuing everyone')
      .toBeGreaterThan(0);
    expect(g.modules.squad.players.length).toBeGreaterThanOrEqual(contractsContent.minSquadSizeForRelease);
    expect(rescued.length).toBeGreaterThan(0);
  });

  it('rescues the best of the departing first', () => {
    const g = career('best');
    for (const p of g.modules.squad.players) p.contractMatchdays = 1;
    const { rescued, departed } = tickContracts(g.modules.squad);
    if (rescued.length === 0 || departed.length === 0) return;
    /* The board saves the squad, not a random handful — so on average the
       people it keeps are better than the ones it lets go. Written as an
       average rather than a strict ordering because the rescue stops the
       moment the floor is met, which can leave one good player just below the
       cut. An earlier version of this assertion was a tautology that could not
       fail; it passed, and proved nothing. */
    const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
    expect(mean(rescued.map((r) => strengthOf(r.player))))
      .toBeGreaterThan(mean(departed.map(strengthOf)));
  });

  /* The floor must not be free, or ignoring the screen becomes the optimal
     play — the board doing your job for nothing. */
  it('costs money and raises the wage', () => {
    const g = career('cost');
    for (const p of g.modules.squad.players) p.contractMatchdays = 1;
    const before = new Map(g.modules.squad.players.map((p) => [p.id, p.wage]));
    const { rescued } = tickContracts(g.modules.squad);
    expect(rescued.length).toBeGreaterThan(0);
    for (const r of rescued) {
      expect(r.fee, `${r.player.name} was rescued for nothing`).toBeGreaterThan(0);
      expect(r.newWage).toBeGreaterThanOrEqual(before.get(r.player.id)!);
    }
  });

  it('charges the club, so it shows up where the player looks for it', () => {
    const g = career('ledger');
    for (const p of g.modules.squad.players) p.contractMatchdays = 1;
    runTick(registry, g, 'week');
    const rescues = (g.modules.finance.ledger ?? []).filter((e) => e.reason.startsWith('Notverlängerung'));
    expect(rescues.length, 'the board rescued for free').toBeGreaterThan(0);
    for (const e of rescues) expect(e.amount).toBeLessThan(0);
  });

  it('does nothing at all when the squad is comfortable', () => {
    const g = career('quiet');
    for (const p of g.modules.squad.players) p.contractMatchdays = 20;
    const { rescued, departed } = tickContracts(g.modules.squad);
    expect(rescued).toEqual([]);
    expect(departed).toEqual([]);
  });
});
