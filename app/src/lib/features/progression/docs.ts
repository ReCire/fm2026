import { defineDocs } from '$lib/docs/registry';

export const progressionDocs = defineDocs({
  'progression.narrative': {
    label: 'Startgeschichte',
    tooltip: 'Wo deine Karriere beginnt — Liga, Kontostand, und welche Bereiche dir von Anfang an offenstehen.',
    manual: '## Startgeschichten\n\nEine Startgeschichte ist kein Schwierigkeitsregler. Sie verändert, womit du anfängst, was dir offensteht und **in welcher Reihenfolge** sich der Rest öffnet.\n\nDer Investor bekommt früh Zugriff auf Holding und Industrie und lernt das Sportliche später. Die Talentschmiede fängt mit Jugend und Training an und darf lange nichts kaufen. Zwei Karrieren spielen sich dadurch wie zwei verschiedene Spiele, nicht wie dasselbe Spiel mit anderen Zahlen.',
    why: 'Ein Managerspiel, das immer gleich beginnt, wird beim zweiten Durchlauf zur Routine. Die Reihenfolge, in der man Systeme kennenlernt, ist die stärkste Stellschraube dafür, wie sich ein Neuanfang anfühlt.',
    since: '0.2.0',
    related: ['progression.unlocks', 'onboarding.club'],
    screenshot: 'onboarding-narrative'
  },
  'progression.unlocks': {
    label: 'Freigeschaltete Bereiche',
    tooltip: 'Welche Bereiche des Spiels dir aktuell zur Verfügung stehen. Weitere öffnen sich, während du vorankommst.',
    manual: '## Freischaltungen\n\nDu bekommst nicht alle 31 Bereiche auf einmal. Sie öffnen sich nacheinander, in der Reihenfolge deiner Startgeschichte.\n\nGesperrte Bereiche laufen auch im Hintergrund nicht mit: eine Fabrik, die du noch nicht freigeschaltet hast, verdient auch kein Geld.',
    why: 'Alles gleichzeitig anzubieten ist der zuverlässigste Weg, jemanden im ersten Spiel zu verlieren. Schrittweise Freischaltung ersetzt ein Tutorial, das niemand liest.',
    since: '0.2.0',
    related: ['progression.narrative', 'progression.delegate']
  },
  'progression.delegate': {
    label: 'Bereich abgeben',
    tooltip: 'Übergib diesen Bereich an eine Führungskraft. Sie trifft die Entscheidungen automatisch, du siehst nur noch die Ergebnisse.',
    manual: '## Delegieren\n\nNicht jeder Bereich muss dich interessieren. Wer keine Lust auf Rohstoffpreise hat, stellt jemanden ein, der sich darum kümmert.\n\nEine Führungskraft trifft dieselben Entscheidungen wie du — nur ohne dich zu fragen, und selten so gut. Du kannst jederzeit wieder übernehmen.',
    why: 'Der Konzern-Teil des Spiels ist tief, und Tiefe wird zur Last, wenn sie verpflichtend ist. Delegieren lässt den Spieler wählen, welches Spiel er heute spielen will, ohne dass ein System abgeschaltet werden muss.',
    since: '0.2.0',
    related: ['progression.unlocks'],
    screenshot: 'progression-delegate'
  },
  'progression.progress': {
    label: 'Fortschritt',
    tooltip: 'Wie viel deiner Startgeschichte du bereits geöffnet hast.',
    why: 'Macht sichtbar, dass noch etwas kommt — ohne zu verraten, was.',
    since: '0.2.0',
    related: ['progression.unlocks']
  }
});
