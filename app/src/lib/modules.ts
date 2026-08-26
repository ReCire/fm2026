/**
 * The module registry — the entire game, listed.
 *
 * This is the ONLY place a feature is referenced globally. Adding a feature is
 * one folder and one line here; deleting one is the same in reverse, and the
 * nav entry, save slice, tick hooks, docs and Studio panel all go with it.
 */
import type { ModuleDef } from './engine/module';

import core from './features/core/module';
import finance from './features/finance/module';
import squad from './features/squad/module';
import stadium from './features/stadium/module';

export const modules: readonly ModuleDef[] = [
  core,
  finance,
  squad,
  stadium
];
