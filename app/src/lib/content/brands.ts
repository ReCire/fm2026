import { z } from 'zod';

/**
 * The parody layer — every brand the club ever deals with.
 *
 * Lives outside `features/` because sponsors, merch, the inbox and the press
 * all draw from the same well, and a joke that only one screen knows about is
 * a joke the player meets once. A brand should recur: the same beer sponsors
 * you, advertises in your programme, and eventually complains about your
 * league position, and it is the recurrence that makes the world feel run by
 * somebody.
 *
 * The rule for a name here: it has to be recognisable in under a second and
 * deniable in court. "Adi#" reads as one specific company; "SportCorp" reads
 * as filler. The tagline does the second half of the work — it is where the
 * joke actually is, because a misspelt logo is a pun and a mission statement
 * is a character.
 */

export const BrandSchema = z.object({
  name: z.string().min(2),
  /** The slogan, which is where the joke lives. Never longer than a line. */
  tagline: z.string().min(4),
  /**
   * How big a name this is: 3 national, 2 regional, 1 the shop on the corner.
   *
   * This is what stops the parody flattening. A fourth-division club whose
   * kit deal is with Bäckerei Schmitz — "Brötchen seit 1904" — is telling you
   * where you are far more precisely than a number on a balance sheet, and the
   * day Adi# calls is a promotion you can feel.
   */
  tier: z.union([z.literal(1), z.literal(2), z.literal(3)])
});
export type Brand = z.infer<typeof BrandSchema>;

export const BrandCategorySchema = z.enum([
  'kit',
  'drink',
  'bet',
  'finance',
  'tech',
  'retail',
  'auto',
  'media',
  'poodle',
  'travel'
]);
export type BrandCategory = z.infer<typeof BrandCategorySchema>;

export const brands: Record<BrandCategory, Brand[]> = z
  .record(BrandCategorySchema, z.array(BrandSchema).min(3))
  .parse({
  // Trikotausrüster
  kit: [
    { name: 'Adi#', tagline: 'Drei Streifen, eine Raute, keine Lizenz', tier: 3 },
    { name: 'Pumor', tagline: 'Katzenartig. Angeblich.', tier: 3 },
    { name: 'Swooshi', tagline: 'Just Do It Später', tier: 3 },
    { name: 'Jakko', tagline: 'Der Ausrüster für die 4. Liga', tier: 1 },
    { name: 'Hummul', tagline: 'Dänisch, hummelig, günstig', tier: 1 },
    { name: 'Kappaa', tagline: 'Zwei Leute sitzen Rücken an Rücken', tier: 2 },
    { name: 'Under Armoire', tagline: 'Sportkleidung im Kleiderschrank', tier: 2 },
    { name: 'Umbra', tagline: 'Wirft lange Schatten auf deine Bilanz', tier: 2 }
  ],

  // Getränke
  drink: [
    { name: 'Roter Ochse', tagline: 'Verleiht Verbindlichkeiten', tier: 3 },
    { name: 'Monstrositäd', tagline: 'Koffein jenseits der Grenzwerte', tier: 2 },
    { name: 'Krumbacher', tagline: 'Eine Perle der Buchhaltung', tier: 2 },
    { name: 'Veltinz', tagline: 'Aus dem Sauerland, mit Nachdruck', tier: 2 },
    { name: 'Bittburgor', tagline: 'Bitte ein Bitt… oder zwei', tier: 2 },
    { name: 'Warsteiler', tagline: 'Eine Steilvorlage für sich', tier: 1 },
    { name: 'Jägermeisterschaft', tagline: 'Der Kräuterlikör mit Titelambition', tier: 3 }
  ],

  // Wettanbieter
  bet: [
    { name: 'Tippiko', tagline: 'Dein Tipp. Unser Haus.', tier: 3 },
    { name: 'Bgewinn', tagline: 'Wir gewinnen. B steht für beide.', tier: 3 },
    { name: 'Wett364', tagline: 'Einen Tag weniger als die Konkurrenz', tier: 2 },
    { name: 'Unterwetten', tagline: 'Über, unter, egal', tier: 2 },
    { name: 'Kurvenquote', tagline: 'Regional wetten, regional verlieren', tier: 1 }
  ],

  // Banken und Versicherer
  finance: [
    { name: 'Kommerzbank', tagline: 'Die Bank an Ihrer Seite. Meistens.', tier: 3 },
    { name: 'Sparkasten', tagline: 'Gut. Für Ihren Verein. Angeblich.', tier: 2 },
    { name: 'Allianzz', tagline: 'Hoffentlich Allianzz versichert', tier: 3 },
    { name: 'Spardose', tagline: 'Ihre Genossenschaft vor Ort', tier: 1 },
    { name: 'Volxbank', tagline: 'Wir machen den Weg frei. Gegen Gebühr.', tier: 2 }
  ],

  // Technologie
  tech: [
    { name: 'Telekombinat', tagline: 'Netz ist da, wo wir sind', tier: 3 },
    { name: 'Wodafon', tagline: 'Empfang im Stadion ab 2031', tier: 3 },
    { name: 'SAFT', tagline: 'Enterprise-Software aus Walldorf-ish', tier: 3 },
    { name: 'Siemenz', tagline: 'Ingenieurskunst mit Z', tier: 2 },
    { name: 'KryptoKick', tagline: 'Fan-Token. Bitte lesen Sie das Kleingedruckte.', tier: 2 },
    { name: 'PC-Spezi Grabowski', tagline: 'Vor-Ort-Service, meistens dienstags', tier: 1 }
  ],

  // Handel
  retail: [
    { name: 'Liddl', tagline: 'Lidl lohnt sich… fast', tier: 2 },
    { name: 'Oldi Süd', tagline: 'Einfach ist das Beste. Angeblich.', tier: 2 },
    { name: 'Rewä', tagline: 'Dein Markt. Dein Trikot.', tier: 2 },
    { name: 'Edeko', tagline: 'Wir lieben Lebensmittel und Ablösen', tier: 2 },
    { name: 'Media Marx', tagline: 'Ich bin doch nicht blöd — ich bin Genosse', tier: 2 },
    { name: 'Bäckerei Schmitz', tagline: 'Brötchen seit 1904', tier: 1 }
  ],

  // Automobil
  auto: [
    { name: 'Opul', tagline: 'Wir leben Autos. Leasing bevorzugt.', tier: 2 },
    { name: 'Mercedas', tagline: 'Das Beste oder gar nichts', tier: 3 },
    { name: 'Audo', tagline: 'Vorsprung durch Sponsoring', tier: 3 },
    { name: 'VuW', tagline: 'Das Auto. Der Verein. Der Skandal.', tier: 3 },
    { name: 'Autohaus Möller', tagline: 'Ihr Partner für Dienstwagen', tier: 1 }
  ],

  // Medien
  media: [
    { name: 'BLÖD', tagline: 'Die Schlagzeile weiß es besser', tier: 3 },
    { name: 'Knicker', tagline: 'Das Fachblatt mit den Noten', tier: 3 },
    { name: 'Wolke7', tagline: 'Fußball ist unser Abo-Modell', tier: 3 },
    { name: 'GÄHN', tagline: 'Streaming. Angeblich in HD.', tier: 3 },
    { name: 'Sport0', tagline: 'Doppelpass am Sonntag', tier: 2 },
    { name: 'Rühr-Nachrichten', tagline: 'Lokaljournalismus mit Herz', tier: 1 }
  ],

  /*
   * Poodle — der Konzern, dem der Posteingang gehört.
   *
   * Every one of these is tier 1, which looks like a mistake and is the joke.
   * Tier means "how big a name will deal with a club this size", and the
   * answer for a platform monopoly is: all of them, identically, whether you
   * are in the Kreisliga or the Bundesliga. Poodle Mehl is the manager's inbox
   * from the first minute of the fourth division. Nobody negotiates with it.
   */
  poodle: [
    { name: 'Poodle Mehl', tagline: 'Ihre Post. Unsere Auswertung.', tier: 1 },
    { name: 'Poodle Karten', tagline: 'Route zum Auswärtsspiel neu berechnet', tier: 1 },
    { name: 'Poodle Laufwerk', tagline: '15 GB frei. Ihr Kader braucht 400 MB.', tier: 1 },
    { name: 'Poodle Kalender', tagline: 'Erinnerung: Vorstandssitzung (Sie sind Thema)', tier: 1 },
    { name: 'Poodle Übersetzer', tagline: '„Ich fühle mich sehr wohl hier" (unsicher)', tier: 1 }
  ],

  // Reise
  travel: [
    { name: 'Luffthansa', tagline: 'Nonstop you. Meistens pünktlich.', tier: 3 },
    { name: 'Eurodings', tagline: 'Billig fliegen, teuer umbuchen', tier: 2 },
    { name: 'Reisebüro Kranz', tagline: 'Auswärtsfahrten seit 1978', tier: 1 }
  ]
  }) as Record<BrandCategory, Brand[]>;

/**
 * The biggest tier of name that will talk to a club at this league level.
 *
 * Indexed by league level, 0 = top flight. Levels 0 and 1 share a ceiling on
 * purpose: the 2. Bundesliga is where national brands still take your call,
 * and making the promotion to the top flight change your sponsor tier as well
 * as everything else would spend a reward the promotion has already paid.
 *
 * Whoever wires this: read the level off the modifier bus as `league.level`
 * and declare it in `consumes`. Reaching into league state directly throws now,
 * and would also make this table quietly unreachable from anywhere else.
 */
export const brandTierForLeague: readonly (1 | 2 | 3)[] = [3, 3, 2, 1];

/** Every brand that would deal with a club at this level, in one category. */
export function brandsAvailable(category: BrandCategory, leagueLevel: number): Brand[] {
  const ceiling = brandTierForLeague[leagueLevel] ?? 1;
  const pool = brands[category].filter((b) => b.tier <= ceiling);
  // Never empty: a club with no possible sponsor is a screen with no content,
  // and every category carries at least one tier-1 name for exactly this case.
  return pool.length > 0 ? pool : brands[category].filter((b) => b.tier === 1);
}
