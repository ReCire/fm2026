/**
 * The documentation registry.
 *
 * Every interactive control in the game is registered here, once. The visible
 * label, the tooltip, the aria-label and the manual chapter all read from the
 * same entry, so they cannot drift apart. `npm run docs:check` fails the build
 * if a control exists without one — which is the entire reason the docs will
 * still be complete in a year.
 */
export interface DocEntry {
  /** The control's visible label. Components read this, so it is never typed twice. */
  label: string;
  /** One or two sentences. Hover on desktop, an ⓘ bottom sheet on touch. */
  tooltip: string;
  /** Markdown. Becomes a chapter in the generated manual. */
  manual?: string;
  /**
   * Why this mechanic exists and what it models. This is the field that would
   * otherwise only live in someone's head.
   */
  why?: string;
  /** Version the control first shipped in. */
  since?: string;
  /** Other doc ids, rendered as links in the manual and the ⓘ sheet. */
  related?: string[];
  /** Screenshot scenario id — see e2e/scenarios. Captured for the manual. */
  screenshot?: string;
}

/** Identity function; exists so a feature's docs get checked against the type. */
export function defineDocs<T extends Record<string, DocEntry>>(docs: T): T {
  return docs;
}

let lookup: ReadonlyMap<string, DocEntry & { module: string }> = new Map();

export function installDocs(map: ReadonlyMap<string, DocEntry & { module: string }>): void {
  lookup = map;
}

export function doc(id: string): (DocEntry & { module: string }) | undefined {
  return lookup.get(id);
}

/**
 * Resolve a control's label. Falls back loudly rather than silently: an
 * unregistered id renders as `⟨id⟩` so it is obvious in review and in a
 * screenshot, instead of quietly rendering an empty button.
 */
export function docLabel(id: string, override?: string): string {
  if (override) return override;
  return doc(id)?.label ?? `⟨${id}⟩`;
}

export function allDocs(): (DocEntry & { module: string; id: string })[] {
  return [...lookup.entries()].map(([id, entry]) => ({ id, ...entry }));
}
