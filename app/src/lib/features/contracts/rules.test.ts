import { describe, it, expect } from 'vitest';
import { demandFactor, renewalOptions, renewContract, tickContracts } from './rules';
import { contractsContent } from './content';
import { createSquad } from '../squad/state';
import { createPlayer } from '../squad/rules';
import { createRng } from '$lib/engine/rng';

const fresh = (seed = 1) => createSquad(createRng(seed));

function playerAt(strength: number, age: number) {
  const p = createPlayer(createRng(3), 'MIT', strength, strength);
  p.age = age;
  return p;
}

describe('demandFactor', () => {
  it('rises with strength', () => {
    const weak = playerAt(55, 25);
    const strong = playerAt(85, 25);
    expect(demandFactor(strong)).toBeGreaterThan(demandFactor(weak));
  });

  it('rises the younger a player is', () => {
    const young = playerAt(70, 19);
    const old = playerAt(70, 29);
    expect(demandFactor(young)).toBeGreaterThan(demandFactor(old));
  });

  it('gives an old, modest player a discount rather than a demand', () => {
    const veteran = playerAt(50, 34);
    expect(demandFactor(veteran)).toBeLessThan(0);
  });

  it('never leaves the clamp band', () => {
    for (const age of [16, 20, 25, 30, 40]) {
      for (const strength of [30, 60, 90, 99]) {
        const f = demandFactor(playerAt(strength, age));
        expect(f).toBeGreaterThanOrEqual(contractsContent.minDemandFactor);
        expect(f).toBeLessThanOrEqual(contractsContent.maxDemandFactor);
      }
    }
  });
});

describe('renewalOptions', () => {
  it('offers one quote per configured option', () => {
    const p = playerAt(65, 22);
    expect(renewalOptions(p)).toHaveLength(contractsContent.renewOptions.length);
  });

  it('never quotes a wage below the current one', () => {
    const p = playerAt(50, 35); // negative demand factor
    for (const q of renewalOptions(p)) {
      expect(q.newWage).toBeGreaterThanOrEqual(p.wage);
    }
  });

  it('charges more for the longer option', () => {
    const p = playerAt(75, 23);
    const [short, long] = renewalOptions(p);
    expect(long!.fee).toBeGreaterThan(short!.fee);
  });
});

describe('renewContract', () => {
  it('extends the contract and raises the wage to the quoted amount', () => {
    const p = playerAt(70, 22);
    const before = p.contractMatchdays;
    const [quote] = renewalOptions(p);
    renewContract(p, quote!);
    expect(p.contractMatchdays).toBe(before + quote!.matchdays);
    expect(p.wage).toBe(quote!.newWage);
  });
});

describe('tickContracts', () => {
  it('counts every player down by one matchday', () => {
    const s = fresh();
    const before = s.players.map((p) => p.contractMatchdays);
    tickContracts(s);
    expect(s.players.map((p) => p.contractMatchdays)).toEqual(before.map((n) => Math.max(0, n - 1)));
  });

  it('warns exactly once, at the crossing point', () => {
    const s = fresh();
    const p = s.players[0]!;
    p.contractMatchdays = contractsContent.warnAtMatchdays + 1;
    const first = tickContracts(s);
    expect(first.warned.map((x) => x.id)).toContain(p.id);
    const second = tickContracts(s);
    expect(second.warned.map((x) => x.id)).not.toContain(p.id);
  });

  it('removes a player whose contract runs out, for nothing', () => {
    const s = fresh();
    const p = s.players[0]!;
    p.contractMatchdays = 1;
    s.lineup = [p.id];
    s.captainId = p.id;
    const outcome = tickContracts(s);
    expect(outcome.departed.map((x) => x.id)).toContain(p.id);
    expect(s.players.find((x) => x.id === p.id)).toBeUndefined();
    expect(s.lineup).not.toContain(p.id);
    expect(s.captainId).toBeNull();
  });

  it('leaves an already-fresh contract untouched by anything but the countdown', () => {
    const s = fresh();
    const p = s.players[0]!;
    const wage = p.wage;
    tickContracts(s);
    expect(p.wage).toBe(wage);
  });
});
