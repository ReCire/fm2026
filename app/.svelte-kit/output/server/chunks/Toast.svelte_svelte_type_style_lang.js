import "clsx";
import { z } from "zod";
import { q as is_array, p as get_prototype_of, o as object_prototype } from "./index.js";
const empty = [];
function snapshot(value, skip_warning = false, no_tojson = false) {
  return clone(value, /* @__PURE__ */ new Map(), "", empty, null, no_tojson);
}
function clone(value, cloned, path, paths, original = null, no_tojson = false) {
  if (typeof value === "object" && value !== null) {
    var unwrapped = cloned.get(value);
    if (unwrapped !== void 0) return unwrapped;
    if (value instanceof Map) return (
      /** @type {Snapshot<T>} */
      new Map(value)
    );
    if (value instanceof Set) return (
      /** @type {Snapshot<T>} */
      new Set(value)
    );
    if (is_array(value)) {
      var copy = (
        /** @type {Snapshot<any>} */
        Array(value.length)
      );
      cloned.set(value, copy);
      if (original !== null) {
        cloned.set(original, copy);
      }
      for (var i = 0; i < value.length; i += 1) {
        var element = value[i];
        if (i in value) {
          copy[i] = clone(element, cloned, path, paths, null, no_tojson);
        }
      }
      return copy;
    }
    if (get_prototype_of(value) === object_prototype) {
      copy = {};
      cloned.set(value, copy);
      if (original !== null) {
        cloned.set(original, copy);
      }
      for (var key of Object.keys(value)) {
        copy[key] = clone(
          // @ts-expect-error
          value[key],
          cloned,
          path,
          paths,
          null,
          no_tojson
        );
      }
      return copy;
    }
    if (value instanceof Date) {
      return (
        /** @type {Snapshot<T>} */
        structuredClone(value)
      );
    }
    if (typeof /** @type {T & { toJSON?: any } } */
    value.toJSON === "function" && !no_tojson) {
      return clone(
        /** @type {T & { toJSON(): any } } */
        value.toJSON(),
        cloned,
        path,
        paths,
        // Associate the instance with the toJSON clone
        value
      );
    }
  }
  if (value instanceof EventTarget) {
    return (
      /** @type {Snapshot<T>} */
      value
    );
  }
  try {
    return (
      /** @type {Snapshot<T>} */
      structuredClone(value)
    );
  } catch (e) {
    return (
      /** @type {Snapshot<T>} */
      value
    );
  }
}
const PHASES = ["pre", "sim", "post", "economy", "world"];
function defineModule(def) {
  return def;
}
class Registry {
  all;
  byId;
  constructor(defs) {
    const enabled = defs.filter((d) => d.enabled ? d.enabled() : true);
    const seen = /* @__PURE__ */ new Set();
    for (const d of enabled) {
      if (seen.has(d.id)) throw new Error(`Duplicate module id: "${d.id}"`);
      seen.add(d.id);
    }
    for (const d of enabled) {
      for (const need of d.requires ?? []) {
        if (!seen.has(need)) {
          throw new Error(
            `Module "${d.id}" requires "${need}", which is missing or disabled.`
          );
        }
      }
    }
    this.all = enabled;
    this.byId = new Map(enabled.map((d) => [d.id, d]));
  }
  /** Nav entries, grouped and ordered, for the sidebar. */
  nav() {
    const groups = /* @__PURE__ */ new Map();
    for (const d of this.all) {
      if (!d.nav) continue;
      const list = groups.get(d.nav.group) ?? [];
      list.push(d);
      groups.set(d.nav.group, list);
    }
    return [...groups.entries()].map(([group, items]) => ({
      group,
      items: items.sort((a, b) => (a.nav.order ?? 0) - (b.nav.order ?? 0))
    }));
  }
  /** The (max four) modules pinned to the mobile bottom bar. */
  primaryNav() {
    return this.all.filter((d) => d.nav?.primary).sort((a, b) => (a.nav.order ?? 0) - (b.nav.order ?? 0));
  }
  /** Hooks for one tick kind, flattened and already sorted into phase order. */
  hooks(kind) {
    const out = [];
    for (const m of this.all) {
      const declared = m.hooks?.[kind];
      if (!declared) continue;
      for (const hook of Array.isArray(declared) ? declared : [declared]) {
        out.push({ module: m, phase: hook.phase, order: hook.order ?? 0, hook });
      }
    }
    return out.sort((a, b) => {
      const p = PHASES.indexOf(a.phase) - PHASES.indexOf(b.phase);
      return p !== 0 ? p : a.order - b.order;
    }).map(({ module, phase, hook }) => ({ module, phase, hook }));
  }
  /** Every documented control in the game, flattened. */
  docs() {
    const out = /* @__PURE__ */ new Map();
    for (const m of this.all) {
      for (const [id, entry] of Object.entries(m.docs ?? {})) {
        if (out.has(id)) throw new Error(`Duplicate doc id "${id}" (module "${m.id}")`);
        out.set(id, { ...entry, module: m.id });
      }
    }
    return out;
  }
}
function createRng(seed, cursor = 0) {
  let a = seed >>> 0;
  let steps = 0;
  for (let i = 0; i < cursor; i++) step();
  function step() {
    a = a + 1831565813 >>> 0;
    let t = a;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    steps++;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
  const rng = {
    next: step,
    int: (min, max) => Math.floor(step() * (max - min + 1)) + min,
    float: (min, max) => min + step() * (max - min),
    chance: (p) => step() < p,
    pick: (items) => {
      if (items.length === 0) throw new Error("rng.pick called with an empty array");
      return items[Math.floor(step() * items.length)];
    },
    fork: (label) => createRng(hashString(label) ^ a),
    cursor: () => cursor + steps
  };
  return rng;
}
function hashString(s) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function seedFrom(text) {
  return hashString(text);
}
function runTick(registry2, state, kind) {
  const events = [];
  const timings = [];
  const provided = /* @__PURE__ */ new Map();
  const hooks = registry2.hooks(kind);
  for (const { module, phase, hook } of hooks) {
    const rng = createRng(
      state.meta.seed ^ hashId(module.id) ^ state.meta.tick * 2654435761,
      0
    );
    const ctx = {
      state,
      rng,
      kind,
      emit: (e) => events.push(e),
      query: (key, fallback) => provided.has(key) ? provided.get(key) : fallback,
      provide: (key, value) => provided.set(key, value)
    };
    const t0 = performance.now();
    try {
      hook.run(ctx);
    } catch (err) {
      events.push({
        source: module.id,
        severity: "bad",
        title: `Fehler im Modul "${module.title}"`,
        detail: err instanceof Error ? err.message : String(err)
      });
      console.error(`[tick:${kind}] module "${module.id}" threw`, err);
    }
    timings.push({ module: module.id, phase, ms: performance.now() - t0 });
  }
  state.meta.tick += 1;
  state.meta.lastPlayedAt = Date.now();
  if (kind === "matchday") state.meta.matchday += 1;
  if (kind === "seasonEnd") {
    state.meta.season += 1;
    state.meta.matchday = 1;
  }
  return { kind, events, timings };
}
function hashId(s) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function defineDocs(docs) {
  return docs;
}
let lookup = /* @__PURE__ */ new Map();
function installDocs(map) {
  lookup = map;
}
function doc(id) {
  return lookup.get(id);
}
function docLabel(id, override) {
  if (override) return override;
  return doc(id)?.label ?? `⟨${id}⟩`;
}
const CoreSchema = z.object({
  soundOn: z.boolean(),
  lastSeenReport: z.number().int()
});
const core = defineModule({
  id: "core",
  title: "Spiel",
  summary: "Spielsteuerung: Spieltag, Rückgängig, Speicherstände.",
  state: {
    schema: CoreSchema,
    create: () => ({ soundOn: false, lastSeenReport: 0 }),
    version: 1
  },
  docs: defineDocs({
    "game.advance": {
      label: "▶ Spieltag simulieren",
      tooltip: "Spielt den nächsten Spieltag ab: Spiel, Verletzungen, Einnahmen und Ausgaben aller Bereiche.",
      manual: "## Der Spieltag\n\nEin Spieltag ist die Zeiteinheit des Spiels. Beim Simulieren laufen alle Systeme in einer festen Reihenfolge ab — erst die Vorbereitung, dann das Spiel, dann die sportlichen Folgen, dann die Wirtschaft, zuletzt die Außenwelt.\n\nAlles, was dabei passiert, landet im Spieltagsbericht. Es gibt keine Meldung, die dich unterbricht.",
      why: "Eine einzige Uhr für das ganze Spiel. Jedes System hängt sich an diesen Takt, statt sich gegenseitig aufzurufen — dadurch lässt sich ein Bereich hinzufügen oder entfernen, ohne die anderen anzufassen.",
      since: "0.1.0",
      related: ["game.undo", "finance.ledger"],
      screenshot: "dashboard-after-matchday"
    },
    "game.undo": {
      label: "↩ Spieltag zurücknehmen",
      tooltip: "Macht den letzten Spieltag rückgängig und stellt den Stand davor wieder her.",
      why: "Jeder Spieltag legt vorher einen vollständigen Zustands-Schnappschuss an. Das kostet wenig, weil nur pro Spieltag gesichert wird und nicht bei jeder Aktion — und es macht Ausprobieren risikofrei.",
      since: "0.1.0",
      related: ["game.advance"]
    },
    "game.newGame": {
      label: "Neues Spiel",
      tooltip: "Startet eine neue Karriere. Der aktuelle Spielstand geht dabei verloren, sofern er nicht gespeichert wurde.",
      why: "Jede Karriere hat einen Startwert (Seed). Derselbe Seed erzeugt exakt dieselbe Welt — nützlich zum Testen und für Fehlerberichte.",
      since: "0.1.0",
      related: ["game.advance"]
    }
  })
});
const LedgerEntrySchema = z.object({
  season: z.number().int(),
  matchday: z.number().int(),
  source: z.string(),
  reason: z.string(),
  amount: z.number()
});
const FinanceSchema = z.object({
  money: z.number(),
  transferBudget: z.number(),
  wageBudget: z.number(),
  loanDebt: z.number().min(0),
  ledger: z.array(LedgerEntrySchema).max(2e3)
});
function createFinance(_rng) {
  return {
    money: 15e4,
    transferBudget: 1e5,
    wageBudget: 15e3,
    loanDebt: 0,
    ledger: []
  };
}
const FINANCE_VERSION = 1;
const LEDGER_CAP = 2e3;
function post(finance2, entry) {
  finance2.money += entry.amount;
  finance2.ledger.push({ ...entry });
  if (finance2.ledger.length > LEDGER_CAP) {
    finance2.ledger.splice(0, finance2.ledger.length - LEDGER_CAP);
  }
}
function matchdayNet(finance2, season, matchday) {
  return finance2.ledger.filter((e) => e.season === season && e.matchday === matchday).reduce((sum, e) => sum + e.amount, 0);
}
function breakdown(finance2, season, matchday) {
  const bySource = /* @__PURE__ */ new Map();
  for (const e of finance2.ledger) {
    if (e.season !== season || e.matchday !== matchday) continue;
    bySource.set(e.source, (bySource.get(e.source) ?? 0) + e.amount);
  }
  return [...bySource.entries()].map(([source, amount]) => ({ source, amount })).sort((a, b) => b.amount - a.amount);
}
function loanInterest(debt, ratePerMatchday) {
  return Math.round(debt * ratePerMatchday);
}
function formatMoney(value) {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1e6) return `${sign}${(abs / 1e6).toFixed(2)} Mio. €`;
  return `${sign}${Math.round(abs).toLocaleString("de-DE")} €`;
}
const FinanceContentSchema = z.object({
  /** Interest charged on the club loan, per matchday. */
  loanRatePerMatchday: z.number().min(0).max(0.05),
  /** Overdraft the board tolerates before it intervenes. */
  toleratedOverdraft: z.number().min(0),
  /** Fixed running costs charged every matchday, before variable opex. */
  baseOpex: z.number().min(0),
  /** Share of ticket income that goes straight back out as running costs. */
  opexTicketShare: z.number().min(0).max(1)
});
const financeContent = FinanceContentSchema.parse({
  loanRatePerMatchday: 4e-3,
  toleratedOverdraft: 5e4,
  // Both lifted from applyMatchdayFinances() in the prototype:
  //   opex = (ticketIncome * 0.12 + 4500)
  baseOpex: 4500,
  opexTicketShare: 0.12
});
const financeDocs = defineDocs({
  "finance.balance": {
    label: "Vereins-Konto",
    tooltip: "Das frei verfügbare Geld des Vereins. Fällt es zu weit ins Minus, greift der Vorstand ein.",
    why: "Der zentrale Druckpunkt des Spiels: fast jede Entscheidung kostet Geld, und der Kontostand begrenzt, wie schnell du wachsen kannst.",
    since: "0.1.0",
    related: ["finance.takeLoan", "finance.ledger"],
    screenshot: "finance-overview"
  },
  "finance.transferBudget": {
    label: "Transferbudget",
    tooltip: "Der Betrag, den du in dieser Saison für Spielerkäufe ausgeben darfst.",
    why: "Trennt Investitionen von laufenden Kosten — sonst würde man das Gehaltsbudget für einen Star verbrennen und im Februar zahlungsunfähig sein.",
    since: "0.1.0",
    related: ["finance.wageBudget"]
  },
  "finance.wageBudget": {
    label: "Gehaltsbudget",
    tooltip: "Gehaltssumme pro Spieltag, die der Vorstand mitträgt. Darüber hinaus zahlst du aus dem Vereinskonto.",
    why: "Macht teure Verträge zu einer Dauerbelastung statt zu einer einmaligen Ausgabe.",
    since: "0.1.0",
    related: ["finance.transferBudget"]
  },
  "finance.takeLoan": {
    label: "Kredit aufnehmen",
    tooltip: "Nimmt sofort Geld auf. Kostet ab dem nächsten Spieltag Zinsen, die automatisch abgebucht werden.",
    manual: "## Kredite\n\nEin Kredit verschafft dir sofort Handlungsfähigkeit — für einen Transfer, einen Stadionausbau oder um eine Gehaltslücke zu überbrücken. Die Zinsen werden jeden Spieltag automatisch vom Vereinskonto abgebucht, unabhängig davon, wie das Spiel ausgegangen ist.\n\nDie Tilgung ist freiwillig: du entscheidest, wann du zurückzahlst. Solange Restschuld besteht, läuft der Zins weiter.",
    why: "Erlaubt bewusst riskantes Spiel — vorziehen von Erfolg gegen dauerhafte Belastung. Ohne Kredit wäre ein schlechter Saisonstart nicht mehr aufzuholen.",
    since: "0.1.0",
    related: ["finance.repayLoan", "finance.balance"],
    screenshot: "finance-loan-sheet"
  },
  "finance.repayLoan": {
    label: "Kredit tilgen",
    tooltip: "Zahlt einen Teil der Restschuld zurück und senkt damit die laufenden Zinsen.",
    why: "Gibt dem Spieler eine sinnvolle Verwendung für Überschüsse, statt Geld nur zu horten.",
    since: "0.1.0",
    related: ["finance.takeLoan"]
  },
  "finance.ledger": {
    label: "Buchungen",
    tooltip: "Jede Einnahme und Ausgabe des Spieltags, nach Quelle aufgeschlüsselt.",
    why: "Macht die Simulation nachvollziehbar: wenn das Konto sinkt, kannst du genau sehen, welches System dafür verantwortlich war.",
    since: "0.1.0",
    related: ["finance.balance"],
    screenshot: "finance-ledger"
  }
});
const finance = defineModule({
  id: "finance",
  title: "Finanzen",
  summary: "Vereinskonto, Budgets, Kredite und das Spieltags-Kontobuch.",
  nav: { group: "Verein", icon: "💰", order: 10, primary: true },
  state: {
    schema: FinanceSchema,
    create: createFinance,
    version: FINANCE_VERSION
  },
  hooks: {
    /**
     * Runs LAST in the economy phase (order 100), after every other module has
     * posted its income and costs — so interest is charged on the real balance
     * and the board reacts to the final number, not a half-built one.
     */
    matchday: {
      phase: "economy",
      order: 100,
      run({ state, emit }) {
        const finance2 = state.modules.finance;
        const { season, matchday } = state.meta;
        if (finance2.loanDebt > 0) {
          const interest = loanInterest(finance2.loanDebt, financeContent.loanRatePerMatchday);
          post(finance2, { season, matchday, source: "finance", reason: "Kreditzinsen", amount: -interest });
          emit({
            source: "finance",
            severity: "info",
            title: "Kreditzinsen abgebucht",
            amount: -interest
          });
        }
        if (finance2.money < -financeContent.toleratedOverdraft) {
          emit({
            source: "finance",
            severity: "bad",
            title: "Der Vorstand ist alarmiert",
            detail: "Das Vereinskonto liegt deutlich im Minus. Verkäufe oder ein Kredit sind jetzt nötig.",
            goto: "finance"
          });
        }
      }
    }
  },
  screen: () => import("./Screen.js"),
  docs: financeDocs
});
const WageBandSchema = z.object({
  /** Applies to players at or below this strength. */
  upToStrength: z.number().int().min(1).max(99),
  base: z.number().min(0),
  perValue: z.number().min(0).max(0.1)
});
const SquadContentSchema = z.object({
  firstNames: z.array(z.string()).min(1),
  lastNames: z.array(z.string()).min(1),
  traits: z.array(z.string()).min(1),
  /** Chance a generated player has a trait at all. */
  traitChance: z.number().min(0).max(1),
  wageBands: z.array(WageBandSchema).min(1),
  /** Market value curve: value = sum over thresholds passed. */
  valueCurve: z.array(z.object({
    fromStrength: z.number().int(),
    perPoint: z.number().min(0)
  })).min(1),
  startingSquad: z.array(z.tuple([z.enum(POSITIONS), z.number().int(), z.number().int(), z.number().int()])),
  /** Fitness lost by a starter each matchday, and regained by a substitute. */
  fitnessLossPerMatch: z.number().int().min(0),
  fitnessRecoveryPerMatch: z.number().int().min(0),
  /** Base chance a starter picks up an injury. */
  injuryBaseRisk: z.number().min(0).max(1),
  /** Multiplier applied when a player starts below this fitness. */
  tiredFitnessThreshold: z.number().int(),
  tiredInjuryMultiplier: z.number().min(1)
});
const squadContent = SquadContentSchema.parse({
  firstNames: ["Max", "Lukas", "Leon", "Felix", "Jonas", "Elias", "Noah", "Julian", "Tim", "Moritz", "Jan", "Tom", "David", "Paul", "Alexander", "Daniel", "Tobias", "Florian", "Marco", "Kevin", "Nico", "Sven"],
  lastNames: ["Müller", "Schmidt", "Schneider", "Fischer", "Weber", "Meyer", "Wagner", "Becker", "Schulz", "Hoffmann", "Schäfer", "Koch", "Bauer", "Richter", "Klein", "Wolf", "Schröder", "Neumann", "Schwarz", "Zimmermann", "Hartmann", "Lange"],
  traits: ["Tor-Instinkt", "Freistoß-Gott", "Elfmeter-Killer", "Leader", "Eisenfuß", "Flügelflitzer", "Zweikampfmonster"],
  traitChance: 0.35,
  // Ported from calculatePlayerWage()'s ternary chain.
  wageBands: [
    { upToStrength: 58, base: 300, perValue: 8e-3 },
    { upToStrength: 68, base: 1200, perValue: 6e-3 },
    { upToStrength: 77, base: 5e3, perValue: 45e-4 },
    { upToStrength: 99, base: 25e3, perValue: 35e-4 }
  ],
  // Ported from calculatePlayerMarketValue().
  valueCurve: [
    { fromStrength: 40, perPoint: 2e3 },
    { fromStrength: 60, perPoint: 18e3 },
    { fromStrength: 75, perPoint: 9e4 },
    { fromStrength: 85, perPoint: 4e5 }
  ],
  startingSquad: [
    ["TW", 2, 48, 58],
    ["ABW", 6, 46, 60],
    ["MIT", 7, 46, 61],
    ["ST", 4, 47, 62]
  ],
  fitnessLossPerMatch: 12,
  fitnessRecoveryPerMatch: 15,
  injuryBaseRisk: 0.055,
  tiredFitnessThreshold: 55,
  tiredInjuryMultiplier: 1.8
});
function marketValue(strength) {
  let value = 0;
  for (const band of squadContent.valueCurve) {
    if (strength > band.fromStrength) {
      value += (strength - band.fromStrength) * band.perPoint;
    }
  }
  return Math.round(value);
}
function wage(strength, value = marketValue(strength)) {
  const band = squadContent.wageBands.find((b) => strength <= b.upToStrength) ?? squadContent.wageBands[squadContent.wageBands.length - 1];
  return Math.round(band.base + value * band.perValue);
}
function createPlayer(rng, pos, minStrength, maxStrength, forceTrait) {
  const strength = rng.int(minStrength, maxStrength);
  const value = marketValue(strength);
  const trait = forceTrait ?? (rng.chance(squadContent.traitChance) ? rng.pick(squadContent.traits) : "Kein");
  return {
    id: `p${rng.int(1e5, 999999)}-${strength}`,
    name: `${rng.pick(squadContent.firstNames)} ${rng.pick(squadContent.lastNames)}`,
    pos,
    strength,
    fitness: rng.int(85, 100),
    morale: rng.int(60, 90),
    age: rng.int(18, 34),
    marketValue: value,
    wage: wage(strength, value),
    trait,
    injured: 0,
    suspended: 0,
    individualFocus: "allgemein"
  };
}
function isAvailable(p) {
  return p.injured === 0 && p.suspended === 0;
}
function autoLineup(squad2) {
  const available = squad2.players.filter(isAvailable);
  const byPos = (pos) => available.filter((p) => p.pos === pos).sort((a, b) => rating(b) - rating(a));
  const picked = [
    ...byPos("TW").slice(0, 1),
    ...byPos("ABW").slice(0, 4),
    ...byPos("MIT").slice(0, 4),
    ...byPos("ST").slice(0, 2)
  ];
  if (picked.length < 11) {
    const chosen = new Set(picked.map((p) => p.id));
    const rest = available.filter((p) => !chosen.has(p.id)).sort((a, b) => rating(b) - rating(a));
    picked.push(...rest.slice(0, 11 - picked.length));
  }
  return picked.map((p) => p.id);
}
function rating(p) {
  return p.strength * (p.fitness / 100);
}
function teamStrength(squad2, isHome, externalBonus = 0) {
  const starting = squad2.players.filter((p) => squad2.lineup.includes(p.id));
  if (starting.length === 0) return 50;
  const sum = starting.reduce((acc, p) => acc + rating(p), 0);
  let bonus = externalBonus + 3;
  if (starting.some((p) => p.trait === "Leader")) bonus += 2;
  return Math.round(sum / Math.max(11, starting.length) + bonus);
}
function wageBill(squad2) {
  return squad2.players.reduce((sum, p) => sum + p.wage, 0);
}
function applyPostMatch(squad2, rng, opts = {}) {
  const c = squadContent;
  const loss = Math.max(2, Math.round(c.fitnessLossPerMatch * (opts.fitnessLossMultiplier ?? 1)));
  const outcome = { injuries: [], recovered: [] };
  for (const p of squad2.players) {
    if (squad2.lineup.includes(p.id)) {
      p.fitness = Math.max(10, p.fitness - loss);
    } else {
      p.fitness = Math.min(100, p.fitness + c.fitnessRecoveryPerMatch);
    }
    if (p.injured > 0) {
      p.injured -= 1;
      if (p.injured === 0) outcome.recovered.push(p);
    }
    if (p.suspended > 0) p.suspended -= 1;
  }
  const baseRisk = c.injuryBaseRisk * (opts.injuryRiskMultiplier ?? 1);
  for (const p of squad2.players) {
    if (!squad2.lineup.includes(p.id) || p.injured > 0) continue;
    const risk = baseRisk * (p.fitness < c.tiredFitnessThreshold ? c.tiredInjuryMultiplier : 1);
    if (rng.chance(risk)) {
      const matchdays = rng.int(1, 6);
      p.injured = matchdays;
      outcome.injuries.push({ player: p, matchdays });
    }
  }
  if (outcome.injuries.length > 0) {
    squad2.lineup = autoLineup(squad2);
  }
  return outcome;
}
const POSITIONS = ["TW", "ABW", "MIT", "ST"];
const PlayerSchema = z.object({
  id: z.string(),
  name: z.string(),
  pos: z.enum(POSITIONS),
  strength: z.number().int().min(1).max(99),
  fitness: z.number().int().min(0).max(100),
  morale: z.number().int().min(0).max(100),
  age: z.number().int().min(15).max(45),
  marketValue: z.number().min(0),
  wage: z.number().min(0),
  trait: z.string(),
  injured: z.number().int().min(0),
  suspended: z.number().int().min(0),
  individualFocus: z.string()
});
const SquadSchema = z.object({
  players: z.array(PlayerSchema),
  lineup: z.array(z.string()),
  captainId: z.string().nullable()
});
function createSquad(rng) {
  const players = [];
  for (const [pos, count, min, max] of squadContent.startingSquad) {
    for (let i = 0; i < count; i++) {
      players.push(createPlayer(rng, pos, min, max));
    }
  }
  return { players, lineup: [], captainId: null };
}
const SQUAD_VERSION = 1;
const squadDocs = defineDocs({
  "squad.strength": {
    label: "Stärke",
    tooltip: "Das Grundniveau eines Spielers, 1 bis 99. Ändert sich nur langsam durch Training und Alter.",
    why: "Die eine Zahl, an der sich Marktwert, Gehalt und Teamstärke aufhängen — bewusst simpel gehalten, damit der Spieler Entscheidungen abschätzen kann.",
    since: "0.1.0",
    related: ["squad.fitness", "squad.marketValue"]
  },
  "squad.fitness": {
    label: "Fitness",
    tooltip: "Frische, 0 bis 100. Einsätze kosten Fitness, Bankdrücken bringt sie zurück. Unter 55 steigt das Verletzungsrisiko deutlich.",
    why: "Erzwingt Rotation. Ohne Fitness würde man immer dieselbe beste Elf aufstellen und der Kader hätte keine Bedeutung.",
    since: "0.1.0",
    related: ["squad.injury", "squad.autoLineup"],
    screenshot: "squad-list"
  },
  "squad.morale": {
    label: "Moral",
    tooltip: "Die Stimmung eines Spielers, 0 bis 100. Beeinflusst Leistung und Vertragsverhandlungen.",
    why: "Gibt Spielzeit und Erfolg eine zweite Konsequenz neben der reinen Fitness.",
    since: "0.1.0",
    related: ["squad.fitness"]
  },
  "squad.marketValue": {
    label: "Marktwert",
    tooltip: "Was andere Vereine für den Spieler zahlen würden. Steigt überproportional mit der Stärke.",
    why: "Die Kurve ist bewusst steil: die letzten Stärkepunkte sind unbezahlbar teuer, damit Topspieler eine echte Entscheidung bleiben.",
    since: "0.1.0",
    related: ["squad.strength", "squad.wage"]
  },
  "squad.wage": {
    label: "Gehalt",
    tooltip: "Was der Spieler pro Spieltag kostet. Wird jeden Spieltag automatisch abgebucht.",
    why: "Macht einen teuren Kader zur Dauerbelastung statt zu einer einmaligen Ausgabe — der häufigste Weg, sich in diesem Spiel zu ruinieren.",
    since: "0.1.0",
    related: ["finance.wageBudget", "squad.marketValue"]
  },
  "squad.injury": {
    label: "Verletzung",
    tooltip: "Verbleibende Spieltage, die der Spieler ausfällt. Verletzte Spieler werden automatisch aus der Aufstellung genommen.",
    manual: "## Verletzungen\n\nJeder Spieler der Startelf hat pro Spiel ein Grundrisiko, sich zu verletzen. Wer mit niedriger Fitness aufläuft, verletzt sich deutlich häufiger — das ist der Hauptgrund, den Kader zu rotieren.\n\nVerletzte Spieler werden sofort aus der Aufstellung entfernt und die Elf wird automatisch neu besetzt. Die Genesung läuft pro Spieltag ab, unabhängig davon, ob gespielt wurde.",
    why: "Bestraft es, den Kader zu dünn zu halten, und macht Ersatzspieler wertvoll, ohne dass man sie ständig aufstellen müsste.",
    since: "0.1.0",
    related: ["squad.fitness", "squad.suspension"],
    screenshot: "squad-injured"
  },
  "squad.suspension": {
    label: "Sperre",
    tooltip: "Verbleibende Spieltage Sperre nach einer Roten Karte.",
    why: "Zweite Quelle für unfreiwillige Ausfälle, die nicht durch Rotation vermeidbar ist.",
    since: "0.1.0",
    related: ["squad.injury"]
  },
  "squad.autoLineup": {
    label: "Elf automatisch aufstellen",
    tooltip: "Stellt die stärkste verfügbare Elf in einer 4-4-2-Grundordnung auf, gewichtet nach Stärke und Fitness.",
    why: "Nimmt dem Spieler die Fleißarbeit ab, ohne die Entscheidung zu ersetzen — man kann jederzeit von Hand nachbessern.",
    since: "0.1.0",
    related: ["squad.fitness"],
    screenshot: "squad-lineup"
  },
  "squad.captain": {
    label: "Kapitän",
    tooltip: 'Der Spielführer. Spieler mit der Eigenschaft "Leader" geben der Mannschaft einen zusätzlichen Bonus.',
    why: "Gibt Charakter-Eigenschaften eine sichtbare taktische Konsequenz.",
    since: "0.1.0",
    related: ["squad.strength"]
  }
});
const squad = defineModule({
  id: "squad",
  title: "Kader",
  summary: "Spieler, Aufstellung, Fitness, Verletzungen und die Gehaltsabrechnung.",
  nav: { group: "Sport", icon: "👥", order: 10, primary: true },
  requires: ["finance"],
  state: { schema: SquadSchema, create: createSquad, version: SQUAD_VERSION },
  hooks: {
    matchday: [
      {
        phase: "post",
        run({ state, rng, emit, provide }) {
          const squad2 = state.modules.squad;
          if (squad2.lineup.length < 11) squad2.lineup = autoLineup(squad2);
          const outcome = applyPostMatch(squad2, rng, {
            injuryRiskMultiplier: 1,
            fitnessLossMultiplier: 1
          });
          provide("squad.strength", teamStrength(squad2));
          for (const { player, matchdays } of outcome.injuries) {
            emit({
              source: "squad",
              severity: "bad",
              title: `${player.name} verletzt`,
              detail: `${player.pos} — fällt ${matchdays} Spieltag(e) aus. Die Elf wurde automatisch angepasst.`,
              goto: "squad"
            });
          }
          for (const player of outcome.recovered) {
            emit({
              source: "squad",
              severity: "good",
              title: `${player.name} ist zurück`,
              detail: "Wieder einsatzbereit.",
              goto: "squad"
            });
          }
        }
      },
      {
        /** Wages are an economy cost, deliberately separate from the sporting
            post-match effects above. Two phases, one module, no coupling. */
        phase: "economy",
        order: 20,
        run({ state, emit }) {
          const squad2 = state.modules.squad;
          const bill = wageBill(squad2);
          post(state.modules.finance, {
            season: state.meta.season,
            matchday: state.meta.matchday,
            source: "squad",
            reason: "Spielergehälter",
            amount: -bill
          });
          if (bill > state.modules.finance.wageBudget) {
            emit({
              source: "squad",
              severity: "warn",
              title: "Gehaltsbudget überschritten",
              detail: "Die Differenz zahlt der Verein aus dem laufenden Konto.",
              amount: -bill,
              goto: "squad"
            });
          }
        }
      }
    ]
  },
  screen: () => import("./Screen2.js"),
  docs: squadDocs
});
const BlockSchema = z.object({
  name: z.string(),
  cap: z.number().int().min(0),
  foodLvl: z.number().int().min(0).max(3),
  merchLvl: z.number().int().min(0).max(3),
  toiletLvl: z.number().int().min(0).max(3),
  addSeats: z.number().int().min(0),
  cost: z.number().int().min(0)
});
const StadiumSchema = z.object({
  blocks: z.record(z.string(), BlockSchema),
  ticketPrices: z.object({
    steh: z.number().min(0),
    sitz: z.number().min(0),
    vip: z.number().min(0)
  }),
  fans: z.number().min(0).max(100),
  flutlicht: z.boolean(),
  rasenheizung: z.boolean(),
  videowalls: z.boolean(),
  dach: z.boolean()
});
function createStadium(_rng) {
  return {
    blocks: {
      haupt: {
        name: "Nord-Unterrang",
        cap: 2e3,
        foodLvl: 0,
        merchLvl: 0,
        toiletLvl: 0,
        addSeats: 500,
        cost: 16e4
      },
      hauptNord: {
        name: "Nord-Oberrang",
        cap: 1500,
        foodLvl: 0,
        merchLvl: 0,
        toiletLvl: 0,
        addSeats: 500,
        cost: 14e4
      },
      kurve: {
        name: "Südtribüne (Ultras)",
        cap: 3e3,
        foodLvl: 0,
        merchLvl: 0,
        toiletLvl: 0,
        addSeats: 1e3,
        cost: 13e4
      },
      suedOber: {
        name: "Süd-Oberrang",
        cap: 1500,
        foodLvl: 0,
        merchLvl: 0,
        toiletLvl: 0,
        addSeats: 500,
        cost: 14e4
      },
      gegen: {
        name: "Ost-Gegengerade",
        cap: 3e3,
        foodLvl: 0,
        merchLvl: 0,
        toiletLvl: 0,
        addSeats: 1e3,
        cost: 21e4
      },
      west: {
        name: "West-Haupttribüne",
        cap: 2e3,
        foodLvl: 0,
        merchLvl: 0,
        toiletLvl: 0,
        addSeats: 500,
        cost: 18e4
      },
      vipLogen: {
        name: "VIP-Logen",
        cap: 50,
        foodLvl: 0,
        merchLvl: 0,
        toiletLvl: 0,
        addSeats: 25,
        cost: 95e3
      },
      gaeste: {
        name: "Gäste-Block",
        cap: 1500,
        foodLvl: 0,
        merchLvl: 0,
        toiletLvl: 0,
        addSeats: 500,
        cost: 85e3
      }
    },
    ticketPrices: { steh: 12, sitz: 24, vip: 80 },
    fans: 75,
    flutlicht: false,
    rasenheizung: false,
    videowalls: false,
    dach: false
  };
}
const STADIUM_VERSION = 1;
function capacity(stadium2) {
  return Object.values(stadium2.blocks).reduce((sum, b) => sum + b.cap, 0);
}
function vipCapacity(stadium2) {
  return stadium2.blocks.vipLogen?.cap ?? 50;
}
function attendanceFactor(stadium2) {
  let totalComfort = 0;
  for (const b of Object.values(stadium2.blocks)) {
    totalComfort += (b.foodLvl + b.merchLvl + b.toiletLvl) / 9;
  }
  const avgComfortBonus = 0.9 + totalComfort / 8 * 0.2;
  return clamp(stadium2.fans / 100 * avgComfortBonus, 0.3, 1.2);
}
function attendance(stadium2) {
  return Math.round(capacity(stadium2) * attendanceFactor(stadium2));
}
function ticketIncome(stadium2) {
  const att = attendance(stadium2);
  const p = stadium2.ticketPrices;
  return Math.round(att * 0.5 * p.steh + att * 0.45 * p.sitz + vipCapacity(stadium2) * p.vip);
}
function expansionQuote(stadium2, blockId) {
  const block = stadium2.blocks[blockId];
  if (!block) return void 0;
  return { cost: block.cost, seats: block.addSeats, newCap: block.cap + block.addSeats };
}
function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}
const stadiumDocs = defineDocs({
  "stadium.capacity": {
    label: "Kapazität",
    tooltip: "Gesamtzahl der Plätze über alle Blöcke. Bestimmt die Obergrenze deiner Zuschauereinnahmen.",
    why: "Der Ausbau ist die klassische Wachstumsinvestition: teuer, langsam, aber dauerhaft — und der einzige Weg, Ticketeinnahmen wirklich zu skalieren.",
    since: "0.1.0",
    related: ["stadium.attendance", "stadium.expand"],
    screenshot: "stadium-overview"
  },
  "stadium.attendance": {
    label: "Auslastung",
    tooltip: "Wie voll das Stadion tatsächlich wird — zwischen 30% und 120% der Kapazität.",
    why: "Koppelt sportlichen Erfolg an Geld: gute Stimmung füllt das Stadion, und ein volles Stadion finanziert die nächste Verstärkung.",
    since: "0.1.0",
    related: ["stadium.fans", "stadium.comfort"]
  },
  "stadium.fans": {
    label: "Fan-Zufriedenheit",
    tooltip: "Die Stimmung im Umfeld, 0 bis 100. Der stärkste Einzelfaktor für die Auslastung.",
    why: "Gibt Niederlagenserien eine wirtschaftliche Konsequenz, statt sie nur in der Tabelle sichtbar zu machen.",
    since: "0.1.0",
    related: ["stadium.attendance"]
  },
  "stadium.comfort": {
    label: "Komfort-Ausbau",
    tooltip: "Gastronomie, Fanshops und Sanitär je Block. Hebt die Auslastung um bis zu 10%.",
    why: "Eine kleine, günstige Optimierung neben dem teuren Platzausbau — damit es auch für kleine Vereine eine sinnvolle Investition gibt.",
    since: "0.1.0",
    related: ["stadium.expand"]
  },
  "stadium.expand": {
    label: "Block ausbauen",
    tooltip: "Erweitert diesen Block dauerhaft um zusätzliche Plätze. Wird sofort vom Vereinskonto abgebucht.",
    manual: "## Stadionausbau\n\nJeder Block lässt sich einzeln erweitern. Die Kosten fallen sofort an, die Mehreinnahmen kommen ab dem nächsten Heimspiel — der Ausbau rechnet sich also erst über mehrere Spieltage.\n\nEin Ausbau lohnt sich vor allem dann, wenn die Auslastung dauerhaft hoch ist. Bei schlechter Stimmung baust du leere Ränge.",
    why: "Zwingt zu einer echten Timing-Entscheidung: zu früh ausbauen bindet Geld in leeren Plätzen, zu spät verschenkt Einnahmen.",
    since: "0.1.0",
    related: ["stadium.capacity", "finance.balance"],
    screenshot: "stadium-expand-sheet"
  },
  "stadium.ticketPrices": {
    label: "Ticketpreise",
    tooltip: "Preise für Steh-, Sitz- und VIP-Plätze. Höhere Preise bringen mehr pro Zuschauer, drücken aber die Stimmung.",
    why: "Der direkteste Hebel zwischen kurzfristigem Geld und langfristiger Fanbindung.",
    since: "0.1.0",
    related: ["stadium.fans"]
  }
});
const stadium = defineModule({
  id: "stadium",
  title: "Stadion",
  summary: "Ausbau, Komfort, Ticketpreise und die Zuschauereinnahmen jedes Heimspiels.",
  nav: { group: "Verein", icon: "🏟️", order: 20 },
  requires: ["finance"],
  state: { schema: StadiumSchema, create: createStadium, version: STADIUM_VERSION },
  hooks: {
    matchday: {
      phase: "economy",
      order: 10,
      run({ state, emit, provide }) {
        const stadium2 = state.modules.stadium;
        const { season, matchday } = state.meta;
        const att = attendance(stadium2);
        const income = ticketIncome(stadium2);
        post(state.modules.finance, {
          season,
          matchday,
          source: "stadium",
          reason: "Zuschauereinnahmen",
          amount: income
        });
        provide("stadium.attendance", att);
        emit({
          source: "stadium",
          severity: "good",
          title: `${att.toLocaleString("de-DE")} Zuschauer`,
          detail: `${Math.round(att / Math.max(1, capacity(stadium2)) * 100)}% Auslastung`,
          amount: income,
          goto: "stadium"
        });
      }
    }
  },
  screen: () => import("./Screen3.js"),
  docs: stadiumDocs
});
const modules = [
  core,
  finance,
  squad,
  stadium
];
const MAX_SNAPSHOTS = 12;
const history = { entries: [] };
const canUndo = () => history.entries.length > 0;
function pushSnapshot(game2) {
  history.entries.push({
    tick: game2.meta.tick,
    season: game2.meta.season,
    matchday: game2.meta.matchday,
    state: snapshot(game2)
  });
  if (history.entries.length > MAX_SNAPSHOTS) history.entries.shift();
}
function popSnapshot() {
  return history.entries.pop()?.state;
}
function clearHistory() {
  history.entries.length = 0;
}
const registry = new Registry(modules);
installDocs(registry.docs());
function freshMeta(seed) {
  return {
    seed,
    rngCursor: 0,
    season: 1,
    matchday: 1,
    tick: 0,
    createdAt: Date.now(),
    lastPlayedAt: Date.now()
  };
}
function createGame(seedText = String(Date.now())) {
  const seed = seedFrom(seedText);
  const rng = createRng(seed);
  const moduleStates = {};
  for (const m of registry.all) {
    moduleStates[m.id] = m.state.create(rng.fork(m.id));
  }
  return { meta: freshMeta(seed), modules: moduleStates };
}
const game = createGame("anstoss-dev");
const lastTick = { result: null };
function advance(kind = "matchday") {
  pushSnapshot(game);
  const result = runTick(registry, game, kind);
  lastTick.result = result;
  return result;
}
function replaceGame(next) {
  game.meta = next.meta;
  game.modules = next.modules;
  clearHistory();
  lastTick.result = null;
}
export {
  attendance as a,
  canUndo as b,
  capacity as c,
  advance as d,
  replaceGame as e,
  formatMoney as f,
  game as g,
  breakdown as h,
  rating as i,
  isAvailable as j,
  autoLineup as k,
  lastTick as l,
  matchdayNet as m,
  attendanceFactor as n,
  ticketIncome as o,
  popSnapshot as p,
  expansionQuote as q,
  registry as r,
  post as s,
  teamStrength as t,
  doc as u,
  docLabel as v,
  wageBill as w
};
