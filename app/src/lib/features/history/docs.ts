import { defineDocs } from '$lib/docs/registry';

export const historyDocs = defineDocs({
  'history.seasons': {
    label: 'Saisons',
    tooltip: 'Wie viele Spielzeiten diese Karriere schon umfasst.',
    why: 'Eine Karriere, die nur die aktuelle Saison zeigt, fühlt sich nach Neustart an. Eine Zahl, die wächst, ist der einfachste Beweis, dass etwas Bestand hat.',
    since: '0.1.0',
    related: ['history.bestRank', 'history.biggestWin']
  },
  'history.bestRank': {
    label: 'Beste Platzierung',
    tooltip: 'Der beste Tabellenplatz, den der Verein je erreicht hat — über alle Saisons und Ligen hinweg.',
    why: 'Der aktuelle Platz steht schon in der Liga-Ansicht. Hier zählt nur, was für die Ewigkeit war.',
    since: '0.1.0',
    related: ['history.seasons']
  },
  'history.biggestWin': {
    label: 'Größter Sieg',
    tooltip: 'Das höchste Ergebnis, das der Verein je für sich entschieden hat.',
    why: 'Eine Zahl in der Tabelle vergisst sich sofort; ein Ergebnis mit Gegner und Saison bleibt eine Geschichte, die man erzählen kann.',
    since: '0.1.0',
    related: ['history.seasons']
  }
});
