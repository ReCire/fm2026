import { defineDocs } from '$lib/docs/registry';

export const financeDocs = defineDocs({
  'finance.balance': {
    label: 'Vereins-Konto',
    tooltip: 'Das frei verfügbare Geld des Vereins. Fällt es zu weit ins Minus, greift der Vorstand ein.',
    why: 'Der zentrale Druckpunkt des Spiels: fast jede Entscheidung kostet Geld, und der Kontostand begrenzt, wie schnell du wachsen kannst.',
    since: '0.1.0',
    related: ['finance.takeLoan', 'finance.ledger'],
    screenshot: 'finance-overview'
  },
  'finance.transferBudget': {
    label: 'Transferbudget',
    tooltip: 'Der Betrag, den du in dieser Saison für Spielerkäufe ausgeben darfst.',
    why: 'Trennt Investitionen von laufenden Kosten — sonst würde man das Gehaltsbudget für einen Star verbrennen und im Februar zahlungsunfähig sein.',
    since: '0.1.0',
    related: ['finance.wageBudget']
  },
  'finance.wageBudget': {
    label: 'Gehaltsbudget',
    tooltip: 'Gehaltssumme pro Spieltag, die der Vorstand mitträgt. Darüber hinaus zahlst du aus dem Vereinskonto.',
    why: 'Macht teure Verträge zu einer Dauerbelastung statt zu einer einmaligen Ausgabe.',
    since: '0.1.0',
    related: ['finance.transferBudget']
  },
  'finance.takeLoan': {
    label: 'Kredit aufnehmen',
    tooltip: 'Nimmt sofort Geld auf. Kostet ab dem nächsten Spieltag Zinsen, die automatisch abgebucht werden.',
    manual: '## Kredite\n\nEin Kredit verschafft dir sofort Handlungsfähigkeit — für einen Transfer, einen Stadionausbau oder um eine Gehaltslücke zu überbrücken. Die Zinsen werden jeden Spieltag automatisch vom Vereinskonto abgebucht, unabhängig davon, wie das Spiel ausgegangen ist.\n\nDie Tilgung ist freiwillig: du entscheidest, wann du zurückzahlst. Solange Restschuld besteht, läuft der Zins weiter.',
    why: 'Erlaubt bewusst riskantes Spiel — vorziehen von Erfolg gegen dauerhafte Belastung. Ohne Kredit wäre ein schlechter Saisonstart nicht mehr aufzuholen.',
    since: '0.1.0',
    related: ['finance.repayLoan', 'finance.balance'],
    screenshot: 'finance-loan-sheet'
  },
  'finance.repayLoan': {
    label: 'Kredit tilgen',
    tooltip: 'Zahlt einen Teil der Restschuld zurück und senkt damit die laufenden Zinsen.',
    why: 'Gibt dem Spieler eine sinnvolle Verwendung für Überschüsse, statt Geld nur zu horten.',
    since: '0.1.0',
    related: ['finance.takeLoan']
  },
  'finance.ledger': {
    label: 'Buchungen',
    tooltip: 'Jede Einnahme und Ausgabe des Spieltags, nach Quelle aufgeschlüsselt.',
    why: 'Macht die Simulation nachvollziehbar: wenn das Konto sinkt, kannst du genau sehen, welches System dafür verantwortlich war.',
    since: '0.1.0',
    related: ['finance.balance'],
    screenshot: 'finance-ledger'
  }
});
