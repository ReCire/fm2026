import { z } from 'zod';
import type { Rng } from '$lib/engine/rng';
import { POSITIONS } from './positions';
import { AttributesSchema, FOCUS } from './attributes';
import { squadContent } from './content';
import { createPlayer } from './rules';
import { uniform } from './attributes';

export { POSITIONS, type Position } from './positions';

export const PlayerSchema = z.object({
  id: z.string(),
  name: z.string(),
  pos: z.enum(POSITIONS),
  /**
   * The five things a player is judged on. `strength` is no longer stored — it
   * is derived from these by position, so there is exactly one place the
   * combination is decided and an editor has something real to shape.
   */
  attributes: AttributesSchema,
  fitness: z.number().int().min(0).max(100),
  morale: z.number().int().min(0).max(100),
  age: z.number().int().min(15).max(45),
  marketValue: z.number().min(0),
  wage: z.number().min(0),
  trait: z.string(),
  /** Matchdays remaining. 0 = available. */
  injured: z.number().int().min(0),
  suspended: z.number().int().min(0),
  /** What this player works on in training. See attributes.ts. */
  individualFocus: z.enum(FOCUS)
});
export type Player = z.infer<typeof PlayerSchema>;

export const SquadSchema = z.object({
  players: z.array(PlayerSchema),
  /** Player ids in the starting eleven. */
  lineup: z.array(z.string()),
  captainId: z.string().nullable()
});
export type SquadState = z.infer<typeof SquadSchema>;

declare module '$lib/engine/state' {
  interface ModuleStates {
    squad: SquadState;
  }
}

/** The starting squad: the prototype's initDefaultSquad(), made deterministic. */
export function createSquad(rng: Rng): SquadState {
  const players: Player[] = [];
  for (const [pos, count, min, max] of squadContent.startingSquad) {
    for (let i = 0; i < count; i++) {
      players.push(createPlayer(rng, pos, min, max));
    }
  }
  return { players, lineup: [], captainId: null };
}

/**
 * v2: `strength: number` became `attributes: {...}`, and strength is derived.
 */
export const SQUAD_VERSION = 2;

export function migrateSquad(old: unknown, fromVersion: number): SquadState {
  const base = old as { players?: unknown[]; lineup?: string[]; captainId?: string | null };
  const players = (base.players ?? []).map((raw) => {
    const p = raw as Record<string, unknown>;
    if (p.attributes) return p as unknown as Player;
    /*
     * A v1 player carried one number. Spreading it flat across the five keeps
     * their overall almost exactly where it was in their own position — the
     * weights sum to 1 — so a career loaded from v1 does not silently get
     * better or worse at the moment of upgrading.
     */
    const s = typeof p.strength === 'number' ? p.strength : 50;
    return { ...p, attributes: uniform(s) } as unknown as Player;
  });
  return {
    players,
    lineup: base.lineup ?? [],
    captainId: base.captainId ?? null
  };
}
