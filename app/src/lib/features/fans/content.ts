import { z } from 'zod';

/**
 * The four factions every Kurve actually has, and what each one wants.
 *
 * `weight` is each faction's share of a normal Saturday — used only to turn
 * four moods into the one number the rest of the club gets to see. It is not
 * attendance and is never spent as one.
 */
export const FanGroupContentSchema = z.object({
  id: z.string(),
  name: z.string(),
  desc: z.string(),
  weight: z.number().min(0)
});
export type FanGroupContent = z.infer<typeof FanGroupContentSchema>;

export const fanGroups: FanGroupContent[] = z.array(FanGroupContentSchema).parse([
  {
    id: 'ultras',
    name: 'Ultras „Szene Nord“',
    weight: 0.3,
    desc: 'Sorgen für den Hexenkessel, wenn es läuft — und für die lautesten Sprechchöre, wenn nicht.'
  },
  {
    id: 'tradition',
    name: 'Traditionsfanclub „Alte Garde“',
    weight: 0.25,
    desc: 'Dauerkartenkunden seit Jahrzehnten. Ihnen ist die Identität des Vereins wichtiger als die Tabelle.'
  },
  {
    id: 'families',
    name: 'Familien & Gelegenheitszuschauer',
    weight: 0.3,
    desc: 'Kommen wegen des Tages, nicht wegen der Taktik. Tragen Fanshop und Catering.'
  },
  {
    id: 'vips',
    name: 'Logengäste & Geschäftspartner',
    weight: 0.15,
    desc: 'Finanzstarke Elite — wichtig für Logen und Trikotsponsoring, nie für die Stimmung im Rund.'
  }
]);

/** Where a new club starts. Benefit of the doubt, same idea as board.startingTrust. */
export const STARTING_MOOD = 70;

export interface StewardLevel {
  count: number;
  label: string;
}

/** Same four steps the prototype offered — a number the player recognises. */
export const stewardLevels: StewardLevel[] = [
  { count: 50, label: 'Sparflamme' },
  { count: 100, label: 'Standard' },
  { count: 200, label: 'Erhöht' },
  { count: 350, label: 'Hochsicherheit' }
];
export const DEFAULT_STEWARDS = 100;

export interface FanAction {
  id: string;
  label: string;
  desc: string;
  cost: number;
  boost: number;
}

export const fanActions: FanAction[] = [
  {
    id: 'choreo',
    label: 'Mega-Choreo',
    desc: 'Eine abgesprochene Choreo für die ganze Kurve, vom Verein mitfinanziert.',
    cost: 8000,
    boost: 6
  },
  {
    id: 'express',
    label: 'Sonderzug',
    desc: 'Ein Sonderzug zum nächsten Auswärtsspiel, vom Verein bezuschusst.',
    cost: 5000,
    boost: 4
  }
];

export const fansContent = {
  /** `stewards / safetyDivisor`, capped — the same curve the prototype used. */
  safetyDivisor: 3.5,
  safetyCap: 99,
  /** Mood swing on a matchday result, applied to every faction alike. */
  winBoost: 3,
  drawBoost: 0,
  lossPenalty: -4,
  /** Below this, a faction's mood is worth a look on the dashboard. */
  attentionAt: 45
} as const;
