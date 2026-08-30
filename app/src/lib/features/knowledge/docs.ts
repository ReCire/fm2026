import { defineDocs } from '$lib/docs/registry';

export const knowledgeDocs = defineDocs({
  'knowledge.tree': {
    label: 'Wissensbaum',
    tooltip: 'Acht Doktrinen mit je einem eigenen Weg. Du wirst nie alle gehen können.',
    manual: '## Doktrinen\n\nJeder Knoten kostet Wissenspunkte und Geld. Wissenspunkte kommen langsam und für jeden Verein gleich — sie sind die eigentliche Knappheit. Der Baum ist deshalb keine Einkaufsliste, die man irgendwann abhakt, sondern eine Reihe von Entscheidungen darüber, was du NICHT machst.\n\nVerbündete Doktrinen ergänzen sich, verfeindete behindern sich. Wer alles ein bisschen mitnimmt, bekommt am Ende nichts Ganzes.',
    why: 'Bei rund sechzehn Wissenspunkten pro Saison und mehreren hundert für den ganzen Baum schließt ihn niemand ab. Genau das macht jeden Kauf zu einem Verzicht.',
    since: '0.2.0',
    related: ['knowledge.points', 'knowledge.dormant', 'knowledge.cost']
  },
  'knowledge.points': {
    label: 'Wissenspunkte',
    tooltip: 'Kommen mit der Zeit, nicht mit dem Erfolg: einer alle drei Spieltage, fünf zum Saisonende.',
    why: 'Punkte an Ergebnisse zu koppeln würde sich aufschaukeln — der Verein, der ohnehin gewinnt, lernt am schnellsten und zieht davon. Ein Verein im Abstiegskampf lernt trotzdem, nur langsam.',
    since: '0.2.0',
    related: ['knowledge.tree']
  },
  'knowledge.cost': {
    label: 'Kosten',
    tooltip: 'Wissenspunkte sind für alle gleich. Der Geldpreis richtet sich nach deiner Liga.',
    manual: '## Zwei Währungen\n\nWissenspunkte entscheiden, WAS du nimmst. Geld entscheidet, WANN.\n\nDer Geldpreis skaliert mit der Liga, weil die Startguthaben der fünf Karrieren um das Vierzigfache auseinanderliegen. Bei einem festen Preis würde der Investor-Start die unteren vier Stufen am ersten Tag durchkaufen, ohne es zu merken, während der Aufsteiger ein Fünftel seines Vermögens für einen einzigen Knoten ausgibt — die wirtschaftliche Hürde gäbe es dann nur für den Verein, der ohnehin die wenigsten Möglichkeiten hat.',
    why: 'Die vier Multiplikatoren sind die am wenigsten abgesicherten Zahlen im ganzen Baum: gemessen für die vierte Liga, geschätzt darüber. Sobald die höheren Ligen wirklich simuliert sind, gehören sie neu hergeleitet statt übernommen.',
    since: '0.2.0',
    related: ['knowledge.points', 'finance.balance']
  },
  'knowledge.dormant': {
    label: 'Noch nicht verfügbar',
    tooltip: 'Dieser Knoten ist ausgearbeitet, aber seine Wirkung greift im Spiel noch nicht. Er lässt sich deshalb nicht kaufen.',
    manual: '## Warum manche Knoten gesperrt sind\n\nEin Knoten ist erst käuflich, wenn seine Wirkung tatsächlich irgendwo im Spiel ankommt. Das prüft das Spiel beim Start selbst, indem es nachsieht, ob überhaupt ein Bereich den betreffenden Effekt ausliest.\n\nDas ist keine Sparmaßnahme, sondern eine Zusage: Was du hier kaufen kannst, wirkt auch. Ein Knoten, der 750.000 € kostet und nichts tut, wäre der teuerste Fehler, den dieses Spiel machen könnte.',
    why: 'Der Baum kam mit 53 Effektschlüsseln, von denen zur Landung exakt null vom Spiel ausgelesen wurden — 140 Knoten, die korrekt berechnet, korrekt bepreist und wirkungslos gewesen wären. Die Sperre wird beim Start aus der Registry abgeleitet, nicht in den Inhalt geschrieben, damit sie nicht in die Richtung „gilt als gesperrt, funktioniert aber" veralten kann.',
    since: '0.2.0',
    related: ['knowledge.tree']
  },
  'knowledge.research': {
    label: 'Erforschen',
    tooltip: 'Kauft diesen Knoten. Wissenspunkte und Geld werden sofort abgebucht.',
    why: 'Das Geld läuft über das Vereinskonto wie jede andere Ausgabe — eine Buchung, die still eine Zahl verringert, fehlt genau dort, wo der Spieler nachsieht, wohin sein Geld gegangen ist.',
    since: '0.2.0',
    related: ['knowledge.cost', 'finance.ledger']
  }
});
