import { defineModule } from '$lib/engine/module';
import { LeagueSchema, createLeague, LEAGUE_VERSION, migrateLeague } from './state';
import {
  applyPromotionRelegation,
  levelName,
  playMatchday,
  playerFixture,
  rankOfId,
  seasonOutcome, developClubs } from './rules';
import { leagueContent, MATCHDAYS_PER_SEASON } from './content';
import { postToLedger, formatMoney } from '../finance/module';

export default defineModule({
  id: 'league',
  title: 'Liga',
  summary: 'Die vierstufige Pyramide: Spielplan, Tabelle, Auf- und Abstieg.',
  nav: { group: 'Sport', icon: '🏆', order: 20, primary: true },
  requires: ['finance'],

  state: {
    schema: LeagueSchema, create: createLeague,
    version: LEAGUE_VERSION, migrate: migrateLeague
  },

  hooks: {
    /*
     * Everyone else trains too.
     *
     * `world` — last in the tick, after nothing that reads a table strength
     * this week. Without this the rest of the pyramid was frozen for the life
     * of a career while the player's squad improved every single week.
     */
    week: {
      phase: 'world',
      order: 10,
      /*
       * Which division we are in is a fact about the club, not about a match,
       * and it is read on the week as well — `linkedout` sizes its contact
       * pool by it, `merch` and `sponsors` by theirs on the matchday. It was
       * published on the matchday tick only, so a week-tick consumer found no
       * producer and the registry refused to boot.
       *
       * Third time this week: an effect must exist on every tick kind that
       * reads it. The check catches it every time, which is the point, but it
       * keeps being written.
       */
      provides: ['league.level'],
      run({ state, rng, provide }) {
        provide('league.level', state.modules.league.playerLevel);
        developClubs(state.modules.league, rng);
      }
    },
    /**
     * The whole pyramid plays its round in the `sim` phase — before anything
     * reacts to it. Stadium needs to know whether we were at home before it
     * counts gate receipts in `economy`, so the answer is published here.
     */
    matchday: {
      phase: 'sim',
      consumes: ['squad.strength', 'matchday.goalChance', 'league.opponentPenalty'],
      provides: [
        'league.isHome', 'league.opponent', 'league.opponentStrength',
        'league.level', 'league.result'
      ],
      run({ state, rng, emit, query, provide, total }) {
        const league = state.modules.league;
        const matchday = state.meta.matchday;

        if (matchday > MATCHDAYS_PER_SEASON) return;

        const upcoming = playerFixture(league, matchday);
        if (upcoming) {
          provide('league.isHome', upcoming.isHome);
          provide('league.opponent', upcoming.opponent);
          provide('league.opponentStrength', upcoming.opponentStrength);
        }
        provide('league.level', league.playerLevel);

        // If some module has already published the strength of the eleven this
        // tick, our own fixture uses it; otherwise the stored table strength
        // stands in. Either way league does not import squad.
        /*
         * A doctrine that makes every opponent weaker — the intelligence and
         * dark-arts nodes. Applied to the strength we take in rather than to
         * theirs, because `playMatchday` resolves the WHOLE pyramid and
         * weakening every club in the country would also weaken the three
         * clubs above us in the table. The effect the player was sold is
         * "easier for us", not "worse football everywhere".
         */
        const penalty = total('league.opponentPenalty');
        const published = query<number>('squad.strength', -1);
        const report = playMatchday(
          league,
          matchday,
          rng,
          published > 0 ? published + penalty : undefined,
          query<number>('matchday.goalChance', 1)
        );

        const us = report.player;
        if (!us) return;

        // Publish the result rather than leaving consumers to derive it from
        // the cumulative table. Subtracting stored history to recover one
        // matchday's goals breaks the moment that history is capped or spans a
        // season boundary — and it would break silently, as a wrong scoreline.
        provide('league.result', {
          goalsFor: us.goalsFor,
          goalsAgainst: us.goalsAgainst,
          isHome: us.isHome,
          opponent: us.opponent
        });

        const rank = rankOfId(league.levels[league.playerLevel] ?? [], league.playerClubId);
        emit({
          source: 'league',
          severity: us.result === 'win' ? 'good' : us.result === 'loss' ? 'bad' : 'info',
          title: `${us.isHome ? 'Heimspiel' : 'Auswärts'} gegen ${us.opponent}: ${us.goalsFor}:${us.goalsAgainst}`,
          detail: `${levelName(league.playerLevel)} — Platz ${rank} nach Spieltag ${matchday}.`,
          goto: 'league'
        });
      }
    },

    /**
     * Season end. Runs in `world`, after every module has closed its books, so
     * the promotion bonus lands on a settled balance rather than a half-built
     * one — and so the table that decides promotion is final.
     */
    seasonEnd: {
      phase: 'world',
      run({ state, emit }) {
        const league = state.modules.league;
        const outcome = seasonOutcome(league);

        if (outcome.europe && !league.inEurope) {
          league.inEurope = true;
          emit({
            source: 'league',
            severity: 'good',
            title: 'Europapokal erreicht',
            detail: `Platz ${outcome.rank} in der ${outcome.levelName} — nächste Saison international.`,
            goto: 'league'
          });
        } else if (!outcome.europe) {
          league.inEurope = false;
        }

        if (outcome.promoted) {
          postToLedger(state.modules.finance, {
            season: state.meta.season,
            matchday: state.meta.matchday,
            source: 'league',
            reason: 'Aufstiegsprämie',
            amount: leagueContent.promotionBonus
          });
          emit({
            source: 'league',
            severity: 'good',
            title: `Aufstieg in die ${levelName(outcome.level - 1)}`,
            detail: `Platz ${outcome.rank} in der ${outcome.levelName}. Prämie ${formatMoney(leagueContent.promotionBonus)}.`,
            amount: leagueContent.promotionBonus,
            goto: 'league'
          });
        } else if (outcome.relegated) {
          emit({
            source: 'league',
            severity: 'bad',
            title: `Abstieg in die ${levelName(outcome.level + 1)}`,
            detail: `Platz ${outcome.rank} in der ${outcome.levelName} — die Klasse wurde nicht gehalten.`,
            goto: 'league'
          });
        } else if (outcome.rank > 0) {
          emit({
            source: 'league',
            severity: 'info',
            title: `Saison beendet: Platz ${outcome.rank}`,
            detail: `${outcome.levelName} — die Liga wird gehalten.`,
            goto: 'league'
          });
        }

        // Moves every club in the pyramid, resets the tables and draws a new
        // schedule. Deliberately after the events above, which describe the
        // season that just ended.
        const movements = applyPromotionRelegation(league);
        const neighbours = movements.filter(
          (m) => (m.direction === 'up' ? m.to : m.from) === league.playerLevel
        );
        if (neighbours.length > 0) {
          emit({
            source: 'league',
            severity: 'info',
            title: `Neue Konkurrenz in der ${levelName(league.playerLevel)}`,
            detail: neighbours.map((m) => m.team).join(', '),
            goto: 'league'
          });
        }
      }
    }
  }
});

/** Narrow public surface for modules that declare `requires: ['league']`. */
export { opponentStrength, playerFixture, levelName, standings } from './rules';
