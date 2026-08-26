import { defineDocs } from '$lib/docs/registry';

export const transferDocs = defineDocs({
  'transfer.market': {
    label: 'Transfermarkt',
    tooltip: 'Die aktuell verfügbaren Spieler mit Ablöse. Die Liste wird jeden Spieltag komplett neu besetzt.',
    manual: '## Der Transfermarkt\n\nDer Markt zeigt sechs Spieler, deren Stärke sich an deiner Liga orientiert: je höher du spielst, desto besser die Auswahl — und desto teurer. Ein Aufstieg verändert den Markt also sofort und spürbar.\n\nDie Liste wird zu jedem Spieltag neu befüllt. Ein Spieler, den du heute nicht kaufst, ist morgen weg.',
    why: 'Die Liste wird bewusst vollständig ausgetauscht statt nur ergänzt: sonst würde man beliebig lange auf den perfekten Spieler warten, und Kaufen wäre nie eine Entscheidung unter Zeitdruck.',
    since: '0.1.0',
    related: ['transfer.buy', 'transfer.freeAgents', 'finance.transferBudget'],
    screenshot: 'transfer-market'
  },
  'transfer.buy': {
    label: 'Kaufen',
    tooltip: 'Verpflichtet den Spieler sofort gegen die volle Ablöse. Der Betrag wird vom Vereinskonto abgebucht.',
    why: 'Modelliert die Ablösesumme als einmalige Investition — der eigentliche Preis eines Spielers ist sein Gehalt, das ab sofort jeden Spieltag läuft.',
    since: '0.1.0',
    related: ['transfer.market', 'squad.wage', 'finance.balance']
  },
  'transfer.freeAgents': {
    label: 'Ablösefreie Spieler',
    tooltip: 'Vertragslose Spieler. Keine Ablöse, aber ein Handgeld in Höhe mehrerer Spieltagsgehälter.',
    why: 'Der Ausweg für einen klammen Verein: schwächere Spieler, dafür ohne Ablöse. Damit bleibt der Kader auch dann auffüllbar, wenn das Konto leer ist — sonst wäre eine Verletzungswelle bei Ebbe in der Kasse das Spielende.',
    since: '0.1.0',
    related: ['transfer.signFree', 'transfer.market']
  },
  'transfer.signFree': {
    label: 'Verpflichten',
    tooltip: 'Nimmt den vertragslosen Spieler unter Vertrag. Fällig wird nur das Handgeld.',
    why: 'Das Handgeld hängt am Gehalt, nicht am Marktwert: ein starker Ablösefreier ist billig zu holen und teuer zu halten — genau die Falle, die Vereine in der Realität stellt.',
    since: '0.1.0',
    related: ['transfer.freeAgents', 'squad.wage']
  },
  'transfer.offers': {
    label: 'Transferanfragen',
    tooltip: 'Angebote anderer Vereine für deine Spieler. Jedes Angebot verfällt nach wenigen Spieltagen.',
    manual: '## Eingehende Angebote\n\nAndere Vereine bieten von sich aus für deine besseren Spieler. Ein Angebot liegt drei Spieltage auf dem Tisch; danach zieht der Verein es zurück.\n\nDu hast vier Möglichkeiten: annehmen, ablehnen, oder nachverhandeln — mit +15%, +35% oder einem +60%-Bluff. Nachverhandeln ist kein Freifahrtschein: der Käufer kann die Forderung akzeptieren, sich auf die Mitte einigen, oder die Verhandlung abbrechen und komplett verschwinden.',
    why: 'Verkäufe sind die zweite Geldquelle neben dem Stadion. Dass die Angebote von selbst kommen und wieder verfallen, macht daraus ein Timing-Problem statt eines Menüpunkts, den man abarbeitet, wenn Geld fehlt.',
    since: '0.1.0',
    related: ['transfer.accept', 'transfer.counterSoft', 'transfer.reject'],
    screenshot: 'transfer-offers'
  },
  'transfer.accept': {
    label: 'Annehmen',
    tooltip: 'Vollzieht den Transfer zum aktuellen Gebot. Der Spieler verlässt sofort den Kader.',
    why: 'Der Kader darf dabei nie unter elf Spieler fallen — sonst könnte man sich für schnelles Geld spielunfähig verkaufen und das Spiel hätte keinen Boden mehr.',
    since: '0.1.0',
    related: ['transfer.offers', 'finance.transferBudget']
  },
  'transfer.reject': {
    label: 'Ablehnen',
    tooltip: 'Weist das Angebot zurück. Lag es deutlich über dem Marktwert, kostet das den Spieler Moral.',
    why: 'Gibt dem Nein einen Preis. Ohne den Moralverlust wäre Ablehnen immer folgenlos und die Entscheidung damit keine.',
    since: '0.1.0',
    related: ['transfer.offers', 'squad.morale']
  },
  'transfer.counterSoft': {
    label: '+15% fordern',
    tooltip: 'Fordert 15% mehr als das aktuelle Gebot. Bei einer Forderung nahe am Marktwert zahlt der Käufer meistens.',
    manual: '## Nachverhandeln\n\nEntscheidend ist nicht, wie viel Prozent du draufschlägst, sondern wie weit die Forderung über dem **Marktwert** des Spielers liegt.\n\n- bis 1,15× Marktwert: der Käufer zahlt in 70% der Fälle, bricht nur in 10% ab\n- bis 1,40× Marktwert: 40% zahlen, 25% Abbruch\n- darüber: nur noch 15% zahlen, 45% Abbruch\n\nGeht es weder auf noch schief, einigt man sich auf die Mitte zwischen Gebot und Forderung. Das erhöht das Gebot — und damit auch die Forderung der nächsten Runde. Jede weitere Runde ist also gefährlicher als die vorige.\n\nNach vier Runden ist die Geduld des Käufers aufgebraucht.',
    why: 'Die 1,15er-Schwelle ist der Kern: sie belohnt Nachverhandeln genau so weit, dass es sich fast immer lohnt einmal zu fordern — und bestraft es hart, sobald man gierig wird. Verschöbe man sie nach oben, wäre Pokern immer richtig und die Annehmen-Taste sinnlos.',
    since: '0.1.0',
    related: ['transfer.counterHard', 'transfer.counterBluff', 'transfer.offers'],
    screenshot: 'transfer-negotiation'
  },
  'transfer.counterHard': {
    label: '+35% fordern',
    tooltip: 'Fordert 35% mehr. Deutlich riskanter — der Käufer bricht hier schon in jedem vierten Fall ab.',
    why: 'Die mittlere Stufe existiert, damit die Entscheidung nicht binär ist. Sie ist der Punkt, an dem der erwartete Gewinn kippt: darunter lohnt Fordern fast immer, darüber fast nie.',
    since: '0.1.0',
    related: ['transfer.counterSoft']
  },
  'transfer.counterBluff': {
    label: '+60% Bluff',
    tooltip: 'Eine Maximalforderung. Meist folgt der Verhandlungsabbruch — aber wenn sie durchgeht, ist es der Transfer der Saison.',
    why: 'Bewusst als schlechte Wette gebaut: die Auszahlung muss groß genug sein, dass man es einmal probieren will, und die Abbruchquote hoch genug, dass man es nicht zur Gewohnheit macht.',
    since: '0.1.0',
    related: ['transfer.counterSoft']
  },
  'transfer.negotiationRound': {
    label: 'Verhandlungsrunde',
    tooltip: 'Wie oft schon nachverhandelt wurde. Nach vier Runden ist die Geduld des Käufers aufgebraucht.',
    why: 'Die Rundenbegrenzung ist eine Ergänzung zum Prototyp: dort konnte man beliebig oft fordern, und weil eine Forderung nahe am Marktwert in 70% der Fälle durchgeht, war Spammen der Annehmen-Taste rechnerisch überlegen. Der Deckel macht aus dem Automatismus wieder eine Abwägung.',
    since: '0.1.0',
    related: ['transfer.counterSoft']
  },
  'transfer.quickSell': {
    label: 'Blitzverkauf',
    tooltip: 'Verkauft den Spieler sofort für 80% seines Marktwerts, ohne auf ein Angebot zu warten.',
    why: 'Der Abschlag von 20% ist der Preis für Sofortigkeit. Er muss weh tun, sonst wäre Warten auf ein echtes Angebot nie die bessere Wahl und der ganze Verhandlungsteil wäre Dekoration.',
    since: '0.1.0',
    related: ['transfer.offers', 'finance.balance']
  }
});
