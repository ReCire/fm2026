import { z } from 'zod';

/**
 * Starting narratives.
 *
 * A narrative is not a difficulty slider. It changes what you start with, what
 * is open to you, and the ORDER things become available — so two careers play
 * as different games rather than the same game with different numbers.
 */
export const NarrativeSchema = z.object({
  id: z.string(),
  name: z.string(),
  /** One line, shown on the pick-your-story screen. */
  pitch: z.string(),
  /** The situation, in the player's own terms. */
  premise: z.string(),
  /** League level 0-3, where 0 is the top flight. */
  leagueLevel: z.number().int().min(0).max(3),
  startingMoney: z.number(),
  startingTransferBudget: z.number(),
  /** Modules available from the first minute. */
  unlockedAtStart: z.array(z.string()),
  /**
   * What opens next, in order. Progression walks this list — so a narrative
   * controls not just what you get but the sequence you meet it in.
   */
  unlockOrder: z.array(z.string()),
  /** Free-text flavour for the difficulty of this start. */
  difficulty: z.enum(['ruhig', 'normal', 'hart', 'brutal']),
  /**
   * The start offered to a first-time player, and the one the tutorial runs on.
   *
   * A flag rather than "the first element": array position is not a contract.
   * Someone reorders for a layout reason and the recommendation moves silently
   * with no test failing. A test asserts exactly one narrative carries it.
   */
  recommended: z.boolean().optional()
});
export type Narrative = z.infer<typeof NarrativeSchema>;

export const NarrativesSchema = z.array(NarrativeSchema).min(1);

/** Always open: without these there is no game to play. */
const CORE = ['core', 'finance', 'squad', 'league'];

export const narratives: Narrative[] = NarrativesSchema.parse([
  {
    id: 'aufsteiger',
    name: 'Der Aufsteiger',
    pitch:
      'Vierte Liga. Ein Hauptsponsor, der Brötchen backt.',
    premise:
      'Der Aufstieg letzte Saison war ein Betriebsunfall, den niemand eingeplant hat — am wenigsten der Schatzmeister. Du erbst einen Kader, der eine Liga zu tief zusammengekauft wurde, ein Flutlicht auf Bewährung und einen Vorstand, der das Wort „Konsolidierung“ in jedem zweiten Satz unterbringt. Halte die Klasse. Danach reden wir weiter.',
    leagueLevel: 3,
    recommended: true,
    startingMoney: 150_000,
    startingTransferBudget: 100_000,
    unlockedAtStart: [...CORE, 'stadium'],
    unlockOrder: ['transfer', 'training', 'youth', 'staff', 'sponsors', 'merch', 'fans', 'cup'],
    difficulty: 'normal'
  },
  {
    id: 'erbe',
    name: 'Das Erbe',
    pitch:
      'Erstklassig, hochverschuldet, und der Präsident wollte einen anderen.',
    premise:
      'Dein Vorgänger hat drei Jahre lang Ablösen gezahlt, die der Verein nicht hatte, und ist mit einer Abfindung gegangen, die er auch nicht hatte. Du übernimmst seinen Kader, seine Verträge und seine Presse. Der Präsident hat öffentlich erklärt, du seist „nicht die erste Wahl“ gewesen. Er wird das nicht vergessen. Die BLÖD auch nicht.',
    leagueLevel: 0,
    startingMoney: 2_400_000,
    startingTransferBudget: 1_800_000,
    unlockedAtStart: [...CORE, 'stadium', 'transfer', 'staff', 'sponsors'],
    unlockOrder: ['training', 'contracts', 'merch', 'youth', 'europe', 'fans', 'cup'],
    difficulty: 'hart'
  },
  {
    id: 'investor',
    name: 'Der Investor',
    pitch:
      'Der Verein ist nicht das Produkt. Der Verein ist der Kanal.',
    premise:
      'Ein Fonds hält 51 Prozent und dich dazu. In der Präsentation heißt der Verein „Asset“, die Kurve heißt „Community“ und der Aufstieg heißt „Roadmap“. Du bekommst Geld, wie es sonst niemand in dieser Liga bekommt. Dafür lernst du die Holding kennen, bevor du die Mannschaft kennenlernst — und am dritten Spieltag hängt das erste Banner.',
    leagueLevel: 2,
    startingMoney: 6_000_000,
    startingTransferBudget: 3_000_000,
    unlockedAtStart: [...CORE, 'stadium', 'transfer', 'holding'],
    unlockOrder: ['industry', 'rawMaterials', 'stocks', 'merch', 'staff', 'sponsors', 'training'],
    difficulty: 'ruhig'
  },
  {
    id: 'nachwuchs',
    name: 'Die Talentschmiede',
    pitch:
      'Kein Transferbudget. Dafür vierzig Betten im Internat.',
    premise:
      'Die Satzung deckelt Ablösen bei 50.000 €. Das war 1974 als Vorsichtsmaßnahme gemeint und ist seither Identität. Du kaufst niemanden. Du baust. Der erste eigene Jahrgang braucht vier Jahre, der Vorstand gibt dir drei, und die Kurve singt Namen, die sie aus der Schule kennt.',
    leagueLevel: 2,
    startingMoney: 400_000,
    startingTransferBudget: 50_000,
    unlockedAtStart: [...CORE, 'youth', 'training'],
    unlockOrder: ['staff', 'transfer', 'stadium', 'campus', 'sponsors', 'contracts', 'fans'],
    difficulty: 'hart'
  },
  {
    id: 'absturz',
    name: 'Der freie Fall',
    pitch:
      'Minus 180.000 €. Die Lizenz hängt an der nächsten Überweisung.',
    premise:
      'Zwei Insolvenzverfahren, ein gepfändeter Mannschaftsbus, ein Zeugwart, der seit elf Wochen kein Gehalt gesehen hat und trotzdem jeden Morgen aufschließt. Der Verband prüft die Lizenz für die kommende Spielzeit. Ist am Fünfzehnten nichts auf dem Konto, spielt hier nächste Saison die A-Jugend. Du hast keinen Kader zu führen. Du hast eine Zahlung zu leisten.',
    leagueLevel: 1,
    startingMoney: -180_000,
    startingTransferBudget: 0,
    unlockedAtStart: [...CORE],
    unlockOrder: ['transfer', 'sponsors', 'stadium', 'staff', 'merch', 'training', 'youth', 'fans'],
    difficulty: 'brutal'
  }
]);

/** The start a first-time player is pointed at. */
export function recommendedNarrative(): Narrative {
  return narratives.find((n) => n.recommended) ?? narratives[0]!;
}

export function narrativeById(id: string): Narrative | undefined {
  return narratives.find((n) => n.id === id);
}
