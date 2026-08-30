import { describe, it, expect } from 'vitest';
import {
  talents, talentById, RARITIES, EMPTY_RECORD, earnedBy, bestFor, activeFx,
  isEligible, type PlayerRecord
} from './talents';
import { POSITIONS, type Position } from '$lib/features/squad/positions';
import { ATTRIBUTES } from '$lib/features/squad/attributes';
import type { Player } from '$lib/features/squad/state';

const player = (over: Partial<Player> = {}, attr = 50): Player => ({
  id: 'p1', name: 'Test Spieler', pos: 'MIT',
  attributes: Object.fromEntries(ATTRIBUTES.map((a) => [a, attr])) as Player['attributes'],
  fitness: 100, morale: 70, age: 24, marketValue: 100_000, wage: 2_000,
  trait: 'Kein', injured: 0, suspended: 0, individualFocus: 'allgemein',
  contractMatchdays: 34, record: { ...EMPTY_RECORD }, ...over
});

const record = (over: Partial<PlayerRecord> = {}): PlayerRecord => ({ ...EMPTY_RECORD, ...over });

/** A player good enough at everything to satisfy any attribute floor. */
const maxed = (pos: Position = 'MIT') => player({ pos }, 95);

describe('the catalogue', () => {
  it('has unique ids, names and blurbs', () => {
    expect(new Set(talents.map((t) => t.id)).size).toBe(talents.length);
    expect(new Set(talents.map((t) => t.name)).size).toBe(talents.length);
    expect(new Set(talents.map((t) => t.blurb)).size).toBe(talents.length);
    expect(talentById.size).toBe(talents.length);
  });

  it('covers every rarity and every position', () => {
    for (const r of RARITIES) {
      expect(talents.filter((t) => t.rarity === r).length, r).toBeGreaterThan(0);
    }
    for (const pos of POSITIONS) {
      const reachable = talents.filter((t) => isEligible(t, pos));
      expect(reachable.length, `nothing is reachable as ${pos}`).toBeGreaterThan(2);
    }
  });

  it('names only real positions', () => {
    for (const t of talents) {
      for (const p of t.positions ?? []) {
        expect(POSITIONS as readonly string[], `${t.id} lists "${p}"`).toContain(p);
      }
    }
  });

  it('describes how he plays rather than what he grants', () => {
    /*
     * The rule that makes a talent worth having. "Freistoßgott: +3 Technik" is
     * a doctrine node with a person's name on it — what Eric asked for was
     * "perfect midfielder with eagle eyes", which is a picture. So no blurb may
     * carry a number or an attribute name.
     */
    for (const t of talents) {
      expect(t.blurb, `${t.id} puts a number in the fiction`).not.toMatch(/[+-]?\d+\s*%|\+\d/);
      for (const a of ATTRIBUTES) {
        expect(t.blurb.toLowerCase(), `${t.id} names the stat`).not.toContain(a);
      }
      expect(t.blurb.length, `${t.id} is too terse to be a picture`).toBeGreaterThan(60);
    }
  });

  it('leaves several with no mechanical effect at all', () => {
    // A talent that is only a number is a worse talent. If every one of these
    // carries fx, the fiction has stopped being allowed to do the work.
    expect(talents.filter((t) => !t.fx).length).toBeGreaterThan(2);
  });
});

describe('nothing is earned at creation', () => {
  it('a fresh player of any position and any position has none', () => {
    /*
     * The badge lesson, applied. Three narratives collected "Erste Million"
     * before kicking a ball because the test asked what was true rather than
     * what had happened. A talent handed out at spawn is the same mistake with
     * a nicer name.
     */
    for (const pos of POSITIONS) {
      for (const attr of [50, 70, 85, 99]) {
        const p = player({ pos, age: 17 }, attr);
        const r = record({ debutAge: 17, debutStrength: 99 });
        expect(
          earnedBy(p, r, new Set()).map((t) => t.id),
          `a fresh ${pos} at ${attr} was born with talents`
        ).toEqual([]);
      }
    }
  });

  it('a career with no history earns nothing however good the player is', () => {
    const p = maxed();
    expect(earnedBy(p, record({ debutStrength: 95 }), new Set())).toEqual([]);
  });
});

describe('each talent is reachable', () => {
  it('fires for a career that satisfies it', () => {
    /*
     * A talent nobody can earn is the same silent bug as an upgrade that does
     * nothing. Every one gets a career built to satisfy it, and has to notice.
     */
    const careers: Record<string, { p: Player; r: PlayerRecord }> = {
      ruhender_ball: { p: player({ pos: 'ST' }, 80), r: record({ debutStrength: 60 }) },
      kopfball: { p: player({ pos: 'ABW' }, 82), r: record({ matches: 40 }) },
      dauerlaeufer: { p: player({}, 78), r: record({ matches: 70 }) },
      eisenfuss: { p: player({ pos: 'ABW' }, 78), r: record({ matches: 60, injuries: 1 }) },
      fluegelflitzer: {
        p: player({ pos: 'ST', attributes: { technik: 60, tempo: 88, kraft: 58, uebersicht: 55, mentalitaet: 60 } }),
        r: record({ matches: 30 })
      },
      torjaeger: { p: player({ pos: 'ST' }), r: record({ goals: 40 }) },
      kabinenchef: { p: player({}, 76), r: record({ seasonsHere: 4 }) },
      strafraumkoenig: { p: player({ pos: 'TW' }, 80), r: record({ cleanSheets: 20 }) },
      adleraugen: { p: player({ pos: 'MIT' }, 88), r: record({ debutStrength: 70 }) },
      spielmacher: { p: player({ pos: 'MIT' }, 84), r: record({ seasonsHere: 3 }) },
      unverwuestlich: { p: player(), r: record({ matches: 160, injuries: 0 }) },
      spaetzuender: { p: player({ age: 29 }, 78), r: record({ debutStrength: 58 }) },
      elfmetertoeter: { p: player({ pos: 'TW' }, 90), r: record({ matches: 70 }) },
      vereinslegende: { p: player(), r: record({ seasonsHere: 9 }) },
      eigengewaechs: { p: player({}, 80), r: record({ debutAge: 17, seasonsHere: 5, debutStrength: 55 }) },
      jahrhunderttalent: { p: player({ pos: 'ST' }, 92), r: record({ debutAge: 18, debutStrength: 55 }) },
      der_kaiser: { p: player({ pos: 'ABW' }, 92), r: record({ seasonsHere: 6 }) },
      rekordtorjaeger: { p: player({ pos: 'ST' }), r: record({ goals: 130 }) },
      unantastbar: { p: player(), r: record({ matches: 220, seasonsHere: 7 }) }
    };

    const untested = talents.filter((t) => !(t.id in careers)).map((t) => t.id);
    expect(untested, 'a talent exists but no career here proves it can be earned').toEqual([]);

    for (const t of talents) {
      const c = careers[t.id]!;
      expect(t.earn(c.p, c.r), `${t.id} never fires, even for a career built for it`).toBe(true);
    }
  });
});

describe('einmalig', () => {
  it('cannot be handed out twice in one career', () => {
    const p = player({ pos: 'ST' }, 92);
    const r = record({ debutAge: 18, debutStrength: 55, goals: 130, matches: 220, seasonsHere: 7 });
    const first = earnedBy(p, r, new Set()).filter((t) => t.rarity === 'einmalig');
    expect(first.length).toBeGreaterThan(0);
    const again = earnedBy(p, r, new Set(first.map((t) => t.id)));
    expect(again.filter((t) => t.rarity === 'einmalig')).toEqual([]);
  });

  it('picks the rarest, not the first', () => {
    // A Jahrhunderttalent who also happens to be a Dauerläufer is not a
    // Dauerläufer, and a list ordered by luck tells the player the wrong thing.
    const p = player({ pos: 'ST' }, 92);
    const r = record({ debutAge: 18, debutStrength: 55, matches: 220, seasonsHere: 7, goals: 130 });
    const best = bestFor(p, r, new Set());
    expect(best?.rarity).toBe('einmalig');
  });

  it('returns nothing when nothing was earned', () => {
    expect(bestFor(player(), record(), new Set())).toBeUndefined();
  });
});

describe('effects', () => {
  it('only ever claim keys something reads', () => {
    /*
     * A talent is never withheld for an unwired effect — nobody paid for it,
     * and the name is worth having alone. But it must not advertise something
     * that lands nowhere, which is the bug the doctrine tree's dormancy gate
     * exists to stop.
     */
    const withFx = talents.find((t) => t.fx)!;
    expect(Object.keys(activeFx(withFx, new Set()))).toEqual([]);
    const allWired = new Set(Object.keys(withFx.fx!));
    expect(Object.keys(activeFx(withFx, allWired)).length).toBe(allWired.size);
  });

  it('never moves a value the wrong way for its own fiction', () => {
    // A talent that reduced fitness or raised injury risk would be a curse
    // wearing a compliment. Both of these are "less is better" keys.
    for (const t of talents) {
      if (t.fx?.injuryRisk !== undefined) expect(t.fx.injuryRisk, t.id).toBeLessThan(0);
      if (t.fx?.fitnessLoss !== undefined) expect(t.fx.fitnessLoss, t.id).toBeLessThan(1);
    }
  });
});
