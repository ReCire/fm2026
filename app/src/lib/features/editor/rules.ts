import type { EditorState, ClubEdit, PlayerEdit } from './state';
import { ClubEditSchema, PlayerEditSchema } from './state';
import type { Attributes } from '../squad/attributes';

/**
 * Applying and undoing edits. Pure functions over the objects handed in.
 *
 * There is no `resolveClub` or `resolvePlayer` any more, and that is the point
 * — see the note at the top of state.ts. An edit is written onto the thing it
 * edits, so every screen in the game shows it without knowing this module
 * exists, and no future screen can forget a call.
 */

/**
 * A club as the editor sees it.
 *
 * Structural rather than tied to `StartClub` or `LeagueTeam`: the editor edits
 * whatever has an id and a name, which is what let it move from the start-screen
 * roster to the league without changing a rule. It edited the wrong set for a
 * while — fourteen clubs the player never met, while the seventeen they played
 * every week were untouchable — because those were the only clubs that existed
 * as content.
 */
export interface NamedClub {
  id: string;
  name: string;
  short: string;
  city: string;
  colours: readonly [string, string];
}

export interface NamedPlayer {
  id: string;
  name: string;
  attributes: Attributes;
  age: number;
  trait: string;
}

/** True when the player has changed anything about this club. */
export function isClubEdited(editor: EditorState, clubId: string): boolean {
  return clubId in editor.clubs;
}

export function isPlayerEdited(editor: EditorState, playerId: string): boolean {
  return playerId in editor.players;
}

/** The crest image the player chose, if any. Falls back to the generated one. */
export function crestAssetFor(editor: EditorState, clubId: string): string | undefined {
  return editor.clubs[clubId]?.crestAssetId;
}

/**
 * Change a club, for real.
 *
 * `club` is the live object out of `league.levels` — save data, copied out of
 * content when the career began. Writing to it is what makes the new name show
 * up in the table, on the matchday report and in the header, none of which
 * know this module exists.
 */
export function editClub<T extends NamedClub>(editor: EditorState, club: T, patch: ClubEdit): void {
  const clean = ClubEditSchema.parse(patch);

  // Captured once, before the first change. Never overwritten, so reset goes
  // back to what shipped rather than to the previous edit.
  if (!(club.id in editor.originals.clubs)) {
    editor.originals.clubs[club.id] = {
      name: club.name,
      short: club.short,
      city: club.city,
      colours: [club.colours[0], club.colours[1]]
    };
  }

  editor.clubs[club.id] = { ...(editor.clubs[club.id] ?? {}), ...clean };
  applyClub(club, clean);
  editor.touched = true;
}

function applyClub<T extends NamedClub>(club: T, edit: ClubEdit): void {
  if (edit.name !== undefined) club.name = edit.name;
  if (edit.short !== undefined) club.short = edit.short;
  if (edit.city !== undefined) club.city = edit.city;
  if (edit.colours !== undefined) (club as { colours: readonly [string, string] }).colours = edit.colours;
}

export function editPlayer<T extends NamedPlayer>(
  editor: EditorState,
  player: T,
  patch: PlayerEdit
): void {
  const clean = PlayerEditSchema.parse(patch);

  if (!(player.id in editor.originals.players)) {
    editor.originals.players[player.id] = {
      name: player.name,
      attributes: { ...player.attributes },
      age: player.age,
      trait: player.trait
    };
  }

  const existing = editor.players[player.id] ?? {};
  editor.players[player.id] = {
    ...existing,
    ...clean,
    // Attributes merge FIELD BY FIELD: editing Tempo alone must not silently
    // reset the other four to whatever the form last held.
    attributes: { ...(existing.attributes ?? {}), ...(clean.attributes ?? {}) }
  };
  applyPlayer(player, clean);
  editor.touched = true;
}

function applyPlayer<T extends NamedPlayer>(player: T, edit: PlayerEdit): void {
  if (edit.name !== undefined) player.name = edit.name;
  if (edit.age !== undefined) player.age = edit.age;
  if (edit.trait !== undefined) player.trait = edit.trait;
  if (edit.attributes) Object.assign(player.attributes, edit.attributes);
}

/** Undo one club's edits. Cannot fail: the original was captured first. */
export function resetClub<T extends NamedClub>(editor: EditorState, club: T): boolean {
  const original = editor.originals.clubs[club.id];
  if (!original) return false;
  club.name = original.name;
  club.short = original.short;
  club.city = original.city;
  (club as { colours: readonly [string, string] }).colours = original.colours;
  delete editor.clubs[club.id];
  delete editor.originals.clubs[club.id];
  return true;
}

export function resetPlayer<T extends NamedPlayer>(editor: EditorState, player: T): boolean {
  const original = editor.originals.players[player.id];
  if (!original) return false;
  player.name = original.name;
  player.age = original.age;
  player.trait = original.trait;
  Object.assign(player.attributes, original.attributes);
  delete editor.players[player.id];
  delete editor.originals.players[player.id];
  return true;
}

/** Undo everything, over whichever clubs and players are handed in. */
export function resetAll(
  editor: EditorState,
  clubs: readonly NamedClub[],
  players: readonly NamedPlayer[]
): void {
  for (const club of clubs) resetClub(editor, club);
  for (const player of players) resetPlayer(editor, player);
  editor.label = 'Eigene Daten';
  editor.touched = false;
}

export function editCount(editor: EditorState): { clubs: number; players: number } {
  return {
    clubs: Object.keys(editor.clubs).length,
    players: Object.keys(editor.players).length
  };
}

/**
 * Write the whole edit set onto whatever clubs and players are handed in.
 *
 * Used by the import path, and by the v1→v2 migration through the module's
 * hook. Idempotent: applying the same set twice leaves the same result, which
 * is what lets it run from a tick without a guard of its own.
 */
export function applyAll(
  editor: EditorState,
  clubs: readonly NamedClub[],
  players: readonly NamedPlayer[]
): { clubs: number; players: number } {
  let c = 0;
  for (const club of clubs) {
    const edit = editor.clubs[club.id];
    if (!edit) continue;
    if (!(club.id in editor.originals.clubs)) {
      editor.originals.clubs[club.id] = {
        name: club.name, short: club.short, city: club.city,
        colours: [club.colours[0], club.colours[1]]
      };
    }
    applyClub(club, edit);
    c++;
  }
  let p = 0;
  for (const player of players) {
    const edit = editor.players[player.id];
    if (!edit) continue;
    if (!(player.id in editor.originals.players)) {
      editor.originals.players[player.id] = {
        name: player.name, attributes: { ...player.attributes },
        age: player.age, trait: player.trait
      };
    }
    applyPlayer(player, edit);
    p++;
  }
  return { clubs: c, players: p };
}

/* ------------------------------------------------------------------ packs -- */

export const PACK_FORMAT = 1;

export interface EditorPack {
  format: number;
  label: string;
  createdAt: number;
  clubs: Record<string, ClubEdit>;
  players: Record<string, PlayerEdit>;
}

/**
 * Export the whole edit set as one object.
 *
 * Crest images are deliberately NOT inlined: a pack with a dozen base64 PNGs is
 * megabytes, and the point of a pack is that it can be pasted into a message.
 * Images live in the asset store and travel separately.
 *
 * The format is unchanged from v1 — a pack was always the set of EDITS, never
 * the resolved values, so packs written before this change still import.
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
 * Bring someone else's pack in, and apply it.
 *
 * Validates entry by entry rather than all-or-nothing: a pack with one bad club
 * should import the other thirteen and say which one it skipped. Refusing the
 * whole file over a single typo is how a sharing feature stops being used.
 *
 * The counts reported are entries ACCEPTED, which is not the same as entries
 * that found a home — a pack may name clubs from a career you are not playing.
 * `applied` says how many actually landed, so the screen can tell the truth
 * rather than claim fourteen edits nobody will ever see.
 */
export function applyPack(
  editor: EditorState,
  clubs: readonly NamedClub[],
  players: readonly NamedPlayer[],
  raw: unknown
): ImportReport & { applied: { clubs: number; players: number } } {
  const rejected: string[] = [];
  const none = { clubs: 0, players: 0 };
  const pack = raw as Partial<EditorPack>;

  if (!pack || typeof pack !== 'object') {
    return { ok: false, clubs: 0, players: 0, rejected, error: 'Keine gültige Datei.', applied: none };
  }
  if (pack.format !== PACK_FORMAT) {
    return {
      ok: false, clubs: 0, players: 0, rejected, applied: none,
      error: `Unbekanntes Format (${String(pack.format)}). Diese Datei stammt aus einer anderen Version.`
    };
  }

  let accepted = 0;
  for (const [id, value] of Object.entries(pack.clubs ?? {})) {
    const parsed = ClubEditSchema.safeParse(value);
    if (parsed.success) { editor.clubs[id] = { ...(editor.clubs[id] ?? {}), ...parsed.data }; accepted++; }
    else rejected.push(`Verein ${id}`);
  }

  let acceptedPlayers = 0;
  for (const [id, value] of Object.entries(pack.players ?? {})) {
    const parsed = PlayerEditSchema.safeParse(value);
    if (parsed.success) { editor.players[id] = { ...(editor.players[id] ?? {}), ...parsed.data }; acceptedPlayers++; }
    else rejected.push(`Spieler ${id}`);
  }

  if (typeof pack.label === 'string' && pack.label.length > 0) editor.label = pack.label;
  editor.touched = accepted + acceptedPlayers > 0;

  const applied = applyAll(editor, clubs, players);
  return { ok: true, clubs: accepted, players: acceptedPlayers, rejected, applied };
}

/** Round-trip guard used by the tests and by the import screen. */
export function isPack(raw: unknown): boolean {
  const pack = raw as Partial<EditorPack>;
  if (!pack || typeof pack !== 'object') return false;
  if (typeof pack.label !== 'string') return false;
  const clubs = pack.clubs ?? {};
  const players = pack.players ?? {};
  return Object.values(clubs).every((c) => ClubEditSchema.safeParse(c).success)
    && Object.values(players).every((p) => PlayerEditSchema.safeParse(p).success);
}
