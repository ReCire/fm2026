import { defineDocs } from '$lib/docs/registry';

export const stocksDocs = defineDocs({
  'stocks.market': {
    label: 'Kurse',
    tooltip:
      'Vier Papiere, deren Kurse sich an jedem Spieltag bewegen. Drei hängen an etwas, das du selbst beeinflusst.',
    manual:
      '## Der Markt\n\nVier Papiere, vier Charaktere. Der Kurs bewegt sich an jedem Spieltag; wie stark, sagt die Schwankung.\n\n**Rendite und Schwankung sind gegeneinander gesetzt.** Stadionpark Immobilien zahlt am meisten und bewegt sich am wenigsten; der Fan-Token ETF zahlt am wenigsten und bewegt sich am stärksten. Das ist die Entscheidung: Einkommen oder Kurs.\n\nDrei der vier folgen zu knapp der Hälfte etwas aus dem eigenen Verein — dem Stadionausbau, den Zuschauerzahlen, der Liga. Der Rest ist Zufall. Der vierte folgt gar nichts.\n\nBeim Kauf und beim Verkauf fällt eine Gebühr an.',
    why: 'Im Prototyp wurde `stockMarket[key].price` nie zugewiesen — nicht langsam bewegt, sondern überhaupt nicht: das einzige `.price =` in 8.697 Zeilen gehört dem Merchandise-Bildschirm. SAFT SE stand beim Anpfiff bei 120 € und ein Jahrzehnt später immer noch. Ein Papier, dessen Kurs sich nicht bewegen kann, ist ein Sparbuch mit Kursanzeige: Kaufen ist immer richtig, Verkaufen immer falsch, und es gibt nirgends eine Entscheidung. Die Dividende funktionierte, wurde jeden Spieltag gutgeschrieben, und deshalb ist es niemandem aufgefallen — ein Feature, das korrekt läuft und kein Spiel enthält.',
    since: '0.4.0',
    related: ['stocks.dividend', 'stocks.drivers', 'finance.balance']
  },
  'stocks.drivers': {
    label: 'Was den Kurs bewegt',
    tooltip:
      'Stadionausbau, Zuschauerzahlen, Liga — und ein Papier, das an nichts hängt.',
    manual:
      '## Antrieb\n\nJedes Papier nennt, woran es hängt:\n\n- **Stadionpark Immobilien AG** — am Stadionausbau. Du weisst vor dem Markt, wann gebaut wird.\n- **Windpark Nordkurve eG** — an den Zuschauerzahlen.\n- **SAFT SE** — an der Liga, in der der Verein spielt.\n- **KryptoKick Fan-Token ETF** — an nichts.\n\nKnapp die Hälfte einer Kursbewegung kommt vom Antrieb, der Rest ist Zufall. Eine gut begründete Vermutung liegt meistens richtig und nie sicher.',
    why: 'Ein Markt aus reinem Zufall ist ein Spielautomat, ein Markt aus reiner Berechnung eine Tabelle, die man einmal ausfüllt. Der Anteil dazwischen ist der ganze Wert davon, etwas zu wissen. Dass ausgerechnet das Papier mit „Fan" im Namen an nichts hängt, am schlechtesten zahlt und am stärksten schwankt, ist der Witz — er funktioniert aber nur, wenn die anderen drei wirklich hängen. Genau ein Papier ohne Antrieb: bei zweien wäre der Markt ein Casino, bei keinem eine Tabelle.',
    since: '0.4.0',
    related: ['stocks.market']
  },
  'stocks.dividend': {
    label: 'Dividende',
    tooltip:
      'Wird an jedem Spieltag auf den aktuellen Wert des Bestands gezahlt — nicht auf den Kaufpreis.',
    manual:
      '## Dividende\n\nGezahlt an jedem Spieltag, als Anteil am **aktuellen Wert** des Bestands.\n\nZwei Knoten im Wissensbaum erhöhen die Dividenden. Auf den Kurs wirken sie nicht.',
    why: 'Auf den aktuellen Wert und nicht auf den Kaufpreis, weil ein eingebrochenes Papier sonst weiterzahlen würde, als wäre nichts geschehen — das Sparbuch käme durch die Hintertür zurück. Und die Wissensknoten bleiben bewusst auf der Dividende: Information gehört in den Wissensbaum, Glück nicht. Ein Knoten, der den Kurs anhebt, wäre kein Wissen, sondern ein Gefallen.',
    since: '0.4.0',
    related: ['stocks.market', 'knowledge.dormant']
  }
});
