import { defineDocs } from '$lib/docs/registry';

export const pressDocs = defineDocs({
  'press.pressure': {
    label: 'Ermittlungsdruck',
    tooltip:
      'Wie sehr sich der Verband für diesen Verein interessiert. Steigt durch das, was man tut — nicht durch das, was man verliert.',
    manual:
      '## Ermittlungsdruck\n\nDer Zeiger steht bei einem neuen Verein auf 0 %. Er steigt **nicht**, wenn man Spiele verliert.\n\nEr steigt durch Doktrin-Knoten: neun der dreizehn Knoten, die ihn berühren, erhöhen ihn — das Schattenkabinett, die Diplomatenloge und jede Schatten-Synthese. Vier senken ihn, und drei davon sind Medien-Operationen.\n\nAn jedem Spieltag baut sich ein fester Anteil des aktuellen Standes ab. Das heißt: je höher der Zeiger, desto mehr fällt pro Spieltag ab — ein Verein bei 90 % kühlt schneller als einer bei 30 %. Wer weiter kauft, findet ein Gleichgewicht statt dauerhaft bei 100 % zu stehen.\n\nVier Bänder: **Unauffällig** (ab 0), **Auffällig** (ab 25), **Akte offen** (ab 45), **Razzia möglich** (ab 70).',
    why: 'Ein Messwert und zwei Folgen: der Vorstand liest ihn als Zweifel, der Verband als Anfangsverdacht. Das macht das Schattenkabinett zu einem echten Handel statt zu einem Gratis-Vorteil mit düsterer Beschreibung — jeder Umschlag erhöht die Temperatur, und die Temperatur kostet den Job. Der Abbau ist proportional und nicht linear, weil ein fester Abzug bedeuten würde, dass ein Verein bei 90 % und einer bei 30 % gleich lange zum Sauberwerden brauchen: der zweite Umschlag wäre dann gratis.',
    since: '0.4.0',
    related: ['press.feed', 'press.investigation', 'knowledge.dormant']
  },
  'press.feed': {
    label: 'Was geschrieben wurde',
    tooltip:
      'Die letzten Schlagzeilen mit dem Blatt, das sie gebracht hat. Jede Bewegung des Zeigers hat hier eine Zeile.',
    why: 'Ein Zeiger ohne Begründung ist ein Stimmungsbarometer: der Spieler sieht den Ausschlag und hat keine Möglichkeit herauszufinden, woher er kam. Deshalb werden Meldung und Messwert immer zusammen geschrieben. Die meisten Schlagzeilen wiegen bewusst null — Niederlagen, Serien, Aufstiege und das, was ein Blatt in einer ruhigen Woche druckt. Ohne sie wäre die Presse für einen sauberen Verein eine leere Seite über eine ganze Karriere.',
    since: '0.4.0',
    related: ['press.pressure']
  },
  'press.investigation': {
    label: 'Akte beim Verband',
    tooltip:
      'Ab 25 % legt der Verband eine Akte an. Erst dann wird an jedem Spieltag geprüft, ob durchsucht wird.',
    manual:
      '## Die Akte\n\nAb 25 % Ermittlungsdruck legt der Verband eine Akte an. Das ist noch keine Strafe — es ist die Ankündigung, dass ab jetzt an jedem Spieltag gewürfelt wird.\n\nDie Wahrscheinlichkeit einer Razzia wächst mit dem Zeiger und ist nach oben gedeckelt: der Verband durchsucht denselben Verein nicht jede zweite Woche.\n\nEine Razzia kostet eine Geldstrafe, die mit dem Ausschlag wächst, und bringt die lauteste Schlagzeile im ganzen Spiel — die Bilder sind teurer als das Bußgeld.\n\nDie Akte schließt sich wieder, sobald der Zeiger unter 25 % fällt. Das ist der einzige Weg nach unten, der nicht Zeit heißt.\n\nWer im Baum weit genug gegangen ist, für den wird gar keine Akte mehr geöffnet.',
    why: 'Der Prototyp hat ohne Vorwarnung durchsucht: ab 25 % wurde jeden Spieltag gewürfelt und im Trefferfall Geld vom Konto genommen. Eine Strafe ohne Entscheidung davor — nichts, was der Spieler hätte kommen sehen, und nichts, was er danach hätte anders machen können. Die Akte kostet am Ende genauso viel, macht die Kosten aber fair: es gibt jetzt Spieltage, in denen das Senken des Zeigers ein echter Zug ist. Das ist auch das Einzige, was Medien-Training zu etwas macht, das man KAUFT, statt zu etwas, das man gekauft haben sollte.',
    since: '0.4.0',
    related: ['press.pressure', 'finance.balance']
  }
});
