import { defineDocs } from '$lib/docs/registry';

export const europeDocs = defineDocs({
  'europe.groups': {
    label: 'Gruppenphase',
    tooltip:
      'Acht Vereine, zwei Vierergruppen, sechs Spieltage. Jeder gegen jeden, Hin- und Rückspiel.',
    manual:
      '## Der Champions Cup\n\nAcht Vereine, zwei Gruppen zu je vier. Gespielt wird an den Ligaspieltagen 3, 7, 11, 15, 19 und 23 — jeder gegen jeden, einmal zu Hause und einmal auswärts.\n\nSieben Gegner sind immer dieselben, von Real Castilla (Stärke 91) bis Beşiktepe (80). Der achte Platz gehört deinem Verein, wenn er qualifiziert ist — sonst rückt Mersey City nach.\n\nDer Wettbewerb wird auch dann gespielt, wenn dein Verein nicht dabei ist. Das ist Absicht: ein Turnier, das nur in den Saisons existiert, in denen man drin ist, bleibt eine fremde Tabelle. So kennt man die acht Namen, bevor man zum ersten Mal gegen sie spielt.',
    why: 'Im Prototyp hatten alle acht Vereine eine Stärke zwischen 84 und 89 — es gab keine gute und keine schlechte Gruppe, nur sechs Münzwürfe mit Namen daran. Elf Punkte Spannweite machen die Auslosung zu einer Information, die man vor dem ersten Spiel lesen kann. Und die Vereinsnamen sind erfunden wie alle anderen im Spiel auch: die Liga wird aus echten Städten und ausgedachten Vereinen erzeugt, die Marken sind Parodien, und ausgerechnet im wichtigsten Wettbewerb des Spiels damit aufzuhören wäre die einzige Stelle, an der der Witz aussetzt.',
    since: '0.4.0',
    related: ['europe.knockout', 'europe.prizes', 'cup.round']
  },
  'europe.knockout': {
    label: 'K.-o.-Runde',
    tooltip:
      'Halbfinale an Spieltag 27, Finale an Spieltag 31. Die Gruppensieger treffen auf die Zweiten.',
    manual:
      '## Halbfinale und Finale\n\nDie beiden Gruppenersten und die beiden Gruppenzweiten erreichen das Halbfinale, gespielt an Spieltag 27. Ein Gruppensieger trifft dabei immer auf den Zweiten der **anderen** Gruppe — die Gruppe zu gewinnen ist damit besser, als sie als Zweiter zu beenden.\n\nDas Finale steigt an Spieltag 31 zwischen den beiden Halbfinalsiegern.\n\nBeide Runden werden gespielt. Es gibt kein Ergebnis, das vorher feststeht.',
    why: 'Im Prototyp standen die Halbfinals als Objektliteral im Code — dieselbe Paarung, dasselbe Ergebnis (2:1 und 1:2), derselbe Sieger, jede Saison. Der Sieger der Gruppe B verlor dabei immer, weshalb es strikt schlechter war, seine Gruppe zu gewinnen, als Zweiter zu werden. Das Finale wurde überhaupt nicht gespielt: wer es erreichte, gewann es, und der Spielstand war die Zeichenkette „3 : 1". Ein Titel, den man nicht verlieren kann, ist kein Titel, sondern eine Quittung für die Qualifikation.',
    since: '0.4.0',
    related: ['europe.groups', 'europe.prizes']
  },
  'europe.prizes': {
    label: 'UEFA-Prämien',
    tooltip:
      'Geld für jedes Gruppenspiel und jede erreichte Runde. Fünf Politik-Knoten erhöhen alles davon.',
    manual:
      '## Prämien\n\nGezahlt wird pro Gruppenspiel (Sieg oder Unentschieden) und für jede erreichte K.-o.-Runde. Das Finale zu erreichen zahlt mehr als das Halbfinale; es zu gewinnen zahlt am meisten.\n\nFünf Knoten im Wissensbaum erhöhen diese Prämien — und **nur** diese. Sie sind der einzige Grund, warum sich der Politik-Ast rechnet.\n\nEuropa ist nur aus der ersten Liga erreichbar. Die Zahlen liegen deshalb eine Größenordnung über dem Pokal, ohne dass daraus ein anderes Spiel wird.',
    why: 'Der Prototyp zahlte 25.000.000 € für den Titel gegen 1.500.000 € Aufstiegsprämie — sechzehn Aufstiege für einen Abend. Damit wäre Europa das Einzige im Spiel, für das sich Optimieren lohnt, und die Liga nur noch die Qualifikation dafür. Ein perfekter Europapokal soll ein Jahrzehnt Einnahmen wert sein, kein anderes Spiel. Ausserdem zahlte er für das verlorene Finale genau so viel wie für das verlorene Halbfinale, nämlich nichts: der zweitgrösste Abend einer Karriere war null wert.',
    since: '0.4.0',
    related: ['europe.groups', 'finance.balance', 'knowledge.dormant']
  }
});
