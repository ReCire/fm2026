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
  difficulty: z.enum(['ruhig', 'normal', 'hart', 'brutal'])
});
export type Narrative = z.infer<typeof NarrativeSchema>;

export const NarrativesSchema = z.array(NarrativeSchema).min(1);

/** Always open: without these there is no game to play. */
const CORE = ['core', 'finance', 'squad', 'league'];

export const narratives: Narrative[] = NarrativesSchema.parse([
  {
    id: 'aufsteiger',
    name: 'Der Aufsteiger',
    pitch: 'Vierte Liga, treue Fans, kein Geld.',
    premise:
      'Ein Traditionsverein, der zu lange unten steht. Der Vorstand erwartet Geduld, die Kurve erwartet Ergebnisse. Du hast beides nicht.',
    leagueLevel: 3,
    startingMoney: 150_000,
    startingTransferBudget: 100_000,
    unlockedAtStart: [...CORE, 'stadium'],
    unlockOrder: ['transfer', 'training', 'youth', 'staff', 'sponsors', 'merch', 'fans', 'cup'],
    difficulty: 'normal'
  },
  {
    id: 'erbe',
    name: 'Das Erbe',
    pitch: 'Ein Bundesligist, ein Präsident, der dich nicht wollte.',
    premise:
      'Du übernimmst einen Klub mit Geschichte, Schulden und einem Kader, der teurer ist als er gut ist. Die erste Saison entscheidet, ob du eine zweite bekommst.',
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
    pitch: 'Du kaufst keinen Verein. Du kaufst eine Bilanz.',
    premise:
      'Geld ist nicht das Problem. Der Verein ist ein Vehikel für etwas Größeres, und irgendwann wird jemand fragen, wofür genau.',
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
    pitch: 'Kaufen kannst du nichts. Also baust du.',
    premise:
      'Kein Budget, aber ein Internat und ein Ruf. Deine besten Spieler wirst du verkaufen müssen — die Frage ist nur, wie teuer.',
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
    pitch: 'Sechs Spieltage, um den Verein zu retten.',
    premise:
      'Dein Vorgänger ist gegangen, das Konto ist leer, und die Lizenz hängt an der nächsten Zahlung. Danach kannst du anfangen, ein Team zu bauen.',
    leagueLevel: 1,
    startingMoney: -180_000,
    startingTransferBudget: 0,
    unlockedAtStart: [...CORE],
    unlockOrder: ['transfer', 'sponsors', 'stadium', 'staff', 'merch', 'training', 'youth', 'fans'],
    difficulty: 'brutal'
  }
]);

export function narrativeById(id: string): Narrative | undefined {
  return narratives.find((n) => n.id === id);
}
