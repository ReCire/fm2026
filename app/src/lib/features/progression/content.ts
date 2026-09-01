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
   *
   * ONLY GATED MODULES BELONG HERE, plus names from the roadmap.
   *
   * A module with no `gate` is available from the first minute regardless of
   * what this list says, so naming one costs a rung and changes nothing — and
   * every ladder was mostly those. Aufsteiger opened with `transfer` and
   * `youth`, both of which were already open, so the first department that
   * actually appeared was the third rung, six matchdays in.
   *
   * Same failure as the five roadmap names that pointed at modules which do not
   * exist, and it hid in the same place: the list read like a plan and was
   * half no-ops. `content.test.ts` now asserts both directions — every gated
   * module is reachable in every narrative, and nothing ungated wastes a rung.
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
    unlockOrder: ['staff', 'sponsors', 'merch', 'europe', 'stocks', 'industry', 'fans'],
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
    /*
     * Europe first, and it is the whole start in one line. This club is already
     * in the first division, so the Champions Cup is one good season away — and
     * it is the only prize large enough to clear what the previous manager
     * spent. He was chasing it too. The difference is that you have to.
     */
    unlockOrder: ['europe', 'merch', 'stocks', 'industry', 'fans'],
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
    unlockOrder: ['industry', 'stocks', 'merch', 'staff', 'sponsors', 'europe', 'rawMaterials'],
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
    unlockedAtStart: [...CORE, 'youth'],
    /*
     * Merch before sponsors, which is the opposite of the Aufsteiger and is the
     * point of the start. An academy club has NAMES before it has reach: people
     * buy the shirt because the boy on it went to their school. A sponsor wants
     * an audience, and this club will not have one for four years.
     */
    unlockOrder: ['staff', 'merch', 'sponsors', 'europe', 'stocks', 'industry', 'fans'],
    difficulty: 'hart'
  },
  {
    id: 'absturz',
    name: 'Der freie Fall',
    pitch:
      'Minus 1,8 Millionen. Die Lizenz hängt an der nächsten Überweisung.',
    premise:
      'Zwei Insolvenzverfahren, ein gepfändeter Mannschaftsbus, ein Zeugwart, der seit elf Wochen kein Gehalt gesehen hat und trotzdem jeden Morgen aufschließt. Der Verband prüft die Lizenz für die kommende Spielzeit. Ist am Fünfzehnten nichts auf dem Konto, spielt hier nächste Saison die A-Jugend. Du hast keinen Kader zu führen. Du hast eine Zahlung zu leisten.',
    leagueLevel: 1,
    /*
     * The figure has to be true for the division. A second-division licence
     * does not hang on 180.000 € — that is a Regionalliga sum, and a player who
     * knows the game reads it as a mistake rather than as jeopardy. 1,8 Mio is
     * the scale at which a 2. Bundesliga club actually loses its licence, and
     * the seized team bus and the unpaid kit man are all plausible at that
     * level. Kaiserslautern and Duisburg have both been here.
     */
    startingMoney: -1_800_000,
    startingTransferBudget: 0,
    unlockedAtStart: [...CORE],
    /*
     * Sponsors then merch, and staff third. A club that has not paid its kit
     * man in eleven weeks does not open a scouting department before it sells
     * scarves — everything here is ordered by how fast it becomes money, which
     * is the only ordering a licence deadline allows.
     */
    unlockOrder: ['sponsors', 'merch', 'staff', 'stocks', 'europe', 'industry', 'fans'],
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
