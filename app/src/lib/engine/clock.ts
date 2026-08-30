import type { Registry } from './registry';
import type { DelegationInfo, TickContext, TickKind } from './module';
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
export interface TickOptions {
  /**
   * How to find out whether a department has been handed to an executive.
   *
   * Supplied by the caller rather than read from state directly, so the engine
   * never learns that a `progression` module exists — the same reason `gate`
   * lives on the module rather than in here.
   */
  delegationFor?: (moduleId: string) => DelegationInfo | undefined;
}

export function runTick(
  registry: Registry,
  state: GameState,
  kind: TickKind,
  options: TickOptions = {}
): TickResult {
  const events: GameEvent[] = [];
  const failed: string[] = [];
  const timings: TickResult['timings'] = [];
  const provided = new Map<string, unknown>();
  // Shared modifiers. Many contributors, one accumulated value — see
  // TickContext.modify. Separate from `provided` because the arity differs:
  // provide is one producer, modify is many.
  const factors = new Map<string, number>();
  const totals = new Map<string, number>();

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
      /*
       * A key must be DECLARED to be written.
       *
       * `assertContextWiring` orders consumers after producers by reading the
       * `provides` and `contributes` arrays — so a hook that calls
       * `provide('stadium.attendance', …)` without listing it leaves the
       * registry unable to see the producer at all. The value still arrived,
       * quietly, in whatever order the hooks happened to run; and any module
       * that then declared it honestly in `consumes` made the registry throw at
       * boot, because as far as the check could tell nobody produced it. The
       * only way to read the crowd was to cheat.
       *
       * That was live for months and was found by accident. Throwing here makes
       * the declaration load-bearing instead of documentation: the tick fails,
       * the caller rolls it back, and the message names the fix.
       */
      provide: (key, value) => {
        assertDeclared(module.id, hook.provides, key, 'provides');
        provided.set(key, value);
      },
      modify: (key, f) => {
        assertDeclared(module.id, hook.contributes, key, 'contributes');
        factors.set(key, (factors.get(key) ?? 1) * f);
      },
      addTo: (key, a) => {
        assertDeclared(module.id, hook.contributes, key, 'contributes');
        totals.set(key, (totals.get(key) ?? 0) + a);
      },
      factor: (key, base = 1) => (factors.has(key) ? factors.get(key)! : base),
      total: (key, base = 0) => (totals.has(key) ? totals.get(key)! : base)
    };

    // A delegated department runs its autopilot instead of its normal hook, so
    // the player sees outcomes rather than prompts.
    const delegation = options.delegationFor?.(module.id);
    const toRun = delegation && module.autopilot ? module.autopilot : hook;
    if (delegation && module.autopilot) ctx.delegation = delegation;

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

function assertDeclared(
  moduleId: string,
  declared: readonly string[] | undefined,
  key: string,
  field: 'provides' | 'contributes'
): void {
  if (declared?.includes(key)) return;
  throw new Error(
    `Module "${moduleId}" wrote "${key}" without declaring it. ` +
    `Add "${key}" to this hook's \`${field}\` array — the registry orders ` +
    `consumers after producers by reading it, and cannot see an undeclared one.`
  );
}

/**
 * What the `pre` phase WOULD publish, without committing anything.
 *
 * The context bus lives for exactly one tick, so a screen that wants to show
 * the player how strong their side will be on Saturday cannot read it — and
 * every screen that tried instead recomputed a subset by hand. The matchday
 * screen showed 60 while the match itself used 62, because the screen summed
 * the squad and the tactics and knew nothing about the doctrine node the player
 * had just bought. Two surfaces, two answers, and the one on screen was the one
 * the player believed.
 *
 * This runs the real hooks over a THROWAWAY COPY of the state and returns what
 * they wrote. It cannot drift from the tick, because it is the tick — the same
 * hooks in the same order, discarded instead of kept.
 *
 * `pre` only: it is the phase where strength, modifiers and costs are assembled,
 * and stopping there means nothing is simulated, no money moves and no RNG
 * stream is consumed for real.
 */
export interface Preview {
  provided: ReadonlyMap<string, unknown>;
  factors: ReadonlyMap<string, number>;
  totals: ReadonlyMap<string, number>;
}

export function previewPre(registry: Registry, state: GameState, kind: TickKind = 'matchday'): Preview {
  const provided = new Map<string, unknown>();
  const factors = new Map<string, number>();
  const totals = new Map<string, number>();

  /*
   * A deep copy, so a `pre` hook that writes (matchday fills an empty lineup)
   * cannot touch the live game from a render.
   *
   * Through JSON rather than `structuredClone`, which throws `DataCloneError`
   * on a Svelte rune proxy — the live game IS one. The unit tests passed
   * because they build plain objects; the browser threw on first render. Game
   * state is already required to survive a JSON round trip, because that is how
   * it is saved, so this borrows an invariant rather than adding one.
   */
  const scratch: GameState = JSON.parse(
    JSON.stringify({ meta: state.meta, modules: state.modules })
  ) as GameState;

  const hooks = registry
    .hooks(kind)
    .filter(({ module, phase }) => phase === 'pre' && (module.gate?.(state) ?? true));

  for (const { module, hook } of hooks) {
    const rng = createRng(mixSeed(scratch.meta.seed, `${module.id}#${kind}#${scratch.meta.tick}`));
    try {
      hook.run({
        state: scratch,
        rng,
        kind,
        emit: () => {},
        query: <T>(key: string, fallback: T): T =>
          provided.has(key) ? (provided.get(key) as T) : fallback,
        provide: (key, value) => provided.set(key, value),
        modify: (key, f) => factors.set(key, (factors.get(key) ?? 1) * f),
        addTo: (key, a) => totals.set(key, (totals.get(key) ?? 0) + a),
        factor: (key, base = 1) => (factors.has(key) ? factors.get(key)! : base),
        total: (key, base = 0) => (totals.has(key) ? totals.get(key)! : base)
      });
    } catch {
      // A preview must never break a screen. The real tick will report it.
    }
  }

  return { provided, factors, totals };
}
