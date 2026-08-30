import { defineDocs } from '$lib/docs/registry';

export const industryDocs = defineDocs({
  'industry.contracts': {
    label: 'Aufträge',
    tooltip: 'Andere Vereine bestellen in Tausenden. Das ist der eigentliche Absatzmarkt einer Fabrik.',
    manual: '## Warum Aufträge und nicht der Fanshop\n\nDer eigene Fanshop verkauft bei einem Viertliga-Publikum rund zwanzig Stück pro Woche. Eine ausgebaute Fabrik produziert Hunderte.\n\nDeshalb ist der Fanshop das Rinnsal und der B2B-Auftrag das Geschäft. Ein Auftrag wird nur aus fertiger Ware bedient — nichts wird auf Bestellung produziert und nichts auf Kredit geliefert. Ein Auftrag, den du nicht decken kannst, verfällt.',
    why: 'Die erste Fassung produzierte direkt ins Fanshop-Regal. Gemessen: der Laden verkauft neunzehn Stück pro Woche, die Fabriken machten 385 — das Ganze wäre eine Maschine gewesen, die Geld in unverkäufliche Schals verwandelt.',
    since: '0.2.0',
    related: ['industry.goods', 'industry.fulfil']
  },
  'industry.fulfil': {
    label: 'Liefern',
    tooltip: 'Erfüllt den Auftrag aus dem Fertiglager. Die Prämie wird sofort gutgeschrieben.',
    why: 'Nur aus vorhandener Ware — das macht die Annahme eines Auftrags zu einer Wette auf die eigene Produktion statt zu einem kostenlosen Knopf.',
    since: '0.2.0',
    related: ['industry.contracts']
  },
  'industry.goods': {
    label: 'Fertiglager',
    tooltip: 'Fertige Ware, die auf einen Abnehmer wartet — einen Auftrag oder das Regal im Fanshop.',
    why: 'Ein eigener Bestand statt Direktlieferung ins Regal: zwei Abnehmer mit sehr unterschiedlichem Volumen brauchen einen gemeinsamen Puffer, sonst erstickt der kleinere am Ausstoß des größeren.',
    since: '0.2.0',
    related: ['industry.toShop', 'industry.contracts']
  },
  'industry.toShop': {
    label: 'In den Fanshop',
    tooltip: 'Legt fertige Ware kostenlos ins Regal. Sonst hättest du sie zum Einkaufspreis nachbestellt.',
    why: 'Hier zahlt sich „selbst herstellen ist billiger als einkaufen" tatsächlich aus. Es ist nur nicht der Grund, eine Fabrik zu besitzen — dafür ist der Laden zu klein.',
    since: '0.2.0',
    related: ['industry.goods', 'merch.restock']
  },
  'industry.why': {
    label: 'Eigene Produktion',
    tooltip: 'Eine Fabrik lohnt sich genau dann, wenn eine Einheit in der Herstellung billiger ist als im Einkauf.',
    manual: '## Warum überhaupt Fabriken\n\nDer Fanshop kann jederzeit Ware einkaufen — zu einem festen Großhandelspreis pro Stück. Eine eigene Fabrik ersetzt diesen Preis durch die reinen Rohstoffkosten.\n\nDamit hat die ganze Industrie genau eine Frage: Ist die Herstellung billiger als der Einkauf? Steigen die Rohstoffpreise, kann die Antwort für eine Weile Nein lauten — und dann steht die Halle da und kostet trotzdem Geld.',
    why: 'Der Fanshop füllt seine Regale ohnehin nach. Eine Fabrik ist deshalb nur dann etwas wert, wenn sie dieselben Stücke günstiger auf dasselbe Regal legt — sonst wäre sie eine zweite Wirtschaft neben dem Verein statt ein Teil von ihm.',
    since: '0.2.0',
    related: ['industry.market', 'industry.factory', 'merch.restock']
  },
  'industry.market': {
    label: 'Rohstoffmarkt',
    tooltip: 'Vier Rohstoffe mit schwankenden Preisen. Kaufen, wenn es günstig ist, ist der eigentliche Hebel.',
    manual: '## Der Markt\n\nJeder Rohstoff bewegt sich wöchentlich in einem festen Band und wird dabei sanft zu seinem Basispreis zurückgezogen. Ein Pechlauf kann einen Preis also nicht dauerhaft an der Decke parken.\n\nDie Bewegung ist bewusst langsam. Ein Markt, der pro Woche vierzig Prozent springt, ist ein Spielautomat — und die Entscheidung, um die es hier geht („jetzt kaufen oder warten"), ist nur dann eine Entscheidung, wenn es einen lesbaren Trend gibt.',
    why: 'Ohne Rückzug zum Basispreis hätte ein Markt einen dauerhaften Gewinner: Wer einmal billig gekauft hat, hätte für immer recht behalten.',
    since: '0.2.0',
    related: ['industry.warehouse', 'industry.why']
  },
  'industry.warehouse': {
    label: 'Lager',
    tooltip: 'Begrenzt, wie viel Rohstoff du auf Vorrat kaufen kannst. Volle Regale sind gebundenes Geld.',
    why: 'Die Lagergrenze ist es, die aus „billig kaufen" eine Entscheidung macht statt eines Automatismus — sonst würde man bei jedem Tief einfach alles kaufen, was das Konto hergibt.',
    since: '0.2.0',
    related: ['industry.market']
  },
  'industry.factory': {
    label: 'Fabrik',
    tooltip: 'Produziert jede Woche Einheiten für den Fanshop — solange Rohstoff im Lager liegt.',
    manual: '## Produktion\n\nJede Fabrik stellt pro Woche so viele Einheiten her, wie ihr Ausbaustand erlaubt und der Rohstoff im Lager hergibt. Auf Kredit wird nicht produziert: Wer kein Material hat, dessen Halle steht still.\n\nDie fertigen Stücke landen direkt im Lager des Fanshops und werden dort ganz normal verkauft.',
    why: 'Eine stillstehende Fabrik ist die Konsequenz, die den Rohstoffmarkt überhaupt interessant macht. Ohne sie wäre der Einkauf eine Formalität.',
    since: '0.2.0',
    related: ['industry.why', 'industry.buy']
  },
  'industry.buy': {
    label: 'Kaufen',
    tooltip: 'Kauft Rohstoff zum aktuellen Preis, so viel das Lager noch fasst.',
    why: 'Die Menge wird stillschweigend auf den freien Lagerplatz gekürzt statt abgelehnt — eine Bestellung, die an einer Zahl scheitert, die man erst nachrechnen muss, ist eine Fehlermeldung als Spielmechanik.',
    since: '0.2.0',
    related: ['industry.warehouse']
  },
  'industry.expand': {
    label: 'Ausbauen',
    tooltip: 'Kauft die Fabrik oder hebt sie eine Stufe. Wird sofort vom Vereinskonto abgebucht.',
    why: 'Der Kaufpreis ist gegen die Ersparnis kalkuliert, die er ersetzt: rund zwei Saisons bis zur Amortisation — lang genug, um eine echte Bindung zu sein, kurz genug, um kein Witz zu sein.',
    since: '0.2.0',
    related: ['industry.factory', 'finance.balance']
  }
});
