import { z } from 'zod';
import type { GameState } from '$lib/engine/state';
import { capacity } from '$lib/features/stadium/rules';
import { strengthOf } from '$lib/features/squad/rules';
import { rankOf } from '$lib/features/knowledge/rules';
import { affinity, doctrineIds, knowledgeNodes } from '$lib/features/knowledge/content';
import { narrativeById } from '$lib/features/progression/content';

/**
 * The badge catalogue — every award the game can hand out.
 *
 * Lives in `content/` because badges are the one system that reads across every
 * department by design: a badge for a million euros is finance, a badge for a
 * capstone is knowledge, and the interesting ones are the pairs. Putting the
 * catalogue inside any one feature would make that feature import the rest of
 * the game, which is the thing the module boundaries exist to prevent.
 *
 * The awarded/not-awarded state is NOT here. That belongs to the `badges`
 * feature, along with the counters the running totals need.
 *
 * ┌───────────────────────────────────────────────────────────────────────┐
 * │ Nothing here writes. A badge test runs on render, like `attention`,    │
 * │ so a test that advanced the game would make progress depend on which   │
 * │ screen you happened to be looking at.                                  │
 * └───────────────────────────────────────────────────────────────────────┘
 */

/**
 * Running totals no single module's state can answer.
 *
 * Deliberately small. Everything derivable from state is derived — career wins
 * and youth graduations genuinely are not, because a league table resets every
 * season and a graduate becomes an ordinary squad player the moment they
 * arrive. Anything that CAN be read from state must be, or it becomes a second
 * copy of a fact that drifts.
 *
 * A counter nobody increments is a badge nobody can earn, which is why each one
 * names the module expected to keep it.
 */
export interface BadgeStats {
  /** Competitive wins across the whole career. Kept by `matchday`. */
  wins: number;
  /** Youth players who reached the first team. Kept by `youth`. */
  youthPromoted: number;
  /** Spam deleted. Kept by `mail`, which does not exist yet. */
  spamDeleted: number;
  /**
   * Has this career ever been overdrawn or carried a loan? Kept by `finance`.
   *
   * A flag rather than a count, because the badge it serves asks whether it
   * happened at all. It cannot be derived: a club that has cleared its debts
   * looks exactly like a club that never had any, and those are opposite
   * stories.
   */
  everInDebt: boolean;
}

/**
 * Read the four counters out of the modules that keep them.
 *
 * Each lives in its OWNER's state — `matchday.careerWins`, `youth.promoted`,
 * `finance.everInDebt` — rather than in one shared badge record. Same rule as a
 * player's contract living on the player: one home per fact, so two systems
 * cannot disagree about it and nothing is left behind when a feature is
 * deleted. This function is the only place that knows all four addresses.
 *
 * A counter whose keeper does not exist yet reads as its zero, which is why a
 * badge that depends on one must also name that module in `requires` — a badge
 * you can never earn should be hidden, not permanently at zero.
 */
export function collectStats(state: GameState): BadgeStats {
  const m = state.modules as Partial<{
    matchday: { careerWins: number };
    youth: { promoted: number };
    finance: { everInDebt: boolean };
    mail: { spamDeleted: number };
  }>;
  return {
    wins: m.matchday?.careerWins ?? 0,
    youthPromoted: m.youth?.promoted ?? 0,
    spamDeleted: m.mail?.spamDeleted ?? 0,
    everInDebt: m.finance?.everInDebt ?? false
  };
}

export const ZERO_STATS: BadgeStats = {
  wins: 0,
  youthPromoted: 0,
  spamDeleted: 0,
  everInDebt: false
};

export const BadgeSchema = z.object({
  id: z.string(),
  icon: z.string().min(1),
  name: z.string().min(3),
  /**
   * What you did, in the second person and the past tense.
   *
   * For a secret badge this is only ever shown AFTER it is earned, so it can
   * be the punchline rather than the instruction.
   */
  desc: z.string().min(10),
  /**
   * Modules that must be in the registry for this badge to be reachable.
   *
   * The same idea as the knowledge tree's dormancy check, for the same reason:
   * the prototype had badges for a European cup, four factories and a catering
   * mile, none of which exist here yet. An achievement you can never earn is
   * worse than a missing one — it is a promise the game breaks quietly, and it
   * sits in the list forever looking like something you failed at.
   *
   * Derived against the live registry, never written down, so a badge lights up
   * the day its feature lands and nobody has to remember to come back.
   */
  requires: z.array(z.string()),
  /** Hidden until earned. Its existence is shown; its condition is not. */
  secret: z.boolean().optional(),
  /**
   * Awarded at a moment rather than by a standing condition.
   *
   * The same split the inbox draws: most badges are true-when-checked and can
   * be polled, but "you survived a raid" is an event — it was true for ninety
   * minutes and is not true now, and no amount of looking at the current state
   * will ever find it. Those carry an event key and are granted by whoever
   * raises it, not by this catalogue.
   */
  grantedBy: z.string().optional(),
});

/*
 * The predicate is typed but not parsed.
 *
 * Zod validates a function by WRAPPING it, which would replace every test with
 * a proxy and lose the parameter types at the call site — 32 implicit-any
 * errors, and a runtime indirection buying nothing, since there is no untrusted
 * input here to guard against. The data fields are what a typo lands in, so
 * those are parsed and the predicate is left alone.
 */
export type Badge = z.infer<typeof BadgeSchema> & {
  /** The standing condition. Absent on event-granted badges. */
  test?: (state: GameState, stats: BadgeStats) => boolean;
};

const nodeDoctrine = (id: string) => knowledgeNodes.find((n) => n.id === id)?.doctrine;
const synthesesOwned = (state: GameState) =>
  state.modules.knowledge.owned.filter((id) => nodeDoctrine(id) === 'synth').length;

const catalogue: Badge[] = [
  // ───────────────────────────────────────────────────────── Fortschritt ──
  {
    id: 'first_win',
    icon: '🥅',
    name: 'Erster Dreier',
    desc: 'Ein Pflichtspiel gewonnen.',
    requires: ['matchday'],
    test: (_s, stats) => stats.wins >= 1
  },
  {
    id: 'ten_wins',
    icon: '🔟',
    name: 'Seriensieger',
    desc: 'Zehn Spiele gewonnen.',
    requires: ['matchday'],
    test: (_s, stats) => stats.wins >= 10
  },
  {
    id: 'promo',
    icon: '⬆️',
    name: 'Aufstieg',
    desc: 'Eine Liga höher, zum ersten Mal.',
    requires: ['history'],
    /*
     * Read from the season record rather than from the current league level.
     * "Level is better than it was" cannot tell a promotion from a career that
     * merely started higher, and the Investor narrative starts three divisions
     * above the Aufsteiger — it would have collected this badge for existing.
     */
    test: (s) => s.modules.history.seasons.some((r) => r.outcome === 'promoted')
  },
  {
    id: 'topflight',
    icon: '🏆',
    name: 'Erstklassig',
    desc: 'Die erste Liga erreicht.',
    requires: ['league', 'history'],
    // Same reasoning, one step further: reaching the top flight only counts if
    // you climbed to it. A start at level 0 is a premise, not an achievement.
    test: (s) =>
      s.modules.league.playerLevel === 0 &&
      s.modules.history.seasons.some((r) => r.outcome === 'promoted')
  },
  {
    id: 'cup',
    icon: '🏅',
    name: 'Pokalsieger',
    desc: 'Den Pokal gewonnen. Sechs Spiele, kein Rückspiel, kein zweiter Versuch.',
    requires: ['cup'],
    test: (s) => s.modules.cup.titles >= 1
  },
  {
    id: 'season5',
    icon: '📅',
    name: 'Fünf Jahre Aufbau',
    desc: 'Fünf Saisons im Amt. Die meisten Trainer schaffen zwei.',
    requires: ['core'],
    test: (s) => s.meta.season >= 5
  },

  // ─────────────────────────────────────────────────────────── Wirtschaft ──
  {
    id: 'millionaire',
    icon: '💰',
    name: 'Erste Million',
    desc: 'Eine Million Euro erwirtschaftet, über das hinaus, womit du angefangen hast.',
    requires: ['finance', 'progression'],
    /*
     * Measured against the starting balance, not against a flat figure.
     *
     * At a flat million this fired the instant an Investor career loaded — that
     * start opens at 6.000.000 EUR — so two of the five narratives collected
     * their first badge for reading their own premise, and taught the player in
     * the first second that badges are free. The award is for the million you
     * MADE. Everyone has to make one.
     */
    test: (s) => {
      const start = narrativeById(s.modules.progression.narrativeId)?.startingMoney ?? 0;
      return s.modules.finance.money >= Math.max(1_000_000, start + 1_000_000);
    }
  },
  {
    id: 'debtfree',
    icon: '🧾',
    name: 'Aus den roten Zahlen',
    desc: 'Aus den Schulden heraus und wieder liquide.',
    requires: ['finance'],
    /*
     * Was "Schuldenfrei", tested as `loanDebt === 0`, which three narratives
     * satisfied before kicking a ball — a club that has never borrowed is not
     * debt-free, it is just new. Nothing about the current balance sheet can
     * tell the two apart, which is why this needs a flag: a cleared debt and an
     * absent one look identical and are opposite stories.
     *
     * It now belongs to the Absturz start, which opens at minus 1,8 Millionen.
     */
    test: (s, stats) =>
      stats.everInDebt && s.modules.finance.loanDebt === 0 && s.modules.finance.money > 200_000
  },
  {
    id: 'sponsor',
    icon: '🤝',
    name: 'Namensgeber',
    desc: 'Einen Hauptsponsor unter Vertrag genommen.',
    requires: ['sponsors'],
    test: (s) => s.modules.sponsors.contracts.length > 0
  },
  {
    id: 'stadium20k',
    icon: '🏟️',
    name: 'Fünfstellig',
    desc: 'Das Stadion auf 20.000 Plätze ausgebaut.',
    requires: ['stadium'],
    test: (s) => capacity(s.modules.stadium) >= 20_000
  },

  // ────────────────────────────────────────────────────────────── Doktrin ──
  {
    id: 'firstnode',
    icon: '🌱',
    name: 'Erster Knoten',
    desc: 'Den ersten Wissensknoten freigeschaltet.',
    requires: ['knowledge'],
    test: (s) => s.modules.knowledge.owned.length >= 1
  },
  {
    id: 'rank7',
    icon: '📐',
    name: 'Fachrichtung',
    desc: 'Rang 7 in einer Doktrin. Ab hier bist du etwas Bestimmtes.',
    requires: ['knowledge'],
    test: (s) => doctrineIds.some((d) => rankOf(s.modules.knowledge, d) >= 7)
  },
  {
    id: 'fulltree',
    icon: '🌳',
    name: 'Vollendete Lehre',
    desc: 'Eine Doktrin vollständig abgeschlossen — alle vierzehn Knoten.',
    requires: ['knowledge'],
    test: (s) => doctrineIds.some((d) => rankOf(s.modules.knowledge, d) >= 14)
  },
  {
    id: 'synth1',
    icon: '🔗',
    name: 'Synthese',
    desc: 'Zwei Doktrinen gekreuzt.',
    requires: ['knowledge'],
    test: (s) => synthesesOwned(s) >= 1
  },
  {
    id: 'synth3',
    icon: '⛓️',
    name: 'Dreifach verschränkt',
    desc: 'Drei Synthesen. Mehr sind pro Karriere kaum zu bezahlen.',
    requires: ['knowledge'],
    test: (s) => synthesesOwned(s) >= 3
  },

  // ──────────────────────────────────────────────────────────────── Kader ──
  {
    id: 'youthup',
    icon: '👦',
    name: 'Eigengewächs',
    desc: 'Ein Jugendspieler hat es in den Profikader geschafft.',
    requires: ['youth'],
    test: (_s, stats) => stats.youthPromoted >= 1
  },
  {
    id: 'star90',
    icon: '⭐',
    name: 'Weltklasse',
    desc: 'Ein Spieler mit Stärke 90 oder mehr im eigenen Kader.',
    requires: ['squad'],
    test: (s) => s.modules.squad.players.some((p) => strengthOf(p) >= 90)
  },
  {
    id: 'loyal',
    icon: '🎖️',
    name: 'Vereinstreue',
    desc: 'Einen Spieler über fünf Saisons hinweg gehalten.',
    requires: ['contracts', 'squad'],
    // A contract long enough to outlast five seasons is one you renewed at
    // least twice — the badge is for the decision, not the paperwork.
    test: (s) =>
      s.modules.squad.players.some((p) => p.contractMatchdays >= 34 * 5)
  },

  // ───────────────────────────────────────────────────────────── verborgen ──
  {
    id: 'doubleagent',
    icon: '🎭',
    name: 'Doppelagent',
    desc: 'Rang 6 in zwei Doktrinen, die einander nicht ausstehen können.',
    requires: ['knowledge'],
    secret: true,
    test: (s) =>
      Object.entries(affinity).some(([pair, kind]) => {
        if (kind !== 'hostile') return false;
        const [a, b] = pair.split('|') as [string, string];
        return rankOf(s.modules.knowledge, a) >= 6 && rankOf(s.modules.knowledge, b) >= 6;
      })
  },
  {
    id: 'purist',
    icon: '🪶',
    name: 'Ohne Hilfsmittel',
    desc: 'Eine ganze Saison überstanden, ohne einen einzigen Wissensknoten zu kaufen.',
    requires: ['knowledge', 'history'],
    secret: true,
    test: (s) => s.modules.knowledge.owned.length === 0 && s.modules.history.seasons.length >= 1
  },
  {
    id: 'hoarder',
    icon: '🧮',
    name: 'Unentschlossen',
    desc: 'Zehn Wissenspunkte angesammelt und keinen davon ausgegeben.',
    requires: ['knowledge'],
    secret: true,
    test: (s) => s.modules.knowledge.points >= 10
  },
  {
    id: 'survivor',
    icon: '🧯',
    name: 'Knapp vorbei',
    desc: 'Eine Saison mit negativem Konto begonnen und trotzdem die Klasse gehalten.',
    requires: ['finance', 'history'],
    secret: true,
    test: (s) =>
      s.modules.finance.money < 0 &&
      s.modules.history.seasons.some((r) => r.outcome === 'stayed')
  },

  // Event-granted: true for a moment and never again afterwards, so no amount
  // of looking at the current state will find them.
  {
    id: 'prince',
    icon: '👑',
    name: 'Königliche Post',
    desc: 'Du hast dem Prinzen tatsächlich geantwortet.',
    requires: ['mail'],
    secret: true,
    grantedBy: 'mail.princeReplied'
  },
  {
    id: 'inboxzero',
    icon: '📭',
    name: 'Posteingang Null',
    desc: 'Keine ungelesene Nachricht. In keiner Kategorie.',
    requires: ['mail'],
    secret: true,
    grantedBy: 'mail.inboxZero'
  },
  {
    id: 'spamlord',
    icon: '🗑️',
    name: 'Filterarbeit',
    desc: 'Zwanzig Spam-Nachrichten gelöscht.',
    requires: ['mail'],
    secret: true,
    test: (_s, stats) => stats.spamDeleted >= 20
  },
  {
    id: 'raid',
    icon: '🚨',
    name: 'Aktenzeichen offen',
    desc: 'Eine Razzia des Verbandes überstanden.',
    requires: ['mail', 'knowledge'],
    secret: true,
    grantedBy: 'shadow.raidSurvived'
  }
];

// Validate the data half at load: ids, copy, requires. Anything malformed
// fails at boot rather than at the moment a player would have earned it.
z.array(BadgeSchema).parse(catalogue);

export const badges: Badge[] = catalogue;

export const badgeById: ReadonlyMap<string, Badge> = new Map(badges.map((b) => [b.id, b]));

/**
 * Can this badge be earned in the game as it is currently built?
 *
 * A badge whose feature is missing is hidden entirely — not shown locked, not
 * shown as a mystery. A "???" you can never earn is a lie the list keeps
 * telling, and one of them makes the player distrust the other twenty-six.
 */
export function isEarnable(badge: Badge, registeredModules: ReadonlySet<string>): boolean {
  return badge.requires.every((id) => registeredModules.has(id));
}

export function earnableBadges(registeredModules: ReadonlySet<string>): Badge[] {
  return badges.filter((b) => isEarnable(b, registeredModules));
}

/**
 * How the secret ones are surfaced: as a count, never as a list.
 *
 * A secret nobody knows exists is not a hook, it is an accident — the player
 * finds it by chance or never, and either way it does no work. A count says
 * "there are four more here" and lets curiosity do the rest, without spending
 * the surprise. This is also what keeps them honest against the docs gate: the
 * MECHANISM is documented, each badge is not.
 */
export function secretCount(registeredModules: ReadonlySet<string>): number {
  return earnableBadges(registeredModules).filter((b) => b.secret).length;
}

export interface BadgeDisplay {
  /** Rendered in full, in catalogue order: everything earned, plus unearned non-secrets. */
  shown: Badge[];
  /** Which of `shown` are earned. The surface needs both, and both come from here. */
  earned: ReadonlySet<string>;
  /** Unearned secrets. A number, never a list. */
  lockedSecrets: number;
  earnedCount: number;
  total: number;
}

/**
 * The three-way split the badge list is: earned, reachable-but-not-yet, and
 * silhouette.
 *
 * Here rather than in the screen because there is no component test in this
 * project, so a partition living in a `$derived` is a branch that can only be
 * checked by looking at it — and today alone, three bugs in this repo survived
 * being looked at and died the moment something ran them. Extracted, the same
 * logic is ordinary data in and data out, and the cases that are awkward to
 * reach in a live save (a secret already earned, an empty career, a badge whose
 * feature is not built) are three lines of test each.
 *
 * Same move as pulling `rankEntries` out of Leaderboard, for the same reason.
 *
 * The rules it encodes:
 *  - An UNREACHABLE badge never appears at all — not greyed, not counted. The
 *    prototype listed badges for a European cup, four factories and a catering
 *    mile that did not exist, and they sat there looking like failures.
 *  - An EARNED badge shows in full whether or not it was secret. Withholding
 *    the punchline after the fact means the joke never lands.
 *  - An UNEARNED secret is counted and never named, so the count falling from
 *    eight to seven says something happened without saying what.
 */
export function partitionBadges(
  registeredModules: ReadonlySet<string>,
  earnedIds: Iterable<string>
): BadgeDisplay {
  const earnable = earnableBadges(registeredModules);
  /*
   * Narrowed to the earnable set on purpose. A save carrying a badge whose
   * feature has since been removed must not count towards a total drawn from
   * the features that exist — otherwise a career reads 23/22.
   */
  const earned = new Set([...earnedIds].filter((id) => earnable.some((b) => b.id === id)));

  return {
    shown: earnable.filter((b) => !b.secret || earned.has(b.id)),
    earned,
    lockedSecrets: earnable.filter((b) => b.secret && !earned.has(b.id)).length,
    earnedCount: earnable.filter((b) => earned.has(b.id)).length,
    total: earnable.length
  };
}
