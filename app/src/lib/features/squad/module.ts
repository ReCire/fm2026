import { defineModule } from '$lib/engine/module';
import { SquadSchema, createSquad, SQUAD_VERSION } from './state';
import { applyPostMatch, autoLineup, wageBill, teamStrength, isAvailable } from './rules';
import { postToLedger } from '../finance/module';

export default defineModule({
  id: 'squad',
  title: 'Kader',
  summary: 'Spieler, Aufstellung, Fitness, Verletzungen und die Gehaltsabrechnung.',
  nav: { group: 'Sport', icon: '👥', order: 10, primary: true },
  requires: ['finance'],

  state: { schema: SquadSchema, create: createSquad, version: SQUAD_VERSION },

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
    matchday: [{
      phase: 'post',
      consumes: ['squad.fitnessLoss', 'squad.injuryRisk', 'squad.injuryDuration'],
      run({ state, rng, emit, factor }) {
        const squad = state.modules.squad;

        if (squad.lineup.length < 11) squad.lineup = autoLineup(squad);

        // Doctrine and staff modify these; they arrive as plain multipliers so
        // squad never needs to know those systems exist.
        // Doctrine and staff will modify these too; they arrive as plain
        // multipliers so squad never needs to know those systems exist.
        const outcome = applyPostMatch(squad, rng, {
          injuryRiskMultiplier: factor('squad.injuryRisk'),
          fitnessLossMultiplier: factor('squad.fitnessLoss'),
          injuryDurationMultiplier: factor('squad.injuryDuration')
        });


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
      run({ state, emit }) {
        const squad = state.modules.squad;
        const bill = wageBill(squad);
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
