import { defineDocs } from '$lib/docs/registry';

export const staffDocs = defineDocs({
  'staff.headcount': {
    label: 'Im Stab',
    tooltip: 'Wie viele Fachkräfte derzeit angestellt sind.',
    why: 'Steht neben der Gehaltssumme, weil die beiden Zahlen zusammen die Frage beantworten, die der Spieler wirklich hat: lohnt sich das noch. Eine allein tut das nicht.',
    since: '0.1.0',
    related: ['staff.wageBill']
  },
  'staff.wageBill': {
    label: 'Gehaltssumme Stab',
    tooltip: 'Was der gesamte Trainerstab pro Spieltag kostet, unabhängig vom Spielergehalt.',
    why: 'Der Stab ist die Ausgabe, die man am leichtesten vergisst: einmal eingestellt, läuft sie stillschweigend weiter. Sie steht deshalb als eigene Zahl da und nicht versteckt in den Betriebskosten.',
    since: '0.1.0',
    related: ['finance.balance', 'staff.hire']
  },
  'staff.hire': {
    label: 'Verpflichten',
    tooltip: 'Einmalige Ablöse sofort, danach ein festes Gehalt pro Spieltag.',
    manual: '## Der Trainerstab\n\nJede Fachkraft wirkt auf genau eine Zahl im Verein — Fitnessverlust, Ausfallzeit, Ablöse, Heimstärke. Was sie bewirkt, steht auf ihrer Karte, bevor du sie einstellst.\n\nDie Ablöse fällt sofort an, das Gehalt läuft weiter. Ein Stab, der zur Mannschaft passt, ist über eine Saison günstiger als jeder Transfer — aber ein Stab, den du nicht brauchst, ist eine Dauerlast, die niemand mehr erwähnt.',
    why: 'Personal ist die billigste dauerhafte Verbesserung im Spiel und deshalb die erste echte Investitionsentscheidung: sofortige Kosten gegen einen Effekt, der sich erst über Spieltage auszahlt.',
    since: '0.1.0',
    related: ['staff.wageBill', 'staff.effects']
  },
  'staff.dismiss': {
    label: 'Freistellen',
    tooltip: 'Beendet das Arbeitsverhältnis. Das Gehalt entfällt ab dem nächsten Spieltag, die Ablöse ist verloren.',
    why: 'Ohne einen Weg zurück wäre jede Einstellung endgültig, und der Spieler würde aus Vorsicht gar nicht erst einstellen. Die verlorene Ablöse hält die Entscheidung trotzdem ernst.',
    since: '0.1.0',
    related: ['staff.hire']
  },
  'staff.effects': {
    label: 'Was dein Stab bewirkt',
    tooltip: 'Alle aktiven Beiträge deines Stabs, mit der Person daneben, die sie verursacht.',
    manual: '## Wirkung statt Vermutung\n\nDiese Liste nennt jede Wirkung und wer sie verursacht. Sie steht hier, damit du sehen kannst, was du gekauft hast, statt es aus dem Kontostand zu erschließen.\n\nMehrere Kräfte können dieselbe Zahl bewegen. Sie addieren und multiplizieren sich dann, statt sich gegenseitig zu ersetzen.',
    why: 'Eine Verbesserung, deren Wirkung sich nur in der Gesamtbilanz zeigt, ist für den Spieler unsichtbar: er kann ein Ergebnis nicht auf eine Entscheidung zurückführen, die vier Stunden zurückliegt. Diese Liste ist die Gegenmaßnahme.',
    since: '0.1.0',
    related: ['staff.hire']
  }
});
