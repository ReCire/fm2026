import { describe, it, expect } from 'vitest';
import { createRng } from '$lib/engine/rng';
import {
  causesFor, clampPressure, decayOf, fill, fineFor, pickHeadline, publish,
  raidChance, recordResult, shouldOpenFile, statusOf, RAID_RESOLVES
} from './rules';
import { createPress } from './state';
import { headlines, pressContent, INVESTIGATION_FROM, CAUSES, bandFor } from './content';

const fresh = () => createPress();

describe('the meter', () => {
  it('starts at zero, because a club that has done nothing is not under investigation', () => {
    expect(fresh().pressure).toBe(0);
    expect(bandFor(0).id).toBe('sauber');
  });

  it('decays proportionally, so the deep end costs more than the shallow end', () => {
    /*
     * The property that matters, not the number. Flat decay would mean a club
     * at 90 and a club at 30 both take the same number of matchdays to come
     * clean, which makes committing to the Schattenkabinett free after the
     * first envelope.
     */
    expect(decayOf(90)).toBeGreaterThan(decayOf(30));
    expect(decayOf(0)).toBe(0);
  });

  it('cannot be pushed outside 0..100', () => {
    expect(clampPressure(140)).toBe(100);
    expect(clampPressure(-8)).toBe(0);
  });
});

describe('the arithmetic that stops a doom spiral', () => {
  /*
   * A raid raises the meter and a higher meter raises the raid chance, which
   * is a feedback loop that could run away. It does not, because decay is
   * proportional and rises with it — but that is an ARGUMENT, and this is the
   * check. Written from what must be true of the system rather than from the
   * two functions, so if either number is retuned this says whether the
   * conclusion survived.
   */
  /*
   * Every raid publishes TWO stories — the raid and the fine that follows it —
   * and the first version of this test counted only the first. It passed, and
   * the tick test then found a club that sold every node it owned, did nothing
   * for forty matchdays, and still had an open file: the missing 4 or 5 points
   * moved the fixed point from below the threshold to about 60%.
   *
   * Which is the argument for the integration test existing at all. This one
   * models the system; that one runs it, and only one of them can be wrong
   * about what the system contains.
   */
  const worstOf = (cause: string) =>
    Math.max(...headlines.filter((h) => h.cause === cause).map((h) => h.weight));
  const worstRaidWeight = worstOf('raid') + worstOf('fine') - RAID_RESOLVES;

  it('trends downward at every pressure, with no new suspicion', () => {
    /*
     * This failed when it was written, at exactly 70% and above, and the cap in
     * `raidChance` is the fix. Worth knowing that the uncapped curve — the
     * prototype's — put the runaway inside the band the screen labels "Razzia
     * möglich", which is precisely where a player is already in trouble and
     * looking for a way back out.
     */
    for (let p = INVESTIGATION_FROM; p <= 100; p += 5) {
      const expectedGain = raidChance(p) * Math.max(0, worstRaidWeight);
      const bleed = decayOf(p);
      expect(
        bleed,
        `at ${p}%: raids add ~${expectedGain.toFixed(2)}/matchday, decay removes ${bleed.toFixed(2)}`
      ).toBeGreaterThan(expectedGain);
    }
  });

  it('a raid is never free, so decay alone cannot be the whole defence', () => {
    expect(fineFor(50)).toBeGreaterThan(0);
    expect(fineFor(90)).toBeGreaterThan(fineFor(50));
  });
});

describe('the file', () => {
  it('opens at the number the screen tells the player it opens at', () => {
    expect(shouldOpenFile(INVESTIGATION_FROM - 1, false)).toBe(false);
    expect(shouldOpenFile(INVESTIGATION_FROM, false)).toBe(true);
  });

  it('never opens for a club that bought its way out', () => {
    expect(shouldOpenFile(100, true)).toBe(false);
  });

  it('cannot be raided below the threshold', () => {
    expect(raidChance(20)).toBe(0);
    expect(raidChance(INVESTIGATION_FROM)).toBeGreaterThan(0);
  });

  it('being cleared drops the needle clear of the threshold, not onto it', () => {
    /*
     * Otherwise a club oscillates across 25% and opens a fresh file every other
     * matchday. An event that fires constantly is an event nobody reads.
     */
    const best = Math.min(...headlines.filter((h) => h.cause === 'cleared').map((h) => h.weight));
    expect(INVESTIGATION_FROM + best).toBeLessThan(INVESTIGATION_FROM - 5);
  });
});

describe('the feed', () => {
  it('moves the meter and writes the reason in the same breath', () => {
    const s = fresh();
    const story = {
      season: 1, matchday: 3, outlet: 'BLÖD', cause: 'suspicion' as const,
      text: 'Verband prüft Vorgänge', weight: 7
    };
    publish(s, story);
    expect(s.pressure).toBe(7);
    expect(s.feed[0]).toEqual(story);
  });

  it('keeps only what the content asks it to keep, newest first', () => {
    const s = fresh();
    for (let i = 0; i < pressContent.feedLength + 6; i++) {
      publish(s, {
        season: 1, matchday: i, outlet: 'BLÖD', cause: 'quiet', text: `story ${i}`, weight: 0
      });
    }
    expect(s.feed).toHaveLength(pressContent.feedLength);
    expect(s.feed[0]!.text).toBe(`story ${pressContent.feedLength + 5}`);
  });

  it('has a headline for every cause the rules can produce', () => {
    for (const cause of CAUSES) {
      expect(pickHeadline(createRng(1), cause), `no headline for ${cause}`).toBeDefined();
    }
  });

  it('leaves a placeholder it was given no value for visible rather than blank', () => {
    /*
     * A missing {opponent} that silently becomes an empty string reads as a
     * typo in the copy and gets reported as one. Left visible, it reads as a
     * bug and gets reported as this.
     */
    expect(fill('{club} verliert bei {opponent}', { club: 'SC Ziegelhütte' }))
      .toBe('SC Ziegelhütte verliert bei {opponent}');
  });
});

describe('what the papers pick up', () => {
  it('writes one story per matchday, not one per angle', () => {
    const s = fresh();
    s.winless = 9;
    const causes = causesFor(s, { goalsFor: 0, goalsAgainst: 5, isHome: false, opponent: 'X' });
    expect(causes).toHaveLength(1);
    expect(causes[0]).toBe('thrashing');
  });

  it('finds something to print in a season where nothing happens', () => {
    /*
     * The reason the screen is worth opening for a manager who has never done
     * anything. An empty page for a whole career is the mistake we made with
     * badges nobody could earn.
     */
    const s = fresh();
    expect(causesFor(s, { goalsFor: 1, goalsAgainst: 1, isHome: true, opponent: 'X' }))
      .toEqual(['quiet']);
    expect(causesFor(s, undefined)).toEqual(['quiet']);
  });

  it('does not let the football move the needle', () => {
    const football = new Set(['defeat', 'thrashing', 'streak', 'promotion', 'quiet']);
    for (const h of headlines) {
      if (football.has(h.cause)) {
        expect(h.weight, `${h.cause}: "${h.text}" would make the Verband curious about a result`)
          .toBe(0);
      }
    }
  });
});

describe('the run counters', () => {
  it('count in opposite directions and reset on the other result', () => {
    const s = fresh();
    recordResult(s, { goalsFor: 0, goalsAgainst: 1, isHome: true, opponent: 'X' });
    recordResult(s, { goalsFor: 0, goalsAgainst: 1, isHome: true, opponent: 'X' });
    expect(s.winless).toBe(2);
    expect(s.unbeaten).toBe(0);

    recordResult(s, { goalsFor: 1, goalsAgainst: 1, isHome: true, opponent: 'X' });
    expect(s.winless).toBe(3);
    expect(s.unbeaten).toBe(1);

    recordResult(s, { goalsFor: 2, goalsAgainst: 0, isHome: true, opponent: 'X' });
    expect(s.winless).toBe(0);
    expect(s.unbeaten).toBe(2);
  });
});

describe('statusOf', () => {
  it('says nothing at all about a clean club', () => {
    expect(statusOf(fresh())).toBeNull();
  });

  it('speaks up once there is a file', () => {
    const s = fresh();
    s.pressure = 60;
    s.investigation = { openedSeason: 1, openedMatchday: 4, raids: 2 };
    expect(statusOf(s)).toContain('2');
  });
});
