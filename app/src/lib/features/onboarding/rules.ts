import type { OnboardingState, Step } from './state';
import { STEPS } from './state';
import { onboardingContent, clubById, type StartClub } from './content';
import type { Narrative } from '../progression/content';

/**
 * The new-game flow, as a small state machine over plain data.
 *
 * Keeping it here rather than inside a component means the flow can be tested,
 * resumed from a save, deep-linked to a step, and completely restyled without
 * anyone touching the logic that decides what a valid start looks like.
 */

export function stepIndex(step: Step): number {
  return STEPS.indexOf(step);
}

/** What is missing before this step can be left. Empty means ready. */
export function blockers(o: OnboardingState): string[] {
  const missing: string[] = [];
  switch (o.step) {
    case 'manager':
      if (o.manager.name.trim().length === 0) missing.push('Trag deinen Namen ein.');
      if (o.manager.name.trim().length > 28) missing.push('Der Name ist zu lang.');
      break;
    case 'narrative':
      if (!o.narrativeId) missing.push('Wähle eine Startgeschichte.');
      break;
    case 'club':
      if (!o.clubId) missing.push('Wähle einen Verein.');
      else if (!clubById(o.clubId)) missing.push('Diesen Verein gibt es nicht mehr.');
      break;
  }
  return missing;
}

export function canAdvance(o: OnboardingState): boolean {
  return blockers(o).length === 0;
}

export function advance(o: OnboardingState): Step {
  if (!canAdvance(o)) return o.step;
  const next = STEPS[stepIndex(o.step) + 1];
  if (next) o.step = next;
  return o.step;
}

export function back(o: OnboardingState): Step {
  const prev = STEPS[stepIndex(o.step) - 1];
  if (prev) o.step = prev;
  return o.step;
}

export function chooseClub(o: OnboardingState, clubId: string): boolean {
  const club = clubById(clubId);
  if (!club) return false;
  o.clubId = club.id;
  o.clubName = club.name;
  return true;
}

/**
 * Clubs a narrative can honestly be told about.
 *
 * Exact division first: a story that says "you just came up from the fourth
 * division" should offer fourth-division sides, not something adjacent. Widens
 * by one division only if that leaves nothing, so a thin roster degrades to a
 * slightly-off choice rather than to no choice at all.
 *
 * Filtering here rather than validating at the end means the contradiction is
 * never presented, so the player cannot build a start the copy has to lie about.
 */
export function clubsForNarrative(
  narrative: Narrative | undefined,
  all: StartClub[]
): StartClub[] {
  if (!narrative) return all;
  const exact = all.filter((c) => c.leagueLevel === narrative.leagueLevel);
  if (exact.length > 0) return exact;
  const near = all.filter((c) => Math.abs(c.leagueLevel - narrative.leagueLevel) <= 1);
  return near.length > 0 ? near : all;
}

/** A deterministic default manager name, so the field is never empty on arrival. */
export function suggestName(seedText: string): string {
  const first = ['Marco', 'Kevin', 'Jens', 'Uwe', 'Sabine', 'Andrea', 'Thomas', 'Nils'];
  const last = ['Berger', 'Kowalski', 'Ritter', 'Sanders', 'Brandt', 'Vogel', 'Hoffmann'];
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seedText.length; i++) {
    h ^= seedText.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  h = h >>> 0;
  return `${first[h % first.length]} ${last[(h >>> 8) % last.length]}`;
}

export function isComplete(o: OnboardingState): boolean {
  return o.complete;
}

/** Everything the flow produced, for the modules that consume it. */
export interface StartSetup {
  managerName: string;
  avatarId: string;
  club: StartClub;
  narrativeId: string;
}

export function finish(o: OnboardingState): StartSetup | undefined {
  const club = clubById(o.clubId);
  if (!club || o.manager.name.trim().length === 0) return undefined;
  o.step = 'confirm';
  o.complete = true;
  return {
    managerName: o.manager.name.trim(),
    avatarId: o.manager.avatarId,
    club,
    narrativeId: o.narrativeId
  };
}

/** Skip straight to a playable default. Every flow needs an exit. */
export function skip(o: OnboardingState): StartSetup {
  if (o.manager.name.trim().length === 0) o.manager.name = suggestName('anstoss');
  if (!clubById(o.clubId)) chooseClub(o, onboardingContent.clubs[0]!.id);
  return finish(o)!;
}
