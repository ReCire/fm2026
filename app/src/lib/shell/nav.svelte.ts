import { registry, game } from '$lib/state/game.svelte';
import { isUnlocked, markSeen, unseen } from '$lib/features/progression/rules';
import type { ModuleDef } from '$lib/engine/module';

/**
 * What the shell should show, as data.
 *
 * `+layout.svelte` is presentation and belongs to design; WHICH modules appear,
 * whether they are reachable, and what counts as new are decisions about game
 * state and belong here. Extracting them makes the seam physical instead of a
 * convention about which half of one file you may edit — the same reason
 * `rules.ts` and `content.ts` are separate files rather than two sections.
 */
export interface NavEntry {
  id: string;
  title: string;
  icon: string;
  group: string;
  /** Opened but not yet visited — drives the "new" affordance. */
  isNew: boolean;
}

export interface NavGroup {
  group: string;
  items: NavEntry[];
}

function visible(): ModuleDef[] {
  return registry.all.filter((m) => {
    if (!m.nav) return false;
    // A locked module is ABSENT, not disabled. A department the player cannot
    // open must not advertise itself either.
    return m.gate ? m.gate(game) : true;
  });
}

function toEntry(m: ModuleDef, fresh: string[]): NavEntry {
  return {
    id: m.id,
    title: m.title,
    icon: m.nav?.icon ?? '',
    group: m.nav?.group ?? '',
    isNew: fresh.includes(m.id)
  };
}

/** Grouped and ordered, for the sidebar. */
export function navGroups(): NavGroup[] {
  const fresh = game.modules.progression ? unseen(game.modules.progression) : [];
  const groups = new Map<string, NavEntry[]>();
  for (const m of visible()) {
    const list = groups.get(m.nav!.group) ?? [];
    list.push(toEntry(m, fresh));
    groups.set(m.nav!.group, list);
  }
  return [...groups.entries()].map(([group, items]) => ({ group, items }));
}

/**
 * The modules pinned to the bottom bar.
 *
 * Capped, because a tab bar that scrolls is not a tab bar. Anything past the
 * cap is reachable through the drawer, so nothing becomes unreachable — it
 * just stops competing for the thumb.
 */
export const TAB_BAR_MAX = 4;

export function primaryNav(): NavEntry[] {
  const fresh = game.modules.progression ? unseen(game.modules.progression) : [];
  return visible()
    .filter((m) => m.nav?.primary)
    .sort((a, b) => (a.nav!.order ?? 0) - (b.nav!.order ?? 0))
    .slice(0, TAB_BAR_MAX)
    .map((m) => toEntry(m, fresh));
}

/** Is this route reachable right now? Guards deep links and stale bookmarks. */
export function isReachable(moduleId: string): boolean {
  const m = registry.byId.get(moduleId);
  if (!m) return false;
  return m.gate ? m.gate(game) : true;
}

/** Called when a screen is opened, so its "new" mark clears. */
export function visit(moduleId: string): void {
  if (game.modules.progression) markSeen(game.modules.progression, moduleId);
}

export { isUnlocked };
