import { describe, it, expect } from 'vitest';
import {
  blockers, canAdvance, advance, back, chooseClub,
  narrativesForClub, suggestName, finish, skip, stepIndex
} from './rules';
import { createOnboarding, type OnboardingState } from './state';
import { onboardingContent, clubById } from './content';
import { narratives } from '../progression/content';
import { createRng } from '$lib/engine/rng';

const fresh = (): OnboardingState => createOnboarding(createRng(1));

const readyAtClub = () => {
  const o = fresh();
  o.step = 'manager';
  o.manager.name = 'Uwe Berger';
  advance(o);
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
    expect(advance(o)).toBe('club');
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
    expect(back(o)).toBe('manager');
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

describe('narrativesForClub', () => {
  it('offers only stories within one division of the club', () => {
    const topFlight = onboardingContent.clubs.find((c) => c.leagueLevel === 1)!;
    const fitting = narrativesForClub(topFlight, narratives);
    for (const n of fitting) {
      expect(Math.abs(n.leagueLevel - topFlight.leagueLevel)).toBeLessThanOrEqual(1);
    }
  });

  it('never returns an empty list — an unfilterable club still gets choices', () => {
    const odd = { ...onboardingContent.clubs[0]!, leagueLevel: 3 as const };
    expect(narrativesForClub(odd, []).length).toBe(0);
    expect(narrativesForClub(odd, narratives).length).toBeGreaterThan(0);
  });

  it('returns everything when no club is chosen yet', () => {
    expect(narrativesForClub(undefined, narratives)).toEqual(narratives);
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
