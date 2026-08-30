import { z } from 'zod';

/**
 * The supply chain: raw materials, and the factories that turn them into the
 * things the fan shop sells.
 *
 * ## Who actually buys this
 *
 * The first version pointed the factories at the fan shop, on the grounds that
 * `merch` already restocks at a wholesale price and a plant only has to beat
 * it. Then I measured the shop: at a Liga-4 crowd it sells about NINETEEN units
 * a week across all four items. The factories as scoped produce 385. Two orders
 * of magnitude, and the whole feature would have been a machine for turning
 * money into unsellable scarves.
 *
 * So the shop is the trickle and the business is B2B: other clubs order in
 * thousands, and that is what a factory is for. Finished goods go to a stock of
 * their own with two outlets — a contract, or the shop shelf. Beating the
 * wholesale price is still the reason to send some to the shop; it is just not
 * the reason to own the plant.
 */

export const MaterialSchema = z.object({
  id: z.string(),
  name: z.string(),
  unit: z.string(),
  basePrice: z.number().min(0),
  /** The market never leaves this band, however the dice fall. */
  minPrice: z.number().min(0),
  maxPrice: z.number().min(0),
  /** Starting stock in the warehouse. */
  initialStock: z.number().int().min(0)
});
export type Material = z.infer<typeof MaterialSchema>;

export const FactorySchema = z.object({
  id: z.string(),
  name: z.string(),
  /** What it makes — a `merch` item id. The link that makes this worth owning. */
  produces: z.string(),
  /** Which material, and how much of it per unit produced. */
  material: z.string(),
  perUnit: z.number().min(0),
  /** Cost to buy the plant, then each upgrade. */
  costs: z.array(z.number().int().min(0)).min(1),
  /** Units produced per week at each level. */
  outputPerWeek: z.array(z.number().int().min(0)).min(1),
  blurb: z.string().min(12)
});
export type Factory = z.infer<typeof FactorySchema>;

/**
 * An order from another club. This is the demand that justifies a factory.
 *
 * Payout is set against the material cost of filling it, not against the fan
 * shop's wholesale price — a club ordering two thousand scarves is not paying
 * retail, and the margin has to be thin enough that a badly-timed material
 * purchase can wipe it out.
 */
export const ContractSchema = z.object({
  id: z.string(),
  club: z.string(),
  /** The `merch` item id being ordered. */
  item: z.string(),
  units: z.number().int().min(1),
  payout: z.number().int().min(0),
  /** Weeks before the offer lapses. */
  expiresIn: z.number().int().min(1)
});
export type Contract = z.infer<typeof ContractSchema>;

export const IndustryContentSchema = z
  .object({
    materials: z.array(MaterialSchema).min(1),
    factories: z.array(FactorySchema).min(1),
    /** Warehouse capacity per level, in units of material. */
    warehousePerLevel: z.number().int().min(1),
    warehouseUpgradeCost: z.number().int().min(0),
    maxWarehouseLevel: z.number().int().min(1),
    /**
     * How far a material's price may drift in one week, as a share of its base.
     *
     * Small on purpose. A commodity market that swings 40% a week is a slot
     * machine, and the decision this is meant to support — "buy now or wait" —
     * needs prices that move slowly enough to have a trend worth reading.
     */
    weeklyDrift: z.number().min(0).max(0.5),
    contracts: z.array(ContractSchema).min(1),
    /** How many orders sit on the desk at once. */
    openContracts: z.number().int().min(1)
  })
  .refine((c) => c.factories.every((f) => c.materials.some((m) => m.id === f.material)), {
    message: 'a factory consumes a material that does not exist'
  })
  .refine((c) => c.materials.every((m) => m.minPrice < m.basePrice && m.basePrice < m.maxPrice), {
    message: 'a material’s base price must sit inside its band'
  });
export type IndustryContent = z.infer<typeof IndustryContentSchema>;

export const industryContent: IndustryContent = IndustryContentSchema.parse({
  materials: [
    { id: 'cotton',  name: 'Baumwolle & Synthetik',   unit: 'kg', basePrice: 4.0, minPrice: 2.2, maxPrice: 7.5,  initialStock: 600 },
    { id: 'wool',    name: 'Wolle & Garn',            unit: 'kg', basePrice: 3.0, minPrice: 1.8, maxPrice: 5.5,  initialStock: 400 },
    { id: 'leather', name: 'Leder & Kautschuk',       unit: 'kg', basePrice: 6.0, minPrice: 3.5, maxPrice: 10.5, initialStock: 250 },
    { id: 'plastic', name: 'Kunststoff & Pigmente',   unit: 'kg', basePrice: 2.0, minPrice: 1.1, maxPrice: 4.2,  initialStock: 500 }
  ],
  /*
   * Every factory is priced against the wholesale cost it replaces.
   *
   * A Trikot costs €14 wholesale and about €4 in cotton at base price, so the
   * textile plant saves roughly €10 a shirt. At 60 shirts a week that is €600,
   * and €75.000 pays back in about two seasons — long enough to be a real
   * commitment for a club taking €457.000 a year at the gate, short enough that
   * it is not a joke.
   */
  factories: [
    {
      id: 'textile', name: 'Textilfabrik „Stoff & Naht"', produces: 'jersey',
      material: 'cotton', perUnit: 1.0, costs: [75_000, 55_000, 90_000],
      outputPerWeek: [90, 165, 280],
      blurb: 'Zwei Zuschneidemaschinen und eine Halle, in der es nach Klebstoff riecht.'
    },
    {
      id: 'knitting', name: 'Strickerei „Maschenwerk"', produces: 'scarf',
      material: 'wool', perUnit: 0.6, costs: [45_000, 35_000, 60_000],
      // Scarves save only €2,20 a unit, so the plant needs volume to pay back in
      // the same three seasons as the others. At 120/week it took five.
      outputPerWeek: [200, 360, 600],
      blurb: 'Vierzig Jahre alte Maschinen, die niemand ersetzen will, weil sie laufen.'
    },
    {
      id: 'leatherShop', name: 'Leder- & Ballmanufaktur', produces: 'ball',
      // Half a kilo a ball, not 1.2: at 1.2 the leather alone cost 80% of what a
      // club pays for the finished ball, and the plant took twenty-eight seasons.
      material: 'leather', perUnit: 0.5, costs: [60_000, 45_000, 75_000],
      outputPerWeek: [80, 150, 260],
      blurb: 'Handgenäht, was die Preise erklärt und den Ausschuss nicht entschuldigt.'
    },
    {
      id: 'plastics', name: 'Spritzguss- & Zubehörwerk', produces: 'cap',
      material: 'plastic', perUnit: 0.5, costs: [40_000, 30_000, 50_000],
      outputPerWeek: [150, 280, 470],
      blurb: 'Presst Kappen, Wimpel und alles andere, was eine Form hat.'
    }
  ],
  contracts: [
    { id: 'c-jersey-big',   club: 'Ein Erstligist aus dem Süden', item: 'jersey', units: 1000, payout: 11_000, expiresIn: 4 },
    { id: 'c-jersey-small', club: 'Ein Verband für ein Turnier',  item: 'jersey', units: 400,  payout: 4_400,  expiresIn: 3 },
    { id: 'c-scarf-big',    club: 'Ein Fanshop-Grosshändler',     item: 'scarf',  units: 2500, payout: 8_500,  expiresIn: 4 },
    { id: 'c-scarf-small',  club: 'Ein Zweitligist im Aufstieg',  item: 'scarf',  units: 900,  payout: 3_200,  expiresIn: 3 },
    { id: 'c-ball-big',     club: 'Ein Landesverband',            item: 'ball',   units: 700,  payout: 6_800,  expiresIn: 5 },
    { id: 'c-ball-small',   club: 'Eine Schulsport-Initiative',   item: 'ball',   units: 250,  payout: 2_500,  expiresIn: 3 },
    { id: 'c-cap-big',      club: 'Eine Sponsoring-Agentur',      item: 'cap',    units: 1500, payout: 4_800,  expiresIn: 4 },
    { id: 'c-cap-small',    club: 'Ein Stadionbetreiber',         item: 'cap',    units: 600,  payout: 2_000,  expiresIn: 3 }
  ],
  openContracts: 3,
  warehousePerLevel: 2000,
  warehouseUpgradeCost: 30_000,
  maxWarehouseLevel: 4,
  weeklyDrift: 0.07
});

export const materialById = (id: string) => industryContent.materials.find((m) => m.id === id);
export const factoryById = (id: string) => industryContent.factories.find((f) => f.id === id);
