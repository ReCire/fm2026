import { get, set, del, keys } from 'idb-keyval';
import type { Registry } from './registry';
import type { GameState } from './state';

/**
 * Saves live in IndexedDB, not localStorage.
 *
 * iOS evicts localStorage under storage pressure, which for a manager game
 * means losing a season. IndexedDB is not evicted the same way, and it has room
 * for several slots plus an autosave.
 */
const SAVE_PREFIX = 'anstoss:save:';
const FORMAT_VERSION = 1;

export interface SaveFile {
  format: number;
  savedAt: number;
  label: string;
  meta: GameState['meta'];
  /** Per module: its own version number and its own data. */
  modules: Record<string, { v: number; data: unknown }>;
}

export function serialise(registry: Registry, state: GameState, label: string): SaveFile {
  const modules: SaveFile['modules'] = {};
  for (const m of registry.all) {
    const data = (state.modules as unknown as Record<string, unknown>)[m.id];
    if (data !== undefined) modules[m.id] = { v: m.state.version, data: snapshot(data) };
  }
  return { format: FORMAT_VERSION, savedAt: Date.now(), label, meta: snapshot(state.meta), modules };
}

export interface LoadReport {
  state: GameState;
  /** Modules whose data was missing, outdated or invalid — surfaced, never silent. */
  notes: string[];
}

/**
 * Rebuild game state from a save file.
 *
 * Every module validates and migrates its OWN slice. A save written before a
 * feature existed simply gets that feature's fresh initial state, and a save
 * written before a feature changed shape runs that feature's `migrate`. Neither
 * case requires a global migration function, which is the thing that becomes
 * unmaintainable in a game that ships for years.
 */
export function deserialise(registry: Registry, file: SaveFile, freshRng: () => any): LoadReport {
  const notes: string[] = [];
  const modules: Record<string, unknown> = {};

  for (const m of registry.all) {
    const stored = file.modules[m.id];

    if (!stored) {
      modules[m.id] = m.state.create(freshRng());
      notes.push(`"${m.title}": nicht im Spielstand enthalten — neu angelegt.`);
      continue;
    }

    let data = stored.data;
    if (stored.v !== m.state.version) {
      if (m.state.migrate) {
        try {
          data = m.state.migrate(data, stored.v);
          notes.push(`"${m.title}": von v${stored.v} auf v${m.state.version} migriert.`);
        } catch (err) {
          modules[m.id] = m.state.create(freshRng());
          notes.push(`"${m.title}": Migration fehlgeschlagen — zurückgesetzt.`);
          continue;
        }
      } else {
        modules[m.id] = m.state.create(freshRng());
        notes.push(`"${m.title}": v${stored.v} ohne Migration — zurückgesetzt.`);
        continue;
      }
    }

    const parsed = m.state.schema.safeParse(data);
    if (parsed.success) {
      modules[m.id] = parsed.data;
    } else {
      modules[m.id] = m.state.create(freshRng());
      notes.push(`"${m.title}": Daten ungültig — zurückgesetzt.`);
    }
  }

  return { state: { meta: file.meta, modules: modules as unknown as GameState['modules'] }, notes };
}

export async function writeSlot(slot: string, file: SaveFile): Promise<void> {
  await set(SAVE_PREFIX + slot, file);
}

export async function readSlot(slot: string): Promise<SaveFile | undefined> {
  return (await get(SAVE_PREFIX + slot)) as SaveFile | undefined;
}

export async function deleteSlot(slot: string): Promise<void> {
  await del(SAVE_PREFIX + slot);
}

export async function listSlots(): Promise<string[]> {
  const all = (await keys()) as string[];
  return all.filter((k) => typeof k === 'string' && k.startsWith(SAVE_PREFIX))
            .map((k) => k.slice(SAVE_PREFIX.length));
}

/** Export to a file the player can keep or send you with a bug report. */
export function toJson(file: SaveFile): string {
  return JSON.stringify(file, null, 2);
}

export function fromJson(text: string): SaveFile {
  const parsed = JSON.parse(text) as SaveFile;
  if (parsed.format !== FORMAT_VERSION) {
    throw new Error(`Unbekanntes Speicherformat: ${parsed.format}`);
  }
  return parsed;
}

/** Works with plain objects and with Svelte's $state proxies. */
function snapshot<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
