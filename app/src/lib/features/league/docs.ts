import { defineDocs } from '$lib/docs/registry';

export const leagueDocs = defineDocs({
  'league.table': {
    label: 'Tabelle',
    tooltip:
      'Der Stand der Liga: Spiele, Tore und Punkte jedes Vereins. Sortiert nach Punkten, dann Tordifferenz, dann geschossenen Toren.',
    manual:
      '## Die Tabelle\n\nDrei Punkte für einen Sieg, einer für ein Unentschieden. Bei Punktgleichheit entscheidet die Tordifferenz, danach die Anzahl der geschossenen Tore — ein 4:2 ist also mehr wert als ein 1:0, sobald es eng wird.\n\nDie Tabelle wird aus den gespielten Partien berechnet und nirgends zwischengespeichert. Punkte und Bilanz können deshalb nicht auseinanderlaufen, egal wie oft ein Spieltag wiederholt oder zurückgenommen wird.',
    why: 'Die Tabelle ist die einzige Rückmeldung, die der Spieler ohne Umweg versteht. Sie wird aus Siegen und Toren abgeleitet statt gespeichert, damit ein zurückgenommener Spieltag keinen Geisterpunkt hinterlässt.',
    since: '0.2.0',
    related: ['league.points', 'league.goalDifference', 'league.position'],
    screenshot: 'league-table'
  },
  'league.position': {
    label: 'Platz',
    tooltip: 'Der aktuelle Tabellenplatz deines Vereins in seiner Liga.',
    why: 'Der Platz — nicht die Punktzahl — entscheidet am Saisonende über Auf- und Abstieg. Deshalb steht er ganz oben und nicht als Nebeninformation in der Tabelle.',
    since: '0.2.0',
    related: ['league.promotion', 'league.relegation']
  },
  'league.points': {
    label: 'Punkte',
    tooltip: 'Drei Punkte pro Sieg, ein Punkt pro Unentschieden.',
    why: 'Die Drei-Punkte-Regel macht den Sieg deutlich wertvoller als zwei Unentschieden und belohnt damit Risiko. Bei zwei Punkten pro Sieg wäre das defensive Verwalten eines Vorsprungs fast immer die richtige Wahl.',
    since: '0.2.0',
    related: ['league.table']
  },
  'league.goalDifference': {
    label: 'Tordifferenz',
    tooltip: 'Geschossene minus kassierte Tore. Erstes Kriterium bei Punktgleichheit.',
    why: 'Gibt hohen Siegen und deutlichen Niederlagen eine Bedeutung, die über den einzelnen Spieltag hinausreicht — sonst wären alle Ergebnisse jenseits von 1:0 sportlich egal.',
    since: '0.2.0',
    related: ['league.table', 'league.points']
  },
  'league.strength': {
    label: 'Stärke',
    tooltip:
      'Das Niveau eines Gegners, 1 bis 99. Jede Liga liegt rund zehn Punkte über der darunter.',
    why: 'Der Zehn-Punkte-Abstand zwischen den Ligen ist die ganze Aufstiegsdramaturgie: Er ist groß genug, dass ein Aufsteiger die erste Saison ums Überleben spielt, und klein genug, dass ein guter Kader es schafft. Bei fünf Punkten würde man durchmarschieren, bei zwanzig wäre der Aufstieg eine Bestrafung.',
    since: '0.2.0',
    related: ['league.nextMatch', 'squad.strength']
  },
  'league.nextMatch': {
    label: 'Nächster Gegner',
    tooltip: 'Der Gegner des kommenden Spieltags und ob zu Hause oder auswärts gespielt wird.',
    why: 'Heimrecht ist drei Stärkepunkte wert. Der Spieler soll vor dem Spieltag wissen, worauf er sich einstellt — Rotation und Aufstellung sind sonst Blindflug.',
    since: '0.2.0',
    related: ['league.strength', 'stadium.attendance']
  },
  'league.levelSwitch': {
    label: 'Liga wechseln',
    tooltip: 'Zeigt die Tabelle einer anderen Liga der Pyramide an. Ändert nichts am Spiel.',
    why: 'Die vier Ligen sind eine echte, durchgespielte Welt und keine Kulisse. Der Blick nach oben zeigt, wohin die Reise geht, der Blick nach unten, wer nächste Saison hochkommt.',
    since: '0.2.0',
    related: ['league.table', 'league.promotion']
  },
  'league.fixtures': {
    label: 'Spieltag anzeigen',
    tooltip: 'Blättert durch die Ansetzungen der Saison — gespielte Ergebnisse und kommende Partien.',
    why: 'Der Spielplan wird zu Saisonbeginn komplett erzeugt und liegt fest. Wer weiß, dass in drei Wochen der Tabellenführer kommt, kann seine Rotation danach planen.',
    since: '0.2.0',
    related: ['league.nextMatch', 'league.table']
  },
  'league.promotion': {
    label: 'Aufstieg',
    tooltip:
      'Die besten zwei Vereine jeder Liga steigen am Saisonende auf. Der Aufstieg bringt eine Prämie von 1,5 Mio. €.',
    manual:
      '## Auf- und Abstieg\n\nAm Ende jeder Saison tauschen die besten zwei Vereine einer Liga mit den schlechtesten zwei der Liga darüber die Plätze. Die Vereine bleiben dabei dieselben — der Klub, der mit dir aufsteigt, ist nächste Saison dein Konkurrent.\n\nDie Aufstiegsprämie wird sofort gutgeschrieben. Sie ist bewusst hoch: der Sprung in die nächste Liga kostet Verstärkungen, und ohne diese Prämie wäre der Aufstieg wirtschaftlich eine Strafe.',
    why: 'Zwei Aufsteiger von achtzehn Vereinen sind rund elf Prozent — selten genug, dass eine Saison etwas bedeutet, häufig genug, dass eine Karriere in überschaubarer Zeit oben ankommt. Die Prämie deckt ungefähr eine Verstärkung ab; ohne sie wäre der Aufsteiger sofort abstiegsreif.',
    since: '0.2.0',
    related: ['league.relegation', 'league.position', 'finance.balance'],
    screenshot: 'league-promotion'
  },
  'league.relegation': {
    label: 'Abstieg',
    tooltip: 'Die letzten zwei Vereine jeder Liga steigen am Saisonende ab.',
    why: 'Genauso viele Absteiger wie Aufsteiger — sonst würden die Ligen von Saison zu Saison wachsen oder schrumpfen. Der Abstieg ist die einzige Konsequenz, die eine schlechte Saison wirklich teuer macht, weil er die Einnahmen der ganzen nächsten Saison senkt.',
    since: '0.2.0',
    related: ['league.promotion', 'league.position']
  },
  'league.europe': {
    label: 'Europapokal',
    tooltip:
      'Die besten vier Vereine der 1. Bundesliga qualifizieren sich für den europäischen Wettbewerb der nächsten Saison.',
    why: 'Gibt der ersten Liga ein Ziel oberhalb des Klassenerhalts. Ohne diesen Platz wäre die Karriere nach dem Aufstieg ins Oberhaus inhaltlich zu Ende.',
    since: '0.2.0',
    related: ['league.position']
  }
});
