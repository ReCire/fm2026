import { describe, it, expect } from 'vitest';
import { Registry } from '$lib/engine/registry';
import { runTick } from '$lib/engine/clock';
import { createRng, seedFrom } from '$lib/engine/rng';
import { modules } from '$lib/modules';
import type { GameState, MetaState, ModuleStates } from '$lib/engine/state';
import { applyNarrative } from '$lib/features/progression/rules';
import { narratives } from '$lib/features/progression/content';
import { adoptClub, allTeams, teamById, standings } from '$lib/features/league/rules';
import { editClub, editPlayer, resetClub, resetPlayer } from './rules';
import { onboardingContent } from '$lib/features/onboarding/content';
import { overallFor } from '$lib/features/squad/attributes';

/**
 * The editor has to reach the game, not just its own screen.
 *
 * Two separate failures, both of this shape:
 *
 *  - it edited the fourteen designed clubs while the league ran on seventeen
 *    procedurally generated rivals, so the overlap was exactly one club — the
 *    player's own. Renaming an OPPONENT did not work at all.
 *
 *  - once that was fixed, edits were RESOLVED at read time and almost nobody
 *    called the resolver: `resolvePlayer` was called in exactly one place, the
 *    editor's own screen. A renamed player was renamed in the editor and
 *    nowhere else. The league table printed raw club names for the same reason.
 *
 * So these tests never look at the edit map. They change something and then
 * read the object the rest of the game reads.
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

    editClub(g.modules.editor, rival, { name: 'FC Bayern München' });

    // Read it back the way the league table does: straight off the club.
    expect(teamById(g.modules.league, rival.id)!.name).toBe('FC Bayern München');
    expect(standings(division).find((r) => r.team.id === rival.id)!.team.name)
      .toBe('FC Bayern München');
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
      editClub(g.modules.editor, team, { name: `Neu ${team.id}` });
      expect(teamById(g.modules.league, team.id)!.name).toBe(`Neu ${team.id}`);
    }
  });

  it('a club edit survives a season of ticks', () => {
    const g = career();
    const rival = g.modules.league.levels[g.modules.league.playerLevel]!
      .find((t) => t.id !== g.modules.league.playerClubId)!;
    editClub(g.modules.editor, rival, { name: 'Werkself Leverkusen', short: 'B04', city: 'Leverkusen' });

    for (let i = 0; i < 10; i++) { runTick(registry, g, 'week'); runTick(registry, g, 'matchday'); }

    const after = teamById(g.modules.league, rival.id)!;
    expect(after.name).toBe('Werkself Leverkusen');
    expect(after.short).toBe('B04');
    expect(after.city).toBe('Leverkusen');
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

describe('the editor reaches the squad', () => {
  /* Eric's report: "the edits are saved in the editor but do not affect the
     players — name and skill level remain the same in the team view". */
  it('a renamed player is renamed everywhere the squad is read', () => {
    const g = career();
    const p = g.modules.squad.players[0]!;
    editPlayer(g.modules.editor, p, { name: 'Uwe Seeler' });
    expect(g.modules.squad.players[0]!.name).toBe('Uwe Seeler');
  });

  it('an attribute edit changes the rating the rest of the game computes', () => {
    const g = career();
    const p = g.modules.squad.players.find((x) => x.pos === 'ST')!;
    const before = overallFor(p.attributes, p.pos);

    editPlayer(g.modules.editor, p, {
      attributes: { technik: 99, tempo: 99, kraft: 99, uebersicht: 99, mentalitaet: 99 }
    });

    const after = overallFor(
      g.modules.squad.players.find((x) => x.id === p.id)!.attributes,
      p.pos
    );
    expect(after).toBe(99);
    expect(after).toBeGreaterThan(before);
  });

  /* The 99-everywhere ringer is the feature. If it does not make the side
     stronger on the pitch, the editor is a text field. */
  it('a maxed-out squad actually wins more', () => {
    const table = (maxed: boolean) => {
      const g = career('ringer');
      if (maxed) {
        for (const p of g.modules.squad.players) {
          editPlayer(g.modules.editor, p, {
            attributes: { technik: 99, tempo: 99, kraft: 99, uebersicht: 99, mentalitaet: 99 }
          });
        }
      }
      for (let i = 0; i < 20; i++) { runTick(registry, g, 'week'); runTick(registry, g, 'matchday'); }
      return teamById(g.modules.league, g.modules.league.playerClubId)!.won;
    };
    expect(table(true)).toBeGreaterThan(table(false));
  });

  it('reset puts back what shipped, not the previous edit', () => {
    const g = career();
    const p = g.modules.squad.players[0]!;
    const original = p.name;
    const originalTechnik = p.attributes.technik;

    editPlayer(g.modules.editor, p, { name: 'Erste Änderung', attributes: { technik: 40 } });
    editPlayer(g.modules.editor, p, { name: 'Zweite Änderung', attributes: { technik: 80 } });
    resetPlayer(g.modules.editor, p);

    expect(p.name).toBe(original);
    expect(p.attributes.technik).toBe(originalTechnik);
  });

  it('resetting a club puts back every field it touched', () => {
    const g = career();
    const rival = g.modules.league.levels[g.modules.league.playerLevel]!
      .find((t) => t.id !== g.modules.league.playerClubId)!;
    const before = { name: rival.name, short: rival.short, city: rival.city, colours: [...rival.colours] };

    editClub(g.modules.editor, rival, { name: 'X', short: 'XXX', city: 'Y', colours: ['#111111', '#222222'] });
    resetClub(g.modules.editor, rival);

    expect({ name: rival.name, short: rival.short, city: rival.city, colours: [...rival.colours] })
      .toEqual(before);
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
    editClub(g.modules.editor, before, { name: 'Ftze Bayam Munchies' });

    for (let i = 0; i < 6; i++) runTick(registry, g, 'matchday');

    const us = teamById(g.modules.league, g.modules.league.playerClubId)!;
    expect(us.name).toBe('Ftze Bayam Munchies');
    expect(us.played, 'renaming our club stopped the game finding our fixture').toBeGreaterThan(0);
  });
});
