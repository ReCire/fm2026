import { defineModule } from '$lib/engine/module';
import { TrainingSchema, createTraining, TRAINING_VERSION } from './state';
import { trainWeek, restFor } from './rules';
import { trainingContent } from './content';
import { ATTRIBUTE_LABEL, type Attribute } from '../squad/attributes';

/**
 * The first module to use the `week` tick.
 *
 * The engine has had `week` as a TickKind since the beginning and no module
 * ever implemented it, which is precisely why there was nothing between
 * matches: the game only knew how to be a matchday. Everything the player does
 * between two Saturdays hangs off this hook.
 */
export default defineModule({
  id: 'training',
  title: 'Training',
  summary: 'Trainingsschwerpunkt, Intensität und die Entwicklung deiner Spieler.',
  nav: { group: 'Sport', icon: '🎯', order: 15 },
  requires: ['squad'],

  state: { schema: TrainingSchema, create: createTraining, version: TRAINING_VERSION },

  /*
   * Hard training with a treatment room already full is the decision the
   * player is most likely to be making by accident: intensity is set once and
   * then forgotten, and the injuries arrive weeks later looking like bad luck.
   */
  attention: (state) => {
    const t = state.modules.training;
    const injured = state.modules.squad.players.filter((p) => p.injured > 0).length;
    const out = [];
    if (t.intensity === 'hart' && injured >= 3) {
      out.push({
        id: 'training.grinding',
        urgency: 'now' as const,
        label: `Hartes Training bei ${injured} Verletzten`
      });
    }
    if (t.teamFocus === 'allgemein' && t.weeks >= 4) {
      out.push({
        id: 'training.unfocused',
        urgency: 'soon' as const,
        label: 'Kein Trainingsschwerpunkt — die Woche entwickelt niemanden gezielt'
      });
    }
    return out;
  },

  hooks: {
    week: {
      phase: 'sim',
      order: 10,
      consumes: ['training.devPerSeason', 'training.youthCeiling'],
      run({ state, rng, emit, total }) {
        const training = state.modules.training;
        const outcome = trainWeek(
          training, state.modules.squad, rng,
          total('training.devPerSeason'), total('training.youthCeiling')
        );

        training.lastWeek = outcome.changes;
        training.weeks += 1;

        for (const player of outcome.recovered) {
          emit({
            source: 'training',
            severity: 'good',
            title: `${player.name} ist zurück im Training`,
            detail: 'Wieder einsatzbereit.',
            goto: 'squad'
          });
        }

        /*
         * One event for the week, not one per point.
         *
         * Twenty-odd players each nudging an attribute is twenty toasts that
         * say nothing individually. The detail names the biggest movers; the
         * screen has the full list, which is what `lastWeek` is for.
         */
        const gains = outcome.changes.filter((c) => c.delta > 0);
        const losses = outcome.changes.filter((c) => c.delta < 0);
        if (gains.length > 0 || losses.length > 0) {
          const named = gains.slice(0, 3)
            .map((c) => `${c.name} (${ATTRIBUTE_LABEL[c.attribute as Attribute] ?? c.attribute})`)
            .join(', ');
          emit({
            source: 'training',
            severity: gains.length >= losses.length ? 'good' : 'warn',
            title: `Trainingswoche: ${gains.length} Fortschritt${gains.length === 1 ? '' : 'e'}`,
            detail: named
              ? `${named}${gains.length > 3 ? ` und ${gains.length - 3} weitere` : ''}.` +
                (losses.length > 0 ? ` ${losses.length} Spieler haben nachgelassen.` : '')
              : `${losses.length} Spieler haben nachgelassen.`,
            goto: 'training'
          });
        }
      }
    },

    /*
     * The price of a hard week, charged on Saturday.
     *
     * Contributed to the bus rather than applied here: staff, doctrine and
     * training all want to move the same two numbers, and none of them should
     * have to know the others exist. squad reads the product.
     */
    matchday: {
      phase: 'pre',
      order: 5,
      contributes: ['squad.fitnessLoss', 'squad.injuryRisk'],
      run({ state, modify }) {
        const { intensity } = state.modules.training;
        modify('squad.fitnessLoss', trainingContent.intensity[intensity].fitnessLoss);
        modify('squad.injuryRisk', trainingContent.intensity[intensity].injuryRisk);
      }
    },

    seasonEnd: {
      phase: 'world',
      run({ state }) {
        // The season report is per season. Carrying it over would make the
        // "developed this season" column mean "developed ever", which is a
        // different and much less useful number.
        state.modules.training.season = {};
        state.modules.training.weeks = 0;
      }
    }
  }
});

export { restFor };
