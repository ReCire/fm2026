import { describe, it, expect } from 'vitest';
import { createRng, seedFrom } from '$lib/engine/rng';
import { Registry } from '$lib/engine/registry';
import { runTick } from '$lib/engine/clock';
import { modules } from '$lib/modules';
import type { GameState, MetaState, ModuleStates } from '$lib/engine/state';
import { applyNarrative } from '../progression/rules';
import { narratives } from '../progression/content';
import { rating } from '../squad/rules';
import {
  MAX_SUBS, canSubstitute, benchFor, onPitch, applySubstitution, subSwing
} from './substitute';

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

describe('the swing a substitution is worth', () => {
  it('can run either way — a downgrade is a real possibility, not just an upgrade', () => {
    const strong = { fitness: 95, attributes: { technik: 80, tempo: 80, kraft: 80, uebersicht: 80, mentalitaet: 80 }, pos: 'ST' } as Parameters<typeof rating>[0];
    const weak = { fitness: 40, attributes: { technik: 40, tempo: 40, kraft: 40, uebersicht: 40, mentalitaet: 40 }, pos: 'ST' } as Parameters<typeof rating>[0];

    expect(subSwing(strong, weak), 'fresh and strong for tired and weak').toBeGreaterThan(0);
    expect(subSwing(weak, strong), 'the same swap the other way').toBeLessThan(0);
  });

  it('agrees with rating(), not a second opinion about quality', () => {
    const a = { fitness: 90, attributes: { technik: 70, tempo: 60, kraft: 65, uebersicht: 55, mentalitaet: 60 }, pos: 'MIT' } as Parameters<typeof rating>[0];
    const b = { fitness: 55, attributes: { technik: 72, tempo: 58, kraft: 60, uebersicht: 60, mentalitaet: 58 }, pos: 'MIT' } as Parameters<typeof rating>[0];
    expect(subSwing(a, b)).toBeCloseTo((rating(a) - rating(b)) / 11, 9);
  });
});

describe('who can be substituted', () => {
  it('is offered only while the clock is stopped', () => {
    const g = career('offer');
    toKickoff(g);
    const live = g.modules.matchday.live!;

    live.running = true;
    expect(canSubstitute(g), 'the match is still running').toBe(false);

    live.running = false;
    expect(canSubstitute(g), 'paused, before full time, subs left').toBe(true);

    live.minute = 90;
    expect(canSubstitute(g), 'the match is over').toBe(false);
  });

  it('does nothing at all when there is no live match', () => {
    const g = career('none');
    expect(applySubstitution(g, 'x', 'y')).toBe(false);
  });

  it('refuses a player who is not actually on the bench', () => {
    const g = career('bench');
    toKickoff(g);
    g.modules.matchday.live!.running = false;
    const [out] = onPitch(g);
    // Two players already on the pitch, swapped for each other: neither is
    // on the bench that matters here.
    const otherOnPitch = onPitch(g)[1]!;
    expect(applySubstitution(g, out!.id, otherOnPitch.id)).toBe(false);
  });

  it('refuses a fourth substitution', () => {
    const g = career('fourth');
    toKickoff(g);
    const live = g.modules.matchday.live!;
    live.running = false;

    for (let i = 0; i < MAX_SUBS; i++) {
      const [out] = onPitch(g);
      const [inP] = benchFor(g);
      expect(out && inP, `bench available for sub ${i}`).toBeTruthy();
      expect(applySubstitution(g, out!.id, inP!.id), `sub ${i} should be allowed`).toBe(true);
    }
    expect(live.subsUsed).toBe(MAX_SUBS);

    const [out] = onPitch(g);
    const [inP] = benchFor(g);
    expect(applySubstitution(g, out!.id, inP!.id), 'a fourth sub must be refused').toBe(false);
    expect(live.subsUsed, 'refusing it must not still count it').toBe(MAX_SUBS);
  });

  it('the shirt actually changes hands', () => {
    const g = career('shirt');
    toKickoff(g);
    g.modules.matchday.live!.running = false;
    const squad = g.modules.squad;
    const [out] = onPitch(g);
    const [inP] = benchFor(g);

    expect(applySubstitution(g, out!.id, inP!.id)).toBe(true);
    expect(squad.lineup, 'the sub is now in the eleven').toContain(inP!.id);
    expect(squad.lineup, 'the player subbed off is not').not.toContain(out!.id);
  });
});

describe('the table after a substitution', () => {
  it('agrees with the fixtures, whoever came on', () => {
    for (let seed = 0; seed < 12; seed++) {
      const g = career(`table${seed}`);
      toKickoff(g);
      const live = g.modules.matchday.live;
      if (!live) continue;
      live.minute = 30;
      live.running = false;

      const teams = g.modules.league.levels[g.modules.league.playerLevel]!;
      const index = teams.findIndex((t) => t.id === g.modules.league.playerClubId);

      const [out] = onPitch(g);
      const [inP] = benchFor(g);
      if (!out || !inP) continue;
      applySubstitution(g, out.id, inP.id);

      const row = teams[index]!;
      const recomputed = fromFixtures(g, index);
      expect({
        played: row.played, won: row.won, drawn: row.drawn, lost: row.lost,
        goalsFor: row.goalsFor, goalsAgainst: row.goalsAgainst
      }, `seed ${seed}`).toEqual(recomputed);
    }
  });

  it('plays exactly one match', () => {
    const g = career('once');
    toKickoff(g);
    g.modules.matchday.live!.minute = 20;
    g.modules.matchday.live!.running = false;
    const [out] = onPitch(g);
    const [inP] = benchFor(g);
    applySubstitution(g, out!.id, inP!.id);
    expect(ourRow(g).played).toBe(1);
  });

  it('the report and the table tell the same story', () => {
    for (let seed = 0; seed < 8; seed++) {
      const g = career(`report${seed}`);
      toKickoff(g);
      const live = g.modules.matchday.live;
      if (!live) continue;
      live.minute = 60;
      live.running = false;
      const [out] = onPitch(g);
      const [inP] = benchFor(g);
      if (!out || !inP) continue;
      applySubstitution(g, out.id, inP.id);

      const report = g.modules.matchday.lastReport!;
      const end = live.beats[live.beats.length - 1]!;
      expect(end.kind).toBe('fulltime');
      expect([report.goalsFor, report.goalsAgainst], `seed ${seed}`).toEqual(end.score);
    }
  });

  it('keeps everything already watched exactly as it was', () => {
    for (let seed = 0; seed < 8; seed++) {
      const g = career(`watched${seed}`);
      toKickoff(g);
      const live = g.modules.matchday.live;
      if (!live) continue;
      live.minute = 33;
      live.running = false;
      const watched = live.beats.filter((b) => b.minute < 33).map((b) => b.text);
      const [out] = onPitch(g);
      const [inP] = benchFor(g);
      if (!out || !inP) continue;
      applySubstitution(g, out.id, inP.id);
      expect(
        live.beats.filter((b) => b.minute < 33).map((b) => b.text),
        `seed ${seed}`
      ).toEqual(watched);
    }
  });

  it('leaves a mark in the feed at the minute it happened', () => {
    const g = career('mark');
    toKickoff(g);
    const live = g.modules.matchday.live!;
    live.minute = 51;
    live.running = false;
    const [out] = onPitch(g);
    const [inP] = benchFor(g);
    applySubstitution(g, out!.id, inP!.id);
    const subBeat = live.beats.find((b) => b.kind === 'sub' && b.minute === 51);
    expect(subBeat, 'a sub beat at the substitution minute').toBeTruthy();
    expect(subBeat!.text).toContain(inP!.name);
    expect(subBeat!.text).toContain(out!.name);
  });
});
