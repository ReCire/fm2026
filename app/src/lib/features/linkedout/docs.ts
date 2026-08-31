import { defineDocs } from '$lib/docs/registry';

export const linkedoutDocs = defineDocs({
  'linkedout.competence': {
    label: 'Kompetenz',
    tooltip:
      'Wie gut diese Führungskraft entscheidet — nicht wie schnell. Wer eine Abteilung übernimmt, erledigt alles pünktlich; ob es richtig war, steht in der Bilanz.',
    manual:
      '## Kompetenz\n\nDer einzige interessante Wert auf dieser Seite. Das Gehalt korreliert damit, aber unvollkommen — ein schwacher Kandidat kann teurer sein als ein starker, und genau deshalb gibt es hier überhaupt eine Entscheidung.\n\nEine schwache Führungskraft ist keine langsame Führungskraft. Sie trifft jede Entscheidung, rechtzeitig, und einige davon falsch: sie hält bei Verkäufen einen zu niedrigen Preis, oder sie arbeitet die Vertragsliste nach Gehalt ab statt nach Klasse, so dass das Geld alle ist, bevor sie beim billigen, nützlichen Ergänzungsspieler ankommt.\n\nWer sich in der Liga nach oben arbeitet, bekommt bessere Bewerbungen. In der Regionalliga bewirbt sich niemand mit 95.',
    why: 'Delegation ist ein Tausch, keine Bequemlichkeit: man wird nicht mehr gefragt, entscheidet aber auch nicht mehr. Würde die Oberfläche Kompetenz als Tempo verkaufen, hieße die Zahl nicht mehr das, was die Engine damit macht.',
    since: '0.7.0',
    related: ['linkedout.hire', 'linkedout.dismiss']
  },
  'linkedout.hire': {
    label: 'Einstellen',
    tooltip:
      'Übergibt die Abteilung. Ihre Vorgänge verschwinden aus deinem Posteingang, ihre Entscheidungen trifft ab sofort jemand anderes.',
    why: 'Der eigentliche Gewinn ist nicht eine Zahl, die steigt — es ist ein Posteingang, der leiser wird. Deshalb zeigt die Seite auch, was die Führungskräfte gerade erledigen: eine Abteilung, die einfach still ist, sieht aus wie eine Abteilung, in der nichts ansteht.',
    since: '0.7.0',
    related: ['linkedout.competence', 'linkedout.dismiss', 'linkedout.pending']
  },
  'linkedout.dismiss': {
    label: 'Trennen',
    tooltip: 'Beendet die Zusammenarbeit. Du bekommst die Abteilung und ihre Entscheidungen zurück.',
    why: 'Eine Übergabe muss reversibel sein, sonst ist die Einstellung keine Entscheidung, sondern ein Einbahnstraßen-Kauf — und niemand probiert etwas aus, das er nicht rückgängig machen kann.',
    since: '0.7.0',
    related: ['linkedout.hire']
  },
  'linkedout.pending': {
    label: 'Noch nicht übergebbar',
    tooltip:
      'Für diese Abteilung gibt es noch niemanden, der sie führen könnte. Bis dahin würdest du nur aufhören, sie zu sehen.',
    why: 'Eine delegierte Abteilung wird für den Spieler stummgeschaltet und läuft weiter — ohne jemanden, der entscheidet, laufen Angebote unbeantwortet ab und Verträge aus, unsichtbar. Deshalb wird die Stelle angezeigt, aber nicht besetzt: ein Bauplan, keine Falle.',
    since: '0.7.0',
    related: ['linkedout.hire']
  },
  'linkedout.premium': {
    label: 'LinkedOut Premium',
    tooltip:
      'Zeigt den Namen hinter gesperrten Profilen. Sonst nichts. Die Kandidaten werden davon nicht besser.',
    why: 'Der Witz funktioniert nur, solange die Bezahlschranke wirklich ärgerlich und wirklich ignorierbar ist. Eine Schranke, die eine bessere Führungskraft verkauft, ist kein Witz über Karrierenetzwerke mehr, sondern eines.',
    since: '0.7.0',
    related: ['linkedout.competence']
  },
  'linkedout.handled': {
    label: 'Wird erledigt',
    tooltip:
      'Vorgänge, die gerade jemand anderes bearbeitet — und die du deshalb nicht mehr im Posteingang siehst.',
    why: 'Das ist der Beweis, dass das Gehalt etwas gekauft hat. Eine Abteilung, die einfach verstummt, ist nicht von einer zu unterscheiden, in der nichts anliegt — „drei Dinge, über die du nicht mehr nachdenken musst" schon.',
    since: '0.7.0',
    related: ['linkedout.hire']
  }
});
