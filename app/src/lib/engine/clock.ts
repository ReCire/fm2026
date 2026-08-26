import type { Registry } from './registry';
import type { TickContext, TickKind } from './module';
import type { GameEvent } from './events';
import type { GameState } from './state';
import { createRng, mixSeed } from './rng';

export interface TickResult {
  kind: TickKind;
  events: GameEvent[];
  /**
   * Module ids whose hook threw. Non-empty means the tick is HALF-APPLIED and
   * the caller must roll back — the engine mutates state in place and has no
   * transaction of its own. See `advance()` in state/game.svelte.ts.
   */
  failed: string[];
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
  const failed: string[] = [];
  const timings: TickResult['timings'] = [];
  const provided = new Map<string, unknown>();

  // Locked modules do not tick. A feature the player has not unlocked must not
  // move money, generate events, or advance its own state behind their back.
  const hooks = registry.hooks(kind).filter(({ module }) => module.gate?.(state) ?? true);

  for (const { module, phase, hook } of hooks) {
    /*
     * A stream per module per tick, derived through a full avalanche mix.
     *
     * The mix matters as much as the inputs: the previous version XOR-ed the
     * seed, a module-id hash and the tick together, which preserved low-bit
     * structure and scattered every module onto one shared PRNG cycle at
     * arbitrary offsets. Streams that were meant to be independent were the
     * same stream a few draws apart — so a die roll added to `merch` could
     * change which player `squad` injured on a particular matchday.
     *
     * At tick 0 the old scheme collapsed to exactly the seed that generated the
     * world, so the first matchday's injuries were a function of how the squad
     * had been rolled. Mixing the tick in rather than adding it removes that.
     */
    const rng = createRng(mixSeed(state.meta.seed, `${module.id}#${kind}#${state.meta.tick}`));

    const ctx: TickContext = {
      state,
      rng,
      kind,
      emit: (e) => events.push(e),
      query: <T>(key: string, fallback: T): T =>
        provided.has(key) ? (provided.get(key) as T) : fallback,
      provide: (key, value) => provided.set(key, value)
    };

    // A delegated department runs its autopilot instead of its normal hook, so
    // the player sees outcomes rather than prompts.
    const delegated = provided.get(`delegated.${module.id}`) === true;
    const toRun = delegated && module.autopilot ? module.autopilot : hook;

    const t0 = performance.now();
    try {
      toRun.run(ctx);
    } catch (err) {
      // Record and keep going so the report can name everything that broke in
      // one pass — but the tick is now half-applied (money may have moved
      // without goods arriving), so `failed` tells the caller to roll back.
      // The engine deliberately does not roll back itself: it has no snapshot,
      // and the state layer already takes one before every tick.
      failed.push(module.id);
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
  // NOTE: wall-clock time is deliberately NOT written here. `lastPlayedAt` is
  // set when a game is saved, not when it is simulated — writing Date.now()
  // into simulated state made two runs of the same seed differ whenever they
  // straddled a millisecond, which quietly turned the reproducibility test
  // flaky. A flaky determinism test gets weakened, and then goal 2 has no guard.
  if (kind === 'matchday') state.meta.matchday += 1;
  if (kind === 'seasonEnd') {
    state.meta.season += 1;
    state.meta.matchday = 1;
  }

  return { kind, events, failed, timings };
}
