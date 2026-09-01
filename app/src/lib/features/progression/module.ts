import { defineModule } from '$lib/engine/module';
import { ProgressionSchema, createProgression, PROGRESSION_VERSION, migrateProgression } from './state';
import { unlockNext, nextUnlock, awardBadges } from './rules';
import { narrativeById } from './content';
import { earnableBadges } from '$lib/content/badges';
import type { GameState } from '$lib/engine/state';
import type { GameEvent } from '$lib/engine/events';

/**
 * Check every standing badge condition, and say so when one lands.
 *
 * Called on the matchday and at the season end, because the two answer
 * different questions: "twenty career wins" becomes true on a Saturday and
 * "three seasons unbeaten at home" becomes true in May, and polling only one
 * of them would leave half the catalogue arriving late or never.
 *
 * `earnableBadges` is computed against the registry each time rather than
 * stored. A badge for a feature that has not shipped is HIDDEN rather than
 * permanently at zero — an achievement you can never earn is a promise the
 * game breaks quietly, and it sits in the list forever looking like something
 * you failed at. Deriving it means a badge lights up the day its feature lands
 * and nobody has to remember to come back.
 */
function announce(state: GameState, emit: (e: GameEvent) => void): void {
  const registered = new Set(Object.keys(state.modules));
  for (const badge of awardBadges(state, earnableBadges(registered))) {
    emit({
      source: 'progression',
      severity: 'good',
      title: `${badge.icon} ${badge.name}`,
      detail: badge.desc,
      goto: 'progression'
    });
  }
}

export default defineModule({
  id: 'progression',
  title: 'Fortschritt',
  summary: 'Startgeschichten, Freischaltungen und delegierte Bereiche.',

  state: {
    schema: ProgressionSchema,
    create: createProgression,
    version: PROGRESSION_VERSION,
    migrate: migrateProgression
  },

  hooks: {
    /**
     * Unlocks are earned, not timed. Opening one module every few matchdays
     * paces discovery to roughly the rate a player can absorb a new system,
     * rather than dumping thirty of them on the first screen.
     */
    matchday: {
      phase: 'world',
      /*
       * Order 90 — last but one, deliberately. A badge is a READING of state
       * every other module owns, so it has to be taken after all of them have
       * finished writing: a "twenty career wins" badge checked before matchday
       * counted Saturday's win is a badge that arrives a week late, forever.
       */
      order: 90,
      run({ state, emit, autopilots }) {
        const p = state.modules.progression;
        if (!p.started) return;

        announce(state, emit);

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
        announce(state, emit);
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
  }
});

export { isUnlocked, gatedBy, isDelegated, delegationFor, isSilenced, type Delegation, unlock, unlockNext, applyNarrative, delegate, revoke, markSeen, unseen, progressRatio } from './rules';
export { narratives, narrativeById, type Narrative } from './content';
