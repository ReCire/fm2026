import { defineDocs } from '$lib/docs/registry';

export const trainingDocs = defineDocs({
  'training.teamFocus': {
    label: 'Mannschaftsschwerpunkt',
    tooltip: 'Woran die ganze Mannschaft arbeitet. Spieler mit eigenem Schwerpunkt folgen ihrem eigenen.',
    manual: '## Schwerpunkt\n\n„Allgemein" verteilt die Trainingswoche auf alle fünf Eigenschaften. Das gewinnt kein Rennen, hinterlässt aber auch keine Lücke.\n\nEin einzelner Schwerpunkt bündelt die ganze Woche auf eine Eigenschaft. Über zwei Saisons wird aus einem langsamen Mittelfeldspieler dadurch ein anderer Fußballer — nicht bloß eine größere Zahl.',
    why: 'Mit fünf Eigenschaften entscheidet Training nicht mehr, wie gut jemand wird, sondern WAS für ein Spieler er wird. Das ist die eigentliche Mechanik hinter dem Namen.',
    since: '0.2.0',
    related: ['training.individual', 'training.intensity']
  },
  'training.intensity': {
    label: 'Intensität',
    tooltip: 'Wie hart trainiert wird. Härter bedeutet schnellere Entwicklung, weniger Erholung und mehr Verletzungen am Spieltag.',
    manual: '## Intensität\n\nHartes Training hat zwei Preise, nicht einen: die Woche erholt weniger Fitness, und am Spieltag steigen Fitnessverlust und Verletzungsrisiko.\n\nZwei Preise sind Absicht. An einer einzigen Achse wäre eine Stufe immer die richtige.',
    why: 'Eine Wahl, die dich sowohl unter der Woche als auch am Spieltag auslaugt, trifft niemand zweimal. Deshalb bleibt die Erholung auch bei „Hart" positiv — sie fällt nur geringer aus.',
    since: '0.2.0',
    related: ['training.teamFocus', 'squad.fitness']
  },
  'training.individual': {
    label: 'Eigener Schwerpunkt',
    tooltip: 'Gibt diesem Spieler einen eigenen Schwerpunkt. Er entwickelt sich dort deutlich schneller als über den Mannschaftsschwerpunkt.',
    why: 'Der Schwerpunkt gehört dem Spieler, nicht einer Liste im Trainingsbereich — er geht bei einem Verkauf mit und verschwindet beim Karriereende. Eine Tabelle nach Spieler-ID hätte für jeden abgegebenen Spieler einen Eintrag zurückgelassen.',
    since: '0.2.0',
    related: ['training.teamFocus']
  },
  'training.progress': {
    label: 'Entwicklung',
    tooltip: 'Was diese Saison an Punkten dazugekommen ist — und was verloren ging.',
    why: 'Entwicklung passiert zwischen den Bildschirmen. Ohne eine Liste, die sie festhält, ändert sich eine Zahl im Kader und niemand weiß, warum.',
    since: '0.2.0',
    related: ['training.ceiling']
  },
  'training.ceiling': {
    label: 'Warum es langsamer wird',
    tooltip: 'Je besser ein Wert schon ist, desto seltener kommt ein Punkt dazu. Ab 27 Jahren kehrt sich die Entwicklung um.',
    manual: '## Die Grenze\n\nFortschritt wird ab einem Wert von 70 spürbar seltener und ist bei Spitzenwerten fast zum Erliegen gekommen. Junge Spieler entwickeln sich deutlich schneller, Spieler über 27 verlieren jede Woche mit steigender Wahrscheinlichkeit einen Punkt.\n\nOhne diese beiden Kräfte wäre eine Mannschaft nach sechs Saisons elf Mal 99 — und der Transfermarkt hätte dir nichts mehr zu verkaufen.',
    why: 'Die Obergrenze ist das, was den Kader endlich macht. Ohne sie ist Training kein Abwägen mehr, sondern nur noch Warten.',
    since: '0.2.0',
    related: ['training.progress']
  }
});
