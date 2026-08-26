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
  lastSeenReport: z.number().int()
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
    create: () => ({ soundOn: false, lastSeenReport: 0 }),
    version: 1
  },
  docs: defineDocs({
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
