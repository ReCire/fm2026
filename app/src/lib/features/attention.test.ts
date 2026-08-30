import { describe, it, expect } from 'vitest';
import { Registry } from '$lib/engine/registry';
import { modules } from '$lib/modules';
import type { GameState, MetaState, ModuleStates } from '$lib/engine/state';
import { createRng, seedFrom } from '$lib/engine/rng';
import type { OpenItem } from '$lib/engine/module';

/**
 * What each department actually says, and when it says nothing.
 *
 * `shell/attention.test.ts` enforces the contract — well-formed items, no
 * writes, delegated departments filtered. This one is the other half: that a
 * department's condition can be REACHED, and that it is quiet until it is.
 *
 * The second half is the one worth the effort. An item that never fires is a
 * badge nobody sees; an item that always fires is worse, because it teaches
 * the player that badges are decoration and takes every other department's
 * badge down with it. Both fail silently, and neither shows up in a screenshot.
 */
const registry = new Registry(modules);

function career(): GameState {
  const seed = seedFrom('attention-copy');
  const rng = createRng(seed);
  const mods: Record<string, unknown> = {};
  for (const m of registry.all) mods[m.id] = m.state.create(rng.fork(m.id));
  const meta: MetaState = { seed, season: 1, matchday: 1, tick: 0, createdAt: 0, lastPlayedAt: 0 };
  return { meta, modules: mods as unknown as ModuleStates };
}

const ask = (moduleId: string, g: GameState): OpenItem[] =>
  registry.all.find((m) => m.id === moduleId)?.attention?.(g) ?? [];

const ids = (items: OpenItem[]) => items.map((i) => i.id);

/**
 * Every department that answers at all, and the state that makes it speak.
 *
 * Written as data so a new implementation cannot be added without one — the
 * final test in this file asserts that every module with an `attention` has an
 * entry here, which is what stops the sixteenth department shipping untested.
 */
const CASES: {
  module: string;
  item: string;
  urgency: 'now' | 'soon';
  provoke: (g: GameState) => void;
}[] = [
  {
    module: 'contracts',
    item: 'contracts.expiring',
    urgency: 'now',
    provoke: (g) => {
      g.modules.squad.players[0]!.contractMatchdays = 2;
    }
  },
  {
    module: 'transfer',
    item: 'transfer.offers',
    urgency: 'now',
    provoke: (g) => {
      g.modules.transfer.offers.push({
        id: 'o1',
        playerId: g.modules.squad.players[0]!.id,
        playerName: g.modules.squad.players[0]!.name,
        playerPos: 'ST',
        playerStrength: 70,
        marketValue: 400_000,
        clubName: 'VfB Oberhausen',
        currentBid: 450_000,
        originalBid: 400_000,
        round: 1,
        expiresIn: 1,
        status: 'new'
      });
    }
  },
  {
    module: 'merch',
    item: 'merch.missed',
    urgency: 'now',
    provoke: (g) => {
      const first = Object.keys(g.modules.merch.items)[0]!;
      g.modules.merch.items[first]!.lastSales = { units: 10, revenue: 300, missed: 140 };
    }
  },
  {
    module: 'sponsors',
    item: 'sponsors.unsigned',
    urgency: 'now',
    provoke: (g) => {
      g.modules.sponsors.active = null;
      g.modules.sponsors.offers.push({
        id: 's1',
        archetypeId: 'a',
        name: 'Bäckerei Schmitz',
        fee: 20_000,
        periodic: 4_000,
        winBonus: 500,
        duration: 34
      });
    }
  },
  {
    module: 'stadium',
    item: 'stadium.soldout',
    urgency: 'soon',
    provoke: (g) => {
      // Attendance is capacity x a factor that tops out at 1.2, so a full
      // house needs maximum fan mood and comfort, not a bigger number.
      g.modules.stadium.fans = 100;
      for (const b of Object.values(g.modules.stadium.blocks)) {
        b.foodLvl = 3;
        b.merchLvl = 3;
        b.toiletLvl = 3;
      }
    }
  },
  {
    module: 'staff',
    item: 'staff.none',
    urgency: 'soon',
    provoke: (g) => {
      g.modules.staff.hired = {};
      g.modules.finance.money = 5_000_000;
    }
  },
  {
    module: 'training',
    item: 'training.grinding',
    urgency: 'now',
    provoke: (g) => {
      g.modules.training.intensity = 'hart';
      for (let i = 0; i < 3; i++) g.modules.squad.players[i]!.injured = 2;
    }
  },
  {
    module: 'youth',
    item: 'youth.full',
    urgency: 'soon',
    provoke: (g) => {
      const p = g.modules.youth.prospects[0]!;
      while (g.modules.youth.prospects.length < 50) {
        g.modules.youth.prospects.push({ ...p, id: `x${g.modules.youth.prospects.length}` });
      }
    }
  }
];

describe('each department speaks when it should', () => {
  for (const c of CASES) {
    it(`${c.module} raises ${c.item}`, () => {
      const g = career();
      c.provoke(g);
      const items = ask(c.module, g);
      expect(ids(items), `${c.module} stayed silent`).toContain(c.item);
      expect(items.find((i) => i.id === c.item)!.urgency).toBe(c.urgency);
    });

    it(`${c.module} says nothing about ${c.item} otherwise`, () => {
      // The half that matters. A department that always has something waiting
      // has taught the player to ignore every department.
      const g = career();
      // Clear the conditions a fresh career happens to start in, so this
      // asserts the trigger rather than the starting position.
      g.modules.finance.money = 0;
      for (const p of g.modules.squad.players) {
        p.contractMatchdays = 34;
        p.injured = 0;
      }
      expect(ids(ask(c.module, g)), `${c.module} fires with nothing waiting`).not.toContain(c.item);
    });
  }
});

describe('the labels', () => {
  it('name a decision rather than restate a number', () => {
    /*
     * Not enforceable in general, so this checks the two tells that came up
     * while writing them: a label that is only a count, and a label that ends
     * in a bare figure. Both read as telemetry, and telemetry does not deserve
     * a badge — "3 Spieler verletzt" is a fact, "Kader unter Mindestbesetzung"
     * is a decision.
     */
    const g = career();
    for (const c of CASES) {
      c.provoke(g);
    }
    for (const c of CASES) {
      const item = ask(c.module, g).find((i) => i.id === c.item);
      if (!item) continue;
      expect(item.label.length, `${c.item} label is too terse to act on`).toBeGreaterThan(24);
      expect(item.label, `${c.item} label ends in a bare number`).not.toMatch(/\d+\s*$/);
      expect(item.label[0], `${c.item} label starts lowercase`).toBe(item.label[0]!.toUpperCase());
    }
  });
});

describe('coverage', () => {
  it('every department that answers is exercised here', () => {
    const answering = registry.all.filter((m) => m.attention).map((m) => m.id);
    const covered = new Set(CASES.map((c) => c.module));
    // squad and finance are the architect's reference pair and are covered by
    // shell/attention.test.ts; everything else belongs to this file.
    const exempt = new Set(['squad', 'finance']);
    const missing = answering.filter((id) => !covered.has(id) && !exempt.has(id));
    expect(missing, 'a department answers but nothing tests what it says').toEqual([]);
  });
});
