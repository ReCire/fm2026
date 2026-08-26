import { defineDocs } from '$lib/docs/registry';

export const onboardingDocs = defineDocs({
  'onboarding.name': {
    label: 'Dein Name',
    tooltip: 'Wie dich Presse, Vorstand und Spieler ansprechen.',
    why: 'Der billigste Weg, aus einer Tabellenkalkulation eine Geschichte zu machen: ab hier passiert alles dir und nicht einem Verein.',
    since: '0.2.0',
    related: ['onboarding.avatar', 'onboarding.background'],
    screenshot: 'onboarding-manager'
  },
  'onboarding.avatar': {
    label: 'Porträt',
    tooltip: 'Dein Gesicht im Spiel — in der Presse, im Postfach und auf der Bank.',
    why: 'Wird aus einer Kennung erzeugt statt aus Bilddateien, damit das Projekt ohne Binärdateien auskommt und Porträts sich mit den Farbtokens ändern.',
    since: '0.2.0',
    related: ['onboarding.name']
  },
  'onboarding.background': {
    label: 'Herkunft',
    tooltip: 'Woher du kommst. Ex-Profi, Analyst, Unternehmer oder Quereinsteiger.',
    why: 'Aktuell reine Charakterisierung. Es ist bewusst der Platz, an dem später Startboni hängen können, ohne dass ein neues Auswahlfeld erfunden werden muss.',
    since: '0.2.0',
    related: ['onboarding.name']
  },
  'onboarding.club': {
    label: 'Verein wählen',
    tooltip: 'Der Verein, den du übernimmst. Bestimmt Liga, Stadion und wie viel Geduld man mit dir hat.',
    manual: '## Vereinswahl\n\nJeder Startverein steht für eine andere Ausgangslage — nicht nur für eine andere Liga. Ein Traditionsverein in der vierten Liga hat Fans und keine Mittel; ein Zweitligist mit Vergangenheit hat Erwartungen, die er selbst nicht mehr erfüllen kann.\n\nDie Wahl schränkt ein, welche Startgeschichten danach zur Auswahl stehen: eine Abstiegsgeschichte passt nicht zu einem Spitzenklub.',
    why: 'Die erste echte Entscheidung des Spiels. Sie muss etwas bedeuten, sonst ist es nur ein Namensfeld mit Wappen.',
    since: '0.2.0',
    related: ['progression.narrative', 'onboarding.start'],
    screenshot: 'onboarding-club'
  },
  'onboarding.next': {
    label: 'Weiter',
    tooltip: 'Zum nächsten Schritt. Wird erst aktiv, wenn dieser Schritt vollständig ist.',
    why: 'Der Knopf bleibt sichtbar und wird deaktiviert statt zu verschwinden — verschwindende Schaltflächen lassen den Spieler raten, was fehlt. Was fehlt, steht daneben.',
    since: '0.2.0',
    related: ['onboarding.back']
  },
  'onboarding.back': {
    label: 'Zurück',
    tooltip: 'Einen Schritt zurück. Deine bisherigen Eingaben bleiben erhalten.',
    why: 'Ein Einstieg ohne Rückweg zwingt zum Neustart wegen eines Tippfehlers. Der Zustand bleibt erhalten, weil der Ablauf Daten sind und kein Formular.',
    since: '0.2.0',
    related: ['onboarding.next']
  },
  'onboarding.start': {
    label: 'Karriere starten',
    tooltip: 'Übernimmt den Verein und startet die erste Saison.',
    why: 'Der Punkt, an dem aus Auswahl ein Spielstand wird: ab hier legt jeder Spieltag einen Schnappschuss an und die Karriere ist echt.',
    since: '0.2.0',
    related: ['onboarding.club', 'game.advance'],
    screenshot: 'onboarding-confirm'
  },
  'onboarding.skip': {
    label: 'Überspringen',
    tooltip: 'Startet sofort mit einem vorgeschlagenen Namen, Verein und der Standardgeschichte.',
    why: 'Wer zum zweiten Mal anfängt, will nicht wieder durch fünf Schritte. Jeder verpflichtende Ablauf braucht einen Ausgang, sonst wird er beim Wiederholen zur Strafe.',
    since: '0.2.0',
    related: ['onboarding.start']
  }
});
