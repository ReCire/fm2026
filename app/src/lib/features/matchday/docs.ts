import { defineDocs } from '$lib/docs/registry';

export const matchdayDocs = defineDocs({
  'matchday.formation': {
    label: 'Grundordnung',
    tooltip: 'Wie die Mannschaft steht. Wirkt sich unterschiedlich aus, je nachdem ob du zu Hause oder auswärts spielst.',
    manual: '## Grundordnung\n\nJede Ordnung ist zu Hause und auswärts unterschiedlich viel wert. 4-3-3 gewinnt daheim Zugriff und lässt auswärts Räume; 5-3-2 ist umgekehrt.\n\nDer Effekt ist bewusst klein — zwei, drei Stärkepunkte. Eine Aufstellung gewinnt kein Spiel gegen eine deutlich bessere Mannschaft, aber sie entscheidet enge.',
    why: 'Gibt der Heim-Auswärts-Unterscheidung eine Entscheidung statt nur einen Bonus. Ohne sie wäre Auswärtsspiel bloß eine Zahl, die man hinnimmt.',
    since: '0.3.0',
    related: ['matchday.style', 'squad.autoLineup'],
    screenshot: 'matchday-prematch'
  },
  'matchday.style': {
    label: 'Spielweise',
    tooltip: 'Defensiv, ausgeglichen oder offensiv. Offensiv bringt Stärke, kostet aber mehr Fitness.',
    why: 'Der Preis ist Fitness, nicht Risiko im Spiel selbst — dadurch wirkt die Entscheidung erst nächste Woche, und Rotation wird zur Folge einer Entscheidung statt zur Pflichtübung.',
    since: '0.3.0',
    related: ['matchday.formation', 'squad.fitness']
  },
  'matchday.talk': {
    label: 'Ansprache',
    tooltip: 'Was du vor dem Anpfiff sagst. Fordernd wirkt heute und kostet Moral, motivierend wirkt weniger und hebt sie.',
    why: 'Die einzige Stellschraube, deren Kosten ausschließlich in der Zukunft liegen. Sie macht eine Serie schlechter Spiele teurer als ein einzelnes.',
    since: '0.3.0',
    related: ['squad.morale', 'matchday.style']
  },
  'matchday.readiness': {
    label: 'Einsatzbereitschaft',
    tooltip: 'Ob die Elf vollständig und fit ist. Wird gemeldet, nicht erzwungen — gespielt wird so oder so.',
    manual: '## Einsatzbereitschaft\n\nFehlende Spieler, zu wenig Fitness oder eine unvollständige Aufstellung werden hier gemeldet. Das Spiel findet trotzdem statt.\n\nDas ist Absicht: du sollst wissen, dass du mit zehn Mann anläufst — aber nicht daran gehindert werden.',
    why: 'Ein Spiel, das man nicht anstoßen darf, wäre eine Bevormundung. Eine Warnung, die man ignorieren kann, ist eine Entscheidung.',
    since: '0.3.0',
    related: ['squad.autoLineup', 'squad.fitness'],
    screenshot: 'matchday-readiness'
  },
  'matchday.opponent': {
    label: 'Gegner',
    tooltip: 'Wer als Nächstes kommt, wie stark er ist, und ob zu Hause oder auswärts gespielt wird.',
    why: 'Die Stärke des Gegners wird offen gezeigt statt versteckt: die Entscheidung soll darin bestehen, wie du reagierst, nicht darin, ob du geraten hast.',
    since: '0.3.0',
    related: ['matchday.formation', 'league.table']
  },
  'matchday.report': {
    label: 'Spielbericht',
    tooltip: 'Ergebnis, Aufstellung und die Stärke, mit der beide Mannschaften angetreten sind.',
    why: 'Zeigt die tatsächlich eingesetzte Stärke, nicht nur das Ergebnis — sonst kann der Spieler nicht unterscheiden, ob eine Niederlage an seiner Aufstellung lag oder am Zufall.',
    since: '0.3.0',
    related: ['matchday.form', 'league.table'],
    screenshot: 'matchday-report'
  },
  'matchday.form': {
    label: 'Form',
    tooltip: 'Die letzten Ergebnisse, das jüngste zuerst. S Sieg, U Unentschieden, N Niederlage.',
    why: 'Eine Serie ist die Information, die eine Tabelle nicht zeigt: dieselbe Platzierung fühlt sich völlig anders an, je nachdem ob man sie erklimmt oder verliert.',
    since: '0.3.0',
    related: ['matchday.report']
  }
});
