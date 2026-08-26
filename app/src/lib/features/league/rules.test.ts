import { describe, it, expect } from 'vitest';
import { createRng } from '$lib/engine/rng';
import { createLeague, type LeagueState, type LeagueTeam } from './state';
import { leagueContent, MATCHDAYS_PER_SEASON } from './content';
import {
  applyPromotionRelegation,
  applyResult,
  buildPyramid,
  generateFixtures,
  goalDifference,
  matchdayFixtures,
  opponentStrength,
  playMatchday,
  playerFixture,
  points,
  rankOf,
  seasonOutcome,
  standings
} from './rules';

const C = leagueContent;
const US = C.playerClubName;

const league = (seed = 1) => createLeague(createRng(seed));

/** A finished record, so table tests do not have to simulate a season first. */
function team(
  name: string,
  won: number,
  drawn: number,
  lost: number,
  goalsFor: number,
  goalsAgainst: number
): LeagueTeam {
  return { name, strength: 60, played: won + drawn + lost, won, drawn, lost, goalsFor, goalsAgainst };
}

function handMade(levels: LeagueTeam[][], playerLevel: number): LeagueState {
  return {
    playerLevel,
    levels,
    fixtures: levels.map((t) => generateFixtures(t.length)),
    inEurope: false
  };
}

/** Play the whole season out, every division. */
function playSeason(state: LeagueState, seed = 7, playerStrength?: number): void {
  const rng = createRng(seed);
  for (let md = 1; md <= MATCHDAYS_PER_SEASON; md++) playMatchday(state, md, rng, playerStrength);
}

// ------------------------------------------------------------------ fixtures

describe('generateFixtures', () => {
  it('runs home and away: (n-1) * 2 matchdays of n/2 matches', () => {
    const schedule = generateFixtures(18);
    expect(schedule).toHaveLength(34);
    expect(MATCHDAYS_PER_SEASON).toBe(34);
    for (const round of schedule) expect(round).toHaveLength(9);
  });

  it('pairs every club with every other exactly twice, once at home and once away', () => {
    const n = 18;
    const seen = new Map<string, number>();
    for (const round of generateFixtures(n)) {
      for (const f of round) seen.set(`${f.home}-${f.away}`, (seen.get(`${f.home}-${f.away}`) ?? 0) + 1);
    }
    expect(seen.size).toBe(n * (n - 1));
    for (const [pair, count] of seen) {
      expect(count, `${pair} scheduled ${count}x`).toBe(1);
      const [home, away] = pair.split('-');
      expect(seen.has(`${away}-${home}`), `missing reverse of ${pair}`).toBe(true);
    }
  });

  it('never lets a club play twice on the same matchday', () => {
    for (const round of generateFixtures(18)) {
      const involved = new Set(round.flatMap((f) => [f.home, f.away]));
      expect(involved.size).toBe(18);
    }
  });

  it('refuses an odd club count instead of silently dropping a club', () => {
    // The prototype's `for (i = 0; i < n / 2; i++)` left the middle club
    // unpaired for odd n, so it simply never played. Content validates the
    // count now; this is the second line of defence.
    expect(generateFixtures(17)).toEqual([]);
    expect(generateFixtures(1)).toEqual([]);
    expect(generateFixtures(0)).toEqual([]);
  });

  it('handles the smallest possible division', () => {
    expect(generateFixtures(2)).toEqual([
      [{ home: 0, away: 1, homeGoals: null, awayGoals: null, played: false }],
      [{ home: 1, away: 0, homeGoals: null, awayGoals: null, played: false }]
    ]);
  });
});

// -------------------------------------------------------------- determinism

describe('determinism', () => {
  it('builds the identical pyramid from the same seed', () => {
    expect(league(42)).toEqual(league(42));
  });

  it('builds a different pyramid from a different seed', () => {
    expect(league(42).levels[0]![0]!.name).not.toBe(league(43).levels[0]![0]!.name);
  });

  it('produces the identical fixture list from the same seed, by club name', () => {
    const named = (s: LeagueState) =>
      s.fixtures[0]!.map((round) =>
        round.map((f) => `${s.levels[0]![f.home]!.name} - ${s.levels[0]![f.away]!.name}`)
      );
    expect(named(league(5))).toEqual(named(league(5)));
    expect(named(league(5))).not.toEqual(named(league(6)));
  });

  it('draws the same index schedule for every seed — only who holds an index changes', () => {
    // Worth pinning: `generateFixtures` takes no rng, exactly as the prototype's
    // did. The variety between careers comes from the draw of clubs into slots,
    // not from the calendar.
    expect(league(5).fixtures).toEqual(league(6).fixtures);
  });

  it('replays a whole season to the same table from the same seed', () => {
    const a = league(9);
    const b = league(9);
    playSeason(a, 3);
    playSeason(b, 3);
    expect(a).toEqual(b);
    expect(standings(a.levels[a.playerLevel]!)).toEqual(standings(b.levels[b.playerLevel]!));
  });

  it('gives different seeds different seasons', () => {
    const a = league(9);
    const b = league(9);
    playSeason(a, 3);
    playSeason(b, 4);
    expect(a.levels).not.toEqual(b.levels);
  });
});

// ------------------------------------------------------------------ pyramid

describe('buildPyramid', () => {
  it('gives every club in the pyramid a distinct name', () => {
    const names = buildPyramid(createRng(11), 3).flat().map((t) => t.name);
    expect(names).toHaveLength(C.levels.length * C.teamsPerLevel);
    expect(new Set(names).size).toBe(names.length);
  });

  it('places our club in the starting division and nowhere else', () => {
    const state = league(2);
    expect(state.playerLevel).toBe(C.startLevel);
    const found = state.levels.flat().filter((t) => t.name === US);
    expect(found).toHaveLength(1);
    expect(state.levels[C.startLevel]!.some((t) => t.name === US)).toBe(true);
  });

  it('keeps each division inside its own strength band', () => {
    const levels = buildPyramid(createRng(3), 3);
    levels.forEach((teams, l) => {
      const base = C.levels[l]!.baseStrength;
      for (const t of teams) {
        expect(t.strength).toBeGreaterThanOrEqual(base);
        expect(t.strength).toBeLessThanOrEqual(base + C.strengthSpread - 1);
      }
    });
  });
});

// -------------------------------------------------------------------- table

describe('the table', () => {
  it('awards three for a win and one for a draw', () => {
    expect(points(team('A', 4, 2, 1, 0, 0))).toBe(14);
    expect(points(team('B', 0, 0, 5, 0, 0))).toBe(0);
    expect(goalDifference(team('C', 0, 0, 0, 12, 20))).toBe(-8);
  });

  it('books a win, a draw and a defeat onto both clubs', () => {
    const teams = [team('Heim', 0, 0, 0, 0, 0), team('Gast', 0, 0, 0, 0, 0)];
    applyResult(teams, { home: 0, away: 1, homeGoals: 3, awayGoals: 1, played: true });
    expect(teams[0]).toMatchObject({ played: 1, won: 1, lost: 0, goalsFor: 3, goalsAgainst: 1 });
    expect(teams[1]).toMatchObject({ played: 1, lost: 1, goalsFor: 1, goalsAgainst: 3 });

    applyResult(teams, { home: 1, away: 0, homeGoals: 2, awayGoals: 2, played: true });
    expect(teams[0]!.drawn).toBe(1);
    expect(teams[1]!.drawn).toBe(1);
    expect(points(teams[0]!)).toBe(4);
    expect(points(teams[1]!)).toBe(1);
  });

  it('ignores a fixture with no result and one that points outside the division', () => {
    const teams = [team('A', 0, 0, 0, 0, 0), team('B', 0, 0, 0, 0, 0)];
    applyResult(teams, { home: 0, away: 1, homeGoals: null, awayGoals: null, played: false });
    applyResult(teams, { home: 0, away: 99, homeGoals: 1, awayGoals: 0, played: true });
    expect(teams.every((t) => t.played === 0)).toBe(true);
  });

  it('sorts by points, then goal difference, then goals scored', () => {
    const table = standings([
      team('Wenig Tore', 5, 0, 0, 8, 3), // 15 pts, +5, 8 scored
      team('Mehr Tore', 5, 0, 0, 12, 7), // 15 pts, +5, 12 scored
      team('Bessere Diff', 5, 0, 0, 14, 3), // 15 pts, +11
      team('Weniger Punkte', 4, 1, 0, 40, 0) // 13 pts
    ]);
    expect(table.map((r) => r.team.name)).toEqual([
      'Bessere Diff',
      'Mehr Tore',
      'Wenig Tore',
      'Weniger Punkte'
    ]);
    expect(table.map((r) => r.pos)).toEqual([1, 2, 3, 4]);
  });

  it('breaks a dead-level tie the same way regardless of the stored order', () => {
    // The prototype stopped at goal difference, so two identical records
    // swapped places depending on where they happened to sit in the array —
    // and the array order changed every time the view re-rendered.
    const a = team('Alpha SV', 3, 1, 1, 9, 5);
    const b = team('Zeta FC', 3, 1, 1, 9, 5);
    expect(standings([a, b]).map((r) => r.team.name)).toEqual(['Alpha SV', 'Zeta FC']);
    expect(standings([b, a]).map((r) => r.team.name)).toEqual(['Alpha SV', 'Zeta FC']);
  });

  it('never reorders the stored array, because fixtures index into it', () => {
    const stored = [team('Letzter', 0, 0, 3, 0, 9), team('Erster', 3, 0, 0, 9, 0)];
    const before = stored.map((t) => t.name);
    standings(stored);
    rankOf(stored, 'Erster');
    expect(stored.map((t) => t.name)).toEqual(before);
  });

  it('is well formed before a ball is kicked', () => {
    const state = league(4);
    const table = standings(state.levels[state.playerLevel]!);
    expect(table).toHaveLength(C.teamsPerLevel);
    expect(table.map((r) => r.pos)).toEqual([...Array(C.teamsPerLevel)].map((_, i) => i + 1));
    expect(table.every((r) => r.points === 0 && r.goalDifference === 0 && r.team.played === 0)).toBe(true);
    expect(rankOf(state.levels[state.playerLevel]!, US)).toBeGreaterThan(0);
  });

  it('reports rank 0 for a club that is not in the division', () => {
    expect(rankOf([], US)).toBe(0);
    expect(rankOf([team('A', 0, 0, 0, 0, 0)], 'Niemand')).toBe(0);
  });

  it('falls back to a plausible strength for an unknown opponent', () => {
    const state = league(1);
    expect(opponentStrength(state, US)).toBe(state.levels[state.playerLevel]!.find((t) => t.name === US)!.strength);
    expect(opponentStrength(state, 'FC Gibtsnicht')).toBe(C.unknownOpponentStrength);
  });
});

// ----------------------------------------------------------------- matchday

describe('playMatchday', () => {
  it('plays every division once and never replays a fixture', () => {
    const state = league(8);
    const rng = createRng(2);
    const first = playMatchday(state, 1, rng);
    expect(first.played).toBe((C.levels.length * C.teamsPerLevel) / 2);
    expect(playMatchday(state, 1, rng).played).toBe(0);
    expect(state.levels.flat().every((t) => t.played === 1)).toBe(true);
  });

  it('reports our own fixture, with the side we played on', () => {
    const state = league(8);
    const upcoming = playerFixture(state, 1)!;
    expect(upcoming).toBeDefined();
    const report = playMatchday(state, 1, createRng(2));
    expect(report.player!.opponent).toBe(upcoming.opponent);
    expect(report.player!.isHome).toBe(upcoming.isHome);
    expect(report.player!.result).toBe(
      report.player!.goalsFor > report.player!.goalsAgainst
        ? 'win'
        : report.player!.goalsFor < report.player!.goalsAgainst
          ? 'loss'
          : 'draw'
    );
  });

  it('does nothing outside the season, and reports no fixture', () => {
    const state = league(8);
    expect(matchdayFixtures(state, 0, MATCHDAYS_PER_SEASON + 1)).toEqual([]);
    expect(playerFixture(state, 0)).toBeUndefined();
    expect(playMatchday(state, MATCHDAYS_PER_SEASON + 1, createRng(2)).played).toBe(0);
  });

  it('leaves a complete season with 34 games for everyone', () => {
    const state = league(8);
    playSeason(state);
    for (const teams of state.levels) {
      for (const t of teams) {
        expect(t.played).toBe(MATCHDAYS_PER_SEASON);
        expect(t.won + t.drawn + t.lost).toBe(MATCHDAYS_PER_SEASON);
      }
    }
    // Goals scored and conceded must balance inside a closed division.
    for (const teams of state.levels) {
      const scored = teams.reduce((s, t) => s + t.goalsFor, 0);
      const conceded = teams.reduce((s, t) => s + t.goalsAgainst, 0);
      expect(scored).toBe(conceded);
    }
  });

  it('uses a published squad strength for our club instead of the table value', () => {
    const strong = league(8);
    const weak = league(8);
    playSeason(strong, 5, 99);
    playSeason(weak, 5, 20);
    const ours = (s: LeagueState) => s.levels[s.playerLevel]!.find((t) => t.name === US)!;
    expect(points(ours(strong))).toBeGreaterThan(points(ours(weak)));
  });
});

// --------------------------------------------------------------- season end

describe('seasonOutcome', () => {
  const withRank = (level: number, ourPoints: number) => {
    const levels = C.levels.map((_, l) =>
      Array.from({ length: C.teamsPerLevel }, (_, i) =>
        team(l === level && i === 0 ? US : `Klub ${l}-${i}`, i, 0, 0, 0, 0)
      )
    );
    levels[level]![0] = team(US, ourPoints, 0, 0, 0, 0);
    return handMade(levels, level);
  };

  it('promotes the top two of a division below the first', () => {
    const first = seasonOutcome(withRank(2, 99));
    expect(first.rank).toBe(1);
    expect(first.promoted).toBe(true);
    expect(first.relegated).toBe(false);
    expect(first.levelName).toBe(C.levels[2]!.name);
  });

  it('leaves the club where it is one place short of promotion', () => {
    // 16 wins puts us behind the two clubs on 17 and 16... build it explicitly:
    const state = withRank(2, 0);
    // ranks: Klub 2-17 has 17 wins, 2-16 has 16, so we sit third from the top.
    state.levels[2]![0] = team(US, 15, 0, 0, 0, 0);
    const outcome = seasonOutcome(state);
    expect(outcome.rank).toBe(C.promotionPlaces + 1);
    expect(outcome.promoted).toBe(false);
  });

  it('never promotes out of the first division, however well the season went', () => {
    const outcome = seasonOutcome(withRank(0, 99));
    expect(outcome.rank).toBe(1);
    expect(outcome.promoted).toBe(false);
    expect(outcome.europe).toBe(true);
  });

  it('never relegates out of the last division, however badly it went', () => {
    const last = C.levels.length - 1;
    const state = withRank(last, 0);
    state.levels[last]![0] = team(US, 0, 0, 34, 0, 99);
    const outcome = seasonOutcome(state);
    expect(outcome.rank).toBe(C.teamsPerLevel);
    expect(outcome.relegated).toBe(false);
  });

  it('relegates exactly the bottom places, and the club just above them is safe', () => {
    /**
     * Rivals win 2, 4, 6 … so an odd number of wins drops us cleanly between
     * two of them: `atPlace(p)` puts us on exactly place `p`, with no tie to
     * argue about.
     */
    const atPlace = (place: number) => {
      const rivals = C.teamsPerLevel - 1;
      const levels = C.levels.map((_, l) =>
        Array.from({ length: C.teamsPerLevel }, (_, i) => team(`Klub ${l}-${i}`, i, 0, 0, 0, 0))
      );
      levels[1] = [
        team(US, (C.teamsPerLevel - place) * 2 + 1, 0, 0, 0, 0),
        ...Array.from({ length: rivals }, (_, i) => team(`Rivale ${i}`, (i + 1) * 2, 0, 0, 0, 0))
      ];
      return handMade(levels, 1);
    };

    const lastPlace = seasonOutcome(atPlace(C.teamsPerLevel));
    expect(lastPlace.rank).toBe(C.teamsPerLevel);
    expect(lastPlace.relegated).toBe(true);

    const firstSafe = seasonOutcome(atPlace(C.teamsPerLevel - C.relegationPlaces));
    expect(firstSafe.rank).toBe(C.teamsPerLevel - C.relegationPlaces);
    expect(firstSafe.relegated).toBe(false);

    const lastDropped = seasonOutcome(atPlace(C.teamsPerLevel - C.relegationPlaces + 1));
    expect(lastDropped.relegated).toBe(true);
  });

  it('qualifies for Europe only from the first division', () => {
    expect(seasonOutcome(withRank(0, 99)).europe).toBe(true);
    expect(seasonOutcome(withRank(1, 99)).europe).toBe(false);
  });
});

describe('applyPromotionRelegation', () => {
  it('swaps exactly promotionPlaces clubs between every pair of divisions', () => {
    const state = league(12);
    playSeason(state);
    const before = state.levels.map((teams) => standings(teams).map((r) => r.team.name));

    const movements = applyPromotionRelegation(state);

    const pairs = C.levels.length - 1;
    expect(movements.filter((m) => m.direction === 'up')).toHaveLength(pairs * C.promotionPlaces);
    expect(movements.filter((m) => m.direction === 'down')).toHaveLength(pairs * C.relegationPlaces);

    for (let l = 0; l < C.levels.length; l++) {
      const table = before[l]!;
      if (l > 0) {
        for (const name of table.slice(0, C.promotionPlaces)) {
          expect(state.levels[l - 1]!.some((t) => t.name === name), `${name} should be up`).toBe(true);
        }
      }
      if (l < C.levels.length - 1) {
        for (const name of table.slice(table.length - C.relegationPlaces)) {
          expect(state.levels[l + 1]!.some((t) => t.name === name), `${name} should be down`).toBe(true);
        }
      }
    }
  });

  it('keeps every division the same size and every club in the pyramid', () => {
    const state = league(13);
    playSeason(state);
    const namesBefore = state.levels.flat().map((t) => t.name).sort();

    applyPromotionRelegation(state);

    for (const teams of state.levels) expect(teams).toHaveLength(C.teamsPerLevel);
    expect(state.levels.flat().map((t) => t.name).sort()).toEqual(namesBefore);
  });

  it('never moves a club out of the top of the first or the bottom of the last division', () => {
    const state = league(14);
    playSeason(state);
    const last = C.levels.length - 1;
    const movements = applyPromotionRelegation(state);
    expect(movements.some((m) => m.direction === 'up' && m.from === 0)).toBe(false);
    expect(movements.some((m) => m.direction === 'down' && m.from === last)).toBe(false);
    expect(movements.every((m) => m.to >= 0 && m.to <= last)).toBe(true);
  });

  it('starts the new season clean: empty tables and a fresh schedule', () => {
    const state = league(15);
    playSeason(state);
    applyPromotionRelegation(state);

    expect(state.levels.flat().every((t) => t.played === 0 && t.goalsFor === 0 && points(t) === 0)).toBe(true);
    expect(state.fixtures.every((f) => f.length === MATCHDAYS_PER_SEASON)).toBe(true);
    expect(state.fixtures.flat().flat().every((f) => !f.played && f.homeGoals === null)).toBe(true);
  });

  it('moves the player with the rest of the pyramid', () => {
    const state = league(16);
    playSeason(state);
    const outcome = seasonOutcome(state);
    const expected = outcome.promoted
      ? outcome.level - 1
      : outcome.relegated
        ? outcome.level + 1
        : outcome.level;

    applyPromotionRelegation(state);

    expect(state.playerLevel).toBe(expected);
    expect(state.levels[state.playerLevel]!.some((t) => t.name === US)).toBe(true);
  });
});
