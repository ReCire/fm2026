import { defineDocs } from '$lib/docs/registry';

export const squadDocs = defineDocs({
  'squad.strength': {
    label: 'Stärke',
    tooltip: 'Das Grundniveau eines Spielers, 1 bis 99. Ändert sich nur langsam durch Training und Alter.',
    why: 'Die eine Zahl, an der sich Marktwert, Gehalt und Teamstärke aufhängen — bewusst simpel gehalten, damit der Spieler Entscheidungen abschätzen kann.',
    since: '0.1.0',
    related: ['squad.fitness', 'squad.marketValue']
  },
  'squad.fitness': {
    label: 'Fitness',
    tooltip: 'Frische, 0 bis 100. Einsätze kosten Fitness, Bankdrücken bringt sie zurück. Unter 55 steigt das Verletzungsrisiko deutlich.',
    why: 'Erzwingt Rotation. Ohne Fitness würde man immer dieselbe beste Elf aufstellen und der Kader hätte keine Bedeutung.',
    since: '0.1.0',
    related: ['squad.injury', 'squad.autoLineup'],
    screenshot: 'squad-list'
  },
  'squad.morale': {
    label: 'Moral',
    tooltip: 'Die Stimmung eines Spielers, 0 bis 100. Beeinflusst Leistung und Vertragsverhandlungen.',
    why: 'Gibt Spielzeit und Erfolg eine zweite Konsequenz neben der reinen Fitness.',
    since: '0.1.0',
    related: ['squad.fitness']
  },
  'squad.marketValue': {
    label: 'Marktwert',
    tooltip: 'Was andere Vereine für den Spieler zahlen würden. Steigt überproportional mit der Stärke.',
    why: 'Die Kurve ist bewusst steil: die letzten Stärkepunkte sind unbezahlbar teuer, damit Topspieler eine echte Entscheidung bleiben.',
    since: '0.1.0',
    related: ['squad.strength', 'squad.wage']
  },
  'squad.wage': {
    label: 'Gehalt',
    tooltip: 'Was der Spieler pro Spieltag kostet. Wird jeden Spieltag automatisch abgebucht.',
    why: 'Macht einen teuren Kader zur Dauerbelastung statt zu einer einmaligen Ausgabe — der häufigste Weg, sich in diesem Spiel zu ruinieren.',
    since: '0.1.0',
    related: ['finance.wageBudget', 'squad.marketValue']
  },
  'squad.injury': {
    label: 'Verletzung',
    tooltip: 'Verbleibende Spieltage, die der Spieler ausfällt. Verletzte Spieler werden automatisch aus der Aufstellung genommen.',
    manual: '## Verletzungen\n\nJeder Spieler der Startelf hat pro Spiel ein Grundrisiko, sich zu verletzen. Wer mit niedriger Fitness aufläuft, verletzt sich deutlich häufiger — das ist der Hauptgrund, den Kader zu rotieren.\n\nVerletzte Spieler werden sofort aus der Aufstellung entfernt und die Elf wird automatisch neu besetzt. Die Genesung läuft pro Spieltag ab, unabhängig davon, ob gespielt wurde.',
    why: 'Bestraft es, den Kader zu dünn zu halten, und macht Ersatzspieler wertvoll, ohne dass man sie ständig aufstellen müsste.',
    since: '0.1.0',
    related: ['squad.fitness', 'squad.suspension'],
    screenshot: 'squad-injured'
  },
  'squad.suspension': {
    label: 'Sperre',
    tooltip: 'Verbleibende Spieltage Sperre nach einer Roten Karte.',
    why: 'Zweite Quelle für unfreiwillige Ausfälle, die nicht durch Rotation vermeidbar ist.',
    since: '0.1.0',
    related: ['squad.injury']
  },
  'squad.autoLineup': {
    label: 'Elf automatisch aufstellen',
    tooltip: 'Stellt die stärkste verfügbare Elf in einer 4-4-2-Grundordnung auf, gewichtet nach Stärke und Fitness.',
    why: 'Nimmt dem Spieler die Fleißarbeit ab, ohne die Entscheidung zu ersetzen — man kann jederzeit von Hand nachbessern.',
    since: '0.1.0',
    related: ['squad.fitness'],
    screenshot: 'squad-lineup'
  },
  'squad.toggleLineup': {
    label: 'Aufstellen / Rausnehmen',
    tooltip: 'Nimmt den Spieler in die Startelf auf oder setzt ihn auf die Bank. Verletzte und Gesperrte können nicht aufgestellt werden.',
    why: 'Die automatische Elf ist ein Vorschlag, keine Entscheidung — wer seinen Torjäger für das schwere Auswärtsspiel schonen will, muss das von Hand tun können.',
    since: '0.1.0',
    related: ['squad.autoLineup', 'squad.fitness']
  },
  'squad.captain': {
    label: 'Kapitän',
    tooltip: 'Der Spielführer. Spieler mit der Eigenschaft "Leader" geben der Mannschaft einen zusätzlichen Bonus.',
    why: 'Gibt Charakter-Eigenschaften eine sichtbare taktische Konsequenz.',
    since: '0.1.0',
    related: ['squad.strength']
  }
});
