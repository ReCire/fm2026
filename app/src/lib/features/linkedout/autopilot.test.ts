import { describe, it, expect } from 'vitest';
import { Registry } from '$lib/engine/registry';
import { runTick } from '$lib/engine/clock';
import { createRng, seedFrom } from '$lib/engine/rng';
import { modules } from '$lib/modules';
import type { GameState, MetaState, ModuleStates } from '$lib/engine/state';
import { applyNarrative, unlock, delegate } from '../progression/rules';
import { narratives } from '../progression/content';
import { autoRenew } from '../contracts/rules';
import { autoAnswerOffers } from '../transfer/rules';
import { strengthOf, autoLineup } from '../squad/rules';
import type { Offer } from '../transfer/state';

/**
 * The one contract every autopilot has to honour: a mediocre executive decides
 * BADLY, not slowly.
 *
 * If competence bought speed or convenience instead, hiring someone would be a
 * wage with no trade attached — and `TickContext.delegation.competence` would
 * stop meaning what the engine does with it. These tests are the guard on that
 * sentence, not on any particular number.
 */
const registry = new Registry(modules);

function career(seedText = 'auto'): GameState {
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

const offerFor = (g: GameState, playerId: string, bid: number): Offer => {
  const p = g.modules.squad.players.find((x) => x.id === playerId)!;
  return {
    id: `o-${playerId}`, playerId, playerName: p.name, playerPos: p.pos,
    playerStrength: strengthOf(p), marketValue: p.marketValue, clubName: 'FC Test',
    currentBid: bid, originalBid: bid, round: 1, expiresIn: 3
  } as Offer;
};

describe('a delegated department is answered, whoever runs it', () => {
  /* Speed is not the lever. Every bid on the desk is answered this tick at any
     competence — otherwise "delegated" would just mean "slower". */
  it('leaves no offer unanswered, at any competence', () => {
    for (const competence of [0, 0.25, 0.5, 0.75, 1]) {
      const g = career(`answer${competence}`);
      const ids = g.modules.squad.players.slice(0, 4).map((p) => p.id);
      g.modules.transfer.offers = ids.map((id, i) => offerFor(g, id, 100_000 * (i + 1)));

      autoAnswerOffers(g.modules.transfer, g.modules.squad, competence);
      expect(g.modules.transfer.offers, `competence ${competence} left bids on the desk`)
        .toHaveLength(0);
    }
  });

  it('renews within the same week at any competence', () => {
    for (const competence of [0, 0.5, 1]) {
      const g = career(`renew${competence}`);
      for (const p of g.modules.squad.players) p.contractMatchdays = 3;
      const { renewals, released } = autoRenew(g.modules.squad, competence, 5_000_000);
      expect(renewals.length + released.length, `competence ${competence} did nothing at all`)
        .toBeGreaterThan(0);
    }
  });
});

describe('competence shows up as worse decisions', () => {
  /*
   * The measurable version of the contract. A weak director sells below market;
   * a strong one holds out. Over a desk of bids that is a real amount of money,
   * and it is the kind of loss that only appears when you add up a season.
   */
  it('a weak transfer chief sells cheap and a strong one holds out', () => {
    const takings = (competence: number) => {
      const g = career('sell');
      const players = g.modules.squad.players.slice(0, 6);
      g.modules.transfer.offers = players.map((p) =>
        // Every bid is exactly market value: a fair price, not a windfall.
        offerFor(g, p.id, Math.round(p.marketValue))
      );
      const decided = autoAnswerOffers(g.modules.transfer, g.modules.squad, competence);
      return decided.filter((d) => d.accepted).length;
    };
    // At market value a good director sells nobody and a poor one sells freely.
    expect(takings(0.1)).toBeGreaterThan(takings(0.9));
  });

  it('a strong chief still sells when the money is genuinely good', () => {
    const g = career('windfall');
    const p = g.modules.squad.players.find((x) => !g.modules.squad.lineup.includes(x.id))!;
    g.modules.transfer.offers = [offerFor(g, p.id, Math.round(p.marketValue * 3))];
    const decided = autoAnswerOffers(g.modules.transfer, g.modules.squad, 0.9);
    expect(decided[0]!.accepted, 'a competent director refused triple market value').toBe(true);
  });

  /* Protecting the eleven is the first judgement a poor director loses. */
  it('a weak chief sells the starting eleven and a strong one does not', () => {
    const startersSold = (competence: number) => {
      const g = career('starters');
      /* A fresh career has an EMPTY lineup — it is filled by the first tick.
         Without this the test compared nought against nought and passed for
         four minutes while measuring nothing. */
      g.modules.squad.lineup = autoLineup(g.modules.squad);
      const starters = g.modules.squad.players.filter((p) => g.modules.squad.lineup.includes(p.id));
      expect(starters.length, 'no lineup to protect').toBeGreaterThan(0);
      g.modules.transfer.offers = starters.slice(0, 5).map((p) =>
        offerFor(g, p.id, Math.round(p.marketValue * 1.15))
      );
      const decided = autoAnswerOffers(g.modules.transfer, g.modules.squad, competence);
      return decided.filter((d) => d.accepted).length;
    };
    expect(startersSold(0.1)).toBeGreaterThan(startersSold(0.9));
  });

  it('a weak director signs the expensive renewal', () => {
    const spend = (competence: number) => {
      const g = career('terms');
      for (const p of g.modules.squad.players) p.contractMatchdays = 3;
      const before = g.modules.squad.players.reduce((s, p) => s + p.wage, 0);
      autoRenew(g.modules.squad, competence, 50_000_000);
      const after = g.modules.squad.players.reduce((s, p) => s + p.wage, 0);
      return after - before;
    };
    // Not a claim about the exact figure — a claim that the cheap option exists
    // and that a competent director is the one who takes it.
    expect(spend(0.1)).toBeGreaterThanOrEqual(spend(0.9));
  });

  it('a weak director renews a surplus veteran a good one lets go', () => {
    /* Genuinely surplus: old AND clearly weaker than the squad around him.
       Making the WHOLE squad old proved nothing — it moved the average with
       it, so nobody was below it and neither director released anybody. */
    const kept = (competence: number) => {
      const g = career('release');
      for (const p of g.modules.squad.players) p.contractMatchdays = 3;
      const veteran = g.modules.squad.players[0]!;
      veteran.age = 36;
      veteran.attributes = { technik: 20, tempo: 20, kraft: 20, uebersicht: 20, mentalitaet: 20 };
      const { renewals } = autoRenew(g.modules.squad, competence, 50_000_000);
      return renewals.some((r) => r.player.id === veteran.id);
    };
    expect(kept(0.1), 'a poor director should have renewed him').toBe(true);
    expect(kept(0.9), 'a good director should have let him go').toBe(false);
  });

  /* The squad is not the executive's to dismantle. Nobody hires a director of
     football and expects to come back to nine players. */
  it('never shrinks the squad below the floor, however ruthless', () => {
    const g = career('floor');
    for (const p of g.modules.squad.players) {
      p.contractMatchdays = 3;
      p.age = 38;
      p.attributes = { technik: 5, tempo: 5, kraft: 5, uebersicht: 5, mentalitaet: 5 };
    }
    // One strong player, so everyone else reads as surplus.
    g.modules.squad.players[0]!.attributes = { technik: 90, tempo: 90, kraft: 90, uebersicht: 90, mentalitaet: 90 };
    g.modules.squad.players[0]!.age = 24;

    const before = g.modules.squad.players.length;
    const { released } = autoRenew(g.modules.squad, 1, 50_000_000);
    expect(before - released.length).toBeGreaterThanOrEqual(16);
  });

  it('looks further ahead when it is good, which is a decision and not a delay', () => {
    const seen = (competence: number) => {
      const g = career('horizon');
      // Contracts twelve matchdays out: visible to a good director, invisible
      // to a poor one until it is nearly too late to negotiate.
      for (const p of g.modules.squad.players) p.contractMatchdays = 12;
      const r = autoRenew(g.modules.squad, competence, 50_000_000);
      return r.renewals.length + r.released.length;
    };
    expect(seen(0.95)).toBeGreaterThan(seen(0.05));
  });
});

describe('the department goes quiet only when somebody is actually doing it', () => {
  /*
   * `runTick` falls back to the normal hook when a delegated module has no
   * autopilot, but many of a department's decisions are the PLAYER'S, taken on
   * its screen. Silencing on delegation alone therefore removes the player and
   * replaces them with nothing: offers expire unanswered, contracts lapse, and
   * it looks exactly like the feature working.
   */
  it('a module with an autopilot actually runs it when delegated', () => {
    const g = career('runs');
    unlock(g.modules.progression, 'transfer');
    const players = g.modules.squad.players.slice(0, 3);
    g.modules.transfer.offers = players.map((p) => offerFor(g, p.id, Math.round(p.marketValue * 0.5)));

    delegate(g.modules.progression, 'transfer', { executiveId: 'exec-1', competence: 0.9, hiredOnMatchday: 1 });
    runTick(registry, g, 'matchday', {
      delegationFor: (id) => g.modules.progression.delegated[id]
    });

    expect(g.modules.transfer.offers, 'the autopilot never answered the desk').toHaveLength(0);
  });

  it('every role LinkedOut can sell names a module that has an autopilot', () => {
    for (const m of registry.all) {
      if (!m.autopilot) continue;
      expect(typeof m.autopilot.run, `${m.id}'s autopilot is not runnable`).toBe('function');
      expect(m.autopilot.phase, `${m.id}'s autopilot has no phase`).toBeTruthy();
    }
    expect(registry.all.filter((m) => m.autopilot).length, 'no department can be delegated at all')
      .toBeGreaterThan(0);
  });
});
