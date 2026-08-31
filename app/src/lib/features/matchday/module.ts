import { defineModule } from '$lib/engine/module';
import { MatchdaySchema, createMatchday, MATCHDAY_VERSION, migrateMatchday, type Report } from './state';
import { narrate } from './narrate';
import {
  effectiveStrength, modifiers, recordResult, moraleDelta,
  fitnessMultiplier, goalChance, scorersFor
} from './rules';
import { autoLineup, teamStrength, isAvailable } from '../squad/rules';

/**
 * What a point of refereeing bias is worth, in strength.
 *
 * The prototype shifted a win probability directly: `userFavoredProb += 0.05`
 * against a base of `0.5 + strengthDiff × 0.02`. Solving that, five percent of
 * win probability is two and a half strength points — so a whole point of bias
 * is fifty, and the tree's `refBias: 0.05` lands exactly where it did before.
 *
 * Derived rather than chosen, which is the only reason a number this large is
 * safe. Picked by feel it would be a balance decision hidden inside a unit
 * conversion, and nobody would ever find it.
 */
export const REFEREE_STRENGTH_POINTS = 50;

/**
 * The same conversion for Resilienz, and deliberately worth less per point.
 *
 * A referee tilts the whole match; a comeback bonus applies to forty-five
 * minutes, and only to the forty-five minutes that begin with us behind. Given
 * the same rate it would be the better buy in every doctrine that offers both,
 * which is not what the tier costs say either node is meant to be.
 */
export const COMEBACK_STRENGTH_POINTS = 30;

/** Our club's current display name, which the editor may have changed. */
function ourName(state: { modules: { league: { levels: { id: string; name: string }[][]; playerClubId: string } } }): string {
  for (const level of state.modules.league.levels) {
    const found = level.find((t) => t.id === state.modules.league.playerClubId);
    if (found) return found.name;
  }
  return 'Unser Verein';
}

export default defineModule({
  id: 'matchday',
  title: 'Spieltag',
  summary: 'Aufstellung, Grundordnung, Ansprache und der Spielbericht.',
  nav: { group: 'Sport', icon: '⚽', order: 5, primary: true },
  requires: ['squad', 'league'],

  state: { schema: MatchdaySchema, create: createMatchday, version: MATCHDAY_VERSION, migrate: migrateMatchday },

  hooks: {
    matchday: [
      {
        /*
         * The pre-match. This is the hook the whole module exists for.
         *
         * league resolves our fixture in `sim`, and it needs to know how strong
         * we actually are. squad published that in `post` — AFTER the match had
         * already been played — so league silently fell back to the stored
         * table strength and the player's lineup had no effect on their own
         * results at all. Nothing errored; the number was simply never read.
         *
         * Publishing here, in `pre`, is the fix. The registry now refuses to
         * boot if a consumer is ordered before its provider, so it cannot
         * regress quietly.
         */
        phase: 'pre',
        order: 10,
        provides: ['squad.strength', 'matchday.modifiers', 'matchday.goalChance'],
        contributes: ['squad.fitnessLoss'],
        consumes: [
          'squad.strengthBonus', 'matchday.homeStrength',
          'matchday.awayStrength', 'matchday.goalChanceBonus',
          'matchday.refereeBias'
        ],
        run({ state, emit, provide, modify, total, factor }) {
          const squad = state.modules.squad;
          const m = state.modules.matchday;

          // An empty lineup is not a tactical choice, it is an oversight.
          if (squad.lineup.length < 11) squad.lineup = autoLineup(squad);

          // Home or away is league's to answer, but league runs later. The
          // fixture list is stable within a season, so reading our own side
          // from stored state is safe and keeps the dependency one-way.
          const league = state.modules.league;
          const teams = league.levels[league.playerLevel] ?? [];
          // By id, not by name: the player renames their own club in the editor,
          // and a name lookup would stop finding it the moment they did.
          const us = teams.findIndex((t) => t.id === league.playerClubId);
          const fixture = (league.fixtures[league.playerLevel] ?? [])[state.meta.matchday - 1]
            ?.find((f) => f.home === us || f.away === us);
          const isHome = fixture ? fixture.home === us : true;

          /*
           * Everything the backroom and the doctrine contributed lands here.
           * matchday is the single place that turns "how good are we" into one
           * number, so it has to read the bus rather than only its own tactics
           * — otherwise a co-trainer's +2 sits in a bucket nobody opens.
           */
          // Home and away are separate buckets: a node that makes you better on
          // the road is a different promise from one that fortifies your ground,
          // and summing them would quietly pay out both everywhere.
          /*
           * The whistles, in the only currency this model has.
           *
           * The prototype shifted a win probability: `userFavoredProb += 0.05`
           * against a base of `0.5 + strengthDiff × 0.02`, which makes five
           * percent worth two and a half strength points. The port draws each
           * side's goals separately and has no probability term to add to, so
           * the conversion happens here — once, in the module that owns the
           * model — rather than a percentage being written into a strength
           * number where nothing would ever think to question it.
           *
           * Home and away alike. The prototype flipped the sign when away,
           * which reads as a doctrine that hurts you on the road until you
           * notice `userFavoredProb` means "the HOME side scores": the flip is
           * a coordinate transform, not a design.
           */
          const referee = total('matchday.refereeBias') * REFEREE_STRENGTH_POINTS;

          const external = total('squad.strengthBonus') + referee
            + (isHome ? total('matchday.homeStrength') : total('matchday.awayStrength'));
          const base = teamStrength(squad, false, external);
          const strength = effectiveStrength(m, base, isHome);

          provide('squad.strength', strength);
          provide('matchday.modifiers', modifiers(m, isHome));
          // The price of the chosen style, contributed rather than owned: a
          // fitness coach and a doctrine will want to move the same number, and
          // none of us should have to know the others exist.
          modify('squad.fitnessLoss', fitnessMultiplier(m));
          // Tactics decide the base; the doctrine multiplies it. Contributed
          // rather than provided, because more than one system will want to
          // move this and none of them should know about the others.
          provide('matchday.goalChance', goalChance(m) * factor('matchday.goalChanceBonus'));

          const available = squad.players.filter(isAvailable).length;
          if (available < 11) {
            emit({
              source: 'matchday',
              severity: 'warn',
              title: 'Nicht genug einsatzbereite Spieler',
              detail: `${available} verfügbar. Es wird trotzdem gespielt.`,
              goto: 'matchday'
            });
          }
        }
      },
      {
        /*
         * The report. Runs after `sim`, reading the result league just wrote.
         * Persisted rather than left in the event log, because a reload must
         * not lose what happened on Saturday.
         */
        phase: 'post',
        order: 5,
        consumes: [
          'league.result', 'league.opponentStrength', 'squad.strength',
          'matchday.comeback'
        ],
        run({ state, query, rng, total }) {
          const m = state.modules.matchday;

          const result = query<{
            goalsFor: number; goalsAgainst: number; isHome: boolean; opponent: string;
          } | null>('league.result', null);
          if (!result) return;   // no fixture this matchday

          const report: Report = {
            season: state.meta.season,
            matchday: state.meta.matchday,
            opponent: result.opponent,
            isHome: result.isHome,
            goalsFor: result.goalsFor,
            goalsAgainst: result.goalsAgainst,
            ourStrength: query<number>('squad.strength', 0),
            opponentStrength: query<number>('league.opponentStrength', 0)
          };

          recordResult(m, report);
          // Counted where the result is decided, so it cannot disagree with the
          // report it came from.
          if (report.goalsFor > report.goalsAgainst) m.careerWins += 1;

          /*
           * Narrate the match that was just resolved.
           *
           * The score is already decided — the simulation owns it, which is what
           * keeps "a better eleven wins more" true. This lays ninety minutes of
           * incident over the top so there is something to watch, and stores it
           * in state so closing the screen does not lose the match.
           */
          m.live = {
            beats: narrate(rng, {
              ourGoals: report.goalsFor,
              theirGoals: report.goalsAgainst,
              ourName: ourName(state),
              theirName: report.opponent,
              edge: report.ourStrength - report.opponentStrength,
              scorers: scorersFor(state.modules.squad)
            }),
            minute: 0,
            running: true,
            opponent: report.opponent,
            isHome: report.isHome,
            decided: null,
            ourStrength: report.ourStrength,
            opponentStrength: report.opponentStrength,
            matchday: state.meta.matchday,
            /*
             * Read here rather than in `pre`, and it works because a modifier
             * is contributed once per tick and stays readable for the whole of
             * it — knowledge writes at `pre`/1 and this is `post`/5. Captured
             * at kickoff so a node bought during the interval cannot change a
             * match that is already half played.
             */
            comeback: Math.round(total('matchday.comeback') * COMEBACK_STRENGTH_POINTS),
            subsUsed: 0,
            subs: []
          };

          /*
           * Goals go on the scorers' records, from the narration rather than
           * from the simulation — because the narration is where a goal
           * acquires an owner at all. The scoreline was decided first and is
           * unchanged; this only says who got them.
           */
          const byId = new Map(state.modules.squad.players.map((p) => [p.id, p]));
          for (const beat of m.live.beats) {
            if (beat.kind !== 'goal' || !beat.scorerId) continue;
            const scorer = byId.get(beat.scorerId);
            if (scorer) scorer.record.goals += 1;
          }

          // The team talk's cost lands now, a week after it was chosen.
          const delta = moraleDelta(m);
          if (delta !== 0) {
            for (const p of state.modules.squad.players) {
              if (!state.modules.squad.lineup.includes(p.id)) continue;
              p.morale = Math.max(0, Math.min(100, p.morale + delta));
            }
          }
        }
      }
    ]
  }
});
