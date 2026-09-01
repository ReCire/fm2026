import { describe, it, expect } from 'vitest';
import {
  advanceContracts,
  findOffer,
  formFactor,
  levelFactor,
  matchdayPayout,
  maxSlots,
  recordResult,
  refreshOffers,
  signOffer,
  totalPayout
} from './rules';
import { createSponsors } from './state';
import { createRng } from '$lib/engine/rng';
import { sponsorsContent } from './content';
import { Registry } from '$lib/engine/registry';
import { runTick } from '$lib/engine/clock';
import { createRng as createSeededRng, seedFrom } from '$lib/engine/rng';
import { modules } from '$lib/modules';
import type { GameState, MetaState, ModuleStates } from '$lib/engine/state';
import { applyNarrative, unlock } from '../progression/rules';
import { narratives } from '../progression/content';
import { hire } from '../staff/rules';

const base = () => createSponsors(createRng(1));

describe('levelFactor', () => {
  it('is 1 at the weakest league, Liga 4', () => {
    expect(levelFactor(sponsorsContent.weakestLevel)).toBe(1);
  });

  it('grows the higher the club plays', () => {
    const liga4 = levelFactor(3);
    const liga1 = levelFactor(0);
    expect(liga1).toBeGreaterThan(liga4);
  });

  it('never drops below 1 for a level at or below the weakest', () => {
    expect(levelFactor(3)).toBe(1);
    expect(levelFactor(4)).toBe(1);
  });

  it('compounds: the top flight is several times Liga 4, not a rounding error', () => {
    /*
     * The additive version topped out at ~2×, which read in play as
     * "sponsoring is capped": a champion's offers were barely distinguishable
     * from a promoted club's. The exact number is content's business; the
     * property that it is a MULTIPLE is this test's.
     */
    expect(levelFactor(0)).toBeGreaterThan(4);
  });
});

describe('maxSlots', () => {
  it('gives the weakest league exactly one backer', () => {
    expect(maxSlots(sponsorsContent.weakestLevel)).toBe(1);
  });

  it('grows on the way up and is capped at the content maximum', () => {
    expect(maxSlots(2)).toBeGreaterThan(maxSlots(3));
    expect(maxSlots(0)).toBe(sponsorsContent.maxSlots);
  });
});

describe('formFactor', () => {
  it('is neutral with no history yet', () => {
    expect(formFactor([])).toBe(1);
  });

  it('rewards a run of wins over a run of losses', () => {
    const hot = formFactor(['win', 'win', 'win', 'win', 'win']);
    const cold = formFactor(['loss', 'loss', 'loss', 'loss', 'loss']);
    expect(hot).toBeGreaterThan(cold);
  });
});

describe('refreshOffers', () => {
  it('produces one offer per archetype', () => {
    const s = base();
    refreshOffers(s, createRng(1), 3);
    expect(s.offers).toHaveLength(sponsorsContent.archetypes.length);
    expect(new Set(s.offers.map((o) => o.archetypeId))).toEqual(
      new Set(sponsorsContent.archetypes.map((a) => a.id))
    );
  });

  it('scales every offer up for a club in a stronger league', () => {
    const weak = createSponsors(createRng(1));
    const strong = createSponsors(createRng(1));
    refreshOffers(weak, createRng(42), 3);
    refreshOffers(strong, createRng(42), 0);

    const totalFee = (s: typeof weak) => s.offers.reduce((sum, o) => sum + o.fee, 0);
    expect(totalFee(strong)).toBeGreaterThan(totalFee(weak));
  });

  it('replaces whatever was on the table rather than appending', () => {
    const s = base();
    refreshOffers(s, createRng(1), 3);
    const firstIds = s.offers.map((o) => o.id);
    refreshOffers(s, createRng(2), 3);
    expect(s.offers).toHaveLength(sponsorsContent.archetypes.length);
    expect(s.offers.map((o) => o.id)).not.toEqual(firstIds);
  });
});

describe('signOffer', () => {
  it('signs the chosen offer into a slot and clears the table only when full', () => {
    const s = base();
    refreshOffers(s, createRng(1), 3);
    const target = s.offers[0]!;
    const signed = signOffer(s, target.id, 1);

    expect(signed).toEqual({ name: target.name, fee: target.fee });
    expect(s.contracts).toEqual([
      {
        name: target.name,
        periodic: target.periodic,
        winBonus: target.winBonus,
        matchdaysRemaining: target.duration,
        totalDuration: target.duration
      }
    ]);
    // The single slot is now full, so the remaining offers vanish with it.
    expect(s.offers).toHaveLength(0);
  });

  it('keeps the remaining offers signable while slots stay open', () => {
    const s = base();
    refreshOffers(s, createRng(1), 0);
    const [first, second] = [s.offers[0]!, s.offers[1]!];

    signOffer(s, first.id, 3);
    expect(s.offers.length).toBeGreaterThan(0);

    signOffer(s, second.id, 3);
    expect(s.contracts).toHaveLength(2);
  });

  it('refuses a signature when every slot is taken', () => {
    const s = base();
    refreshOffers(s, createRng(1), 3);
    const target = s.offers[0]!;
    s.contracts = [
      { name: 'Bestand', periodic: 100, winBonus: 0, matchdaysRemaining: 5, totalDuration: 6 }
    ];
    expect(signOffer(s, target.id, 1)).toBeUndefined();
    expect(s.contracts).toHaveLength(1);
  });

  it('returns undefined for an offer that does not exist', () => {
    const s = base();
    expect(signOffer(s, 'nope', 3)).toBeUndefined();
  });

  it('findOffer looks up by id', () => {
    const s = base();
    refreshOffers(s, createRng(1), 3);
    expect(findOffer(s, s.offers[0]!.id)).toBe(s.offers[0]);
    expect(findOffer(s, 'nope')).toBeUndefined();
  });
});

describe('matchdayPayout', () => {
  it('adds the win bonus only on a win', () => {
    const active = { name: 'Test', periodic: 500, winBonus: 200, matchdaysRemaining: 3, totalDuration: 6 };
    expect(matchdayPayout(active, false)).toBe(500);
    expect(matchdayPayout(active, true)).toBe(700);
  });

  it('totalPayout sums every running contract', () => {
    const s = base();
    s.contracts = [
      { name: 'A', periodic: 500, winBonus: 200, matchdaysRemaining: 3, totalDuration: 6 },
      { name: 'B', periodic: 300, winBonus: 100, matchdaysRemaining: 9, totalDuration: 12 }
    ];
    expect(totalPayout(s, false)).toBe(800);
    expect(totalPayout(s, true)).toBe(1100);
  });
});

describe('advanceContracts', () => {
  it('counts every contract down and drops the ones that hit zero', () => {
    const s = base();
    s.contracts = [
      { name: 'Kurz', periodic: 100, winBonus: 0, matchdaysRemaining: 1, totalDuration: 6 },
      { name: 'Lang', periodic: 100, winBonus: 0, matchdaysRemaining: 9, totalDuration: 24 }
    ];
    expect(advanceContracts(s)).toEqual([{ name: 'Kurz' }]);
    expect(s.contracts).toHaveLength(1);
    expect(s.contracts[0]!.name).toBe('Lang');
    expect(s.contracts[0]!.matchdaysRemaining).toBe(8);
  });

  it('does nothing without contracts', () => {
    const s = base();
    expect(advanceContracts(s)).toEqual([]);
  });
});

describe('recordResult', () => {
  it('keeps only the most recent formWindow entries', () => {
    const s = base();
    for (let i = 0; i < sponsorsContent.formWindow + 3; i++) recordResult(s, 'win');
    expect(s.recentForm).toHaveLength(sponsorsContent.formWindow);
  });

  it('keeps the newest result last', () => {
    const s = base();
    recordResult(s, 'win');
    recordResult(s, 'loss');
    expect(s.recentForm[s.recentForm.length - 1]).toBe('loss');
  });
});

// ---------------------------------------------------------------------------
// wiring: the marketing director's 'sponsors.income' bonus must actually land
// ---------------------------------------------------------------------------

const registry = new Registry(modules);

function newGame(seedText: string, withStaff: string[] = []): GameState {
  const seed = seedFrom(seedText);
  const rng = createSeededRng(seed);
  const mods: Record<string, unknown> = {};
  for (const m of registry.all) mods[m.id] = m.state.create(rng.fork(m.id));
  const meta: MetaState = { seed, season: 1, matchday: 1, tick: 0, createdAt: 0, lastPlayedAt: 0 };
  const g: GameState = { meta, modules: mods as unknown as ModuleStates };
  applyNarrative(g.modules.progression, narratives[0]!);
  g.modules.progression.started = true;
  unlock(g.modules.progression, 'staff');
  unlock(g.modules.progression, 'sponsors');
  for (const id of withStaff) hire(g.modules.staff, id, 0);
  // Sign whatever the first offer is, so a contract is actually paying out.
  g.modules.sponsors.contracts = [
    {
      name: 'Testsponsor',
      periodic: 1000,
      winBonus: 0,
      matchdaysRemaining: 34,
      totalDuration: 34
    }
  ];
  return g;
}

describe('sponsors effects reach the ledger', () => {
  it('a marketing director increases sponsoring income', () => {
    const without = newGame('sponsmkt');
    const with_ = newGame('sponsmkt', ['marketingDir']);
    runTick(registry, without, 'matchday');
    runTick(registry, with_, 'matchday');

    const income = (g: GameState) =>
      g.modules.finance.ledger.filter((e) => e.source === 'sponsors').reduce((s, e) => s + e.amount, 0);

    expect(income(with_)).toBeGreaterThan(income(without));
  });
});
