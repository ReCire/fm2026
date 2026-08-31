import { defineModule } from '$lib/engine/module';
import { YouthSchema, createYouth, YOUTH_VERSION, migrateYouth } from './state';
import { ageProspects, scoutProspect, scoutRng } from './rules';
import { capacity } from './rules';

export default defineModule({
  id: 'youth',
  title: 'Jugendakademie',
  summary: 'Talente ausbilden, statt sie nur einzukaufen — ein Level, das man ausbaut, und Spieler, die von selbst aufsteigen.',
  nav: { group: 'Sport', icon: '🌱', order: 17 },
  requires: ['finance', 'squad'],

  state: { schema: YouthSchema, create: createYouth, version: YOUTH_VERSION, migrate: migrateYouth },

  /*
   * A full academy is not a full cupboard, it is a stopped conveyor: scouting
   * is blocked, and nothing tells the player why except this. Graduation is
   * automatic at season end, so the decision is whether to build.
   */
  attention: (state) => {
    const y = state.modules.youth;
    if (y.prospects.length < capacity(y.level)) return [];
    return [
      {
        id: 'youth.full',
        urgency: 'soon' as const,
        label: 'Akademie voll — bis zum Saisonende wird kein Talent mehr gesichtet'
      }
    ];
  },

  hooks: {
    /*
     * Graduation is a once-a-season event, not a weekly one — a year of age is
     * what a season means here, and pushing it onto `week` would either graduate
     * nobody for 34 weeks straight or require its own age-in-weeks bookkeeping
     * that duplicates what `age` already is everywhere else in the game.
     */
    seasonEnd: {
      phase: 'world',
      consumes: ['youth.startStrength', 'youth.perSeason'],
      run({ state, emit, total }) {
        const youth = state.modules.youth;
        const squad = state.modules.squad;
        const { graduates } = ageProspects(youth);

        /*
         * An academy doctrine makes graduates better, not merely more numerous.
         * Applied at graduation rather than at scouting so it improves the
         * prospects already in the building — the player who invests in the
         * academy should see it in the next class, not the one after.
         */
        const boost = total('youth.startStrength');
        if (boost > 0) {
          for (const p of graduates) {
            for (const key of Object.keys(p.attributes) as (keyof typeof p.attributes)[]) {
              p.attributes[key] = Math.min(99, p.attributes[key] + boost);
            }
            p.record.debutStrength += boost;
          }
        }

        /*
         * Free intake. A doctrine that runs a scouting network brings players
         * in without the club paying a fee — the same act the screen charges
         * for, arriving as a consequence of what the club has learned.
         */
        const intake = total('youth.perSeason');
        for (let i = 0; i < intake; i++) {
          const rookie = scoutProspect(scoutRng(youth, state.meta.seed), youth.level);
          youth.prospects.push(rookie);
          emit({
            source: 'youth',
            severity: 'good',
            title: `${rookie.name} kommt aus dem Netzwerk`,
            detail: `${rookie.pos}, ${rookie.age} Jahre — ohne Kosten für den Verein.`,
            goto: 'youth'
          });
        }

        for (const player of graduates) {
          // Built by createPlayer at scouting time — pushed as-is, so a
          // graduate cannot drift from how every other player is made.
          squad.players.push(player);
          // Counted where the graduation happens; a graduate is indistinguishable
          // from any other squad player one line later.
          youth.promoted += 1;
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
