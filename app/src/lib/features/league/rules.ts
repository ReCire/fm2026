import type { Rng } from '$lib/engine/rng';
import type { Fixture, LeagueState, LeagueTeam } from './state';
import { leagueContent } from './content';
import { shortFrom } from './state';
import { coloursFor } from '$lib/graphics/clubColours';

/**
 * League rules. Pure functions over plain data, RNG always injected.
 *
 * Ported from `initLeagues`, `generateFixtures`, `updateLeagueTable`,
 * `getOpponentStrength` and the league half of `simulateFullSeason` /
 * `concludeSeasonAndAdvance`. Three things were fixed on the way:
 *
 * - `renderLeagueView()` sorted `leaguesData[level]` **in place** to draw the
 *   table. Fixtures store team *indices*, so every render silently rewired the
 *   remaining schedule. `standings()` here sorts a copy and never touches the
 *   stored order.
 * - The table was sorted by points, then goal difference, and nothing else —
 *   so two clubs level on both swapped places depending on array order.
 *   Goals scored, then name, break it now, and the result is stable.
 * - Points were stored *and* recomputed. They are derived here, once.
 */

const C = leagueContent;

// ---------------------------------------------------------------- generation

/**
 * A club name: one prefix, one city, never repeated inside a save.
 *
 * The prototype gave up after 150 tries and fell back to a random number that
 * it did not check for uniqueness. The fallback here counts up until it finds
 * a free name, so `used` really is a set of distinct names.
 */
export function generateClubName(rng: Rng, used: Set<string>): string {
  for (let i = 0; i < 150; i++) {
    const name = `${rng.pick(C.prefixPool)} ${rng.pick(C.cityPool)}`;
    if (!used.has(name)) {
      used.add(name);
      return name;
    }
  }
  for (let n = 100; ; n++) {
    const name = `FC Sportfreunde ${n}`;
    if (!used.has(name)) {
      used.add(name);
      return name;
    }
  }
}

export function emptyTeam(id: string, name: string, strength: number, city = ''): LeagueTeam {
  return {
    id,
    name,
    // Defaults the editor can then overwrite. A generated club is deliberately
    // plain — a blank slate is what invites replacement, which is the whole
    // point of shipping an editor.
    short: shortFrom(name),
    city,
    colours: [...coloursFor(id)] as [string, string],
    strength: clamp(Math.round(strength), 1, 99),
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    goalsFor: 0,
    goalsAgainst: 0
  };
}

/**
 * Every division, filled with generated clubs. The player's club is placed
 * first in its own division, exactly as `initLeagues()` did — but the position
 * is never used as an identity: everything looks the club up by name, because
 * promotion reorders the array.
 */
/**
 * Build the pyramid.
 *
 * `designed` are the hand-written clubs for a division — crests, cities,
 * flavour — seeded as a MINORITY among generated ones. Four crafted clubs in a
 * division of eighteen anchors its character and makes the crest carousel show
 * teams the player will actually meet.
 *
 * The generated remainder is deliberately plain, and that is a feature rather
 * than a shortfall: a club called "Dynamo Regensburg" with no story is a blank
 * slate that invites replacement, which is the whole point of shipping an
 * editor. Crafted identity works slightly AGAINST that — nobody wants to
 * overwrite a club they have grown fond of. So a handful with character to give
 * the division texture, and the rest forgettable so the pencil feels welcome.
 */
export function buildPyramid(
  rng: Rng,
  playerLevel: number,
  designed: Record<number, readonly { id: string; name: string }[]> = {}
): LeagueTeam[][] {
  const used = new Set<string>();
  return C.levels.map((level, l) => {
    const seeded = designed[l] ?? [];
    for (const d of seeded) used.add(d.name);

    const teams: LeagueTeam[] = [];
    for (let t = 0; t < C.teamsPerLevel; t++) {
      const strength = rng.int(level.baseStrength, level.baseStrength + C.strengthSpread - 1);
      const design = seeded[t];
      teams.push(
        design
          ? emptyTeam(design.id, design.name, strength)
          : emptyTeam(generatedId(rng), generateClubName(rng, used), strength)
      );
    }
    return teams;
  });
}

/**
 * An id for a generated club: from the seeded stream, never from the name.
 * Same seed, same ids — so an edit survives restarting the same career.
 */
function generatedId(rng: Rng): string {
  return `g${rng.int(100_000, 999_999)}`;
}

/** Find a club anywhere in the pyramid. The editor addresses teams by id. */
/** Where our club sits in its division, found by id rather than by name. */
export function rankOfId(teams: readonly LeagueTeam[], id: string): number {
  return standings(teams).findIndex((r) => r.team.id === id) + 1;
}

export function teamById(league: LeagueState, id: string): LeagueTeam | undefined {
  for (const level of league.levels) {
    const found = level.find((t) => t.id === id);
    if (found) return found;
  }
  return undefined;
}

/** Every club in the world, for the editor's list. */
export function allTeams(league: LeagueState): { team: LeagueTeam; level: number }[] {
  return league.levels.flatMap((teams, level) => teams.map((team) => ({ team, level })));
}

/**
 * Round-robin, home and away, by the circle method: club 0 stays put and the
 * rest rotate one place each round. `teamCount` must be even — with an odd
 * count the pairing loop leaves the middle club unpaired and it simply never
 * plays, which is what the prototype did. Content validates that; this returns
 * an empty schedule rather than a broken one.
 */
export function generateFixtures(teamCount: number): Fixture[][] {
  if (teamCount < 2 || teamCount % 2 !== 0) return [];

  const indices = Array.from({ length: teamCount }, (_, i) => i);
  const firstHalf: Fixture[][] = [];

  for (let round = 0; round < teamCount - 1; round++) {
    const pairings: Fixture[] = [];
    for (let i = 0; i < teamCount / 2; i++) {
      let home = indices[i]!;
      let away = indices[teamCount - 1 - i]!;
      // Alternate who is at home each round, so no club gets a lopsided
      // home/away run out of the rotation itself.
      if (round % 2 === 1) [home, away] = [away, home];
      pairings.push({ home, away, homeGoals: null, awayGoals: null, played: false });
    }
    firstHalf.push(pairings);
    indices.splice(1, 0, indices.pop()!);
  }

  const secondHalf = firstHalf.map((round) =>
    round.map((m) => ({ home: m.away, away: m.home, homeGoals: null, awayGoals: null, played: false }))
  );
  return [...firstHalf, ...secondHalf];
}

// -------------------------------------------------------------------- table

export function points(team: LeagueTeam): number {
  return team.won * C.pointsForWin + team.drawn * C.pointsForDraw + team.lost * C.pointsForLoss;
}

export function goalDifference(team: LeagueTeam): number {
  return team.goalsFor - team.goalsAgainst;
}

export interface TableRow {
  /** 1-based position. */
  pos: number;
  team: LeagueTeam;
  points: number;
  goalDifference: number;
}

/**
 * The table. Points, then goal difference, then goals scored, then name —
 * the last one only so that two identical records always sort the same way,
 * in a test and on screen.
 *
 * Sorts a copy: the stored array order is what fixtures index into.
 */
export function standings(teams: readonly LeagueTeam[]): TableRow[] {
  return [...teams]
    .sort(
      (a, b) =>
        points(b) - points(a) ||
        goalDifference(b) - goalDifference(a) ||
        b.goalsFor - a.goalsFor ||
        a.name.localeCompare(b.name, 'de')
    )
    .map((team, i) => ({ pos: i + 1, team, points: points(team), goalDifference: goalDifference(team) }));
}


/** `getOpponentStrength()`: search every division, fall back to a plausible club. */
export function opponentStrength(league: LeagueState, name: string): number {
  for (const teams of league.levels) {
    const team = teams.find((t) => t.name === name);
    if (team) return team.strength;
  }
  return C.unknownOpponentStrength;
}

/** Booked results applied to both clubs' rows. `updateLeagueTable()`, ported. */
export function applyResult(teams: LeagueTeam[], fixture: Fixture): void {
  const home = teams[fixture.home];
  const away = teams[fixture.away];
  if (!home || !away) return;
  if (fixture.homeGoals === null || fixture.awayGoals === null) return;

  const hg = fixture.homeGoals;
  const ag = fixture.awayGoals;

  home.played++;
  away.played++;
  home.goalsFor += hg;
  home.goalsAgainst += ag;
  away.goalsFor += ag;
  away.goalsAgainst += hg;

  if (hg > ag) {
    home.won++;
    away.lost++;
  } else if (hg < ag) {
    away.won++;
    home.lost++;
  } else {
    home.drawn++;
    away.drawn++;
  }
}

// ------------------------------------------------------------------ matchday

export interface MatchResult {
  homeGoals: number;
  awayGoals: number;
}

/**
 * The goal model, ported from `simulateFullSeason()`: each side rolls 0..2 and
 * the stronger side adds one goal per twenty points of edge. Deliberately
 * coarse — the dedicated matchday engine will replace it for the player's own
 * fixture; this is what keeps the other 71 clubs moving.
 *
 * ONE DELIBERATE CHANGE. The prototype gave home advantage only to the player:
 * `calcTeamStrength(true)` added +3, while two AI clubs met on neutral ground.
 * Every AI table was therefore built without a home effect while the player's
 * own results carried one, which quietly made the player's record better than
 * the table around it. Here every home side gets `homeAdvantage`, so the whole
 * pyramid is simulated by the same rule.
 */
/**
 * `goalChance` scales how open the game is, for BOTH sides equally.
 *
 * It moves variance, not expectation — which is what makes an attacking style a
 * trade rather than a strictly better option. Raising only the player's scoring
 * would put both styles on one axis, and on one axis one of them must dominate:
 * the only choice left would be which. More goals at both ends means offensive
 * football is right when a draw is worthless and wrong when a point is worth
 * having, which is a decision rather than a calculation.
 */
export function simulateFixture(
  rng: Rng,
  homeStrength: number,
  awayStrength: number,
  goalChance = 1
): MatchResult {
  const edge = homeStrength + C.homeAdvantage - awayStrength;
  const homeBoost = edge > 0 ? edge * C.strengthGoalFactor : 0;
  const awayBoost = edge < 0 ? -edge * C.strengthGoalFactor : 0;
  const base = C.goalBase * goalChance;
  return {
    homeGoals: Math.max(0, Math.floor(rng.next() * base + homeBoost * goalChance)),
    awayGoals: Math.max(0, Math.floor(rng.next() * base + awayBoost * goalChance))
  };
}

/**
 * Change a result that has already been counted.
 *
 * The player's own match is resolved by the simulation at kickoff so that the
 * table, the report and the narration all agree from the first second. If they
 * then change something at half time, the second half is played again and this
 * is how the table learns about it: reverse exactly what `applyResult` added,
 * write the new goals, and apply it once more.
 *
 * Written as reverse-then-reapply rather than as a diff on purpose. A diff has
 * to re-derive which of won/drawn/lost moved, and gets it wrong the moment a
 * 1:0 becomes a 1:1 — the kind of error that shows up four matchdays later as a
 * table that does not add up, with nothing to point at.
 */
export function amendResult(
  teams: LeagueTeam[],
  fixture: Fixture,
  homeGoals: number,
  awayGoals: number
): void {
  const home = teams[fixture.home];
  const away = teams[fixture.away];
  if (!home || !away) return;
  if (!fixture.played || fixture.homeGoals === null || fixture.awayGoals === null) return;

  const hg = fixture.homeGoals;
  const ag = fixture.awayGoals;

  home.played--;
  away.played--;
  home.goalsFor -= hg;
  home.goalsAgainst -= ag;
  away.goalsFor -= ag;
  away.goalsAgainst -= hg;
  if (hg > ag) {
    home.won--;
    away.lost--;
  } else if (hg < ag) {
    away.won--;
    home.lost--;
  } else {
    home.drawn--;
    away.drawn--;
  }

  fixture.homeGoals = Math.max(0, Math.round(homeGoals));
  fixture.awayGoals = Math.max(0, Math.round(awayGoals));
  applyResult(teams, fixture);
}

/** The round of a division, or an empty list outside the season. */
export function matchdayFixtures(league: LeagueState, level: number, matchday: number): Fixture[] {
  return league.fixtures[level]?.[matchday - 1] ?? [];
}

export interface PlayerFixture {
  fixture: Fixture;
  isHome: boolean;
  opponent: string;
  opponentStrength: number;
}

/** Who the club plays this matchday, and where. Undefined outside the season. */
export function playerFixture(league: LeagueState, matchday: number): PlayerFixture | undefined {
  const teams = league.levels[league.playerLevel];
  if (!teams) return undefined;
  const us = teams.findIndex((t) => t.id === league.playerClubId);
  if (us < 0) return undefined;

  for (const fixture of matchdayFixtures(league, league.playerLevel, matchday)) {
    if (fixture.home !== us && fixture.away !== us) continue;
    const isHome = fixture.home === us;
    const opponent = teams[isHome ? fixture.away : fixture.home];
    if (!opponent) return undefined;
    return { fixture, isHome, opponent: opponent.name, opponentStrength: opponent.strength };
  }
  return undefined;
}

export interface MatchdayReport {
  /** Set when the player's club played. */
  player?: {
    isHome: boolean;
    opponent: string;
    goalsFor: number;
    goalsAgainst: number;
    result: 'win' | 'draw' | 'loss';
  };
  /** How many fixtures were decided across the whole pyramid. */
  played: number;
}

/**
 * Play one matchday across every division.
 *
 * `playerStrength` lets a module that knows the eleven (squad, later the
 * matchday engine) override the stored table strength for our own club, without
 * this file importing it.
 */
export function playMatchday(
  league: LeagueState,
  matchday: number,
  rng: Rng,
  playerStrength?: number,
  goalChance = 1
): MatchdayReport {
  const report: MatchdayReport = { played: 0 };

  for (let level = 0; level < league.levels.length; level++) {
    const teams = league.levels[level];
    if (!teams) continue;

    for (const fixture of matchdayFixtures(league, level, matchday)) {
      if (fixture.played) continue;
      const home = teams[fixture.home];
      const away = teams[fixture.away];
      if (!home || !away) continue;

      // Our own style only opens up OUR fixture. Two AI clubs play a normal game.
      const isOurs = home.id === league.playerClubId || away.id === league.playerClubId;
      const result = simulateFixture(
        rng,
        strengthOf(home, league.playerClubId, playerStrength),
        strengthOf(away, league.playerClubId, playerStrength),
        isOurs ? goalChance : 1
      );
      fixture.homeGoals = result.homeGoals;
      fixture.awayGoals = result.awayGoals;
      fixture.played = true;
      applyResult(teams, fixture);
      report.played++;

      const weAreHome = home.id === league.playerClubId;
      if (weAreHome || away.id === league.playerClubId) {
        const goalsFor = weAreHome ? result.homeGoals : result.awayGoals;
        const goalsAgainst = weAreHome ? result.awayGoals : result.homeGoals;
        report.player = {
          isHome: weAreHome,
          opponent: weAreHome ? away.name : home.name,
          goalsFor,
          goalsAgainst,
          result: goalsFor > goalsAgainst ? 'win' : goalsFor < goalsAgainst ? 'loss' : 'draw'
        };
      }
    }
  }

  return report;
}

/**
 * The strength a club takes into a fixture.
 *
 * Ours comes from the eleven we actually picked, when matchday has published
 * it. Identified by id: comparing names would stop recognising our own club the
 * moment the player renamed it in the editor — which is the first thing anyone
 * does — and the symptom would be the squad silently ceasing to matter.
 */
function strengthOf(team: LeagueTeam, playerClubId: string, playerStrength?: number): number {
  return team.id === playerClubId && playerStrength !== undefined ? playerStrength : team.strength;
}

// ---------------------------------------------------------------- season end

export interface SeasonOutcome {
  /** 1-based final position, or 0 if the club is not in its division. */
  rank: number;
  level: number;
  levelName: string;
  promoted: boolean;
  relegated: boolean;
  /** Reached a European place in the top division. */
  europe: boolean;
}

/**
 * Where the season left the club, before anything is moved.
 *
 * DELIBERATE CHANGE. `concludeSeasonAndAdvance()` promoted on `myRank <= 2` but
 * relegated on `myRank >= 16` — two up, three down out of eighteen. That only
 * held together because the prototype threw the whole world away and rebuilt it
 * every summer; with clubs that persist, the divisions would lose a team a year.
 * Content now validates `promotionPlaces === relegationPlaces` and both are 2.
 */
export function seasonOutcome(league: LeagueState): SeasonOutcome {
  const level = league.playerLevel;
  const teams = league.levels[level] ?? [];
  const rank = rankOfId(teams, league.playerClubId);
  const bottom = teams.length - C.relegationPlaces;

  return {
    rank,
    level,
    levelName: C.levels[level]?.name ?? `Liga ${level + 1}`,
    promoted: rank > 0 && rank <= C.promotionPlaces && level > 0,
    relegated: rank > 0 && rank > bottom && level < league.levels.length - 1,
    europe: rank > 0 && level === 0 && rank <= C.europePlaces
  };
}

/**
 * Where the club's spending power ranks in its own division. 1 is the richest.
 *
 * Derived from squad strength, because that is the only cross-club number the
 * game has — AI clubs carry a `strength` and no balance sheet. It is a fair
 * proxy rather than a fudge: a squad is what a budget bought, and the two move
 * together in the direction that matters. If clubs ever get real finances this
 * is the one function that changes.
 *
 * Published rather than computed by the boardroom, because league owns the club
 * list and a consumer deriving it would go stale the moment a club develops.
 */
export function budgetRank(league: LeagueState): number {
  const teams = league.levels[league.playerLevel] ?? [];
  const us = teams.find((t) => t.id === league.playerClubId);
  if (!us) return Math.max(1, Math.ceil(teams.length / 2));
  return teams.filter((t) => t.strength > us.strength).length + 1;
}

export interface Movement {
  team: string;
  from: number;
  to: number;
  direction: 'up' | 'down';
}

/**
 * Promotion and relegation across the whole pyramid.
 *
 * The prototype moved only the player and then threw the world away —
 * `initLeagues()` regenerated all four divisions from scratch every season, so
 * the club that just went up with you did not exist the next morning. Here the
 * clubs are real and keep their identity: the bottom `relegationPlaces` of a
 * division swap with the top `promotionPlaces` of the one below.
 *
 * Tables are reset and fixtures regenerated afterwards, so the returned state
 * is a complete new season.
 */
/**
 * Die Relegation: one two-legged tie for the last place in a division.
 *
 * The challenger is `playoffPlace` in the lower division; the defender is the
 * club two off the bottom of the higher one. Real at both boundaries we model:
 * Bundesliga 16th against 2. Bundesliga 3rd, and 2. Bundesliga 16th against
 * 3. Liga 3rd.
 *
 * First leg at the HIGHER division's ground, second at the lower — the German
 * order, and it matters because it hands the second half of the tie, and any
 * extra time, to the challenger's crowd.
 *
 * No away goals: the rule was abolished after 2021/22. Level on aggregate goes
 * to extra time and penalties, resolved here as a weighted coin — a shoot-out
 * is where being the better side helps least, the same reasoning the Champions
 * Cup uses.
 */
export interface PlayoffTie {
  challenger: LeagueTeam;
  defender: LeagueTeam;
  /** [first leg, second leg], each from the HOME side's perspective. */
  legs: [{ homeGoals: number; awayGoals: number }, { homeGoals: number; awayGoals: number }];
  /** [challenger, defender]. */
  aggregate: [number, number];
  challengerWon: boolean;
  onPenalties: boolean;
}

export function playRelegationTie(
  rng: Rng,
  challenger: LeagueTeam,
  defender: LeagueTeam,
  playerClubId: string,
  playerStrength?: number
): PlayoffTie {
  const cs = strengthOf(challenger, playerClubId, playerStrength);
  const ds = strengthOf(defender, playerClubId, playerStrength);

  // First leg at the defender's ground, second at the challenger's.
  const first = simulateFixture(rng, ds, cs);
  const second = simulateFixture(rng, cs, ds);

  const challengerGoals = first.awayGoals + second.homeGoals;
  const defenderGoals = first.homeGoals + second.awayGoals;

  let challengerWon = challengerGoals > defenderGoals;
  let onPenalties = false;
  if (challengerGoals === defenderGoals) {
    onPenalties = true;
    /*
     * Slightly weighted, and slightly is the point. Eleven points of gap moves
     * a shoot-out from even to roughly two to one; it never makes it a
     * formality, because the whole reason this tie is watched is that it is
     * not one.
     */
    const edge = Math.max(0.25, Math.min(0.75, 0.5 + (cs - ds) * 0.02));
    challengerWon = rng.chance(edge);
  }

  return {
    challenger,
    defender,
    legs: [
      { homeGoals: first.homeGoals, awayGoals: first.awayGoals },
      { homeGoals: second.homeGoals, awayGoals: second.awayGoals }
    ],
    aggregate: [challengerGoals, defenderGoals],
    challengerWon,
    onPenalties
  };
}

/**
 * Move everybody, having first played the Relegation ties.
 *
 * Two up and two down automatically; the third place in each division is
 * decided by a tie rather than by the table. `ties` is returned so the season
 * review can tell the story — a club promoted in a shoot-out did not have the
 * same season as one that went up in April.
 */
export function applyPromotionRelegation(
  league: LeagueState,
  rng?: Rng,
  playerStrength?: number
): { movements: Movement[]; ties: PlayoffTie[] } {
  const ordered = league.levels.map((teams) => standings(teams).map((r) => r.team));
  const goingUp: LeagueTeam[][] = [];
  const goingDown: LeagueTeam[][] = [];

  for (let l = 0; l < ordered.length; l++) {
    const table = ordered[l]!;
    const up = l > 0 ? Math.min(C.promotionPlaces, table.length) : 0;
    const down = l < ordered.length - 1 ? Math.min(C.relegationPlaces, table.length - up) : 0;
    goingUp.push(table.slice(0, up));
    goingDown.push(table.slice(table.length - down));
  }

  /*
   * Die Relegation, played BEFORE anybody moves.
   *
   * One tie per boundary: `playoffPlace` in the lower division against the
   * club two off the bottom of the higher one. The winner has the place. Only
   * when the challenger wins does anything change — the defender joins the
   * relegated and the challenger joins the promoted — which is why this
   * appends to the same two lists the automatic places filled rather than
   * running a second movement pass of its own.
   */
  const ties: PlayoffTie[] = [];
  if (rng) {
    for (let upper = 0; upper < ordered.length - 1; upper++) {
      const lower = upper + 1;
      const challenger = ordered[lower]![C.playoffPlace - 1];
      const defender = ordered[upper]![ordered[upper]!.length - C.relegationPlaces - 1];
      if (!challenger || !defender) continue;

      const tie = playRelegationTie(rng, challenger, defender, league.playerClubId, playerStrength);
      ties.push(tie);
      if (tie.challengerWon) {
        goingUp[lower]!.push(challenger);
        goingDown[upper]!.push(defender);
      }
    }
  }

  const movements: Movement[] = [];
  const next: LeagueTeam[][] = [];

  for (let l = 0; l < ordered.length; l++) {
    const leaving = new Set<LeagueTeam>([...goingUp[l]!, ...goingDown[l]!]);
    const staying = ordered[l]!.filter((t) => !leaving.has(t));
    const arrivingFromAbove = l > 0 ? goingDown[l - 1]! : [];
    const arrivingFromBelow = l < ordered.length - 1 ? goingUp[l + 1]! : [];
    next.push([...staying, ...arrivingFromAbove, ...arrivingFromBelow]);

    for (const team of goingUp[l]!) movements.push({ team: team.name, from: l, to: l - 1, direction: 'up' });
    for (const team of goingDown[l]!) movements.push({ team: team.name, from: l, to: l + 1, direction: 'down' });
  }

  league.levels = next;
  for (const teams of league.levels) for (const team of teams) resetTeam(team);
  league.fixtures = league.levels.map((teams) => generateFixtures(teams.length));

  const found = league.levels.findIndex((teams) => teams.some((t) => t.id === league.playerClubId));
  if (found >= 0) league.playerLevel = found;

  return { movements, ties };
}

/** Clears every record while keeping the clubs. Used at the turn of a season. */
export function resetTeam(team: LeagueTeam): void {
  team.played = 0;
  team.won = 0;
  team.drawn = 0;
  team.lost = 0;
  team.goalsFor = 0;
  team.goalsAgainst = 0;
}

export function levelName(level: number): string {
  return C.levels[level]?.name ?? `Liga ${level + 1}`;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}


/**
 * Make the club the player chose at career start their club in the league.
 *
 * Without this the choice was decorative: you picked SC Ziegelhütte, saw a
 * toast welcoming you to it, and then played the whole season as a hardcoded
 * "FC Anstoß Pro". The carousel, the crests and the flavour lines all led to a
 * confirm screen and stopped there.
 *
 * Replaces the club occupying our slot rather than appending, so the division
 * stays the right size.
 */
export function adoptClub(
  league: LeagueState,
  club: { id: string; name: string },
  level: number
): boolean {
  const teams = league.levels[level];
  if (!teams || teams.length === 0) return false;

  const existing = teams.findIndex((t) => t.id === club.id);
  const slot = existing >= 0 ? existing : 0;
  const held = teams[slot]!;

  teams[slot] = { ...held, id: club.id, name: club.name };
  league.playerLevel = level;
  league.playerClubId = club.id;
  return true;
}

/**
 * How strong a club in this division can become through its own work.
 *
 * Set so each level's ceiling is the next level's floor. Win your division and
 * you arrive in the one above as a newcomer who belongs there — which is what
 * a pyramid is supposed to feel like.
 */
export function developmentTarget(level: number): number {
  const band = C.levels[level];
  if (!band) return 99;
  return band.baseStrength + C.strengthSpread + C.developHeadroom;
}

/**
 * A training week for everyone else.
 *
 * The player's club is skipped: its strength comes from its actual squad
 * through the bus, and writing to the stored table value here would give it a
 * second, contradictory source — the failure this codebase keeps having.
 *
 * The chance is proportional to the gap left, so a division improves quickly
 * while it is behind and barely at all once it has arrived. That mirrors
 * `diminishFrom` on the player's side, so neither runs away from the other.
 */
export function developClubs(league: LeagueState, rng: Rng): void {
  league.levels.forEach((teams, level) => {
    const target = developmentTarget(level);
    for (const team of teams) {
      if (team.id === league.playerClubId) continue;
      const gap = target - team.strength;
      if (gap <= 0) continue;
      if (rng.chance(gap * C.developRate)) {
        team.strength = clamp(team.strength + 1, 1, 99);
      }
    }
  });
}
