import { defineModule } from '$lib/engine/module';
import { LeagueSchema, createLeague, LEAGUE_VERSION, migrateLeague } from './state';
import {
  applyPromotionRelegation,
  levelName,
  playMatchday,
  playerFixture,
  rankOfId,
  seasonOutcome, developClubs, teamById, budgetRank, points } from './rules';
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
        'league.level', 'league.result', 'league.clubName',
        'league.rank', 'league.budgetRank', 'league.clubCount'
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

        /*
         * The club's own name, published rather than imported.
         *
         * Press needs it for every headline and the matchday screen already
         * looks it up directly — which is fine for a screen and wrong for a
         * tick hook, because an editor rename has to reach both and only one
         * of them re-derives. League owns the club list, so league answers.
         */
        provide(
          'league.clubName',
          teamById(league, league.playerClubId)?.name ?? 'Dein Verein'
        );


        const rank = rankOfId(league.levels[league.playerLevel] ?? [], league.playerClubId);
        provide('league.rank', rank);
        provide('league.budgetRank', budgetRank(league));
        provide('league.clubCount', (league.levels[league.playerLevel] ?? []).length);

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
    /*
     * Who is in Europe, published in August.
     *
     * `inEurope` is written at the END of the previous season and read at the
     * START of this one, which is the one direction the flag has ever been
     * meant to travel. Europe draws its groups off this and nothing else.
     */
    seasonStart: {
      phase: 'world',
      order: 1,
      provides: ['league.inEurope'],
      run({ state, provide }) {
        provide('league.inEurope', state.modules.league.inEurope);
      }
    },

    seasonEnd: {
      phase: 'world',
      /*
       * Ordered before the boardroom's own seasonEnd hook, which is what turns
       * these four numbers into a verdict. Published rather than recomputed
       * there, because `applyPromotionRelegation` runs in this same hook and
       * the table stops meaning what it meant the moment it does — a consumer
       * deriving the final rank afterwards would read next season's division.
       */
      order: 1,
      provides: [
        'league.finalRank', 'league.promoted', 'league.relegated',
        'league.budgetRank', 'league.clubCount', 'league.level'
      ],
      run({ state, emit, provide, rng }) {
        const league = state.modules.league;
        const outcome = seasonOutcome(league);


        provide('league.level', league.playerLevel);
        provide('league.finalRank', outcome.rank);
        provide('league.promoted', outcome.promoted);
        provide('league.relegated', outcome.relegated);

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

        /*
         * The table as it finished, captured BEFORE anybody moves. Everything
         * below reads from this rather than from `league`, because
         * `applyPromotionRelegation` resets every record and redraws the
         * fixtures — a review built afterwards describes next season.
         */
        /*
         * Our strength for the Relegation legs. `squad.strength` is published
         * on the matchday tick, not this one, so the tie is played against the
         * club's paper strength — which is right: the eleven that plays a
         * play-off in May is the eleven the season was played with, and there
         * is no lineup screen between the last fixture and the tie.
         */
        const ourStrength = undefined;
        const us = teamById(league, league.playerClubId);
        const finished = us
          ? {
              level: league.playerLevel,
              levelName: levelName(league.playerLevel),
              rank: outcome.rank,
              points: points(us),
              won: us.won,
              drawn: us.drawn,
              lost: us.lost,
              goalsFor: us.goalsFor,
              goalsAgainst: us.goalsAgainst
            }
          : null;

        // Moves every club in the pyramid, resets the tables and draws a new
        // schedule. Deliberately after the events above, which describe the
        // season that just ended.
        const { movements, ties } = applyPromotionRelegation(league, rng, ourStrength);

        /*
         * Our tie, if we were in one. `direction` is what the celebration
         * needs: surviving a Relegation as the higher-division side and
         * winning one as the challenger are both relief, and only one of them
         * is a promotion.
         */
        const ourTie = ties.find(
          (t) => t.challenger.id === league.playerClubId || t.defender.id === league.playerClubId
        );
        const wereChallenger = ourTie?.challenger.id === league.playerClubId;

        if (finished) {
          const wonPlayoff = ourTie
            ? wereChallenger
              ? ourTie.challengerWon
              : !ourTie.challengerWon
            : false;
          league.review = {
            season: state.meta.season,
            ...finished,
            champion: finished.rank === 1,
            promoted: outcome.promoted || (!!ourTie && wereChallenger && wonPlayoff),
            relegated: outcome.relegated || (!!ourTie && !wereChallenger && !wonPlayoff),
            europe: outcome.europe,
            playoff: ourTie
              ? {
                  opponent: (wereChallenger ? ourTie.defender : ourTie.challenger).name,
                  opponentLevel: wereChallenger ? finished.level - 1 : finished.level + 1,
                  legs: ourTie.legs.map((l) => ({ ...l })),
                  aggregate: wereChallenger
                    ? [ourTie.aggregate[0], ourTie.aggregate[1]]
                    : [ourTie.aggregate[1], ourTie.aggregate[0]],
                  won: wonPlayoff,
                  onPenalties: ourTie.onPenalties,
                  direction: wereChallenger ? 'up' : 'down'
                }
              : null
          };

          if (ourTie) {
            const won = league.review.playoff!.won;
            emit({
              source: 'league',
              severity: won ? 'good' : 'bad',
              title: won ? 'Relegation überstanden' : 'Relegation verloren',
              detail: `${league.review.playoff!.aggregate[0]}:${league.review.playoff!.aggregate[1]} gegen ${league.review.playoff!.opponent}${ourTie.onPenalties ? ' n. E.' : ''}.`,
              goto: 'league'
            });
          }
        }
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
