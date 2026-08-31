import { defineModule } from '$lib/engine/module';
import type { GameState } from '$lib/engine/state';
import { KnowledgeSchema, createKnowledge, KNOWLEDGE_VERSION } from './state';
import { ownedEffects, CONTRIBUTED } from './rules';
import { knowledgeContent } from './content';

/** One implementation, run on every tick a module might read an effect on. */
function contributeEffects({ state, modify, addTo }: {
  state: GameState;
  modify: (key: string, factor: number) => void;
  addTo: (key: string, amount: number) => void;
}): void {
  const { totals, factors } = ownedEffects(state.modules.knowledge);
  for (const [key, value] of totals) addTo(key, value);
  for (const [key, value] of factors) modify(key, value);
}

export default defineModule({
  id: 'knowledge',
  title: 'Doktrin',
  summary: 'Der Wissensbaum: acht Doktrinen, und die Entscheidung, welche davon du nicht gehst.',
  nav: { group: 'Verein', icon: '🧠', order: 50 },
  requires: ['league', 'finance'],

  state: { schema: KnowledgeSchema, create: createKnowledge, version: KNOWLEDGE_VERSION },

  hooks: {
    /*
     * Everything the club has learned, contributed to the bus.
     *
     * `order: 1` — before matchday's `pre` hook at order 10, which is what
     * reads `squad.strengthBonus` and `matchday.homeStrength` and turns them
     * into the number the simulation uses. Publishing after it is the exact
     * mistake that once made the player's lineup irrelevant to their own
     * results, and the registry now refuses to boot if this drifts.
     *
     * The keys are declared statically from the EFFECTS table, so a node whose
     * effect maps somewhere new cannot be written without appearing here — the
     * tick throws on an undeclared write.
     */
    matchday: {
      phase: 'pre',
      order: 1,
      contributes: CONTRIBUTED,
      run: contributeEffects
    },

    /*
     * The same contribution on the week.
     *
     * A club does not forget what it knows between Saturdays, and the registry
     * proved the point: `training` consumes `training.devPerSeason` on the WEEK
     * tick, and with knowledge contributing only on matchday there was no
     * producer for it — the boot check refused to start rather than let a
     * doctrine node silently do nothing for the tick it was written for.
     *
     * Every tick a module might read an effect on needs the effect present.
     */
    week: [
      {
        phase: 'pre',
        order: 1,
        contributes: CONTRIBUTED,
        run: contributeEffects
      },

    /*
     * Wissenspunkte accrue with time served, not with success.
     *
     * Tying them to results would compound: the club that is already winning
     * learns fastest and pulls further away, which is the opposite of what a
     * tree of hard choices is for. A struggling club still learns — slowly, and
     * that is the point.
     */
      {
        phase: 'world',
        order: 50,
        run({ state, emit }) {
          const k = state.modules.knowledge;
          if (state.meta.matchday % knowledgeContent.pointEveryMatchdays !== 0) return;
          k.points += 1;
          k.earned += 1;
          emit({
            source: 'knowledge',
            severity: 'good',
            title: 'Ein Wissenspunkt',
            detail: `${k.points} verfügbar.`,
            goto: 'knowledge'
          });
        }
      }
    ],

    seasonEnd: [
      {
        /* The academy and the network read their effects on the season
           boundary, so the contribution has to be present there too. Third
           tick kind, same rule: an effect must exist on every tick that reads
           it, and the registry refuses to boot when it does not. */
        phase: 'pre',
        order: 1,
        contributes: CONTRIBUTED,
        run: contributeEffects
      },
      {
      phase: 'world',
      order: 50,
      run({ state, emit }) {
        const k = state.modules.knowledge;
        k.points += knowledgeContent.pointsPerSeason;
        k.earned += knowledgeContent.pointsPerSeason;
        emit({
          source: 'knowledge',
          severity: 'good',
          title: `Saisonauswertung: +${knowledgeContent.pointsPerSeason} Wissenspunkte`,
          detail: `${k.points} verfügbar.`,
          goto: 'knowledge'
        });
      }
      }
    ]
  }
});
