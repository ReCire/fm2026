import { defineModule } from '$lib/engine/module';
import { CupSchema, createCup, CUP_VERSION } from './state';
import {
  drawBracket, resolveTie, winnerOf, roundDueAt, tieFor, nextRound,
  roundName, prizeFor, strengthOf, scoreline, ROUNDS
} from './rules';
import { teamById } from '../league/rules';
import { cupContent } from './content';
import { postToLedger } from '../finance/module';

const nameOf = (league: Parameters<typeof teamById>[0], id: string) =>
  teamById(league, id)?.name ?? 'Unbekannt';

export default defineModule({
  id: 'cup',
  title: 'Pokal',
  summary: 'Der nationale Pokal: ein Spiel, kein Rückspiel, und du bist raus.',
  nav: { group: 'Sport', icon: '🏆', order: 30 },
  requires: ['league', 'finance'],
  /*
   * Deliberately NOT gated.
   *
   * It sat behind `gatedBy('cup')` for an hour, seventh in the unlock ladder,
   * which meant it opened around matchday 21 — while its first round is played
   * before matchday 4. A whole season would have passed with the competition
   * doing nothing, and the screen saying the draw was still to come.
   *
   * The deeper reason is that a national cup is not a department you build. You
   * do not unlock being entered into it; every club in the country is in it
   * from the first season, and the small club being drawn against a big one is
   * the entire appeal.
   */

  state: { schema: CupSchema, create: createCup, version: CUP_VERSION },

  hooks: {
    /*
     * The Pokal is played midweek — and, more to the point, `league` resolves
     * every fixture in the entire pyramid during the matchday tick's `sim`
     * phase. A second competition in the same tick would be two systems
     * deciding what happened to the same clubs on the same day. The `week` tick
     * has no fixtures in it and is exactly the right home.
     */
    week: {
      phase: 'sim',
      order: 20,
      run({ state, rng, emit }) {
        const cup = state.modules.cup;
        const league = state.modules.league;
        const us = league.playerClubId;

        // A new season means a new bracket, and everyone is back in it.
        if (cup.season !== state.meta.season) {
          cup.season = state.meta.season;

          /*
           * Unless the campaign has already started without us — the first
           * round is played before matchday 4, so a career or an unlock that
           * arrives later has missed it. Entering at the quarter-final is not a
           * cup run; waiting for the next draw is.
           */
          if (state.meta.matchday > cupContent.roundMatchdays[0]!) {
            cup.rounds = [];
            cup.active = false;
            return;
          }
          cup.rounds = drawBracket(rng, league);
          cup.roundIndex = 0;
          cup.active = true;

          const ours = tieFor(cup.rounds[0], us);
          if (ours) {
            const opponent = ours.homeId === us ? ours.awayId : ours.homeId;
            emit({
              source: 'cup',
              severity: 'info',
              title: `Pokalauslosung: ${nameOf(league, opponent)}`,
              detail: `${roundName(0)} — ${ours.homeId === us ? 'Heimspiel' : 'Auswärts'}.`,
              goto: 'cup'
            });
          }
        }

        /*
         * A tie is played on the week BEFORE its league matchday. `meta.matchday`
         * still points at the fixture this week is preparing for, because the
         * clock only advances it on a matchday tick.
         */
        const due = roundDueAt(state.meta.matchday);
        if (due === null) return;

        const round = cup.rounds[due];
        if (!round || round.completed) return;

        const ourTie = tieFor(round, us);
        round.pairings = round.pairings.map((p) =>
          resolveTie(rng, p, strengthOf(league, cup, p.homeId), strengthOf(league, cup, p.awayId))
        );
        round.completed = true;
        cup.roundIndex = due;

        if (ourTie) {
          const played = tieFor(round, us)!;
          const opponent = played.homeId === us ? played.awayId : played.homeId;
          const won = winnerOf(played) === us;

          if (won) {
            const prize = prizeFor(due);
            postToLedger(state.modules.finance, {
              season: state.meta.season,
              matchday: state.meta.matchday,
              source: 'cup',
              reason: `Pokal — ${roundName(due)}`,
              amount: prize
            });
            const isFinal = due === ROUNDS - 1;
            if (isFinal) cup.titles += 1;
            emit({
              source: 'cup',
              severity: 'good',
              title: isFinal
                ? `Pokalsieger! ${scoreline(played)} gegen ${nameOf(league, opponent)}`
                : `${roundName(due)} gewonnen: ${scoreline(played)}`,
              detail: isFinal
                ? `Der ${cup.titles}. Titel des Vereins.`
                : `Gegen ${nameOf(league, opponent)}. Weiter ins ${roundName(due + 1)}.`,
              amount: prize,
              goto: 'cup'
            });
          } else {
            cup.active = false;
            emit({
              source: 'cup',
              severity: 'bad',
              title: `Pokal-Aus: ${roundName(due)}`,
              detail: `${scoreline(played)} gegen ${nameOf(league, opponent)}.`,
              goto: 'cup'
            });
          }
        }

        const following = nextRound(league, round);
        if (following) cup.rounds[following.roundIndex] = following;
      }
    },

    /*
     * Cache our own strength on the matchday that just published it.
     *
     * The context bus lives for exactly one tick — a `week` tick gets a fresh,
     * empty one — so a cup tie resolved on a week tick cannot read
     * `squad.strength`. Without this it would fall back to the stored table
     * figure and the eleven you picked would not affect your cup run, which is
     * the same "published in the wrong phase" failure that once made the
     * lineup irrelevant to the league.
     */
    matchday: {
      phase: 'post',
      order: 20,
      consumes: ['squad.strength'],
      run({ state, query }) {
        const published = query<number>('squad.strength', 0);
        if (published > 0) state.modules.cup.playerStrength = published;
      }
    }
  }
});
