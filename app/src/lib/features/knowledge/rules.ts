import type { FxKey, KnowledgeNode } from './content';
import {
  knowledgeNodes, nodeById, tierCost, leagueCostMultiplier, doctrineIds, FLAG_KEYS
} from './content';
import type { KnowledgeState } from './state';

/**
 * How a node's effect reaches the game.
 *
 * This table is the whole reason the tree is not decoration. The content names
 * effects in the game's own language — `transferDiscount`, `injuryRisk` — while
 * the modifier bus names them by their consumer: `squad.injuryRisk`,
 * `matchday.homeStrength`. Those two vocabularies had NO overlap at all when
 * the tree landed: measured, zero of fifty-three keys, which means all 140
 * nodes would have been purchasable upgrades that changed nothing.
 *
 * So a node's effect is live only when its key appears here AND the bus key it
 * maps to has a declared consumer. Both halves are checked; see `dormancyOf`.
 *
 * `total` keys are absolute (+3 strength). `factor` keys are fractional deltas
 * the way the content's own labels read them — `-0.15` renders as "15% less"
 * and is applied as a multiplier of `0.85`.
 */
/**
 * Four arities, because three of them summed would be wrong.
 *
 *  - `total`    absolute and additive. Two +2s make +4.
 *  - `factor`   a fractional delta the way the content's labels read it:
 *               `+0.15` renders "15% more" and applies as `× 1.15`.
 *  - `discount` the same, inverted, for keys whose label already says minus —
 *               `transferDiscount: 0.08` reads "−8% Ablösesummen" and must
 *               apply as `× 0.92`. Treating it as a factor would make every
 *               discount node RAISE the fee it advertises reducing.
 *  - `max`      a floor. `moraleFloor: 60` means morale never drops below 60,
 *               and two such nodes at 50 and 60 give a floor of 60 — not 110.
 *               Summing a floor is the arity bug that looks like it works.
 */
export interface Effect {
  key: string;
  arity: 'factor' | 'total' | 'discount' | 'max';
}

export const EFFECTS: Partial<Record<FxKey, Effect>> = {
  strength:          { key: 'squad.strengthBonus',        arity: 'total' },
  homeStrength:      { key: 'matchday.homeStrength',      arity: 'total' },
  fitnessLoss:       { key: 'squad.fitnessLoss',          arity: 'factor' },
  injuryRisk:        { key: 'squad.injuryRisk',           arity: 'factor' },
  injuryDuration:    { key: 'squad.injuryDuration',       arity: 'factor' },
  onlineBoost:       { key: 'merch.online',               arity: 'factor' },
  sponsorMod:        { key: 'sponsors.income',            arity: 'factor' },
  goalChance:        { key: 'matchday.goalChanceBonus',   arity: 'factor' },
  moraleFloor:       { key: 'squad.moraleFloor',          arity: 'max' },
  wageMod:           { key: 'squad.wageBill',             arity: 'factor' },
  transferDiscount:  { key: 'transfer.feeFactor',         arity: 'discount' },
  merchDemand:       { key: 'merch.demand',               arity: 'factor' },
  merchMargin:       { key: 'merch.margin',               arity: 'factor' },
  fanGain:           { key: 'stadium.fanGain',            arity: 'total' },
  devPerSeason:      { key: 'training.devPerSeason',      arity: 'total' },

  /*
   * The second wiring pass. Every key below already had a module that could
   * read it — the sentence between the two vocabularies had simply never been
   * written, so 117 of 140 nodes sat visibly locked and the tree read as a
   * fraction of the prototype it came from. Eric noticed before any of us did:
   * "the whole doctrine system looks much better on the index.html, it feels
   * more full."
   *
   * The gate was right and the answer was never to open it. The answer was to
   * make the nodes true.
   */
  opsIncome:         { key: 'finance.opsIncome',          arity: 'total' },
  opexMod:           { key: 'finance.opex',               arity: 'factor' },
  oppPenalty:        { key: 'league.opponentPenalty',     arity: 'total' },
  awayStrength:      { key: 'matchday.awayStrength',      arity: 'total' },
  suspensionMod:     { key: 'squad.suspension',           arity: 'factor' },
  matDiscount:       { key: 'industry.materialPrice',     arity: 'discount' },
  matEfficiency:     { key: 'industry.materialUse',       arity: 'discount' },
  factoryOutput:     { key: 'industry.output',            arity: 'factor' },
  youthStr:          { key: 'youth.startStrength',        arity: 'total' },
  youthCount:        { key: 'youth.perSeason',            arity: 'total' },
  scoutQuality:      { key: 'youth.scoutQuality',         arity: 'factor' },
  scoutCost:         { key: 'youth.scoutCost',            arity: 'factor' },
  scoutCount:        { key: 'youth.scoutCount',           arity: 'total' },
  ticketRevenue:     { key: 'stadium.ticketRevenue',      arity: 'factor' },
  stadiumCostMod:    { key: 'stadium.buildCost',          arity: 'factor' },
  fanFloor:          { key: 'stadium.fanFloor',           arity: 'max' },
  transferBudgetMod: { key: 'finance.transferBudget',     arity: 'factor' },
  sellBonus:         { key: 'transfer.saleValue',         arity: 'factor' },
  valueBoost:        { key: 'squad.marketValue',          arity: 'factor' },
  youthPot:          { key: 'training.youthCeiling',      arity: 'total' },

  /*
   * The third pass: Ermittlungsdruck and the boardroom.
   *
   * `pressureMod` maps to `press.suspicion` rather than to `press.pressure`
   * because the doctrine does not set the meter, it adds to what the Verband
   * has reason to wonder about. The meter is what press makes of that, and
   * press publishes it back out under its own name — one key for what goes in,
   * one for what comes out, and no chance of a node appearing to overwrite a
   * reading it only nudges.
   *
   * `boardFloor` is `max` and not `total` for the reason the arity note gives:
   * two nodes promising trust never falls below 30 and below 40 promise a
   * floor of 40. Summed, they would promise 70, and a node whose German says
   * "fällt nie unter 40 %" has to be literally true or the tree is lying in
   * the one place the player is reading it carefully.
   */
  pressureMod:       { key: 'press.suspicion',            arity: 'total' },
  penaltyMod:        { key: 'press.penalty',              arity: 'factor' },
  boardFloor:        { key: 'board.floor',                arity: 'max' },
  boardGain:         { key: 'board.trust',                arity: 'total' }
};

/** Every bus key this module can write. Declared statically on the hook. */
export const CONTRIBUTED = [...new Set(Object.values(EFFECTS).map((e) => e!.key))];

/**
 * Information unlocks and effect bundles that some screen actually reads.
 *
 * Deliberately empty, and deliberately explicit. A node whose only effect is a
 * `reveal` was passing the gate as "informational, therefore live" — five of
 * them — even though nothing in the game reads a reveal yet. That is the same
 * failure the gate exists to prevent, waved through by the gate itself: an
 * upgrade sold for real money that shows the player nothing new.
 *
 * When a screen starts honouring one, add its key here and the nodes that carry
 * it become purchasable. These cannot be derived from the registry the way bus
 * keys can, because a reveal is consumed by a component rather than by a hook —
 * so this list is the one place in the gate that must be maintained by hand,
 * and it is short on purpose.
 */
export const REVEALS_READ: ReadonlySet<string> = new Set();

/**
 * Bus keys a SCREEN honours directly, outside any tick.
 *
 * The context bus lives for exactly one tick, so an action the player takes by
 * clicking — buying a material, scouting a prospect, paying for a stand — can
 * never read it. Those screens call `ownedEffects` instead, which is legitimate
 * because knowledge is the only producer of these keys and the call is a plain
 * cross-feature import like `postToLedger`.
 *
 * But `consumedKeys()` reads hook declarations, so it cannot see a screen. This
 * list is how the gate learns about them — the same hand-kept exception as
 * `REVEALS_READ`, and for the same reason: a consumer that is not a hook cannot
 * be derived from the registry.
 *
 * Anything added here MUST actually be read by a screen. It is the one place in
 * the gate where a lie is possible, so keep it short and check it.
 */
export const SCREEN_READ: ReadonlySet<string> = new Set([
  'industry.materialPrice',
  'youth.scoutQuality',
  'youth.scoutCost',
  'youth.scoutCount',
  'stadium.buildCost',
  'transfer.saleValue'
]);
export const GRANTS_READ: ReadonlySet<string> = new Set();

export type Dormancy = 'live' | 'unmapped' | 'unread' | 'inert';

/**
 * Why a node cannot be bought yet, or `live` when it can.
 *
 * Four answers rather than a boolean, because "not yet wired" and "wired to
 * something nobody reads" are different jobs for whoever fixes it:
 *
 *  - `unmapped` — an fx key with no entry in EFFECTS. Someone must decide which
 *    bus key it belongs to and whether it multiplies or adds.
 *  - `unread`  — mapped, but the bus key has no declared consumer. The feature
 *    that would read it does not exist yet, or does not ask for it.
 *  - `inert`   — no effects at all. A node that does nothing by construction.
 */
export function dormancyOf(node: KnowledgeNode, consumed: ReadonlySet<string>): Dormancy {
  const fx = Object.keys(node.fx ?? {}) as FxKey[];
  const flags = node.flags ?? [];
  const reveals = node.reveal ?? [];
  const grants = node.grants ? [node.grants] : [];
  const informational = reveals.length > 0 || grants.length > 0;

  if (fx.length === 0 && flags.length === 0 && !informational) return 'inert';
  if (reveals.some((r) => !REVEALS_READ.has(r))) return 'unread';
  if (grants.some((g) => !GRANTS_READ.has(g))) return 'unread';
  if (fx.length === 0 && flags.length === 0) return 'live';

  /*
   * `unmapped` is checked FIRST because it is the more fundamental problem: a
   * key with no bus mapping cannot be read by anyone, whereas an unread key at
   * least knows where it wants to go. Checking flags first hid that — a node
   * with both an unread flag and an unmapped key reported `unread`, sending
   * whoever fixed it to wire a consumer for a key that had no destination.
   */
  if (fx.some((k) => !EFFECTS[k])) return 'unmapped';
  // A flag is idempotent and never summed, so it needs a reader of its own name.
  if (flags.some((f) => !consumed.has(f))) return 'unread';
  const reachable = (key: string) => consumed.has(key) || SCREEN_READ.has(key);
  if (fx.some((k) => !reachable(EFFECTS[k]!.key))) return 'unread';
  return 'live';
}

export function isLive(node: KnowledgeNode, consumed: ReadonlySet<string>): boolean {
  return dormancyOf(node, consumed) === 'live';
}

/** How many nodes of a doctrine the club owns. Drives `minRank` and `gate`. */
export function rankOf(state: KnowledgeState, doctrine: string): number {
  return state.owned.filter((id) => nodeById.get(id)?.doctrine === doctrine).length;
}

export function ranks(state: KnowledgeState): Record<string, number> {
  const out: Record<string, number> = {};
  for (const d of doctrineIds) out[d] = rankOf(state, d);
  return out;
}

/**
 * What a node costs, here, now.
 *
 * Wissenspunkte are flat — they are the scarcity that makes the tree a set of
 * refusals, and a refusal that costs a rich club less is not a refusal. Money
 * scales by division, so the bite stays constant across a fortyfold spread of
 * starting balances. See `leagueCostMultiplier`.
 */
export function costOf(node: KnowledgeNode, leagueLevel: number): { points: number; money: number } {
  const [points, money] = tierCost[node.tier] ?? [1, 0];
  const mult = leagueCostMultiplier[leagueLevel] ?? 1;
  return { points, money: Math.round(money * mult * (node.costMult ?? 1)) };
}

export interface BuyCheck {
  ok: boolean;
  /** Why not, in the player's words. Empty when ok. */
  reason: string;
}

export function canBuy(
  state: KnowledgeState,
  node: KnowledgeNode,
  opts: { money: number; leagueLevel: number; consumed: ReadonlySet<string> }
): BuyCheck {
  if (state.owned.includes(node.id)) return { ok: false, reason: 'Bereits erforscht.' };

  /*
   * The dormancy gate. A node whose effect reaches nothing must not be for
   * sale — it would be the "computed, correct, connected to nothing" failure
   * charged to the player at up to €750.000 a node.
   */
  if (!isLive(node, opts.consumed)) {
    return { ok: false, reason: 'Noch nicht verfügbar — die Wirkung greift im Spiel noch nicht.' };
  }

  const missing = node.req.filter((r) => !state.owned.includes(r));
  if (missing.length > 0) {
    const names = missing.map((id) => nodeById.get(id)?.name ?? id).join(', ');
    return { ok: false, reason: `Setzt voraus: ${names}.` };
  }

  if (node.minRank && rankOf(state, node.doctrine) < node.minRank) {
    return { ok: false, reason: `Erfordert Rang ${node.minRank} in dieser Doktrin.` };
  }

  if (node.gate && node.pair) {
    const [a, b] = node.pair;
    if (rankOf(state, a) < node.gate || rankOf(state, b) < node.gate) {
      return { ok: false, reason: `Erfordert Rang ${node.gate} in beiden Doktrinen.` };
    }
  }

  const cost = costOf(node, opts.leagueLevel);
  if (state.points < cost.points) {
    const word = cost.points === 1 ? 'Wissenspunkt' : 'Wissenspunkte';
    return { ok: false, reason: `${cost.points} ${word} nötig, ${state.points} vorhanden.` };
  }
  if (opts.money < cost.money) {
    return { ok: false, reason: 'Der Verein kann sich das gerade nicht leisten.' };
  }

  return { ok: true, reason: '' };
}

/** All the fx a club's owned nodes add up to. */
export function ownedEffects(state: KnowledgeState): { totals: Map<string, number>; factors: Map<string, number> } {
  const totals = new Map<string, number>();
  const factors = new Map<string, number>();

  for (const id of state.owned) {
    const node = nodeById.get(id);
    if (!node) continue;
    for (const [rawKey, value] of Object.entries(node.fx ?? {})) {
      const effect = EFFECTS[rawKey as FxKey];
      if (!effect || typeof value !== 'number') continue;
      switch (effect.arity) {
        case 'total':
          totals.set(effect.key, (totals.get(effect.key) ?? 0) + value);
          break;
        case 'max':
          // A floor. The highest one wins; they do not stack.
          totals.set(effect.key, Math.max(totals.get(effect.key) ?? 0, value));
          break;
        case 'discount':
          factors.set(effect.key, (factors.get(effect.key) ?? 1) * (1 - value));
          break;
        default:
          factors.set(effect.key, (factors.get(effect.key) ?? 1) * (1 + value));
      }
    }
  }
  return { totals, factors };
}

/** Which flags the club has switched on. Idempotent — never counted. */
export function ownedFlags(state: KnowledgeState): Set<string> {
  const on = new Set<string>();
  for (const id of state.owned) {
    for (const flag of nodeById.get(id)?.flags ?? []) on.add(flag);
  }
  return on;
}

export function hasFlag(state: KnowledgeState, flag: (typeof FLAG_KEYS)[number]): boolean {
  return ownedFlags(state).has(flag);
}

/** The tree, split by what can be bought. For the screen and for the report. */
export function census(consumed: ReadonlySet<string>): Record<Dormancy, number> {
  const out: Record<Dormancy, number> = { live: 0, unmapped: 0, unread: 0, inert: 0 };
  for (const node of knowledgeNodes) out[dormancyOf(node, consumed)]++;
  return out;
}

/** One reason nodes are dormant, and how many wait on it. */
export interface Blocker {
  /** What to build. `fx:pressureMod` needs an EFFECTS entry; the rest need a reader. */
  need: string;
  kind: 'unmapped' | 'unread';
  /** How many nodes this one decision would unblock, in whole or in part. */
  nodes: string[];
}

/**
 * The census says HOW MANY nodes are dormant. This says WHAT TO BUILD.
 *
 * Sorted by node count, because that is the ordering question and it is not
 * one anybody can answer by reading the tree. Sixty dormant nodes looks like
 * sixty problems; it is eighteen, and the top two are worth twenty-four
 * between them. We picked the next two systems off this list rather than off
 * an argument about which sounded more fun, and the list disagreed with the
 * argument.
 *
 * A node appears under every blocker it has, so the counts overlap and do not
 * sum to the dormant total. That is deliberate — clearing one key can leave a
 * node dormant on another, and a blocker that only ever appears alongside a
 * bigger one is worth knowing about before you schedule it alone.
 */
export function blockers(consumed: ReadonlySet<string>): Blocker[] {
  const found = new Map<string, Blocker>();
  const note = (need: string, kind: Blocker['kind'], id: string) => {
    const b = found.get(need) ?? { need, kind, nodes: [] };
    b.nodes.push(id);
    found.set(need, b);
  };

  for (const node of knowledgeNodes) {
    if (dormancyOf(node, consumed) === 'live') continue;
    for (const key of Object.keys(node.fx ?? {}) as FxKey[]) {
      const effect = EFFECTS[key];
      if (!effect) note(`fx:${key}`, 'unmapped', node.id);
      else if (!consumed.has(effect.key) && !SCREEN_READ.has(effect.key))
        note(effect.key, 'unread', node.id);
    }
    for (const flag of node.flags ?? []) {
      if (!consumed.has(flag)) note(`flag:${flag}`, 'unread', node.id);
    }
    for (const reveal of node.reveal ?? []) {
      if (!REVEALS_READ.has(reveal)) note(`reveal:${reveal}`, 'unread', node.id);
    }
    if (node.grants && !GRANTS_READ.has(node.grants)) {
      note(`grant:${node.grants}`, 'unread', node.id);
    }
  }

  return [...found.values()].sort(
    (a, b) => b.nodes.length - a.nodes.length || a.need.localeCompare(b.need)
  );
}

/**
 * Research a node. Deducts both currencies and records it.
 *
 * Takes the finance state rather than a number so the money leaves through the
 * ledger like every other cost in the game — a purchase that silently
 * decremented a balance would be invisible in the one place the player looks to
 * understand where their money went.
 */
export function research(
  state: KnowledgeState,
  node: KnowledgeNode,
  leagueLevel: number,
  charge: (amount: number, reason: string) => void
): boolean {
  const cost = costOf(node, leagueLevel);
  state.points -= cost.points;
  state.owned.push(node.id);
  if (cost.money > 0) charge(-cost.money, `Doktrin: ${node.name}`);
  return true;
}
