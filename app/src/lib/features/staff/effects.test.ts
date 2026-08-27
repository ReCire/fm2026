import { describe, it, expect } from 'vitest';
import { Registry } from '$lib/engine/registry';
import { runTick } from '$lib/engine/clock';
import { createRng, seedFrom } from '$lib/engine/rng';
import { modules } from '$lib/modules';
import type { GameState, MetaState, ModuleStates } from '$lib/engine/state';
import { applyNarrative, unlock } from '$lib/features/progression/rules';
import { narratives } from '$lib/features/progression/content';
import { hire } from './rules';

/**
 * Vary the input across its range and assert the output moves.
 *
 * Every staff role is a tuneable that reaches the simulation through a key
 * nobody in this module names. A role whose effect resolves nowhere is the
 * invisible-stat failure we have now hit four times — an executive's
 * competence, a crest's initials, the lineup, a fitness cost — so each one gets
 * a test that hires them and asserts something downstream changes.
 */
const registry = new Registry(modules);

function newGame(seedText: string, withStaff: string[] = []): GameState {
  const seed = seedFrom(seedText);
  const rng = createRng(seed);
  const mods: Record<string, unknown> = {};
  for (const m of registry.all) mods[m.id] = m.state.create(rng.fork(m.id));
  const meta: MetaState = { seed, season: 1, matchday: 1, tick: 0, createdAt: 0, lastPlayedAt: 0 };
  const g: GameState = { meta, modules: mods as unknown as ModuleStates };
  applyNarrative(g.modules.progression, narratives[0]!);
  g.modules.progression.started = true;
  unlock(g.modules.progression, 'staff');
  for (const id of withStaff) hire(g.modules.staff, id, 0);
  return g;
}

const play = (g: GameState, n: number) => {
  for (let i = 0; i < n; i++) runTick(registry, g, 'matchday');
};
const starterFitness = (g: GameState) => {
  const sq = g.modules.squad;
  const st = sq.players.filter((p) => sq.lineup.includes(p.id));
  return st.reduce((s, p) => s + p.fitness, 0) / Math.max(1, st.length);
};

describe('staff effects reach the simulation', () => {
  it('a fitness coach leaves the eleven fresher over a season', () => {
    const without = newGame('fit');
    const with_ = newGame('fit', ['fitCoach']);
    play(without, 20);
    play(with_, 20);
    expect(starterFitness(with_)).toBeGreaterThan(starterFitness(without));
  });

  it('a co-trainer makes the side stronger, which shows in the table', () => {
    const without = newGame('co');
    const with_ = newGame('co', ['coTrainer']);
    play(without, 34);
    play(with_, 34);
    const us = (g: GameState) =>
      (g.modules.league.levels[g.modules.league.playerLevel] ?? [])
        .find((t) => t.name === 'FC Anstoß Pro')!;
    expect({ w: us(with_).won, gf: us(with_).goalsFor })
      .not.toEqual({ w: us(without).won, gf: us(without).goalsFor });
  });

  it('a physio shortens layoffs across a season', () => {
    const totalInjuryWeeks = (g: GameState) =>
      g.modules.squad.players.reduce((s, p) => s + p.injured, 0);
    let shorter = 0;
    for (let s = 0; s < 8; s++) {
      const without = newGame(`phys${s}`);
      const with_ = newGame(`phys${s}`, ['physio']);
      play(without, 30);
      play(with_, 30);
      if (totalInjuryWeeks(with_) <= totalInjuryWeeks(without)) shorter++;
    }
    expect(shorter, 'physio did not reduce layoffs in most runs').toBeGreaterThanOrEqual(6);
  });

  it('the backroom is paid every matchday and it shows in the ledger', () => {
    const g = newGame('wages', ['physio', 'scout']);
    play(g, 3);
    const staffEntries = g.modules.finance.ledger.filter((e) => e.source === 'staff');
    expect(staffEntries).toHaveLength(3);
    for (const e of staffEntries) expect(e.amount).toBeLessThan(0);
  });

  it('an empty backroom costs nothing and posts nothing', () => {
    const g = newGame('none');
    play(g, 3);
    expect(g.modules.finance.ledger.some((e) => e.source === 'staff')).toBe(false);
  });

  it('a locked staff department does not tick at all', () => {
    const g = newGame('locked', ['physio']);
    // Re-lock it: a department the player has not unlocked must not spend.
    g.modules.progression.unlocked = g.modules.progression.unlocked.filter((id) => id !== 'staff');
    play(g, 3);
    expect(g.modules.finance.ledger.some((e) => e.source === 'staff')).toBe(false);
  });
});
