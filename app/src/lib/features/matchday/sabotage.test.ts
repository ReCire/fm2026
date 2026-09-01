import { describe, it, expect } from 'vitest';
import { Registry } from '$lib/engine/registry';
import { runTick } from '$lib/engine/clock';
import { createRng, seedFrom } from '$lib/engine/rng';
import { modules } from '$lib/modules';
import type { GameState, MetaState, ModuleStates } from '$lib/engine/state';
import { applyNarrative } from '../progression/rules';
import { narratives } from '../progression/content';
import { sabotages, sabotageById, cappedSwing, canArrange, SABOTAGE_CAP } from './sabotage';
import { arrangeSabotage, cancelSabotage } from './rules';
import { SWING_CAP } from './intervene';

const registry = new Registry(modules);

function career(seed = seedFrom('sabotage')): GameState {
  const rng = createRng(seed);
  const mods: Record<string, unknown> = {};
  for (const m of registry.all) mods[m.id] = m.state.create(rng.fork(m.id));
  const meta: MetaState = { seed, season: 1, matchday: 1, tick: 0, createdAt: 0, lastPlayedAt: 0 };
  const g: GameState = { meta, modules: mods as unknown as ModuleStates };
  applyNarrative(g.modules.progression, narratives[0]!);
  g.modules.progression.started = true;
  g.modules.squad.lineup = g.modules.squad.players.slice(0, 11).map((p) => p.id);
  g.modules.finance.money = 500_000;
  return g;
}

const cheapest = () => [...sabotages].sort((a, b) => a.moneyCost - b.moneyCost)[0]!;
const dearest = () => [...sabotages].sort((a, b) => b.moneyCost - a.moneyCost)[0]!;

describe('the shape of the trade', () => {
  it('never offers a bigger lever than a half-time decision', () => {
    /*
     * Bought with money rather than earned with a decision, so it must never be
     * the strongest thing available — otherwise the answer to every close
     * fixture is a bank transfer, and the eleven stops deciding results.
     */
    expect(SABOTAGE_CAP).toBeLessThan(SWING_CAP);
    for (const s of sabotages) expect(cappedSwing(s)).toBeLessThanOrEqual(SABOTAGE_CAP);
  });

  it('charges for every one of them, in both currencies', () => {
    /*
     * An option with only an upside is not a decision, it is a button pressed
     * every week. Doing nothing is the free option, and it is not in this list.
     */
    for (const s of sabotages) {
      expect(s.moneyCost, `${s.id} is free`).toBeGreaterThan(0);
      expect(s.pressureCost, `${s.id} costs no Ermittlungsdruck`).toBeGreaterThan(0);
    }
  });

  it('prices the bigger advantage higher in both currencies', () => {
    /*
     * The ordering, not the numbers. If a cheaper option were ever also the
     * stronger one, every other row would be dead content that still renders.
     */
    const bySwing = [...sabotages].sort((a, b) => a.swing - b.swing);
    for (let i = 1; i < bySwing.length; i++) {
      expect(bySwing[i]!.moneyCost).toBeGreaterThan(bySwing[i - 1]!.moneyCost);
      expect(bySwing[i]!.pressureCost).toBeGreaterThan(bySwing[i - 1]!.pressureCost);
    }
  });

  it('refuses what the club cannot afford', () => {
    expect(canArrange(dearest(), 0)).toBe(false);
    expect(canArrange(dearest(), dearest().moneyCost)).toBe(true);
  });

  it('does not stop a club making things worse for itself', () => {
    /*
     * No pressure ceiling, deliberately. A club at 90% that wants to go higher
     * is entitled to — a rule against it would be the game protecting a player
     * from the one decision this whole system is about.
     */
    const g = career();
    g.modules.press.pressure = 95;
    expect(arrangeSabotage(g.modules.matchday, g.modules.finance, g.meta, dearest().id).ok)
      .toBe(true);
  });
});

describe('arranging one', () => {
  it('takes the money through the ledger, where it can be found again', () => {
    const g = career();
    const before = g.modules.finance.money;
    const s = cheapest();

    expect(arrangeSabotage(g.modules.matchday, g.modules.finance, g.meta, s.id).ok).toBe(true);
    expect(g.modules.finance.money).toBe(before - s.moneyCost);
    const entry = g.modules.finance.ledger.find((e) => e.reason.includes(s.label));
    expect(entry, 'the money left without an entry').toBeDefined();
    expect(entry!.amount).toBe(-s.moneyCost);
  });

  it('allows one per match, not four at once', () => {
    /*
     * The prototype stacked all four. That is the same "four concurrent levers"
     * the half-time design already refused, and for the same reason.
     */
    const g = career();
    arrangeSabotage(g.modules.matchday, g.modules.finance, g.meta, cheapest().id);
    const second = arrangeSabotage(g.modules.matchday, g.modules.finance, g.meta, dearest().id);
    expect(second.ok).toBe(false);
  });

  it('refunds nothing when it is called off', () => {
    const g = career();
    arrangeSabotage(g.modules.matchday, g.modules.finance, g.meta, cheapest().id);
    const after = g.modules.finance.money;
    cancelSabotage(g.modules.matchday);
    expect(g.modules.matchday.plannedSabotage).toBeNull();
    expect(g.modules.finance.money).toBe(after);
  });

  it('charges no Ermittlungsdruck until the match is actually played', () => {
    /*
     * Arranging something and then not playing should not make anybody
     * curious. The bill lands in the tick, not in the shop.
     */
    const g = career();
    arrangeSabotage(g.modules.matchday, g.modules.finance, g.meta, dearest().id);
    expect(g.modules.press.pressure).toBe(0);
  });
});

describe('through the tick', () => {
  it('raises the Verband\'s interest by exactly what it advertised', () => {
    const g = career();
    const s = dearest();
    arrangeSabotage(g.modules.matchday, g.modules.finance, g.meta, s.id);

    runTick(registry, g, 'matchday');

    expect(g.modules.press.pressure).toBeCloseTo(s.pressureCost, 5);
    expect(g.modules.press.feed.some((f) => f.cause === 'suspicion')).toBe(true);
  });

  it('makes the team better in the match it was arranged for', () => {
    const clean = career(4242);
    const dirty = career(4242);
    arrangeSabotage(dirty.modules.matchday, dirty.modules.finance, dirty.meta, dearest().id);

    runTick(registry, clean, 'matchday');
    runTick(registry, dirty, 'matchday');

    expect(dirty.modules.matchday.lastReport!.ourStrength)
      .toBeGreaterThan(clean.modules.matchday.lastReport!.ourStrength);
  });

  it('is spent by that match, and bills nobody the week after', () => {
    /*
     * The bug this is written against: a selection that persisted would bill a
     * club every week for a decision it took once, and the Ermittlungsdruck
     * would climb with nobody having chosen it a second time.
     */
    const g = career();
    const s = dearest();
    arrangeSabotage(g.modules.matchday, g.modules.finance, g.meta, s.id);

    runTick(registry, g, 'matchday');
    expect(g.modules.matchday.plannedSabotage).toBeNull();
    const afterOne = g.modules.press.pressure;

    g.meta.matchday += 1;
    g.meta.tick += 1;
    runTick(registry, g, 'matchday');

    expect(g.modules.press.pressure).toBeLessThanOrEqual(afterOne);
  });
});
