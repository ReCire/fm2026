import { describe, it, expect } from 'vitest';
import {
  modifiers, effectiveStrength, fitnessMultiplier, moraleDelta,
  readiness, outcomeOf, scoreline, recordResult, form, formLetters
} from './rules';
import { createMatchday, FORMATIONS, STYLES, TALKS, type MatchdayState, type Report } from './state';
import { matchdayContent } from './content';
import { createRng } from '$lib/engine/rng';

const fresh = (): MatchdayState => createMatchday(createRng(1));
const report = (gf: number, ga: number, md = 1): Report => ({
  season: 1, matchday: md, opponent: 'FC Deichtor', isHome: true,
  goalsFor: gf, goalsAgainst: ga, ourStrength: 60, opponentStrength: 58
});

describe('content completeness', () => {
  it('gives every formation, style and talk its modifiers', () => {
    for (const f of FORMATIONS) expect(matchdayContent.formation[f], f).toBeDefined();
    for (const s of STYLES) expect(matchdayContent.style[s], s).toBeDefined();
    for (const t of TALKS) expect(matchdayContent.talk[t], t).toBeDefined();
  });

  it('describes each option in words, since the numbers are never shown raw', () => {
    for (const f of FORMATIONS) expect(matchdayContent.formation[f].label.length).toBeGreaterThan(10);
    for (const s of STYLES) expect(matchdayContent.style[s].label.length).toBeGreaterThan(10);
    for (const t of TALKS) expect(matchdayContent.talk[t].label.length).toBeGreaterThan(10);
  });
});

describe('modifiers', () => {
  it('values a formation differently home and away', () => {
    const m = fresh();
    m.formation = '4-3-3';
    expect(modifiers(m, true).formation).toBeGreaterThan(modifiers(m, false).formation);
    m.formation = '5-3-2';
    expect(modifiers(m, false).formation).toBeGreaterThan(modifiers(m, true).formation);
  });

  it('leaves the balanced default worth nothing either way', () => {
    const m = fresh();
    expect(modifiers(m, true).total).toBe(0);
    expect(modifiers(m, false).total).toBe(0);
  });

  it('sums the three choices', () => {
    const m = fresh();
    m.formation = '4-3-3'; m.style = 'offensiv'; m.talk = 'fordernd';
    const mod = modifiers(m, true);
    expect(mod.total).toBe(mod.formation + mod.style + mod.talk);
    expect(mod.total).toBe(2 + 2 + 2);
  });
});

describe('effectiveStrength', () => {
  it('applies the modifiers to the squad base', () => {
    const m = fresh();
    m.style = 'offensiv';
    expect(effectiveStrength(m, 60, true)).toBe(62);
  });

  it('never falls below 1, however bad the choices', () => {
    const m = fresh();
    m.formation = '4-3-3'; m.style = 'defensiv';
    expect(effectiveStrength(m, 0, false)).toBeGreaterThanOrEqual(1);
  });

  /**
   * Home advantage belongs to league, which applies it to both sides. Adding it
   * here too would double it for the player only — the exact asymmetry that
   * made the prototype's record flatter than the table around it.
   */
  it('does not add home advantage — that is league\'s to apply', () => {
    const m = fresh();
    expect(effectiveStrength(m, 60, true)).toBe(effectiveStrength(m, 60, false));
  });
});

describe('costs land later, not now', () => {
  it('offensive football costs fitness rather than in-match risk', () => {
    const m = fresh();
    m.style = 'offensiv';
    expect(fitnessMultiplier(m)).toBeGreaterThan(1);
    m.style = 'defensiv';
    expect(fitnessMultiplier(m)).toBeLessThan(1);
  });

  it('a demanding team talk buys strength and costs morale', () => {
    const m = fresh();
    m.talk = 'fordernd';
    expect(modifiers(m, true).talk).toBeGreaterThan(0);
    expect(moraleDelta(m)).toBeLessThan(0);
    m.talk = 'motivierend';
    expect(moraleDelta(m)).toBeGreaterThan(0);
  });
});

describe('readiness', () => {
  it('is ready with a full, fit eleven', () => {
    expect(readiness(11, 16, 90)).toEqual({ ready: true, problems: [] });
  });

  it('reports an incomplete lineup', () => {
    expect(readiness(9, 16, 90).problems[0]).toMatch(/9 von 11/);
  });

  it('reports a thin squad', () => {
    expect(readiness(11, 8, 90).problems.join(' ')).toMatch(/8 Spieler/);
  });

  it('reports exhaustion', () => {
    expect(readiness(11, 16, 45).problems.join(' ')).toMatch(/45%/);
  });

  it('reports several problems at once rather than only the first', () => {
    expect(readiness(9, 8, 40).problems).toHaveLength(3);
  });

  it('does not complain about fitness before a lineup exists', () => {
    expect(readiness(0, 0, 0).problems.join(' ')).not.toMatch(/Fitness/);
  });
});

describe('results', () => {
  it('reads a scoreline correctly', () => {
    expect(outcomeOf(report(2, 1))).toBe('win');
    expect(outcomeOf(report(1, 1))).toBe('draw');
    expect(outcomeOf(report(0, 3))).toBe('loss');
    expect(scoreline(report(2, 1))).toBe('2:1');
  });

  it('keeps the newest result first', () => {
    const m = fresh();
    recordResult(m, report(1, 0, 1));
    recordResult(m, report(0, 2, 2));
    expect(m.lastReport!.matchday).toBe(2);
    expect(m.recent[0]!.matchday).toBe(2);
  });

  it('caps the history and drops the oldest', () => {
    const m = fresh();
    for (let i = 1; i <= 20; i++) recordResult(m, report(1, 0, i));
    expect(m.recent).toHaveLength(12);
    expect(m.recent[0]!.matchday).toBe(20);
    expect(m.recent.at(-1)!.matchday).toBe(9);
  });

  it('reads form newest-first', () => {
    const m = fresh();
    recordResult(m, report(1, 0, 1));   // win
    recordResult(m, report(0, 0, 2));   // draw
    recordResult(m, report(0, 1, 3));   // loss
    expect(form(m)).toEqual(['loss', 'draw', 'win']);
    expect(formLetters(m)).toBe('NUS');
  });

  it('has empty form before anything has been played', () => {
    expect(formLetters(fresh())).toBe('');
  });
});
