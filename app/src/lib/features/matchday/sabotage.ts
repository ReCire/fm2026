import { z } from 'zod';

/**
 * The other half of Ermittlungsdruck — the half that makes it a decision.
 *
 * `press` shipped as a consequence with no cause a player could choose. The
 * needle rose because of a doctrine node, which is a permanent once-per-career
 * purchase, and then it cost you money and your job. Nothing in between.
 *
 * This is the verb. Pay cash before a match, get a bounded advantage in it, and
 * the Verband becomes that much more curious — a repeatable trade against a
 * meter that already has an immunity node waiting at the deep end of the tree.
 * senior-frontend found the gap by diffing the prototype's underworld screen
 * against a port that had the meter and none of the buttons.
 *
 * The shape is `intervene.ts`'s, and for the same reasons:
 *
 *  - The swing is small next to the strength gap. A stolen banner cannot beat
 *    a side ten points better, or the eleven stops mattering.
 *  - Every option costs money AND pressure. An option with only an upside is
 *    not a decision, it is a button you press every week.
 *  - Doing nothing is listed first and is genuinely fine. Most careers should
 *    never open this screen, and the ones that do should feel like they chose
 *    to.
 *
 * ONE per match, not four at once. The prototype let you stack all four, which
 * is the same "four concurrent levers" the half-time design already refused.
 */

export const SabotageSchema = z.object({
  id: z.string(),
  label: z.string(),
  /** What it does, in the language of someone not writing it down. */
  detail: z.string(),
  /** Added to our strength for the next match only. */
  swing: z.number().int().min(0),
  /** Added to `press.suspicion` when the match is played. */
  pressureCost: z.number().int().min(0),
  /** Paid when it is arranged, not when it works. */
  moneyCost: z.number().int().min(0)
});
export type Sabotage = z.infer<typeof SabotageSchema>;

/**
 * The ceiling on what any of this can be worth.
 *
 * Four points, against the ten that separate two divisions and the six a
 * half-time call may swing. Deliberately the smallest lever in the game: it is
 * bought with money rather than earned with a decision, and a lever you can
 * simply afford must never be the strongest one available.
 */
export const SABOTAGE_CAP = 4;

export const sabotages: Sabotage[] = z.array(SabotageSchema).parse([
  {
    id: 'banner',
    label: 'Zaunfahne entwenden',
    detail: 'Die Kurve des Gegners wacht ohne ihre Fahne auf. Es wird ein sehr stiller Gästeblock.',
    swing: 1,
    pressureCost: 4,
    moneyCost: 4_000
  },
  {
    id: 'pyro',
    label: 'Feuerwerk vor dem Mannschaftshotel',
    detail: 'Um drei, um vier und um halb fünf. Niemand ist verletzt, niemand hat geschlafen.',
    swing: 2,
    pressureCost: 7,
    moneyCost: 12_000
  },
  {
    id: 'weed',
    label: 'Der Platzwart hat sich vertan',
    detail: 'Falsches Mittel, falsche Menge, falsche Woche. Auf diesem Rasen kombiniert niemand.',
    swing: 3,
    pressureCost: 11,
    moneyCost: 25_000
  },
  {
    id: 'ref',
    label: 'Ein Präsent für den Unparteiischen',
    detail: 'Eine Uhr, in einer Schachtel, in einem Umschlag. Er trägt sie am Sonntag.',
    swing: 4,
    pressureCost: 18,
    moneyCost: 45_000
  }
]);

export const sabotageById = new Map(sabotages.map((s) => [s.id, s]));

/** What it is worth, never more than the cap however the content is retuned. */
export function cappedSwing(sabotage: Sabotage): number {
  return Math.min(SABOTAGE_CAP, sabotage.swing);
}

/**
 * Whether this can be arranged right now.
 *
 * Money only. There is deliberately no pressure ceiling: a club at 90% that
 * wants to make it worse is entitled to, and a rule stopping them would be the
 * game protecting a player from the one decision the whole system is about.
 */
export function canArrange(sabotage: Sabotage, money: number): boolean {
  return money >= sabotage.moneyCost;
}
