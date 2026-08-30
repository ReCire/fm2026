import { z } from 'zod';
import type { Rng } from '$lib/engine/rng';

/**
 * The knowledge tree — what the club has learned how to do.
 *
 * Two currencies, deliberately. Wissenspunkte are the true scarcity: they
 * accrue slowly, they are flat for every club, and they are what makes the tree
 * a series of REFUSALS rather than a shopping list you eventually complete.
 * Money decides WHEN rather than WHAT, and it scales by division so the bite is
 * the same in the Regionalliga as in the Bundesliga.
 */
export const KnowledgeSchema = z.object({
  /** Node ids the club has researched. Order is purchase order. */
  owned: z.array(z.string()),
  /** Wissenspunkte in hand. */
  points: z.number().int().min(0),
  /** Earned over the whole career, for the report. Never spent down. */
  earned: z.number().int().min(0)
});
export type KnowledgeState = z.infer<typeof KnowledgeSchema>;

declare module '$lib/engine/state' {
  interface ModuleStates {
    knowledge: KnowledgeState;
  }
}

export function createKnowledge(_rng: Rng): KnowledgeState {
  return { owned: [], points: 2, earned: 2 };
}

export const KNOWLEDGE_VERSION = 1;
