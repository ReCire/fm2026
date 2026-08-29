import { defineDocs } from '$lib/docs/registry';

export const calendarDocs = defineDocs({
  'calendar.next': {
    label: 'Nächstes Spiel',
    tooltip: 'Der nächste noch nicht ausgetragene Spieltag der eigenen Liga.',
    why: 'Ein Blick reicht, um zu wissen, was als Nächstes ansteht, ohne die Tabelle oder den Spielplan durchsuchen zu müssen.',
    since: '0.1.0',
    related: ['calendar.record', 'league.fixtures']
  },
  'calendar.record': {
    label: 'Bilanz',
    tooltip: 'Siege, Unentschieden und Niederlagen der bisherigen Saison.',
    why: 'Der Spielplan allein zeigt Ergebnisse einzeln; die Bilanz zeigt den Trend der Saison auf einen Blick.',
    since: '0.1.0',
    related: ['calendar.next']
  },
  'calendar.filter': {
    label: 'Ansicht',
    tooltip: 'Zeigt den ganzen Spielplan, nur die kommenden oder nur die bereits gespielten Partien.',
    why: 'Vierunddreißig Spieltage auf einmal sind ein Nachschlagewerk, kein Überblick — die Filter machen aus der Liste wieder eine Frage, die man tatsächlich stellen will: "Was kommt?" oder "Wie lief es?".',
    since: '0.1.0',
    related: ['calendar.next']
  }
});
