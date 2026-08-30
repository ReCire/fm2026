import { defineDocs } from '$lib/docs/registry';

export const contractsDocs = defineDocs({
  'contracts.expiring': {
    label: 'Läuft bald aus',
    tooltip: 'Spieler mit weniger als sieben Spieltagen Vertrag. Ohne Verlängerung gehen sie ablösefrei.',
    why: 'Ein Kader ist etwas, das man pflegt, nicht etwas, das man besitzt — diese Zahl ist die Erinnerung daran.',
    since: '0.3.0',
    related: ['contracts.renewShort', 'contracts.departures']
  },
  'contracts.departures': {
    label: 'Abgänge (Saison)',
    tooltip: 'Spieler, die diese Saison ablösefrei gegangen sind, weil ihr Vertrag ausgelaufen ist.',
    why: 'Ein Blitzverkauf bringt wenigstens Geld. Ein ausgelaufener Vertrag bringt nichts — diese Liste macht sichtbar, was das gekostet hat.',
    since: '0.3.0',
    related: ['contracts.expiring']
  },
  'contracts.renewShort': {
    label: '+1 Saison',
    tooltip: 'Verlängert um 34 Spieltage. Kostet eine Sofortzahlung und erhöht das Gehalt — mehr, je besser und je jünger der Spieler ist.',
    manual: '## Verlängern\n\nJede Verlängerung hat zwei Preise: eine Sofortzahlung und ein höheres Gehalt ab sofort. Wie viel höher, hängt von zwei Dingen ab — wie gut der Spieler schon ist, und wie jung.\n\nEin guter, junger Spieler weiß, dass sein Preis nur steigen wird, und verhandelt entsprechend. Ein alter Spieler ist froh über einen weiteren Vertrag und lässt mit sich reden — bis hin zu einer Gehaltssenkung.',
    why: 'Ohne diese Kopplung wäre Verlängern immer die richtige Antwort. So ist Halten der besten, jüngsten Spieler bewusst die teuerste Entscheidung im Kader — genau die, die am meisten zählt.',
    since: '0.3.0',
    related: ['contracts.renewLong', 'squad.wage'],
    screenshot: 'contracts-renew'
  },
  'contracts.renewLong': {
    label: '+2 Saisons',
    tooltip: 'Verlängert um 68 Spieltage — doppelte Laufzeit, doppelte Sofortzahlung, gleiche Gehaltsforderung.',
    why: 'Gibt Planungssicherheit einen Preis: länger binden heißt mehr zahlen, jetzt, für Ruhe später.',
    since: '0.3.0',
    related: ['contracts.renewShort']
  }
});
