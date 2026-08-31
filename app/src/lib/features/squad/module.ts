import { defineModule } from '$lib/engine/module';
import { SquadSchema, createSquad, SQUAD_VERSION, migrateSquad } from './state';
import { applyPostMatch, autoLineup, wageBill, teamStrength, isAvailable } from './rules';
import { postToLedger } from '../finance/module';
import { bestFor, NO_TALENT } from '$lib/content/talents';

export default defineModule({
  id: 'squad',
  title: 'Kader',
  summary: 'Spieler, Aufstellung, Fitness, Verletzungen und die Gehaltsabrechnung.',
  nav: { group: 'Sport', icon: '👥', order: 10, primary: true },
  requires: ['finance'],

  state: {
    schema: SquadSchema, create: createSquad,
    version: SQUAD_VERSION, migrate: migrateSquad
  },

  /*
   * The reference implementation of `attention`. Two things to copy:
   *
   * Each line names a DECISION, not a fact. "3 Spieler verletzt" tells you
   * something true and leaves you to work out whether it matters; "Kader unter
   * Mindestbesetzung" tells you there is something to do. The badge is a call
   * to the screen, so it has to be worth the trip.
   *
   * And it returns nothing when nothing is waiting. A department that always
   * carries a badge has taught the player to ignore badges.
   */
  attention: (state) => {
    const squad = state.modules.squad;
    const items = [];
    const available = squad.players.filter(isAvailable).length;

    if (available < 11) {
      items.push({
        id: 'squad.short',
        urgency: 'now' as const,
        label: `Kader unter Mindestbesetzung — nur ${available} einsatzbereit`
      });
    }
    if (squad.lineup.length < 11) {
      items.push({
        id: 'squad.lineup',
        urgency: 'now' as const,
        label: 'Keine Aufstellung für das nächste Spiel'
      });
    }
    if (!squad.captainId) {
      items.push({ id: 'squad.captain', urgency: 'soon' as const, label: 'Kein Kapitän benannt' });
    }
    const tired = squad.players.filter((p) => p.injured === 0 && p.fitness < 55).length;
    if (tired >= 5) {
      items.push({
        id: 'squad.tired',
        urgency: 'soon' as const,
        label: `${tired} Spieler ausgelaugt — Trainingsintensität prüfen`
      });
    }
    return items;
  },

  hooks: {
    /*
     * Talents are earned, and this is where a career turns into a name.
     *
     * On the WEEK, after training has moved the numbers: every predicate in the
     * catalogue tests a change or a duration, so the moment worth checking is
     * the one just after a player has changed. Checking on matchday would award
     * the same thing a week later for no reason a player could see.
     *
     * Only players who do not already carry one are considered. A talent is a
     * name, a player has one name, and re-evaluating a man who already has his
     * would let a rarer talent quietly replace a rarer one he had earned first.
     */
    /*
     * Another season in the shirt. Six predicates in the talent catalogue read
     * `seasonsHere`, and loyalty is the one thing in there that cannot be
     * trained for — so without this, six of nineteen could never fire.
     */
    seasonEnd: {
      phase: 'world',
      order: 10,
      run({ state }) {
        for (const p of state.modules.squad.players) p.record.seasonsHere += 1;
      }
    },

    week: {
      phase: 'post',
      order: 40,
      run({ state, emit }) {
        const squad = state.modules.squad;
        const awarded = new Set(squad.awardedTalents);

        for (const player of squad.players) {
          if (player.trait !== NO_TALENT) continue;
          const talent = bestFor(player, player.record, awarded);
          if (!talent) continue;

          player.trait = talent.name;
          if (talent.rarity === 'einmalig') {
            squad.awardedTalents.push(talent.id);
            awarded.add(talent.id);
          }

          emit({
            source: 'squad',
            severity: 'good',
            title: `${player.name}: ${talent.name}`,
            detail: talent.blurb,
            goto: 'squad'
          });
        }
      }
    },

    matchday: [{
      phase: 'post',
      consumes: [
        'squad.fitnessLoss', 'squad.injuryRisk', 'squad.injuryDuration',
        'squad.moraleFloor', 'squad.suspension', 'squad.marketValue', 'league.result'
      ],
      run({ state, rng, emit, factor, total, query }) {
        const squad = state.modules.squad;

        if (squad.lineup.length < 11) squad.lineup = autoLineup(squad);

        // Doctrine and staff modify these; they arrive as plain multipliers so
        // squad never needs to know those systems exist.
        // Doctrine and staff will modify these too; they arrive as plain
        // multipliers so squad never needs to know those systems exist.
        /*
         * The record, kept where the match is resolved.
         *
         * Half the talent catalogue reads `matches`, `seasonsHere`,
         * `cleanSheets` or `injuries`, and none of them were ever incremented —
         * so seven predicates out of nineteen could never fire, and the feature
         * would have looked merely rare instead of broken.
         */
        /*
         * Two doctrine effects that belong to the player rather than to a
         * match. Applied after the match so they land on the state everything
         * else has already finished writing.
         */
        const suspensionFactor = factor('squad.suspension');
        const valueFactor = factor('squad.marketValue');
        if (suspensionFactor !== 1 || valueFactor !== 1) {
          for (const p of squad.players) {
            if (suspensionFactor !== 1 && p.suspended > 0) {
              p.suspended = Math.max(0, Math.round(p.suspended * suspensionFactor));
            }
            if (valueFactor !== 1) p.marketValue = Math.round(p.marketValue * valueFactor);
          }
        }

        const result = query<{ goalsAgainst: number } | null>('league.result', null);
        const cleanSheet = !!result && result.goalsAgainst === 0;
        for (const p of squad.players) {
          if (!squad.lineup.includes(p.id)) continue;
          p.record.matches += 1;
          // A clean sheet belongs to whoever was defending it. Awarding it to
          // the whole eleven would make a striker's shut-out record identical
          // to his keeper's, and the one talent that reads it meaningless.
          if (cleanSheet && (p.pos === 'TW' || p.pos === 'ABW')) p.record.cleanSheets += 1;
        }

        const outcome = applyPostMatch(squad, rng, {
          injuryRiskMultiplier: factor('squad.injuryRisk'),
          fitnessLossMultiplier: factor('squad.fitnessLoss'),
          injuryDurationMultiplier: factor('squad.injuryDuration')
        });


        /*
         * A morale floor, if anything has bought one. Applied after the match
         * rather than clamped at every write: a floor is a promise about where
         * you end up, not a rule that has to be threaded through every place
         * morale moves.
         */
        const floor = total('squad.moraleFloor');
        if (floor > 0) {
          for (const p of squad.players) p.morale = Math.max(p.morale, floor);
        }

        for (const { player } of outcome.injuries) player.record.injuries += 1;

        for (const { player, matchdays } of outcome.injuries) {
          emit({
            source: 'squad',
            severity: 'bad',
            title: `${player.name} verletzt`,
            detail: `${player.pos} — fällt ${matchdays} Spieltag(e) aus. Die Elf wurde automatisch angepasst.`,
            goto: 'squad'
          });
        }
        for (const player of outcome.recovered) {
          emit({
            source: 'squad',
            severity: 'good',
            title: `${player.name} ist zurück`,
            detail: 'Wieder einsatzbereit.',
            goto: 'squad'
          });
        }
      }
    },
    {
      /** Wages are an economy cost, deliberately separate from the sporting
          post-match effects above. Two phases, one module, no coupling. */
      phase: 'economy',
      order: 20,
      consumes: ['squad.wageBill'],
      run({ state, emit, factor }) {
        const squad = state.modules.squad;
        const bill = Math.round(wageBill(squad) * factor('squad.wageBill'));
        postToLedger(state.modules.finance, {
          season: state.meta.season,
          matchday: state.meta.matchday,
          source: 'squad',
          reason: 'Spielergehälter',
          amount: -bill
        });
        if (bill > state.modules.finance.wageBudget) {
          emit({
            source: 'squad',
            severity: 'warn',
            title: 'Gehaltsbudget überschritten',
            detail: 'Die Differenz zahlt der Verein aus dem laufenden Konto.',
            amount: -bill,
            goto: 'squad'
          });
        }
      }
    }]
  }
});
