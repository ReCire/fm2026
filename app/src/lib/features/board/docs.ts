import { defineDocs } from '$lib/docs/registry';

export const boardDocs = defineDocs({
  'board.trust': {
    label: 'Vorstandsvertrauen',
    tooltip:
      'Was der Aufsichtsrat von der Arbeit hält. Bei 0 % endet die Zusammenarbeit — und nur dann.',
    manual:
      '## Vertrauen\n\nEin neuer Trainer startet bei 60 %. Der Wert bewegt sich aus drei Quellen:\n\n**Die Tabelle, wöchentlich.** Steht der Verein über dem erwarteten Platz, steigt der Wert leicht; steht er darunter, fällt er. Bewusst klein — der Aufsichtsrat tagt viermal im Jahr, das hier ist das Gespräch auf dem Flur dazwischen.\n\n**Das Saisonende.** Die eigentliche Abrechnung: Plätze über dem Ziel zählen weniger als Plätze darunter, Abstieg kostet mehr als ein Aufstieg einbringt.\n\n**Die Zeitung.** Der Vorstand liest keine Verbandsakte, er liest die Presse. Jede Schlagzeile bewegt das Vertrauen im Verhältnis zu ihrem Gewicht — eine Razzia am härtesten, eine Einstellung des Verfahrens genauso stark zurück.\n\nEs gibt keinen versteckten Würfelwurf auf eine Entlassung. Bei 0 % ist Schluss, und unter 20 % kündigt der Aufsichtsrat das vorher an.',
    why: 'Ein zweiter, unsichtbarer Entlassungswurf würde die Anzeige zur Dekoration machen: der Spieler lernt, dass die Zahl ein Vorschlag ist und die echte Regel nicht sichtbar. Das ist genau der Fehler, den der Prototyp bei der Razzia gemacht hat, nur in anderer Verkleidung. Eine sichtbare Zahl, eine Schwelle, und ein Ultimatum davor, damit die letzte Phase spielbar ist statt nur beobachtbar.',
    since: '0.4.0',
    related: ['board.expectation', 'board.floor', 'press.feed']
  },
  'board.expectation': {
    label: 'Saisonziel',
    tooltip:
      'Der Vorstand bewertet nicht den Tabellenplatz, sondern den Platz im Verhältnis zum Etat.',
    manual:
      '## Der erwartete Platz\n\nAchter mit dem achtgrößten Etat ist in Ordnung. Achter mit dem größten Etat ist der Anfang vom Ende.\n\nDer erwartete Platz entsteht aus drei Zutaten, in dieser Reihenfolge:\n\n1. **Der Etat**, verglichen mit den anderen Vereinen der Liga.\n2. **Die letzte Saison** — zu gut einem Drittel. Eine überraschend gute Spielzeit wird zur neuen Messlatte.\n3. **Der Ehrgeiz des Gremiums.** Je höher die Liga, desto stärker zieht er das Ziel nach oben, unabhängig davon, was das Geld hergibt.\n\nDas Ziel wird ausgesprochen, bevor die Saison beginnt. Es gibt keine geheime Erwartung.\n\nEin Verein kann nie für den Platz entlassen werden, den sein Vorstand von ihm verlangt hat: die Grenze zum Fehlschlag liegt immer unterhalb des Ziels.',
    why: 'Ohne die Messung am Etat ist ein Aufstiegstrainer für immer sicher und ein Regionalligist rechnerisch verloren — und die vierte Liga ist da, wo dieses Spiel anfängt. Der Ehrgeiz wächst mit der Ligahöhe, weil ein Aufsichtsrat mit dem neuntgrößten Etat, der Europapokal verlangt, keine Erfindung ist, sondern die Grundeinstellung des deutschen Vereinsfußballs. Der Wortlaut des Ziels wird aus der Zahl abgeleitet und nicht daneben geschrieben, damit die beiden sich nicht widersprechen können.',
    since: '0.4.0',
    related: ['board.trust', 'league.table', 'finance.balance']
  },
  'board.floor': {
    label: 'Abgesichert',
    tooltip:
      'Ein Wert, unter den das Vertrauen nicht mehr fallen kann. Nicht erarbeitet, sondern gekauft.',
    manual:
      '## Der Boden\n\nSieben Knoten im Wissensbaum setzen einen Mindestwert für das Vorstandsvertrauen — aus der Kurvenrepublik, der Politik und dem Schatten. Der höchste davon gilt; sie addieren sich nicht.\n\nSteht der Boden hoch genug, wird die Trainerfrage in diesem Verein nicht mehr gestellt, unabhängig von den Ergebnissen.\n\nDas ist etwas anderes als Zufriedenheit, und die Oberfläche zeigt es getrennt an: erarbeitetes Vertrauen kann nächste Saison wieder weg sein, ein Boden nicht.',
    why: 'Die Knoten addieren sich nicht, weil zwei Gremien, die dich beide nicht entlassen können, dich nicht doppelt nicht entlassen — das ist dieselbe Begründung wie beim Flag für den Ermittlungsdruck. Und die Oberfläche muss die beiden Quellen unterscheiden: rendert sie beide als „+8 Vertrauen", ist die Diplomatenloge ein Trainingsplatz mit einem anderen Symbol.',
    since: '0.4.0',
    related: ['board.trust', 'knowledge.dormant']
  },
  'board.ultimatum': {
    label: 'Ultimatum',
    tooltip: 'Unter 20 % sagt der Aufsichtsrat es laut und setzt eine Frist.',
    why: 'Eine Entlassung, die aus dem Nichts kommt, ist eine Strafe ohne Entscheidung davor — dieselbe Diagnose wie bei der Razzia im Prototyp. Das Ultimatum ändert nichts an den Kosten und alles daran, ob sie fair sind: es gibt danach Spieltage, in denen das Gegensteuern ein echter Zug ist.',
    since: '0.4.0',
    related: ['board.trust']
  }
});
