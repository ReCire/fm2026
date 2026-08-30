import { describe, it, expect } from 'vitest';
import { createRng, seedFrom } from '$lib/engine/rng';
import { Registry } from '$lib/engine/registry';
import { runTick } from '$lib/engine/clock';
import { modules } from '$lib/modules';
import type { GameState, MetaState, ModuleStates } from '$lib/engine/state';
import { applyNarrative, unlock } from '../progression/rules';
import { narratives } from '../progression/content';
import { allTeams } from '../league/rules';
import { cupContent } from './content';
import {
  drawBracket, resolveTie, winnerOf, roundDueAt, tieFor, nextRound,
  strengthOf, scoreline, ROUNDS
} from './rules';
import type { CupPairing } from './state';

const registry = new Registry(modules);

function career(seedText = 'cup'): GameState {
  const seed = seedFrom(seedText);
  const rng = createRng(seed);
  const mods: Record<string, unknown> = {};
  for (const m of registry.all) mods[m.id] = m.state.create(rng.fork(m.id));
  const meta: MetaState = { seed, season: 1, matchday: 1, tick: 0, createdAt: 0, lastPlayedAt: 0 };
  const g: GameState = { meta, modules: mods as unknown as ModuleStates };
  applyNarrative(g.modules.progression, narratives[0]!);
  g.modules.progression.started = true;
  unlock(g.modules.progression, 'cup');
  return g;
}

const tie = (over: Partial<CupPairing> = {}): CupPairing => ({
  homeId: 'h', awayId: 'a', homeGoals: null, awayGoals: null,
  penaltyWinnerId: null, played: false, ...over
});

describe('the draw', () => {
  it('always includes our club — a cup you might not be in is an empty screen', () => {
    for (let seed = 0; seed < 20; seed++) {
      const g = career(`draw${seed}`);
      const rounds = drawBracket(createRng(seed), g.modules.league);
      expect(tieFor(rounds[0], g.modules.league.playerClubId), `seed ${seed}`).toBeTruthy();
    }
  });

  it('fills the bracket exactly, with no byes', () => {
    const g = career();
    const rounds = drawBracket(createRng(3), g.modules.league);
    expect(rounds[0]!.pairings).toHaveLength(cupContent.bracketSize / 2);
    const ids = rounds[0]!.pairings.flatMap((p) => [p.homeId, p.awayId]);
    expect(new Set(ids).size, 'a club was drawn twice').toBe(cupContent.bracketSize);
  });

  it('draws from the whole pyramid, not just our division', () => {
    const g = career();
    const levelOf = new Map(allTeams(g.modules.league).map((t) => [t.team.id, t.level]));
    const rounds = drawBracket(createRng(7), g.modules.league);
    const levels = new Set(
      rounds[0]!.pairings.flatMap((p) => [levelOf.get(p.homeId), levelOf.get(p.awayId)])
    );
    expect(levels.size, 'every entrant came from one division').toBeGreaterThan(1);
  });

  /* The only advantage the small club has. Without it the giant-killing the
     whole competition exists for essentially never happens. */
  it('gives the lower division home advantage', () => {
    const g = career();
    const levelOf = new Map(allTeams(g.modules.league).map((t) => [t.team.id, t.level]));
    for (const p of drawBracket(createRng(11), g.modules.league)[0]!.pairings) {
      expect(levelOf.get(p.homeId)!).toBeGreaterThanOrEqual(levelOf.get(p.awayId)!);
    }
  });

  it('is deterministic for a seed', () => {
    const g = career();
    const a = drawBracket(createRng(42), g.modules.league);
    const b = drawBracket(createRng(42), g.modules.league);
    expect(a).toEqual(b);
  });
});

describe('a tie', () => {
  it('always produces a winner — there are no draws in a knockout', () => {
    for (let seed = 0; seed < 200; seed++) {
      const played = resolveTie(createRng(seed), tie(), 55, 55);
      expect(winnerOf(played), `seed ${seed}`).not.toBeNull();
    }
  });

  it('goes to penalties exactly when the ninety minutes are level', () => {
    for (let seed = 0; seed < 200; seed++) {
      const p = resolveTie(createRng(seed), tie(), 60, 50);
      expect(p.penaltyWinnerId !== null).toBe(p.homeGoals === p.awayGoals);
    }
  });

  it('the winner is one of the two clubs, never a third', () => {
    for (let seed = 0; seed < 100; seed++) {
      const p = resolveTie(createRng(seed), tie(), 70, 40);
      expect([p.homeId, p.awayId]).toContain(winnerOf(p));
    }
  });

  /* The better side must win more — otherwise the eleven you pick does not
     matter here either. */
  it('the stronger side wins more often than not', () => {
    let strongWins = 0;
    for (let seed = 0; seed < 400; seed++) {
      const p = resolveTie(createRng(seed), tie(), 75, 45);
      if (winnerOf(p) === 'h') strongWins++;
    }
    expect(strongWins).toBeGreaterThan(240);
  });

  /* ...but not so much that an upset is impossible. A knockout where the
     better side always wins is a table with extra steps. */
  it('leaves room for a giant-killing', () => {
    let upsets = 0;
    for (let seed = 0; seed < 400; seed++) {
      const p = resolveTie(createRng(seed), tie(), 75, 45);
      if (winnerOf(p) === 'a') upsets++;
    }
    expect(upsets, 'the underdog never once got through').toBeGreaterThan(40);
  });

  it('a shoot-out is close to a coin toss', () => {
    let homeWins = 0;
    let shootouts = 0;
    for (let seed = 0; seed < 1000; seed++) {
      const p = resolveTie(createRng(seed), tie(), 80, 40);
      if (!p.penaltyWinnerId) continue;
      shootouts++;
      if (p.penaltyWinnerId === 'h') homeWins++;
    }
    expect(shootouts).toBeGreaterThan(50);
    const share = homeWins / shootouts;
    expect(share, 'penalties were decided by strength').toBeLessThan(0.72);
    expect(share).toBeGreaterThan(0.28);
  });

  it('reads as a scoreline, and says when it went to penalties', () => {
    expect(scoreline(tie())).toBe('–:–');
    expect(scoreline(tie({ played: true, homeGoals: 2, awayGoals: 1 }))).toBe('2:1');
    expect(scoreline(tie({ played: true, homeGoals: 1, awayGoals: 1, penaltyWinnerId: 'a' })))
      .toBe('1:1 n.E.');
  });
});

describe('the bracket advances', () => {
  it('halves each round until the final', () => {
    const g = career();
    let round = drawBracket(createRng(5), g.modules.league)[0]!;
    let size = round.pairings.length;
    for (let r = 0; r + 1 < ROUNDS; r++) {
      round.pairings = round.pairings.map((p) => resolveTie(createRng(r * 100 + 1), p, 55, 55));
      const next = nextRound(g.modules.league, round)!;
      expect(next.pairings.length).toBe(size / 2);
      size = next.pairings.length;
      round = next;
    }
    expect(size, 'the final should be one tie').toBe(1);
  });

  it('has no next round after the final', () => {
    const g = career();
    const final = { roundIndex: ROUNDS - 1, pairings: [tie({ played: true, homeGoals: 1, awayGoals: 0 })], completed: true };
    expect(nextRound(g.modules.league, final)).toBeNull();
  });

  it('only the winners go through', () => {
    const g = career();
    const round = drawBracket(createRng(9), g.modules.league)[0]!;
    round.pairings = round.pairings.map((p) => resolveTie(createRng(1), p, 55, 55));
    const winners = new Set(round.pairings.map(winnerOf));
    for (const p of nextRound(g.modules.league, round)!.pairings) {
      expect(winners.has(p.homeId)).toBe(true);
      expect(winners.has(p.awayId)).toBe(true);
    }
  });
});

describe('the calendar', () => {
  it('names a round only on its own matchday', () => {
    for (const [i, md] of cupContent.roundMatchdays.entries()) {
      expect(roundDueAt(md)).toBe(i);
    }
    expect(roundDueAt(2)).toBeNull();
    expect(roundDueAt(33)).toBeNull();
  });
});

describe('our strength reaches the cup', () => {
  /*
   * The bus lives for one tick. A cup tie resolved on a `week` tick cannot read
   * `squad.strength`, which is published on `matchday` — so it is cached. If
   * that broke, the eleven you pick would not affect your cup run, silently.
   */
  it('uses the cached matchday figure for our club and the table figure for others', () => {
    const g = career();
    g.modules.cup.playerStrength = 88;
    expect(strengthOf(g.modules.league, g.modules.cup, g.modules.league.playerClubId)).toBe(88);

    const rival = g.modules.league.levels[g.modules.league.playerLevel]!
      .find((t) => t.id !== g.modules.league.playerClubId)!;
    expect(strengthOf(g.modules.league, g.modules.cup, rival.id)).toBe(rival.strength);
  });

  it('the cache is filled by playing a matchday, not left at its default', () => {
    const g = career();
    const before = g.modules.cup.playerStrength;
    runTick(registry, g, 'week');
    runTick(registry, g, 'matchday');
    expect(g.modules.cup.playerStrength).not.toBe(before);
  });
});

describe('a whole cup run', () => {
  it('draws, plays every round on schedule, and either wins it or goes out', () => {
    const g = career('run');
    for (let i = 0; i < 34; i++) {
      runTick(registry, g, 'week');
      runTick(registry, g, 'matchday');
    }
    const cup = g.modules.cup;
    expect(cup.season).toBe(1);
    // Every round whose matchday has passed was actually played.
    const played = cup.rounds.filter((r) => r.completed);
    expect(played.length, 'no cup round was ever resolved').toBeGreaterThan(0);
    for (const r of played) {
      for (const p of r.pairings) expect(winnerOf(p), 'an unresolved tie').not.toBeNull();
    }
    // Out, or still standing with a title.
    expect(cup.active === false || cup.titles > 0 || cup.rounds.length === ROUNDS).toBe(true);
  });

  it('pays a prize the club can feel but not live on', () => {
    // A first-round win must be worth less than a season's gate receipts, or
    // no other financial decision in the game matters.
    expect(cupContent.prizes[0]!).toBeLessThan(169_000);
    // And the final must be transformative — that is the fairy tale.
    expect(cupContent.prizes[ROUNDS - 1]!).toBeGreaterThan(cupContent.prizes[0]! * 10);
  });
});

describe('the cup enters at the right time', () => {
  /*
   * The first round is played before matchday 4. A career or an unlock that
   * arrives later has missed the campaign, and entering at the quarter-final
   * is not a cup run. The module was gated seventh in the unlock ladder for an
   * hour, opening around matchday 21 — a whole season of a competition doing
   * nothing while its screen said the draw was still to come.
   */
  it('is not gated — every club is in the national cup from the first season', () => {
    const mod = registry.byId.get('cup')!;
    expect(mod.gate, 'a national cup is not a department you build').toBeUndefined();
  });

  it('sits the season out when it is joined after the first round', () => {
    const g = career('late');
    g.meta.matchday = 20;
    runTick(registry, g, 'week');
    expect(g.modules.cup.rounds).toEqual([]);
    expect(g.modules.cup.active).toBe(false);
    expect(g.modules.cup.season, 'the season must be marked, or it redraws every week').toBe(1);
  });

  it('draws at the start of a season', () => {
    const g = career('early');
    runTick(registry, g, 'week');
    expect(g.modules.cup.rounds).toHaveLength(1);
    expect(g.modules.cup.active).toBe(true);
  });
});
