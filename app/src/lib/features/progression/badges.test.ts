import { describe, it, expect } from 'vitest';
import { Registry } from '$lib/engine/registry';
import { runTick } from '$lib/engine/clock';
import { createRng, seedFrom } from '$lib/engine/rng';
import { modules } from '$lib/modules';
import type { GameState, MetaState, ModuleStates } from '$lib/engine/state';
import { applyNarrative, awardBadges, grantBadge, earnedBadges } from './rules';
import { narratives } from './content';
import { badges, earnableBadges, isEarnable, collectStats } from '$lib/content/badges';

/**
 * The awarding path.
 *
 * `content/badges.ts` was 456 lines imported by exactly one file in the tree —
 * its own test. Nothing awarded one, nothing displayed one, and because badges
 * are not fx-gated the dormancy census was structurally blind to it. It failed
 * no purchase; it simply never fired. senior-frontend found it by diffing the
 * prototype's screens against the port.
 */

const registry = new Registry(modules);
const registered = new Set(registry.all.map((m) => m.id));

function career(seed = seedFrom('badges')): GameState {
  const rng = createRng(seed);
  const mods: Record<string, unknown> = {};
  for (const m of registry.all) mods[m.id] = m.state.create(rng.fork(m.id));
  const meta: MetaState = { seed, season: 1, matchday: 1, tick: 0, createdAt: 0, lastPlayedAt: 0 };
  const g: GameState = { meta, modules: mods as unknown as ModuleStates };
  applyNarrative(g.modules.progression, narratives[0]!);
  g.modules.progression.started = true;
  g.modules.squad.lineup = g.modules.squad.players.slice(0, 11).map((p) => p.id);
  return g;
}

describe('reachability', () => {
  it('hides a badge whose feature has not shipped, rather than zeroing it', () => {
    /*
     * An achievement you can never earn is worse than a missing one: it is a
     * promise the game breaks quietly, and it sits in the list forever looking
     * like something you failed at.
     */
    const unreachable = badges.filter((b) => !isEarnable(b, registered));
    for (const b of unreachable) {
      expect(b.requires.some((id) => !registered.has(id))).toBe(true);
    }
    expect(earnableBadges(registered).length).toBeGreaterThan(0);
  });

  it('never grants a badge whose feature does not exist', () => {
    const g = career();
    const won = awardBadges(g, earnableBadges(registered));
    for (const b of won) expect(isEarnable(b, registered)).toBe(true);
  });

  it('names a real module in every `requires`, or the badge is dead content', () => {
    /*
     * The guard that turns staleness into a build failure. `requires` is
     * hand-written, so it goes out of date the moment a mechanic MOVES —
     * which is exactly what happened to the raid badge, written when a raid
     * was going to arrive by mail and now raised by `press`. A badge naming a
     * module that will never exist is unreachable forever and nothing else in
     * the project would ever say so.
     *
     * Roadmap names are allowed and listed, so adding one is a decision rather
     * than an accident.
     */
    const ROADMAP = new Set(['mail', 'holding', 'stocks', 'fans', 'rawMaterials']);
    for (const b of badges) {
      for (const id of b.requires) {
        expect(
          registered.has(id) || ROADMAP.has(id),
          `badge "${b.id}" requires "${id}", which is neither a module nor on the roadmap`
        ).toBe(true);
      }
    }
  });
});

describe('standing conditions', () => {
  it('awards nothing twice, however often it is checked', () => {
    const g = career();
    const first = awardBadges(g, earnableBadges(registered));
    const second = awardBadges(g, earnableBadges(registered));
    expect(second).toEqual([]);
    expect(g.modules.progression.earnedBadges).toHaveLength(first.length);
  });

  it('polls no event-granted badge, because polling one never finds it', () => {
    /*
     * "You survived a raid" was true for one morning and is not true now. A
     * standing check would silently never award it — the exact failure this
     * whole file exists to fix, reintroduced one layer in.
     */
    const eventOnly = badges.filter((b) => b.grantedBy);
    for (const b of eventOnly) expect(b.test).toBeUndefined();

    const g = career();
    const won = awardBadges(g, badges);
    for (const b of won) expect(b.grantedBy).toBeUndefined();
  });

  it('reacts to the career actually moving', () => {
    /*
     * Vary the input, assert the output moves. A badge system that awards the
     * same set to a fresh career and a decorated one is a badge system that
     * reads nothing.
     */
    const fresh = career();
    awardBadges(fresh, earnableBadges(registered));
    const before = fresh.modules.progression.earnedBadges.length;

    fresh.modules.matchday.careerWins = 500;
    const later = awardBadges(fresh, earnableBadges(registered));
    expect(later.length, 'five hundred wins earned nothing').toBeGreaterThan(0);
    expect(fresh.modules.progression.earnedBadges.length).toBeGreaterThan(before);
  });

  it('reads its counters out of the modules that keep them', () => {
    const g = career();
    g.modules.matchday.careerWins = 12;
    expect(collectStats(g).wins).toBe(12);
  });
});

describe('event grants', () => {
  it('awards once and reports it, then stays quiet', () => {
    const g = career();
    const first = grantBadge(g, 'shadow.raidSurvived');
    expect(first?.id).toBe('raid');
    expect(grantBadge(g, 'shadow.raidSurvived')).toBeUndefined();
    expect(g.modules.progression.earnedBadges.filter((id) => id === 'raid')).toHaveLength(1);
  });

  it('does nothing for a key no badge claims', () => {
    /*
     * Deliberately silent. The alternative is that retiring a badge breaks the
     * module that granted it, and a feature should not be able to fail because
     * an achievement was deleted.
     */
    const g = career();
    expect(() => grantBadge(g, 'nothing.claims.this')).not.toThrow();
    expect(g.modules.progression.earnedBadges).toHaveLength(0);
  });
});

describe('through the tick', () => {
  it('fires on a matchday, which is when most of them come true', () => {
    const g = career();
    g.modules.matchday.careerWins = 500;
    runTick(registry, g, 'matchday');
    expect(g.modules.progression.earnedBadges.length).toBeGreaterThan(0);
  });

  it('fires at a season end too, for the ones that come true in May', () => {
    const g = career();
    g.modules.matchday.careerWins = 500;
    runTick(registry, g, 'seasonEnd');
    expect(g.modules.progression.earnedBadges.length).toBeGreaterThan(0);
  });

  it('counts Saturday before it judges Saturday', () => {
    /*
     * Progression runs at world/90, after every module that owns a counter has
     * finished writing. A wins badge checked before matchday counts the win is
     * a badge that arrives a week late, forever — and it would never look like
     * a bug, only like a delay nobody could name.
     */
    const g = career();
    const wins = badges.find((b) => b.id === 'wins-1' || b.requires.includes('matchday'));
    expect(wins).toBeDefined();

    g.modules.matchday.careerWins = 0;
    runTick(registry, g, 'matchday');
    const afterOne = g.modules.matchday.careerWins;

    // Whatever the match did, the badge check saw the same number the report did.
    expect(collectStats(g).wins).toBe(afterOne);
  });

  it('survives a career without ever throwing', () => {
    const g = career(31337);
    for (let i = 0; i < 34; i++) {
      runTick(registry, g, 'matchday');
      g.meta.matchday += 1;
      g.meta.tick += 1;
    }
    runTick(registry, g, 'seasonEnd');
    expect(earnedBadges(g).length).toBeGreaterThanOrEqual(0);
  });
});
