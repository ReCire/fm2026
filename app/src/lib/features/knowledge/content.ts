import { z } from 'zod';
import { formatMoney } from '../finance/rules';

/**
 * The knowledge tree — what kind of manager you decide to be.
 *
 * Eight doctrines, fourteen nodes each, five tiers, plus twenty-eight
 * syntheses at the crossings. Ported wholesale out of the prototype, where it
 * was the one system Eric described first every time he described the game.
 *
 * The point is not the count. It is that Wissenspunkte are scarce enough that
 * you cannot have two doctrines and a capstone, so the tree is a set of
 * refusals rather than a checklist. A tier-5 capstone is gated at doctrine
 * rank 12 out of a possible 14 — you reach one by giving up the others.
 *
 * ┌───────────────────────────────────────────────────────────────────────┐
 * │ THIS FILE IS CONTENT. It says what the effects ARE, not what they DO. │
 * │ Nothing here computes; `rules.ts` decides what a node costs, whether  │
 * │ you can afford it, and what its `fx` keys do to the game.             │
 * └───────────────────────────────────────────────────────────────────────┘
 */

/* ─────────────────────────────────────────────────────────────────────────
 * Doctrines
 * ───────────────────────────────────────────────────────────────────────── */

/**
 * `shape` is not decoration. Doctrine colour alone would fail WCAG 1.4.1 —
 * a player who cannot separate the purple from the red would be reading a
 * tree where every branch looks alike. Each doctrine carries a distinct
 * silhouette AND a distinct glyph AND a three-letter abbreviation, so the
 * tree is legible in greyscale and at 40px.
 */
export const DoctrineShapeSchema = z.enum([
  'triangle-down',
  'circle',
  'square',
  'triangle-up',
  'arch',
  'hexagon',
  'diamond',
  'ring'
]);
export type DoctrineShape = z.infer<typeof DoctrineShapeSchema>;

export const DoctrineSchema = z.object({
  id: z.string(),
  /** Full name, used as a heading. */
  name: z.string(),
  /** One word, for chips and tabs where the full name will not fit. */
  short: z.string(),
  /** Three letters, for the tree's own nodes at small sizes. */
  abbr: z.string().length(3),
  glyph: z.string(),
  shape: DoctrineShapeSchema,
  order: z.number().int().positive(),
  /**
   * The doctrine arguing its own case, in the first person plural of someone
   * who has already won the argument. Written to be persuasive rather than
   * balanced — a player should be able to disagree with one of these.
   */
  creed: z.string(),
  /**
   * Six rank titles, awarded at rising node counts within the doctrine.
   *
   * Six titles across fourteen nodes rather than fourteen: a title you get
   * every time you spend is a receipt, not a promotion.
   */
  ranks: z.array(z.string()).length(6)
});
export type Doctrine = z.infer<typeof DoctrineSchema>;

export const doctrines: Doctrine[] = z.array(DoctrineSchema).length(8).parse([
  {
    id: 'shadow',
    name: 'Schattenkabinett',
    short: 'Schatten',
    abbr: 'SCH',
    glyph: '🎭',
    shape: 'triangle-down',
    order: 1,
    creed:
      'Ein Spiel wird nicht auf dem Rasen entschieden, sondern in Hinterzimmern. Wer die Umschläge packt, die Wetten hält und den Verband kennt, braucht keine besseren Spieler.',
    ranks: ['Mitläufer', 'Strohmann', 'Mittelsmann', 'Strippenzieher', 'Konsigliere', 'Der Pate']
  },
  {
    id: 'brand',
    name: 'Markenimperium',
    short: 'Marke',
    abbr: 'MRK',
    glyph: '🔥',
    shape: 'circle',
    order: 2,
    creed:
      'Der Verein ist das Produkt. Wappen, Dose, Serie, Stadionname - jeder Berührungspunkt verkauft. Titel sind Marketing, Marketing ist der Titel.',
    ranks: ['Vereinsheim', 'Regionalmarke', 'Landesmarke', 'Kontinentalmarke', 'Konzern', 'Weltmarke']
  },
  {
    id: 'data',
    name: 'Datenlabor',
    short: 'Daten',
    abbr: 'DAT',
    glyph: '🧠',
    shape: 'square',
    order: 3,
    creed:
      'Fußball ist ein lösbares Problem. Genug Sensoren, genug Rechenzeit, genug Modelle - und der Zufall wird zur Rundungsdifferenz.',
    ranks: ['Zettelwirtschaft', 'Videoraum', 'Analyseabteilung', 'Institut', 'Rechenzentrum', 'Singularität']
  },
  {
    id: 'talent',
    name: 'Talentschmiede',
    short: 'Talent',
    abbr: 'TAL',
    glyph: '🌱',
    shape: 'triangle-up',
    order: 4,
    creed:
      'Kaufen kann jeder. Wir bauen Spieler. Bolzplatz, Internat, Eliteschule, Profikader - eine Kette, die niemand mit Geld abkürzen kann.',
    ranks: ['Kreisliga-Sichtung', 'Jugendarbeit', 'Leistungszentrum', 'Akademie', 'Kaderschmiede', 'Dynastie']
  },
  {
    id: 'curve',
    name: 'Kurvenrepublik',
    short: 'Kurve',
    abbr: 'KUR',
    glyph: '✊',
    shape: 'arch',
    order: 5,
    creed:
      'Der Verein gehört nicht dem, der zahlt, sondern dem, der singt. Mitglieder statt Aktionäre, Stehplatz statt Loge, Choreo statt Werbeclip.',
    ranks: ['Fanclub', 'Szene', 'Dachverband', 'Mitgliederbasis', 'Genossenschaft', 'Republik']
  },
  {
    id: 'industry',
    name: 'Werkskombinat',
    short: 'Werk',
    abbr: 'WRK',
    glyph: '⚙️',
    shape: 'hexagon',
    order: 6,
    creed:
      'Ein Verein ist eine Fertigungstiefe. Wer Rohstoff, Maschine, Lager und Spedition besitzt, verkauft das Trikot billiger als die Konkurrenz es einkauft.',
    ranks: ['Werkbank', 'Manufaktur', 'Fabrik', 'Werk', 'Konzern', 'Kombinat']
  },
  {
    id: 'psyche',
    name: 'Mentalfabrik',
    short: 'Mental',
    abbr: 'MEN',
    glyph: '🧿',
    shape: 'diamond',
    order: 7,
    creed:
      'Die letzten zehn Prozent liegen nie in den Beinen. Wer Druck, Angst und Gewissheit steuert, gewinnt Spiele, die er nach Stärke verlieren müsste.',
    ranks: ['Kabinenansprache', 'Betreuung', 'Sportpsychologie', 'Programm', 'Institut', 'Fabrik']
  },
  {
    id: 'politics',
    name: 'Diplomatenloge',
    short: 'Loge',
    abbr: 'LOG',
    glyph: '🕊️',
    shape: 'ring',
    order: 8,
    creed:
      'Die wichtigsten Entscheidungen der Saison fallen in Sitzungssälen ohne Kameras. Wer dort sitzt, spielt ein anderes Turnier als der Rest der Liga.',
    ranks: ['Bittsteller', 'Delegierter', 'Ausschuss', 'Präsidium', 'Exekutive', 'Loge']
  }
]);

export const doctrineIds = doctrines.map((d) => d.id);
export type DoctrineId = (typeof doctrineIds)[number];

/* ─────────────────────────────────────────────────────────────────────────
 * Affinity
 * ───────────────────────────────────────────────────────────────────────── */

export const AffinitySchema = z.enum(['allied', 'hostile', 'neutral', 'self']);
export type Affinity = z.infer<typeof AffinitySchema>;

/**
 * Which doctrines get along, keyed `a|b`.
 *
 * Stored one way round and read both ways by `affinityOf`, because a symmetric
 * relation written out twice is a relation that can be edited into asymmetry
 * by someone updating one line.
 *
 * This matrix is the whole reason there are eight doctrines rather than four.
 * With four, "specialise or spread" is the only decision. With eight and an
 * affinity graph, WHICH pair you spread across is a second decision, and the
 * hostile pairs are what make a build feel like a position rather than a
 * shopping list.
 */
export const affinity: Record<string, 'allied' | 'hostile'> = {
  // Allied — a synthesis opens at rank 5 and costs 30 % less.
  'shadow|politics': 'allied',
  'shadow|psyche': 'allied',
  'shadow|curve': 'allied',
  'brand|industry': 'allied',
  'brand|data': 'allied',
  'brand|politics': 'allied',
  'data|industry': 'allied',
  'data|psyche': 'allied',
  'talent|curve': 'allied',
  'talent|psyche': 'allied',
  'curve|industry': 'allied',
  'industry|psyche': 'allied',

  // Hostile — rank 8 in both, and half again the price. Reaching one of
  // these is a statement: you have spent a career on two ideas that do not
  // like each other, and the game should charge you for the contradiction.
  'brand|curve': 'hostile',
  'curve|politics': 'hostile',
  'shadow|talent': 'hostile',
  'talent|politics': 'hostile',
  'shadow|data': 'hostile',
  'curve|psyche': 'hostile'
};

export const affinityLabels: Record<Affinity, string> = {
  allied: 'Verbündet',
  hostile: 'Verfeindet',
  neutral: 'Neutral',
  self: '—'
};

export function affinityOf(a: string, b: string): Affinity {
  if (a === b) return 'self';
  return affinity[`${a}|${b}`] ?? affinity[`${b}|${a}`] ?? 'neutral';
}

/* ─────────────────────────────────────────────────────────────────────────
 * Tiers
 * ───────────────────────────────────────────────────────────────────────── */

/**
 * `[Wissenspunkte, Euro]` per tier. Tier 6 is a synthesis.
 *
 * The euro figures are priced for league level 3 — the Aufsteiger start, whose
 * whole season at the turnstiles is around €457.000 against €352.000 of wages.
 * A tier-1 node at €25.000 is therefore a real quarter of a season's surplus,
 * and a tier-5 capstone is two seasons of gate income you have to have found
 * somewhere else.
 *
 * Wissenspunkte are the scarcity that makes the tree a set of refusals. Money
 * is the second gate, and it is the one that decides WHEN rather than WHAT.
 */
export const tierCost: Record<number, readonly [number, number]> = {
  1: [1, 25_000],
  2: [2, 60_000],
  3: [3, 140_000],
  4: [4, 320_000],
  5: [6, 750_000],
  6: [5, 400_000]
};

export const tierNames: Record<number, string> = {
  1: 'Grundlagen',
  2: 'Aufbau',
  3: 'Ausbau',
  4: 'Elite',
  5: 'Vermächtnis',
  6: 'Synthese'
};

/**
 * Multiplier on a node's euro cost, indexed by league level (0 = top flight).
 *
 * Without this the money gate only exists for poor clubs. The five narratives
 * span €-1.800.000 to €6.000.000 of starting money — a fortyfold spread — so a
 * flat price means the Investor start buys every tier-1-to-4 node in the game
 * on day one and never notices the cost, while the Aufsteiger spends a fifth of
 * everything they have on one node. The economic dimension of the tree would
 * then exist only for the player who already has the fewest options, which is
 * exactly backwards.
 *
 * Scaling by league keeps the BITE constant: a Regionalliga node costs
 * Regionalliga money, a Bundesliga node costs Bundesliga money, and
 * Wissenspunkte stay the true scarcity at every level.
 *
 * These four figures are the least-verified numbers in this file. They are set
 * against measured fourth-division income and estimated income above it,
 * because the higher divisions are not simulated in enough detail yet to
 * measure. Re-derive them from a real ledger once they are.
 */
export const leagueCostMultiplier: readonly number[] = [6, 3.2, 1.8, 1];

/* ─────────────────────────────────────────────────────────────────────────
 * Effects
 * ───────────────────────────────────────────────────────────────────────── */

/**
 * Every effect key any node can carry.
 *
 * A union rather than `string`, so a typo in a node's `fx` is a compile error
 * instead of an upgrade that silently does nothing. We have shipped that bug
 * five times now by other routes — a staff bonus written to a bucket nobody
 * read, a lineup that never reached the simulation, a documented fitness cost
 * that was computed and never wired. At 140 nodes the odds of catching the
 * sixth by playing are not good.
 */
export const FX_KEYS = [
  'academyDiscount',
  'ageSlow',
  'awayStrength',
  'b2bBonus',
  'boardFloor',
  'boardGain',
  'comeback',
  'devPerSeason',
  'euroBonus',
  'factoryOutput',
  'fanFloor',
  'fanGain',
  'fitnessLoss',
  'goalChance',
  'holdingValue',
  'homeStrength',
  'injuryDuration',
  'injuryRisk',
  'investorMod',
  'matDiscount',
  'matEfficiency',
  'merchDemand',
  'merchMargin',
  'moraleFloor',
  'onlineBoost',
  'opexMod',
  'oppPenalty',
  'opsIncome',
  'penaltyMod',
  'pressureMod',
  'priceTolerance',
  'refBias',
  'scoutCost',
  'scoutCount',
  'scoutQuality',
  'sellBonus',
  'sponsorMod',
  'stadiumCostMod',
  'stockBonus',
  'strength',
  'suspensionMod',
  'ticketDemand',
  'ticketRevenue',
  'transferBudgetMod',
  'transferDiscount',
  'underworldCost',
  'valueBoost',
  'wageMod',
  'warehouseBonus',
  'wonderkid',
  'youthCount',
  'youthPot',
  'youthStr'
] as const;
export type FxKey = (typeof FX_KEYS)[number];

export type Fx = Partial<Record<FxKey, number>>;

const FX_KEY_SET: ReadonlySet<string> = new Set(FX_KEYS);

const FxSchema = z
  .record(z.string(), z.number())
  .superRefine((fx, ctx) => {
    for (const key of Object.keys(fx)) {
      if (!FX_KEY_SET.has(key)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Unbekannter fx-Schlüssel: ${key}. Erlaubt sind nur FX_KEYS.`
        });
      }
    }
  }) as unknown as z.ZodType<Fx>;

const pct = (v: number) => `${Math.round(v * 100)} %`;
const sgn = (v: number) => (v < 0 ? '−' : '+');

/**
 * Human-readable effect descriptions.
 *
 * Typed `Record<FxKey, …>` on purpose: adding an effect key without a label is
 * a compile error. This is the same gate that already caught unlabelled staff
 * effects, and it is the only thing standing between a player and a purchase
 * screen that reads `oppPenalty: 10`.
 *
 * The phrasing takes the VALUE rather than being a static string, because
 * ×0.7 and ×1.6 on the same key are opposite kinds of news and one sentence
 * cannot honestly cover both.
 */
export const fxLabels: Record<FxKey, (v: number) => string> = {
  transferDiscount: (v: number) => `−${pct(v)} Ablösesummen beim Einkauf`,
  sellBonus: (v: number) => `+${pct(v)} Erlös bei Spielerverkäufen`,
  wageMod: (v: number) => `${sgn(v)}${pct(Math.abs(v))} Spielergehälter`,
  valueBoost: (v: number) => `+${pct(v)} Marktwert der eigenen Spieler`,
  transferBudgetMod: (v: number) => `${sgn(v)}${pct(Math.abs(v))} Transferbudget`,
  merchDemand: (v: number) => `+${pct(v)} Fanartikel-Nachfrage`,
  merchMargin: (v: number) => `+${pct(v)} Marge im Fanshop`,
  onlineBoost: (v: number) => `+${pct(v)} Online-Absatz`,
  priceTolerance: (v: number) => `${sgn(v)}${pct(Math.abs(v))} Preistoleranz der Fans`,
  sponsorMod: (v: number) => `+${pct(v)} Sponsoring-Einnahmen`,
  b2bBonus: (v: number) => `+${pct(v)} Gewinn bei B2B-Aufträgen`,
  holdingValue: (v: number) => `+${pct(v)} Holding-Bewertung`,
  investorMod: (v: number) => `${sgn(v)}${pct(Math.abs(v))} Investoren-Einnahmen`,
  opsIncome: (v: number) => `+${formatMoney(v)} pro Spieltag (Betrieb)`,
  opexMod: (v: number) => `${sgn(v)}${pct(Math.abs(v))} Betriebskosten`,
  matDiscount: (v: number) => `−${pct(v)} Rohstoff-Einkaufspreise`,
  matEfficiency: (v: number) => `−${pct(v)} Rohstoffverbrauch je Stück`,
  factoryOutput: (v: number) => `+${pct(v)} Fabrik-Ausstoß`,
  warehouseBonus: (v: number) => `+${pct(v)} Lagerkapazität`,
  stockBonus: (v: number) => `+${pct(v)} Rendite auf Aktien`,
  euroBonus: (v: number) => `+${pct(v)} Europapokal-Prämien`,
  stadiumCostMod: (v: number) => `${sgn(v)}${pct(Math.abs(v))} Stadion-Ausbaukosten`,
  ticketDemand: (v: number) => `+${pct(v)} Ticket-Nachfrage`,
  ticketRevenue: (v: number) => `${sgn(v)}${pct(Math.abs(v))} Ticket-Einnahmen`,
  strength: (v: number) => `+${v} Team-Stärke in jedem Spiel`,
  homeStrength: (v: number) => `+${v} zusätzliche Heimstärke`,
  awayStrength: (v: number) => `+${v} zusätzliche Auswärtsstärke`,
  oppPenalty: (v: number) => `−${v} Stärke für jeden Gegner`,
  goalChance: (v: number) => `+${pct(v)} Chancenverwertung`,
  refBias: (v: number) => `+${pct(v)} Siegwahrscheinlichkeit (Unparteiische)`,
  comeback: (v: number) => `+${pct(v)} Siegchance aus Rückständen`,
  injuryRisk: (v: number) => `${sgn(v)}${pct(Math.abs(v))} Verletzungsrisiko`,
  injuryDuration: (v: number) => `${sgn(v)}${pct(Math.abs(v))} Ausfallzeit`,
  fitnessLoss: (v: number) => `${sgn(v)}${pct(Math.abs(v))} Fitnessverlust nach Spielen`,
  ageSlow: (v: number) => `Spieler altern ${pct(v)} langsamer`,
  devPerSeason: (v: number) => `+${v} Stärke-Entwicklung pro Spieler und Saison`,
  moraleFloor: (v: number) => `Moral fällt nie unter ${v} %`,
  youthStr: (v: number) => `+${v} Startstärke für Jugendspieler`,
  youthPot: (v: number) => `+${v} Potenzial für Jugendspieler`,
  youthCount: (v: number) => `+${v} Talent(e) pro Saison aus der Jugend`,
  wonderkid: (v: number) => `${v} garantierte(s) Juwel(e) pro Saison`,
  scoutQuality: (v: number) => `+${pct(v)} Scouting-Qualität`,
  scoutCost: (v: number) => v <= -1 ? 'Scouting-Missionen sind kostenlos' : `${sgn(v)}${pct(Math.abs(v))} Scouting-Kosten`,
  scoutCount: (v: number) => `+${v} Spieler pro Scouting-Mission`,
  academyDiscount: (v: number) => `−${pct(v)} Ausbaukosten der Jugendakademie`,
  fanGain: (v: number) => v >= 0 ? `+${v} Fan-Zufriedenheit pro Spieltag` : `${v} Fan-Zufriedenheit pro Spieltag`,
  fanFloor: (v: number) => `Fan-Zufriedenheit fällt nie unter ${v} %`,
  boardGain: (v: number) => `+${v} Vorstandsvertrauen pro Saison`,
  boardFloor: (v: number) => `Vorstandsvertrauen fällt nie unter ${v} %`,
  pressureMod: (v: number) => v > 0 ? `+${v} Presse-Druck pro Spieltag (Risiko)` : `${v} Presse-Druck pro Spieltag`,
  underworldCost: (v: number) => `${sgn(v)}${pct(Math.abs(v))} Kosten für Unterwelt-Aktionen`,
  penaltyMod: (v: number) => `${sgn(v)}${pct(Math.abs(v))} Höhe von Verbandsstrafen`,
  suspensionMod: (v: number) => v <= -1 ? 'Eigene Sperren entfallen' : `${sgn(v)}${pct(Math.abs(v))} Sperrdauer`,
};

/**
 * Effects that do not change a number — they change what you are allowed to
 * SEE. Kept separate from `fx` because an information unlock cannot be summed,
 * scaled, or contributed to a modifier bus; you either have it or you do not.
 */
export const revealLabels = {
  exactStrength: 'Exakte Stärkewerte statt Schätzungen im Scouting',
  potential: 'Potenzial jedes Spielers wird sichtbar',
  bargains: 'Unterbewertete Spieler werden im Transfermarkt markiert',
  oppLineup: 'Gegnerische Aufstellung vor dem Anpfiff einsehbar',
  marketPreview: 'Rohstoff- und Aktienkurse einen Spieltag im Voraus'
} as const;
export type RevealKey = keyof typeof revealLabels;

/**
 * Named bundles of effects, awarded whole.
 *
 * A grant exists where three or four `fx` keys only ever make sense together —
 * naming the bundle is what lets the node say "you have hired a negotiator"
 * rather than listing four percentages the player has to re-assemble into a
 * concept.
 */
export const grantLabels = {
  negotiator: 'Gehälter −20 %, Verkaufserlöse +15 %',
  tactician: '+3 Stärke gegen stärkere Gegner',
  fitnessGuru: '−40 % Fitnessverlust nach intensiven Partien',
  tycoon: '+25 % Marge im Fanshop und bei B2B',
  motivator: 'Moral fällt nie unter 75 %'
} as const;
export type GrantKey = keyof typeof grantLabels;

/**
 * Effects that are switches, not quantities.
 *
 * These sat in `fx` alongside the numbers, all carrying the value `1`, and the
 * shape was a lie: `noPenalties` appears on five nodes across three doctrines,
 * and on a modifier bus five sources of it either add to `5` — which means
 * nothing, there is no fivefold "no" — or multiply to `1` and silently do
 * nothing at all. Both are the bug we keep shipping, where an effect computes
 * correctly and lands somewhere no one reads.
 *
 * A flag is idempotent. Separating them says so in the type, so `rules.ts`
 * cannot accidentally sum one, and lets the purchase screen stop listing an
 * effect the player already owns.
 */
export const FLAG_KEYS = ['pressureDecay', 'noPenalties', 'contractFree'] as const;
export type FlagKey = (typeof FLAG_KEYS)[number];

export const flagLabels: Record<FlagKey, string> = {
  pressureDecay: 'Presse-Druck baut sich schneller ab',
  noPenalties: 'Keine Verbandsstrafen mehr',
  contractFree: 'Vertragsverlängerungen ohne Handgeld'
};

/* ─────────────────────────────────────────────────────────────────────────
 * Nodes
 * ───────────────────────────────────────────────────────────────────────── */

export const NodeSchema = z.object({
  id: z.string(),
  /** Doctrine id, or `'synth'` for a synthesis. */
  doctrine: z.string(),
  tier: z.number().int().min(1).max(6),
  icon: z.string(),
  name: z.string(),
  /**
   * Two sentences at most, in the register of someone describing what they did
   * without admitting to it. Lore is not flavour text here — it is the only
   * place a node's effects are given a reason, and a node whose lore could
   * belong to any other node is a node that has not been designed.
   */
  lore: z.string(),
  fx: FxSchema,
  /** Node ids that must be owned first. Empty for tier 1. */
  req: z.array(z.string()),
  /** Information unlocks — see `revealLabels`. */
  reveal: z.array(z.string()).optional(),
  /** Idempotent switches — see `flagLabels`. Never summed. */
  flags: z.array(z.enum(FLAG_KEYS)).optional(),
  /** A named bundle of effects — see `grantLabels`. */
  grants: z.string().optional(),
  /** Doctrine rank required, over and above `req`. Capstones only. */
  minRank: z.number().int().positive().optional(),
  /** Synthesis only: the two doctrines it bridges. */
  pair: z.tuple([z.string(), z.string()]).optional(),
  /** Synthesis only. */
  affinity: AffinitySchema.optional(),
  /** Synthesis only: rank required in BOTH doctrines. */
  gate: z.number().int().positive().optional(),
  /** Synthesis only: multiplier on the tier-6 cost. */
  costMult: z.number().positive().optional()
});
export type KnowledgeNode = z.infer<typeof NodeSchema>;

export const coreNodes: KnowledgeNode[] = z.array(NodeSchema).parse([

  // 🎭  SCHATTENKABINETT — 14 Knoten
  {
    id: 'sh_umschlag',
    doctrine: 'shadow',
    tier: 1,
    icon: '💰',
    name: 'Brauner Umschlag',
    lore:
      'Ein Berater, ein Parkhaus, ein Umschlag. Der Rest ist Formsache.',
    fx: { transferDiscount: 0.08 },
    req: []
  },
  {
    id: 'sh_kontakte',
    doctrine: 'shadow',
    tier: 1,
    icon: '🕶️',
    name: 'Zwielichtige Kontakte',
    lore:
      'Man kennt jetzt Leute, die Leute kennen. Türen im Untergrund stehen offen.',
    fx: { underworldCost: -0.25 },
    flags: ['pressureDecay'],
    req: []
  },
  {
    id: 'sh_buch',
    doctrine: 'shadow',
    tier: 1,
    icon: '📒',
    name: 'Kreative Buchhaltung',
    lore:
      'Zwei Bücher: eins für den Verband, eins für die Wahrheit.',
    fx: { opexMod: -0.15 },
    req: []
  },
  {
    id: 'sh_wetten',
    doctrine: 'shadow',
    tier: 1,
    icon: '🎲',
    name: 'Erste Wettkontakte',
    lore:
      'Der Schwager betreibt ein Wettbüro. Er hätte da eine Idee.',
    fx: { opsIncome: 4000 },
    req: []
  },
  {
    id: 'sh_schiri',
    doctrine: 'shadow',
    tier: 2,
    icon: '🟨',
    name: 'Schiri-Freunde',
    lore:
      'Niemand kauft einen Schiedsrichter. Man lädt ihn nur oft genug zum Essen ein.',
    fx: { refBias: 0.06, goalChance: 0.04 },
    req: ['sh_umschlag', 'sh_kontakte']
  },
  {
    id: 'sh_buero',
    doctrine: 'shadow',
    tier: 2,
    icon: '🏪',
    name: 'Eigenes Wettbüro',
    lore:
      'Drei Bildschirme, ein Tresen, eine Lizenz auf fremden Namen.',
    fx: { opsIncome: 12000 },
    req: ['sh_wetten']
  },
  {
    id: 'sh_spitzel',
    doctrine: 'shadow',
    tier: 2,
    icon: '🐀',
    name: 'Spitzel im Gegnerlager',
    lore:
      'Ein Zeugwart mit Schulden ist der beste Analyst der Liga.',
    fx: { strength: 2, oppPenalty: 1 },
    req: ['sh_kontakte'],
    reveal: ['oppLineup']
  },
  {
    id: 'sh_oase',
    doctrine: 'shadow',
    tier: 2,
    icon: '🏝️',
    name: 'Steueroase Malta',
    lore:
      'Die Holding heißt jetzt anders und wohnt am Meer.',
    fx: { b2bBonus: 0.25, wageMod: -0.1 },
    req: ['sh_buch']
  },
  {
    id: 'sh_ultras',
    doctrine: 'shadow',
    tier: 3,
    icon: '🔥',
    name: 'Ultra-Kontrolle',
    lore:
      'Wer die Kurve steuert, steuert die Atmosphäre. Und manchmal den Gästebus.',
    fx: { homeStrength: 5, oppPenalty: 3, fanGain: 2 },
    req: ['sh_spitzel', 'sh_kontakte']
  },
  {
    id: 'sh_imperium',
    doctrine: 'shadow',
    tier: 3,
    icon: '🎰',
    name: 'Wett-Imperium',
    lore:
      'Zwölf Filialen, eine App, und Quoten, die verdächtig gut passen.',
    fx: { opsIncome: 34000 },
    req: ['sh_buero']
  },
  {
    id: 'sh_arzt',
    doctrine: 'shadow',
    tier: 3,
    icon: '💉',
    name: 'Diskreter Sportarzt',
    lore:
      'Er stellt keine Fragen und schreibt keine Rezepte. Nur Rechnungen.',
    fx: { strength: 3, fitnessLoss: -0.5, pressureMod: 2 },
    req: ['sh_umschlag', 'sh_buch']
  },
  {
    id: 'sh_kartell',
    doctrine: 'shadow',
    tier: 4,
    icon: '🤝',
    name: 'Transfer-Kartell',
    lore:
      'Sieben Vereine, eine Absprache. Preise entstehen hier, nicht am Markt.',
    fx: { transferDiscount: 0.22, sellBonus: 0.3 },
    req: ['sh_oase', 'sh_imperium']
  },
  {
    id: 'sh_verband',
    doctrine: 'shadow',
    tier: 4,
    icon: '🏛️',
    name: 'Mann im Verband',
    lore:
      'Er sitzt in der Sportgerichtsbarkeit. Er sitzt auch in deiner Loge.',
    fx: { refBias: 0.1, boardFloor: 65 },
    flags: ['noPenalties'],
    req: ['sh_schiri', 'sh_ultras']
  },
  {
    id: 'sh_pate',
    doctrine: 'shadow',
    tier: 5,
    icon: '👑',
    name: 'Der Pate',
    lore:
      'Es gibt keine Gegner mehr. Nur noch Leute, die dir einen Gefallen schulden.',
    fx: { opsIncome: 90000, transferDiscount: 0.3, strength: 8, boardFloor: 75, refBias: 0.12 },
    req: ['sh_kartell', 'sh_verband'],
    minRank: 12
  },

  // 🔥  MARKENIMPERIUM — 14 Knoten
  {
    id: 'br_logo',
    doctrine: 'brand',
    tier: 1,
    icon: '🎨',
    name: 'Neues Vereinswappen',
    lore:
      'Die Traditionalisten toben zwei Wochen. Dann kaufen sie das Trikot.',
    fx: { merchDemand: 0.1, fanGain: 1 },
    req: []
  },
  {
    id: 'br_social',
    doctrine: 'brand',
    tier: 1,
    icon: '📱',
    name: 'Social-Media-Team',
    lore:
      'Drei Praktikanten mit Ringlicht schlagen jede Pressestelle.',
    fx: { onlineBoost: 0.15, fanGain: 2 },
    req: []
  },
  {
    id: 'br_fuchs',
    doctrine: 'brand',
    tier: 1,
    icon: '💼',
    name: 'Verhandlungsfuchs',
    lore:
      'Du liest Verträge, die andere unterschreiben.',
    fx: {  },
    req: [],
    grants: 'negotiator'
  },
  {
    id: 'br_hausmarke',
    doctrine: 'brand',
    tier: 1,
    icon: '🏷️',
    name: 'Eigene Hausmarke',
    lore:
      'Warum einen Ausrüster bezahlen, wenn man selbst einer sein kann?',
    fx: { merchMargin: 0.12 },
    req: []
  },
  {
    id: 'br_energy',
    doctrine: 'brand',
    tier: 2,
    icon: '⚡',
    name: 'Energy-Drink',
    lore:
      'Schmeckt nach Gummibärchen und Aufstiegskampf. Verkauft sich wie verrückt.',
    fx: { opsIncome: 15000, sponsorMod: 0.2 },
    req: ['br_hausmarke']
  },
  {
    id: 'br_influencer',
    doctrine: 'brand',
    tier: 2,
    icon: '🤳',
    name: 'Influencer-Netzwerk',
    lore:
      'Der Innenverteidiger hat mehr Follower als die Stadt Einwohner.',
    fx: { onlineBoost: 0.35, valueBoost: 0.1 },
    req: ['br_social']
  },
  {
    id: 'br_studio',
    doctrine: 'brand',
    tier: 2,
    icon: '🎬',
    name: 'Kreativ-Studio',
    lore:
      'Vier Trikots pro Saison. Eins davon absichtlich hässlich - für die Sammler.',
    fx: { merchDemand: 0.25, priceTolerance: 0.15 },
    req: ['br_logo']
  },
  {
    id: 'br_naming',
    doctrine: 'brand',
    tier: 2,
    icon: '📛',
    name: 'Naming Rights',
    lore:
      'Das Stadion heißt jetzt nach einer Versicherung. Die Kurve singt den alten Namen weiter.',
    fx: { opsIncome: 22000 },
    req: ['br_logo', 'br_fuchs']
  },
  {
    id: 'br_medien',
    doctrine: 'brand',
    tier: 3,
    icon: '📺',
    name: 'Eigenes Medienhaus',
    lore:
      'Club-TV, Doku-Serie, Podcast. Kritische Fragen stellt jetzt niemand mehr.',
    fx: { opsIncome: 40000, pressureMod: -4, sponsorMod: 0.15 },
    req: ['br_studio', 'br_influencer']
  },
  {
    id: 'br_global',
    doctrine: 'brand',
    tier: 3,
    icon: '🌏',
    name: 'Globale Fanbasis',
    lore:
      'Sommertour Tokio-Jakarta-Los Angeles. Die Spieler hassen es, die Bilanz liebt es.',
    fx: { merchDemand: 0.45, fanGain: 5 },
    req: ['br_influencer']
  },
  {
    id: 'br_tycoon',
    doctrine: 'brand',
    tier: 3,
    icon: '🏭',
    name: 'Industrie-Tycoon',
    lore:
      'Der Verein ist nur noch ein Geschäftsbereich unter vielen.',
    fx: {  },
    req: ['br_hausmarke', 'br_energy'],
    grants: 'tycoon'
  },
  {
    id: 'br_lifestyle',
    doctrine: 'brand',
    tier: 4,
    icon: '🕶️',
    name: 'Lifestyle-Konzern',
    lore:
      'Mode, Gaming, Musiklabel. Leute tragen dein Wappen, die kein Spiel gesehen haben.',
    fx: { merchDemand: 0.8, holdingValue: 0.5, merchMargin: 0.15 },
    req: ['br_global', 'br_tycoon']
  },
  {
    id: 'br_multiclub',
    doctrine: 'brand',
    tier: 4,
    icon: '🌐',
    name: 'Multi-Club-Konzern',
    lore:
      'Salzburg, Leipzig, New York, Bragantino - dieselbe Dose, dieselbe Datenbank.',
    fx: { opsIncome: 65000, transferDiscount: 0.15, youthStr: 4 },
    req: ['br_medien', 'br_naming']
  },
  {
    id: 'br_weltmarke',
    doctrine: 'brand',
    tier: 5,
    icon: '🌟',
    name: 'Weltmarke',
    lore:
      'Der Name steht auf Rucksäcken in Städten, deren Namen du nicht aussprechen kannst.',
    fx: { opsIncome: 150000, merchDemand: 1.5, sponsorMod: 1, wageMod: -0.25, fanGain: 8 },
    req: ['br_lifestyle', 'br_multiclub'],
    minRank: 12
  },

  // 🧠  DATENLABOR — 14 Knoten
  {
    id: 'da_gps',
    doctrine: 'data',
    tier: 1,
    icon: '📡',
    name: 'GPS-Westen',
    lore:
      'Jeder Sprint, jeder Meter, jede Belastungsspitze - protokolliert.',
    fx: { injuryRisk: -0.2 },
    req: []
  },
  {
    id: 'da_video',
    doctrine: 'data',
    tier: 1,
    icon: '🎥',
    name: 'Video-Analyse',
    lore:
      'Zwei Kameras auf dem Dach und ein Praktikant, der Standards schneidet.',
    fx: { strength: 2 },
    req: []
  },
  {
    id: 'da_db',
    doctrine: 'data',
    tier: 1,
    icon: '🗄️',
    name: 'Spieler-Datenbank',
    lore:
      '40.000 Profile, sauber normalisiert. Endlich weiß jemand, wen man da kauft.',
    fx: { scoutQuality: 0.15 },
    req: [],
    reveal: ['exactStrength']
  },
  {
    id: 'da_labor',
    doctrine: 'data',
    tier: 1,
    icon: '🔬',
    name: 'Leistungslabor',
    lore:
      'Laktat, Schlafdaten, Nährwertpläne. Der Kader wundert sich über die Frühstücksregeln.',
    fx: { fitnessLoss: -0.25 },
    req: []
  },
  {
    id: 'da_xg',
    doctrine: 'data',
    tier: 2,
    icon: '📊',
    name: 'xG-Modell',
    lore:
      'Der Stürmer trifft nicht zu selten. Er schießt aus den falschen Zonen.',
    fx: { goalChance: 0.12 },
    req: ['da_video']
  },
  {
    id: 'da_ml',
    doctrine: 'data',
    tier: 2,
    icon: '🤖',
    name: 'ML-Scouting',
    lore:
      'Das Modell empfiehlt einen 19-Jährigen aus der dritten dänischen Liga. Es hat recht.',
    fx: { scoutQuality: 0.3, transferDiscount: 0.08 },
    req: ['da_db'],
    reveal: ['potential', 'bargains']
  },
  {
    id: 'da_injury',
    doctrine: 'data',
    tier: 2,
    icon: '🩺',
    name: 'Verletzungs-Prognose',
    lore:
      'Das System warnt drei Tage vorher. Meistens hört jemand zu.',
    fx: { injuryRisk: -0.35, injuryDuration: -0.5 },
    req: ['da_gps', 'da_labor']
  },
  {
    id: 'da_taktik',
    doctrine: 'data',
    tier: 2,
    icon: '📋',
    name: 'Taktik-Genie',
    lore:
      'Du siehst Muster, wo andere Chaos sehen.',
    fx: {  },
    req: ['da_video'],
    grants: 'tactician'
  },
  {
    id: 'da_rechen',
    doctrine: 'data',
    tier: 3,
    icon: '🖥️',
    name: 'Eigenes Rechenzentrum',
    lore:
      'Ein Serverraum unter der Nordtribüne. Er heizt im Winter das Vereinsheim.',
    fx: { strength: 4, transferDiscount: 0.18 },
    req: ['da_xg', 'da_ml']
  },
  {
    id: 'da_biomech',
    doctrine: 'data',
    tier: 3,
    icon: '🦿',
    name: 'Biomechanik-Institut',
    lore:
      'Laufstil-Korrekturen verlängern Karrieren um Jahre.',
    fx: { ageSlow: 0.4, devPerSeason: 1, injuryRisk: -0.15 },
    req: ['da_injury']
  },
  {
    id: 'da_algo',
    doctrine: 'data',
    tier: 3,
    icon: '📈',
    name: 'Markt-Algorithmus',
    lore:
      'Das Modell handelt Baumwolle besser als der Einkauf. Niemand sagt das laut.',
    fx: { stockBonus: 0.3, matDiscount: 0.15 },
    req: ['da_ml'],
    reveal: ['marketPreview']
  },
  {
    id: 'da_oracle',
    doctrine: 'data',
    tier: 4,
    icon: '🧿',
    name: 'Taktik-KI "ORACLE"',
    lore:
      'Live-Anweisungen auf das Tablet des Co-Trainers. Er tippt nur noch ab.',
    fx: { strength: 7, oppPenalty: 4, goalChance: 0.08 },
    req: ['da_rechen', 'da_biomech']
  },
  {
    id: 'da_talentai',
    doctrine: 'data',
    tier: 4,
    icon: '🧬',
    name: 'Talent-KI',
    lore:
      'Sie bewertet Zwölfjährige nach Bewegungsprofilen. Ethikkommission: ausstehend.',
    fx: { youthPot: 20, scoutCost: -1, scoutQuality: 0.4 },
    req: ['da_algo', 'da_ml']
  },
  {
    id: 'da_sing',
    doctrine: 'data',
    tier: 5,
    icon: '♾️',
    name: 'Datensingularität',
    lore:
      'Das Modell hat die Saison bereits gespielt. Ihr holt nur noch das Ergebnis ab.',
    fx: { strength: 12, injuryRisk: -0.9, injuryDuration: -0.8, transferDiscount: 0.4, opsIncome: 55000, goalChance: 0.15 },
    req: ['da_oracle', 'da_talentai'],
    minRank: 12
  },

  // 🌱  TALENTSCHMIEDE — 14 Knoten
  {
    id: 'ta_bolz',
    doctrine: 'talent',
    tier: 1,
    icon: '⚽',
    name: 'Bolzplatz-Kooperation',
    lore:
      'Vierzehn Vereine im Umland, ein Handschlag, freier Zugriff.',
    fx: { youthCount: 1 },
    req: []
  },
  {
    id: 'ta_netz',
    doctrine: 'talent',
    tier: 1,
    icon: '🔍',
    name: 'Regionales Scout-Netz',
    lore:
      'Sieben Rentner mit Thermoskanne decken jeden Kreisliga-Platz ab.',
    fx: { scoutCost: -0.3 },
    req: []
  },
  {
    id: 'ta_fitness',
    doctrine: 'talent',
    tier: 1,
    icon: '🏃',
    name: 'Fitness-Guru',
    lore:
      'Belastungssteuerung statt Schleifer-Mentalität.',
    fx: {  },
    req: [],
    grants: 'fitnessGuru'
  },
  {
    id: 'ta_internat',
    doctrine: 'talent',
    tier: 1,
    icon: '🏫',
    name: 'Internat-Ausbau',
    lore:
      'Vierzig Betten, eine Mensa, Hausaufgabenpflicht vor dem Training.',
    fx: { youthStr: 8 },
    req: []
  },
  {
    id: 'ta_elite',
    doctrine: 'talent',
    tier: 2,
    icon: '🎓',
    name: 'Eliteschule',
    lore:
      'Schulzeiten um den Trainingsplan gebaut. Abitur inklusive.',
    fx: { youthPot: 15, academyDiscount: 0.3 },
    req: ['ta_internat']
  },
  {
    id: 'ta_welt',
    doctrine: 'talent',
    tier: 2,
    icon: '🌍',
    name: 'Weltweites Scout-Netz',
    lore:
      'Festangestellte in Abidjan, Rosario, Belgrad und Osaka.',
    fx: { scoutQuality: 0.35, scoutCount: 2 },
    req: ['ta_netz']
  },
  {
    id: 'ta_reha',
    doctrine: 'talent',
    tier: 2,
    icon: '🏥',
    name: 'Sportmedizin',
    lore:
      'Eigene Klinik am Trainingsgelände. Kein Warten auf Termine.',
    fx: { injuryDuration: -0.5, fitnessLoss: -0.4 },
    req: ['ta_fitness']
  },
  {
    id: 'ta_motiv',
    doctrine: 'talent',
    tier: 2,
    icon: '🔥',
    name: 'Meister-Motivator',
    lore:
      'Deine Kabinenansprachen sind Legende.',
    fx: {  },
    req: ['ta_fitness'],
    grants: 'motivator'
  },
  {
    id: 'ta_akademie',
    doctrine: 'talent',
    tier: 3,
    icon: '🏆',
    name: 'Weltklasse-Akademie',
    lore:
      'Drei Plätze, Halle, Videoraum, eigene Spielphilosophie ab U9.',
    fx: { youthCount: 2, youthStr: 12, youthPot: 10 },
    req: ['ta_elite']
  },
  {
    id: 'ta_partner',
    doctrine: 'talent',
    tier: 3,
    icon: '🤝',
    name: 'Partnerclub-Netzwerk',
    lore:
      'Leihstationen in vier Ländern. Jeder Talent-Jahrgang bekommt Spielzeit.',
    fx: { opsIncome: 18000, devPerSeason: 1 },
    req: ['ta_welt']
  },
  {
    id: 'ta_individual',
    doctrine: 'talent',
    tier: 3,
    icon: '👨‍🏫',
    name: 'Trainerstab',
    lore:
      'Ein Spezialist pro Mannschaftsteil, plus Kognitionstrainer.',
    fx: { devPerSeason: 2, strength: 2 },
    req: ['ta_reha', 'ta_motiv']
  },
  {
    id: 'ta_magnet',
    doctrine: 'talent',
    tier: 4,
    icon: '🧲',
    name: 'Talentmagnet',
    lore:
      'Eltern rufen an, statt dass du anrufst. Das ist der ganze Unterschied.',
    fx: { youthPot: 25, wonderkid: 1, youthCount: 1 },
    req: ['ta_akademie', 'ta_partner']
  },
  {
    id: 'ta_philo',
    doctrine: 'talent',
    tier: 4,
    icon: '📜',
    name: 'Vereinsphilosophie',
    lore:
      'Elf Eigengewächse auf dem Platz. Die Kurve verliert den Verstand.',
    fx: { youthStr: 6, wageMod: -0.25, fanGain: 6, homeStrength: 3 },
    req: ['ta_individual', 'ta_akademie']
  },
  {
    id: 'ta_dynastie',
    doctrine: 'talent',
    tier: 5,
    icon: '🌳',
    name: 'Fußball-Dynastie',
    lore:
      'Halb Europa spielt mit Spielern, die du großgezogen hast. Und zahlt dafür.',
    fx: { opsIncome: 40000, strength: 10, sellBonus: 0.6, youthPot: 35, wonderkid: 2, devPerSeason: 2 },
    req: ['ta_magnet', 'ta_philo'],
    minRank: 12
  },

  // ✊  KURVENREPUBLIK — 14 Knoten
  {
    id: 'ku_mitglieder',
    doctrine: 'curve',
    tier: 1,
    icon: '📇',
    name: 'Mitglieder-Offensive',
    lore:
      'Ein Stand vor dem Stadion, ein Formular, ein Kugelschreiber an der Schnur. So fängt jede Machtübernahme an.',
    fx: { fanGain: 3, boardGain: 1 },
    req: []
  },
  {
    id: 'ku_fanladen',
    doctrine: 'curve',
    tier: 1,
    icon: '🏪',
    name: 'Fanladen',
    lore:
      'Kein Franchise, kein Lizenznehmer. Zwei Ehrenamtliche und eine Kasse, die dem Verein gehört.',
    fx: { merchMargin: 0.15, priceTolerance: -0.1 },
    req: []
  },
  {
    id: 'ku_stehplatz',
    doctrine: 'curve',
    tier: 1,
    icon: '🎫',
    name: 'Stehplatz-Garantie',
    lore:
      'Im Statut verankert: Diese Kurve wird niemals bestuhlt. Der Aufsichtsrat hat es zähneknirschend unterschrieben.',
    fx: { ticketDemand: 0.2, ticketRevenue: -0.08, fanGain: 2 },
    req: []
  },
  {
    id: 'ku_choreo',
    doctrine: 'curve',
    tier: 1,
    icon: '🎨',
    name: 'Choreo-Kasse',
    lore:
      'Zwölftausend Papptafeln, drei Nächte Arbeit, ein Bild, das zehn Sekunden hält. Es lohnt sich jedes Mal.',
    fx: { homeStrength: 3 },
    req: []
  },
  {
    id: 'ku_5050',
    doctrine: 'curve',
    tier: 2,
    icon: '⚖️',
    name: '50+1 im Statut',
    lore:
      'Die Stimmenmehrheit bleibt beim Verein. Investoren dürfen zahlen, aber nicht bestimmen.',
    fx: { boardFloor: 55, investorMod: -0.2, fanGain: 3 },
    req: ['ku_mitglieder']
  },
  {
    id: 'ku_dachverband',
    doctrine: 'curve',
    tier: 2,
    icon: '🤝',
    name: 'Fan-Dachverband',
    lore:
      'Achtzig Fanclubs, eine Geschäftsstelle, eine Stimme gegenüber Verband und Polizei.',
    fx: { fanGain: 5, pressureMod: -3 },
    req: ['ku_mitglieder', 'ku_choreo']
  },
  {
    id: 'ku_kollektiv',
    doctrine: 'curve',
    tier: 2,
    icon: '💶',
    name: 'Kollektivkasse',
    lore:
      'Dauerkarten in Selbstverwaltung. Keine Dynamic-Pricing-Software fasst diese Kurve an.',
    fx: { ticketRevenue: 0.25, opsIncome: 9000 },
    req: ['ku_stehplatz']
  },
  {
    id: 'ku_ordner',
    doctrine: 'curve',
    tier: 2,
    icon: '🦺',
    name: 'Eigener Ordnerdienst',
    lore:
      'Leute aus der Kurve regeln die Kurve. Die Eskalationen hören auf, weil niemand mehr fremd ist.',
    fx: { opexMod: -0.1 },
    flags: ['noPenalties'],
    req: ['ku_choreo']
  },
  {
    id: 'ku_hexenkessel',
    doctrine: 'curve',
    tier: 3,
    icon: '🔊',
    name: 'Hexenkessel',
    lore:
      'Auswärtsmannschaften hören ihren eigenen Torwart nicht mehr. Der Schiedsrichter auch nicht.',
    fx: { homeStrength: 7, oppPenalty: 3 },
    req: ['ku_choreo', 'ku_dachverband']
  },
  {
    id: 'ku_genossenschaft',
    doctrine: 'curve',
    tier: 3,
    icon: '📜',
    name: 'Genossen-Anteile',
    lore:
      'Neuntausend Mitglieder zeichnen Anteile. Kein Fonds der Welt kann sie überbieten, weil sie nicht verkaufen.',
    fx: { opsIncome: 26000, boardFloor: 60 },
    req: ['ku_5050', 'ku_kollektiv']
  },
  {
    id: 'ku_auswaerts',
    doctrine: 'curve',
    tier: 3,
    icon: '🚌',
    name: 'Auswärts-Macht',
    lore:
      'Viertausend Mitgereiste in einem Stadion, das sechzehntausend fasst. Es fühlt sich an wie ein Heimspiel.',
    fx: { awayStrength: 5, fanGain: 2 },
    req: ['ku_kollektiv', 'ku_ordner']
  },
  {
    id: 'ku_basisdemokratie',
    doctrine: 'curve',
    tier: 4,
    icon: '🗳️',
    name: 'Basis-Demokratie',
    lore:
      'Die Mitgliederversammlung entscheidet über Trikot, Anstoßzeit und Investoreneinstieg. Sie entscheidet meistens gegen dich - und behält recht.',
    fx: { fanFloor: 80, boardFloor: 65, transferBudgetMod: -0.25 },
    req: ['ku_genossenschaft', 'ku_hexenkessel']
  },
  {
    id: 'ku_boykottmacht',
    doctrine: 'curve',
    tier: 4,
    icon: '🚫',
    name: 'Boykott-Macht',
    lore:
      'Ein Aufruf, und die Kurve bleibt stumm. Zwei Aufrufe, und der Verband nimmt die Anstoßzeit zurück.',
    fx: { oppPenalty: 6, sponsorMod: 0.3, pressureMod: -4 },
    req: ['ku_auswaerts', 'ku_dachverband']
  },
  {
    id: 'ku_republik',
    doctrine: 'curve',
    tier: 5,
    icon: '🏛️',
    name: 'Kurvenrepublik',
    lore:
      'Der Verein gehört denen, die ihn tragen. Spieler unterschreiben für weniger Geld, weil sie hier gesehen werden.',
    fx: { opsIncome: 70000, homeStrength: 10, awayStrength: 5, fanFloor: 100, wageMod: -0.2 },
    req: ['ku_basisdemokratie', 'ku_boykottmacht'],
    minRank: 12
  },

  // ⚙️  WERKSKOMBINAT — 14 Knoten
  {
    id: 'we_werkbank',
    doctrine: 'industry',
    tier: 1,
    icon: '🔧',
    name: 'Zweite Werkbank',
    lore:
      'Eine Maschine mehr in derselben Halle. Der banalste Hebel der Industriegeschichte.',
    fx: { factoryOutput: 0.2 },
    req: []
  },
  {
    id: 'we_einkauf',
    doctrine: 'industry',
    tier: 1,
    icon: '📋',
    name: 'Zentral-Einkauf',
    lore:
      'Vier Abteilungen bestellten dieselbe Baumwolle bei vier Händlern. Damit ist Schluss.',
    fx: { matDiscount: 0.12 },
    req: []
  },
  {
    id: 'we_lager',
    doctrine: 'industry',
    tier: 1,
    icon: '📦',
    name: 'Hochregal-Lager',
    lore:
      'Elf Meter Stahl statt Palettenstapel im Gang. Plötzlich passt die doppelte Menge hinein.',
    fx: { warehouseBonus: 1 },
    req: []
  },
  {
    id: 'we_qualitaet',
    doctrine: 'industry',
    tier: 1,
    icon: '🔎',
    name: 'Qualitäts-Sicherung',
    lore:
      'Die Rücklaufquote halbiert sich, sobald jemand die Nähte kontrolliert, bevor sie das Haus verlassen.',
    fx: { merchMargin: 0.1, priceTolerance: 0.08 },
    req: []
  },
  {
    id: 'we_fliessband',
    doctrine: 'industry',
    tier: 2,
    icon: '🏭',
    name: 'Fließband',
    lore:
      'Der Mensch bleibt stehen, das Werkstück bewegt sich. Die Stückzahl explodiert, die Stimmung sinkt.',
    fx: { factoryOutput: 0.4 },
    req: ['we_werkbank']
  },
  {
    id: 'we_spedition',
    doctrine: 'industry',
    tier: 2,
    icon: '🚚',
    name: 'Eigene Spedition',
    lore:
      'Vierzehn Sattelzüge im Vereinsrot. Sie fahren fremde Fracht zurück, statt leer zu rollen.',
    fx: { opsIncome: 14000, matDiscount: 0.1 },
    req: ['we_einkauf', 'we_lager']
  },
  {
    id: 'we_recycling',
    doctrine: 'industry',
    tier: 2,
    icon: '♻️',
    name: 'Kreislauf-Wirtschaft',
    lore:
      'Verschnitt wird zu Füllmaterial, alte Trikots zu Garn. Der Einkauf schrumpft, ohne dass jemand spart.',
    fx: { matEfficiency: 0.25 },
    req: ['we_qualitaet']
  },
  {
    id: 'we_werksvertrag',
    doctrine: 'industry',
    tier: 2,
    icon: '📝',
    name: 'Werks-Vertrag',
    lore:
      'Drei Erstligisten lassen bei dir fertigen. Sie wissen nicht, dass sie deine Entwicklung mitbezahlen.',
    fx: { b2bBonus: 0.3 },
    req: ['we_einkauf']
  },
  {
    id: 'we_roboter',
    doctrine: 'industry',
    tier: 3,
    icon: '🦾',
    name: 'Robotik-Straße',
    lore:
      'Zwölf Arme, kein Schichtwechsel, keine Krankmeldung. Die Halle ist nachts unbeleuchtet und läuft trotzdem.',
    fx: { factoryOutput: 0.8, opexMod: -0.15 },
    req: ['we_fliessband', 'we_recycling']
  },
  {
    id: 'we_hafen',
    doctrine: 'industry',
    tier: 3,
    icon: '⚓',
    name: 'Hafen-Terminal',
    lore:
      'Ein eigener Liegeplatz. Ab hier bestimmst du, wann deine Container ausgeladen werden.',
    fx: { opsIncome: 38000, matDiscount: 0.15 },
    req: ['we_spedition']
  },
  {
    id: 'we_werksclub',
    doctrine: 'industry',
    tier: 3,
    icon: '🏢',
    name: 'Werksverein-Status',
    lore:
      'Offiziell die Betriebssportgemeinschaft. Praktisch der Grund, warum der Konzern die Gehälter mitträgt.',
    fx: { sponsorMod: 0.5, wageMod: -0.15 },
    req: ['we_werksvertrag', 'we_qualitaet']
  },
  {
    id: 'we_vertikal',
    doctrine: 'industry',
    tier: 4,
    icon: '🧱',
    name: 'Vertikale Integration',
    lore:
      'Vom Rohstoff bis zur Ladentheke gehört jede Stufe dir. Niemand verdient mehr an dir mit.',
    fx: { matDiscount: 0.4, merchMargin: 0.3, factoryOutput: 0.5 },
    req: ['we_roboter', 'we_hafen']
  },
  {
    id: 'we_konzern',
    doctrine: 'industry',
    tier: 4,
    icon: '🏗️',
    name: 'Konzern-Zentrale',
    lore:
      'Der Verein ist ein Geschäftsbereich mit eigenem Vorstandsressort. Fußball steht im Anhang.',
    fx: { opsIncome: 80000, holdingValue: 0.8 },
    req: ['we_werksclub', 'we_hafen']
  },
  {
    id: 'we_kombinat',
    doctrine: 'industry',
    tier: 5,
    icon: '🏭',
    name: 'Werkskombinat',
    lore:
      'Eine geschlossene Produktionskette über drei Länder. Die Marge entsteht, bevor irgendjemand einen Ball berührt.',
    fx: { opsIncome: 160000, factoryOutput: 2, matDiscount: 0.3, matEfficiency: 0.45, merchDemand: 0.6 },
    req: ['we_vertikal', 'we_konzern'],
    minRank: 12
  },

  // 🧿  MENTALFABRIK — 14 Knoten
  {
    id: 'me_kabine',
    doctrine: 'psyche',
    tier: 1,
    icon: '🗣️',
    name: 'Kabinen-Psychologie',
    lore:
      'Nicht lauter reden, sondern zur richtigen Person. Der Unterschied ist messbar.',
    fx: { moraleFloor: 60 },
    req: []
  },
  {
    id: 'me_elfmeter',
    doctrine: 'psyche',
    tier: 1,
    icon: '🎯',
    name: 'Elfmeter-Training',
    lore:
      'Nicht die Technik wird trainiert, sondern der Gang vom Mittelkreis zum Punkt.',
    fx: { goalChance: 0.08 },
    req: []
  },
  {
    id: 'me_rituale',
    doctrine: 'psyche',
    tier: 1,
    icon: '🧦',
    name: 'Rituale',
    lore:
      'Immer dieselbe Reihenfolge beim Anziehen, immer derselbe Platz im Bus. Aberglaube ist angewandte Beruhigung.',
    fx: { homeStrength: 2, awayStrength: 2 },
    req: []
  },
  {
    id: 'me_presse',
    doctrine: 'psyche',
    tier: 1,
    icon: '🎙️',
    name: 'Medien-Training',
    lore:
      'Drei Sätze, die nichts sagen und trotzdem gut klingen. Die halbe Krise entsteht erst am Mikrofon.',
    fx: { pressureMod: -3, boardGain: 2 },
    req: []
  },
  {
    id: 'me_mentaltrainer',
    doctrine: 'psyche',
    tier: 2,
    icon: '🧘',
    name: 'Mental-Trainer',
    lore:
      'Fest angestellt, eigener Raum, Schweigepflicht. Nach zwei Monaten steht die Hälfte des Kaders auf der Warteliste.',
    fx: { strength: 3, moraleFloor: 70 },
    req: ['me_kabine']
  },
  {
    id: 'me_mindgames',
    doctrine: 'psyche',
    tier: 2,
    icon: '♟️',
    name: 'Mindgames',
    lore:
      'Ein Satz auf der Pressekonferenz am Donnerstag, und der gegnerische Trainer erklärt am Samstag noch immer sich selbst.',
    fx: { oppPenalty: 3, pressureMod: 1 },
    req: ['me_presse']
  },
  {
    id: 'me_flow',
    doctrine: 'psyche',
    tier: 2,
    icon: '🌊',
    name: 'Flow-Programm',
    lore:
      'Belastung exakt an der Kante zwischen Überforderung und Langeweile. Dort passieren die guten Spiele.',
    fx: { goalChance: 0.12, strength: 2 },
    req: ['me_elfmeter', 'me_rituale']
  },
  {
    id: 'me_resilienz',
    doctrine: 'psyche',
    tier: 2,
    icon: '🛡️',
    name: 'Resilienz-Programm',
    lore:
      'Rückstände werden trainiert wie Standards. Die Mannschaft kennt das Gefühl, bevor es eintritt.',
    fx: { comeback: 0.1, moraleFloor: 65 },
    req: ['me_kabine', 'me_rituale']
  },
  {
    id: 'me_visual',
    doctrine: 'psyche',
    tier: 3,
    icon: '🎞️',
    name: 'Visualisierung',
    lore:
      'Sie durchlaufen das Spiel dreißigmal im Kopf, bevor sie es einmal mit den Füßen spielen.',
    fx: { strength: 5, goalChance: 0.06 },
    req: ['me_mentaltrainer', 'me_flow']
  },
  {
    id: 'me_gegnerprofil',
    doctrine: 'psyche',
    tier: 3,
    icon: '🔬',
    name: 'Gegner-Profil',
    lore:
      'Nicht wie er spielt, sondern wann er zweifelt. Jeder Kader hat zwei Spieler, über die er kippt.',
    fx: { oppPenalty: 6, goalChance: 0.08 },
    req: ['me_mindgames']
  },
  {
    id: 'me_kult',
    doctrine: 'psyche',
    tier: 3,
    icon: '🕯️',
    name: 'Interner Kult',
    lore:
      'Eigene Sprache, eigene Zeichen, eigene Feiertage. Wer einmal drin ist, will nirgendwo anders hin.',
    fx: { wageMod: -0.2, moraleFloor: 80 },
    flags: ['contractFree'],
    req: ['me_resilienz', 'me_mentaltrainer']
  },
  {
    id: 'me_unbesiegbar',
    doctrine: 'psyche',
    tier: 4,
    icon: '👁️',
    name: 'Unbesiegbarkeit',
    lore:
      'Die Mannschaft glaubt nicht, dass sie gewinnen kann. Sie hält es für bereits entschieden.',
    fx: { strength: 8, moraleFloor: 95, comeback: 0.1 },
    req: ['me_visual', 'me_kult']
  },
  {
    id: 'me_zermuerbung',
    doctrine: 'psyche',
    tier: 4,
    icon: '⏳',
    name: 'Zermürbungs-Doktrin',
    lore:
      'Nichts Spektakuläres. Nur neunzig Minuten, in denen der Gegner permanent eine Entscheidung zu viel treffen muss.',
    fx: { oppPenalty: 10, fitnessLoss: -0.15 },
    req: ['me_gegnerprofil', 'me_visual']
  },
  {
    id: 'me_fabrik',
    doctrine: 'psyche',
    tier: 5,
    icon: '🧿',
    name: 'Mentalfabrik',
    lore:
      'Zustände werden hier nicht mehr erhofft, sondern hergestellt. Der Kopf ist die letzte Produktionsstätte, die noch Reserven hatte.',
    fx: { strength: 14, oppPenalty: 12, goalChance: 0.2, moraleFloor: 100, fitnessLoss: -0.35 },
    req: ['me_unbesiegbar', 'me_zermuerbung'],
    minRank: 12
  },

  // 🕊️  DIPLOMATENLOGE — 14 Knoten
  {
    id: 'di_lobby',
    doctrine: 'politics',
    tier: 1,
    icon: '🏛️',
    name: 'Lobby-Büro',
    lore:
      'Zwei Zimmer in Frankfurt, fünf Gehminuten von der Verbandszentrale. Mehr braucht es zunächst nicht.',
    fx: { penaltyMod: -0.5, boardGain: 3 },
    req: []
  },
  {
    id: 'di_arbeit',
    doctrine: 'politics',
    tier: 1,
    icon: '🛂',
    name: 'Behörden-Draht',
    lore:
      'Ein Sachbearbeiter, der zurückruft. In diesem Geschäft ist das ein Wettbewerbsvorteil.',
    fx: { scoutCost: -0.3 },
    req: []
  },
  {
    id: 'di_gremium',
    doctrine: 'politics',
    tier: 1,
    icon: '🪑',
    name: 'Sitz im Ligagremium',
    lore:
      'Kein Stimmrecht, aber Anwesenheit. Man erfährt Dinge sechs Wochen vor der Konkurrenz.',
    fx: { opsIncome: 11000, euroBonus: 0.15 },
    req: []
  },
  {
    id: 'di_protokoll',
    doctrine: 'politics',
    tier: 1,
    icon: '🥂',
    name: 'Protokoll & Empfänge',
    lore:
      'Die Loge ist kein Zuschauerplatz, sondern ein Verhandlungstisch mit Aussicht.',
    fx: { sponsorMod: 0.12, boardGain: 2 },
    req: []
  },
  {
    id: 'di_investor',
    doctrine: 'politics',
    tier: 2,
    icon: '💼',
    name: 'Erster Investor',
    lore:
      'Zwanzig Prozent an der Kapitalgesellschaft. Die Kurve hängt am Samstag ein Banner auf.',
    fx: { opsIncome: 20000, fanGain: -2, transferBudgetMod: 0.3 },
    req: ['di_protokoll']
  },
  {
    id: 'di_uefa',
    doctrine: 'politics',
    tier: 2,
    icon: '🌍',
    name: 'UEFA-Kontakte',
    lore:
      'Man kennt die Referenten, nicht die Präsidenten. Die Referenten schreiben die Statuten.',
    fx: { euroBonus: 0.3, opsIncome: 8000 },
    req: ['di_gremium']
  },
  {
    id: 'di_visa',
    doctrine: 'politics',
    tier: 2,
    icon: '🛃',
    name: 'Visa-Netzwerk',
    lore:
      'Ein Talent aus Abidjan braucht neun Monate. Oder drei Wochen, je nachdem, wen du anrufst.',
    fx: { transferDiscount: 0.15, scoutCost: -0.2 },
    req: ['di_arbeit']
  },
  {
    id: 'di_schieds',
    doctrine: 'politics',
    tier: 2,
    icon: '⚖️',
    name: 'Sportgericht',
    lore:
      'Sperren werden nicht aufgehoben, sondern zur Bewährung ausgesetzt. Das steht dir jederzeit offen.',
    fx: { suspensionMod: -0.5 },
    flags: ['noPenalties'],
    req: ['di_lobby']
  },
  {
    id: 'di_staatsfonds',
    doctrine: 'politics',
    tier: 3,
    icon: '🛢️',
    name: 'Staatsfonds-Beteiligung',
    lore:
      'Das Geld hat keinen Namen, nur eine Adresse in einem Land ohne Sportgeschichte.',
    fx: { opsIncome: 60000, transferBudgetMod: 1, fanGain: -4, pressureMod: 2 },
    req: ['di_investor', 'di_uefa']
  },
  {
    id: 'di_turnier',
    doctrine: 'politics',
    tier: 3,
    icon: '🏟️',
    name: 'Turnier-Ausrichtung',
    lore:
      'Ein Halbfinale im eigenen Stadion. Der Ausbau wird plötzlich zu sechzig Prozent bezuschusst.',
    fx: { opsIncome: 30000, stadiumCostMod: -0.4 },
    req: ['di_uefa', 'di_protokoll']
  },
  {
    id: 'di_kaderregel',
    doctrine: 'politics',
    tier: 3,
    icon: '📐',
    name: 'Kaderregel-Einfluss',
    lore:
      'Du schreibst die Regel nicht. Du sitzt nur in dem Ausschuss, der sie formuliert.',
    fx: { oppPenalty: 4, suspensionMod: -1 },
    req: ['di_visa', 'di_schieds']
  },
  {
    id: 'di_exekutive',
    doctrine: 'politics',
    tier: 4,
    icon: '🗝️',
    name: 'Sitz in der Exekutive',
    lore:
      'Auslosungen sind Zufall. Aber jemand legt fest, welche Töpfe es gibt.',
    fx: { opsIncome: 110000, oppPenalty: 6, euroBonus: 0.5 },
    req: ['di_staatsfonds', 'di_turnier']
  },
  {
    id: 'di_nation',
    doctrine: 'politics',
    tier: 4,
    icon: '🚩',
    name: 'Nation-Branding',
    lore:
      'Der Verein ist Außenpolitik mit Rasen. Kritische Fragen werden zu diplomatischen Zwischenfällen.',
    fx: { sponsorMod: 1, merchDemand: 0.5, fanGain: -6, pressureMod: 3 },
    req: ['di_kaderregel', 'di_staatsfonds']
  },
  {
    id: 'di_loge',
    doctrine: 'politics',
    tier: 5,
    icon: '🕊️',
    name: 'Diplomatenloge',
    lore:
      'Ein Raum mit acht Sesseln, in dem entschieden wird, wer die nächsten zehn Jahre gewinnt. Du hast einen davon.',
    fx: { opsIncome: 200000, boardFloor: 100, oppPenalty: 10, transferDiscount: 0.35, euroBonus: 1 },
    flags: ['noPenalties'],
    req: ['di_exekutive', 'di_nation'],
    minRank: 12
  },
]);

/* ─────────────────────────────────────────────────────────────────────────
 * Syntheses
 * ───────────────────────────────────────────────────────────────────────── */

/**
 * Twenty-eight crossings, one per doctrine pair.
 *
 * A synthesis wants rank in BOTH doctrines, so at eight doctrines and scarce
 * points a career reaches three or four. This is where a build stops being a
 * spending pattern and becomes a thing the player can name.
 */
const SynthesisDefSchema = z.object({
  pair: z.tuple([z.string(), z.string()]),
  icon: z.string(),
  name: z.string(),
  lore: z.string(),
  fx: FxSchema,
  flags: z.array(z.enum(FLAG_KEYS)).optional()
});
export type SynthesisDef = z.infer<typeof SynthesisDefSchema>;

export const synthesisDefs: SynthesisDef[] = z
  .array(SynthesisDefSchema)
  .length(28)
  .parse([
  {
    pair: ['shadow', 'brand'],
    icon: '✉️',
    name: 'Briefkasten-Sponsoring',
    lore:
      'Der Hauptsponsor existiert nur als Adresse auf Zypern. Er zahlt trotzdem pünktlich, und zwar auffällig gut.',
    fx: { sponsorMod: 0.6, opsIncome: 25000, pressureMod: 3 }
  },
  {
    pair: ['shadow', 'data'],
    icon: '🎲',
    name: 'Quoten-Modell',
    lore:
      'Das Modell sagt nicht voraus, wie das Spiel ausgeht. Es sagt voraus, wie viel eine bestimmte Aufstellung wert ist.',
    fx: { opsIncome: 70000, refBias: 0.08, stockBonus: 0.4 }
  },
  {
    pair: ['shadow', 'talent'],
    icon: '📑',
    name: 'Grauzonen-Transfers',
    lore:
      'Sechzehnjährige mit Ausbildungsvertrag in einem Land, das keine Ausbildungsverträge kennt.',
    fx: { youthPot: 30, youthCount: 2, pressureMod: 2, transferDiscount: 0.12 }
  },
  {
    pair: ['shadow', 'curve'],
    icon: '🧨',
    name: 'Pyropakt',
    lore:
      'Die Kurve bekommt Freiraum, du bekommst eine Atmosphäre, in der kein Gegner klar denkt. Niemand hat etwas unterschrieben.',
    fx: { homeStrength: 8, oppPenalty: 5, pressureMod: 2, fanGain: 3 }
  },
  {
    pair: ['shadow', 'industry'],
    icon: '🌒',
    name: 'Schatten-Fertigung',
    lore:
      'Dritte Schicht, zweite Buchhaltung, keine Papiere. Die Stückkosten sinken auf ein Niveau, das offiziell unmöglich ist.',
    fx: { opexMod: -0.35, matDiscount: 0.3, factoryOutput: 0.6, pressureMod: 3 }
  },
  {
    pair: ['shadow', 'psyche'],
    icon: '🕷️',
    name: 'Psychologische Kriegsführung',
    lore:
      'Ein Dossier über den gegnerischen Kapitän, das nie veröffentlicht wird. Er weiß nur, dass es existiert.',
    fx: { oppPenalty: 10, refBias: 0.05, pressureMod: 2 }
  },
  {
    pair: ['shadow', 'politics'],
    icon: '💼',
    name: 'Koffer-Diplomatie',
    lore:
      'Zwei Wege führen zum selben Beschluss. Du gehst beide gleichzeitig.',
    fx: { opsIncome: 60000, oppPenalty: 6, refBias: 0.06 },
    flags: ['noPenalties']
  },
  {
    pair: ['brand', 'data'],
    icon: '📈',
    name: 'Predictive Marketing',
    lore:
      'Die Kollektion wird produziert, bevor die Nachfrage entsteht - weil das Modell weiß, dass sie entstehen wird.',
    fx: { merchDemand: 0.7, onlineBoost: 0.5, merchMargin: 0.15 }
  },
  {
    pair: ['brand', 'talent'],
    icon: '🎬',
    name: 'Jugend als Kampagne',
    lore:
      'Die Debütanten sind Content. Jeder Sechzehnjährige bekommt eine Dokureihe, bevor er ein Ligaspiel hat.',
    fx: { youthStr: 10, merchDemand: 0.4, valueBoost: 0.25 }
  },
  {
    pair: ['brand', 'curve'],
    icon: '⚡',
    name: 'Echtheits-Paradox',
    lore:
      'Du verkaufst die Unverkäuflichkeit. Es funktioniert grandios und die Kurve verzeiht es dir nie ganz.',
    fx: { merchDemand: 0.5, merchMargin: 0.25, sponsorMod: 0.4, fanGain: -3 }
  },
  {
    pair: ['brand', 'industry'],
    icon: '👕',
    name: 'Eigene Ausrüstermarke',
    lore:
      'Kein Lizenzvertrag mehr. Das Trikot wird im eigenen Werk genäht und trägt das eigene Zeichen.',
    fx: { merchMargin: 0.45, matDiscount: 0.25, sponsorMod: 0.3 }
  },
  {
    pair: ['brand', 'psyche'],
    icon: '🦸',
    name: 'Helden-Erzählung',
    lore:
      'Die Kampagne läuft nach innen wie nach außen. Die Spieler glauben die Legende, die sie selbst bewerben.',
    fx: { strength: 5, merchDemand: 0.35, moraleFloor: 85 }
  },
  {
    pair: ['brand', 'politics'],
    icon: '🏳️',
    name: 'Nation als Sponsor',
    lore:
      'Auf der Brust steht ein Staat. Das Volumen sprengt jede Marktlogik, weil es keine ist.',
    fx: { sponsorMod: 1.2, opsIncome: 45000, fanGain: -4 }
  },
  {
    pair: ['data', 'talent'],
    icon: '🧬',
    name: 'Talent-Genomik',
    lore:
      'Bewegungsprofile von Elfjährigen, abgeglichen mit zwanzig Jahrgängen. Die Trefferquote ist unheimlich.',
    fx: { youthPot: 35, wonderkid: 1, scoutQuality: 0.35 }
  },
  {
    pair: ['data', 'curve'],
    icon: '📱',
    name: 'Fandaten-Plattform',
    lore:
      'Die Mitglieder geben ihre Daten freiwillig, weil die Plattform ihnen gehört. Genau deshalb sind sie vollständig.',
    fx: { ticketRevenue: 0.35, fanGain: 4, merchDemand: 0.25 }
  },
  {
    pair: ['data', 'industry'],
    icon: '🖧',
    name: 'Digitaler Zwilling',
    lore:
      'Die Fabrik läuft zweimal: einmal in Stahl, einmal in Software. Die Software probiert die Fehler vorher aus.',
    fx: { factoryOutput: 1.2, opexMod: -0.25, matEfficiency: 0.3 }
  },
  {
    pair: ['data', 'psyche'],
    icon: '🧠',
    name: 'Neurometrie',
    lore:
      'Blickführung, Reaktionszeit, kognitive Last unter Druck. Es stellt sich heraus: das ist trainierbar.',
    fx: { strength: 8, goalChance: 0.12, oppPenalty: 3 }
  },
  {
    pair: ['data', 'politics'],
    icon: '📊',
    name: 'Regulierungs-Modell',
    lore:
      'Ein Modell, das Finanzregeln simuliert, bevor sie beschlossen werden. Deine Kaderplanung ist zwei Jahre voraus.',
    fx: { euroBonus: 0.5, transferDiscount: 0.15, opsIncome: 30000 }
  },
  {
    pair: ['talent', 'curve'],
    icon: '🌿',
    name: 'Eigengewächs-Doktrin',
    lore:
      'Sieben Spieler aus dem eigenen Stadtteil. Die Kurve singt Namen, die sie aus der Schule kennt.',
    fx: { youthStr: 12, homeStrength: 6, wageMod: -0.2, fanGain: 4 }
  },
  {
    pair: ['talent', 'industry'],
    icon: '🔩',
    name: 'Duale Ausbildung',
    lore:
      'Vormittags Werk, nachmittags Platz. Wer es nicht in den Profikader schafft, hat trotzdem einen Beruf.',
    fx: { youthCount: 2, opexMod: -0.2, wageMod: -0.15 }
  },
  {
    pair: ['talent', 'psyche'],
    icon: '📖',
    name: 'Charakterschule',
    lore:
      'Technik kann jede Akademie. Hier wird trainiert, wie man mit einem Fehlpass vor sechzigtausend Menschen umgeht.',
    fx: { devPerSeason: 3, moraleFloor: 85, youthPot: 20 }
  },
  {
    pair: ['talent', 'politics'],
    icon: '🎓',
    name: 'Akademie-Diplomatie',
    lore:
      'Partnerakademien in elf Ländern, abgesegnet auf Ministerebene. Die Talentwege sind Staatsverträge.',
    fx: { scoutCost: -1, youthPot: 25, scoutCount: 2, transferDiscount: 0.1 }
  },
  {
    pair: ['curve', 'industry'],
    icon: '🔨',
    name: 'Werkstor-Kurve',
    lore:
      'Die Schicht endet um halb drei, das Spiel beginnt um halb vier. Der Weg dazwischen ist zweihundert Meter.',
    fx: { homeStrength: 5, opsIncome: 45000, fanGain: 3 }
  },
  {
    pair: ['curve', 'psyche'],
    icon: '🔥',
    name: 'Kollektives Bewusstsein',
    lore:
      'Elf Spieler, die spüren, dass zwanzigtausend Menschen dasselbe wollen wie sie. Das trägt über neunzig Minuten.',
    fx: { strength: 7, moraleFloor: 90, comeback: 0.12, homeStrength: 4 }
  },
  {
    pair: ['curve', 'politics'],
    icon: '✋',
    name: 'Mitglieder-Veto',
    lore:
      'Die Loge verhandelt, die Basis stimmt ab. Zwei Machtzentren im selben Verein, permanent im Konflikt - und erstaunlich stabil.',
    fx: { boardFloor: 85, opsIncome: 40000, fanGain: -2, transferBudgetMod: 0.4 }
  },
  {
    pair: ['industry', 'psyche'],
    icon: '⏱️',
    name: 'Werks-Disziplin',
    lore:
      'Regeneration wird getaktet wie eine Fertigungsstraße. Die Ausfallzeiten sinken auf ein Niveau, das niemand glaubt.',
    fx: { fitnessLoss: -0.5, factoryOutput: 0.6, injuryRisk: -0.3 }
  },
  {
    pair: ['industry', 'politics'],
    icon: '🏗️',
    name: 'Subventions-Korridor',
    lore:
      'Strukturförderung, Infrastrukturprogramm, Standortsicherung. Drei Töpfe, ein Stadion.',
    fx: { opsIncome: 95000, stadiumCostMod: -0.5, opexMod: -0.2 }
  },
  {
    pair: ['psyche', 'politics'],
    icon: '🎭',
    name: 'Diplomatisches Pokerface',
    lore:
      'Am Verhandlungstisch wie an der Seitenlinie: Der Erste, der sein Gesicht verliert, zahlt den Aufschlag.',
    fx: { oppPenalty: 8, transferDiscount: 0.2, wageMod: -0.15 }
  }
  ]);

/**
 * Gate and cost are DERIVED from the affinity matrix, never written down.
 *
 * Allied pairs open earlier and cheaper, hostile pairs later and dearer. If
 * these twenty-eight nodes carried their own numbers, someone would eventually
 * flip a pair in `affinity` and the node would keep the old price — the matrix
 * and the tree would disagree, and only one of them would be on screen.
 */
export function buildSynthesisNodes(): KnowledgeNode[] {
  return synthesisDefs.map((s) => {
    const [a, b] = s.pair;
    const aff = affinityOf(a, b);
    const gate = aff === 'allied' ? 5 : aff === 'hostile' ? 8 : 6;
    const costMult = aff === 'allied' ? 0.7 : aff === 'hostile' ? 1.5 : 1.0;
    return NodeSchema.parse({
      id: `sy_${a}_${b}`,
      doctrine: 'synth',
      tier: 6,
      pair: s.pair,
      affinity: aff,
      icon: s.icon,
      name: s.name,
      lore: s.lore,
      fx: s.fx,
      flags: s.flags,
      req: [],
      gate,
      costMult
    });
  });
}

/** Every node in the game: 112 doctrine nodes plus 28 syntheses. */
export const knowledgeNodes: KnowledgeNode[] = [...coreNodes, ...buildSynthesisNodes()];

export const nodeById: ReadonlyMap<string, KnowledgeNode> = new Map(
  knowledgeNodes.map((n) => [n.id, n])
);
