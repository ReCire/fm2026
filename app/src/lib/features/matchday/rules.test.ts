import { comebackFor } from './outcome';
import { REFEREE_STRENGTH_POINTS, COMEBACK_STRENGTH_POINTS } from './module';
import { describe, it, expect } from 'vitest';
import {
  modifiers, effectiveStrength, fitnessMultiplier, goalChance, moraleDelta,
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
  it('offensive football costs fitness, but fitness is no longer the main price', () => {
    const m = fresh();
    m.style = 'offensiv';
    expect(fitnessMultiplier(m)).toBeGreaterThan(1);
    // defensiv buys nothing in fitness: the real price of a style is VARIANCE,
    // and giving defensive play a fitness bonus too would put both styles back
    // on a single axis where one of them has to dominate.
    m.style = 'defensiv';
    expect(fitnessMultiplier(m)).toBe(1);
  });

  it('opens or closes the game for BOTH sides, which is where the trade lives', () => {
    const m = fresh();
    m.style = 'offensiv';
    expect(goalChance(m)).toBeGreaterThan(1);
    m.style = 'defensiv';
    expect(goalChance(m)).toBeLessThan(1);
    m.style = 'ausgeglichen';
    expect(goalChance(m)).toBe(1);
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

describe('the two doctrine keys the matchday model owns', () => {
  /*
   * Six nodes buy `refBias` and three buy `comeback`, and until now both were
   * unmapped — nine nodes of the tree waiting on no new economy, no new
   * screen, and nobody having looked. `npm run census` found them; neither
   * fussballmanager-15 nor I would have guessed they were there.
   */
  it('converts refereeing bias at the rate the prototype implied', () => {
    /*
     * The unit conversion, asserted rather than trusted. The prototype shifted
     * a win probability of `0.5 + strengthDiff × 0.02` by the raw fx value, so
     * five percent is two and a half strength points. Derived, not chosen —
     * and this is the check that it stayed derived, because a number this
     * large is only safe while it can be recomputed from something.
     */
    const winProbabilityPerStrengthPoint = 0.02;
    expect(REFEREE_STRENGTH_POINTS).toBe(1 / winProbabilityPerStrengthPoint);
  });

  it('makes Resilienz worth less per point than a referee', () => {
    /*
     * A referee tilts the whole match; Resilienz applies to forty-five minutes,
     * and only to the forty-five that begin with us behind. At the same rate it
     * would be the better buy in every doctrine offering both, which is not
     * what the tier costs say either node is.
     */
    expect(COMEBACK_STRENGTH_POINTS).toBeLessThan(REFEREE_STRENGTH_POINTS);
  });

  it('spends Resilienz only from behind, in both directions', () => {
    /*
     * Vary the input, assert the output moves — and assert it does NOT move on
     * the other side. A bonus that also applied while winning would be a flat
     * strength node with a more interesting name, and nothing about the effect
     * label would give it away.
     */
    const live = { comeback: 9 };
    expect(comebackFor(live, 0, 2)).toBe(9);
    expect(comebackFor(live, 1, 1)).toBe(0);
    expect(comebackFor(live, 3, 1)).toBe(0);
  });

  it('gives a club with no such node nothing at all', () => {
    expect(comebackFor({ comeback: 0 }, 0, 3)).toBe(0);
  });
});
