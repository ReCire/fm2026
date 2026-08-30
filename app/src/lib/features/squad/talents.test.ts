import { describe, it, expect } from 'vitest';
import { Registry } from '$lib/engine/registry';
import { runTick } from '$lib/engine/clock';
import { createRng, seedFrom } from '$lib/engine/rng';
import { modules } from '$lib/modules';
import type { GameState, MetaState, ModuleStates } from '$lib/engine/state';
import { applyNarrative } from '../progression/rules';
import { narratives } from '../progression/content';
import { createPlayer, strengthOf } from './rules';
import { talents, NO_TALENT, bestFor, EMPTY_RECORD } from '$lib/content/talents';
import { squadContent } from './content';

const registry = new Registry(modules);

function career(seedText = 'talents'): GameState {
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

describe('nobody is born with a talent', () => {
  /*
   * `trait` was a 35% roll at creation from a list of seven strings, so the
   * column was half dealt and half nothing with no way to tell which. A talent
   * is something a career produces; a talent handed out at creation is a stat
   * with a name.
   */
  it('a generated player starts with none', () => {
    for (let seed = 0; seed < 50; seed++) {
      const p = createPlayer(createRng(seed), 'MIT', 40, 70);
      expect(p.trait, `seed ${seed} dealt a talent at creation`).toBe(NO_TALENT);
    }
  });

  it('the spawn roll is gone from content entirely', () => {
    const c = squadContent as unknown as Record<string, unknown>;
    expect(c.traits, 'the old trait list is still in content').toBeUndefined();
    expect(c.traitChance, 'the old trait chance is still in content').toBeUndefined();
  });

  /* The editor is the one place a name should still be assignable by hand. */
  it('still honours a forced trait, for the editor', () => {
    expect(createPlayer(createRng(1), 'TW', 50, 50, 'Leader').trait).toBe('Leader');
  });

  it('records his debut, which is what every predicate measures from', () => {
    const p = createPlayer(createRng(4), 'ST', 60, 60);
    expect(p.record.debutAge).toBe(p.age);
    expect(p.record.debutStrength).toBe(strengthOf(p));
    expect(p.record.matches).toBe(0);
  });
});

describe('the awarding hook', () => {
  it('hands out nothing to a squad that has done nothing', () => {
    const g = career();
    runTick(registry, g, 'week');
    expect(g.modules.squad.players.every((p) => p.trait === NO_TALENT)).toBe(true);
  });

  it('awards a talent the moment a player qualifies', () => {
    const g = career();
    const p = g.modules.squad.players[0]!;
    // A career worth a name: arrived young and improved a great deal.
    p.record = { ...EMPTY_RECORD, debutAge: 17, debutStrength: 45, seasonsHere: 3, matches: 60 };
    p.age = 20;
    p.attributes = { technik: 88, tempo: 88, kraft: 88, uebersicht: 88, mentalitaet: 88 };

    runTick(registry, g, 'week');
    expect(p.trait, 'a career like that earned nothing').not.toBe(NO_TALENT);
  });

  /*
   * A player carries one name. Re-evaluating a man who already has his would
   * let a talent quietly replace one he earned earlier.
   */
  it('never overwrites a name a player already carries', () => {
    const g = career();
    const p = g.modules.squad.players[0]!;
    p.trait = 'Etwas Eigenes';
    p.record = { ...EMPTY_RECORD, debutAge: 17, debutStrength: 40, seasonsHere: 4, matches: 90 };
    p.attributes = { technik: 92, tempo: 92, kraft: 92, uebersicht: 92, mentalitaet: 92 };

    runTick(registry, g, 'week');
    expect(p.trait).toBe('Etwas Eigenes');
  });

  it('is idempotent — a second week does not re-award', () => {
    const g = career();
    const p = g.modules.squad.players[0]!;
    p.record = { ...EMPTY_RECORD, debutAge: 17, debutStrength: 45, seasonsHere: 3, matches: 60 };
    p.age = 20;
    p.attributes = { technik: 88, tempo: 88, kraft: 88, uebersicht: 88, mentalitaet: 88 };

    runTick(registry, g, 'week');
    const first = p.trait;
    runTick(registry, g, 'week');
    expect(p.trait).toBe(first);
  });
});

describe('einmalig means once per career', () => {
  const unique = () => talents.find((t) => t.rarity === 'einmalig');

  it('records a unique talent so it cannot be handed out twice', () => {
    const g = career();
    const t = unique();
    if (!t) return;

    const [a, b] = g.modules.squad.players;
    for (const p of [a!, b!]) {
      p.record = { ...EMPTY_RECORD, debutAge: 17, debutStrength: 40, seasonsHere: 4, matches: 90 };
      p.age = 20;
      p.attributes = { technik: 95, tempo: 95, kraft: 95, uebersicht: 95, mentalitaet: 95 };
    }

    runTick(registry, g, 'week');
    const named = [a!, b!].filter((p) => p.trait === t.name);
    expect(named.length, 'the same once-in-a-lifetime talent went to two players')
      .toBeLessThanOrEqual(1);
  });

  /*
   * Selling him does not un-have him. Tracking this per squad would let the
   * same name be farmed by cycling players through, which is the joke telling
   * itself twice.
   */
  it('stays spent after the player leaves', () => {
    const g = career();
    const t = unique();
    if (!t) return;
    g.modules.squad.awardedTalents.push(t.id);
    g.modules.squad.players = [];

    const fresh = createPlayer(createRng(9), 'MIT', 90, 90);
    fresh.record = { ...EMPTY_RECORD, debutAge: 17, debutStrength: 40, seasonsHere: 4, matches: 90 };
    fresh.age = 20;
    g.modules.squad.players.push(fresh);

    runTick(registry, g, 'week');
    expect(fresh.trait, 'a spent once-per-career talent was handed out again').not.toBe(t.name);
  });

  it('a common talent is not consumed', () => {
    const common = talents.find((t) => t.rarity !== 'einmalig');
    if (!common) return;
    const g = career();
    g.modules.squad.awardedTalents.push(common.id);
    // Nothing about a common talent should be tracked as spent, but recording
    // one must not crash the hook either.
    expect(() => runTick(registry, g, 'week')).not.toThrow();
  });
});

describe('the record survives an old save', () => {
  it('takes the debut as where he stands, rather than inventing a career', () => {
    const mod = registry.byId.get('squad')!;
    const old = {
      players: [{
        id: 'p1', name: 'Alt', pos: 'MIT',
        attributes: { technik: 70, tempo: 70, kraft: 70, uebersicht: 70, mentalitaet: 70 },
        fitness: 90, morale: 70, age: 30, marketValue: 1, wage: 1,
        trait: 'Kein', injured: 0, suspended: 0, individualFocus: 'allgemein',
        contractMatchdays: 30
      }],
      lineup: [], captainId: null
    };
    const migrated = mod.state.migrate!(old, 3) as { players: { record: { debutStrength: number; debutAge: number } }[] };
    const p = migrated.players[0]!;
    /* Under-awards on purpose: a veteran who improved twenty points before the
       upgrade reads as having improved none, and will not be handed a
       Jahrhunderttalent for a career this save never recorded. */
    expect(p.record.debutAge).toBe(30);
    expect(p.record.debutStrength).toBe(70);
  });
});
