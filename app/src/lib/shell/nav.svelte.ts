import { registry, game } from '$lib/state/game.svelte';
import { isUnlocked, isDelegated, markSeen, unseen } from '$lib/features/progression/rules';
import type { ModuleDef, OpenItem } from '$lib/engine/module';

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
  /** What is waiting on the player in there. Empty when nothing is. */
  open: OpenItem[];
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
    isNew: fresh.includes(m.id),
    open: attentionFor(m)
  };
}

/**
 * What one department is waiting on, filtered by the two rules every module
 * would otherwise have to remember.
 *
 * Enforced HERE rather than inside each `attention()` because the one that
 * forgets is the bug — and a locked department that badges itself, or a
 * delegated one that keeps nagging, are both exactly the wrong signal. An
 * executive taking over should feel like an inbox going quiet.
 */
export function attentionFor(m: ModuleDef): OpenItem[] {
  if (!m.attention) return [];
  if (m.gate && !m.gate(game)) return [];
  if (isCovered(m)) return [];
  try {
    return m.attention(game);
  } catch (err) {
    // A badge is not worth a white screen. Report and carry on.
    console.error(`[attention] module "${m.id}" threw`, err);
    return [];
  }
}

/**
 * What a department has waiting, INCLUDING what an executive is covering.
 *
 * `attentionFor` returns nothing for a delegated department, which is right for
 * a badge — hiring someone should make the inbox go quiet. But it made those
 * items invisible to everything, including the screen whose whole job is to
 * show the player what the wage bought. "Three things you no longer have to
 * think about" is the proof; a department that merely goes silent is
 * indistinguishable from a department with nothing to do.
 *
 * So the filter stays where it is and this reports around it. `delegated` says
 * which of the two you are looking at.
 */
/**
 * Is somebody else actually doing this job?
 *
 * Delegation ALONE is not enough, and the difference is the whole safety of the
 * feature. `runTick` falls back to the normal hook when a delegated module has
 * no `autopilot`, so the department keeps ticking — but many of its decisions
 * are the player's, taken on its screen: accepting a bid, renewing a contract.
 * Silencing it on delegation alone therefore removes the player and replaces
 * them with nothing. Offers expire unanswered, contracts lapse, and it looks
 * exactly like the feature working.
 *
 * So a department goes quiet only when there is something to go quiet FOR.
 * `linkedout` already refuses to sell a role whose module has no autopilot;
 * this is the same rule enforced one layer lower, where a save carrying a hire
 * from before the autopilot existed cannot slip past it.
 */
function isCovered(m: ModuleDef): boolean {
  if (!m.autopilot) return false;
  return !!game.modules.progression && isDelegated(game, m.id);
}

export function attentionDetail(m: ModuleDef): { items: OpenItem[]; delegated: boolean; locked: boolean } {
  const locked = !!m.gate && !m.gate(game);
  const delegated = isCovered(m);
  if (!m.attention || locked) return { items: [], delegated, locked };
  try {
    return { items: m.attention(game), delegated, locked };
  } catch (err) {
    console.error(`[attention] module "${m.id}" threw`, err);
    return { items: [], delegated, locked };
  }
}

/** What executives are covering right now, by department. For LinkedOut. */
export function handledByExecutives(): { moduleId: string; title: string; items: OpenItem[] }[] {
  return registry.all
    .map((m) => ({ module: m, detail: attentionDetail(m) }))
    .filter(({ detail }) => detail.delegated && detail.items.length > 0)
    .map(({ module, detail }) => ({ moduleId: module.id, title: module.title, items: detail.items }));
}

/** Everything waiting on the player, most urgent first. For a summary surface. */
export function allAttention(): { moduleId: string; title: string; item: OpenItem }[] {
  const rows: { moduleId: string; title: string; item: OpenItem }[] = [];
  for (const m of visible()) {
    for (const item of attentionFor(m)) rows.push({ moduleId: m.id, title: m.title, item });
  }
  return rows.sort((a, b) => (a.item.urgency === b.item.urgency ? 0 : a.item.urgency === 'now' ? -1 : 1));
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
