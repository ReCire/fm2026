import { describe, it, expect } from 'vitest';
import { Registry } from '$lib/engine/registry';
import { runTick } from '$lib/engine/clock';
import { createRng, seedFrom } from '$lib/engine/rng';
import { modules } from '$lib/modules';
import type { GameState, MetaState, ModuleStates } from '$lib/engine/state';
import { applyNarrative } from '$lib/features/progression/rules';
import { narratives } from '$lib/features/progression/content';
import { adoptClub, allTeams, teamById, standings } from '$lib/features/league/rules';
import { editClub, resolveClub } from './rules';
import { onboardingContent } from '$lib/features/onboarding/content';

/**
 * The editor has to reach the clubs the player actually meets.
 *
 * It did not, for a while: it edited the fourteen designed clubs while the
 * league ran on seventeen procedurally generated rivals, so the overlap was
 * exactly one club — the player's own. Eric's example was renaming an OPPONENT,
 * which was the case that did not work at all.
 *
 * Seventh instance of the shape, so it gets a test that walks the whole path
 * rather than one that checks the override map.
 */
const registry = new Registry(modules);

function career(seedText = 'reach'): GameState {
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

describe('the editor reaches the league', () => {
  it('every club in the world has an id the editor can address', () => {
    const g = career();
    const teams = allTeams(g.modules.league);
    expect(teams.length).toBeGreaterThan(50);
    for (const { team } of teams) {
      expect(team.id, team.name).toBeTruthy();
      expect(teamById(g.modules.league, team.id)?.name).toBe(team.name);
    }
  });

  it('renames an OPPONENT — the case that used to be impossible', () => {
    const g = career();
    const division = g.modules.league.levels[g.modules.league.playerLevel]!;
    const rival = division.find((t) => t.id !== g.modules.league.playerClubId)!;

    editClub(g.modules.editor, rival.id, { name: 'FC Bayern München' });

    const shown = resolveClub(g.modules.editor, { ...rival, short: '', city: '', colours: ['#000', '#fff'] });
    expect(shown.name).toBe('FC Bayern München');
  });

  it('reaches every rival in the division, not just the designed ones', () => {
    const g = career();
    const division = g.modules.league.levels[g.modules.league.playerLevel]!;
    const designedIds = new Set(onboardingContent.clubs.map((c) => c.id));
    const generated = division.filter((t) => !designedIds.has(t.id));

    // Generated clubs are the majority and must be editable too — they are the
    // blank slates the editor exists for.
    expect(generated.length).toBeGreaterThan(0);
    for (const team of generated) {
      editClub(g.modules.editor, team.id, { name: `Neu ${team.id}` });
      expect(resolveClub(g.modules.editor, { ...team, short: '', city: '', colours: ['#000', '#fff'] }).name)
        .toBe(`Neu ${team.id}`);
    }
  });

  it('seeds designed clubs into their own division as a minority', () => {
    const g = career();
    const designedIds = new Set(onboardingContent.clubs.map((c) => c.id));
    const division = g.modules.league.levels[g.modules.league.playerLevel]!;
    const seeded = division.filter((t) => designedIds.has(t.id));

    expect(seeded.length, 'no designed clubs reached the division').toBeGreaterThan(0);
    expect(seeded.length, 'designed clubs crowded out the blank slates')
      .toBeLessThan(division.length / 2);
  });
});

describe('adopting the chosen club', () => {
  it('makes the club picked at career start our club in the league', () => {
    const g = career();
    const chosen = onboardingContent.clubs.find((c) => c.leagueLevel === 3)!;

    adoptClub(g.modules.league, { id: chosen.id, name: chosen.name }, 3);

    expect(g.modules.league.playerClubId).toBe(chosen.id);
    const us = teamById(g.modules.league, g.modules.league.playerClubId)!;
    expect(us.name).toBe(chosen.name);
    expect(g.modules.league.levels[3]!.some((t) => t.id === chosen.id)).toBe(true);
  });

  it('keeps the division the right size — replaces rather than appends', () => {
    const g = career();
    const before = g.modules.league.levels[3]!.length;
    adoptClub(g.modules.league, { id: 'brand-new', name: 'FC Neu' }, 3);
    expect(g.modules.league.levels[3]!.length).toBe(before);
  });

  it('the adopted club still plays, and appears in its own table', () => {
    const g = career();
    const chosen = onboardingContent.clubs.find((c) => c.leagueLevel === 3)!;
    adoptClub(g.modules.league, { id: chosen.id, name: chosen.name }, 3);

    for (let i = 0; i < 6; i++) runTick(registry, g, 'matchday');

    const us = teamById(g.modules.league, g.modules.league.playerClubId)!;
    expect(us.played, 'our adopted club never played a match').toBeGreaterThan(0);
    expect(standings(g.modules.league.levels[3]!).some((r) => r.team.id === chosen.id)).toBe(true);
  });

  /**
   * The crash-class version of the same bug: every lookup used to compare names
   * against a constant, so renaming your own club would stop the game resolving
   * your fixture at all.
   */
  it('keeps playing our fixtures after we rename our own club', () => {
    const g = career();
    const before = teamById(g.modules.league, g.modules.league.playerClubId)!;
    before.name = 'Ftze Bayam Munchies';

    for (let i = 0; i < 6; i++) runTick(registry, g, 'matchday');

    const us = teamById(g.modules.league, g.modules.league.playerClubId)!;
    expect(us.name).toBe('Ftze Bayam Munchies');
    expect(us.played, 'renaming our club stopped the game finding our fixture').toBeGreaterThan(0);
  });
});
