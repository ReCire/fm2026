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
