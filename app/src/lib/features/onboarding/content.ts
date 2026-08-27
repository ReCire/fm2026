import { z } from 'zod';

/**
 * Clubs offered at the start, and the manager avatars.
 *
 * Both are content, not code: the Creative Director can add a club or restyle
 * an avatar without an engineer, and the Data Studio will edit this file
 * directly once it exists.
 */
export const StartClubSchema = z.object({
  id: z.string(),
  name: z.string(),
  short: z.string().max(4),
  city: z.string(),
  /** League level 0-3 the club sits in. Filters which narratives fit. */
  leagueLevel: z.number().int().min(0).max(3),
  /** Two hex colours for the generated crest. No image files. */
  colours: z.tuple([z.string(), z.string()]),
  /** One line of character, shown under the crest. */
  flavour: z.string()
});
export type StartClub = z.infer<typeof StartClubSchema>;

export const AvatarSchema = z.object({
  id: z.string(),
  /** Descriptive label — also the accessible name, so it must read well aloud. */
  label: z.string()
});
export type Avatar = z.infer<typeof AvatarSchema>;

export const OnboardingContentSchema = z.object({
  clubs: z.array(StartClubSchema).min(4),
  avatars: z.array(AvatarSchema).min(4),
  backgrounds: z.array(z.object({ id: z.string(), label: z.string(), blurb: z.string() })).min(2)
});
export type OnboardingContent = z.infer<typeof OnboardingContentSchema>;

export const onboardingContent: OnboardingContent = OnboardingContentSchema.parse({
  /*
   * Final roster from fm-03-design. Names, cities, levels, colours and flavour
   * are theirs and verbatim; the three-letter short codes are derived here for
   * the generated crest and are the only part open to change.
   *
   * Crest pairs were contrast-verified rather than picked by eye: lowest
   * internal pair 4.06, lowest against either background 5.18, so no crest goes
   * muddy in light or dark.
   *
   * On register: the club is NOT a joke. The parody lives in the brands, the
   * mail and LinkedOut — things done TO the player. The club is what they are
   * asked to care about for twenty seasons, so each line carries one specific
   * true-sounding detail instead of a punchline.
   */
  clubs: [
    // Liga 1
    { id: 'hafenkrone', name: 'SC Hafenkrone',      short: 'HFK', city: 'Bremerhaven',        leagueLevel: 0, colours: ['#0E3F6B', '#E8B923'], flavour: 'Seit 1904 am Wasser. Der Wind kommt immer von vorn.' },
    { id: 'marktstadt', name: 'VfB Marktstadt',     short: 'MKT', city: 'Stuttgart-Nord',     leagueLevel: 0, colours: ['#B3121A', '#F2EFE7'], flavour: 'Drei Meisterschaften, alle vor 1988. Man erinnert dich täglich daran.' },
    { id: 'steinfeld',  name: 'Borussia Steinfeld', short: 'STF', city: 'Mönchen-Steinfeld',  leagueLevel: 0, colours: ['#0B6E3A', '#F2EFE7'], flavour: 'Ein Werksverein, der sich seit vierzig Jahren als Traditionsverein bezeichnet.' },

    // Liga 2
    { id: 'ostwall',    name: '1. FC Ostwall',      short: 'OWL', city: 'Leipzig-Ost',        leagueLevel: 1, colours: ['#1D2B5C', '#C9A227'], flavour: 'Zweimal aufgestiegen, zweimal abgestiegen, einmal insolvent.' },
    { id: 'rothenbach', name: 'SV Rothenbach',      short: 'RTB', city: 'Kaiserslautern',     leagueLevel: 1, colours: ['#7A1220', '#E5DCC5'], flavour: 'Der Betzenberg ist nicht weit. Man hört ihn an guten Tagen.' },
    { id: 'kupferberg', name: 'FC Kupferberg',      short: 'KPB', city: 'Bochum-Süd',         leagueLevel: 1, colours: ['#1F6F78', '#E8D5B8'], flavour: 'Die Zeche ist zu, der Verein nicht.' },

    // Liga 3
    { id: 'lindenau',   name: 'SpVgg Lindenau',     short: 'LIN', city: 'Leipzig-Lindenau',   leagueLevel: 2, colours: ['#2E5B34', '#EFE3C2'], flavour: 'Gegründet von Setzern und Druckern. Die Kurve textet bis heute selbst.' },
    { id: 'bergheide',  name: 'TSV Bergheide',      short: 'BGH', city: 'Wuppertal',          leagueLevel: 2, colours: ['#4A2D5E', '#D9C68A'], flavour: 'Der steilste Rasen der Liga. Auswärtsteams beschweren sich seit 1961.' },
    { id: 'altesaline', name: 'SV Alte Saline',     short: 'SAL', city: 'Lüneburg',           leagueLevel: 2, colours: ['#8A4B1E', '#EDE0C8'], flavour: 'Salz, Solebäder, ein Stadion neben dem Kurpark.' },
    { id: 'deichtor',   name: 'FC Deichtor',        short: 'DTR', city: 'Emden',              leagueLevel: 2, colours: ['#123C56', '#9BC4D8'], flavour: 'Bei Sturmflut fällt das Training aus. Das steht so in der Satzung.' },

    // Liga 4
    { id: 'ziegelhuette', name: 'SC Ziegelhütte',   short: 'ZGH', city: 'Fürth-West',         leagueLevel: 3, colours: ['#5C1F2E', '#D8C9A8'], flavour: 'Vereinsheim größer als die Haupttribüne. Beides original.' },
    { id: 'grubenrand', name: 'SV Grubenrand',      short: 'GRB', city: 'Gelsenkirchen-Nord', leagueLevel: 3, colours: ['#2B4A6F', '#E3D7B8'], flavour: 'Zwölfhundert Mitglieder, achthundert davon im selben Fanclub.' },
    { id: 'auenpark',   name: 'FC Auenpark',        short: 'AUE', city: 'Magdeburg',          leagueLevel: 3, colours: ['#3E6B2A', '#EAE0C4'], flavour: 'Der Platz gehört der Stadt, der Rest gehört den Mitgliedern.' },
    { id: 'blechhalle', name: 'TSV Blechhalle',     short: 'BLH', city: 'Ingolstadt',         leagueLevel: 3, colours: ['#6B4A1E', '#E8DCC0'], flavour: 'Die Halle steht noch. Der Sponsor, der sie gebaut hat, nicht.' }
  ],
  avatars: [
    { id: 'av-01', label: 'Kurzer Bart, Trainingsjacke' },
    { id: 'av-02', label: 'Brille, Hemd, kein Lächeln' },
    { id: 'av-03', label: 'Kahl, Anzug, breite Schultern' },
    { id: 'av-04', label: 'Lange Haare, Rollkragen' },
    { id: 'av-05', label: 'Grauer Scheitel, Krawatte' },
    { id: 'av-06', label: 'Kappe, Windjacke, Klemmbrett' }
  ],
  backgrounds: [
    { id: 'spieler',        label: 'Ex-Profi',        blurb: 'Du warst selbst auf dem Platz. Die Kabine hört dir zu — der Vorstand nicht.' },
    { id: 'analyst',        label: 'Analyst',         blurb: 'Du hast Tabellen gelesen, bevor es Mode war. Zahlen lügen seltener als Scouts.' },
    { id: 'unternehmer',    label: 'Unternehmer',     blurb: 'Du hast einen Verein gekauft, weil du wusstest, wie man eine Bilanz liest.' },
    { id: 'quereinsteiger', label: 'Quereinsteiger',  blurb: 'Niemand weiß genau, warum du hier bist. Du auch nicht ganz.' }
  ]
});

export function clubById(id: string): StartClub | undefined {
  return onboardingContent.clubs.find((c) => c.id === id);
}
