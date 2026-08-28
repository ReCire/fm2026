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
 * So this is an OVERRIDE layer, never a replacement. Shipped content stays
 * exactly as designed; the player's edits sit on top and are resolved at read
 * time. Three consequences that matter:
 *
 *   - we ship no real names, crests or people, ever;
 *   - an edit can always be undone, because the original was never overwritten;
 *   - the whole edit set is one serialisable object, so it exports as a file
 *     and someone else can import it. That is how these communities worked.
 */
export const ClubOverrideSchema = z.object({
  name: z.string().max(48).optional(),
  short: z.string().max(4).optional(),
  city: z.string().max(48).optional(),
  colours: z.tuple([z.string(), z.string()]).optional(),
  /** Asset id for an uploaded crest, resolved against the asset store. */
  crestAssetId: z.string().optional()
});
export type ClubOverride = z.infer<typeof ClubOverrideSchema>;

export const PlayerOverrideSchema = z.object({
  name: z.string().max(48).optional(),
  attributes: AttributesSchema.partial().optional(),
  age: z.number().int().min(15).max(45).optional(),
  trait: z.string().max(32).optional()
});
export type PlayerOverride = z.infer<typeof PlayerOverrideSchema>;

export const EditorSchema = z.object({
  /** Human name for this edit set, shown when exporting. */
  label: z.string().max(64),
  clubs: z.record(z.string(), ClubOverrideSchema),
  players: z.record(z.string(), PlayerOverrideSchema),
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
  return { label: 'Eigene Daten', clubs: {}, players: {}, touched: false };
}

export const EDITOR_VERSION = 1;
