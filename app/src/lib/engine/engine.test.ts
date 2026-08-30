import { describe, it, expect } from 'vitest';
import { Registry } from './registry';
import { runTick } from './clock';
import { createRng, seedFrom, mixSeed } from './rng';
import { serialise, deserialise } from './save';
import { modules } from '$lib/modules';
import type { GameState, MetaState, ModuleStates } from './state';
import { defineModule } from './module';
import { z } from 'zod';

/**
 * Integration tests for the architecture itself, not for any one feature.
 *
 * These are the tests that would have caught the coupling problems in the
 * prototype: that a tick runs every module in the right order, that adding or
 * removing a feature does not disturb the others, and that a save written by an
 * older build still loads.
 */

const registry = new Registry(modules);

function meta(seed = seedFrom('test')): MetaState {
  return { seed, season: 1, matchday: 1, tick: 0, createdAt: 0, lastPlayedAt: 0 };
}

function freshGame(seedText = 'test'): GameState {
  const seed = seedFrom(seedText);
  const rng = createRng(seed);
  const mods: Record<string, unknown> = {};
  for (const m of registry.all) mods[m.id] = m.state.create(rng.fork(m.id));
  return { meta: meta(seed), modules: mods as unknown as ModuleStates };
}

describe('registry', () => {
  it('boots every declared module', () => {
    // Asserts the invariant rather than a hardcoded list, so adding a feature
    // does not require editing this test — which is the whole point of the
    // architecture and would be undermined by a test that fights it.
    const booted = registry.all.map((m) => m.id);
    expect(booted.length).toBe(modules.length);
    for (const m of modules) expect(booted).toContain(m.id);
    expect(new Set(booted).size).toBe(booted.length);
  });

  it('gives every module a title and a summary, so nothing is nameless in the UI', () => {
    for (const m of registry.all) {
      expect(m.title, `${m.id} title`).toBeTruthy();
      expect(m.summary, `${m.id} summary`).toBeTruthy();
    }
  });

  it('rejects a duplicate module id', () => {
    expect(() => new Registry([...modules, modules[1]!])).toThrow(/Duplicate module id/);
  });

  it('refuses to boot when a declared dependency is missing', () => {
    const orphan = defineModule({
      id: 'squad',
      title: 'Kader',
      summary: 'x',
      requires: ['finance'],
      state: { schema: z.any(), create: () => ({}) as any, version: 1 }
    });
    expect(() => new Registry([orphan])).toThrow(/requires "finance"/);
  });

  it('leaves a disabled module out entirely', () => {
    const off = modules.map((m) =>
      m.id === 'stadium' || m.id === 'merch' ? { ...m, enabled: () => false } : m
    );
    const r = new Registry(off);
    expect(r.byId.has('stadium')).toBe(false);
    expect(r.hooks('matchday').some((h) => h.module.id === 'stadium')).toBe(false);
  });

  it('refuses duplicate doc ids across modules', () => {
    const clash = [...modules, { ...modules[1]!, id: 'finance2' }];
    expect(() => new Registry(clash).docs()).toThrow(/Duplicate doc id/);
  });
});

describe('tick ordering', () => {
  it('runs hooks in phase order regardless of registration order', () => {
    const phases = registry.hooks('matchday').map((h) => h.phase);
    const rank = { pre: 0, sim: 1, post: 2, economy: 3, world: 4 };
    for (let i = 1; i < phases.length; i++) {
      expect(rank[phases[i]!]).toBeGreaterThanOrEqual(rank[phases[i - 1]!]);
    }
  });

  it('charges interest last, after every other module has posted', () => {
    const economy = registry.hooks('matchday').filter((h) => h.phase === 'economy');
    expect(economy.at(-1)!.module.id).toBe('finance');
  });

  it('lets one module contribute two hooks in different phases', () => {
    const squadHooks = registry.hooks('matchday').filter((h) => h.module.id === 'squad');
    expect(squadHooks.map((h) => h.phase).sort()).toEqual(['economy', 'post']);
  });
});

describe('a matchday', () => {
  it('moves money through the ledger and advances the calendar', () => {
    const game = freshGame();
    const before = game.modules.finance.money;

    const result = runTick(registry, game, 'matchday');

    expect(game.meta.matchday).toBe(2);
    expect(game.meta.tick).toBe(1);
    expect(game.modules.finance.money).not.toBe(before);
    expect(game.modules.finance.ledger.length).toBeGreaterThan(0);
    expect(result.events.length).toBeGreaterThan(0);
  });

  it('collects income from stadium and costs from squad, without them knowing each other', () => {
    const game = freshGame();
    runTick(registry, game, 'matchday');

    const sources = new Set(game.modules.finance.ledger.map((e) => e.source));
    expect(sources.has('stadium')).toBe(true);
    expect(sources.has('squad')).toBe(true);

    const wages = game.modules.finance.ledger.find((e) => e.source === 'squad')!;
    expect(wages.amount).toBeLessThan(0);
    const gate = game.modules.finance.ledger.find((e) => e.source === 'stadium')!;
    expect(gate.amount).toBeGreaterThan(0);
  });

  it('fields eleven players even though the new game starts with no lineup', () => {
    const game = freshGame();
    expect(game.modules.squad.lineup).toHaveLength(0);
    runTick(registry, game, 'matchday');
    expect(game.modules.squad.lineup).toHaveLength(11);
  });

  it('is fully reproducible from its seed', () => {
    const a = freshGame('same-seed');
    const b = freshGame('same-seed');
    for (let i = 0; i < 10; i++) {
      runTick(registry, a, 'matchday');
      runTick(registry, b, 'matchday');
    }
    expect(a.modules).toEqual(b.modules);
    expect(a.meta).toEqual(b.meta);
  });

  it('produces different careers from different seeds', () => {
    const a = freshGame('seed-a');
    const b = freshGame('seed-b');
    for (let i = 0; i < 5; i++) {
      runTick(registry, a, 'matchday');
      runTick(registry, b, 'matchday');
    }
    expect(a.modules.squad.players).not.toEqual(b.modules.squad.players);
  });

  it('survives a module that throws, and reports it instead of aborting the tick', () => {
    const broken = modules.map((m) =>
      m.id === 'stadium'
        ? { ...m, hooks: { matchday: { phase: 'economy' as const, provides: ['stadium.attendance'], run() { throw new Error('boom'); } } } }
        : m
    );
    const r = new Registry(broken);
    const game = freshGame();
    const seed = createRng(1);
    for (const m of r.all) (game.modules as any)[m.id] ??= m.state.create(seed);

    const result = runTick(r, game, 'matchday');

    // The tick still completed and still charged wages.
    expect(game.meta.matchday).toBe(2);
    expect(game.modules.finance.ledger.some((e) => e.source === 'squad')).toBe(true);
    // And the failure is visible rather than silent.
    expect(result.events.some((e) => e.severity === 'bad' && e.title.includes('Stadion'))).toBe(true);
  });

  it('survives a full 34-matchday season', () => {
    const game = freshGame('season');
    for (let i = 0; i < 34; i++) runTick(registry, game, 'matchday');
    expect(game.meta.matchday).toBe(35);
    expect(game.modules.squad.players.every((p) => p.fitness >= 10 && p.fitness <= 100)).toBe(true);
    expect(game.modules.finance.ledger.length).toBeLessThanOrEqual(2000);
  });
});

describe('saves', () => {
  it('round-trips a game unchanged', () => {
    const game = freshGame('roundtrip');
    for (let i = 0; i < 3; i++) runTick(registry, game, 'matchday');

    const file = serialise(registry, game, 'slot1');
    const { state, notes } = deserialise(registry, file, () => createRng(1));

    expect(notes).toEqual([]);
    expect(state.modules).toEqual(game.modules);
    expect(state.meta).toEqual(game.meta);
  });

  it('gives a feature fresh state when the save predates it, and says so', () => {
    const game = freshGame();
    const file = serialise(registry, game, 'old');
    delete file.modules.stadium; // as if stadium did not exist when this was saved

    const { state, notes } = deserialise(registry, file, () => createRng(1));

    expect(state.modules.stadium).toBeDefined();
    expect(notes.join(' ')).toMatch(/Stadion.*neu angelegt/);
  });

  it('resets one bad slice instead of failing the whole load', () => {
    const game = freshGame();
    const file = serialise(registry, game, 'corrupt');
    file.modules.finance!.data = { money: 'nicht-eine-zahl' };

    const { state, notes } = deserialise(registry, file, () => createRng(1));

    expect(state.modules.finance.money).toBe(150_000);
    expect(state.modules.squad.players.length).toBeGreaterThan(0); // untouched
    expect(notes.join(' ')).toMatch(/Finanzen.*ungültig/);
  });

  it('resets a slice whose version moved on with no migration, and says so', () => {
    const game = freshGame();
    const file = serialise(registry, game, 'v0');
    file.modules.squad!.v = 0;

    const { notes } = deserialise(registry, file, () => createRng(1));
    expect(notes.join(' ')).toMatch(/Kader.*ohne Migration/);
  });
});

describe('documentation', () => {
  it('has an entry for every id, with a tooltip and a rationale', () => {
    const docs = registry.docs();
    expect(docs.size).toBeGreaterThan(15);
    for (const [id, entry] of docs) {
      expect(entry.label, `${id} label`).toBeTruthy();
      expect(entry.tooltip, `${id} tooltip`).toBeTruthy();
      expect(entry.why, `${id} why`).toBeTruthy();
    }
  });

  it('never points `related` at an id that does not exist', () => {
    const docs = registry.docs();
    for (const [id, entry] of docs) {
      for (const rel of entry.related ?? []) {
        expect(docs.has(rel), `${id} → ${rel}`).toBe(true);
      }
    }
  });
});

describe('a failing tick', () => {
  it('reports which module threw, so the caller can roll back', () => {
    const broken = modules.map((m) =>
      m.id === 'stadium'
        ? { ...m, hooks: { matchday: { phase: 'economy' as const, provides: ['stadium.attendance'], run() { throw new Error('boom'); } } } }
        : m
    );
    const r = new Registry(broken);
    const game = freshGame();
    const seed = createRng(1);
    for (const m of r.all) (game.modules as any)[m.id] ??= m.state.create(seed);

    const result = runTick(r, game, 'matchday');

    // The engine does not roll back — it has no snapshot. It reports, and the
    // state layer (advance() in game.svelte.ts) rolls back to the snapshot it
    // took before the tick. Without `failed`, a half-applied tick committed
    // silently: a fee debited with no player delivered.
    expect(result.failed).toEqual(['stadium']);
    expect(result.events.some((e) => e.severity === 'bad')).toBe(true);
  });

  it('reports an empty failed list on a clean tick', () => {
    const game = freshGame();
    expect(runTick(registry, game, 'matchday').failed).toEqual([]);
  });

  /*
   * Writing a key you did not declare has to fail loudly.
   *
   * `assertContextWiring` orders consumers after producers by reading the
   * `provides` / `contributes` arrays. A hook that writes a key without listing
   * it is invisible to that check: the value still arrives, in whatever order
   * the hooks happen to run, and any module that then declares it honestly in
   * `consumes` makes the registry throw at boot because as far as it can tell
   * nobody produces it. `stadium` shipped exactly that for months. The
   * declaration has to be load-bearing, not documentation.
   */
  it('refuses to provide a key the hook did not declare', () => {
    const sneaky = modules.map((m) =>
      m.id === 'stadium'
        ? {
            ...m,
            hooks: {
              matchday: {
                phase: 'economy' as const,
                provides: ['stadium.attendance'],
                run({ provide }: { provide: (k: string, v: unknown) => void }) {
                  provide('stadium.attendance', 1000);
                  provide('stadium.hotDogs', 12);   // never declared
                }
              }
            }
          }
        : m
    );
    const r = new Registry(sneaky);
    const game = freshGame();
    const seed = createRng(1);
    for (const m of r.all) (game.modules as any)[m.id] ??= m.state.create(seed);

    const result = runTick(r, game, 'matchday');
    expect(result.failed, 'an undeclared provide must fail the tick').toEqual(['stadium']);
  });

  it('refuses to contribute to a key the hook did not declare', () => {
    const sneaky = modules.map((m) =>
      m.id === 'stadium'
        ? {
            ...m,
            hooks: {
              matchday: {
                phase: 'economy' as const,
                provides: ['stadium.attendance'],
                run({ provide, modify }: { provide: (k: string, v: unknown) => void; modify: (k: string, f: number) => void }) {
                  provide('stadium.attendance', 1000);
                  modify('squad.fitnessLoss', 0.5);   // never declared here
                }
              }
            }
          }
        : m
    );
    const r = new Registry(sneaky);
    const game = freshGame();
    const seed = createRng(1);
    for (const m of r.all) (game.modules as any)[m.id] ??= m.state.create(seed);

    expect(runTick(r, game, 'matchday').failed).toEqual(['stadium']);
  });
});

describe('rng stream separation', () => {
  it('gives two modules on the same tick genuinely different sequences', () => {
    // The previous scheme XOR-ed seed, module hash and tick into a PRNG whose
    // state advanced by a fixed additive step, so "independent" streams were one
    // stream at different offsets. This checks the property that mattered:
    // no module's sequence appears inside another's.
    const seed = seedFrom('separation');
    const ids = ['core', 'finance', 'squad', 'stadium', 'league', 'transfer', 'merch', 'industry'];
    const streams = ids.map((id) => {
      const rng = createRng(mixSeed(seed, `${id}#matchday#0`));
      return Array.from({ length: 12 }, () => rng.next());
    });

    for (let i = 0; i < streams.length; i++) {
      for (let j = 0; j < streams.length; j++) {
        if (i === j) continue;
        const head = streams[i]!.slice(0, 4).join(',');
        expect(streams[j]!.join(','), `${ids[i]} found inside ${ids[j]}`).not.toContain(head);
      }
    }
  });

  it('does not replay the world-generation stream on tick 0', () => {
    // At tick 0 the old derivation collapsed to exactly the seed that built the
    // module, so the first matchday's injuries were a function of how the squad
    // had been rolled.
    const seed = seedFrom('tick-zero');
    const worldGen = createRng(seed).fork('squad');
    const tickZero = createRng(mixSeed(seed, 'squad#matchday#0'));
    const a = Array.from({ length: 6 }, () => worldGen.next());
    const b = Array.from({ length: 6 }, () => tickZero.next());
    expect(b).not.toEqual(a);
  });

  it('fork is stable against draws taken on the parent first', () => {
    // fork() used to seed from the parent's LIVE state, so adding one die roll
    // upstream reseeded every fork below it.
    const parent1 = createRng(99);
    const forkA = parent1.fork('injuries').next();
    const parent2 = createRng(99);
    parent2.next();
    const forkB = parent2.fork('injuries').next();
    expect(forkB).toBe(forkA);
  });
});

describe('delegation', () => {
  const withAutopilot = (record: string[]) =>
    modules.map((m) =>
      m.id === 'stadium'
        ? {
            ...m,
            autopilot: {
              phase: 'economy' as const,
              provides: ['stadium.attendance'],
              run(ctx: any) {
                // The competence value is the whole point: an autopilot should
                // act WORSE when it is low, not merely differently.
                record.push(`auto:${ctx.delegation?.executiveId}:${ctx.delegation?.competence}`);
              }
            }
          }
        : m
    );

  it('runs the autopilot instead of the normal hook, and hands it the competence', () => {
    const record: string[] = [];
    const r = new Registry(withAutopilot(record));
    const game = freshGame();

    runTick(r, game, 'matchday', {
      delegationFor: (id) =>
        id === 'stadium'
          ? { executiveId: 'exec-3', competence: 0.35, hiredOnMatchday: 2 }
          : undefined
    });

    expect(record).toEqual(['auto:exec-3:0.35']);
    // The normal hook did not also run: no gate receipts were posted.
    expect(game.modules.finance.ledger.some((e) => e.source === 'stadium')).toBe(false);
  });

  it('runs the normal hook when nothing is delegated', () => {
    const record: string[] = [];
    const r = new Registry(withAutopilot(record));
    const game = freshGame();

    runTick(r, game, 'matchday', {});

    expect(record).toEqual([]);
    expect(game.modules.finance.ledger.some((e) => e.source === 'stadium')).toBe(true);
  });

  it('leaves ctx.delegation undefined for modules that are not delegated', () => {
    let seen: unknown = 'unset';
    const r = new Registry(
      modules.map((m) =>
        m.id === 'squad'
          ? { ...m, hooks: { matchday: { phase: 'post' as const, run(ctx: any) { seen = ctx.delegation; } } } }
          : m
      )
    );
    runTick(r, freshGame(), 'matchday', {
      delegationFor: (id) => (id === 'stadium' ? { executiveId: 'x', competence: 1, hiredOnMatchday: 0 } : undefined)
    });
    expect(seen).toBeUndefined();
  });
});
