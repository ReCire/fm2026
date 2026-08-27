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
