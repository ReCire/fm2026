import type { ModuleDef } from './engine/module';
import type { DocEntry } from './docs/registry';

/**
 * Attach each feature's screen and docs by discovering them on disk.
 *
 * A feature used to have to hand-wire two lines into its own `module.ts`:
 *
 *     screen: () => import('./Screen.svelte'),
 *     docs: staffDocs,
 *
 * That handoff cost us twice — once shipping a finished screen unreachable with
 * a green build, and once again a week later on the next feature. The wiring
 * check caught both, which proves the information was derivable all along; a
 * check that keeps catching the same omission is telling you the omission
 * should not be possible.
 *
 * The MODULE LIST stays explicit in `modules.ts`. That is deliberate: it is what
 * makes "delete a feature = delete a folder and one line" true, and it is the
 * one place you can read the whole game. Only the per-feature plumbing is
 * discovered, because that is the part with no decision in it.
 */
const SCREENS = import.meta.glob('./features/*/Screen.svelte');
const DOCS = import.meta.glob('./features/*/docs.ts', { eager: true });

const featureOf = (path: string) => path.split('/features/')[1]!.split('/')[0]!;

function screenFor(id: string): ModuleDef['screen'] {
  const entry = Object.entries(SCREENS).find(([path]) => featureOf(path) === id);
  return entry ? (entry[1] as ModuleDef['screen']) : undefined;
}

/**
 * Pull the doc record out of a `docs.ts` namespace.
 *
 * Recognised by SHAPE rather than by a naming convention: every value is
 * checked to look like a `DocEntry`. A convention ("the export must be called
 * xDocs", or "must be the default") is another thing to remember, and the whole
 * point here is to remove something people have to remember.
 *
 * Anything that does not match is ignored rather than half-imported — and the
 * wiring test asserts every `docs.ts` actually contributed, so a file whose
 * shape drifts fails the build loudly instead of going quiet.
 */
function looksLikeDocs(value: unknown): value is Record<string, DocEntry> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const entries = Object.values(value as Record<string, unknown>);
  if (entries.length === 0) return false;
  return entries.every(
    (e) =>
      !!e &&
      typeof e === 'object' &&
      typeof (e as DocEntry).label === 'string' &&
      typeof (e as DocEntry).tooltip === 'string'
  );
}

function docsFor(id: string): Record<string, DocEntry> | undefined {
  const entry = Object.entries(DOCS).find(([path]) => featureOf(path) === id);
  if (!entry) return undefined;
  const found = Object.values(entry[1] as Record<string, unknown>).find(looksLikeDocs);
  return found as Record<string, DocEntry> | undefined;
}

/**
 * Fill in what a module did not declare. An explicit `screen` or `docs` on the
 * manifest always wins — discovery is a default, not an override, so a module
 * that needs something unusual can still say so.
 */
export function withDiscovered(modules: readonly ModuleDef[]): readonly ModuleDef[] {
  return modules.map((m) => {
    const screen = m.screen ?? screenFor(m.id);
    const declared = Object.keys(m.docs ?? {}).length > 0;
    const docs = declared ? m.docs : (docsFor(m.id) ?? m.docs);
    return screen === m.screen && docs === m.docs ? m : { ...m, screen, docs };
  });
}
