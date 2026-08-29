import { defineModule } from '$lib/engine/module';
import { HistorySchema, createHistory, HISTORY_VERSION } from './state';
import { ownResult, biggerWin, seasonRecord } from './rules';
import { seasonOutcome } from '../league/rules';

export default defineModule({
  id: 'history',
  title: 'Vereinsgeschichte',
  summary: 'Saison für Saison: Liga, Tabellenplatz, Punkte, Tore und der größte Sieg.',
  nav: { group: 'Verein', icon: '📖', order: 40 },
  requires: ['league'],

  state: { schema: HistorySchema, create: createHistory, version: HISTORY_VERSION },

  hooks: {
    /*
     * Runs in `post`, strictly after league has resolved every fixture in
     * `sim` — so the result read here already carries this matchday's real
     * score. Reading league's own state directly rather than through
     * `query`/`provide`: this is a fact already committed to state, not a
     * value another hook is computing for this tick only.
     */
    matchday: {
      phase: 'post',
      run({ state }) {
        const h = state.modules.history;
        const result = ownResult(state.modules.league, state.meta.matchday);
        if (!result) return;
        h.runningBiggestWin = biggerWin(h.runningBiggestWin, result);
      }
    },

    /*
     * `order: -10` — deliberately before league's own `seasonEnd` hook, which
     * runs at the default order in the same `world` phase and immediately
     * resets every table and moves clubs between divisions. Reading the table
     * one tick later would find it already cleared, and the season just
     * played would be recorded as 0 points in whatever division the club
     * happened to land in next.
     */
    seasonEnd: {
      phase: 'world',
      order: -10,
      run({ state, emit }) {
        const league = state.modules.league;
        const h = state.modules.history;

        const outcome = seasonOutcome(league);
        const movement = outcome.promoted ? 'promoted' : outcome.relegated ? 'relegated' : 'stayed';

        const record = seasonRecord(league, state.meta.season, movement, h.runningBiggestWin);
        h.seasons.push(record);
        h.runningBiggestWin = null;

        emit({
          source: 'history',
          severity: 'info',
          title: `Saison ${record.season} verbucht`,
          detail: `${record.league} — Platz ${record.rank || '—'}, ${record.points} Punkte.`,
          goto: 'history'
        });
      }
    }
  }
});
