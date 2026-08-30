import { z } from 'zod';
import type { Player } from '$lib/features/squad/state';
import type { Position } from '$lib/features/squad/positions';
import { overallFor } from '$lib/features/squad/attributes';
import type { FxKey } from '$lib/features/knowledge/content';

/**
 * Talents — what a player BECAME, never what he was rolled as.
 *
 * `Player.trait` shipped as a spawn roll from seven strings, handed out to a
 * third of everyone at creation. That is a stat with a name on it. Eric asked
 * for talents a player "can achieve", and the word is doing all the work: a
 * talent you were given is a label, and a talent that arrived in the third
 * season, after you kept picking him, is a story you tell about him.
 *
 * ┌───────────────────────────────────────────────────────────────────────┐
 * │ Every `earn` tests a CHANGE or a DURATION, never a level.             │
 * │                                                                       │
 * │ A "Jahrhunderttalent" who is 17 and already 80 is a spawn roll wearing │
 * │ a medal. A 17-year-old who GAINED twenty-five points under you is the  │
 * │ thing the phrase actually describes. This is the badge lesson: three   │
 * │ narratives collected "Erste Million" before kicking a ball, because    │
 * │ the test asked what was true rather than what had happened.            │
 * └───────────────────────────────────────────────────────────────────────┘
 *
 * A signed player can arrive with one — the predicate runs against his record
 * whether that record was written here or somewhere else. One rule, two
 * moments. What cannot happen is a talent that is true of nobody's career.
 */

/**
 * What a career looks like, for a player.
 *
 * Kept by whoever owns the awarding hook. Every field is here because some
 * `earn` below cannot be written without it — a talent that tests a change
 * needs to know what the player was BEFORE, and nothing in `Player` remembers.
 */
export interface PlayerRecord {
  /** Age when he first appeared in this game, here or elsewhere. */
  debutAge: number;
  /** Overall rating at that moment. The baseline every gain is measured from. */
  debutStrength: number;
  /** Seasons in this club's shirt. */
  seasonsHere: number;
  /** Competitive appearances. */
  matches: number;
  goals: number;
  /** Matches finished without conceding. Goalkeepers and defenders. */
  cleanSheets: number;
  /** Times he has been injured. Zero is its own kind of achievement. */
  injuries: number;
}

export const EMPTY_RECORD: PlayerRecord = {
  debutAge: 0,
  debutStrength: 0,
  seasonsHere: 0,
  matches: 0,
  goals: 0,
  cleanSheets: 0,
  injuries: 0
};

export const RARITIES = ['gewöhnlich', 'selten', 'einmalig'] as const;
export type Rarity = (typeof RARITIES)[number];

export const RARITY_NOTE: Record<Rarity, string> = {
  gewöhnlich: 'Kommt in jedem gut geführten Kader irgendwann vor.',
  selten: 'Ein, zwei pro Karriere, wenn man Geduld hat.',
  einmalig: 'Höchstens einmal. Danach nie wieder, in keinem Kader.'
};

export const TalentSchema = z.object({
  id: z.string(),
  name: z.string().min(3),
  /**
   * One line, in the voice of a scout who has watched him for a season.
   *
   * This is the whole point of a talent and it must be a PICTURE, not a
   * restatement of the effect. "Freistoßgott: +3 Technik" is a doctrine node
   * with a person's name on it. What Eric asked for — "perfect midfielder with
   * eagle eyes" — is a description of how somebody plays, and that is what the
   * player will remember about him three seasons later.
   */
  blurb: z.string().min(20),
  rarity: z.enum(RARITIES),
  /** Only reachable in these positions. Omitted means anyone. */
  positions: z.array(z.string()).optional()
});
export type TalentMeta = z.infer<typeof TalentSchema>;

export type Talent = TalentMeta & {
  /** What has to have happened. Pure — reads, never writes. */
  earn: (player: Player, record: PlayerRecord) => boolean;
  /**
   * What it does, in the same vocabulary the doctrine tree uses.
   *
   * Optional on purpose, and several of the best ones have none. A talent that
   * is only a number is a worse talent, and the tables show the name either
   * way.
   */
  fx?: Partial<Record<FxKey, number>>;
};

const overall = (p: Player) => overallFor(p.attributes, p.pos);
/** How much better he has got since he first appeared. */
const gained = (p: Player, r: PlayerRecord) => overall(p) - r.debutStrength;
const at = (p: Player, k: keyof Player['attributes']) => p.attributes[k];

const OTHER_THAN_TEMPO = ['technik', 'kraft', 'uebersicht', 'mentalitaet'] as const;

const catalogue: Talent[] = [
  // ────────────────────────────────────────────────────────── gewöhnlich ──
  {
    id: 'ruhender_ball',
    name: 'Ruhender Ball',
    blurb:
      'Er legt sich den Ball dreimal zurecht, tritt zwei Schritte zurück, und die Mauer weiß schon, dass sie zu spät springen wird.',
    rarity: 'gewöhnlich',
    positions: ['MIT', 'ST'],
    earn: (p, r) => at(p, 'technik') >= 78 && gained(p, r) >= 6,
    fx: { goalChance: 0.05 }
  },
  {
    id: 'kopfball',
    name: 'Kopfballungeheuer',
    blurb:
      'Bei Ecken zeigt der Trainer der Gegenseite nicht mehr auf ihn. Es hat keinen Zweck, und alle wissen es.',
    rarity: 'gewöhnlich',
    positions: ['ABW', 'ST'],
    earn: (p, r) => at(p, 'kraft') >= 80 && r.matches >= 30
  },
  {
    id: 'dauerlaeufer',
    name: 'Dauerläufer',
    blurb:
      'In der 88. Minute läuft er den Weg, den er in der 12. gelaufen ist. Niemand hat je gesehen, dass er dabei atmet.',
    rarity: 'gewöhnlich',
    earn: (p, r) => at(p, 'mentalitaet') >= 76 && r.matches >= 60,
    fx: { fitnessLoss: 0.85 }
  },
  {
    id: 'eisenfuss',
    name: 'Eisenfuß',
    blurb:
      'Zweimal in seiner Laufbahn ist er liegengeblieben. Beide Male ist er wieder aufgestanden, bevor der Physio die Tasche offen hatte.',
    rarity: 'gewöhnlich',
    positions: ['ABW', 'MIT'],
    earn: (p, r) => at(p, 'kraft') >= 76 && r.matches >= 50 && r.injuries <= 1,
    fx: { injuryRisk: -0.2 }
  },
  {
    id: 'fluegelflitzer',
    name: 'Flügelflitzer',
    blurb:
      'Der gegnerische Außenverteidiger dreht sich zweimal um und beim dritten Mal ist der Ball schon im Rückraum.',
    rarity: 'gewöhnlich',
    positions: ['MIT', 'ST'],
    /*
     * Caught by this file's own rule: `tempo >= 84` alone made a seventeen-
     * year-old a Flügelflitzer the day he was generated, which is the exact
     * spawn-roll-wearing-a-medal this catalogue exists to avoid.
     *
     * The fix is also a better definition. A Flitzer is not a fast good player,
     * he is a player whose pace is conspicuously ahead of the rest of his game
     * — and he has to have shown it often enough for the league to know.
     */
    earn: (p, r) =>
      at(p, 'tempo') >= 84 &&
      r.matches >= 25 &&
      at(p, 'tempo') - Math.max(...OTHER_THAN_TEMPO.map((k) => at(p, k))) >= 12
  },
  {
    id: 'torjaeger',
    name: 'Torjäger',
    blurb:
      'Er trifft nicht schön. Er trifft aus zwei Metern, mit dem Knie, nach einem abgefälschten Rückpass — und am Ende der Saison steht er oben.',
    rarity: 'gewöhnlich',
    positions: ['ST'],
    earn: (_p, r) => r.goals >= 35
  },
  {
    id: 'kabinenchef',
    name: 'Kabinenchef',
    blurb:
      'Der Trainer sagt, was gespielt wird. Was in der Halbzeit tatsächlich besprochen wird, entscheidet er.',
    rarity: 'gewöhnlich',
    earn: (p, r) => at(p, 'mentalitaet') >= 74 && r.seasonsHere >= 3,
    fx: { moraleFloor: 55 }
  },
  {
    id: 'strafraumkoenig',
    name: 'Strafraumkönig',
    blurb:
      'Sechzehn Meter, in denen ihm niemand etwas erzählt. Davor darf er ruhig schlecht aussehen.',
    rarity: 'gewöhnlich',
    positions: ['TW'],
    earn: (p, r) => at(p, 'uebersicht') >= 78 && r.cleanSheets >= 15
  },

  // ─────────────────────────────────────────────────────────────── selten ──
  {
    id: 'adleraugen',
    name: 'Adleraugen',
    blurb:
      'Er sieht den Pass zwei Sekunden, bevor die Lücke entsteht. Der Mitspieler, der ihn nicht sieht, wird ausgewechselt.',
    rarity: 'selten',
    positions: ['MIT'],
    earn: (p, r) => at(p, 'uebersicht') >= 86 && gained(p, r) >= 10,
    fx: { strength: 2 }
  },
  {
    id: 'spielmacher',
    name: 'Der perfekte Sechser',
    blurb:
      'Nichts an seinem Spiel taucht in einer Zusammenfassung auf. Man merkt erst, was er tut, wenn er gesperrt ist.',
    rarity: 'selten',
    positions: ['MIT'],
    earn: (p, r) =>
      at(p, 'uebersicht') >= 82 && at(p, 'technik') >= 78 && r.seasonsHere >= 2,
    fx: { strength: 3 }
  },
  {
    id: 'unverwuestlich',
    name: 'Unverwüstlich',
    blurb:
      'Einhundertfünfzig Spiele, kein einziger Ausfall. Die medizinische Abteilung führt ihn inzwischen als Kontrollgruppe.',
    rarity: 'selten',
    earn: (_p, r) => r.matches >= 150 && r.injuries === 0,
    fx: { injuryRisk: -0.35 }
  },
  {
    id: 'spaetzuender',
    name: 'Spätzünder',
    blurb:
      'Mit vierundzwanzig war er Ergänzungsspieler. Irgendwann zwischen dem achtundzwanzigsten und dem dreißigsten Geburtstag hat er verstanden, wie das Spiel geht.',
    rarity: 'selten',
    // The one that cannot be a spawn roll by construction: a 17-year-old
    // cannot have improved after 27.
    earn: (p, r) => p.age >= 28 && gained(p, r) >= 15,
    fx: { ageSlow: 0.3 }
  },
  {
    id: 'elfmetertoeter',
    name: 'Elfmetertöter',
    blurb:
      'Er geht früh in die Ecke und trifft sie trotzdem. Schützen, die gegen ihn antreten müssen, warten gern noch einen Moment.',
    rarity: 'selten',
    positions: ['TW'],
    earn: (p, r) => at(p, 'mentalitaet') >= 88 && r.matches >= 60
  },
  {
    id: 'vereinslegende',
    name: 'Vereinslegende',
    blurb:
      'Acht Jahre, drei Trainer, zwei Ligen. Es gibt Kinder auf der Südtribüne, die keinen anderen Kapitän kennen.',
    rarity: 'selten',
    earn: (_p, r) => r.seasonsHere >= 8,
    fx: { fanGain: 2 }
  },
  {
    id: 'eigengewaechs',
    name: 'Eigengewächs',
    blurb:
      'Mit fünfzehn auf dem Bolzplatz nebenan, mit einundzwanzig in der Startelf. Dazwischen ist er nie weg gewesen.',
    rarity: 'selten',
    earn: (p, r) => r.debutAge <= 18 && r.seasonsHere >= 4 && gained(p, r) >= 18
  },

  // ───────────────────────────────────────────────────────────── einmalig ──
  {
    id: 'jahrhunderttalent',
    name: 'Jahrhunderttalent',
    blurb:
      'Man hat den Ausdruck jahrzehntelang für Spieler benutzt, die dann Zweitligaprofis wurden. Bei ihm benutzt ihn niemand mehr leichtfertig.',
    rarity: 'einmalig',
    /*
     * The one that had to be an achievement or nothing.
     *
     * A seventeen-year-old already rated 88 is a dice roll, and calling that a
     * generational talent would be the game congratulating itself on its own
     * random number. Twenty-five points of development under one manager is
     * the sentence the phrase is actually short for.
     */
    earn: (p, r) => r.debutAge <= 19 && gained(p, r) >= 25 && overall(p) >= 86,
    fx: { strength: 4, valueBoost: 0.25 }
  },
  {
    id: 'der_kaiser',
    name: 'Der Kaiser',
    blurb:
      'Er spielt, als wäre das Ergebnis bereits eingetragen und alle anderen hätten es nur noch nicht gelesen.',
    rarity: 'einmalig',
    positions: ['ABW', 'MIT'],
    earn: (p, r) => overall(p) >= 90 && at(p, 'mentalitaet') >= 88 && r.seasonsHere >= 5,
    fx: { strength: 3, moraleFloor: 70 }
  },
  {
    id: 'rekordtorjaeger',
    name: 'Rekordtorjäger',
    blurb:
      'Die Zahl hängt jetzt gerahmt im Vereinsheim. Der Mann, dem sie vorher gehörte, war beim Spiel dabei und hat mitgeklatscht.',
    rarity: 'einmalig',
    positions: ['ST'],
    earn: (_p, r) => r.goals >= 120,
    fx: { fanGain: 3 }
  },
  {
    id: 'unantastbar',
    name: 'Unantastbar',
    blurb:
      'Zweihundert Spiele, kein Wechselgesuch, kein Berater am Telefon. Andere Vereine haben aufgehört zu fragen.',
    rarity: 'einmalig',
    earn: (_p, r) => r.matches >= 200 && r.seasonsHere >= 6,
    fx: { wageMod: -0.15 }
  }
];

/** Runtime-validate the data half; the predicate is typed, not parsed. */
z.array(TalentSchema).parse(catalogue);

export const talents: Talent[] = catalogue;
export const talentById: ReadonlyMap<string, Talent> = new Map(talents.map((t) => [t.id, t]));

/** No talent, spelled one way. Matches what `createPlayer` already writes. */
export const NO_TALENT = 'Kein';

export function isEligible(t: Talent, pos: Position): boolean {
  return !t.positions || t.positions.includes(pos);
}

/**
 * Every talent this player has just become eligible for.
 *
 * `awarded` is every talent id already handed out in this career, so
 * `einmalig` can mean once per SAVE rather than once per squad — a second
 * Jahrhunderttalent is the joke telling itself.
 */
export function earnedBy(
  player: Player,
  record: PlayerRecord,
  awarded: ReadonlySet<string>
): Talent[] {
  return talents.filter((t) => {
    if (t.rarity === 'einmalig' && awarded.has(t.id)) return false;
    if (!isEligible(t, player.pos)) return false;
    return t.earn(player, record);
  });
}

/**
 * The rarest thing he qualifies for, since a player carries one name.
 *
 * Rarest rather than first: a Jahrhunderttalent who also happens to be a
 * Dauerläufer is not a Dauerläufer, and a list ordered by luck would tell the
 * player the wrong thing about their own squad.
 */
export function bestFor(
  player: Player,
  record: PlayerRecord,
  awarded: ReadonlySet<string>
): Talent | undefined {
  const found = earnedBy(player, record, awarded);
  if (found.length === 0) return undefined;
  const rank = (t: Talent) => RARITIES.indexOf(t.rarity);
  return found.reduce((best, t) => (rank(t) > rank(best) ? t : best));
}

/**
 * The effects that actually reach something, given what the bus reads.
 *
 * A talent is never withheld because its effect is unwired — unlike a
 * knowledge node, nobody is paying for it, and a name with a story attached is
 * worth having on its own. What it must not do is ADVERTISE an effect that
 * lands nowhere. So the talent is always awarded and only ever claims the keys
 * a consumer exists for.
 */
export function activeFx(
  t: Talent,
  wired: ReadonlySet<string>
): Partial<Record<FxKey, number>> {
  if (!t.fx) return {};
  const out: Partial<Record<FxKey, number>> = {};
  for (const [key, value] of Object.entries(t.fx)) {
    if (wired.has(key)) out[key as FxKey] = value as number;
  }
  return out;
}
