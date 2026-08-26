import type { Registry } from './registry';
import type { TickContext, TickKind } from './module';
import type { GameEvent } from './events';
import type { GameState } from './state';
import { createRng } from './rng';

export interface TickResult {
  kind: TickKind;
  events: GameEvent[];
  /** Which module produced which events, for the debug overlay. */
  timings: { module: string; phase: string; ms: number }[];
}

/**
 * The tick bus.
 *
 * `processPostMatchRoutine()` in the prototype called `simulateCupRound()`
 * called `applyDoctrineMatchdayTick()` — a chain where every feature had to
 * know the next one. Here, the clock collects hooks from the registry, runs
 * them in phase order, and nobody imports anybody.
 */
export function runTick(
  registry: Registry,
  state: GameState,
  kind: TickKind
): TickResult {
  const events: GameEvent[] = [];
  const timings: TickResult['timings'] = [];
  const provided = new Map<string, unknown>();

  const hooks = registry.hooks(kind);

  for (const { module, phase, hook } of hooks) {
    // Each module gets its own RNG stream, derived from the game seed and the
    // module id. Adding a die roll in `merch` therefore cannot shift the
    // injuries that `squad` rolls on the same matchday.
    const rng = createRng(
      state.meta.seed ^ hashId(module.id) ^ (state.meta.tick * 2654435761),
      0
    );

    const ctx: TickContext = {
      state,
      rng,
      kind,
      emit: (e) => events.push(e),
      query: <T>(key: string, fallback: T): T =>
        provided.has(key) ? (provided.get(key) as T) : fallback,
      provide: (key, value) => provided.set(key, value)
    };

    const t0 = performance.now();
    try {
      hook.run(ctx);
    } catch (err) {
      // One broken feature must not take the whole tick down: report it as an
      // event and carry on, so a save is never left half-advanced.
      events.push({
        source: module.id,
        severity: 'bad',
        title: `Fehler im Modul "${module.title}"`,
        detail: err instanceof Error ? err.message : String(err)
      });
      console.error(`[tick:${kind}] module "${module.id}" threw`, err);
    }
    timings.push({ module: module.id, phase, ms: performance.now() - t0 });
  }

  state.meta.tick += 1;
  state.meta.lastPlayedAt = Date.now();
  if (kind === 'matchday') state.meta.matchday += 1;
  if (kind === 'seasonEnd') {
    state.meta.season += 1;
    state.meta.matchday = 1;
  }

  return { kind, events, timings };
}

function hashId(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
