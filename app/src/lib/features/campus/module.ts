import { defineModule } from '$lib/engine/module';
import { CampusSchema, createCampus, CAMPUS_VERSION } from './state';

export default defineModule({
  id: 'campus',
  title: 'Gelände',
  summary: 'Das Vereinsgelände: was steht, was noch Wiese ist, und was das Nächste kostet.',
  nav: { group: 'Verein', icon: '🏗️', order: 40 },
  requires: ['finance'],

  state: { schema: CampusSchema, create: createCampus, version: CAMPUS_VERSION },

  /*
   * No hooks. Building is something the player does on a screen, and a
   * building's ONGOING effect belongs to the module it feeds — a youth academy
   * building makes youth better, and youth is the module that should read it,
   * not this one. That keeps campus a place rather than a second economy
   * running in parallel with the one it is supposed to be feeding.
   *
   * Which also means: a building whose `module` is not in the game cannot be
   * bought. `canBuild` refuses it, for the same reason a dormant doctrine node
   * is not for sale.
   *
   * And no `attention` either. The first version badged an empty campus — but
   * an empty campus is simply what a fourth-division club looks like, so the
   * badge would have been lit for several seasons before the player could
   * afford to change it. That is the same mistake as "you could afford an
   * expansion": true, permanent, and a nudge to spend rather than something
   * waiting on a decision. A department with things to LOOK at and nothing
   * WAITING gets no badge. fussballmanager-15's coverage test caught it, by
   * asserting every department is silent until provoked.
   */
});
