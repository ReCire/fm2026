import { describe, it, expect } from 'vitest';
import { createRng, seedFrom } from '$lib/engine/rng';
import { Registry } from '$lib/engine/registry';
import { runTick } from '$lib/engine/clock';
import { modules } from '$lib/modules';
import type { GameState, MetaState, ModuleStates } from '$lib/engine/state';
import { applyNarrative } from '../progression/rules';
import { narratives } from '../progression/content';
import { standings } from '../league/rules';
import { halfTimeDecision, cappedSwing, SWING_CAP } from './intervene';
import { applyHalfTime, pendingDecision } from './halftime';
import { scoreAt } from './narrate';

const registry = new Registry(modules);

function career(seedText: string): GameState {
  const seed = seedFrom(seedText);
  const rng = createRng(seed);
  const mods: Record<string, unknown> = {};
  for (const m of registry.all) mods[m.id] = m.state.create(rng.fork(m.id));
  const meta: MetaState = { seed, season: 1, matchday: 1, tick: 0, createdAt: 0, lastPlayedAt: 0 };
  const g: GameState = { meta, modules: mods as unknown as ModuleStates };
  applyNarrative(g.modules.progression, narratives[0]!);
  g.modules.progression.started = true;
  return g;
}

/** Play one full week-then-match, leaving a live match at kickoff. */
function toKickoff(g: GameState): void {
  runTick(registry, g, 'week');
  runTick(registry, g, 'matchday');
}

const ourRow = (g: GameState) =>
  (g.modules.league.levels[g.modules.league.playerLevel] ?? [])
    .find((t) => t.id === g.modules.league.playerClubId)!;

/** Every table column recomputed from the fixtures, to catch a drifting row. */
function fromFixtures(g: GameState, teamIndex: number) {
  const league = g.modules.league;
  const rounds = league.fixtures[league.playerLevel] ?? [];
  let played = 0, won = 0, drawn = 0, lost = 0, gf = 0, ga = 0;
  for (const round of rounds) {
    for (const f of round) {
      if (!f.played || f.homeGoals === null || f.awayGoals === null) continue;
      const home = f.home === teamIndex;
      if (!home && f.away !== teamIndex) continue;
      played++;
      const our = home ? f.homeGoals : f.awayGoals;
      const their = home ? f.awayGoals : f.homeGoals;
      gf += our; ga += their;
      if (our > their) won++; else if (our < their) lost++; else drawn++;
    }
  }
  return { played, won, drawn, lost, goalsFor: gf, goalsAgainst: ga };
}

describe('the half-time decision', () => {
  it('is offered only at the interval, and only once', () => {
    const g = career('ht');
    toKickoff(g);
    const live = g.modules.matchday.live!;

    live.minute = 20;
    expect(pendingDecision(g), 'asked before half time').toBeNull();

    live.minute = 45;
    expect(pendingDecision(g), 'not asked at the interval').not.toBeNull();

    applyHalfTime(g, 'halten');
    expect(pendingDecision(g), 'asked again after answering').toBeNull();
  });

  it('refuses an option that was not on the menu', () => {
    const g = career('menu');
    toKickoff(g);
    g.modules.matchday.live!.minute = 45;
    expect(applyHalfTime(g, 'kaffeepause')).toBeNull();
    expect(g.modules.matchday.live!.decided, 'a rejected option must not count as answered').toBeNull();
  });

  /*
   * The one that matters. This is the only place in the game where a result
   * already counted is changed, and a table that no longer matches its own
   * fixtures is a bug nobody finds for weeks.
   */
  it('leaves the table agreeing with the fixtures for every option', () => {
    for (const option of ['halten', 'aufmachen', 'zumachen', 'donnerwetter', 'schonen']) {
      for (let seed = 0; seed < 12; seed++) {
        const g = career(`table${seed}`);
        toKickoff(g);
        const live = g.modules.matchday.live;
        if (!live) continue;
        live.minute = 45;

        const teams = g.modules.league.levels[g.modules.league.playerLevel]!;
        const index = teams.findIndex((t) => t.id === g.modules.league.playerClubId);

        applyHalfTime(g, option);

        const row = teams[index]!;
        const recomputed = fromFixtures(g, index);
        expect({
          played: row.played, won: row.won, drawn: row.drawn, lost: row.lost,
          goalsFor: row.goalsFor, goalsAgainst: row.goalsAgainst
        }, `${option} on seed ${seed}`).toEqual(recomputed);
      }
    }
  });

  it('plays exactly one match, however the interval goes', () => {
    for (const option of ['halten', 'aufmachen', 'schonen']) {
      const g = career('once');
      toKickoff(g);
      g.modules.matchday.live!.minute = 45;
      applyHalfTime(g, option);
      expect(ourRow(g).played, option).toBe(1);
    }
  });

  it('the report and the table tell the same story', () => {
    for (let seed = 0; seed < 12; seed++) {
      const g = career(`report${seed}`);
      toKickoff(g);
      const live = g.modules.matchday.live;
      if (!live) continue;
      live.minute = 45;
      applyHalfTime(g, 'aufmachen');

      const report = g.modules.matchday.lastReport!;
      const end = live.beats[live.beats.length - 1]!;
      expect(end.kind).toBe('fulltime');
      expect([report.goalsFor, report.goalsAgainst], `seed ${seed}`).toEqual(end.score);
    }
  });

  it('does nothing at all when there is no live match', () => {
    const g = career('none');
    expect(applyHalfTime(g, 'halten')).toBeNull();
  });

  it('charges what the option costs', () => {
    const g = career('cost');
    toKickoff(g);
    g.modules.matchday.live!.minute = 45;
    const starters = g.modules.squad.players.filter((p) => g.modules.squad.lineup.includes(p.id));
    const before = starters.map((p) => p.fitness);
    applyHalfTime(g, 'aufmachen');
    const after = starters.map((p) => p.fitness);
    // 'aufmachen' costs 6 points of fitness; only a player already at the
    // floor is allowed to be unchanged.
    expect(after.some((f, i) => f < before[i]!)).toBe(true);
  });

  it('keeps the first half exactly as it was watched', () => {
    for (let seed = 0; seed < 12; seed++) {
      const g = career(`first${seed}`);
      toKickoff(g);
      const live = g.modules.matchday.live;
      if (!live) continue;
      live.minute = 45;
      const watched = live.beats.filter((b) => b.minute < 45).map((b) => b.text);
      const at45 = scoreAt(live.beats, 45);
      applyHalfTime(g, 'donnerwetter');
      expect(live.beats.filter((b) => b.minute < 45).map((b) => b.text), `seed ${seed}`).toEqual(watched);
      expect(scoreAt(live.beats, 45)).toEqual(at45);
    }
  });
});

describe('the intervention stays bounded', () => {
  /*
   * The eleven you picked has to keep mattering. A half-time call that could
   * beat a side ten points better would undo every balance guarantee in the
   * project, so the cap is smaller than the gap between two divisions.
   */
  it('no option can swing more than the cap, and the cap is under a division gap', () => {
    for (const [us, them] of [[0, 0], [3, 0], [0, 3], [1, 0], [0, 1]] as const) {
      for (const option of halfTimeDecision(us, them, 'ausgeglichen').options) {
        expect(Math.abs(cappedSwing(option))).toBeLessThanOrEqual(SWING_CAP);
      }
    }
    expect(SWING_CAP, 'a button must not be worth a whole division').toBeLessThan(10);
  });

  it('every option costs something, or does nothing at all', () => {
    for (const [us, them] of [[0, 0], [2, 0], [0, 2], [1, 0], [0, 1]] as const) {
      for (const o of halfTimeDecision(us, them, 'ausgeglichen').options) {
        const free = o.fitnessCost <= 0 && o.injuryRisk <= 1 && o.morale >= 0;
        if (free) {
          // A free option is only allowed if it gives nothing either — anything
          // with an upside and no price is a button you press every week.
          expect(o.swing, `${o.label} is free and still helps`).toBeLessThanOrEqual(0);
        }
      }
    }
  });

  it('always offers doing nothing, first', () => {
    for (const [us, them] of [[0, 0], [4, 0], [0, 4], [1, 0], [0, 1]] as const) {
      const d = halfTimeDecision(us, them, 'ausgeglichen');
      expect(d.options[0]!.id).toBe('halten');
    }
  });

  it('asks a question that matches the scoreboard', () => {
    expect(halfTimeDecision(2, 0, 'ausgeglichen').question).toContain('2:0');
    expect(halfTimeDecision(0, 2, 'ausgeglichen').question).toContain('0:2');
    // Being offered "shut up shop" while two down is a menu nobody read.
    expect(halfTimeDecision(0, 2, 'ausgeglichen').options.map((o) => o.id)).not.toContain('zumachen');
  });
});
