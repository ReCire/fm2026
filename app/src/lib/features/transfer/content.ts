import { z } from 'zod';

/**
 * Every tunable number the transfer market and the negotiation depend on.
 *
 * The prototype scattered these across four functions as literals — the
 * accept/walk-away thresholds in particular were two nested ternaries inside
 * `counterTransferOffer`. They are the balance surface of the whole feature:
 * they decide whether holding out for more money is a good idea, and therefore
 * whether the transfer market is a real decision or a formality. Named bands
 * here mean they can be edited in the Data Studio, reviewed as a diff and
 * reverted on their own without touching the formula that consumes them.
 */

/**
 * One rung of the "will the buyer swallow this?" ladder. Bands are scanned in
 * order and the first whose `maxRatio` the demand is at or under wins, so the
 * list must run from cheapest to greediest.
 */
export const AcceptBandSchema = z.object({
  /** Demand ÷ market value, at or under which this band applies. */
  maxRatio: z.number().min(0),
  /** Probability the buyer simply pays what you asked. */
  chance: z.number().min(0).max(1)
});

/**
 * One rung of the "will the buyer storm out?" ladder. Scanned in order, first
 * match wins, so this list runs from greediest to cheapest — the mirror image
 * of `acceptBands`.
 */
export const WalkAwayBandSchema = z.object({
  /** Demand ÷ market value, strictly above which this band applies. */
  aboveRatio: z.number().min(0),
  /** Probability the buyer withdraws the offer entirely. */
  chance: z.number().min(0).max(1)
});

export const CounterOptionSchema = z.object({
  /** Applied to the CURRENT bid, not the market value. Demands compound. */
  multiplier: z.number().min(1),
  label: z.string(),
  /** Doc id in docs.ts. Pinned by a test, because the docs gate cannot see it. */
  doc: z.string()
});

export const TransferContentSchema = z.object({
  // ---- market ----------------------------------------------------------
  /** Players on the transfer list after a refresh. */
  marketSize: z.number().int().min(0),
  /** Contract-free players after a refresh. */
  freeAgentSize: z.number().int().min(0),
  /** Matchdays between two market refreshes. 1 = every matchday. */
  refreshEveryMatchdays: z.number().int().min(1),
  /** Strength floor in the WEAKEST league. */
  baseMinStrength: z.number().int().min(1).max(99),
  /** Each league you climb adds this much to the floor. */
  strengthPerLeagueLevel: z.number().int().min(0),
  /** League level of the weakest league — the one `baseMinStrength` describes. */
  weakestLeagueLevel: z.number().int().min(0),
  /** Width of the strength window offered on the market. */
  strengthSpread: z.number().int().min(0),
  /** Free agents start this far below the market floor… */
  freeAgentMinOffset: z.number().int(),
  /** …and stop this far below the market ceiling. */
  freeAgentMaxOffset: z.number().int(),
  /** However low the league, a free agent is never weaker than this. */
  freeAgentStrengthFloor: z.number().int().min(1).max(99),
  /** Sign-on fee for a contract-free player, as a multiple of his matchday wage. */
  signOnFeeWageMultiple: z.number().min(0),
  /** League level assumed until a league module answers `league.level`. */
  defaultLeagueLevel: z.number().int().min(0),

  // ---- incoming offers -------------------------------------------------
  /** Chance per matchday that a rival club opens a bid for one of your players. */
  newOfferChance: z.number().min(0).max(1),
  /** Weakest player a rival club will bid for. */
  offerMinStrength: z.number().int().min(1).max(99),
  /** Never more than this many live offers at once. */
  maxConcurrentOffers: z.number().int().min(0),
  /** No offers arrive while the squad is at or below this size. */
  offersRequireSquadSize: z.number().int().min(0),
  /** Matchdays an offer stays on the table. */
  offerExpiryMatchdays: z.number().int().min(1),
  /** Opening bid = marketValue × (base … base + spread). */
  offerBaseMultiplier: z.number().min(0),
  offerMultiplierSpread: z.number().min(0),
  /** Floor for an opening bid, so nobody bids 3.000 € for a squad player. */
  minOfferSum: z.number().min(0),

  // ---- negotiation -----------------------------------------------------
  /** All sums are rounded to this step, which is what makes bids look human. */
  roundingStep: z.number().min(1),
  counterOptions: z.array(CounterOptionSchema).min(1),
  acceptBands: z.array(AcceptBandSchema).min(1),
  walkAwayBands: z.array(WalkAwayBandSchema).min(1),
  /** Counter-offers allowed per bid before the buyer's patience runs out. */
  maxCounterRounds: z.number().int().min(1),

  // ---- selling ---------------------------------------------------------
  /** Squad may never drop below this. */
  minSquadSize: z.number().int().min(0),
  /** Share of an accepted transfer fee that lands in the transfer budget. */
  offerBudgetShare: z.number().min(0).max(1),
  /** Share of a quick sale that lands in the transfer budget. */
  quickSellBudgetShare: z.number().min(0).max(1),
  /** What an instant, no-negotiation sale pays, as a share of market value. */
  quickSellRate: z.number().min(0).max(1),
  /** A rejected bid above marketValue × this ratio upsets the player… */
  rejectMoraleRatio: z.number().min(0),
  /** …by this much, down to `rejectMoraleFloor`. */
  rejectMoralePenalty: z.number().int().min(0),
  rejectMoraleFloor: z.number().int().min(0).max(100),

  // ---- flavour ---------------------------------------------------------
  clubPrefixes: z.array(z.string()).min(1),
  clubCities: z.array(z.string()).min(1)
});
export type TransferContent = z.infer<typeof TransferContentSchema>;
export type CounterOption = z.infer<typeof CounterOptionSchema>;

export const transferContent: TransferContent = TransferContentSchema.parse({
  // refreshTransferMarket(): six listed players, four free agents.
  marketSize: 6,
  freeAgentSize: 4,
  // INVENTED. The prototype only refreshed on new game and on the admin
  // league-teleport, so a career saw the same six players for a whole season.
  refreshEveryMatchdays: 1,
  // minStr = 50 + (3 - leagueLevel) * 9, maxStr = minStr + 9
  baseMinStrength: 50,
  strengthPerLeagueLevel: 9,
  weakestLeagueLevel: 3,
  strengthSpread: 9,
  // createPlayer(pos, Math.max(40, minStr - 4), maxStr - 2)
  freeAgentMinOffset: -4,
  freeAgentMaxOffset: -2,
  freeAgentStrengthFloor: 40,
  signOnFeeWageMultiple: 6,
  defaultLeagueLevel: 3,

  // checkIncomingTransferOffers() / triggerNewAITransferOffer()
  newOfferChance: 0.35,
  offerMinStrength: 48,
  maxConcurrentOffers: 3,
  offersRequireSquadSize: 13,
  offerExpiryMatchdays: 3,
  offerBaseMultiplier: 0.85,
  offerMultiplierSpread: 0.35,
  minOfferSum: 10_000,

  // counterTransferOffer() — the heart of the feature.
  roundingStep: 5_000,
  counterOptions: [
    { multiplier: 1.15, label: '+15% fordern', doc: 'transfer.counterSoft' },
    { multiplier: 1.35, label: '+35% fordern', doc: 'transfer.counterHard' },
    { multiplier: 1.6, label: '+60% Bluff', doc: 'transfer.counterBluff' }
  ],
  //   marketRatio <= 1.15 ? 0.70 : (marketRatio <= 1.40 ? 0.40 : 0.15)
  acceptBands: [
    { maxRatio: 1.15, chance: 0.7 },
    { maxRatio: 1.4, chance: 0.4 },
    { maxRatio: 999, chance: 0.15 }
  ],
  //   marketRatio > 1.50 ? 0.45 : (marketRatio > 1.25 ? 0.25 : 0.10)
  walkAwayBands: [
    { aboveRatio: 1.5, chance: 0.45 },
    { aboveRatio: 1.25, chance: 0.25 },
    { aboveRatio: 0, chance: 0.1 }
  ],
  // INVENTED. The prototype had no round cap at all — see docs.ts.
  maxCounterRounds: 4,

  // acceptTransferOffer() / sellPlayer()
  minSquadSize: 11,
  offerBudgetShare: 0.85,
  quickSellBudgetShare: 0.8,
  quickSellRate: 0.8,
  // rejectTransferOffer(): bid > marketValue * 1.2 costs 8 morale, floor 20.
  rejectMoraleRatio: 1.2,
  rejectMoralePenalty: 8,
  rejectMoraleFloor: 20,

  clubPrefixes: ['FC', 'SV', 'SpVgg', 'SC', 'VfB', 'VfL', 'SG', 'TSV', '1. FC', 'Borussia', 'Fortuna', 'Dynamo', 'Rot-Weiß', 'Blau-Weiß', 'Eintracht', 'Viktoria'],
  clubCities: ['München', 'Dortmund', 'Berlin', 'Leipzig', 'Hamburg', 'Frankfurt', 'Stuttgart', 'Bremen', 'Köln', 'Düsseldorf', 'Hannover', 'Nürnberg', 'Kaiserslautern', 'Dresden', 'Bielefeld', 'Bochum', 'Augsburg', 'Mainz', 'Freiburg', 'Rostock', 'Magdeburg', 'Karlsruhe', 'Münster', 'Essen', 'Wiesbaden', 'Osnabrück', 'Saarbrücken', 'Ulm', 'Regensburg', 'Braunschweig', 'Fürth', 'Elversberg', 'Aachen', 'Erfurt', 'Halle', 'Paderborn', 'Kiel', 'Sandhausen', 'Ingolstadt', 'Jena', 'Zwickau', 'Cottbus', 'Chemnitz', 'Offenbach', 'Würzburg', 'Mannheim', 'Duisburg', 'Oberhausen', 'Krefeld', 'Lübeck']
});
