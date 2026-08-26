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

/**
 * NOT REGISTERED YET — unreviewed, incomplete.
 *
 * `features/league/` and `features/transfer/` were written by subagents that
 * were cut off partway. Their rules, state, content and docs exist and
 * typecheck; neither has tests, and transfer's screen is a placeholder.
 *
 * They are committed rather than discarded because the work is substantial and
 * the negotiation logic in transfer/rules.ts is the most intricate rule in the
 * game. They stay out of this list until they have been reviewed line by line
 * and have real tests — an unregistered module cannot reach a player, so this
 * costs nothing but keeps the work.
 *
 * To finish either: write rules.test.ts, review the ported formulas against
 * `git show 1e9ae8c:index.html`, then add it above.
 */

