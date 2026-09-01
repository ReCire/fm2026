import { defineDocs } from '$lib/docs/registry';

export const matchdayDocs = defineDocs({
  'matchday.halftime': {
    label: 'Halbzeit-Entscheidung',
    tooltip: 'In der Pause wirst du gefragt, wie es weitergehen soll. Deine Antwort verändert die zweite Halbzeit wirklich.',
    manual: '## Die Pause\n\nBei Halbzeit hält die Uhr an und du entscheidest. Die zweite Halbzeit wird danach neu ausgespielt — mit der Stärke, die deine Wahl ergibt. Das Ergebnis kann sich dadurch ändern, und die Tabelle wird entsprechend korrigiert.\n\nWas du in der ersten Halbzeit gesehen hast, bleibt unverändert stehen. Nur was noch nicht passiert ist, wird neu entschieden.\n\nJede Option kostet etwas: Fitness, Verletzungsrisiko oder Stimmung. „Nichts ändern" ist eine vollwertige Antwort und kostet nichts.',
    why: 'Zuschauen ohne Eingreifen ist Fernsehen. Der Ausschlag ist auf sechs Punkte begrenzt — genug, um ein enges Spiel zu drehen, nie genug, um eine deutlich bessere Mannschaft zu schlagen. Sonst wäre die Aufstellung egal, und dass die Aufstellung zählt, ist die Zusage, auf der das ganze Spiel steht.',
    since: '0.2.0',
    related: ['matchday.live', 'matchday.style', 'squad.fitness']
  },
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
  'matchday.sabotage': {
    label: 'Beratung vor dem Spiel',
    tooltip: 'Zahl vor dem Anpfiff für einen kleinen Vorteil im nächsten Spiel — und für etwas mehr Ermittlungsdruck.',
    manual: '## Beratung vor dem Spiel\n\nVier Möglichkeiten, alle vor dem Anpfiff bezahlt, alle nur für das nächste Spiel wirksam. Der Effekt ist klein — er kann ein enges Spiel drehen, nie eine deutlich bessere Mannschaft schlagen.\n\nHöchstens eine Sache gleichzeitig. Das Honorar ist weg, sobald du wählst, auch wenn du danach absagst oder das Spiel gar nicht stattfindet.\n\nDer Ermittlungsdruck steigt erst, wenn das Spiel tatsächlich gespielt wird — arrangieren und dann nicht spielen macht niemanden misstrauisch.',
    why: 'Ermittlungsdruck war ein Meter mit einer Ursache, aber keiner, die der Spieler wählen konnte — er stieg nur durch einen dauerhaften Wissensbaum-Knoten. Das hier ist das fehlende Verb: ein wiederholbarer Handel gegen einen Meter, der schon eine Konsequenz hat. Auf ein Vorhaben begrenzt, aus demselben Grund wie die Halbzeit-Entscheidung: vier gleichzeitig nutzbare Hebel sind keine Entscheidung mehr, sondern ein Wochenendritual.',
    since: '0.8.0',
    related: ['matchday.formation', 'matchday.halftime']
  },
  'matchday.cancelSabotage': {
    label: 'Absagen',
    tooltip: 'Nimmt das arrangierte Vorhaben zurück. Das Honorar ist trotzdem weg.',
    why: 'Jemand ist bereits bezahlt worden. Eine Erstattung würde das Arrangieren zu einer kostenlosen Besichtigung machen — genau das, was den Kauf zu einer echten Entscheidung macht, wäre dahin.',
    since: '0.8.0',
    related: ['matchday.sabotage']
  },
  'matchday.substitute': {
    label: 'Wechsel',
    tooltip: 'Bring jemanden von der Bank, während die Uhr steht. Drei pro Spiel, keine Rücknahme.',
    manual: '## Wechsel\n\nWähle erst, wer runter geht, dann, wer rein kommt. Der Rest des Spiels wird ab dieser Minute neu ausgespielt — mit der Stärke, die der Tausch tatsächlich ergibt, nicht mit einer erfundenen.\n\nEin Einwechselspieler ist nicht automatisch besser: seine Stärke zählt zusammen mit seiner Fitness, genau wie beim Ausgewechselten. Frische Beine gegen müde ist der eigentliche Tausch — manchmal lohnt er sich, manchmal nicht.\n\nDrei Wechsel pro Spiel, und ein verbrauchter kommt nicht zurück.',
    why: 'Die Bank existierte, aber nichts, was der Spieler tat, konnte sie je aufs Feld bringen — Fitness verfiel, doch kein Ergebnis konnte sich dadurch je ändern, während ein Spiel lief. Das ist dieselbe Lücke wie ein Wert, der berechnet und nie gelesen wird, nur auf der anderen Seite: hier stand die Mechanik, und der Bildschirm zeigte sie nicht. Begrenzt auf drei, damit der letzte Wechsel in der sechzigsten Minute eine Entscheidung bleibt, die man bereuen kann.',
    since: '0.7.0',
    related: ['matchday.live', 'matchday.halftime', 'squad.fitness']
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
