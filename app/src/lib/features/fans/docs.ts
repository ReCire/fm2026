import { defineDocs } from '$lib/docs/registry';

export const fansDocs = defineDocs({
  'fans.overview': {
    label: 'Fan-Zentrale',
    tooltip:
      'Wie es um die Stimmung auf den Rängen steht — nicht als eine Zahl, sondern als vier: Ultras, Alte Garde, Familien und Loge.',
    why:
      'Ein einzelner Stimmungsbalken verschweigt, WESSEN Stimmung gemeint ist. Ein Verein, der nur eine Gruppe bedient, merkt das an einer anderen Stelle der Bilanz.',
    since: '0.7.0',
    related: ['fans.stewards', 'fans.action']
  },
  'fans.stewards': {
    label: 'Ordnerdienst',
    tooltip:
      'Wie viele Ordner im Einsatz sind. Mehr Ordner heben die Sicherheitsquote, kosten aber laufend.',
    why:
      'Sicherheit ist eine Entscheidung, keine Konstante — ein Verein, der am Ordnerdienst spart, spart sichtbar.',
    since: '0.7.0',
    related: ['fans.overview']
  },
  'fans.action': {
    label: 'Fan-Aktion',
    tooltip:
      'Eine einmalige Aktion für die Kurve. Kostet sofort und hebt die Stimmung aller vier Gruppen.',
    why:
      'Eine Investition, die man auf den Rängen SEHEN kann, ist etwas anderes als ein Etat-Posten, der nur die Bilanz bewegt.',
    since: '0.7.0',
    related: ['fans.overview', 'finance.balance']
  }
});
