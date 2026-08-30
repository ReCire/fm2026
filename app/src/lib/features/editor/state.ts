import { z } from 'zod';
import type { Rng } from '$lib/engine/rng';
import { AttributesSchema } from '../squad/attributes';

/**
 * The team editor.
 *
 * The magic of the old managers was never the fake names — it was that you
 * could go in and fix them. Rename the hocus-pocus clubs to what they are
 * actually called, drop in a real crest, rename the squad, and build one player
 * with 99 in everything. The game shipped safe and the player made it theirs.
 *
 * ## Why edits are applied, not resolved
 *
 * This was a read-time override layer: shipped values stayed untouched and
 * every reader called `resolveClub` / `resolvePlayer` to see the edit. It was
 * elegant and it did not work. `resolvePlayer` ended up called in exactly one
 * place — the editor's own screen — so a renamed player was renamed in the
 * editor and nowhere else in the game. The league table, the single most-read
 * screen, printed raw club names for the same reason. The player renamed their
 * club, went to the table, and saw the old name.
 *
 * That is the eleventh time this codebase has shipped something complete,
 * correct and connected to nothing, and the first ten were fixed by wiring the
 * missing call. Doing that again here means every future screen must remember
 * a call that ten out of eleven screens already forgot.
 *
 * So the layer is gone. An edit is written straight onto the club or the
 * player, which are SAVE data — copied out of content when the career begins,
 * never read from the repo again. What the override layer actually protected is
 * kept:
 *
 *   - we still ship no real names, crests or people: the edits live in the
 *     player's save and never in the repository;
 *   - an edit can still be undone, because `originals` keeps what a field held
 *     before it was first touched;
 *   - the edit set is still one serialisable object, so it still exports as a
 *     pack and someone else can still import it.
 *
 * What is gone is the requirement that everybody remember.
 */
export const ClubEditSchema = z.object({
  name: z.string().max(48).optional(),
  short: z.string().max(4).optional(),
  city: z.string().max(48).optional(),
  colours: z.tuple([z.string(), z.string()]).optional(),
  /** Asset id for an uploaded crest, resolved against the asset store. */
  crestAssetId: z.string().optional()
});
export type ClubEdit = z.infer<typeof ClubEditSchema>;

export const PlayerEditSchema = z.object({
  name: z.string().max(48).optional(),
  attributes: AttributesSchema.partial().optional(),
  age: z.number().int().min(15).max(45).optional(),
  trait: z.string().max(32).optional()
});
export type PlayerEdit = z.infer<typeof PlayerEditSchema>;

/**
 * What a field held before the player first touched it.
 *
 * Captured once, on the first edit, and never overwritten afterwards — so
 * "reset" restores the shipped value rather than the previous edit, however
 * many times the name has been changed since.
 */
export const ClubOriginalSchema = z.object({
  name: z.string(),
  short: z.string(),
  city: z.string(),
  colours: z.tuple([z.string(), z.string()])
});

export const PlayerOriginalSchema = z.object({
  name: z.string(),
  attributes: AttributesSchema,
  age: z.number().int(),
  trait: z.string()
});

export const EditorSchema = z.object({
  /** Human name for this edit set, shown when exporting. */
  label: z.string().max(64),
  clubs: z.record(z.string(), ClubEditSchema),
  players: z.record(z.string(), PlayerEditSchema),
  originals: z.object({
    clubs: z.record(z.string(), ClubOriginalSchema),
    players: z.record(z.string(), PlayerOriginalSchema)
  }),
  /**
   * Set by the v1→v2 migration. A v1 save holds edits that were never applied
   * to anything, and a migration cannot reach the league or the squad to apply
   * them — so the editor's own hook does it on the next tick and clears this.
   */
  pendingApply: z.boolean(),
  /** True once the player has edited anything, so the UI can offer an export. */
  touched: z.boolean()
});
export type EditorState = z.infer<typeof EditorSchema>;

declare module '$lib/engine/state' {
  interface ModuleStates {
    editor: EditorState;
  }
}

export function createEditor(_rng: Rng): EditorState {
  return {
    label: 'Eigene Daten',
    clubs: {},
    players: {},
    originals: { clubs: {}, players: {} },
    pendingApply: false,
    touched: false
  };
}

/** v2: edits are applied to the club and the player instead of resolved. */
export const EDITOR_VERSION = 2;

export function migrateEditor(old: unknown, _from: number): EditorState {
  const base = (old ?? {}) as Partial<EditorState>;
  const clubs = base.clubs ?? {};
  const players = base.players ?? {};
  return {
    label: base.label ?? 'Eigene Daten',
    clubs,
    players,
    originals: base.originals ?? { clubs: {}, players: {} },
    // A v1 edit set was never written onto anything. Apply it on the next tick
    // rather than lose the player's work.
    pendingApply: Object.keys(clubs).length + Object.keys(players).length > 0,
    touched: base.touched ?? false
  };
}
