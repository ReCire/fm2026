import { strengthOf } from './rules';
import { describe, it, expect } from 'vitest';
import {
  marketValue, wage, createPlayer, autoLineup, teamStrength,
  wageBill, applyPostMatch, isAvailable, rating
} from './rules';
import { createSquad, type SquadState } from './state';
import { squadContent } from './content';
import { createRng } from '$lib/engine/rng';

const fresh = (seed = 42) => createSquad(createRng(seed));

describe('marketValue', () => {
  it('is zero for a player below the first threshold', () => {
    expect(marketValue(40)).toBe(0);
  });
  it('rises steeply through the bands', () => {
    expect(marketValue(50)).toBe(20_000);
    expect(marketValue(70)).toBeGreaterThan(marketValue(60) * 2);
    expect(marketValue(90)).toBeGreaterThan(marketValue(80) * 2);
  });
  it('is monotonic across the whole range', () => {
    for (let s = 41; s <= 99; s++) {
      expect(marketValue(s)).toBeGreaterThan(marketValue(s - 1));
    }
  });
});

describe('wage', () => {
  it('picks the band by strength, not by value', () => {
    expect(wage(50)).toBe(Math.round(300 + marketValue(50) * 0.008));
    expect(wage(80)).toBe(Math.round(25_000 + marketValue(80) * 0.0035));
  });
  it('jumps at a band boundary — the deliberate cliff at 58/59', () => {
    expect(wage(59)).toBeGreaterThan(wage(58));
  });
});

describe('createPlayer', () => {
  it('is deterministic for a given seed', () => {
    const a = createPlayer(createRng(7), 'ST', 50, 60);
    const b = createPlayer(createRng(7), 'ST', 50, 60);
    expect(a).toEqual(b);
  });
  it('respects the strength range', () => {
    const rng = createRng(3);
    for (let i = 0; i < 200; i++) {
      const p = createPlayer(rng, 'MIT', 45, 55);
      expect(strengthOf(p)).toBeGreaterThanOrEqual(45);
      expect(strengthOf(p)).toBeLessThanOrEqual(55);
    }
  });
  it('honours a forced trait', () => {
    expect(createPlayer(createRng(1), 'TW', 50, 50, 'Leader').trait).toBe('Leader');
  });
});

describe('createSquad', () => {
  it('builds a 19-man squad with the right shape', () => {
    const s = fresh();
    expect(s.players).toHaveLength(19);
    expect(s.players.filter((p) => p.pos === 'TW')).toHaveLength(2);
    expect(s.players.filter((p) => p.pos === 'ABW')).toHaveLength(6);
  });
});

describe('autoLineup', () => {
  it('picks exactly eleven', () => {
    expect(autoLineup(fresh())).toHaveLength(11);
  });

  it('picks a keeper', () => {
    const s = fresh();
    const ids = autoLineup(s);
    const keepers = s.players.filter((p) => ids.includes(p.id) && p.pos === 'TW');
    expect(keepers).toHaveLength(1);
  });

  it('never selects an injured or suspended player', () => {
    const s = fresh();
    s.players[0]!.injured = 3;
    s.players[1]!.suspended = 1;
    const ids = autoLineup(s);
    expect(ids).not.toContain(s.players[0]!.id);
    expect(ids).not.toContain(s.players[1]!.id);
  });

  it('still fields eleven when a whole position is wiped out', () => {
    const s = fresh();
    for (const p of s.players) if (p.pos === 'ABW') p.injured = 2;
    const ids = autoLineup(s);
    expect(ids).toHaveLength(11);
    expect(new Set(ids).size).toBe(11);
  });

  it('prefers the better player of a pair', () => {
    const s = fresh();
    const strikers = s.players.filter((p) => p.pos === 'ST').sort((a, b) => rating(b) - rating(a));
    expect(autoLineup(s)).toContain(strikers[0]!.id);
  });
});

describe('teamStrength', () => {
  it('gives the home side a bonus', () => {
    const s = fresh();
    s.lineup = autoLineup(s);
    expect(teamStrength(s, true)).toBe(teamStrength(s, false) + 3);
  });
  it('falls back to 50 with no lineup', () => {
    const s: SquadState = { players: [], lineup: [], captainId: null };
    expect(teamStrength(s, false)).toBe(50);
  });
  it('drops when the eleven is tired', () => {
    const s = fresh();
    s.lineup = autoLineup(s);
    const before = teamStrength(s, false);
    for (const p of s.players) p.fitness = 40;
    expect(teamStrength(s, false)).toBeLessThan(before);
  });
});

describe('applyPostMatch', () => {
  it('tires starters and rests the bench', () => {
    const s = fresh();
    s.lineup = autoLineup(s);
    const starter = s.players.find((p) => s.lineup.includes(p.id))!;
    const bench = s.players.find((p) => !s.lineup.includes(p.id))!;
    starter.fitness = 90;
    bench.fitness = 50;

    applyPostMatch(s, createRng(11));

    expect(starter.fitness).toBe(90 - squadContent.fitnessLossPerMatch);
    // The match only spends fitness. The week is what puts it back — see
    // training/rules.ts. Two systems recovering it pinned the squad at 90+.
    expect(bench.fitness).toBe(50);
  });

  it('never drops a starter below 10 fitness', () => {
    const s = fresh();
    s.lineup = autoLineup(s);
    for (const p of s.players) p.fitness = 11;
    applyPostMatch(s, createRng(2));
    for (const id of s.lineup) {
      expect(s.players.find((p) => p.id === id)!.fitness).toBeGreaterThanOrEqual(10);
    }
  });

  it('counts down and clears an injury', () => {
    const s = fresh();
    s.lineup = autoLineup(s);
    const hurt = s.players.find((p) => !s.lineup.includes(p.id))!;
    hurt.injured = 1;
    const outcome = applyPostMatch(s, createRng(5));
    expect(hurt.injured).toBe(0);
    expect(outcome.recovered).toContain(hurt);
  });

  it('removes a newly injured player from the eleven', () => {
    const s = fresh();
    s.lineup = autoLineup(s);
    // Force injuries: exhausted starters hit the tired multiplier every roll.
    for (const p of s.players) p.fitness = 12;
    let found = false;
    for (let seed = 0; seed < 40 && !found; seed++) {
      const t = fresh();
      t.lineup = autoLineup(t);
      for (const p of t.players) p.fitness = 12;
      const out = applyPostMatch(t, createRng(seed));
      if (out.injuries.length > 0) {
        found = true;
        for (const { player } of out.injuries) {
          expect(t.lineup).not.toContain(player.id);
        }
        expect(t.lineup).toHaveLength(11);
      }
    }
    expect(found).toBe(true);
  });

  it('is fully deterministic for a seed', () => {
    const a = fresh(9); a.lineup = autoLineup(a);
    const b = fresh(9); b.lineup = autoLineup(b);
    applyPostMatch(a, createRng(123));
    applyPostMatch(b, createRng(123));
    expect(a.players).toEqual(b.players);
  });
});

describe('wageBill', () => {
  it('sums every contract, not just the eleven', () => {
    const s = fresh();
    expect(wageBill(s)).toBe(s.players.reduce((sum, p) => sum + p.wage, 0));
  });
});

describe('isAvailable', () => {
  it('excludes injured and suspended players', () => {
    const s = fresh();
    const p = s.players[0]!;
    expect(isAvailable(p)).toBe(true);
    p.injured = 1;
    expect(isAvailable(p)).toBe(false);
  });
});
