import { describe, it, expect } from 'vitest';
import { createRng } from '$lib/engine/rng';
import { createLeague } from '../league/state';
import type { LeagueState, LeagueTeam } from '../league/state';
import { playMatchday, generateFixtures } from '../league/rules';
import { MATCHDAYS_PER_SEASON } from '../league/content';
import { ownResult, biggerWin, seasonRecord, careerBestRank, careerBiggestWin, type OwnResult } from './rules';
import type { SeasonRecord } from './state';

const league = (seed = 1) => createLeague(createRng(seed));

function team(
  id: string,
  name: string,
  won: number,
  drawn: number,
  lost: number,
  goalsFor: number,
  goalsAgainst: number
): LeagueTeam {
  return { id, name, strength: 60, played: won + drawn + lost, won, drawn, lost, goalsFor, goalsAgainst };
}

function handMade(teams: LeagueTeam[], playerClubId: string): LeagueState {
  return {
    playerLevel: 0,
    playerClubId,
    levels: [teams],
    fixtures: [generateFixtures(teams.length)],
    inEurope: false
  };
}

describe('ownResult', () => {
  it('is undefined before the matchday is played', () => {
    expect(ownResult(league(), 1)).toBeUndefined();
  });

  it('reports goals from OUR side, whichever side of the fixture we are on', () => {
    const l = league();
    const rng = createRng(2);
    let checked = false;

    for (let md = 1; md <= MATCHDAYS_PER_SEASON && !checked; md++) {
      playMatchday(l, md, rng);
      const r = ownResult(l, md);
      if (!r) continue;

      const teams = l.levels[l.playerLevel]!;
      const us = teams.findIndex((t) => t.id === l.playerClubId);
      const fixture = l.fixtures[l.playerLevel]![md - 1]!.find((f) => f.home === us || f.away === us)!;
      const isHome = fixture.home === us;

      expect(r.isHome).toBe(isHome);
      expect(r.goalsFor).toBe(isHome ? fixture.homeGoals : fixture.awayGoals);
      expect(r.goalsAgainst).toBe(isHome ? fixture.awayGoals : fixture.homeGoals);
      checked = true;
    }

    expect(checked).toBe(true);
  });

  it('identifies the opponent by id, never by name', () => {
    const l = league();
    playMatchday(l, 1, createRng(3));
    const r = ownResult(l, 1);
    const teamIds = new Set(l.levels[l.playerLevel]!.map((t) => t.id));
    expect(r).toBeDefined();
    expect(teamIds.has(r!.opponentId)).toBe(true);
  });
});

describe('biggerWin', () => {
  const win = (goalsFor: number, goalsAgainst: number, opponentId = 'x'): OwnResult => ({
    opponentId,
    isHome: true,
    goalsFor,
    goalsAgainst
  });

  it('keeps nothing when the candidate did not win', () => {
    expect(biggerWin(null, win(1, 1))).toBeNull();
    expect(biggerWin(null, win(0, 2))).toBeNull();
  });

  it('takes the first win when there is nothing yet', () => {
    expect(biggerWin(null, win(3, 1))).toEqual({ opponentId: 'x', isHome: true, goalsFor: 3, goalsAgainst: 1 });
  });

  it('prefers the bigger margin', () => {
    const current = biggerWin(null, win(2, 1)); // margin +1
    const next = biggerWin(current, win(4, 1)); // margin +3
    expect(next?.goalsFor).toBe(4);
  });

  it('keeps the earlier win when the new one has a smaller margin', () => {
    const current = biggerWin(null, win(4, 0)); // margin +4
    const next = biggerWin(current, win(2, 1)); // margin +1
    expect(next?.goalsFor).toBe(4);
  });

  it('breaks an equal margin by goals scored', () => {
    const current = biggerWin(null, win(1, 0)); // margin +1, 1 scored
    const next = biggerWin(current, win(3, 2)); // margin +1, 3 scored
    expect(next?.goalsFor).toBe(3);
  });
});

describe('seasonRecord', () => {
  it('reads rank, points and goals from the final table', () => {
    const teams = [
      team('us', 'Uns', 20, 10, 4, 60, 30),
      team('them', 'Die anderen', 18, 8, 8, 50, 40)
    ];
    const l = handMade(teams, 'us');
    const record = seasonRecord(l, 3, 'stayed', null);

    expect(record.season).toBe(3);
    expect(record.rank).toBe(1);
    expect(record.points).toBe(20 * 3 + 10);
    expect(record.goalsFor).toBe(60);
    expect(record.goalsAgainst).toBe(30);
    expect(record.outcome).toBe('stayed');
    expect(record.biggestWin).toBeNull();
  });

  it('falls back to rank 0 and zeroed totals when the club cannot be found', () => {
    const teams = [team('them', 'Die anderen', 10, 10, 10, 40, 40)];
    const l = handMade(teams, 'ghost');
    const record = seasonRecord(l, 1, 'relegated', null);
    expect(record.rank).toBe(0);
    expect(record.points).toBe(0);
    expect(record.goalsFor).toBe(0);
  });
});

describe('careerBestRank', () => {
  const rec = (rank: number): SeasonRecord => ({
    season: rank,
    league: '3. Liga',
    rank,
    points: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    outcome: 'stayed',
    biggestWin: null
  });

  it('is undefined with no seasons yet', () => {
    expect(careerBestRank([])).toBeUndefined();
  });

  it('is the lowest (best) recorded position', () => {
    expect(careerBestRank([rec(9), rec(2), rec(5)])).toBe(2);
  });
});

describe('careerBiggestWin', () => {
  const rec = (season: number, win: SeasonRecord['biggestWin']): SeasonRecord => ({
    season,
    league: '3. Liga',
    rank: 1,
    points: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    outcome: 'stayed',
    biggestWin: win
  });

  it('is undefined when no season ever produced a win', () => {
    expect(careerBiggestWin([rec(1, null), rec(2, null)])).toBeUndefined();
  });

  it('finds the biggest margin across every season, and names the season it happened', () => {
    const seasons = [
      rec(1, { opponentId: 'a', isHome: true, goalsFor: 3, goalsAgainst: 1 }), // +2
      rec(2, { opponentId: 'b', isHome: false, goalsFor: 5, goalsAgainst: 0 }), // +5
      rec(3, { opponentId: 'c', isHome: true, goalsFor: 2, goalsAgainst: 1 }) // +1
    ];
    const best = careerBiggestWin(seasons);
    expect(best?.season).toBe(2);
    expect(best?.goalsFor).toBe(5);
  });
});
