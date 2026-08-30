import { defineDocs } from '$lib/docs/registry';

export const youthDocs = defineDocs({
  'youth.level': {
    label: 'Akademie-Level',
    tooltip: 'Wie weit die Jugendakademie ausgebaut ist. Höhere Level bringen mehr Talent-Plätze und stärkere Rohtalente.',
    why: 'Investition mit Verzögerung: das Geld ist sofort weg, der Effekt zeigt sich erst Saisons später am Profikader — genau die Art Entscheidung, die einem Verein Charakter gibt.',
    since: '0.3.0',
    related: ['youth.upgrade', 'youth.capacity']
  },
  'youth.capacity': {
    label: 'Kapazität',
    tooltip: 'Wie viele Talente die Akademie gleichzeitig ausbilden kann.',
    why: 'Begrenzt, wie viele Wetten auf die Zukunft man gleichzeitig laufen haben kann — ohne Grenze wäre Scouten immer richtig.',
    since: '0.3.0',
    related: ['youth.level', 'youth.scout']
  },
  'youth.upgrade': {
    label: 'Akademie ausbauen',
    tooltip: 'Erhöht das Akademie-Level um eins. Wird sofort vom Vereinskonto abgebucht.',
    why: 'Die Kosten steigen mit jedem Level, damit der Ausbau eine echte Priorisierung bleibt statt einer Checkliste.',
    since: '0.3.0',
    related: ['youth.level', 'finance.balance']
  },
  'youth.scout': {
    label: 'Talent scouten',
    tooltip: 'Bringt ein neues Talent in die Akademie — jung und mit niedrigen Werten, aber mit dem stärksten Entwicklungsbonus im ganzen Training.',
    manual: '## Talente\n\nEin gescoutetes Talent ist absichtlich schwach: die Wette liegt komplett in seinem Alter. Ein Siebzehnjähriger entwickelt sich im Training deutlich schneller als jeder etablierte Profi — siehe den Trainings-Jugendbonus. Ein Talent ist also kein fertiger Spieler, sondern ein Versprechen, das erst nach ein, zwei Saisons Training einlöst.\n\nMit achtzehn steigt ein Talent automatisch in den Profikader auf, ob man will oder nicht — die Akademie ist kein Warteraum.',
    why: 'Macht die Jugendarbeit zu einer Alternative zum Transfermarkt, die auf Geduld statt auf Geld setzt.',
    since: '0.3.0',
    related: ['youth.capacity', 'training.ceiling'],
    screenshot: 'youth-academy'
  }
});
