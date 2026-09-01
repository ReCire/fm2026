import { defineModule } from '$lib/engine/module';
import { EuropeSchema, createEurope, EUROPE_VERSION, PLAYER } from './state';
import {
  createTournament, groupPrize, groupRoundOf, groupsComplete, playGroupRound,
  playerIn, resolveTie, roundPrize, seedFinal, seedSemis, standings
} from './rules';
import { europeContent, clubById, copy } from './content';
import { postToLedger, formatMoney } from '../finance/module';
import { gatedBy } from '../progression/rules';

/**
 * Der Champions Cup.
 *
 * Five doctrine nodes buy `euroBonus` and every one of them is a Politik
 * synthesis — the deepest, most expensive corner of the tree, and until now it
 * paid off into a competition that did not exist. Qualification was a boolean
 * on the league with nowhere to go.
 *
 * The tournament runs whether or not the player is in it. That is the
 * prototype's decision and the right one: a competition that only exists in
 * the seasons you are in it never gets a chance to mean anything, and watching
 * Mersey City win it twice while you are stuck in the third division is what
 * makes qualifying land.
 */

/** The club's own name for an event line — ours is not in the content table. */
function nameOf(clubId: string, ourName: string): string {
  return clubId === PLAYER ? ourName : clubById.get(clubId)?.name ?? clubId;
}

export default defineModule({
  id: 'europe',
  title: 'Champions Cup',
  summary:
    'Zwei Gruppen, zwei Halbfinals, ein Finale — und der einzige Ort, an dem sich die Politik-Synthesen auszahlen.',
  nav: { group: 'Sport', icon: '🌍', order: 30 },
  requires: ['league', 'finance'],
  /*
   * Gated, and the ladder test is what insisted. `erbe` spends a rung on
   * `europe`, and a rung spent on a department that was already open is a
   * promotion that promises nothing — the same shape as a doctrine node whose
   * effect reaches no consumer, one layer up.
   */
  gate: gatedBy('europe'),

  state: { schema: EuropeSchema, create: createEurope, version: EUROPE_VERSION },

  hooks: {
    /*
     * The draw, once a season.
     *
     * `seasonStart` rather than `seasonEnd`, so the groups are known before the
     * first European matchday and the screen has something to show in August.
     * League decides who qualified at the END of the previous season, which is
     * why this reads a flag rather than a table.
     */
    seasonStart: {
      phase: 'world',
      order: 10,
      consumes: ['league.inEurope'],
      run({ state, rng, emit, query }) {
        const qualified = query<boolean>('league.inEurope', false);
        state.modules.europe = createTournament(rng, state.meta.season, qualified);

        emit({
          source: 'europe',
          severity: qualified ? 'good' : 'info',
          title: qualified ? 'Die Auslosung ist gemacht' : `${copy.title}: die Auslosung`,
          detail: qualified ? copy.qualified : copy.watching,
          goto: 'europe'
        });
      }
    },

    matchday: {
      phase: 'post',
      /*
       * Order 10 — after matchday's own report at 5 and before press at 20, so
       * a European night is already on the books when the papers are written.
       * `squad.strength` comes from matchday's `pre` hook, which is where the
       * eleven, the tactics and the doctrine have already been folded together.
       */
      order: 10,
      consumes: ['squad.strength', 'europe.prize'],
      run({ state, rng, emit, query, factor }) {
        const europe = state.modules.europe;
        const { season, matchday } = state.meta;
        if (europe.season !== season || europe.table.length === 0) return;

        const ourStrength = query<number>('squad.strength', 50);
        const ourName = 'Dein Verein';
        const bonus = factor('europe.prize', 1);

        /** Pay, scaled by the doctrine, and record it where it can be found. */
        const bank = (amount: number, reason: string) => {
          const paid = Math.round(amount * bonus);
          if (paid <= 0) return 0;
          europe.prizeMoney += paid;
          postToLedger(state.modules.finance, {
            season, matchday, source: 'europe', reason, amount: paid
          });
          return paid;
        };

        /* ── Group stage ────────────────────────────────────────────────── */
        if (groupRoundOf(matchday) >= 0) {
          const played = playGroupRound(europe, rng, matchday, ourStrength);
          const ours = played.find((m) => m.home === PLAYER || m.away === PLAYER);
          if (ours) {
            const isHome = ours.home === PLAYER;
            const them = nameOf(isHome ? ours.away : ours.home, ourName);
            const gf = isHome ? ours.homeGoals : ours.awayGoals;
            const ga = isHome ? ours.awayGoals : ours.homeGoals;
            const prize = groupPrize(played);
            const paid = prize ? bank(prize.amount, prize.reason) : 0;
            emit({
              source: 'europe',
              severity: gf > ga ? 'good' : gf === ga ? 'info' : 'bad',
              title: `${copy.title}: ${gf}:${ga} gegen ${them}`,
              detail: paid > 0 ? `Prämie ${formatMoney(paid)}.` : 'Keine Prämie.',
              amount: paid > 0 ? paid : undefined,
              goto: 'europe'
            });
          }

          // The last group matchday decides who is in the semis, so seed them
          // the moment the table is final rather than waiting for matchday 27.
          if (groupsComplete(europe)) seedSemis(europe);
          return;
        }

        /* ── Semi-finals ────────────────────────────────────────────────── */
        if (matchday === europeContent.semiMatchday && europe.semis.some((t) => !t.winner)) {
          for (const [i, tie] of europe.semis.entries()) {
            if (!tie.home || !tie.away || tie.winner) continue;
            europe.semis[i] = resolveTie(rng, tie.home, tie.away, ourStrength);
          }
          seedFinal(europe);

          const ourTie = europe.semis.find(playerIn);
          if (ourTie) {
            const won = ourTie.winner === PLAYER;
            const paid = bank(roundPrize('semi', won).amount, roundPrize('semi', won).reason);
            emit({
              source: 'europe',
              severity: won ? 'good' : 'bad',
              title: won ? `${copy.title}: das Finale ist erreicht` : `${copy.title}: im Halbfinale raus`,
              detail: `${ourTie.homeGoals}:${ourTie.awayGoals}${ourTie.onPenalties ? ' n. E.' : ''}. Prämie ${formatMoney(paid)}.`,
              amount: paid,
              goto: 'europe'
            });
          }
          return;
        }

        /* ── The final, which is PLAYED ─────────────────────────────────── */
        if (matchday === europeContent.finalMatchday && europe.final && !europe.final.winner) {
          const { home, away } = europe.final;
          if (!home || !away) return;
          europe.final = resolveTie(rng, home, away, ourStrength);
          europe.champion = europe.final.winner;

          if (playerIn(europe.final)) {
            const won = europe.final.winner === PLAYER;
            const prize = roundPrize('final', won);
            const paid = bank(prize.amount, prize.reason);
            emit({
              source: 'europe',
              severity: won ? 'good' : 'bad',
              title: won ? `${copy.title} GEWONNEN` : `${copy.title}: Finale verloren`,
              detail: `${europe.final.homeGoals}:${europe.final.awayGoals}${europe.final.onPenalties ? ' n. E.' : ''}. Prämie ${formatMoney(paid)}.`,
              amount: paid,
              goto: 'europe'
            });
          } else {
            emit({
              source: 'europe',
              severity: 'info',
              title: `${copy.title}: ${nameOf(europe.champion ?? '', ourName)} gewinnt`,
              detail: `${europe.final.homeGoals}:${europe.final.awayGoals}${europe.final.onPenalties ? ' n. E.' : ''}.`,
              goto: 'europe'
            });
          }
        }
      }
    }
  }
});

export { standings, playerIn, PLAYER };
