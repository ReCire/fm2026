import { defineDocs } from '$lib/docs/registry';

export const editorDocs = defineDocs({
  'editor.section': {
    label: 'Vereinsbereiche',
    tooltip: 'Wechselt zwischen den Vereinsdaten und dem Kader dieses Vereins.',
    manual: '## Verein und Kader\n\nEin Verein ist ein Ort, in den du hineingehst: Name, Stadt, Farben und Wappen liegen unter „Verein", die Spieler unter „Kader".\n\nDen Kader gibt es nur bei deinem eigenen Verein. Von allen anderen Vereinen der Pyramide kennt das Spiel einen Namen und eine Stärke, aber keine einzelnen Spieler — es wären über tausend, und keiner davon würde je auflaufen.',
    why: 'Vorher standen alle Vereine in einer Liste und darunter, ohne sichtbaren Zusammenhang, dein Kader. Der Kader gehörte immer zu deinem Verein, aber nichts auf dem Bildschirm hat das gesagt. Ein Verein, in den man hineingeht, ist die Form, die jeder ohnehin erwartet.',
    since: '0.2.0',
    related: ['editor.club', 'editor.player']
  },
  'editor.club': {
    label: 'Verein bearbeiten',
    tooltip: 'Name, Kürzel, Stadt und die beiden Wappenfarben.',
    manual:
      '## Dein Verein\n\nDie vierzehn Vereine im Spiel sind erfunden, damit niemandes Name für etwas herhalten muss, das er nicht gesagt hat. Aber ein erfundener Verein ist nur ein Platzhalter für deinen.\n\nDeine Änderungen liegen als Schicht über dem Spiel. Das Original bleibt unangetastet, Zurücksetzen entfernt nur deine Schicht — es kann also nichts kaputtgehen.',
    why: 'Der Reiz der alten Manager lag nie an den erfundenen Namen, sondern daran, sie zu ersetzen. Wer seinen echten Verein einträgt, spielt ab da eine andere Saison.',
    since: '0.1.0',
    related: ['editor.player', 'editor.reset']
  },
  'editor.player': {
    label: 'Spieler bearbeiten',
    tooltip: 'Name, Alter und die fünf Werte. Die Gesamtstärke ergibt sich daraus.',
    manual:
      '## Die fünf Werte\n\nTechnik, Tempo, Kraft, Übersicht und Mentalität. Die Gesamtstärke wird daraus berechnet und je nach Position unterschiedlich gewichtet — ein Torwart lebt von Mentalität und Übersicht, ein Stürmer von Technik und Tempo.\n\nDeshalb macht dieselbe Änderung bei zwei Spielern nicht dasselbe. Die gestrichelte Linie im Diagramm zeigt, worauf es auf dieser Position ankommt.',
    why: 'Ein einzelner Stärkewert hätte den Editor sinnlos gemacht: einen Regler zu schieben ist keine Entscheidung. Fünf Werte mit positionsabhängiger Gewichtung machen daraus eine.',
    since: '0.1.0',
    related: ['editor.club', 'editor.reset']
  },
  'editor.crest': {
    label: 'Wappen',
    tooltip: 'Ein eigenes Bild hochladen, oder das erzeugte Wappen behalten.',
    manual: '## Eigenes Wappen\n\nDas erzeugte Wappen entsteht aus den beiden Vereinsfarben und braucht keine Datei. Wer ein echtes Logo hat, lädt es hoch — es wird auf eine sinnvolle Größe gebracht und im Browser gespeichert.\n\nWird das eigene Bild entfernt oder der Browserspeicher geleert, gilt wieder das erzeugte Wappen. Es kann also nie ein leeres Feld entstehen.',
    why: 'Das erzeugte Wappen ist nicht der Leerzustand, sondern der Boden: es liegt immer darunter. Deshalb ist sowohl das Hochladen als auch das Entfernen gefahrlos — man sieht jederzeit, was man zurückbekommt.',
    since: '0.1.0',
    related: ['editor.club']
  },
  'editor.reset': {
    label: 'Zurücksetzen',
    tooltip: 'Entfernt deine Änderung und stellt den Originalwert wieder her.',
    why: 'Weil Änderungen als Schicht über den Originaldaten liegen, ist Zurücksetzen das Löschen eines Eintrags und kann nicht fehlschlagen. Das ist der Grund, warum es hier keine Sicherheitsabfrage braucht — und warum sich Ausprobieren lohnt.',
    since: '0.1.0',
    related: ['editor.club', 'editor.player']
  },
  'editor.export': {
    label: 'Änderungen exportieren',
    tooltip: 'Speichert alle deine Bearbeitungen als Datei zum Weitergeben.',
    manual:
      '## Änderungspakete\n\nEin Paket enthält nur deine Bearbeitungen — keine Spielstände, keine Tabellen. Es ist klein genug zum Verschicken und lässt sich in jedem anderen Spielstand einlesen.\n\nBeim Einlesen wird Eintrag für Eintrag geprüft. Was nicht passt, wird übersprungen und benannt; der Rest kommt an.',
    why: 'So haben diese Communities immer funktioniert: einer pflegt die echten Namen ein, alle anderen laden sie herunter. Das Paket ist die kleinste Einheit, die das möglich macht.',
    since: '0.1.0',
    related: ['editor.import']
  },
  'editor.import': {
    label: 'Paket einlesen',
    tooltip: 'Übernimmt Bearbeitungen aus einer Datei. Ungültige Einträge werden übersprungen.',
    why: 'Ein Paket, das bei einem fehlerhaften Eintrag komplett scheitert, ist praktisch unbenutzbar — Daten aus fremder Hand sind nie ganz sauber. Eintragsweise Übernahme macht ein halb passendes Paket trotzdem nützlich.',
    since: '0.1.0',
    related: ['editor.export']
  },
  'editor.clubCount': {
    label: 'Vereine geändert',
    tooltip: 'Wie viele Vereine du bearbeitet hast.',
    why: 'Steht auf der Übersicht, weil Änderungen sonst unsichtbar sind: sie liegen als Schicht über den Originaldaten und fallen im Spiel nicht als "bearbeitet" auf.',
    since: '0.1.0',
    related: ['editor.club']
  },
  'editor.playerCount': {
    label: 'Spieler geändert',
    tooltip: 'Wie viele Spieler du bearbeitet hast.',
    why: 'Dasselbe wie bei den Vereinen — und die Zahl ist das, was beim Export mitgeht.',
    since: '0.1.0',
    related: ['editor.player', 'editor.export']
  },
  'editor.overall': {
    label: 'Gesamtstärke',
    tooltip: 'Ergibt sich aus den fünf Werten, gewichtet nach Position.',
    why: 'Steht live neben den Reglern, damit die Wirkung einer Änderung sichtbar ist, während man sie macht — und nicht erst drei Spieltage später in der Tabelle.',
    since: '0.1.0',
    related: ['editor.player']
  }
});
