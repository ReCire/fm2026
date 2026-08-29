import { z } from 'zod';
import { defineModule } from '$lib/engine/module';
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
  phase: z.enum(['week', 'matchday'])
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
      run({ state }) { state.modules.core.phase = 'matchday'; }
    },
    matchday: {
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
