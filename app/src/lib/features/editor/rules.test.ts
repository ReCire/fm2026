import { describe, it, expect } from 'vitest';
import { createRng } from '$lib/engine/rng';
import { createEditor, migrateEditor, type EditorState } from './state';
import {
  editClub, editPlayer, resetClub, resetPlayer, resetAll, editCount,
  applyAll, crestAssetFor, toPack, applyPack, isPack, PACK_FORMAT,
  type NamedClub, type NamedPlayer
} from './rules';
import { uniform } from '../squad/attributes';

const fresh = (): EditorState => createEditor(createRng(1));

const club = (over: Partial<NamedClub> = {}): NamedClub & { colours: [string, string] } => ({
  id: 'c1', name: 'SC Ziegelhütte', short: 'SCZ', city: 'Ziegelhütte',
  colours: ['#101010', '#f0f0f0'],
  ...over
} as NamedClub & { colours: [string, string] });

const player = (over: Partial<NamedPlayer> = {}): NamedPlayer => ({
  id: 'p1', name: 'Max Wagner', attributes: uniform(50), age: 24, trait: '—',
  ...over
});

describe('an edit is written onto the thing it edits', () => {
  /*
   * The whole point of the rewrite. Edits used to be resolved at read time and
   * almost nothing called the resolver, so an edit existed only inside the
   * editor. These tests read the object, never the edit map.
   */
  it('changes the club itself', () => {
    const e = fresh();
    const c = club();
    editClub(e, c, { name: 'FC Bayern München', city: 'München' });
    expect(c.name).toBe('FC Bayern München');
    expect(c.city).toBe('München');
    expect(c.short, 'an untouched field must not move').toBe('SCZ');
  });

  it('changes the player itself', () => {
    const e = fresh();
    const p = player();
    editPlayer(e, p, { name: 'Uwe Seeler', age: 30 });
    expect(p.name).toBe('Uwe Seeler');
    expect(p.age).toBe(30);
  });

  /* Editing Tempo alone must not silently reset the other four to whatever the
     form last held. */
  it('merges attributes field by field', () => {
    const e = fresh();
    const p = player();
    editPlayer(e, p, { attributes: { tempo: 91 } });
    expect(p.attributes.tempo).toBe(91);
    expect(p.attributes.technik).toBe(50);

    editPlayer(e, p, { attributes: { technik: 77 } });
    expect(p.attributes.tempo, 'the earlier edit was lost').toBe(91);
    expect(p.attributes.technik).toBe(77);
  });

  it('makes the 99-everywhere player possible, which is the point', () => {
    const e = fresh();
    const p = player();
    editPlayer(e, p, {
      attributes: { technik: 99, tempo: 99, kraft: 99, uebersicht: 99, mentalitaet: 99 }
    });
    expect(Object.values(p.attributes).every((v) => v === 99)).toBe(true);
  });

  it('refuses an out-of-range attribute rather than storing it', () => {
    const e = fresh();
    const p = player();
    expect(() => editPlayer(e, p, { attributes: { tempo: 140 } })).toThrow();
    expect(p.attributes.tempo, 'a rejected edit must not land').toBe(50);
  });
});

describe('reset', () => {
  it('goes back to what shipped, not to the previous edit', () => {
    const e = fresh();
    const c = club();
    editClub(e, c, { name: 'Erste' });
    editClub(e, c, { name: 'Zweite' });
    expect(resetClub(e, c)).toBe(true);
    expect(c.name).toBe('SC Ziegelhütte');
  });

  it('restores every field the club has', () => {
    const e = fresh();
    const c = club();
    editClub(e, c, { name: 'X', short: 'XXX', city: 'Y', colours: ['#111111', '#222222'] });
    resetClub(e, c);
    expect({ name: c.name, short: c.short, city: c.city, colours: [...c.colours] })
      .toEqual({ name: 'SC Ziegelhütte', short: 'SCZ', city: 'Ziegelhütte', colours: ['#101010', '#f0f0f0'] });
  });

  it('restores a player, attributes included', () => {
    const e = fresh();
    const p = player();
    editPlayer(e, p, { name: 'Neu', attributes: { tempo: 99, kraft: 12 } });
    resetPlayer(e, p);
    expect(p.name).toBe('Max Wagner');
    expect(p.attributes).toEqual(uniform(50));
  });

  it('reports false for something that was never edited', () => {
    const e = fresh();
    expect(resetClub(e, club())).toBe(false);
    expect(resetPlayer(e, player())).toBe(false);
  });

  it('resetAll clears the whole set and puts everything back', () => {
    const e = fresh();
    const c = club();
    const p = player();
    editClub(e, c, { name: 'A' });
    editPlayer(e, p, { name: 'B' });
    resetAll(e, [c], [p]);
    expect(c.name).toBe('SC Ziegelhütte');
    expect(p.name).toBe('Max Wagner');
    expect(editCount(e)).toEqual({ clubs: 0, players: 0 });
    expect(e.touched).toBe(false);
  });
});

describe('crests', () => {
  it('remembers a chosen asset', () => {
    const e = fresh();
    const c = club();
    expect(crestAssetFor(e, c.id)).toBeUndefined();
    editClub(e, c, { crestAssetId: 'asset-9' });
    expect(crestAssetFor(e, c.id)).toBe('asset-9');
  });
});

describe('applyAll', () => {
  it('is idempotent, so it can run from a tick without a guard', () => {
    const e = fresh();
    const c = club();
    const p = player();
    editClub(e, c, { name: 'Einmal' });
    editPlayer(e, p, { attributes: { tempo: 88 } });

    applyAll(e, [c], [p]);
    applyAll(e, [c], [p]);

    expect(c.name).toBe('Einmal');
    expect(p.attributes.tempo).toBe(88);
    // And reset still reaches the shipped value, not the re-applied one.
    resetClub(e, c);
    expect(c.name).toBe('SC Ziegelhütte');
  });

  it('skips ids it has no edit for', () => {
    const e = fresh();
    const c = club();
    expect(applyAll(e, [c], [])).toEqual({ clubs: 0, players: 0 });
    expect(c.name).toBe('SC Ziegelhütte');
  });
});

describe('packs', () => {
  it('round-trips a full edit set', () => {
    const e = fresh();
    const c = club();
    const p = player();
    editClub(e, c, { name: 'FC Bayern München', short: 'FCB' });
    editPlayer(e, p, { name: 'Uwe Seeler', attributes: { technik: 90 } });
    e.label = 'Bundesliga 1988';

    const pack = toPack(e);
    expect(pack.format).toBe(PACK_FORMAT);
    expect(isPack(pack)).toBe(true);

    const target = fresh();
    const c2 = club();
    const p2 = player();
    const report = applyPack(target, [c2], [p2], pack);

    expect(report.ok).toBe(true);
    expect(report.rejected).toEqual([]);
    expect(target.label).toBe('Bundesliga 1988');
    // Applied, not merely accepted — the difference the old version could not
    // report, because nothing was applied at all.
    expect(report.applied).toEqual({ clubs: 1, players: 1 });
    expect(c2.name).toBe('FC Bayern München');
    expect(p2.name).toBe('Uwe Seeler');
    expect(p2.attributes.technik).toBe(90);
  });

  it('imports the good entries and names the bad one', () => {
    const target = fresh();
    const c = club();
    const bad = {
      format: PACK_FORMAT, label: 'Gemischt', createdAt: 0,
      clubs: { c1: { name: 'Gut' }, c2: { name: 42 } },
      players: {}
    };
    const report = applyPack(target, [c], [], bad);
    expect(report.ok).toBe(true);
    expect(report.clubs).toBe(1);
    expect(report.rejected).toEqual(['Verein c2']);
    expect(c.name).toBe('Gut');
  });

  it('refuses a pack from another version, and says so', () => {
    const report = applyPack(fresh(), [], [], { format: 99, label: 'x', clubs: {}, players: {} });
    expect(report.ok).toBe(false);
    expect(report.error).toContain('99');
  });

  it('refuses something that is not a pack at all', () => {
    expect(applyPack(fresh(), [], [], null).ok).toBe(false);
    expect(applyPack(fresh(), [], [], 'nope').ok).toBe(false);
    expect(isPack({ nope: true })).toBe(false);
  });

  it('exports a detached copy — later edits do not rewrite an exported pack', () => {
    const e = fresh();
    const c = club();
    editClub(e, c, { name: 'Erste' });
    const pack = toPack(e);
    editClub(e, c, { name: 'Zweite' });
    expect(pack.clubs.c1!.name).toBe('Erste');
  });

  /* An imported pack may name clubs from a career you are not playing. Saying
     "14 imported" when none of them can be seen is a lie the screen would tell
     on the module's behalf. */
  it('reports accepted and applied separately', () => {
    const target = fresh();
    const pack = {
      format: PACK_FORMAT, label: 'Fremd', createdAt: 0,
      clubs: { unknown1: { name: 'A' }, unknown2: { name: 'B' } },
      players: {}
    };
    const report = applyPack(target, [], [], pack);
    expect(report.clubs).toBe(2);
    expect(report.applied.clubs).toBe(0);
  });
});

describe('the v1 → v2 migration', () => {
  it('keeps the edits and flags them for applying', () => {
    const v1 = { label: 'Alt', clubs: { c1: { name: 'Alt-Name' } }, players: {}, touched: true };
    const migrated = migrateEditor(v1, 1);
    expect(migrated.clubs.c1!.name).toBe('Alt-Name');
    expect(migrated.pendingApply, 'a v1 edit set was never written onto anything').toBe(true);
  });

  it('does not flag an empty set', () => {
    expect(migrateEditor({ label: 'Leer', clubs: {}, players: {}, touched: false }, 1).pendingApply)
      .toBe(false);
  });
});
