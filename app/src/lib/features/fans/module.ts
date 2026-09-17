import { defineModule } from '$lib/engine/module';
import { FansSchema, createFans, FANS_VERSION } from './state';
import { applyResult, groupDef, safetyOf, unhappy } from './rules';
import { gatedBy } from '../progression/rules';

export default defineModule({
  id: 'fans',
  title: 'Fans',
  summary:
    'Vier Fangruppen mit eigener Stimmung, dazu der Ordnerdienst — reagiert auf jedes Ergebnis.',
  nav: { group: 'Verein', icon: '📣', order: 45 },
  requires: ['finance', 'league'],
  gate: gatedBy('fans'),

  state: { schema: FansSchema, create: createFans, version: FANS_VERSION },

  /*
   * A faction below the threshold is a decision waiting — a choreo, a
   * cheaper Stehplatz-Politik, something. A ground that is simply doing fine
   * gets no badge, same rule as campus and every other department here.
   */
  attention: (state) => {
    const bad = unhappy(state.modules.fans);
    return bad.map((g) => ({
      id: `fans.${g.id}`,
      urgency: g.mood < 30 ? ('now' as const) : ('soon' as const),
      label: `${groupDef(g.id)?.name ?? g.id}: Stimmung bei ${Math.round(g.mood)} %`
    }));
  },

  hooks: {
    matchday: {
      phase: 'post',
      // After press writes its headlines at order 20 — fans reacts to the
      // scoreline directly rather than to what got printed, so the ordering
      // only has to keep it inside the same tick, not any particular one.
      order: 25,
      consumes: ['league.result'],
      run({ state, query }) {
        const fans = state.modules.fans;
        const result = query<{ goalsFor: number; goalsAgainst: number } | undefined>(
          'league.result',
          undefined
        );
        if (!result) return;
        applyResult(fans, result);
      }
    }
  }
});

export { safetyOf };
