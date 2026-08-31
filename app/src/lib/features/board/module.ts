import { defineModule } from '$lib/engine/module';
import { BoardSchema, createBoard, BOARD_VERSION } from './state';
import {
  barFor, clampTrust, doubtFrom, judgeSeason, matchdayDrift, matchdaysLeft,
  openUltimatum, shouldSack, shouldSetUltimatum, statusOf, ultimatumOutcome
} from './rules';
import { boardContent, bandFor, isDisaster } from './content';
import { cast } from '$lib/content/cast';

/**
 * Der Vorstand — the first way to lose this game.
 *
 * Results → press → board. The board reads the STORY, never the scoreline, and
 * that ordering is the whole design: reading both would punish one defeat twice
 * by two systems, which is unfair even when the arithmetic is defensible.
 *
 * It is also what makes the Schattenkabinett coherent. An envelope does not
 * lose you a match — it raises the temperature, and the temperature costs you
 * the job.
 */

/** Every story printed on this exact matchday, with what it weighed. */
function printedToday(state: { modules: { press: { feed: readonly { season: number; matchday: number; weight: number }[] } }; meta: { season: number; matchday: number } }): number[] {
  return state.modules.press.feed
    .filter((s) => s.season === state.meta.season && s.matchday === state.meta.matchday)
    .map((s) => s.weight);
}

export default defineModule({
  id: 'board',
  title: 'Vorstand',
  summary:
    'Vertrauen, gemessen am Etat statt am Tabellenplatz — und die einzige Zahl in diesem Spiel, die eine Karriere beenden kann.',
  nav: { group: 'Verein', icon: '🪑', order: 65 },
  requires: ['league', 'press'],

  state: { schema: BoardSchema, create: createBoard, version: BOARD_VERSION },

  /*
   * Only during an ultimatum. Trust drifting down is a number the player can
   * look at whenever they like; a stated target with a deadline on it is a
   * decision, and only the second deserves to interrupt.
   */
  attention: (state) => {
    const board = state.modules.board;
    const left = matchdaysLeft(board, state.meta.matchday);
    if (left === null) return [];
    return [
      {
        id: 'board.ultimatum',
        urgency: left <= 2 ? ('now' as const) : ('soon' as const),
        label:
          left === 0
            ? `Letzter Spieltag der Frist: ${board.ultimatum!.demand} oder die Zusammenarbeit endet`
            : `Der Aufsichtsrat verlangt ${board.ultimatum!.demand} — noch ${left} Spieltage`
      }
    ];
  },

  hooks: {
    matchday: {
      phase: 'post',
      /*
       * Order 30 — after press writes at order 20 in the same phase, so a raid
       * that lands this matchday reaches the boardroom this matchday rather
       * than next. The registry enforces the direction; the order number is
       * what makes it the same tick.
       */
      order: 30,
      consumes: [
        'league.rank', 'league.level', 'league.budgetRank', 'league.clubCount',
        'board.floor', 'board.trust'
      ],
      run({ state, emit, query, total }) {
        const board = state.modules.board;
        if (board.sacked) return;

        const { season, matchday } = state.meta;
        const floor = total('board.floor', 0);
        const rank = query<number>('league.rank', 0);
        const clubs = query<number>('league.clubCount', 18);
        const bar = barFor(board, {
          level: query<number>('league.level', 3),
          budgetRank: query<number>('league.budgetRank', Math.ceil(clubs / 2)),
          clubs
        });

        /*
         * Story weights, not the pressure meter. A raid resolves the Verband's
         * needle, so a board reading `press.pressure` would receive the loudest
         * week of a career as relief — the file is private, and what a
         * supervisory board sees is the newspaper on the table.
         */
        const doubt = rank > 0 ? doubtFrom(printedToday(state)) : 0;
        const drift = rank > 0 ? matchdayDrift(rank, bar.rank) : 0;
        const bought = total('board.trust', 0);

        board.trust = clampTrust(board.trust + drift + doubt + bought, floor);

        /* ── The last stretch ──────────────────────────────────────────── */
        if (board.ultimatum) {
          const outcome = ultimatumOutcome(board, matchday, rank);
          if (outcome === 'met') {
            board.ultimatum = null;
            /*
             * Meeting it buys distance from the threshold, not merely a reset.
             * Clearing an ultimatum only to sit one bad matchday under the
             * trigger would re-open it immediately, and a board that issues the
             * same ultimatum every fortnight is not a board.
             */
            board.trust = clampTrust(board.trust + boardContent.ultimatumAt, floor);
            emit({
              source: 'board',
              severity: 'good',
              title: 'Die Frist ist abgewendet',
              detail: `${bandFor(board.trust).label}. ${cast.president!.name} hat es ja immer gesagt.`,
              goto: 'board'
            });
          } else if (outcome === 'missed') {
            // Read before clearing. Typed `never` afterwards, which is the
            // compiler noticing that the message quotes a target that no
            // longer exists — it would have printed the fallback every time.
            const missed = board.ultimatum.demand;
            board.ultimatum = null;
            board.trust = clampTrust(0, floor);
            emit({
              source: 'board',
              severity: 'bad',
              title: 'Die Frist ist verstrichen',
              detail: `${missed} wurde verfehlt.`,
              goto: 'board'
            });
          }
        } else if (shouldSetUltimatum(board)) {
          board.ultimatum = openUltimatum(season, matchday, bar);
          emit({
            source: 'board',
            severity: 'bad',
            title: 'Der Aufsichtsrat setzt ein Ziel',
            detail: `${bar.demand} innerhalb von ${boardContent.ultimatumMatchdays} Spieltagen. ${cast.board!.name} wird sich zu Personalspekulationen nicht äußern.`,
            goto: 'board'
          });
        }

        if (shouldSack(board)) {
          board.sacked = true;
          emit({
            source: 'board',
            severity: 'bad',
            title: 'Freistellung',
            detail: `${cast.board!.name} hat die Zusammenarbeit mit sofortiger Wirkung beendet.`,
            goto: 'board'
          });
        }
      }
    },

    /*
     * The verdict.
     *
     * Order 10, after league publishes the final table at order 1 and before
     * promotion and relegation move anybody — `applyPromotionRelegation` runs
     * in league's own hook, and a rank read after it is next season's.
     */
    seasonEnd: {
      phase: 'world',
      order: 10,
      consumes: [
        'league.finalRank', 'league.promoted', 'league.relegated',
        'league.level', 'league.budgetRank', 'league.clubCount', 'board.floor'
      ],
      run({ state, emit, query, total }) {
        const board = state.modules.board;
        if (board.sacked) return;

        const season = state.meta.season;
        const floor = total('board.floor', 0);
        const actual = query<number>('league.finalRank', 0);
        if (actual === 0) return;

        const clubs = query<number>('league.clubCount', 18);
        const bar = barFor(board, {
          level: query<number>('league.level', 3),
          budgetRank: query<number>('league.budgetRank', Math.ceil(clubs / 2)),
          clubs
        });

        const verdict = judgeSeason(
          board,
          {
            season,
            expected: bar.rank,
            actual,
            demand: bar.demand,
            promoted: query<boolean>('league.promoted', false),
            relegated: query<boolean>('league.relegated', false),
            disaster: isDisaster(actual, bar.input)
          },
          floor
        );

        emit({
          source: 'board',
          severity: verdict.delta > 0 ? 'good' : verdict.delta < 0 ? 'bad' : 'info',
          title:
            verdict.delta > 0
              ? `${bar.demand} — der Aufsichtsrat ist zufrieden`
              : verdict.delta < 0
                ? `${bar.demand} verfehlt`
                : 'Der Aufsichtsrat nimmt die Saison zur Kenntnis',
          detail: `Erwartet: Platz ${bar.rank}. Geworden: Platz ${actual}. Vertrauen ${Math.round(board.trust)} %.`,
          goto: 'board'
        });

        /*
         * A season can end the job on its own, without an ultimatum first — and
         * that is correct where the matchday drip is not. An ultimatum is
         * eight matchdays of a stated target; a relegation is not something a
         * board needs eight more matchdays to think about.
         */
        if (shouldSack(board)) {
          board.sacked = true;
          board.ultimatum = null;
          emit({
            source: 'board',
            severity: 'bad',
            title: 'Freistellung',
            detail: `${cast.board!.name} hat die Zusammenarbeit beendet.`,
            goto: 'board'
          });
        }
      }
    }
  }
});

export { statusOf, bandFor, boardContent };
