import type { EditorState, ClubOverride, PlayerOverride } from './state';
import { ClubOverrideSchema, PlayerOverrideSchema, EditorSchema } from './state';
import type { Attributes } from '../squad/attributes';

/**
 * Resolution rules. Pure functions, no I/O.
 *
 * Everything here follows one shape: `resolve(shipped, override)` returns what
 * the player should see. The shipped value is never mutated, so "reset" is
 * deleting a key rather than restoring a backup — which means it cannot fail.
 */

/**
 * A club as the editor sees it.
 *
 * Deliberately structural rather than tied to `StartClub` or `LeagueTeam`: the
 * editor edits whatever has an id and a name, which is what let it move from
 * the start-screen roster to the league without changing a rule. It edited the
 * wrong set for a while — fourteen clubs the player never met, while the
 * seventeen they played every week were untouchable — because those were the
 * only clubs that existed as content.
 */
export interface NamedClub {
  id: string;
  name: string;
  short: string;
  city: string;
  colours: readonly [string, string];
}

export function resolveClub<T extends NamedClub>(editor: EditorState, club: T): T {
  const o = editor.clubs[club.id];
  if (!o) return club;
  return {
    ...club,
    name: o.name ?? club.name,
    short: o.short ?? club.short,
    city: o.city ?? club.city,
    colours: o.colours ?? club.colours
  };
}

export interface NamedPlayer {
  id: string;
  name: string;
  attributes: Attributes;
  age: number;
  trait: string;
}

export function resolvePlayer<T extends NamedPlayer>(editor: EditorState, player: T): T {
  const o = editor.players[player.id];
  if (!o) return player;
  return {
    ...player,
    name: o.name ?? player.name,
    age: o.age ?? player.age,
    trait: o.trait ?? player.trait,
    // Attributes merge FIELD BY FIELD: editing Tempo alone must not silently
    // reset the other four to whatever the form last held.
    attributes: { ...player.attributes, ...(o.attributes ?? {}) }
  };
}

/** The crest image the player chose, if any. Falls back to the generated one. */
export function crestAssetFor(editor: EditorState, clubId: string): string | undefined {
  return editor.clubs[clubId]?.crestAssetId;
}

export function editClub(editor: EditorState, clubId: string, patch: ClubOverride): void {
  const merged = { ...(editor.clubs[clubId] ?? {}), ...patch };
  editor.clubs[clubId] = ClubOverrideSchema.parse(merged);
  editor.touched = true;
}

export function editPlayer(editor: EditorState, playerId: string, patch: PlayerOverride): void {
  const existing = editor.players[playerId] ?? {};
  const merged: PlayerOverride = {
    ...existing,
    ...patch,
    attributes: { ...(existing.attributes ?? {}), ...(patch.attributes ?? {}) }
  };
  editor.players[playerId] = PlayerOverrideSchema.parse(merged);
  editor.touched = true;
}

/** Undo one club's edits. Cannot fail: the original was never overwritten. */
export function resetClub(editor: EditorState, clubId: string): boolean {
  if (!(clubId in editor.clubs)) return false;
  delete editor.clubs[clubId];
  return true;
}

export function resetPlayer(editor: EditorState, playerId: string): boolean {
  if (!(playerId in editor.players)) return false;
  delete editor.players[playerId];
  return true;
}

export function resetAll(editor: EditorState): void {
  editor.clubs = {};
  editor.players = {};
  editor.touched = false;
}

export function editCount(editor: EditorState): { clubs: number; players: number } {
  return {
    clubs: Object.keys(editor.clubs).length,
    players: Object.keys(editor.players).length
  };
}

/* ------------------------------------------------------------------ packs -- */

export const PACK_FORMAT = 1;

export interface EditorPack {
  format: number;
  label: string;
  createdAt: number;
  clubs: Record<string, ClubOverride>;
  players: Record<string, PlayerOverride>;
}

/**
 * Export the whole edit set as one object.
 *
 * Crest images are deliberately NOT inlined: a pack with a dozen base64 PNGs is
 * megabytes, and the point of a pack is that it can be pasted into a message.
 * Images live in the asset store and travel separately.
 */
export function toPack(editor: EditorState): EditorPack {
  return {
    format: PACK_FORMAT,
    label: editor.label,
    createdAt: Date.now(),
    clubs: structuredClone(editor.clubs),
    players: structuredClone(editor.players)
  };
}

export interface ImportReport {
  ok: boolean;
  clubs: number;
  players: number;
  /** Entries that failed validation. Reported, never silently dropped. */
  rejected: string[];
  error?: string;
}

/**
 * Bring someone else's pack in.
 *
 * Validates entry by entry rather than all-or-nothing: a pack with one bad club
 * should import the other thirteen and say which one it skipped. Refusing the
 * whole file over a single typo is how a sharing feature stops being used.
 */
export function applyPack(editor: EditorState, raw: unknown): ImportReport {
  const rejected: string[] = [];
  const pack = raw as Partial<EditorPack>;

  if (!pack || typeof pack !== 'object') {
    return { ok: false, clubs: 0, players: 0, rejected, error: 'Keine gültige Datei.' };
  }
  if (pack.format !== PACK_FORMAT) {
    return {
      ok: false, clubs: 0, players: 0, rejected,
      error: `Unbekanntes Format (${String(pack.format)}). Diese Datei stammt aus einer anderen Version.`
    };
  }

  let clubs = 0;
  for (const [id, value] of Object.entries(pack.clubs ?? {})) {
    const parsed = ClubOverrideSchema.safeParse(value);
    if (parsed.success) { editor.clubs[id] = parsed.data; clubs++; }
    else rejected.push(`Verein ${id}`);
  }

  let players = 0;
  for (const [id, value] of Object.entries(pack.players ?? {})) {
    const parsed = PlayerOverrideSchema.safeParse(value);
    if (parsed.success) { editor.players[id] = parsed.data; players++; }
    else rejected.push(`Spieler ${id}`);
  }

  if (typeof pack.label === 'string' && pack.label.length > 0) editor.label = pack.label;
  editor.touched = clubs + players > 0;

  return { ok: true, clubs, players, rejected };
}

/** Round-trip guard used by the tests and by the import screen. */
export function isPack(raw: unknown): boolean {
  return EditorSchema.omit({ touched: true }).safeParse({
    label: (raw as EditorPack)?.label ?? '',
    clubs: (raw as EditorPack)?.clubs ?? {},
    players: (raw as EditorPack)?.players ?? {}
  }).success;
}
