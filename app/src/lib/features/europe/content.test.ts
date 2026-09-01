import { describe, it, expect } from 'vitest';
import {
  euroClubs, standIn, clubById, europeContent, GROUP_ROUNDS, KNOCKOUT, copy
} from './content';
import { cupContent } from '../cup/content';
import { leagueContent, MATCHDAYS_PER_SEASON } from '../league/content';

describe('the eight', () => {
  it('fills two groups exactly, with the player or without', () => {
    // Seven fixed clubs plus one slot: the player when qualified, the stand-in
    // when not. A tournament that needs a bye has a bug in its guest list.
    expect(euroClubs).toHaveLength(europeContent.groupSize * 2 - 1);
    expect(clubById.size).toBe(euroClubs.length + 1);
  });

  it('has no two clubs a player could confuse', () => {
    expect(new Set(euroClubs.map((c) => c.id)).size).toBe(euroClubs.length);
    expect(new Set(euroClubs.map((c) => c.name)).size).toBe(euroClubs.length);
    expect(clubById.get(standIn.id)).toBe(standIn);
  });

  it('makes the draw worth reading', () => {
    /*
     * The prototype rolled 84–89 for all eight, so there was no such thing as
     * a good group: six coin flips with names attached. A spread means landing
     * Real Castilla is a different season from landing Sporting Belém, and the
     * player can feel it before a ball is kicked.
     */
    const strengths = euroClubs.map((c) => c.strength);
    expect(Math.max(...strengths) - Math.min(...strengths)).toBeGreaterThanOrEqual(8);
  });

  it('invents every club and borrows only the cities', () => {
    /*
     * The one place the joke could have stopped, at the most important moment
     * in the game. Every other name here is made up — the German pyramid is
     * generated from real cities and invented prefixes, and all fifty-five
     * brands are parody. These are the seven real trademarks the prototype
     * shipped, and none of them may come back.
     */
    const trademarks = [
      'Real Madrid', 'Manchester City', 'FC Bayern', 'Paris SG',
      'Inter Mailand', 'FC Barcelona', 'Arsenal', 'Liverpool', 'Ajax', 'Juventus'
    ];
    for (const club of [...euroClubs, standIn]) {
      for (const mark of trademarks) {
        expect(club.name, `${club.name} is a real club`).not.toBe(mark);
      }
      expect(club.city.length, `${club.name} has no city`).toBeGreaterThan(2);
    }
  });

  it('leaves the German clubs to the pyramid', () => {
    // A fixed German giant in Europe that never appears in the league table the
    // player is climbing would be a hole with a famous name in it.
    for (const club of [...euroClubs, standIn]) {
      expect(club.country, `${club.name} is German`).not.toBe('Deutschland');
    }
  });
});

describe('the calendar', () => {
  it('never asks a club to play twice in one week', () => {
    // The cup already owns 4, 12, 20, 28 and 34. A European night landing on
    // one of them would be two competitive fixtures on the same matchday, and
    // whichever ran second would silently read a squad the first had already
    // tired out.
    const cup = new Set(cupContent.roundMatchdays);
    for (const md of europeContent.groupMatchdays) {
      expect(cup.has(md), `group matchday ${md} clashes with a cup round`).toBe(false);
    }
    expect(cup.has(europeContent.semiMatchday)).toBe(false);
    expect(cup.has(europeContent.finalMatchday)).toBe(false);
  });

  it('finishes inside the season', () => {
    expect(europeContent.finalMatchday).toBeLessThanOrEqual(MATCHDAYS_PER_SEASON);
    for (const md of europeContent.groupMatchdays) {
      expect(md).toBeLessThanOrEqual(MATCHDAYS_PER_SEASON);
    }
  });

  it('plays a full double round-robin and no more', () => {
    /*
     * The question anybody asks of a group table first: does everyone play
     * everyone? Six matchdays, three rounds run twice.
     */
    expect(europeContent.groupMatchdays.length).toBe(GROUP_ROUNDS.length * 2);

    const met = new Set<string>();
    for (const round of GROUP_ROUNDS) {
      expect(round, 'a round leaves someone idle').toHaveLength(europeContent.groupSize / 2);
      const playing = new Set<number>();
      for (const [h, a] of round) {
        expect(playing.has(h) || playing.has(a), 'a club plays twice in one round').toBe(false);
        playing.add(h);
        playing.add(a);
        met.add([h, a].sort().join('-'));
      }
      expect(playing.size).toBe(europeContent.groupSize);
    }
    // Four clubs, six distinct pairings.
    const expected = (europeContent.groupSize * (europeContent.groupSize - 1)) / 2;
    expect(met.size, 'two clubs never meet').toBe(expected);
  });
});

describe('the knockout', () => {
  it('declares ties, not results', () => {
    /*
     * The prototype's semi-finals were two object literals with the winners
     * already written in — the same scoreline, the same winner, every season,
     * and topping group B was strictly worse than finishing second in it. Its
     * final was not played at all: reaching it was winning it, and the score
     * was the string "3 : 1".
     *
     * A pairing that names two slots and no goals cannot be satisfied by
     * printing a result. That is the entire reason this shape exists, so the
     * test says it out loud.
     */
    const asJson = JSON.stringify(KNOCKOUT);
    expect(asJson).not.toMatch(/goals|winner|score/i);

    expect(KNOCKOUT.semis).toHaveLength(2);
    // Winning a group must be worth more than finishing second in it: both
    // winners are drawn against a runner-up, and never against each other.
    for (const tie of KNOCKOUT.semis) {
      expect(tie.home.place).toBe(1);
      expect(tie.away.place).toBe(2);
      expect(tie.home.group).not.toBe(tie.away.group);
    }
    expect(KNOCKOUT.final.home.semi).not.toBe(KNOCKOUT.final.away.semi);
  });
});

describe('the money', () => {
  it('rewards getting further, at every step', () => {
    const c = europeContent;
    expect(c.groupWin).toBeGreaterThan(c.groupDraw);
    expect(c.reachSemi).toBeGreaterThan(c.groupWin);
    expect(c.reachFinal).toBeGreaterThan(c.reachSemi);
    expect(c.win).toBeGreaterThan(c.reachFinal);
  });

  it('sits above the cup without replacing the league', () => {
    /*
     * The prototype paid €25.000.000 for the trophy against a €1.500.000
     * promotion bonus — sixteen promotions for one night, which makes Europe
     * the only thing in the game worth optimising for and the league a
     * qualifying round for it.
     *
     * A perfect campaign should be a decade of income, not a different game.
     */
    const perfect =
      europeContent.groupWin * europeContent.groupMatchdays.length +
      europeContent.reachSemi + europeContent.reachFinal + europeContent.win;
    const cupWin = cupContent.prizes.reduce((a, b) => a + b, 0);

    expect(europeContent.win).toBeGreaterThan(cupWin);
    expect(perfect).toBeLessThan(leagueContent.promotionBonus * 15);
  });

  it('says where the politics nodes pay off', () => {
    // Five doctrine nodes raise European prize money and nothing else. If the
    // screen does not say so, they are a branch the player buys blind.
    expect(copy.prizes).toContain('Politik');
  });
});
