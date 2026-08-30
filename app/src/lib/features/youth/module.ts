import { defineModule } from '$lib/engine/module';
import { YouthSchema, createYouth, YOUTH_VERSION } from './state';
import { ageProspects } from './rules';

export default defineModule({
  id: 'youth',
  title: 'Jugendakademie',
  summary: 'Talente ausbilden, statt sie nur einzukaufen — ein Level, das man ausbaut, und Spieler, die von selbst aufsteigen.',
  nav: { group: 'Sport', icon: '🌱', order: 17 },
  requires: ['finance', 'squad'],

  state: { schema: YouthSchema, create: createYouth, version: YOUTH_VERSION },

  hooks: {
    /*
     * Graduation is a once-a-season event, not a weekly one — a year of age is
     * what a season means here, and pushing it onto `week` would either graduate
     * nobody for 34 weeks straight or require its own age-in-weeks bookkeeping
     * that duplicates what `age` already is everywhere else in the game.
     */
    seasonEnd: {
      phase: 'world',
      run({ state, emit }) {
        const youth = state.modules.youth;
        const squad = state.modules.squad;
        const { graduates } = ageProspects(youth);

        for (const player of graduates) {
          // Built by createPlayer at scouting time — pushed as-is, so a
          // graduate cannot drift from how every other player is made.
          squad.players.push(player);
          emit({
            source: 'youth',
            severity: 'good',
            title: `${player.name} steigt in den Profikader auf`,
            detail: `${player.pos} · ${player.age} Jahre — ein Spieler, in den sich Training jetzt erst richtig lohnt.`,
            goto: 'youth'
          });
        }
      }
    }
  }
});
