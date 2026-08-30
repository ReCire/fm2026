import { z } from 'zod';

/**
 * The campus — everything the club owns that is not the pitch.
 *
 * The design brief in one line: a fourth-division side has a Vereinsheim, a
 * gravel car park and four shipping containers the team changes in, and a
 * Konzern has a campus. What sits between those two is a career.
 *
 * ┌───────────────────────────────────────────────────────────────────────┐
 * │ THE CAMPUS IS THE PROGRESS BAR. Every other surface reports progress  │
 * │ as a number — money, capacity, rank. This one reports it as a PLACE,  │
 * │ which is the only report you can take in without reading.             │
 * └───────────────────────────────────────────────────────────────────────┘
 *
 * Which is why tier 0 is never an empty plot. An empty plot reads as "not
 * built yet", a neutral fact about a game you have not played much of. Four
 * rusting containers behind a chain-link fence reads as POOR — a fact about
 * your club that you want to fix. The bottom of this ladder has to be
 * embarrassing or the top of it means nothing.
 *
 * Lives in `content/` for the same reason badges do: the campus reads across
 * every department by design, and putting it inside one feature would make
 * that feature import the rest of the game.
 */

export const CategorySchema = z.object({
  id: z.string(),
  label: z.string(),
  /** The design token this category tints with — never a raw colour. */
  accent: z.enum(['primary', 'accent', 'blue', 'danger', 'industry', 'purple']),
  note: z.string()
});
export type Category = z.infer<typeof CategorySchema>;

export const categories: Category[] = z.array(CategorySchema).parse([
  {
    id: 'play',
    label: 'Spielbetrieb',
    accent: 'primary',
    note: 'Rasen, Kabinen, alles wofür man Stollen braucht.'
  },
  {
    id: 'medical',
    label: 'Medizin & Reha',
    accent: 'danger',
    note: 'Wo die Saison gerettet wird, die du sonst verloren hättest.'
  },
  {
    id: 'performance',
    label: 'Leistung',
    accent: 'accent',
    note: 'Die letzten Prozent, die niemand auf dem Platz sieht.'
  },
  {
    id: 'intel',
    label: 'Intelligenz',
    accent: 'blue',
    note: 'Wissen, das die Konkurrenz auch haben könnte und nicht hat.'
  },
  {
    id: 'culture',
    label: 'Kultur & Fans',
    accent: 'industry',
    note: 'Der Teil des Vereins, der ohne dich weiterexistieren würde.'
  },
  {
    id: 'secrets',
    label: 'Geheimnisse',
    accent: 'purple',
    note: 'Steht in keinem Lageplan, der das Rathaus je erreicht hat.'
  }
]);

export const categoryIds = categories.map((c) => c.id);

/** Plot sizes, in grid tiles. A building only fits a plot of its own size. */
export const PLOT_SIZES = {
  klein: { w: 2, d: 2 },
  mittel: { w: 3, d: 3 },
  gross: { w: 4, d: 4 }
} as const;
export type PlotSize = keyof typeof PLOT_SIZES;

/**
 * How a building is drawn, before it has anything to do with what it does.
 *
 * A silhouette, not a sprite. A `shed` and a `tower` differ in outline at 40px
 * on a phone, which is the only size that matters — and a campus of twenty-four
 * identical boxes at different heights is a bar chart with a fence around it.
 */
export const SHAPES = ['shed', 'hall', 'block', 'tower', 'dome', 'pitch', 'yard', 'water'] as const;
export type Shape = (typeof SHAPES)[number];

export const BuildingSchema = z.object({
  id: z.string(),
  name: z.string().min(3),
  category: z.string(),
  size: z.enum(['klein', 'mittel', 'gross']),
  shape: z.enum(SHAPES),
  /** Height in LIFT units at each level, 0-indexed. Level 0 is the sad version. */
  heights: z.array(z.number().min(0)).min(2),
  /** Build cost, then the cost of each upgrade. */
  costs: z.array(z.number().int().min(0)).min(1),
  /**
   * What it does, per level, in the player's words.
   *
   * One line per level and it must CHANGE — an upgrade whose description is
   * the previous description with a bigger number attached is an upgrade the
   * player has no reason to picture. If the only difference is the number, the
   * level should not exist.
   */
  levels: z.array(z.string().min(12)).min(2),
  /**
   * The module whose mechanic this feeds, when there is one.
   *
   * Named so the effect has somewhere to land. A building with no module is a
   * building with no effect, which the gate below refuses to sell.
   */
  module: z.string().optional(),
  /** Requires this doctrine at this rank before it can be built at all. */
  doctrine: z.object({ id: z.string(), rank: z.number().int().positive() }).optional()
});
export type Building = z.infer<typeof BuildingSchema>;

export const buildings: Building[] = z.array(BuildingSchema).parse([
  // ───────────────────────────────────────────────────────── Spielbetrieb ──
  {
    id: 'kabinen',
    name: 'Kabinentrakt',
    category: 'play',
    size: 'klein',
    shape: 'shed',
    module: 'squad',
    heights: [0.9, 1.6, 2.4],
    costs: [0, 180_000, 620_000],
    levels: [
      'Vier Seecontainer und ein Schlauch für die Fußwäsche. Der Gegner zieht sich im Bus um.',
      'Gemauert, geheizt, mit einer Tür die schließt. Die Liga hat nichts mehr zu beanstanden.',
      'Einzelspind, Kaltbecken, ein Raum in dem der Trainer laut werden kann ohne dass es die Kurve hört.'
    ]
  },
  {
    id: 'trainingsplatz',
    name: 'Trainingsplatz',
    category: 'play',
    size: 'mittel',
    shape: 'pitch',
    module: 'training',
    heights: [0, 0, 0],
    costs: [0, 340_000, 1_100_000],
    levels: [
      'Ein Acker neben dem Stadion. Ab November wird links außen nicht mehr trainiert.',
      'Drainage und ein zweiter Platz, damit der erste den Winter übersteht.',
      'Hybridrasen mit Heizung. Es gibt keinen Grund mehr, eine Einheit ausfallen zu lassen.'
    ]
  },
  {
    id: 'jugendplatz',
    name: 'Jugendplätze',
    category: 'play',
    size: 'gross',
    shape: 'pitch',
    module: 'youth',
    heights: [0, 0, 0, 0],
    costs: [0, 260_000, 780_000, 2_400_000],
    levels: [
      'Ein Bolzplatz mit einem Tor ohne Netz. Es kommen trotzdem vierzig Kinder.',
      'Zwei Plätze, Flutlicht, feste Trainingszeiten. Jetzt kommen auch die Eltern.',
      'Vier Plätze und eine Halle. Andere Vereine fragen, ob sie mitbenutzen dürfen.',
      'Ein Leistungszentrum mit Zertifikat. Die Kinder kommen jetzt aus dem ganzen Bundesland.'
    ]
  },
  {
    id: 'mini_arena',
    name: 'Mini-Arena',
    category: 'play',
    size: 'mittel',
    shape: 'hall',
    module: 'youth',
    heights: [2.2, 3.2],
    costs: [1_600_000, 4_800_000],
    levels: [
      'Zweitausend Plätze für die U19 und den Frauenfußball, damit das große Haus geschont wird.',
      'Überdacht und vermietbar. An spielfreien Wochenenden zahlt sie sich selbst ab.'
    ]
  },

  // ────────────────────────────────────────────────────── Medizin & Reha ──
  {
    id: 'physio',
    name: 'Physiotherapie',
    category: 'medical',
    size: 'klein',
    shape: 'shed',
    module: 'staff',
    heights: [1.0, 1.7, 2.3],
    costs: [0, 210_000, 690_000],
    levels: [
      'Eine Liege im Geräteraum. Der Physio kommt dienstags und donnerstags.',
      'Zwei Behandlungsräume und jemand, der jeden Tag da ist.',
      'Eigene Abteilung. Ein Muskelfaserriss kostet jetzt zwei Wochen statt fünf.'
    ]
  },
  {
    id: 'reha',
    name: 'Reha-Zentrum',
    category: 'medical',
    size: 'mittel',
    shape: 'block',
    module: 'staff',
    heights: [1.8, 2.6],
    costs: [1_400_000, 3_900_000],
    levels: [
      'Kraftraum, Laufband, ein Plan für jeden der ausfällt.',
      'Anti-Schwerkraft-Laufband und Unterwassertherapie. Kreuzbandrisse enden hier nicht mehr die Karriere.'
    ]
  },
  {
    id: 'hydro',
    name: 'Hydrotherapie',
    category: 'medical',
    size: 'klein',
    shape: 'water',
    module: 'training',
    heights: [0.3, 0.5],
    costs: [820_000, 2_100_000],
    levels: [
      'Zwei Becken, warm und sehr kalt. Die Spieler hassen das zweite.',
      'Strömungskanal und Kältekammer. Am Montag ist niemand mehr steif.'
    ]
  },
  {
    id: 'klinik',
    name: 'Vereinsklinik',
    category: 'medical',
    size: 'gross',
    shape: 'block',
    module: 'staff',
    heights: [2.6, 3.6],
    costs: [5_200_000, 12_000_000],
    levels: [
      'Eigene Ärzte, eigenes MRT, keine Wartezeit. Die Diagnose kommt am selben Abend.',
      'Auch für Nicht-Sportler geöffnet. Die Klinik verdient mehr als der Fanshop.'
    ]
  },

  // ─────────────────────────────────────────────────────────────Leistung ──
  {
    id: 'kraftraum',
    name: 'Kraftraum',
    category: 'performance',
    size: 'klein',
    shape: 'shed',
    module: 'training',
    heights: [0.9, 1.5, 2.1],
    costs: [0, 160_000, 540_000],
    levels: [
      'Hanteln aus den Neunzigern in einem Kellerraum ohne Fenster.',
      'Ordentliche Geräte, ein Athletiktrainer, ein Plan pro Position.',
      'Kraftdiagnostik und Lastensteuerung. Niemand trainiert mehr ins Leere.'
    ]
  },
  {
    id: 'ernaehrung',
    name: 'Ernährung',
    category: 'performance',
    size: 'klein',
    shape: 'shed',
    module: 'squad',
    heights: [0.8, 1.4],
    costs: [420_000, 1_300_000],
    levels: [
      'Eine Küche, die weiß was ein Kohlenhydratfenster ist.',
      'Blutwerte, Einzelpläne, ein Koch der mitfährt. Der Kader ist im Mai so fit wie im August.'
    ]
  },
  {
    id: 'sportwissenschaft',
    name: 'Sportwissenschaft',
    category: 'performance',
    size: 'mittel',
    shape: 'block',
    module: 'training',
    heights: [1.9, 2.7],
    costs: [2_600_000, 6_400_000],
    levels: [
      'GPS-Westen und jemand, der die Daten am Abend tatsächlich anschaut.',
      'Eigenes Labor. Belastungssteuerung pro Spieler, pro Woche, pro Muskelgruppe.'
    ],
    doctrine: { id: 'data', rank: 4 }
  },
  {
    id: 'hoehenkammer',
    name: 'Höhenkammer',
    category: 'performance',
    size: 'klein',
    shape: 'dome',
    module: 'training',
    heights: [1.4, 2.0],
    costs: [3_100_000, 7_200_000],
    levels: [
      'Ein Raum auf 2.400 Metern, mitten im Flachland.',
      'Schlafkammern für den ganzen Kader. Die letzten zwanzig Minuten gehören jetzt euch.'
    ],
    doctrine: { id: 'psyche', rank: 5 }
  },

  // ──────────────────────────────────────────────────────────Intelligenz ──
  {
    id: 'scouting',
    name: 'Scouting-Zentrale',
    category: 'intel',
    size: 'mittel',
    shape: 'block',
    module: 'transfer',
    heights: [1.6, 2.3, 3.0],
    costs: [0, 480_000, 1_900_000],
    levels: [
      'Ein Rentner mit einem Notizbuch, der jedes Wochenende irgendwo an einer Bande steht.',
      'Fünf Späher, eine Datenbank, ein Budget für Reisekosten.',
      'Ein Netz über drei Kontinente. Ihr wisst von dem Jungen, bevor sein Verein es weiß.'
    ]
  },
  {
    id: 'taktikraum',
    name: 'Taktikraum',
    category: 'intel',
    size: 'klein',
    shape: 'shed',
    module: 'matchday',
    heights: [1.0, 1.6],
    costs: [260_000, 940_000],
    levels: [
      'Beamer, Magnettafel, ein Raum in dem alle gleichzeitig sitzen können.',
      'Videowand und Einzelclips für jeden Spieler. Die Halbzeitansprache hat jetzt Belege.'
    ]
  },
  {
    id: 'datenzentrum',
    name: 'Datenzentrum',
    category: 'intel',
    size: 'gross',
    shape: 'tower',
    module: 'knowledge',
    heights: [2.4, 3.4, 4.4],
    costs: [4_800_000, 11_000_000, 26_000_000],
    levels: [
      'Ein Serverschrank im Keller und eine Klimaanlage, die zu laut ist.',
      'Eigene Rechenzeit. Modelle laufen über Nacht statt über die Winterpause.',
      'Ein Rechenzentrum, das andere Vereine mieten. Ihr verkauft ihnen Erkenntnisse über sich selbst.'
    ],
    doctrine: { id: 'data', rank: 7 }
  },
  {
    id: 'videoanalyse',
    name: 'Videoanalyse',
    category: 'intel',
    size: 'klein',
    shape: 'shed',
    module: 'matchday',
    heights: [0.9, 1.5],
    costs: [180_000, 720_000],
    levels: [
      'Eine Kamera auf einem Gerüst und ein Praktikant, der schneidet.',
      'Vier Kameras, automatisches Tracking, jeder Gegner ist am Donnerstag zerlegt.'
    ]
  },

  // ───────────────────────────────────────────────────────Kultur & Fans ──
  {
    id: 'vereinsheim',
    name: 'Vereinsheim',
    category: 'culture',
    size: 'klein',
    shape: 'shed',
    module: 'stadium',
    heights: [1.0, 1.7, 2.4],
    costs: [0, 140_000, 560_000],
    levels: [
      'Eine Gaststätte mit acht Tischen, in der seit 1974 dieselben vier Männer sitzen.',
      'Umgebaut, mit Terrasse. Jetzt kommen auch Leute, die kein Auswärtsspiel verpasst haben.',
      'Restaurant mit Blick ins Stadion. Unter der Woche ausgebucht, ohne dass Fußball gespielt wird.'
    ]
  },
  {
    id: 'fanzone',
    name: 'Fanzone',
    category: 'culture',
    size: 'mittel',
    shape: 'yard',
    module: 'merch',
    heights: [0, 0.4],
    costs: [380_000, 1_200_000],
    levels: [
      'Ein Bierwagen und zwei Stehtische auf dem Schotter vor dem Nordtor.',
      'Gepflastert, überdacht, mit Bühne. Die Leute kommen zwei Stunden früher und geben Geld aus.'
    ]
  },
  {
    id: 'museum',
    name: 'Vereinsmuseum',
    category: 'culture',
    size: 'klein',
    shape: 'block',
    module: 'history',
    heights: [1.3, 1.9],
    costs: [640_000, 2_200_000],
    levels: [
      'Eine Vitrine im Foyer mit drei Pokalen und einem sehr alten Trikot.',
      'Zwei Etagen mit Führungen. Auswärtsfans buchen sie, was niemand erwartet hätte.'
    ]
  },
  {
    id: 'merchfabrik',
    name: 'Merch-Fabrik',
    category: 'culture',
    size: 'gross',
    shape: 'hall',
    module: 'merch',
    heights: [1.8, 2.6, 3.4],
    costs: [1_900_000, 5_400_000, 14_000_000],
    levels: [
      'Eine Halle mit zwei Druckmaschinen. Die Schals kommen wieder aus Portugal.',
      'Eigene Fertigung. Was am Dienstag entworfen wird, liegt am Samstag im Regal.',
      'Ihr produziert für andere Vereine mit. Deren Trikot trägt euren Aufdruck auf der Innenseite.'
    ],
    doctrine: { id: 'industry', rank: 5 }
  },
  {
    id: 'wohnheim',
    name: 'Internat',
    category: 'culture',
    size: 'mittel',
    shape: 'block',
    module: 'youth',
    heights: [1.7, 2.5],
    costs: [1_500_000, 4_100_000],
    levels: [
      'Zwölf Zimmer über dem Vereinsheim und eine Hausmutter.',
      'Eigenes Gebäude mit Schule im Haus. Ein Sechzehnjähriger aus Portugal kann jetzt hier wohnen.'
    ]
  },

  // ────────────────────────────────────────────────────────Geheimnisse ──
  {
    id: 'hackerlab',
    name: 'Hacker-Lab',
    category: 'secrets',
    size: 'klein',
    shape: 'block',
    module: 'knowledge',
    heights: [1.2, 1.8],
    costs: [3_400_000, 8_600_000],
    levels: [
      'Ein Raum ohne Fenster, dessen Stromrechnung über die Platzpflege läuft.',
      'Die Aufstellung des Gegners liegt am Freitag auf dem Tisch. Niemand fragt woher.'
    ],
    doctrine: { id: 'shadow', rank: 6 }
  },
  {
    id: 'privatklinik',
    name: 'Privatklinik',
    category: 'secrets',
    size: 'mittel',
    shape: 'block',
    module: 'staff',
    heights: [1.8, 2.4],
    costs: [5_600_000, 13_000_000],
    levels: [
      'Ein Flügel der Klinik ohne Schild an der Tür und ohne Eintrag im Belegungsplan.',
      'Behandlungen, die der Verband weder verboten noch erlaubt hat, weil er nichts davon weiß.'
    ],
    doctrine: { id: 'shadow', rank: 8 }
  },
  {
    id: 'tresorraum',
    name: 'Tresorraum',
    category: 'secrets',
    size: 'klein',
    shape: 'block',
    module: 'finance',
    heights: [0.8, 1.2],
    costs: [8_200_000, 19_000_000],
    levels: [
      'Ein Raum unter der Haupttribüne, der auf keinem Bauplan steht.',
      'Vier Gesellschaften auf drei Inseln. Die Prüfung des Verbandes findet nichts, weil nichts hier ist.'
    ],
    doctrine: { id: 'shadow', rank: 10 }
  },
  {
    id: 'bunker',
    name: 'Bunker',
    category: 'secrets',
    size: 'mittel',
    shape: 'dome',
    module: 'knowledge',
    heights: [0.6, 0.9],
    costs: [7_400_000, 16_000_000],
    levels: [
      'Aus dem Krieg, unter der Südkurve, seit achtzig Jahren zugemauert.',
      'Wieder geöffnet. Was dort besprochen wird, verlässt den Raum nicht.'
    ],
    doctrine: { id: 'politics', rank: 8 }
  }
]);

export const buildingById: ReadonlyMap<string, Building> = new Map(buildings.map((b) => [b.id, b]));

/** Buildings that cost nothing to start are what a club HAS, not what it buys. */
export function isFounding(b: Building): boolean {
  return b.costs[0] === 0;
}

/**
 * What can be built in the game as it is currently assembled.
 *
 * Same gate as badges and LinkedOut roles, for the fourth time and the same
 * reason: a building whose module is absent has nowhere to put its effect, so
 * selling it would take real money for a number that lands nowhere. Derived
 * from the registry rather than written down, so it opens the day its feature
 * lands.
 */
export function buildable(registeredModules: ReadonlySet<string>): Building[] {
  return buildings.filter((b) => !b.module || registeredModules.has(b.module));
}

export function totalCost(b: Building, level: number): number {
  return b.costs.slice(0, level + 1).reduce((sum, c) => sum + c, 0);
}
