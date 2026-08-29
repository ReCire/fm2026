import { describe, it, expect } from 'vitest';
import { createRng } from '$lib/engine/rng';
import { createLeague } from '../league/state';
import { playMatchday } from '../league/rules';
import { MATCHDAYS_PER_SEASON } from '../league/content';
import { seasonSchedule, applyFilter, nextMatch, seasonTally } from './rules';

const league = (seed = 1) => createLeague(createRng(seed));

describe('seasonSchedule', () => {
  it('has exactly one row per matchday of the season', () => {
    const schedule = seasonSchedule(league());
    expect(schedule).toHaveLength(MATCHDAYS_PER_SEASON);
    expect(schedule.map((m) => m.matchday)).toEqual(
      Array.from({ length: MATCHDAYS_PER_SEASON }, (_, i) => i + 1)
    );
  });

  it('starts with nothing played and no result', () => {
    const schedule = seasonSchedule(league());
    expect(schedule.every((m) => !m.played)).toBe(true);
    expect(schedule.every((m) => m.result === null)).toBe(true);
  });

  it('identifies the opponent by id, never by name', () => {
    const l = league();
    const schedule = seasonSchedule(l);
    const teamIds = new Set(l.levels[l.playerLevel]!.map((t) => t.id));
    for (const m of schedule) expect(teamIds.has(m.opponentId)).toBe(true);
  });

  it('fills in the scoreline once a matchday is played', () => {
    const l = league();
    const rng = createRng(9);
    playMatchday(l, 1, rng);

    const schedule = seasonSchedule(l);
    const first = schedule[0]!;
    expect(first.played).toBe(true);
    expect(first.goalsFor).not.toBeNull();
    expect(first.goalsAgainst).not.toBeNull();
    expect(['win', 'draw', 'loss']).toContain(first.result);

    // Everything after it is still unplayed.
    expect(schedule.slice(1).every((m) => !m.played)).toBe(true);
  });

  it('returns nothing when the club is not in its division', () => {
    const l = league();
    l.playerClubId = 'no-such-club';
    expect(seasonSchedule(l)).toEqual([]);
  });
});

describe('applyFilter', () => {
  it('"all" is the identity', () => {
    const l = league();
    playMatchday(l, 1, createRng(3));
    const schedule = seasonSchedule(l);
    expect(applyFilter(schedule, 'all')).toEqual(schedule);
  });

  it('"played" keeps only decided matchdays', () => {
    const l = league();
    playMatchday(l, 1, createRng(3));
    const schedule = seasonSchedule(l);
    const played = applyFilter(schedule, 'played');
    expect(played).toHaveLength(1);
    expect(played[0]!.matchday).toBe(1);
  });

  it('"upcoming" keeps everything else', () => {
    const l = league();
    playMatchday(l, 1, createRng(3));
    const schedule = seasonSchedule(l);
    const upcoming = applyFilter(schedule, 'upcoming');
    expect(upcoming).toHaveLength(MATCHDAYS_PER_SEASON - 1);
    expect(upcoming.every((m) => !m.played)).toBe(true);
  });
});

describe('nextMatch', () => {
  it('is the first matchday before anything is played', () => {
    const schedule = seasonSchedule(league());
    expect(nextMatch(schedule)?.matchday).toBe(1);
  });

  it('advances past played matchdays', () => {
    const l = league();
    playMatchday(l, 1, createRng(4));
    playMatchday(l, 2, createRng(4));
    const schedule = seasonSchedule(l);
    expect(nextMatch(schedule)?.matchday).toBe(3);
  });

  it('is undefined once the whole season is played', () => {
    const l = league();
    const rng = createRng(5);
    for (let md = 1; md <= MATCHDAYS_PER_SEASON; md++) playMatchday(l, md, rng);
    expect(nextMatch(seasonSchedule(l))).toBeUndefined();
  });
});

describe('seasonTally', () => {
  it('sums wins, draws and losses to the number played', () => {
    const l = league();
    const rng = createRng(6);
    for (let md = 1; md <= 10; md++) playMatchday(l, md, rng);
    const tally = seasonTally(seasonSchedule(l));
    expect(tally.played).toBe(10);
    expect(tally.wins + tally.draws + tally.losses).toBe(10);
  });

  it('is all zero before a ball is kicked', () => {
    const tally = seasonTally(seasonSchedule(league()));
    expect(tally).toEqual({ played: 0, wins: 0, draws: 0, losses: 0 });
  });
});
