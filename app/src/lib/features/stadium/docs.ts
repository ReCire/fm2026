import { defineDocs } from '$lib/docs/registry';

export const stadiumDocs = defineDocs({
  'stadium.capacity': {
    label: 'Kapazität',
    tooltip: 'Gesamtzahl der Plätze über alle Blöcke. Bestimmt die Obergrenze deiner Zuschauereinnahmen.',
    why: 'Der Ausbau ist die klassische Wachstumsinvestition: teuer, langsam, aber dauerhaft — und der einzige Weg, Ticketeinnahmen wirklich zu skalieren.',
    since: '0.1.0',
    related: ['stadium.attendance', 'stadium.expand'],
    screenshot: 'stadium-overview'
  },
  'stadium.attendance': {
    label: 'Auslastung',
    tooltip: 'Wie voll das Stadion tatsächlich wird — zwischen 30% und 120% der Kapazität.',
    why: 'Koppelt sportlichen Erfolg an Geld: gute Stimmung füllt das Stadion, und ein volles Stadion finanziert die nächste Verstärkung.',
    since: '0.1.0',
    related: ['stadium.fans', 'stadium.comfort']
  },
  'stadium.fans': {
    label: 'Fan-Zufriedenheit',
    tooltip: 'Die Stimmung im Umfeld, 0 bis 100. Der stärkste Einzelfaktor für die Auslastung.',
    why: 'Gibt Niederlagenserien eine wirtschaftliche Konsequenz, statt sie nur in der Tabelle sichtbar zu machen.',
    since: '0.1.0',
    related: ['stadium.attendance']
  },
  'stadium.comfort': {
    label: 'Komfort-Ausbau',
    tooltip: 'Gastronomie, Fanshops und Sanitär je Block. Hebt die Auslastung um bis zu 10%.',
    why: 'Eine kleine, günstige Optimierung neben dem teuren Platzausbau — damit es auch für kleine Vereine eine sinnvolle Investition gibt.',
    since: '0.1.0',
    related: ['stadium.expand']
  },
  'stadium.expand': {
    label: 'Block ausbauen',
    tooltip: 'Erweitert diesen Block dauerhaft um zusätzliche Plätze. Wird sofort vom Vereinskonto abgebucht.',
    manual: '## Stadionausbau\n\nJeder Block lässt sich einzeln erweitern. Die Kosten fallen sofort an, die Mehreinnahmen kommen ab dem nächsten Heimspiel — der Ausbau rechnet sich also erst über mehrere Spieltage.\n\nEin Ausbau lohnt sich vor allem dann, wenn die Auslastung dauerhaft hoch ist. Bei schlechter Stimmung baust du leere Ränge.',
    why: 'Zwingt zu einer echten Timing-Entscheidung: zu früh ausbauen bindet Geld in leeren Plätzen, zu spät verschenkt Einnahmen.',
    since: '0.1.0',
    related: ['stadium.capacity', 'finance.balance'],
    screenshot: 'stadium-expand-sheet'
  },
  'stadium.ticketPrices': {
    label: 'Ticketpreise',
    tooltip: 'Preise für Steh-, Sitz- und VIP-Plätze. Höhere Preise bringen mehr pro Zuschauer, drücken aber die Stimmung.',
    why: 'Der direkteste Hebel zwischen kurzfristigem Geld und langfristiger Fanbindung.',
    since: '0.1.0',
    related: ['stadium.fans']
  }
});
