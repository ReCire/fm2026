import type { Player, SquadState } from '../squad/state';
import { strengthOf } from '../squad/rules';
import { contractsContent } from './content';

/**
 * Contract rules. Pure functions over plain data.
 *
 * Nothing here needs an `rng` — a renewal is a negotiation with a formula, not
 * a die roll, and the weekly countdown is arithmetic. That is also why this
 * feature has no `rng.chance` anywhere: every number a player sees is exactly
 * reproducible from the state alone.
 */

/**
 * How much extra wage a renewal costs, as a factor on top of the current wage.
 *
 * Three forces: a flat baseline, a premium for being good, and a premium for
 * being young — offset by a discount for being old. Clamped so a renewal is
 * never free money (a terrible, ancient player still costs something to keep)
 * and never a guaranteed ruin (even a superstar has a ceiling on how much one
 * more deal can cost).
 */
export function demandFactor(player: Player): number {
  const c = contractsContent;
  const strength = strengthOf(player);

  let factor = c.baseDemand;
  if (strength > c.demandStrengthFrom) {
    factor += (strength - c.demandStrengthFrom) * c.demandPerStrengthPoint;
  }
  if (player.age < c.demandAgeUnder) {
    factor += (c.demandAgeUnder - player.age) * c.demandPerYearYoung;
  }
  if (player.age > c.demandAgeOver) {
    factor -= (player.age - c.demandAgeOver) * c.demandDiscountPerYearOld;
  }

  return Math.max(c.minDemandFactor, Math.min(c.maxDemandFactor, factor));
}

export interface RenewalQuote {
  matchdays: number;
  label: string;
  doc: string;
  /** For display: how much this renewal raises the wage, e.g. 0.18 = +18%. */
  demandFactor: number;
  /** The wage the player carries once this renewal is signed. */
  newWage: number;
  /** One-off cost, charged immediately. */
  fee: number;
}

/**
 * What each renewal on offer would cost and pay, for the player currently
 * standing in front of you. Read-only — nothing here mutates the player, so
 * the screen can show it freely without committing to anything.
 */
export function renewalOptions(player: Player): RenewalQuote[] {
  const c = contractsContent;
  const factor = demandFactor(player);

  return c.renewOptions.map((option) => {
    const newWage = Math.max(player.wage, Math.round((player.wage * (1 + factor)) / 50) * 50);
    const seasons = option.matchdays / c.matchdaysPerSeason;
    const fee = Math.round(player.marketValue * c.feeRatePerSeason * (1 + factor) * seasons);
    return { matchdays: option.matchdays, label: option.label, doc: option.doc, demandFactor: factor, newWage, fee };
  });
}

/** Sign a renewal. The caller has already charged the fee — see contracts.renewShort/Long. */
export function renewContract(player: Player, quote: RenewalQuote): void {
  player.contractMatchdays += quote.matchdays;
  player.wage = quote.newWage;
}

export interface WeekOutcome {
  /** Players whose contract just crossed the warning threshold. */
  warned: Player[];
  /** Players whose contract ran out this week — gone, ablösefrei. */
  departed: Player[];
}

/**
 * One week's countdown. Every player loses one matchday of contract; whoever
 * hits zero leaves for nothing, and whoever crosses the warning threshold gets
 * flagged exactly once, at the crossing point, rather than nagged every week
 * below it.
 */
export function tickContracts(squad: SquadState): WeekOutcome {
  const c = contractsContent;
  const warned: Player[] = [];
  const departingIds = new Set<string>();

  for (const p of squad.players) {
    if (p.contractMatchdays <= 0) {
      departingIds.add(p.id);
      continue;
    }
    p.contractMatchdays -= 1;
    if (p.contractMatchdays === c.warnAtMatchdays) warned.push(p);
    if (p.contractMatchdays <= 0) departingIds.add(p.id);
  }

  const departed = squad.players.filter((p) => departingIds.has(p.id));
  if (departed.length > 0) {
    squad.players = squad.players.filter((p) => !departingIds.has(p.id));
    squad.lineup = squad.lineup.filter((id) => !departingIds.has(id));
    if (squad.captainId && departingIds.has(squad.captainId)) squad.captainId = null;
  }

  return { warned, departed };
}

/**
 * What a delegated contracts department does with the week.
 *
 * The contract this has to honour, and it is the whole point of hiring anyone:
 * **a mediocre executive decides BADLY, not slowly.** Nothing here is gated on
 * time. Competence changes WHICH players get renewed and on what terms, and the
 * consequences land on the balance sheet within a season, where the player can
 * see what the wage bought.
 *
 * Three levers, all of them decisions a human would recognise:
 *
 *  - `attention` — how far ahead they look. A poor director notices a contract
 *    only once it is nearly gone, which is exactly when the player has the
 *    least leverage and the agent knows it.
 *  - `judgement` — whether they renew the right people. A poor one renews
 *    whoever is in front of them; a good one lets an ageing squad player walk.
 *  - `thrift` — which term they take. A poor one signs the expensive option.
 *
 * The failure mode a bad director produces is not chaos, it is a slightly worse
 * squad and a slightly larger wage bill every week, which is precisely the kind
 * of thing you only notice in the accounts.
 */
export interface AutoRenewal {
  player: Player;
  quote: RenewalQuote;
}

export function autoRenew(
  squad: SquadState,
  competence: number,
  budget: number
): { renewals: AutoRenewal[]; released: Player[] } {
  const c = contractsContent;
  const skill = Math.max(0, Math.min(1, competence));

  /*
   * How far ahead they look. Note that this is NOT the lever it first appears
   * to be: `demandFactor` does not care how close the deadline is, so acting
   * late costs nothing, and a director who looked four matchdays ahead still
   * caught everybody. Measured across three simulated seasons, competence made
   * a €22.000 difference and no difference at all to the squad — the whole
   * trade was invisible.
   *
   * The lever that bites is the ORDER below.
   */
  const horizon = Math.round(6 + skill * 8);
  const renewals: AutoRenewal[] = [];
  const released: Player[] = [];
  let left = budget;

  /*
   * WHO they deal with first, when the money runs out before the list does.
   *
   * A good director works down the squad by how good the player is. A poor one
   * works down it by wage — the expensive names feel like the important ones —
   * and the budget is gone by the time they reach a cheap, useful squad player,
   * who then leaves for nothing.
   *
   * This is the difference between an executive who decides badly and one who
   * merely decides late, and it is the whole reason the wage is worth paying.
   * A cap on how many they got through would have read as slowness; misreading
   * the list is a judgement.
   */
  const running = squad.players
    .filter((p) => p.contractMatchdays > 0 && p.contractMatchdays <= horizon)
    .sort((a, b) => (skill >= 0.5 ? strengthOf(b) - strengthOf(a) : b.wage - a.wage));

  for (const player of running) {
    const options = renewalOptions(player);
    if (options.length === 0) continue;

    /*
     * Who to let go — and the answer is "almost nobody".
     *
     * The first version released anyone below the squad average, which is by
     * definition half the squad: three simulated seasons under a COMPETENT
     * director left ten players. A director whose judgement is good does not
     * dismantle the club, so releasing is reserved for someone who is both
     * clearly surplus and past their peak.
     *
     * The two failures are asymmetric, deliberately. A poor director's mistake
     * is renewing EVERYBODY — the wage bill grows and nobody ever decided it
     * should. A good one's is nothing much at all; that is what the wage buys.
     */
    const squadAverage = squad.players.reduce((sum, p) => sum + strengthOf(p), 0)
      / Math.max(1, squad.players.length);
    const surplus = strengthOf(player) < squadAverage - 10 && player.age > c.demandAgeOver;
    const floor = squad.players.length - released.length > c.minSquadSizeForRelease;

    if (surplus && skill >= 0.5 && floor) {
      released.push(player);
      continue;
    }

    // The cheaper term when they are competent, the expensive one when not.
    const sorted = [...options].sort((a, b) => a.fee - b.fee);
    const quote = skill >= 0.5 ? sorted[0]! : sorted[sorted.length - 1]!;
    if (quote.fee > left) continue;

    left -= quote.fee;
    renewContract(player, quote);
    renewals.push({ player, quote });
  }

  return { renewals, released };
}
