import { defineDocs } from '$lib/docs/registry';

export const matchdayDocs = defineDocs({
  'matchday.live': {
    label: 'Spielverlauf',
    tooltip: 'Neunzig Minuten in neunzig Sekunden. Die Ereignisse kommen an, während die Uhr läuft.',
    manual: '## Das Spiel ansehen\n\nDas Ergebnis steht fest, sobald angepfiffen wird — die Simulation entscheidet es, und deine Aufstellung entscheidet die Simulation. Was du siehst, ist die Erzählung dieses Ergebnisses: wann die Tore fielen, was dazwischen passiert ist.\n\nDeshalb kann dasselbe Spiel nicht zweimal anders ausgehen, und deshalb kostet dich das Zusehen nichts. Du kannst pausieren, den Bildschirm verlassen oder die Seite neu laden — das Spiel steht da, wo du es verlassen hast.',
    why: 'Ein Live-Modell, das den Ausgang selbst entscheidet, widerspricht dem Balance-Modell — und das auf dem Bildschirm gewinnt. Erzählen statt simulieren hält „die bessere Elf gewinnt öfter" wahr und gibt trotzdem etwas zu sehen.',
    since: '0.2.0',
    related: ['matchday.pause', 'matchday.skip', 'game.advance']
  },
  'matchday.pause': {
    label: '❚❚ Pause',
    tooltip: 'Hält die Uhr an. Das Spiel bleibt stehen, wo es steht.',
    why: 'Eine Live-Ansicht, aus der man nicht aussteigen kann, ist eine Zwischensequenz.',
    since: '0.2.0',
    related: ['matchday.resume']
  },
  'matchday.resume': {
    label: '▶ Weiter',
    tooltip: 'Lässt die Uhr weiterlaufen.',
    why: 'Der Gegenpart zur Pause. Beide sind derselbe Knopf an derselben Stelle, damit die Hand nicht wandern muss.',
    since: '0.2.0',
    related: ['matchday.pause']
  },
  'matchday.skip': {
    label: 'Zum Abpfiff',
    tooltip: 'Springt ans Ende. Das Ergebnis ändert sich dadurch nicht.',
    why: 'Immer verfügbar. Niemand soll in einem Spiel festgehalten werden, das er heute nicht sehen will — und weil das Ergebnis ohnehin feststeht, wird dabei nichts übersprungen außer der Zeit.',
    since: '0.2.0',
    related: ['matchday.live']
  },
  'matchday.dismiss': {
    label: 'Bericht schließen',
    tooltip: 'Schließt den Spielverlauf. Der Spielbericht bleibt erhalten.',
    why: 'Der Verlauf ist das Erlebnis, der Bericht ist die Akte. Das eine schließt man, das andere bleibt.',
    since: '0.2.0',
    related: ['matchday.live']
  },
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
