import { defineModule } from '$lib/engine/module';
import { MatchdaySchema, createMatchday, MATCHDAY_VERSION, type Report } from './state';
import { effectiveStrength, modifiers, recordResult, moraleDelta, fitnessMultiplier } from './rules';
import { matchdayDocs } from './docs';
import { autoLineup, teamStrength, isAvailable } from '../squad/rules';

export default defineModule({
  id: 'matchday',
  title: 'Spieltag',
  summary: 'Aufstellung, Grundordnung, Ansprache und der Spielbericht.',
  nav: { group: 'Sport', icon: '⚽', order: 5, primary: true },
  requires: ['squad', 'league'],

  state: { schema: MatchdaySchema, create: createMatchday, version: MATCHDAY_VERSION },

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
        provides: ['squad.strength', 'matchday.modifiers', 'matchday.fitnessCost'],
        run({ state, emit, provide }) {
          const squad = state.modules.squad;
          const m = state.modules.matchday;

          // An empty lineup is not a tactical choice, it is an oversight.
          if (squad.lineup.length < 11) squad.lineup = autoLineup(squad);

          // Home or away is league's to answer, but league runs later. The
          // fixture list is stable within a season, so reading our own side
          // from stored state is safe and keeps the dependency one-way.
          const league = state.modules.league;
          const teams = league.levels[league.playerLevel] ?? [];
          const us = teams.findIndex((t) => t.name === 'FC Anstoß Pro');
          const fixture = (league.fixtures[league.playerLevel] ?? [])[state.meta.matchday - 1]
            ?.find((f) => f.home === us || f.away === us);
          const isHome = fixture ? fixture.home === us : true;

          const base = teamStrength(squad, false);
          const strength = effectiveStrength(m, base, isHome);

          provide('squad.strength', strength);
          provide('matchday.modifiers', modifiers(m, isHome));
          // The price of the chosen style. squad applies it after the match, so
          // an attacking week is paid for in the next one.
          provide('matchday.fitnessCost', fitnessMultiplier(m));

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
        consumes: ['league.result', 'league.opponentStrength', 'squad.strength'],
        run({ state, query }) {
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
  },

  screen: () => import('./Screen.svelte'),
  docs: matchdayDocs
});
