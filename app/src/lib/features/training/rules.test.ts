import { describe, it, expect } from 'vitest';
import { createRng } from '$lib/engine/rng';
import { gainChance, declineChance, restFor, trainWeek, focusOf, seasonProgress } from './rules';
import { createTraining, type TrainingState } from './state';
import type { Player, SquadState } from '../squad/state';
import { uniform, ATTRIBUTES } from '../squad/attributes';
import { strengthOf } from '../squad/rules';
import { trainingContent } from './content';
import { EMPTY_RECORD } from '$lib/content/talents';

function player(over: Partial<Player> = {}): Player {
  return {
    id: 'p1', name: 'Test Spieler', pos: 'MIT',
    attributes: uniform(50), fitness: 70, morale: 70, age: 22,
    marketValue: 100_000, wage: 1000, trait: '—',
    injured: 0, suspended: 0, individualFocus: 'allgemein',
    record: { ...EMPTY_RECORD }, contractMatchdays: 34,
    ...over
  };
}

function squadOf(players: Player[]): SquadState {
  return { players, lineup: [], captainId: null, awardedTalents: [] };
}

const rng = () => createRng(12345);

describe('gainChance', () => {
  it('a teenager improves faster than a peak-age player', () => {
    const young = gainChance(player({ age: 17 }), 'technik', 'normal', true);
    const peak = gainChance(player({ age: 24 }), 'technik', 'normal', true);
    expect(young).toBeGreaterThan(peak);
  });

  it('improvement gets rarer the better the attribute already is', () => {
    const low = gainChance(player({ attributes: uniform(50) }), 'technik', 'normal', true);
    const high = gainChance(player({ attributes: uniform(85) }), 'technik', 'normal', true);
    expect(high).toBeLessThan(low);
  });

  /*
   * The ceiling is what makes the squad finite. Without it, six seasons of
   * training produce eleven 99s and the transfer market has nothing to sell.
   */
  it('is effectively closed at the top of the range', () => {
    const near = gainChance(player({ attributes: uniform(95) }), 'technik', 'hart', true);
    expect(near).toBeLessThan(0.01);
  });

  it('harder training develops faster', () => {
    const p = player();
    expect(gainChance(p, 'technik', 'hart', true))
      .toBeGreaterThan(gainChance(p, 'technik', 'locker', true));
  });

  it('a personal focus beats following the team focus', () => {
    const p = player();
    expect(gainChance(p, 'technik', 'normal', true))
      .toBeGreaterThan(gainChance(p, 'technik', 'normal', false));
  });

  it('never leaves 0..1', () => {
    for (const age of [15, 22, 30, 40]) {
      for (const value of [1, 50, 99]) {
        const c = gainChance(player({ age, attributes: uniform(value) }), 'technik', 'hart', true);
        expect(c).toBeGreaterThanOrEqual(0);
        expect(c).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe('declineChance', () => {
  it('is zero at or below the peak age', () => {
    expect(declineChance(player({ age: trainingContent.peakAgeTo }))).toBe(0);
    expect(declineChance(player({ age: 20 }))).toBe(0);
  });

  it('grows with every year past the peak', () => {
    expect(declineChance(player({ age: 34 }))).toBeGreaterThan(declineChance(player({ age: 30 })));
  });
});

describe('restFor', () => {
  /*
   * Two prices, not one. Hard training recovers LESS, and charges the rest on
   * matchday. A choice that drains you in both places is not a choice.
   */
  it('recovers less the harder the week, but never goes negative', () => {
    expect(restFor('locker')).toBeGreaterThan(restFor('normal'));
    expect(restFor('normal')).toBeGreaterThan(restFor('hart'));
    expect(restFor('hart')).toBeGreaterThan(0);
  });
});

describe('focusOf', () => {
  it('a personal focus wins over the team focus', () => {
    const t = { ...createTraining(rng()), teamFocus: 'kraft' as const };
    expect(focusOf(player({ individualFocus: 'tempo' }), t)).toBe('tempo');
    expect(focusOf(player({ individualFocus: 'allgemein' }), t)).toBe('kraft');
  });
});

describe('trainWeek', () => {
  it('recovers fitness for everybody, capped at 100', () => {
    const t = createTraining(rng());
    const squad = squadOf([player({ fitness: 40 }), player({ id: 'p2', fitness: 98 })]);
    trainWeek(t, squad, rng());
    expect(squad.players[0]!.fitness).toBe(40 + restFor('normal'));
    expect(squad.players[1]!.fitness).toBe(100);
  });

  it('counts an injury down and reports the return', () => {
    const t = createTraining(rng());
    const squad = squadOf([player({ injured: 1 })]);
    const out = trainWeek(t, squad, rng());
    expect(squad.players[0]!.injured).toBe(0);
    expect(out.recovered).toHaveLength(1);
  });

  /* An injured player rests. A squad that develops fastest while its best man
     is in a cast is not modelling anything. */
  it('an injured player does not train', () => {
    const t = { ...createTraining(rng()), intensity: 'hart' as const };
    const squad = squadOf(
      Array.from({ length: 40 }, (_, i) => player({ id: `p${i}`, age: 17, injured: 3 }))
    );
    const out = trainWeek(t, squad, rng());
    expect(out.changes).toHaveLength(0);
  });

  it('is deterministic for a seed', () => {
    const run = () => {
      const t = createTraining(rng());
      const squad = squadOf(Array.from({ length: 20 }, (_, i) => player({ id: `p${i}`, age: 19 })));
      return trainWeek(t, squad, createRng(999)).changes;
    };
    expect(run()).toEqual(run());
  });

  it('records the season total alongside the week', () => {
    const t: TrainingState = { ...createTraining(rng()), teamFocus: 'technik' };
    const squad = squadOf(Array.from({ length: 30 }, (_, i) => player({ id: `p${i}`, age: 17 })));
    for (let w = 0; w < 6; w++) trainWeek(t, squad, createRng(w));
    const anyGain = squad.players.find((p) => seasonProgress(t, p.id) > 0);
    expect(anyGain, 'six weeks of teenagers on one focus should improve somebody').toBeTruthy();
  });

  /*
   * The shape that matters, measured rather than asserted from the formula:
   * a squad of teenagers must out-develop a squad of veterans by a wide margin.
   * Sampled over 30 squads because one squad of 20 is noise.
   */
  it('young squads develop and old squads decay', () => {
    const net = (age: number) => {
      let sum = 0;
      for (let seed = 0; seed < 30; seed++) {
        const t = createTraining(rng());
        const squad = squadOf(
          Array.from({ length: 20 }, (_, i) => player({ id: `p${i}`, age, attributes: uniform(55) }))
        );
        for (let w = 0; w < 10; w++) trainWeek(t, squad, createRng(seed * 100 + w));
        sum += squad.players.reduce(
          (s, p) => s + ATTRIBUTES.reduce((a, k) => a + p.attributes[k], 0) - 55 * 5, 0);
      }
      return sum / 30;
    };
    const young = net(18);
    const old = net(34);
    expect(young).toBeGreaterThan(0);
    expect(old).toBeLessThan(0);
    expect(young - old).toBeGreaterThan(20);
  });
});

describe('a career actually develops players', () => {
  /*
   * Training was very nearly inert and nobody noticed for a week.
   *
   * `baseGain: 0.055` is a per-attribute weekly chance, and `allgemein` divides
   * it across all five — so a default squad gained 0.011 points per attribute
   * per week, which is +0.37 overall a SEASON. Measured over four simulated
   * seasons the best player in the squad had improved by ONE point.
   *
   * It hid because every earlier measurement used `teamStrength`, which folds
   * in fitness and picks the best eleven: that number moved convincingly while
   * the players underneath it did not move at all. The right measurement is a
   * player against his own debut, which is exactly what the talent record now
   * makes possible.
   *
   * These assert the SHAPE — ignoring training does little, coaching does a
   * lot — rather than a figure, so a retune shows up as a real change of
   * intent rather than a red test.
   */
  const grow = (seasons: number, coached: boolean) => {
    const t = createTraining(rng());
    if (coached) t.intensity = 'hart';
    const squad = squadOf(
      Array.from({ length: 18 }, (_, i) =>
        player({
          id: `p${i}`,
          age: coached ? 18 : 30,
          attributes: uniform(50),
          /*
           * BOTH sides train `allgemein`, and that is deliberate. A personal
           * focus pours the whole week into one attribute, so it gains five
           * times as fast there but moves the OVERALL by only that attribute's
           * weight — roughly a quarter. Focusing shapes a player; it does not
           * maximise him. Comparing a focused squad against a spread one
           * therefore measures the wrong thing, and the first version of this
           * test did exactly that and read as a failure.
           */
          individualFocus: 'allgemein'
        })
      )
    );
    const before = squad.players.map((p) => strengthOf(p));
    for (let w = 0; w < seasons * 34; w++) trainWeek(t, squad, createRng(w));
    return Math.max(...squad.players.map((p, i) => strengthOf(p) - before[i]!));
  };

  it('a squad nobody coaches improves slowly but visibly', () => {
    const gained = grow(3, false);
    expect(gained, 'three seasons of default training changed nothing').toBeGreaterThanOrEqual(2);
    expect(gained, 'ignoring training should not build a superteam').toBeLessThan(12);
  });

  it('youth and hard weeks develop faster than veterans on an easy régime', () => {
    expect(grow(3, true)).toBeGreaterThan(grow(3, false) * 1.5);
  });

  /*
   * The floor a talent predicate needs to be expressible at all: "arrived and
   * became somebody" is only a sentence if somebody can become somebody. In a
   * real simulated career — where a squad is a spread of ages and positions
   * rather than eighteen identical eighteen-year-olds — the best prospect
   * gained 14 over three seasons under a coaching régime. This fixture is
   * flatter, so it asks for less.
   */
  it('a coached prospect can gain enough for a career to be a story', () => {
    expect(grow(3, true)).toBeGreaterThanOrEqual(7);
  });
});
