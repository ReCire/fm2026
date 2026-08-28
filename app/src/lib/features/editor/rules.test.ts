import { describe, it, expect } from 'vitest';
import {
  resolveClub, resolvePlayer, editClub, editPlayer, resetClub, resetPlayer,
  resetAll, editCount, toPack, applyPack, crestAssetFor, PACK_FORMAT
} from './rules';
import { createEditor, type EditorState } from './state';
import { createRng } from '$lib/engine/rng';
import { uniform } from '../squad/attributes';

const fresh = (): EditorState => createEditor(createRng(1));
const club = () => ({
  id: 'ziegelhuette', name: 'SC Ziegelhütte', short: 'ZGH',
  city: 'Fürth-West', colours: ['#5C1F2E', '#D8C9A8'] as [string, string]
});
const player = () => ({
  id: 'p1', name: 'Uwe Berger', attributes: uniform(50), age: 26, trait: 'Kein'
});

describe('overrides never touch the shipped value', () => {
  it('returns the original when nothing is edited', () => {
    expect(resolveClub(fresh(), club())).toEqual(club());
    expect(resolvePlayer(fresh(), player())).toEqual(player());
  });

  it('renames a club without disturbing its other fields', () => {
    const e = fresh();
    editClub(e, 'ziegelhuette', { name: 'FC Bayern' });
    const r = resolveClub(e, club());
    expect(r.name).toBe('FC Bayern');
    expect(r.city).toBe('Fürth-West');
    expect(r.colours).toEqual(club().colours);
  });

  /**
   * The whole point of an override layer: reset cannot fail, because the
   * original was never written over.
   */
  it('resets exactly back to shipped', () => {
    const e = fresh();
    editClub(e, 'ziegelhuette', { name: 'X', short: 'YY', colours: ['#000000', '#FFFFFF'] });
    expect(resetClub(e, 'ziegelhuette')).toBe(true);
    expect(resolveClub(e, club())).toEqual(club());
  });

  it('resetting something never edited is a no-op, not an error', () => {
    expect(resetClub(fresh(), 'nope')).toBe(false);
    expect(resetPlayer(fresh(), 'nope')).toBe(false);
  });
});

describe('player attributes', () => {
  it('merges field by field, so editing one does not reset the rest', () => {
    const e = fresh();
    editPlayer(e, 'p1', { attributes: { tempo: 99 } });
    const r = resolvePlayer(e, player());
    expect(r.attributes.tempo).toBe(99);
    expect(r.attributes.technik).toBe(50);
    expect(r.attributes.kraft).toBe(50);
  });

  it('accumulates across separate edits rather than replacing', () => {
    const e = fresh();
    editPlayer(e, 'p1', { attributes: { tempo: 99 } });
    editPlayer(e, 'p1', { attributes: { technik: 99 } });
    const r = resolvePlayer(e, player());
    expect(r.attributes.tempo).toBe(99);
    expect(r.attributes.technik).toBe(99);
  });

  it('makes the 99-everywhere player possible, which is the point', () => {
    const e = fresh();
    editPlayer(e, 'p1', { name: 'Der Beste', attributes: uniform(99) });
    const r = resolvePlayer(e, player());
    expect(r.name).toBe('Der Beste');
    expect(Object.values(r.attributes).every((v) => v === 99)).toBe(true);
  });

  it('refuses an out-of-range attribute rather than storing it', () => {
    const e = fresh();
    expect(() => editPlayer(e, 'p1', { attributes: { tempo: 150 } })).toThrow();
    expect(resolvePlayer(e, player()).attributes.tempo).toBe(50);
  });

  it('refuses an absurdly long name', () => {
    expect(() => editClub(fresh(), 'x', { name: 'a'.repeat(200) })).toThrow();
  });
});

describe('crests', () => {
  it('reports no asset until one is chosen, so the generated crest stands', () => {
    expect(crestAssetFor(fresh(), 'ziegelhuette')).toBeUndefined();
  });
  it('remembers a chosen asset', () => {
    const e = fresh();
    editClub(e, 'ziegelhuette', { crestAssetId: 'asset-7' });
    expect(crestAssetFor(e, 'ziegelhuette')).toBe('asset-7');
  });
});

describe('packs', () => {
  it('round-trips a full edit set', () => {
    const a = fresh();
    editClub(a, 'ziegelhuette', { name: 'FC Bayern', short: 'FCB' });
    editPlayer(a, 'p1', { name: 'Der Beste', attributes: uniform(99) });

    const b = fresh();
    const report = applyPack(b, toPack(a));

    expect(report.ok).toBe(true);
    expect(report.clubs).toBe(1);
    expect(report.players).toBe(1);
    expect(resolveClub(b, club()).name).toBe('FC Bayern');
    expect(resolvePlayer(b, player()).attributes.tempo).toBe(99);
  });

  it('exports a detached copy — later edits do not rewrite an exported pack', () => {
    const e = fresh();
    editClub(e, 'ziegelhuette', { name: 'Erst' });
    const pack = toPack(e);
    editClub(e, 'ziegelhuette', { name: 'Dann' });
    expect(pack.clubs.ziegelhuette!.name).toBe('Erst');
  });

  /**
   * A pack with one bad entry must import the rest and say what it skipped.
   * Refusing a whole file over one typo is how a sharing feature stops being
   * used at all.
   */
  it('imports what it can and names what it could not', () => {
    const e = fresh();
    const report = applyPack(e, {
      format: PACK_FORMAT,
      label: 'Bundesliga 2026',
      createdAt: 0,
      clubs: {
        good: { name: 'FC Bayern' },
        bad: { name: 'x'.repeat(200) }
      },
      players: {}
    });
    expect(report.ok).toBe(true);
    expect(report.clubs).toBe(1);
    expect(report.rejected).toEqual(['Verein bad']);
    expect(e.label).toBe('Bundesliga 2026');
  });

  it('refuses a pack from another format version, and says so', () => {
    const r = applyPack(fresh(), { format: 99, clubs: {}, players: {} });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/Unbekanntes Format/);
  });

  it('refuses rubbish without throwing', () => {
    expect(applyPack(fresh(), null).ok).toBe(false);
    expect(applyPack(fresh(), 'not a pack').ok).toBe(false);
  });
});

describe('bookkeeping', () => {
  it('counts edits and clears them', () => {
    const e = fresh();
    editClub(e, 'a', { name: 'A' });
    editPlayer(e, 'p', { name: 'P' });
    expect(editCount(e)).toEqual({ clubs: 1, players: 1 });
    expect(e.touched).toBe(true);
    resetAll(e);
    expect(editCount(e)).toEqual({ clubs: 0, players: 0 });
    expect(e.touched).toBe(false);
  });
});
