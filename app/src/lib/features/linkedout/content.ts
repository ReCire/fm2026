import { z } from 'zod';

/**
 * LinkedOut — the professional network for people who have failed upward.
 *
 * A parody of a career network, and the surface through which the player hands
 * a department to somebody else. The joke is the vocabulary: nobody here says
 * what they do, they say what they are passionate about enabling.
 *
 * ┌───────────────────────────────────────────────────────────────────────┐
 * │ The mechanic underneath is delegation, and delegation is a TRADE, not │
 * │ a convenience. You stop being asked; you also stop deciding. A         │
 * │ mediocre executive still runs the department — badly — and you find    │
 * │ out at the balance sheet rather than in a prompt.                      │
 * └───────────────────────────────────────────────────────────────────────┘
 *
 * That is why `competence` is the interesting number and the wage is not. If
 * this surface ever sells competence as speed, or as a convenience tier, it
 * has stopped describing what the engine does with it.
 */

/* ─────────────────────────────────────────────────────────────────────────
 * Categories
 * ───────────────────────────────────────────────────────────────────────── */

/*
 * Deliberately no colour per category.
 *
 * Twelve categories would mean twelve new tokens outside the ten Wada domains,
 * and a tinted list is redundant with the filter that produced it — you have
 * already told the app which category you are looking at. Same call as the
 * cast: identity comes from the name and the face, not from a palette entry.
 */
export const CategorySchema = z.object({
  id: z.string(),
  label: z.string(),
  /** What this corner of the network is actually for, in one line. */
  note: z.string()
});
export type Category = z.infer<typeof CategorySchema>;

export const categories: Category[] = z.array(CategorySchema).parse([
  { id: 'coach', label: 'Trainer', note: 'Leute, die schon einmal eine Kabine verloren haben.' },
  { id: 'scout', label: 'Scouts', note: 'Sie kennen einen Jungen. Es gibt immer einen Jungen.' },
  { id: 'physio', label: 'Physio', note: 'Diagnose in Wochen, nicht in Sätzen.' },
  { id: 'investor', label: 'Investoren', note: 'Geduldiges Kapital, sagen sie.' },
  { id: 'pe', label: 'Private Equity', note: 'Sie kaufen nicht den Verein, nur die Zukunft.' },
  { id: 'lobby', label: 'Lobby', note: 'Wer den Bebauungsplan kennt, kennt das Stadion.' },
  { id: 'gov', label: 'Regierung', note: 'Genehmigungen dauern. Oder auch nicht.' },
  { id: 'press', label: 'Presse', note: 'Sie schreiben so oder so. Die Frage ist nur, mit wem sie geredet haben.' },
  { id: 'pr', label: 'PR', note: 'Umformulieren als Beruf.' },
  { id: 'fanclub', label: 'Fanclubs', note: 'Die Kurve verhandelt nicht, aber sie hört zu.' },
  { id: 'it', label: 'IT', note: 'Jemand muss den Server im Geräteraum kennen.' },
  { id: 'under', label: 'Unterwelt', note: 'Kein Profilbild. Keine Referenzen. Sehr gute Verfügbarkeit.' }
]);

export const categoryIds = categories.map((c) => c.id);

/* ─────────────────────────────────────────────────────────────────────────
 * Roles
 * ───────────────────────────────────────────────────────────────────────── */

export const RoleSchema = z.object({
  id: z.string(),
  /** The job title, as a career network would render it. */
  title: z.string(),
  category: z.string(),
  /** The module this person takes over. */
  module: z.string(),
  /**
   * What you stop having to do — the honest sell, in the player's terms.
   *
   * Not "handles transfers" but the actual decisions that leave your desk.
   * This is the line that has to be true, because it is the promise the wage
   * is being charged against.
   */
  takesOver: z.string()
});
export type Role = z.infer<typeof RoleSchema>;

export const roles: Role[] = z.array(RoleSchema).parse([
  {
    id: 'sportdirektion',
    title: 'Sportdirektion',
    category: 'coach',
    module: 'transfer',
    takesOver: 'Angebote annehmen oder ablehnen, nachverhandeln, Spieler auf die Liste setzen.'
  },
  {
    id: 'vertragswesen',
    title: 'Vertragswesen',
    category: 'gov',
    module: 'contracts',
    takesOver: 'Verlängerungen anbieten, Handgelder aushandeln, auslaufende Verträge im Blick behalten.'
  },
  {
    id: 'nachwuchsleitung',
    title: 'Leitung Nachwuchs',
    category: 'scout',
    module: 'youth',
    takesOver: 'Talente sichten, die Akademie ausbauen, entscheiden wer nachrückt.'
  },
  {
    id: 'athletik',
    title: 'Athletik & Reha',
    category: 'physio',
    module: 'training',
    takesOver: 'Trainingsschwerpunkt und Intensität setzen, Belastung nach Verletzungen steuern.'
  },
  {
    id: 'kaufmaennisch',
    title: 'Kaufmännische Leitung',
    category: 'investor',
    module: 'finance',
    takesOver: 'Kredite aufnehmen und tilgen, Liquidität überwachen, den Vorstand beruhigen.'
  },
  {
    id: 'partner',
    title: 'Sponsoring & Partner',
    category: 'pe',
    module: 'sponsors',
    takesOver: 'Angebote prüfen, Hauptsponsor verhandeln, Anschlussverträge einfädeln.'
  },
  {
    id: 'merchandising',
    title: 'Leitung Merchandising',
    category: 'pr',
    module: 'merch',
    takesOver: 'Preise setzen, nachbestellen, entscheiden was im Regal liegt.'
  },
  {
    id: 'stadionmanagement',
    title: 'Stadionmanagement',
    category: 'lobby',
    module: 'stadium',
    takesOver: 'Ausbaustufen freigeben, Ticketpreise festlegen, Komfort nachrüsten.'
  },
  {
    id: 'personalleitung',
    title: 'Personalleitung',
    category: 'pr',
    module: 'staff',
    takesOver: 'Fachkräfte einstellen und entlassen, das Gehaltsgefüge im Stab halten.'
  }
]);

export const roleById: ReadonlyMap<string, Role> = new Map(roles.map((r) => [r.id, r]));

/**
 * Which roles can actually be hired in the game as it is built today.
 *
 * A department is delegable only if its module declares an `autopilot`. This is
 * not tidiness — it is the difference between hiring someone and switching a
 * department off.
 *
 * `clock.ts` runs a delegated module's autopilot INSTEAD of its normal hook,
 * and falls back to the normal hook when there is no autopilot. Meanwhile
 * `isSilenced` hides the department's open items from the player either way.
 * So delegating a department with no autopilot buys you: a wage, a silent nav
 * entry, and offers that expire unanswered because the player can no longer
 * see them and nobody replaced them. You would be paying to make the club
 * worse, invisibly, which is the exact failure this project keeps shipping.
 *
 * Derived from the registry rather than written down, so a role becomes
 * hireable the day its autopilot lands and nobody has to remember to come back.
 */
export function hireableRoles(modulesWithAutopilot: ReadonlySet<string>): Role[] {
  return roles.filter((r) => modulesWithAutopilot.has(r.module));
}

/** Roles whose department exists but cannot yet be handed over. */
export function pendingRoles(
  registeredModules: ReadonlySet<string>,
  modulesWithAutopilot: ReadonlySet<string>
): Role[] {
  return roles.filter((r) => registeredModules.has(r.module) && !modulesWithAutopilot.has(r.module));
}

/* ─────────────────────────────────────────────────────────────────────────
 * Competence
 * ───────────────────────────────────────────────────────────────────────── */

/**
 * Competence bands, and what each one honestly means.
 *
 * `mark` exists because a bar alone puts the whole judgement in length and
 * colour. A glyph plus a word survives greyscale and reads at a glance, which
 * is the point of a band: you are not comparing 71 against 68, you are deciding
 * whether to let this person near your transfer budget.
 *
 * The descriptions are the honest version of the trade. None of them say
 * "slower". A weak executive is not a slow executive — they decide everything,
 * on time, and some of it is wrong.
 */
export const BandSchema = z.object({
  id: z.enum(['thin', 'solid', 'strong']),
  from: z.number().int().min(0).max(100),
  label: z.string(),
  mark: z.string(),
  means: z.string()
});
export type Band = z.infer<typeof BandSchema>;

export const bands: Band[] = z.array(BandSchema).parse([
  {
    id: 'strong',
    from: 78,
    label: 'Stark',
    mark: '▲',
    means: 'Entscheidet ungefähr so, wie du es getan hättest. Manchmal besser.'
  },
  {
    id: 'solid',
    from: 58,
    label: 'Solide',
    mark: '■',
    means: 'Trifft vernünftige Entscheidungen und gelegentlich eine, die dich ärgert.'
  },
  {
    id: 'thin',
    from: 0,
    label: 'Dünn',
    mark: '▼',
    means: 'Erledigt alles pünktlich. Ob es richtig war, siehst du in der Bilanz.'
  }
]);

/** `competence` is 0..1 on the engine side; this takes the percentage. */
export function bandFor(competencePercent: number): Band {
  return bands.find((b) => competencePercent >= b.from) ?? bands[bands.length - 1]!;
}

/* ─────────────────────────────────────────────────────────────────────────
 * People
 * ───────────────────────────────────────────────────────────────────────── */

/**
 * Self-descriptions in the dialect of a career network: a great deal of
 * assertion, no content. The joke is the vocabulary, not a punchline — each of
 * these should be something you could plausibly read on a real profile, which
 * is what makes them funny rather than a parody of being funny.
 */
export const blurbs: string[] = [
  'Ergebnisorientierter Möglichmacher mit Leidenschaft für Prozesse.',
  '15 Jahre Erfahrung, davon 14 im selben Verein, davon 11 im selben Büro.',
  'Spezialisiert auf Strukturen, die vorher niemand vermisst hat.',
  'Denkt in Systemen. Spricht in Quartalen.',
  'Führt Menschen, Zahlen und gelegentlich Selbstgespräche.',
  'Bringt frischen Wind. Fragen Sie nicht, aus welcher Richtung.',
  'Hands-on-Mentalität, Hands-off-Verantwortung.',
  'Hat schon zwei Vereine saniert. Beide existieren noch.',
  'Versteht Fußball als Wertschöpfungskette mit Rasenanteil.',
  'Kommunikationsstark, konfliktfähig, kurzfristig verfügbar.',
  'Sucht neue Herausforderung. Die alte hat gekündigt.',
  'Zertifiziert in agiler Vereinsführung (Wochenendkurs).',
  'Hat den Turnaround begleitet. Nicht verursacht, begleitet.',
  'Denkt vom Fan her. Rechnet vom Sponsor her.'
];

export const firstNames: string[] = [
  'Klaus', 'Marion', 'Thomas', 'Sabine', 'Kevin-Pascal', 'Ute', 'Detlef', 'Nadine',
  'Ralf', 'Beatrix', 'Hendrik', 'Jasmin', 'Wolfgang', 'Carla', 'Sven', 'Petra',
  'Ahmet', 'Lena', 'Bernd', 'Katja'
];

export const lastNames: string[] = [
  'Berger', 'Santos', 'Müller-Schmidt', 'Reinhardt', 'Özdemir', 'Voss', 'Kowalski',
  'Brandt', 'Neuhaus', 'Falkenberg', 'Wiedemann', 'Sorge', 'Grünwald', 'Lipinski',
  'Achterberg', 'Marquardt'
];

/**
 * How good the field gets, by league level (0 = top flight).
 *
 * Nobody applies to a Regionalliga club with a 90. The ceiling is the reason
 * climbing changes who takes your call, and it is the same idea as the brand
 * tiers — the world should tell you where you are without a number saying so.
 */
export const competenceCeiling: readonly number[] = [95, 88, 78, 70];

export const linkedoutContent = {
  /** Contacts drawn per refresh, before the locked profile. */
  contactsPerRefresh: [5, 7] as const,
  /**
   * Matchdays before the field turns over.
   *
   * Three, because the pool has to feel like it is moving without the player
   * having to check it weekly. A list that never refreshes is a menu and a
   * menu has no moment in it; one that refreshes every week is a slot machine
   * and punishes looking away.
   */
  refreshEvery: 4,
  /**
   * Wage from competence, imperfectly, and the imperfection is the decision.
   *
   * A perfectly priced market has no bargains and no traps, so hiring becomes
   * arithmetic rather than judgement. The noise is what leaves room for a good
   * call and a bad one, and it overlaps the bands on purpose: a weak executive
   * can cost more than a strong one is worth.
   *
   * The curve was 0.9 — the prototype's, carried over without checking it
   * against this economy. That priced a competent executive at €221.000 a
   * season against a ceiling of about €30.000, so nobody would ever have hired
   * one and the whole department would have been dead on arrival. Same mistake
   * as the knowledge tree's costs, one week later.
   *
   * At 0.055 a strong executive is roughly €17.000 a season and a weak one
   * €5.000 — a clear minority of what delegation actually costs you, which is
   * the decisions themselves.
   *
   * `noise` is 300 rather than 150 because at 150 the bands did not overlap:
   * a competence-45 executive was ALWAYS cheaper than a competence-80 one, so
   * the wage predicted the competence perfectly and hiring collapsed into
   * "buy the dearest one you can afford". A market needs a bargain and a trap
   * in it or it is a price list.
   */
  wageFromCompetence: { curve: 0.055, noise: 300, step: 10 },
  /**
   * One locked profile per refresh, behind "LinkedOut Premium".
   *
   * The satire only works if the paywall is genuinely annoying and genuinely
   * cheap to ignore: it shows a better candidate than anything on the page,
   * blurs the name, and offers nothing else. Premium buys visibility, never
   * ability — the moment it sells competence it stops being a joke about
   * career networks and becomes one.
   */
  premium: { competenceBonus: 22, wageMultiplier: 2.4, ceiling: 97 }
} as const;

export const copy = {
  title: 'LinkedOut',
  tagline: 'Das Netzwerk für Menschen mit Verantwortung für andere.',
  /** Shown above the hired list when it is empty. */
  emptyTeam:
    'Noch niemand eingestellt. Wer eine Abteilung übergibt, bekommt ihre Vorgänge nicht mehr in den Posteingang — und lebt mit den Entscheidungen, die dort getroffen werden.',
  /** Shown on a role whose department cannot yet be handed over. */
  notDelegable:
    'Diese Abteilung kann noch niemand übernehmen. Bis dahin würdest du nur aufhören, sie zu sehen.',
  premiumPitch: 'LinkedOut Premium zeigt Ihnen, wer sich noch beworben hat.',
  premiumSmallPrint: 'Premium verbessert keine Kandidaten. Es zeigt sie nur.'
} as const;
