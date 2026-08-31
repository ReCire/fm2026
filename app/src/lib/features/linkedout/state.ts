import { z } from 'zod';
import type { Rng } from '$lib/engine/rng';

/**
 * LinkedOut — the professional network, and who you have hired off it.
 *
 * The contacts are a POOL, not a permanent roster: a fresh set every few
 * matchdays, and the ones you did not hire are gone. That is the whole tension
 * of the surface. A list that waits for you forever is a menu, and a menu has
 * no moment in it — the decision only exists because next week these people are
 * somewhere else.
 *
 * Who you actually hired lives in `progression.delegated`, not here. A
 * delegation is a fact about a DEPARTMENT — the engine reads it every tick to
 * decide whether to run a module's autopilot — and duplicating it into a
 * marketplace's own state would be the third "two sources, both correct,
 * silently different" of the week. This module keeps the person; progression
 * keeps the arrangement.
 */

export const ContactSchema = z.object({
  id: z.string(),
  name: z.string(),
  /** Role id from `content.ts`. Decides which module they would take over. */
  roleId: z.string(),
  /** 0..100. The interesting number, and not the wage. */
  competence: z.number().int().min(0).max(100),
  /** Per matchday, in euros. */
  wage: z.number().int().min(0),
  /** 1st, 2nd or 3rd degree. Pure network parody, no mechanical effect. */
  degree: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  blurb: z.string(),
  /**
   * Behind the paywall: name blurred, competence shown, cannot be hired.
   *
   * The satire only works while the wall is genuinely annoying and genuinely
   * cheap to ignore — so a locked profile is always better than everything
   * else on the page, and buying Premium reveals names and nothing else.
   */
  locked: z.boolean()
});
export type Contact = z.infer<typeof ContactSchema>;

export const LinkedOutSchema = z.object({
  contacts: z.array(ContactSchema),
  /** Matchday the pool was last drawn, so the refresh has a cadence. */
  refreshedOn: z.number().int(),
  /** Bought LinkedOut Premium. Reveals locked names. Buys nothing else. */
  premium: z.boolean(),
  nextId: z.number().int().min(1),
  /**
   * Everyone ever hired, by contact id, with the wage agreed.
   *
   * Kept because `progression.delegated` stores an `executiveId` and a
   * competence and nothing else — so without this, dismissing someone and
   * looking at the wage bill afterwards would have no idea who had been
   * costing what. The engine needs the arrangement; the player wants the
   * person.
   */
  hired: z.record(z.string(), ContactSchema)
});
export type LinkedOutState = z.infer<typeof LinkedOutSchema>;

declare module '$lib/engine/state' {
  interface ModuleStates {
    linkedout: LinkedOutState;
  }
}

export function createLinkedOut(_rng: Rng): LinkedOutState {
  /*
   * Deliberately empty, and refreshed on the first tick rather than seeded
   * here.
   *
   * `create` runs at career start with a forked rng, before the player has a
   * league level — and the competence ceiling is a function of the league.
   * Seeding here would draw a Bundesliga field for a Regionalliga club, once,
   * on the one screen where the quality of the field IS the feedback about
   * where you are.
   */
  return { contacts: [], refreshedOn: -1, premium: false, nextId: 1, hired: {} };
}

export const LINKEDOUT_VERSION = 1;
