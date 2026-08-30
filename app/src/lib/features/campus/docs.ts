import { defineDocs } from '$lib/docs/registry';

export const campusDocs = defineDocs({
  'campus.map': {
    label: 'Vereinsgelände',
    tooltip:
      'Das Gelände, gezeichnet aus dem echten Spielstand: die Höhe jeder Tribüne ist die Kapazität ihres Blocks, Flutlichtmasten stehen nur da, wenn der Verein Flutlicht besitzt.',
    manual:
      '## Das Gelände\n\nJede Fläche auf dieser Karte kommt aus dem Spielstand. Nichts davon ist Dekoration, die für eine Zahl einspringt — wenn das Bild falsch aussieht, stimmt etwas am Verein nicht.\n\nGestrichelte Flächen sind Grundstücke, auf denen noch nichts steht. Ein Antippen öffnet, was dort gebaut werden könnte und was es kostet.\n\nVier Einrichtungen tauchen bewusst auf keinem Grundstück auf. Wer einen Bunker beschildert, hat keinen Bunker.',
    why: 'Jede andere Oberfläche im Spiel meldet Fortschritt als Zahl. Diese meldet ihn als Ort — und ein Ort ist das Einzige, was man erfassen kann, ohne zu lesen.',
    since: '0.6.0',
    related: ['campus.build', 'stadium.capacity']
  },
  'campus.build': {
    label: 'Bauen',
    tooltip:
      'Errichtet die Einrichtung oder hebt sie auf die nächste Ausbaustufe. Die Kosten werden sofort vom Vereinskonto abgebucht.',
    why: 'Bauen und Ausbauen sind derselbe Vorgang an verschiedenen Stellen der Kostenliste. Ein eigener Weg für den ersten Kauf liefe genau einmal pro Einrichtung und würde deshalb nie auffallen, wenn er kaputt wäre.',
    since: '0.6.0',
    related: ['campus.level', 'finance.balance']
  },
  'campus.level': {
    label: 'Ausbaustufe',
    tooltip:
      'Wie weit eine Einrichtung ausgebaut ist. Stufe 1 ist bei manchen Einrichtungen das, was der Verein ohnehin schon hat — vier Container zählen auch als Kabinentrakt.',
    why: 'Keine Ausbaustufe ist ein leeres Grundstück. Ein leeres Grundstück heißt "noch nicht gebaut" und sagt nichts; vier rostende Container heißen "arm" und sind ein Zustand, den man ändern will.',
    since: '0.6.0',
    related: ['campus.build', 'campus.map']
  },
  'campus.locked': {
    label: 'Noch nicht verfügbar',
    tooltip:
      'Diese Einrichtung wirkt auf einen Bereich, den es im Spiel noch nicht gibt, oder sie verlangt einen Doktrin-Rang, den der Verein nicht hat.',
    why: 'Eine Einrichtung, deren Wirkung nirgendwo ankommt, darf nicht verkauft werden — sonst zahlt der Spieler echtes Geld für eine sehr teure Zeichnung. Dieselbe Sperre wie bei den Wissensknoten und den Führungskräften.',
    since: '0.6.0',
    related: ['campus.build', 'knowledge.dormant']
  },
  'campus.invested': {
    label: 'Investiert',
    tooltip: 'Was der Verein insgesamt in das Gelände gesteckt hat, über alle Einrichtungen und Stufen.',
    why: 'Ein Gelände wächst über Jahre in kleinen Schritten, und niemand merkt sich die Summe. Sie einmal auszusprechen macht aus vielen kleinen Entscheidungen eine Bilanz.',
    since: '0.6.0',
    related: ['campus.build', 'finance.balance']
  }
});
