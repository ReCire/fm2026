import { defineModule } from '$lib/engine/module';
import { ProgressionSchema, createProgression, PROGRESSION_VERSION } from './state';
import { progressionDocs } from './docs';
import { unlockNext, nextUnlock } from './rules';
import { narrativeById } from './content';

export default defineModule({
  id: 'progression',
  title: 'Fortschritt',
  summary: 'Startgeschichten, Freischaltungen und delegierte Bereiche.',

  state: {
    schema: ProgressionSchema,
    create: createProgression,
    version: PROGRESSION_VERSION
  },

  hooks: {
    /**
     * Unlocks are earned, not timed. Opening one module every few matchdays
     * paces discovery to roughly the rate a player can absorb a new system,
     * rather than dumping thirty of them on the first screen.
     */
    matchday: {
      phase: 'world',
      order: 90,
      run({ state, emit }) {
        const p = state.modules.progression;
        if (!p.started) return;

        const UNLOCK_EVERY = 3;
        if (state.meta.matchday % UNLOCK_EVERY !== 0) return;

        const before = nextUnlock(p);
        if (!before) return;

        const { unlocked } = unlockNext(p, 1);
        for (const id of unlocked) {
          emit({
            source: 'progression',
            severity: 'good',
            title: 'Neuer Bereich freigeschaltet',
            detail: `„${id}" steht dir ab sofort zur Verfügung.`,
            goto: id
          });
        }
      }
    },

    seasonEnd: {
      phase: 'world',
      run({ state, emit }) {
        const p = state.modules.progression;
        const narrative = narrativeById(p.narrativeId);
        if (!narrative) return;
        // A survived season opens two at once: by now the player has the
        // vocabulary to take more than one new system at a time.
        const { unlocked, remaining } = unlockNext(p, 2);
        if (unlocked.length > 0) {
          emit({
            source: 'progression',
            severity: 'good',
            title: `Saison überstanden — ${unlocked.length} neue Bereiche`,
            detail: remaining > 0 ? `Noch ${remaining} weitere warten.` : 'Damit steht dir alles offen.'
          });
        }
      }
    }
  },

  screen: () => import('./Screen.svelte'),
  docs: progressionDocs
});

export { isUnlocked, gatedBy, isDelegated, unlock, unlockNext, applyNarrative, delegate, revoke, markSeen, unseen, progressRatio } from './rules';
export { narratives, narrativeById, type Narrative } from './content';
