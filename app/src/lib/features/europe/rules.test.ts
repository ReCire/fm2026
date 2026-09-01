import { describe, it, expect } from 'vitest';
import { createRng } from '$lib/engine/rng';
import {
  createTournament, drawGroups, fixturesFor, groupPrize, groupRoundOf,
  groupsComplete, playGroupRound, playerIn, resolveTie, roundPrize,
  seedFinal, seedSemis, standings, strengthOf
} from './rules';
import { PLAYER, type EuroMatch } from './state';
import { europeContent, euroClubs, standIn, GROUP_ROUNDS, KNOCKOUT } from './content';

const C = europeContent;
const rng = (seed = 7) => createRng(seed);

/** A whole tournament, group stage through final, from one seed. */
function runSeason(seed: number, playerIn = true, playerStrength = 88) {
  const state = createTournament(rng(seed), 1, playerIn);
  for (const md of C.groupMatchdays) playGroupRound(state, rng(seed + md), md, playerStrength);
  seedSemis(state);
  for (const [i, tie] of state.semis.entries()) {
    state.semis[i] = resolveTie(rng(seed + 100 + i), tie.home!, tie.away!, playerStrength);
  }
  seedFinal(state);
  state.final = resolveTie(rng(seed + 200), state.final!.home!, state.final!.away!, playerStrength);
  state.champion = state.final.winner;
  return state;
}

describe('the draw', () => {
  it('seats eight clubs in two groups of four, nobody twice', () => {
    const g = drawGroups(rng(), true);
    expect(g.A).toHaveLength(C.groupSize);
    expect(g.B).toHaveLength(C.groupSize);
    expect(new Set([...g.A, ...g.B]).size).toBe(C.groupSize * 2);
  });

  it('gives the eighth seat to the stand-in when the club did not qualify', () => {
    /*
     * The tournament runs either way. A competition that exists only in the
     * seasons you are in it never gets a chance to mean anything — watching
     * Mersey City win it twice from the third division is what makes
     * qualifying land.
     */
    const out = drawGroups(rng(), false);
    const all = [...out.A, ...out.B];
    expect(all).toContain(standIn.id);
    expect(all).not.toContain(PLAYER);

    const inIt = [...drawGroups(rng(), true).A, ...drawGroups(rng(), true).B];
    expect(inIt).toContain(PLAYER);
  });

  it('does not always produce the same groups', () => {
    /*
     * The prototype's knockout was hard-coded; a hard-coded draw would be the
     * same bug one round earlier and would look completely normal on screen.
     */
    const seen = new Set<string>();
    for (let s = 0; s < 12; s++) seen.add(drawGroups(rng(s), true).A.join(','));
    expect(seen.size).toBeGreaterThan(1);
  });
});

describe('strength', () => {
  it('reads ours off the day and everyone else off the table', () => {
    /*
     * Why PLAYER is a sentinel rather than a row: a stored strength for our
     * club would go stale the moment somebody was injured.
     */
    expect(strengthOf(PLAYER, 73)).toBe(73);
    expect(strengthOf(euroClubs[0]!.id, 73)).toBe(euroClubs[0]!.strength);
  });

  it('spreads the field enough that a draw is worth reading', () => {
    const values = euroClubs.map((c) => c.strength);
    expect(Math.max(...values) - Math.min(...values)).toBeGreaterThanOrEqual(8);
  });
});

describe('the group stage', () => {
  it('plays everyone twice, home and away', () => {
    const state = runSeason(3);
    const group = state.groups.A;
    const games = state.matches.filter((m) => m.group === 'A');
    expect(games).toHaveLength(C.groupMatchdays.length * GROUP_ROUNDS[0]!.length);

    for (const club of group) {
      const home = games.filter((m) => m.home === club).length;
      const away = games.filter((m) => m.away === club).length;
      expect(home, `${club} played ${home} at home`).toBe(3);
      expect(away, `${club} played ${away} away`).toBe(3);
    }
  });

  it('reverses the venue in the second half rather than repeating it', () => {
    const group = ['a', 'b', 'c', 'd'];
    const first = fixturesFor(group, 0);
    const back = fixturesFor(group, GROUP_ROUNDS.length);
    expect(back).toEqual(first.map(([h, a]) => [a, h]));
  });

  it('keeps a table that agrees with its own results', () => {
    const state = runSeason(11);
    for (const entry of state.table) {
      const games = state.matches.filter(
        (m) => m.stage === 'group' && (m.home === entry.clubId || m.away === entry.clubId)
      );
      expect(entry.played).toBe(games.length);
      expect(entry.points).toBe(entry.won * 3 + entry.drawn);
      expect(entry.won + entry.drawn + entry.lost).toBe(entry.played);
    }
  });

  it('sorts on a total order, so the same table always seeds the same semis', () => {
    /*
     * Without the final `clubId` key, two clubs level on points, difference and
     * goals sort by whatever order the array happened to be built in — and the
     * semi-final draw would change depending on that.
     */
    const state = runSeason(5);
    const once = standings(state, 'A').map((e) => e.clubId);
    state.table.reverse();
    expect(standings(state, 'A').map((e) => e.clubId)).toEqual(once);
  });
});

describe('the knockout, which is played', () => {
  it('declares ties with no result in them', () => {
    /*
     * The prototype's semi-finals were object literals with the winners
     * already written in — same pairing, same scorelines, same winner, every
     * season — and its final was not played at all: reaching it was winning
     * it. fussballmanager-15 shaped KNOCKOUT as ties so a port keeping either
     * bug fails. This is the other half of that check.
     */
    const declared = JSON.stringify(KNOCKOUT);
    for (const forbidden of ['goals', 'winner', 'score']) {
      expect(declared, `KNOCKOUT declares a ${forbidden}`).not.toContain(forbidden);
    }
    const fresh = createTournament(rng(), 1, true);
    for (const tie of fresh.semis) expect(tie.winner).toBeNull();
    expect(fresh.final).toBeNull();
  });

  it('always produces a winner, because a knockout game cannot end level', () => {
    for (let seed = 0; seed < 40; seed++) {
      const tie = resolveTie(rng(seed), 'castilla', 'belem', 80);
      expect(tie.winner, `seed ${seed} left a semi-final undecided`).not.toBeNull();
      expect([tie.home, tie.away]).toContain(tie.winner);
      if (tie.homeGoals === tie.awayGoals) expect(tie.onPenalties).toBe(true);
    }
  });

  it('lets the weaker club through, or the tournament is a table', () => {
    let upset = false;
    for (let seed = 0; seed < 60 && !upset; seed++) {
      if (resolveTie(rng(seed), 'besiktepe', 'castilla', 80).winner === 'besiktepe') upset = true;
    }
    expect(upset, 'the stronger club won all sixty ties').toBe(true);
  });

  it('does not make winning a group worse than finishing second in it', () => {
    /*
     * The prototype's real bug, one layer down from the hard-coded scorelines:
     * the second semi-final always went to the group runner-up, so topping
     * group B was strictly worse than coming second in it. The pairings must
     * be symmetric — each winner meets a runner-up, and neither slot is the
     * lucky one.
     */
    const winners = KNOCKOUT.semis.flatMap((t) =>
      [t.home, t.away].filter((s) => s.place === 1).map((s) => s.group)
    );
    const runnersUp = KNOCKOUT.semis.flatMap((t) =>
      [t.home, t.away].filter((s) => s.place === 2).map((s) => s.group)
    );
    expect(winners.sort()).toEqual(['A', 'B']);
    expect(runnersUp.sort()).toEqual(['A', 'B']);
    for (const tie of KNOCKOUT.semis) {
      expect(tie.home.group, 'a semi-final pairs two clubs from one group')
        .not.toBe(tie.away.group);
    }
  });

  it('seeds the final from winners, never from the group table', () => {
    const state = runSeason(21);
    expect(state.final!.home).toBe(state.semis[0]!.winner);
    expect(state.final!.away).toBe(state.semis[1]!.winner);
    expect(state.champion).toBe(state.final!.winner);
  });

  it('crowns a champion who actually played the final', () => {
    for (let seed = 0; seed < 12; seed++) {
      const state = runSeason(seed);
      expect([state.final!.home, state.final!.away]).toContain(state.champion);
    }
  });

  it('can be lost by the player, which the prototype could not', () => {
    /*
     * The first version of this ran at strength 70 and failed — not because a
     * final could not be lost, but because a 70 reaches one final in two
     * hundred seasons. An under-powered test reporting a working system as
     * broken costs exactly as much time as the reverse, so the numbers here
     * come from measuring rather than from guessing. Across 200 seeds:
     *
     *     strength 70   semis  21   finals   1   trophies  0
     *     strength 80   semis  84   finals  37   trophies 15
     *     strength 88   semis 136   finals  74   trophies 47
     *     strength 95   semis 171   finals 105   trophies 72
     *
     * Which is the distribution this competition should have. A promoted side
     * does not win Europe, and the best club in the game still loses it two
     * years in three.
     */
    let reached = 0;
    let lost = 0;
    for (let seed = 0; seed < 40; seed++) {
      const state = runSeason(seed, true, 88);
      if (!playerIn(state.final)) continue;
      reached += 1;
      if (state.champion !== PLAYER) lost += 1;
    }
    expect(reached, 'the player never reached a final in forty seasons').toBeGreaterThan(4);
    expect(lost, 'every final the player reached was won').toBeGreaterThan(0);
  });

  it('is not won by the best squad in the game every year either', () => {
    /*
     * The other side of the same claim, and the one the prototype failed
     * hardest: a trophy that cannot be lost is a receipt for having qualified.
     */
    let won = 0;
    let reached = 0;
    for (let seed = 0; seed < 40; seed++) {
      const state = runSeason(seed, true, 95);
      if (!playerIn(state.final)) continue;
      reached += 1;
      if (state.champion === PLAYER) won += 1;
    }
    expect(won).toBeGreaterThan(0);
    expect(won).toBeLessThan(reached);
  });
});

describe('the money', () => {
  it('pays for a win and a draw, and nothing for a defeat', () => {
    const match = (hg: number, ag: number): EuroMatch[] => [
      { matchday: 3, stage: 'group', group: 'A', home: PLAYER, away: 'castilla', homeGoals: hg, awayGoals: ag }
    ];
    expect(groupPrize(match(2, 0))!.amount).toBe(C.groupWin);
    expect(groupPrize(match(1, 1))!.amount).toBe(C.groupDraw);
    expect(groupPrize(match(0, 3))).toBeNull();
  });

  it('pays nothing when our club is not in the tournament', () => {
    expect(groupPrize([
      { matchday: 3, stage: 'group', group: 'A', home: 'castilla', away: 'belem', homeGoals: 2, awayGoals: 0 }
    ])).toBeNull();
  });

  it('pays a beaten finalist more than a beaten semi-finalist', () => {
    /*
     * The prototype paid nothing at all for losing a final, so the second
     * biggest night of a career was worth exactly what a beaten semi-finalist
     * got.
     */
    expect(roundPrize('final', false).amount).toBeGreaterThan(roundPrize('semi', false).amount);
    expect(roundPrize('final', true).amount).toBeGreaterThan(roundPrize('final', false).amount);
  });

  it('is a decade of income, not a different game', () => {
    /*
     * The prototype paid €25M for the trophy against a €1.5M promotion bonus —
     * sixteen promotions for one night, which makes Europe the only thing
     * worth optimising for and the league its qualifying round.
     */
    const perfect =
      C.groupMatchdays.length * C.groupWin + C.reachSemi + C.reachFinal + C.win;
    expect(perfect).toBeLessThan(20_000_000);
    expect(perfect).toBeGreaterThan(C.win);
  });
});

describe('the calendar', () => {
  it('knows which matchdays are group rounds and which are not', () => {
    expect(groupRoundOf(C.groupMatchdays[0]!)).toBe(0);
    expect(groupRoundOf(C.groupMatchdays[5]!)).toBe(5);
    expect(groupRoundOf(C.semiMatchday)).toBe(-1);
    expect(groupRoundOf(C.finalMatchday)).toBe(-1);
  });

  it('does not call the groups complete before they are', () => {
    const state = createTournament(rng(), 1, true);
    expect(groupsComplete(state)).toBe(false);
    for (const md of C.groupMatchdays) playGroupRound(state, rng(md), md, 85);
    expect(groupsComplete(state)).toBe(true);
  });
});

describe('determinism', () => {
  it('two tournaments on one seed end the same way', () => {
    expect(runSeason(99)).toEqual(runSeason(99));
  });
});
