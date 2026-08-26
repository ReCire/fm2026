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
    { id: 'vflmagd',    name: 'VfL Magdeburg-Nord',   short: 'VFM', city: 'Magdeburg',  leagueLevel: 1, colours: ['#1E6E78', '#F2F0EA'], flavour: 'Einmal fast oben gewesen. Das reicht für zwanzig Jahre Erwartung.' }
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
