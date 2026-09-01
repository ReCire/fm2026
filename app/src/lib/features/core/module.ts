import { z } from 'zod';
import { defineModule } from '$lib/engine/module';
import type { GameState } from '$lib/engine/state';
import { MATCHDAYS_PER_SEASON } from '../league/content';

/**
 * Whether there is nothing left to play this season.
 *
 * Greater-than rather than equal-to, deliberately. Every save that existed
 * before the season roll did is stranded PAST the boundary — the clock kept
 * incrementing while league's hook returned early, so a career that finished
 * its fixtures sat at matchday 41 and rising. An equality check would rescue
 * new careers and leave every existing one exactly as stuck as it was.
 */
function seasonIsOver(state: GameState): boolean {
  return state.meta.matchday > MATCHDAYS_PER_SEASON;
}
import { defineDocs } from '$lib/docs/registry';

/**
 * Controls that belong to the game itself rather than to any one feature —
 * advancing time, undo, saving. Kept as a module so that even the shell's
 * buttons pass the documentation gate.
 */
export const CoreSchema = z.object({
  soundOn: z.boolean(),
  lastSeenReport: z.number().int(),
  /**
   * Where in the week the player is standing.
   *
   * The game used to be a single button that played a match, so there was
   * nowhere to BE between two Saturdays — training, news and offers had no
   * moment to arrive in. The phase alternates: a training week, then the match
   * it was preparing for. Nothing else in the engine knows about it; modules
   * hook `week` or `matchday` and stay ignorant of the sequence.
   */
  phase: z.enum(['week', 'matchday', 'seasonEnd'])
});
export type CoreState = z.infer<typeof CoreSchema>;

declare module '$lib/engine/state' {
  interface ModuleStates {
    core: CoreState;
  }
}

export default defineModule({
  id: 'core',
  title: 'Spiel',
  summary: 'Spielsteuerung: Spieltag, Rückgängig, Speicherstände.',
  state: {
    schema: CoreSchema,
    create: () => ({ soundOn: false, lastSeenReport: 0, phase: 'week' as const }),
    version: 2,
    /** v2 adds `phase`. A save from v1 was mid-week by definition — there was
        no other place to be. */
    migrate: (old: unknown): CoreState => {
      const base = old as Partial<CoreState>;
      return {
        soundOn: base.soundOn ?? false,
        lastSeenReport: base.lastSeenReport ?? 0,
        phase: base.phase ?? 'week'
      };
    }
  },

  /*
   * The alternation, in one place.
   *
   * `world` is the last phase of a tick, so every module has already run and
   * the flip cannot change what any of them saw. Putting it here rather than in
   * the UI means a tick advanced from anywhere — a test, a debug panel, an
   * autopilot — moves the week along too.
   */
  hooks: {
    week: {
      phase: 'world',
      order: 99,
      run({ state }) {
        /*
         * A week is followed by a matchday, unless the fixtures have run out.
         *
         * The check lives here rather than in the shell because `core.phase`
         * is what every surface reads, and a player who reaches the end of the
         * season inside a training week must not be handed a matchday button
         * that plays nothing. That is precisely what happened: the loop only
         * knew two steps, so past the last fixture the game offered a match
         * every week and league's hook returned early on every one of them.
         */
        state.modules.core.phase = seasonIsOver(state) ? 'seasonEnd' : 'matchday';
      }
    },
    matchday: {
      phase: 'world',
      order: 99,
      run({ state }) {
        state.modules.core.phase = seasonIsOver(state) ? 'seasonEnd' : 'week';
      }
    },

    /*
     * A new season opens on a training week.
     *
     * Without this the phase stays on `seasonEnd` forever: only `week` and
     * `matchday` ticks flipped it, so the first click after a season boundary
     * ended ANOTHER season, and the one after that a third. Four seasons went
     * by in four clicks with nothing played — every table empty, every review
     * reporting zero points, and the career advancing at a season per button
     * press.
     *
     * It survived the test written to catch the original stuck loop, because
     * that test asserted `played === 0` after a season change under a comment
     * claiming the full card had been played. The assertion was true of a
     * season nobody played.
     */
    seasonStart: {
      phase: 'world',
      order: 99,
      run({ state }) { state.modules.core.phase = 'week'; }
    }
  },

  /*
   * Declared inline rather than in a docs.ts, because `core` has no folder of
   * its own beyond this file — these are the shell's controls, not a feature's.
   * An explicit `docs` always wins over discovery, which is why this still
   * works after the plumbing was removed everywhere else.
   */
  docs: defineDocs({
    'game.week': {
      label: '▶ Woche trainieren',
      tooltip: 'Lässt die Trainingswoche vor dem nächsten Spiel ablaufen: Entwicklung, Erholung, Nachrichten und Angebote.',
      manual: '## Die Woche davor\n\nZwischen zwei Spieltagen liegt eine Trainingswoche. Sie ist der Ort, an dem deine Entscheidungen wirken, bevor das Spiel sie prüft: der Trainingsschwerpunkt formt deine Spieler, die Intensität handelt Fortschritt gegen Fitness und Verletzungsrisiko, und die Post bringt, was die Welt von dir will.\n\nDu kannst die Woche nicht überspringen. Sie ist kein Ladebildschirm, sondern die Hälfte des Spiels.',
      why: 'Ohne die Woche war ein Spieltag ein Knopf: Ergebnis, nächster Knopf. Die Woche gibt jeder Entscheidung einen Zeitpunkt und dem Spieltag etwas, worauf er die Antwort ist.',
      since: '0.2.0',
      related: ['game.advance', 'training.intensity']
    },
    'game.advance': {
      label: '▶ Spieltag simulieren',
      tooltip: 'Spielt den nächsten Spieltag ab: Spiel, Verletzungen, Einnahmen und Ausgaben aller Bereiche.',
      manual: '## Der Spieltag\n\nEin Spieltag ist die Zeiteinheit des Spiels. Beim Simulieren laufen alle Systeme in einer festen Reihenfolge ab — erst die Vorbereitung, dann das Spiel, dann die sportlichen Folgen, dann die Wirtschaft, zuletzt die Außenwelt.\n\nAlles, was dabei passiert, landet im Spieltagsbericht. Es gibt keine Meldung, die dich unterbricht.',
      why: 'Eine einzige Uhr für das ganze Spiel. Jedes System hängt sich an diesen Takt, statt sich gegenseitig aufzurufen — dadurch lässt sich ein Bereich hinzufügen oder entfernen, ohne die anderen anzufassen.',
      since: '0.1.0',
      related: ['game.undo', 'finance.ledger'],
      screenshot: 'dashboard-after-matchday'
    },
    'game.seasonEnd': {
      label: '🏆 Saison abschließen',
      tooltip:
        'Beendet die Saison: Auf- und Abstieg, Relegation, auslaufende Verträge, Jugendaufrückungen und das Urteil des Aufsichtsrats.',
      manual: '## Saisonabschluss\n\nNach dem letzten Spieltag steht kein Spiel mehr an, sondern der Saisonabschluss. Er ist ein einziger Schritt und lässt sich nicht überspringen — an ihm hängt alles, was nur einmal im Jahr passiert.\n\n**Auf- und Abstieg** nach deutschem Vorbild: Die ersten zwei einer Liga steigen direkt auf, die letzten zwei steigen direkt ab. Der Dritte der unteren Liga und der Sechzehnte der oberen spielen die **Relegation** über zwei Spiele um den letzten Platz — Hinspiel beim Höherklassigen, Rückspiel beim Herausforderer. Steht es nach beiden Spielen unentschieden, entscheiden Verlängerung und Elfmeterschießen; die Auswärtstorregel gibt es nicht mehr.\n\nAußerdem: auslaufende Verträge, Jugendspieler, die in den Profikader aufrücken, das Urteil des Aufsichtsrats über die Saison, und die Auslosung des Champions Cup für das kommende Jahr.',
      why: 'Der Schritt hat lange gefehlt, und zwar vollständig: Die Oberfläche kannte nur „Woche" und „Spieltag", also lief die Uhr nach dem letzten Spieltag einfach weiter, ohne dass irgendetwas geschah. Sechs Bereiche haben einen Saisonabschluss-Hook, und keiner davon ist außerhalb der Tests je gelaufen. Er ist bewusst EIN Schritt und nicht zwei: zwischen „Saison beendet" und „neue Saison ausgelost" gibt es keinen Zustand, in dem ein Spieler stehen sollte.',
      since: '0.9.0',
      related: ['game.advance', 'league.table', 'board.trust']
    },
    'game.undo': {
      label: '↩ Spieltag zurücknehmen',
      tooltip: 'Macht den letzten Spieltag rückgängig und stellt den Stand davor wieder her.',
      why: 'Jeder Spieltag legt vorher einen vollständigen Zustands-Schnappschuss an. Das kostet wenig, weil nur pro Spieltag gesichert wird und nicht bei jeder Aktion — und es macht Ausprobieren risikofrei.',
      since: '0.1.0',
      related: ['game.advance']
    },
    'game.newGame': {
      label: 'Neues Spiel',
      tooltip: 'Startet eine neue Karriere. Der aktuelle Spielstand geht dabei verloren, sofern er nicht gespeichert wurde.',
      why: 'Jede Karriere hat einen Startwert (Seed). Derselbe Seed erzeugt exakt dieselbe Welt — nützlich zum Testen und für Fehlerberichte.',
      since: '0.1.0',
      related: ['game.advance']
    }
  })
});
