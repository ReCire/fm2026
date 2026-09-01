import { describe, it, expect } from 'vitest';
import { Registry } from '$lib/engine/registry';
import { modules } from '$lib/modules';
import { badges, badgeById, earnableBadges, isEarnable, secretCount, ZERO_STATS } from './badges';
import type { GameState, MetaState, ModuleStates } from '$lib/engine/state';
import { createRng, seedFrom } from '$lib/engine/rng';
import { narratives } from '$lib/features/progression/content';
import { knowledgeNodes } from '$lib/features/knowledge/content';
import { applyNarrative } from '$lib/features/progression/rules';

const registry = new Registry(modules);
const registered = new Set(registry.all.map((m) => m.id));

/**
 * Modules that do not exist yet but are named on purpose.
 *
 * The list is here so a typo in `requires` is a test failure while a genuine
 * forward reference is not. Delete a line when its feature lands; the badges
 * behind it become earnable on their own.
 */
const PLANNED = new Set(['mail']);

/*
 * Real node ids, not invented ones.
 *
 * The first version of this file padded the owned list with `sh_pad4` and
 * friends, and `rank7` refused to fire — correctly, because `rankOf` resolves
 * each id against the node table and an id that names no node counts for
 * nothing. Driving a badge with fake data proves the badge works on fake data.
 */
const nodesOf = (doctrine: string) =>
  knowledgeNodes.filter((n) => n.doctrine === doctrine).map((n) => n.id);

function career(narrativeId: string): GameState {
  const seed = seedFrom(`badge-${narrativeId}`);
  const rng = createRng(seed);
  const mods: Record<string, unknown> = {};
  for (const m of registry.all) mods[m.id] = m.state.create(rng.fork(m.id));
  const meta: MetaState = { seed, season: 1, matchday: 1, tick: 0, createdAt: 0, lastPlayedAt: 0 };
  const g: GameState = { meta, modules: mods as unknown as ModuleStates };
  const narrative = narratives.find((n) => n.id === narrativeId)!;

  /*
   * Mirrors `startCareer` in state/career.svelte.ts, which cannot be used here
   * because it writes to the global game singleton.
   *
   * The starting money matters and this test was passing without it. Calling
   * `applyNarrative` alone sets progression and NOTHING else, so every career
   * began this test at zero euros — including Investor, which opens at six
   * million. The one narrative that could have collected "Erste Million" for
   * reading its own premise was the one the check silently skipped.
   */
  applyNarrative(g.modules.progression, narrative);
  g.modules.progression.started = true;
  g.modules.finance.money = narrative.startingMoney;
  g.modules.finance.transferBudget = narrative.startingTransferBudget;
  g.modules.league.playerLevel = narrative.leagueLevel;
  return g;
}

describe('the catalogue', () => {
  it('has unique ids and a full set of copy', () => {
    expect(new Set(badges.map((b) => b.id)).size).toBe(badges.length);
    for (const b of badges) {
      expect(b.desc.endsWith('.'), `${b.id} description is not a sentence`).toBe(true);
      expect(b.name.length, b.id).toBeLessThan(28);
    }
  });

  it('gives every badge exactly one way to be won', () => {
    // Both would mean two systems racing to award the same thing; neither
    // means a badge that renders forever and never fires.
    for (const b of badges) {
      const ways = (b.test ? 1 : 0) + (b.grantedBy ? 1 : 0);
      expect(ways, `${b.id} has ${ways} routes to being earned`).toBe(1);
    }
  });

  it('never requires a module that is neither built nor planned', () => {
    for (const b of badges) {
      for (const id of b.requires) {
        expect(
          registered.has(id) || PLANNED.has(id),
          `${b.id} requires "${id}", which is neither a module nor on the planned list`
        ).toBe(true);
      }
    }
  });
});

describe('earnability', () => {
  it('hides badges whose feature does not exist yet', () => {
    const earnable = earnableBadges(registered);
    expect(earnable.length).toBeGreaterThan(0);
    expect(earnable.length, 'nothing is being held back — is the gate wired?').toBeLessThan(
      badges.length
    );
    // The mail badges are the current example and should be invisible.
    expect(earnable.map((b) => b.id)).not.toContain('inboxzero');
  });

  it('lights a badge up the moment its module arrives', () => {
    // The tunable-changes-something rule, pointed at the gate: if adding the
    // module to the set changes nothing, the gate has stopped reaching.
    const withMail = new Set([...registered, 'mail']);
    expect(earnableBadges(withMail).length).toBeGreaterThan(earnableBadges(registered).length);
    expect(isEarnable(badgeById.get('inboxzero')!, withMail)).toBe(true);
  });

  it('counts the secret ones without naming them', () => {
    const n = secretCount(registered);
    expect(n).toBeGreaterThan(0);
    expect(n).toBeLessThan(earnableBadges(registered).length);
  });
});

describe('nothing is won at kickoff', () => {
  /*
   * The failure this catches is an achievement handed out for reading the
   * premise. Two narratives start rich — Investor opens at 6.000.000 EUR with
   * no debt — so "Erste Million" and "Schuldenfrei" would both land in the
   * first second of a career that had achieved nothing yet, and the player
   * would learn from their first two badges that badges are free.
   */
  for (const n of narratives) {
    it(`${n.id} starts with an empty trophy case`, () => {
      const g = career(n.id);
      const won = earnableBadges(registered)
        .filter((b) => b.test?.(g, ZERO_STATS))
        .map((b) => b.id);
      expect(won, `${n.id} was awarded badges before playing`).toEqual([]);
    });
  }
});

describe('every test is reachable', () => {
  it('fires when its condition is forced', () => {
    /*
     * A badge nobody can win is the same bug as an upgrade that does nothing,
     * and it fails the same way — silently, permanently, and only noticed by a
     * player who went looking. So each polled badge is driven into its own
     * condition and asserted to notice.
     */
    const drive: Record<string, (g: GameState) => void> = {
      first_win: () => {},
      ten_wins: () => {},
      youthup: () => {},
      spamlord: () => {},
      promo: (g) => {
        g.modules.history.seasons.push({
          season: 1, league: '4. Liga', rank: 1, points: 70, goalsFor: 60,
          goalsAgainst: 20, outcome: 'promoted', biggestWin: null
        });
      },
      topflight: (g) => {
        g.modules.league.playerLevel = 0;
        g.modules.history.seasons.push({
          season: 1, league: '2. Liga', rank: 1, points: 70, goalsFor: 60,
          goalsAgainst: 20, outcome: 'promoted', biggestWin: null
        });
      },
      cup: (g) => { g.modules.cup.titles = 1; },
      season5: (g) => { g.meta.season = 5; },
      millionaire: (g) => { g.modules.finance.money = 1_150_000; },
      debtfree: (g) => { g.modules.finance.loanDebt = 0; g.modules.finance.money = 250_000; },
      sponsor: (g) => {
        g.modules.sponsors.contracts = [{
          name: 'Bäckerei Schmitz', periodic: 4_000, winBonus: 500,
          matchdaysRemaining: 30, totalDuration: 34
        }];
      },
      stadium20k: (g) => {
        for (const b of Object.values(g.modules.stadium.blocks)) b.cap = 3_000;
      },
      firstnode: (g) => { g.modules.knowledge.owned = ['sh_umschlag']; },
      rank7: (g) => { g.modules.knowledge.owned = nodesOf('shadow').slice(0, 7); },
      fulltree: (g) => { g.modules.knowledge.owned = nodesOf('shadow'); },
      synth1: (g) => { g.modules.knowledge.owned = nodesOf('synth').slice(0, 1); },
      synth3: (g) => { g.modules.knowledge.owned = nodesOf('synth').slice(0, 3); },
      star90: (g) => {
        const p = g.modules.squad.players[0]!;
        for (const k of Object.keys(p.attributes)) {
          (p.attributes as Record<string, number>)[k] = 95;
        }
      },
      loyal: (g) => { g.modules.squad.players[0]!.contractMatchdays = 34 * 5; },
      doubleagent: (g) => {
        // shadow|talent is hostile; six in each.
        g.modules.knowledge.owned = [
          ...nodesOf('shadow').slice(0, 6),
          ...nodesOf('talent').slice(0, 6)
        ];
      },
      purist: (g) => {
        g.modules.knowledge.owned = [];
        g.modules.history.seasons.push({
          season: 1, league: '4. Liga', rank: 8, points: 44, goalsFor: 40,
          goalsAgainst: 40, outcome: 'stayed', biggestWin: null
        });
      },
      hoarder: (g) => { g.modules.knowledge.points = 10; },
      survivor: (g) => {
        g.modules.finance.money = -50_000;
        g.modules.history.seasons.push({
          season: 1, league: '4. Liga', rank: 14, points: 34, goalsFor: 30,
          goalsAgainst: 50, outcome: 'stayed', biggestWin: null
        });
      }
    };

    const statDriven: Record<string, typeof ZERO_STATS> = {
      first_win: { ...ZERO_STATS, wins: 1 },
      ten_wins: { ...ZERO_STATS, wins: 10 },
      youthup: { ...ZERO_STATS, youthPromoted: 1 },
      debtfree: { ...ZERO_STATS, everInDebt: true },
      spamlord: { ...ZERO_STATS, spamDeleted: 20 }
    };

    const polled = badges.filter((b) => b.test);
    const untested = polled.filter((b) => !(b.id in drive)).map((b) => b.id);
    expect(untested, 'a badge can be polled but nothing here proves it can fire').toEqual([]);

    for (const b of polled) {
      const g = career('aufsteiger');
      drive[b.id]!(g);
      const stats = statDriven[b.id] ?? ZERO_STATS;
      expect(b.test!(g, stats), `${b.id} never fires, even when forced`).toBe(true);
    }
  });
});

describe('the tests do not write', () => {
  it('leaves the game byte-identical', () => {
    // Same rule as `attention`: these run on render, and a badge that advanced
    // the game would make progress depend on which screen you were looking at.
    const g = career('aufsteiger');
    const before = JSON.stringify(g);
    for (const b of badges) b.test?.(g, ZERO_STATS);
    expect(JSON.stringify(g)).toBe(before);
  });
});
