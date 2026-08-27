import { describe, it, expect } from 'vitest';
import {
  blockers, canAdvance, advance, back, chooseClub,
  clubsForNarrative, suggestName, finish, skip, stepIndex
} from './rules';
import { createOnboarding, STEPS, type OnboardingState } from './state';
import { onboardingContent, clubById } from './content';
import { narratives } from '../progression/content';
import { createRng } from '$lib/engine/rng';

const fresh = (): OnboardingState => createOnboarding(createRng(1));

/** Walks the flow to the club step, which now sits after the narrative. */
const readyAtClub = () => {
  const o = fresh();
  o.step = 'manager';
  o.manager.name = 'Uwe Berger';
  advance(o);          // -> narrative
  advance(o);          // -> club  (narrativeId defaults to aufsteiger)
  return o;
};

describe('content', () => {
  it('offers clubs across more than one league level', () => {
    const levels = new Set(onboardingContent.clubs.map((c) => c.leagueLevel));
    expect(levels.size).toBeGreaterThan(1);
  });

  it('has unique club ids and short codes', () => {
    const ids = onboardingContent.clubs.map((c) => c.id);
    const shorts = onboardingContent.clubs.map((c) => c.short);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(shorts).size).toBe(shorts.length);
  });

  it('gives every avatar a label that reads as an accessible name', () => {
    for (const a of onboardingContent.avatars) {
      expect(a.label.length).toBeGreaterThan(4);
    }
  });
});

describe('step gating', () => {
  it('will not leave the manager step without a name', () => {
    const o = fresh();
    o.step = 'manager';
    expect(canAdvance(o)).toBe(false);
    expect(blockers(o)[0]).toMatch(/Namen/);
    expect(advance(o)).toBe('manager');   // did not move
  });

  it('advances once the name is there', () => {
    const o = fresh();
    o.step = 'manager';
    o.manager.name = 'Sabine Vogel';
    expect(canAdvance(o)).toBe(true);
    expect(advance(o)).toBe('narrative');
  });

  it('puts the narrative before the club, so the copy cannot contradict the crest', () => {
    expect(STEPS.indexOf('narrative')).toBeLessThan(STEPS.indexOf('club'));
  });

  it('rejects a whitespace-only name', () => {
    const o = fresh();
    o.step = 'manager';
    o.manager.name = '   ';
    expect(canAdvance(o)).toBe(false);
  });

  it('will not leave the club step without a valid club', () => {
    const o = readyAtClub();
    expect(o.step).toBe('club');
    expect(canAdvance(o)).toBe(false);
    o.clubId = 'gibt-es-nicht';
    expect(blockers(o)[0]).toMatch(/gibt es nicht mehr/);
  });

  it('welcome and confirm never block', () => {
    const o = fresh();
    expect(blockers(o)).toEqual([]);
    o.step = 'confirm';
    expect(blockers(o)).toEqual([]);
  });
});

describe('back', () => {
  it('preserves what was already entered', () => {
    const o = readyAtClub();
    chooseClub(o, 'fortuna95');
    expect(back(o)).toBe('narrative');
    expect(o.manager.name).toBe('Uwe Berger');
    expect(o.clubId).toBe('fortuna95');
  });

  it('does not run off the front', () => {
    const o = fresh();
    expect(back(o)).toBe('welcome');
    expect(stepIndex(o.step)).toBe(0);
  });
});

describe('chooseClub', () => {
  it('records id and display name together', () => {
    const o = fresh();
    expect(chooseClub(o, 'anstoss')).toBe(true);
    expect(o.clubName).toBe(clubById('anstoss')!.name);
  });

  it('refuses an unknown club and leaves state untouched', () => {
    const o = fresh();
    chooseClub(o, 'anstoss');
    expect(chooseClub(o, 'nope')).toBe(false);
    expect(o.clubId).toBe('anstoss');
  });
});

describe('clubsForNarrative', () => {
  it('offers only clubs in the narrative\'s own division', () => {
    for (const n of narratives) {
      const clubs = clubsForNarrative(n, onboardingContent.clubs);
      const exact = onboardingContent.clubs.filter((c) => c.leagueLevel === n.leagueLevel);
      if (exact.length > 0) {
        expect(clubs.map((c) => c.leagueLevel), n.id).toEqual(exact.map((c) => c.leagueLevel));
      }
    }
  });

  /**
   * The invariant that makes the whole step worth having. If a narrative offers
   * one club it is not a choice, and if it offers none the flow dead-ends —
   * either way the content, not the code, is what is wrong, so it fails here.
   */
  it('gives every narrative at least three clubs to choose from', () => {
    for (const n of narratives) {
      const clubs = clubsForNarrative(n, onboardingContent.clubs);
      expect(clubs.length, `narrative "${n.id}" (Liga ${n.leagueLevel + 1}) offers ${clubs.length}`)
        .toBeGreaterThanOrEqual(3);
    }
  });

  it('widens by one division rather than dead-ending on a thin roster', () => {
    const orphan = { ...narratives[0]!, leagueLevel: 0 as const };
    const onlyLowerLeagues = onboardingContent.clubs.filter((c) => c.leagueLevel >= 1);
    const clubs = clubsForNarrative(orphan, onlyLowerLeagues);
    expect(clubs.length).toBeGreaterThan(0);
    expect(clubs.every((c) => c.leagueLevel <= 1)).toBe(true);
  });

  it('returns everything when no narrative is chosen yet', () => {
    expect(clubsForNarrative(undefined, onboardingContent.clubs)).toEqual(onboardingContent.clubs);
  });
});

describe('suggestName', () => {
  it('is deterministic for a seed', () => {
    expect(suggestName('abc')).toBe(suggestName('abc'));
  });
  it('differs across seeds', () => {
    const names = new Set(['a', 'b', 'c', 'd', 'e'].map(suggestName));
    expect(names.size).toBeGreaterThan(1);
  });
  it('always produces two words', () => {
    expect(suggestName('x').split(' ')).toHaveLength(2);
  });
});

describe('finish', () => {
  it('returns the full setup and marks the flow complete', () => {
    const o = readyAtClub();
    chooseClub(o, 'fortuna95');
    const setup = finish(o);
    expect(setup).toBeDefined();
    expect(setup!.managerName).toBe('Uwe Berger');
    expect(setup!.club.id).toBe('fortuna95');
    expect(o.complete).toBe(true);
  });

  it('refuses to finish without a club', () => {
    const o = fresh();
    o.manager.name = 'Jens Ritter';
    expect(finish(o)).toBeUndefined();
    expect(o.complete).toBe(false);
  });

  it('trims the name it stores', () => {
    const o = readyAtClub();
    o.manager.name = '  Andrea Brandt  ';
    chooseClub(o, 'anstoss');
    expect(finish(o)!.managerName).toBe('Andrea Brandt');
  });
});

describe('skip', () => {
  it('produces a valid playable start from nothing', () => {
    const o = fresh();
    const setup = skip(o);
    expect(setup.managerName.length).toBeGreaterThan(0);
    expect(clubById(setup.club.id)).toBeDefined();
    expect(o.complete).toBe(true);
  });

  it('keeps whatever the player already chose', () => {
    const o = fresh();
    o.manager.name = 'Nils Sanders';
    chooseClub(o, 'sgwacker');
    const setup = skip(o);
    expect(setup.managerName).toBe('Nils Sanders');
    expect(setup.club.id).toBe('sgwacker');
  });
});
