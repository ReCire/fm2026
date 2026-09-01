import { z } from 'zod';

/**
 * Das Depot — four instruments, and the one decision the prototype forgot.
 *
 * ┌───────────────────────────────────────────────────────────────────────┐
 * │ In the prototype, `stockMarket[key].price` was never assigned.        │
 * │                                                                       │
 * │ Not "moved slowly" — never written at all. The only `.price =` in     │
 * │ 8.697 lines belongs to the merchandise screen. SAFT SE was 120 €      │
 * │ at kick-off and 120 € a decade later.                                 │
 * │                                                                       │
 * │ A holding whose price cannot move is a savings account with a         │
 * │ ticker: buying is always correct, selling is always wrong, and the    │
 * │ two `stockBonus` nodes raise an interest rate. There is no decision   │
 * │ anywhere in it.                                                       │
 * └───────────────────────────────────────────────────────────────────────┘
 *
 * The dividend worked — it was credited every matchday with `stockBonus`
 * applied — which is why this survived: the screen paid out, the number went
 * up, and nothing looked broken. It is the quietest of the four failure shapes,
 * a feature that runs correctly and contains no game.
 *
 * So prices move here, and the two things that make them worth reading are:
 *
 *  1. **Yield trades against volatility.** The steady one pays most, the wild
 *     one pays least. That is the decision — income or capital — and it is the
 *     only reason to own more than one of them.
 *
 *  2. **Three of the four are DRIVEN by the club's own world**, so a manager
 *     knows something the market does not. You know you are expanding the
 *     stadium before Stadionpark Immobilien does.
 *
 * And the joke, which is also the design: the Fan-Token ETF is the one that
 * looks like it is about football, pays the least, swings the hardest, and is
 * connected to absolutely nothing.
 */

/* ─────────────────────────────────────────────────────────────────────────
 * What moves a price
 * ───────────────────────────────────────────────────────────────────────── */

/**
 * The club-side fact an instrument tracks.
 *
 * `none` is a real driver and not a gap — see `kryptokick`. A player has to be
 * able to learn that one of these is pure noise, which only works if the others
 * genuinely are not.
 */
export const DRIVERS = ['stadium', 'support', 'division', 'none'] as const;
export type Driver = (typeof DRIVERS)[number];

export const driverCopy: Record<Driver, { label: string; note: string }> = {
  stadium: {
    label: 'Stadionausbau',
    note: 'Steigt, wenn im Umfeld gebaut wird. Du weisst vor dem Markt, wann das passiert.'
  },
  support: {
    label: 'Zuschauerzahlen',
    note: 'Hängt am Zuspruch im Stadion. Ein voller Block ist auch ein Kurs.'
  },
  division: {
    label: 'Ligazugehörigkeit',
    note: 'Folgt der wirtschaftlichen Grosswetterlage — je höher die Liga, desto besser die Geschäfte.'
  },
  none: {
    label: 'Nichts',
    note: 'Bewegt sich aus eigenem Antrieb. Es gibt hier nichts zu wissen, nur etwas zu hoffen.'
  }
};

/* ─────────────────────────────────────────────────────────────────────────
 * The four
 * ───────────────────────────────────────────────────────────────────────── */

export const InstrumentSchema = z.object({
  id: z.string().min(2),
  name: z.string().min(4),
  /** What the thing actually does, one line, straight-faced. */
  sector: z.string().min(4),
  /** Opening price in euro. The prototype's figures, kept. */
  base: z.number().min(1),
  /**
   * Paid per matchday as a fraction of the holding's VALUE, not of its cost.
   *
   * Of value, deliberately: a dividend on the purchase price would make a
   * collapsed holding keep paying as though nothing had happened, which is the
   * savings-account bug arriving through a side door.
   */
  dividend: z.number().min(0).max(0.2),
  /**
   * How far the price can move in a matchday, as a fraction.
   *
   * Traded against `dividend` — see the table test. An instrument that paid
   * best AND moved least would be the only correct answer, and four
   * instruments with one correct answer is one instrument.
   */
  volatility: z.number().min(0).max(0.5),
  driver: z.enum(DRIVERS),
  /** Floor and ceiling as multiples of `base`, so a price cannot go to zero. */
  floor: z.number().min(0.05).max(1),
  ceiling: z.number().min(1)
});
export type Instrument = z.infer<typeof InstrumentSchema>;

export const instruments: Instrument[] = z.array(InstrumentSchema).parse([
  {
    id: 'stadionpark',
    name: 'Stadionpark Immobilien AG',
    sector: 'Gewerbeflächen rund um Sportstätten',
    base: 85,
    dividend: 0.06,
    volatility: 0.04,
    driver: 'stadium',
    floor: 0.5,
    ceiling: 2.4
  },
  {
    id: 'windpark',
    name: 'Windpark Nordkurve eG',
    sector: 'Bürgerenergie, seit 2009 im Vereinsbesitz',
    base: 45,
    dividend: 0.05,
    volatility: 0.06,
    driver: 'support',
    floor: 0.45,
    ceiling: 2.8
  },
  {
    id: 'saft',
    name: 'SAFT SE',
    sector: 'Unternehmenssoftware für den Mittelstand',
    base: 120,
    dividend: 0.04,
    volatility: 0.09,
    driver: 'division',
    floor: 0.4,
    ceiling: 3.2
  },
  {
    /*
     * The joke, and the design. It looks like the football one, pays the worst,
     * moves the hardest, and tracks nothing at all — so the instrument a
     * manager has an edge in is the dullest thing on the page.
     */
    id: 'kryptokick',
    name: 'KryptoKick Fan-Token ETF',
    sector: 'Tokenisierte Fan-Beteiligung („Utility")',
    base: 210,
    dividend: 0.02,
    volatility: 0.22,
    driver: 'none',
    floor: 0.1,
    ceiling: 4.5
  }
]);

export const instrumentById = new Map(instruments.map((i) => [i.id, i] as const));

/* ─────────────────────────────────────────────────────────────────────────
 * Numbers
 * ───────────────────────────────────────────────────────────────────────── */

export const StocksContentSchema = z.object({
  /** Shares per click. Trading one at a time is not a decision, it is a chore. */
  lotSize: z.number().int().min(1),
  /**
   * How much of a matchday's move comes from the driver rather than from noise.
   *
   * The whole value of knowing something. At zero this is a slot machine; at
   * one it is a spreadsheet the player has already filled in. A little under
   * half means an informed guess is usually right and never safe.
   */
  driverShare: z.number().min(0).max(1),
  /**
   * Charged on the way in AND on the way out, as a fraction.
   *
   * Without it, buying and selling every matchday on a hunch costs nothing, and
   * the optimal play is to churn. A fee is what makes holding a position a
   * position rather than a habit.
   */
  fee: z.number().min(0).max(0.1),
  /** Longest run of prices kept per instrument, for the chart. */
  history: z.number().int().min(2)
});
export type StocksContent = z.infer<typeof StocksContentSchema>;

export const stocksContent: StocksContent = StocksContentSchema.parse({
  lotSize: 100,
  driverShare: 0.45,
  fee: 0.01,
  history: 24
});

export const copy = {
  title: 'Depot',
  market: 'Markt',
  holdings: 'Bestand',
  /** Before the player owns anything, which is most careers. */
  empty:
    'Kein Bestand. Das Depot ist die einzige Einnahmequelle im Spiel, die auch kleiner werden kann.',
  /** Under the market list. */
  rule:
    'Kurse bewegen sich an jedem Spieltag. Drei der vier hängen an etwas, das du selbst beeinflusst — der vierte an nichts.',
  /** Where the two data-synthesis nodes pay off. */
  bonus:
    'Zwei Knoten im Wissensbaum erhöhen die Dividenden. Auf den Kurs haben sie keinen Einfluss: Information ist im Wissensbaum, Glück nicht.',
  fee: 'Beim Kauf und beim Verkauf fällt eine Gebühr an.'
} as const;
