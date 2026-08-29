import { defineDocs } from '$lib/docs/registry';

export const sponsorsDocs = defineDocs({
  'sponsors.active': {
    label: 'Aktueller Sponsor',
    tooltip: 'Der laufende Vertrag: was er pro Spieltag zahlt, was ein Sieg extra bringt, und wie viele Spieltage er noch läuft.',
    why: 'Ein Vertrag mit sichtbarem Ablauf statt eines Menüpunkts, den man einmal einstellt und vergisst.',
    since: '0.3.0',
    related: ['sponsors.offers', 'finance.balance']
  },
  'sponsors.offers': {
    label: 'Sponsoring-Angebote',
    tooltip: 'Bis zu drei Angebote, wenn kein Vertrag läuft: kurz und lukrativ, ausgewogen, oder lang und bescheiden. Eine Wahl ersetzt die anderen.',
    manual: '## Sponsoring-Angebote\n\nSobald kein Vertrag aktiv ist, liegen bis zu drei Angebote auf dem Tisch — je eines pro Archetyp:\n\n- **Kurzzeitig**: hohes Handgeld sofort, sechs Spieltage, danach ist wieder zu verhandeln.\n- **Ausgewogen**: mittleres Handgeld, zwölf Spieltage.\n- **Langfristig**: kaum Handgeld, dafür vierundzwanzig Spieltage laufende Zahlungen, ohne dass man sich wieder darum kümmern muss.\n\nDie Höhe aller drei Angebote hängt an zwei Dingen: der Liga, in der der Verein spielt, und der Form der letzten fünf Spiele. Ein Aufstieg oder eine Siegesserie macht jedes der drei Angebote größer — die Form der Wahl bleibt dieselbe.',
    why: 'Handgeld sofort gegen laufendes Einkommen ist die eigentliche Entscheidung: der kurze Vertrag passt zu einem akuten Geldbedarf (ein Transfer, ein Stadionausbau), der lange zu einem Verein, der Ruhe vor der nächsten Verhandlung will. Beträge: bei Liga 4 und neutraler Form liegt der kurze Vertrag bei 10.000 € Handgeld über sechs Spieltage, der lange bei 2.000 € über vierundzwanzig — selbst bei lückenlosem Aneinanderreihen des kurzen Vertrags bleibt eine Saison Sponsoring-Einnahmen deutlich unter den rund 169.000 € Zuschauereinnahmen einer Liga-4-Saison. Sponsoring soll eine echte, aber klar untergeordnete Einnahmequelle neben dem Stadion bleiben.',
    since: '0.3.0',
    related: ['sponsors.sign', 'sponsors.active'],
    screenshot: 'sponsors-offers'
  },
  'sponsors.sign': {
    label: 'Unterschreiben',
    tooltip: 'Nimmt dieses Angebot an. Das Handgeld wird sofort gutgeschrieben, die anderen Angebote verfallen.',
    why: 'Der einmalige Charakter der Entscheidung — ein Vertrag pro Slot, kein Sammeln — hält Sponsoring als Nebenschauplatz statt als zweites Finanzsystem.',
    since: '0.3.0',
    related: ['sponsors.offers', 'finance.balance']
  },
  'sponsors.form': {
    label: 'Vereinsform',
    tooltip: 'Die letzten fünf Ergebnisse. Eine gute Serie macht neue Sponsoring-Angebote größer, eine schlechte kleiner.',
    why: 'Koppelt Sponsoring an sportlichen Erfolg, genau wie das Stadion es über die Fan-Zufriedenheit tut — nur schneller sichtbar, weil das Fenster nur fünf Spiele misst.',
    since: '0.3.0',
    related: ['sponsors.offers']
  }
});
