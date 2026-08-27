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
  clubs: [
    { id: 'anstoss',    name: 'FC Anstoß Pro',        short: 'ANS', city: 'Bochum',     leagueLevel: 3, colours: ['#1B7F4B', '#F2F0EA'], flavour: 'Der Klub, der schon immer da war.' },
    { id: 'fortuna95',  name: 'SC Fortuna 95',        short: 'F95', city: 'Düsseldorf', leagueLevel: 2, colours: ['#C4342E', '#F2F0EA'], flavour: 'Zwei Aufstiege, drei Abstiege, ein Stadion voller Geduld.' },
    { id: 'blauweiss',  name: 'Blau-Weiß Oberhausen', short: 'BWO', city: 'Oberhausen', leagueLevel: 3, colours: ['#2B5D9E', '#F2F0EA'], flavour: 'Mehr Tradition als Budget.' },
    { id: 'sgwacker',   name: 'SG Wacker Halle',      short: 'SGW', city: 'Halle',      leagueLevel: 3, colours: ['#4A4A48', '#D8B14A'], flavour: 'Ein Verein, der sich selbst im Weg steht.' },
    { id: 'eintracht',  name: 'Eintracht Kaltenkirchen', short: 'EKA', city: 'Kaltenkirchen', leagueLevel: 3, colours: ['#7A3E8F', '#F2F0EA'], flavour: 'Sechshundert Zuschauer, davon fünfzig laut.' },
    { id: 'vflmagd',    name: 'VfL Magdeburg-Nord',   short: 'VFM', city: 'Magdeburg',  leagueLevel: 1, colours: ['#1E6E78', '#F2F0EA'], flavour: 'Einmal fast oben gewesen. Das reicht für zwanzig Jahre Erwartung.' },

    /*
     * PLACEHOLDER NAMES — fm-03-design to replace.
     *
     * Added because a narrative offering one club is not a choice, and the test
     * in rules.test.ts requires at least three per starting story. The league
     * levels and the count are load-bearing; the names, cities, colours and
     * flavour lines are not, and are written to be overwritten.
     */
    { id: 'hansekap',   name: 'FC Hanse Nordkap',     short: 'FHN', city: 'Kiel',       leagueLevel: 0, colours: ['#123C63', '#F2F0EA'], flavour: 'Vier Titel, alle vor 1981.' },
    { id: 'rheinturm',  name: 'Rheinturm 04',         short: 'RT04', city: 'Köln',      leagueLevel: 0, colours: ['#8C2F39', '#F2F0EA'], flavour: 'Der teuerste Kader der Liga und der drittbeste.' },
    { id: 'bergedorf',  name: 'SV Alemannia Bergedorf', short: 'SVA', city: 'Hamburg',  leagueLevel: 0, colours: ['#2F6B45', '#F2F0EA'], flavour: 'Seit dem Aufstieg fragt niemand mehr, wie lange das gutgeht.' },
    { id: 'glueckauf',  name: 'Glückauf Wanne',       short: 'GAW', city: 'Herne',      leagueLevel: 1, colours: ['#4A3B2A', '#D8B14A'], flavour: 'Die Zeche ist zu, der Verein nicht.' },
    { id: 'weserau',    name: 'TSV Weserau',          short: 'TWA', city: 'Bremen',     leagueLevel: 1, colours: ['#1E6E78', '#D8B14A'], flavour: 'Zweimal knapp gescheitert, einmal knapp gerettet.' },
    { id: 'donaustadt', name: 'SpVgg Donaustadt',     short: 'DON', city: 'Regensburg', leagueLevel: 2, colours: ['#5B4B8A', '#F2F0EA'], flavour: 'Ein Sponsor, der Fenster verkauft, und große Pläne.' },
    { id: 'lohmuehle',  name: 'FC Lohmühle',          short: 'FLM', city: 'Lübeck',     leagueLevel: 2, colours: ['#3F7A54', '#F2F0EA'], flavour: 'Ein Stadion am Wald und ein Vorstand mit Prinzipien.' }
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
