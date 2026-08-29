/**
 * The module registry — the entire game, listed.
 *
 * This is the ONLY place a feature is referenced globally. Adding a feature is
 * one folder and one line here; deleting one is the same in reverse, and the
 * nav entry, save slice, tick hooks, docs and Studio panel all go with it.
 */
import type { ModuleDef } from './engine/module';
import { withDiscovered } from './discover';

import core from './features/core/module';
import editor from './features/editor/module';
import onboarding from './features/onboarding/module';
import progression from './features/progression/module';
import finance from './features/finance/module';
import league from './features/league/module';
import matchday from './features/matchday/module';
import squad from './features/squad/module';
import transfer from './features/transfer/module';
import stadium from './features/stadium/module';
import staff from './features/staff/module';
import calendar from './features/calendar/module';
import history from './features/history/module';

const declared: readonly ModuleDef[] = [
  core,
  onboarding,
  progression,
  finance,
  squad,
  stadium,
  league,
  matchday,
  calendar,
  transfer,
  staff,
  history,
  editor
];

/*
 * Each feature's `Screen.svelte` and `docs.ts` are attached by discovery — see
 * discover.ts. The list above stays hand-written because it is the one place
 * you can read the whole game, and because deleting a line here is what makes
 * deleting a feature a two-step operation rather than an archaeology exercise.
 */
export const modules = withDiscovered(declared);
