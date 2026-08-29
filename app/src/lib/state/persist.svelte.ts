import { browser } from '$app/environment';
import { registry, game, replaceGame } from './game.svelte';
import { serialise, deserialise, writeSlot, readSlot, type SaveFile } from '$lib/engine/save';
import { createRng } from '$lib/engine/rng';

/**
 * Saving. Wired to the boot path, which it never was.
 *
 * `save.ts` was written months ago, tested thoroughly, and called by nothing.
 * The adversarial review flagged it — "the entire IndexedDB layer is dead code"
 * — and I recorded the finding and did not act on it. The consequence is the
 * one a player actually feels: a page reload took a career from matchday 5 back
 * to matchday 1, and on a phone, switching apps and coming back would do the
 * same. Nothing you did survived, which is the strongest possible version of
 * "interacting has no consequence".
 *
 * Autosave is deliberately per-TICK rather than per-action: a tick is the unit
 * the game already treats as a commit, and writing on every attribute drag
 * would put IndexedDB in the way of a slider.
 */
const AUTOSAVE = 'autosave';

export const saveStatus = $state<{
  loaded: boolean;
  savedAt: number | null;
  notes: string[];
  error: string | null;
}>({ loaded: false, savedAt: null, notes: [], error: null });

/** Write the current game. Failures are surfaced, never swallowed silently. */
export async function save(slot = AUTOSAVE): Promise<boolean> {
  if (!browser) return false;
  try {
    const file = serialise(registry, game, slot);
    await writeSlot(slot, file);
    saveStatus.savedAt = file.savedAt;
    saveStatus.error = null;
    return true;
  } catch (err) {
    // A failed write must not be silent: on iOS a quota rejection here is the
    // difference between "my career is safe" and "my career is not".
    saveStatus.error = err instanceof Error ? err.message : 'Speichern fehlgeschlagen.';
    return false;
  }
}

/**
 * Load a save if one exists. Returns false when there is nothing to load,
 * which is a normal outcome on a first visit rather than an error.
 */
export async function load(slot = AUTOSAVE): Promise<boolean> {
  if (!browser) return false;
  try {
    const file = (await readSlot(slot)) as SaveFile | undefined;
    if (!file) return false;

    const report = deserialise(registry, file, () => createRng(file.meta.seed));
    replaceGame(report.state);
    saveStatus.loaded = true;
    saveStatus.savedAt = file.savedAt;
    // Per-module resets are reported rather than hidden — a career that lost a
    // department to a migration should say so, not quietly continue.
    saveStatus.notes = report.notes;
    return true;
  } catch (err) {
    saveStatus.error = err instanceof Error ? err.message : 'Spielstand konnte nicht geladen werden.';
    return false;
  }
}

export async function hasSave(slot = AUTOSAVE): Promise<boolean> {
  if (!browser) return false;
  try {
    return (await readSlot(slot)) !== undefined;
  } catch {
    return false;
  }
}
