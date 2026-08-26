import { z } from 'zod';
import type { Rng } from '$lib/engine/rng';

/**
 * Who you are and which club you took. Set once during the new-game flow, then
 * read by everything that addresses the player by name.
 */
export const STEPS = ['welcome', 'manager', 'club', 'narrative', 'confirm'] as const;
export type Step = (typeof STEPS)[number];

export const ManagerSchema = z.object({
  /**
   * Empty is a valid STORED value — the flow starts with no name and must be
   * saveable mid-way. Whether a name is sufficient to PROCEED is a flow rule,
   * enforced by blockers() in rules.ts. Schemas describe what can be persisted;
   * they are not the place to encode what the player is allowed to do next.
   */
  name: z.string().max(28),
  /** Avatar id, resolved to generated artwork — no binary assets in the repo. */
  avatarId: z.string(),
  age: z.number().int().min(25).max(70),
  /** Flavour only for now; the place a background trait would attach later. */
  background: z.enum(['spieler', 'analyst', 'unternehmer', 'quereinsteiger'])
});
export type Manager = z.infer<typeof ManagerSchema>;

export const OnboardingSchema = z.object({
  step: z.enum(STEPS),
  manager: ManagerSchema,
  clubId: z.string(),
  clubName: z.string(),
  narrativeId: z.string(),
  /** True once the player has finished or skipped the flow. */
  complete: z.boolean()
});
export type OnboardingState = z.infer<typeof OnboardingSchema>;

declare module '$lib/engine/state' {
  interface ModuleStates {
    onboarding: OnboardingState;
  }
}

export function createOnboarding(_rng: Rng): OnboardingState {
  return {
    step: 'welcome',
    manager: { name: '', avatarId: 'av-01', age: 38, background: 'quereinsteiger' },
    clubId: '',
    clubName: '',
    narrativeId: 'aufsteiger',
    complete: false
  };
}

export const ONBOARDING_VERSION = 1;
