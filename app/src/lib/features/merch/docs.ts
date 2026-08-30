import { defineDocs } from '$lib/docs/registry';

export const merchDocs = defineDocs({
  'merch.catalogue': {
    label: 'Fanshop',
    tooltip: 'Trikot, Schal, Kappe und Ball. Absatz und Umsatz des letzten Spieltags stehen bei jedem Artikel.',
    why: 'Vier statt einem Dutzend Artikeln, damit jeder einzeln eine sichtbare Preisentscheidung bleibt statt in einer langen Liste zu verschwinden.',
    since: '0.3.0',
    related: ['merch.price', 'merch.restock']
  },
  'merch.price': {
    label: 'Preis',
    tooltip: 'Der Verkaufspreis. Zu billig verschenkt Marge, zu teuer bricht der Absatz ein — der Markt reagiert sofort auf jede Änderung.',
    manual: '## Preisgestaltung\n\nJeder Artikel hat einen empfohlenen Preis. Der tatsächliche Absatz hängt vom Verhältnis aus deinem Preis zu diesem Wert ab:\n\n- bis 60 %: Schleuderpreis — riesige Nachfrage, kaum Marge\n- bis 85 %: günstig — spürbar mehr Absatz\n- 85–115 %: optimaler Markt — die Balance, für die der Preis gedacht ist\n- 115–145 %: teuer — gedämpfter Absatz\n- darüber: überteuert — der Absatz bricht überproportional ein\n\nDie Bänder sind bewusst nicht symmetrisch: ein Aufschlag straft härter als ein Nachlass belohnt, weil das dem tatsächlichen Kaufverhalten in einem Fanshop näherkommt als eine gerade Linie.',
    why: 'Ohne eine Elastizität wäre der Preis ein Schieberegler ohne Konsequenz. Mit ihr ist er die einzige Stellschraube im Fanshop, und sie kostet sofort etwas in beide Richtungen.',
    since: '0.3.0',
    related: ['merch.catalogue']
  },
  'merch.restock': {
    label: 'Nachbestellen',
    tooltip: 'Kauft ein Großhandelspaket dieses Artikels nach. Die Kosten werden sofort vom Vereinskonto abgebucht.',
    why: 'Leeres Lager bedeutet entgangene Verkäufe am nächsten Heimspiel — sichtbar als "verpasste" Stückzahl bei jedem Artikel, nicht nur als stiller Umsatzausfall.',
    since: '0.3.0',
    related: ['merch.catalogue', 'finance.balance']
  },
  'merch.revenue': {
    label: 'Umsatz letzter Spieltag',
    tooltip: 'Was der Fanshop beim letzten Spieltag insgesamt eingebracht hat — aus dem Stadionverkauf am Spieltag und dem laufenden Online-Geschäft.',
    why: 'Umsatz hängt an Zuschauerzahl und Tabellenstand statt an einer festen Zahl: bei rund 9.800 Zuschauern in Liga 4 und neutraler Form ergeben sich etwa 2.000 € pro Spieltag, hochgerechnet knapp 34.000 € pro Saison — spürbar, aber deutlich unter den rund 169.000 € Zuschauereinnahmen derselben Saison. Merchandise soll den Fanshop lohnend machen, ohne dem Stadion den Rang als Haupteinnahmequelle abzulaufen.',
    since: '0.3.0',
    related: ['merch.catalogue', 'stadium.attendance']
  }
});
