import type { ZodType } from 'zod';
import type { Rng } from './rng';
import type { GameEvent } from './events';
import type { GameState, ModuleStates } from './state';
import type { DocEntry } from '$lib/docs/registry';

/**
 * Tick phases, run in this order. A feature declares which phase its hook
 * belongs to; it never calls another feature directly. That is the whole
 * decoupling mechanism.
 */
export const PHASES = ['pre', 'sim', 'post', 'economy', 'world'] as const;
export type Phase = (typeof PHASES)[number];

export type TickKind = 'matchday' | 'week' | 'seasonStart' | 'seasonEnd';

/**
 * Something in a department that is waiting on the player.
 *
 * Two urgencies, deliberately, not three. A third level ("idle", "someday")
 * always fills up with things that are not actually waiting, and once every
 * department carries a badge the badges stop meaning anything.
 */
export interface OpenItem {
  /** Stable across renders, so "seen" can be tracked later without guessing. */
  id: string;
  /** `now` blocks or costs you something this week; `soon` is worth a look. */
  urgency: 'now' | 'soon';
  /** The decision, in the player's words. Shown in the drawer, not truncated. */
  label: string;
}

/** Who is running a department instead of the player, if anyone. */
export interface DelegationInfo {
  executiveId: string;
  /** 0..1. An autopilot should act WORSE at low competence, not merely slower. */
  competence: number;
  hiredOnMatchday: number;
}

export interface TickContext {
  /** Live, mutable game state. Rune-backed, so writes are reactive. */
  state: GameState;
  /** Per-module stream, so adding a die roll in one feature can't shift another. */
  rng: Rng;
  /** Report something to the player instead of interrupting them. */
  emit(event: GameEvent): void;
  kind: TickKind;
  /** Ask another module a question without importing it. Returns undefined if absent. */
  query<T>(key: string, fallback: T): T;
  /** Answer a question other modules may ask. Registered for this tick only. */
  provide<T>(key: string, value: T): void;

  /**
   * Contribute a MULTIPLIER to a shared modifier, e.g. `modify('squad.fitnessLoss', 0.7)`.
   *
   * `provide` has exactly one producer per key. Modifiers have many: a fitness
   * coach, an attacking style and a doctrine all want to move the same number,
   * and none of them should have to know the others exist — or fight over who
   * owns the key.
   *
   * Contributions are commutative, so the order among contributors does not
   * matter. Only reader-after-contributor matters, and that is what the
   * registry's provides/consumes check already enforces.
   */
  modify(key: string, factor: number): void;

  /** Contribute an ADDEND to a shared modifier, e.g. `addTo('squad.strength', 2)`. */
  addTo(key: string, amount: number): void;

  /** Read an accumulated multiplier. Returns `base` when nothing contributed. */
  factor(key: string, base?: number): number;

  /** Read an accumulated addend. Returns `base` when nothing contributed. */
  total(key: string, base?: number): number;

  /**
   * Set when this module's `autopilot` is running instead of its normal hook.
   * Undefined during a normal tick.
   *
   * The competence value is the point: a delegated department must still make
   * decisions, and a mediocre executive should make them badly — visible at the
   * balance sheet rather than in a prompt. Otherwise hiring someone is a wage
   * with no trade attached.
   */
  delegation?: DelegationInfo;
}

export interface Hook {
  phase: Phase;
  /** Lower runs first inside the same phase. Default 0. */
  order?: number;

  /**
   * Context keys this hook publishes via `ctx.provide`.
   *
   * Declared so the registry can check the wiring at boot instead of the game
   * failing silently at runtime. See `consumes`.
   */
  provides?: readonly string[];

  /**
   * Modifier keys this hook contributes to via `modify` or `addTo`.
   *
   * Distinct from `provides` because the arity differs: a provided key has one
   * producer, a contributed key has many. Declaring them separately is what
   * lets the registry check that every reader runs after ALL contributors —
   * and stops a contribution being mistaken for a provision.
   *
   * That mistake already happened once: staff declared `provides: ['squad.strength']`
   * while actually calling `addTo`, matchday `provide`d the same key, and the
   * co-trainer's +2 landed in a bucket nobody read. Silent, as always.
   */
  contributes?: readonly string[];

  /**
   * Context keys this hook reads via `ctx.query`, `ctx.factor` or `ctx.total`.
   *
   * `query` returns a FALLBACK when the key has not been provided yet, and a
   * fallback is indistinguishable from a real answer — no error, no event, no
   * log. This shipped: squad published `squad.strength` in `post`, league read
   * it in `sim`, so league always got the fallback and the player's lineup had
   * no effect whatsoever on their own results.
   *
   * Declaring both sides lets `Registry` prove at boot that every consumer runs
   * after its provider, and refuse to start if it does not.
   */
  consumes?: readonly string[];

  run(ctx: TickContext): void;
}

export interface NavEntry {
  group: string;
  icon: string;
  order: number;
  /** Show in the mobile bottom bar (max 4 across the whole game). */
  primary?: boolean;
}

export interface StateSpec<S> {
  schema: ZodType<S>;
  create(rng: Rng): S;
  version: number;
  /** Bring a save written by an older version of THIS module up to date. */
  migrate?(old: unknown, fromVersion: number): S;
}

export interface ModuleDef<Id extends string = string, S = unknown> {
  id: Id;
  title: string;
  /** One line, shown in the manual and the module list. */
  summary: string;
  nav?: NavEntry;
  state: StateSpec<S>;
  /** One hook, or several when a feature acts in more than one phase. */
  hooks?: Partial<Record<TickKind, Hook | Hook[]>>;
  screen?: () => Promise<{ default: unknown }>;
  docs?: Record<string, DocEntry>;
  /** Hard dependencies. Boot fails loudly if one is missing. */
  requires?: readonly string[];
  /**
   * Build-time feature flag. False leaves the module out of the registry
   * entirely, as if the folder did not exist.
   */
  enabled?: () => boolean;

  /**
   * Run-time gate: is this module available to the player *yet*?
   *
   * A locked module keeps its state (so a save is stable across an unlock) but
   * is absent from navigation, unreachable by route, and its hooks do not run —
   * industry must not quietly earn money before the player has unlocked it.
   *
   * The engine never learns what an unlock IS. A module declares its own gate,
   * usually by asking the progression module, so the dependency points from the
   * feature to progression and never the other way.
   *
   * Omitted means always available.
   */
  gate?: (state: GameState) => boolean;

  /**
   * What is waiting on the player in this department, right now.
   *
   * A third arity alongside `provides` and `contributes`: one producer per
   * department, and the consumer is the SHELL rather than another feature. It
   * is how a nav entry earns a badge.
   *
   * The prototype had one table of thirteen closures reaching into every
   * global — `squad.filter(p => p.contracts <= 1)`, `game.money < 0`,
   * `Object.keys(factories)` — a single file that had to know all nineteen
   * departments, and that broke every time one of them changed shape. Inverting
   * it means each feature answers for itself and nothing imports everything.
   *
   * Rules, so that a badge always means the same thing:
   *
   *  - Pure and cheap. It runs on render, not on a tick, and it must not write.
   *  - A LOCKED module is never asked, and a DELEGATED one never answers —
   *    both are enforced by the shell rather than by each module remembering,
   *    because the one that forgets is the bug. That is also what makes hiring
   *    an executive feel like an inbox going quiet.
   *  - Say what the player should DECIDE, not what is true. "3 Spieler
   *    verletzt" is a fact; "Kader unter Mindestbesetzung" is a decision.
   *  - Return nothing when there is nothing. A permanent badge is wallpaper.
   */
  attention?: (state: GameState) => OpenItem[];

  /**
   * What this department does when an executive runs it instead of the player.
   *
   * Hiring an executive is delegation: the module keeps making decisions, but
   * without the player in the loop, and it must also stop asking them things —
   * a delegated department's open items resolve themselves and its mail stops.
   * The player fantasy is not "a number goes up", it is "this inbox went quiet".
   *
   * Declaring it here rather than in a central "AI" module means the people who
   * understand a system write its autopilot, and deleting the feature deletes
   * its autopilot with it. Read `ctx.delegation.competence` to decide how well
   * it is done.
   */
  autopilot?: Hook;
}

/** Identity function that exists purely to pin the generics. */
export function defineModule<Id extends keyof ModuleStates & string>(
  def: ModuleDef<Id, ModuleStates[Id]>
): ModuleDef<Id, ModuleStates[Id]> {
  return def;
}
