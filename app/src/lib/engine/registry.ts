import type { Hook, ModuleDef, Phase, TickKind } from './module';
import { PHASES } from './module';
import type { DocEntry } from '$lib/docs/registry';

/**
 * Holds the module list and answers every "what modules do X" question.
 * Built once at boot from src/lib/modules.ts.
 */
export class Registry {
  readonly all: readonly ModuleDef[];
  readonly byId: ReadonlyMap<string, ModuleDef>;

  constructor(defs: readonly ModuleDef[]) {
    const enabled = defs.filter((d) => (d.enabled ? d.enabled() : true));

    const seen = new Set<string>();
    for (const d of enabled) {
      if (seen.has(d.id)) throw new Error(`Duplicate module id: "${d.id}"`);
      seen.add(d.id);
    }
    for (const d of enabled) {
      for (const need of d.requires ?? []) {
        if (!seen.has(need)) {
          throw new Error(
            `Module "${d.id}" requires "${need}", which is missing or disabled.`
          );
        }
      }
    }

    this.all = enabled;
    this.byId = new Map(enabled.map((d) => [d.id, d]));

    this.assertContextWiring();
  }

  /**
   * Every consumed context key must be provided by a hook that runs EARLIER in
   * the same tick.
   *
   * Without this the failure is silent: `ctx.query` hands back the caller's
   * fallback, which is indistinguishable from a real answer. The bug that
   * prompted this check made the player's lineup irrelevant to their own match
   * results for the entire life of the module, with nothing in the logs.
   */
  private assertContextWiring(): void {
    for (const kind of ['matchday', 'week', 'seasonStart', 'seasonEnd'] as const) {
      const ordered = this.hooks(kind);

      ordered.forEach((entry, index) => {
        for (const key of entry.hook.consumes ?? []) {
          const supplies = (h: Hook) =>
            (h.provides ?? []).includes(key) || (h.contributes ?? []).includes(key);

          // Every contributor must run before the reader, not just one of them:
          // a reader placed between two contributors silently sees half the
          // value, which is worse than seeing none because it looks plausible.
          const laterSupplier = ordered
            .slice(index + 1)
            .find((later) => supplies(later.hook));
          if (!laterSupplier && ordered.slice(0, index).some((e) => supplies(e.hook))) continue;

          const producedLater = laterSupplier;

          throw new Error(
            producedLater
              ? `Context key "${key}" is consumed by "${entry.module.id}" ` +
                `(${entry.phase}/${entry.hook.order ?? 0}) but provided by ` +
                `"${producedLater.module.id}" (${producedLater.phase}/` +
                `${producedLater.hook.order ?? 0}), which runs LATER on "${kind}". ` +
                `The consumer would silently receive its fallback. ` +
                `Move the provider earlier, or the consumer later.`
              : `Context key "${key}" is consumed by "${entry.module.id}" on ` +
                `"${kind}" but no enabled module declares that it provides it.`
          );
        }
      });
    }
  }

  /** Nav entries, grouped and ordered, for the sidebar. */
  nav(): { group: string; items: ModuleDef[] }[] {
    const groups = new Map<string, ModuleDef[]>();
    for (const d of this.all) {
      if (!d.nav) continue;
      const list = groups.get(d.nav.group) ?? [];
      list.push(d);
      groups.set(d.nav.group, list);
    }
    return [...groups.entries()].map(([group, items]) => ({
      group,
      items: items.sort((a, b) => (a.nav!.order ?? 0) - (b.nav!.order ?? 0))
    }));
  }

  /** The (max four) modules pinned to the mobile bottom bar. */
  primaryNav(): ModuleDef[] {
    return this.all
      .filter((d) => d.nav?.primary)
      .sort((a, b) => (a.nav!.order ?? 0) - (b.nav!.order ?? 0));
  }

  /** Hooks for one tick kind, flattened and already sorted into phase order. */
  hooks(kind: TickKind): { module: ModuleDef; phase: Phase; hook: Hook }[] {
    const out: { module: ModuleDef; phase: Phase; order: number; hook: Hook }[] = [];
    for (const m of this.all) {
      const declared = m.hooks?.[kind];
      if (!declared) continue;
      for (const hook of Array.isArray(declared) ? declared : [declared]) {
        out.push({ module: m, phase: hook.phase, order: hook.order ?? 0, hook });
      }
    }
    return out
      .sort((a, b) => {
        const p = PHASES.indexOf(a.phase) - PHASES.indexOf(b.phase);
        return p !== 0 ? p : a.order - b.order;
      })
      .map(({ module, phase, hook }) => ({ module, phase, hook }));
  }

  /** Every documented control in the game, flattened. */
  docs(): Map<string, DocEntry & { module: string }> {
    const out = new Map<string, DocEntry & { module: string }>();
    for (const m of this.all) {
      for (const [id, entry] of Object.entries(m.docs ?? {})) {
        if (out.has(id)) throw new Error(`Duplicate doc id "${id}" (module "${m.id}")`);
        out.set(id, { ...entry, module: m.id });
      }
    }
    return out;
  }
}
