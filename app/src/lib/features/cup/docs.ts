import { defineDocs } from '$lib/docs/registry';

export const cupDocs = defineDocs({
  'cup.bracket': {
    label: 'Turnierbaum',
    tooltip: '32 Vereine aus allen vier Ligen, ein Spiel pro Runde. Wer verliert, ist raus.',
    manual: '## Der Pokal\n\nEinunddreißig Gegner werden aus der gesamten Pyramide gelost — dein Verein ist immer dabei. Es gibt kein Rückspiel: Wer nach neunzig Minuten hinten liegt, ist ausgeschieden. Steht es unentschieden, entscheidet das Elfmeterschießen.\n\nDie Runden liegen unter der Woche, vor den Spieltagen 4, 12, 20, 28 und 34. Das Finale ist am letzten Spieltag der Saison.',
    why: 'Die Tabelle ist eine Maschine, die über eine ganze Saison hinweg die Wahrheit über deine Mannschaft herausmittelt. Der Pokal sind neunzig Minuten, in denen das nicht passiert. Genau dafür ist er da.',
    since: '0.2.0',
    related: ['cup.homeRule', 'cup.penalties', 'cup.prize']
  },
  'cup.homeRule': {
    label: 'Heimrecht',
    tooltip: 'Der Verein aus der tieferen Liga hat Heimrecht.',
    why: 'Die echte Regel — und die einzige, die dem kleinen Verein überhaupt einen Vorteil gibt. Ohne sie käme die Sensation, für die es den Wettbewerb gibt, praktisch nie vor.',
    since: '0.2.0',
    related: ['cup.bracket']
  },
  'cup.penalties': {
    label: 'Elfmeterschießen',
    tooltip: 'Steht es nach neunzig Minuten unentschieden, entscheiden Elfmeter — fast unabhängig von der Stärke.',
    why: 'Ein Elfmeterschießen, das die bessere Mannschaft zu 80 Prozent gewinnt, ist nur das Ligamodell mit Hut. Es ist beinahe ein Münzwurf, und deshalb tut es weh.',
    since: '0.2.0',
    related: ['cup.bracket']
  },
  'cup.prize': {
    label: 'Prämie',
    tooltip: 'Jede gewonnene Runde bringt Geld, und es wird mit jeder Runde deutlich mehr.',
    manual: '## Prämien\n\nEin frühes Aus ist eine nette Woche. Ein Viertelfinale verändert deinen Sommer. Das Finale ist die Saison.\n\nDie Kurve ist Absicht: Das Geld ist lange kein Grund, sich für den Pokal zu interessieren — und dann plötzlich doch.',
    why: 'Die ursprünglich portierten Zahlen zahlten 215.000 € für ein gewonnenes Erstrundenspiel — mehr als eine ganze Saison an der Kasse einbringt. Das hätte jede andere finanzielle Entscheidung im Spiel bedeutungslos gemacht.',
    since: '0.2.0',
    related: ['finance.balance', 'cup.bracket']
  },
  'cup.titles': {
    label: 'Pokalsiege',
    tooltip: 'Wie oft dein Verein den Pokal unter deiner Leitung gewonnen hat.',
    why: 'Das Einzige aus dem Wettbewerb, das eine Saison überdauert. Eine Zahl, die nur steigen kann, ist ein Andenken — und Andenken sind der Grund, eine Karriere weiterzuspielen.',
    since: '0.2.0',
    related: ['cup.bracket']
  }
});
