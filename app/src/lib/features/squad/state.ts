import { z } from 'zod';
import type { Rng } from '$lib/engine/rng';
import { POSITIONS } from './positions';
import { squadContent } from './content';
import { createPlayer } from './rules';

export { POSITIONS, type Position } from './positions';

export const PlayerSchema = z.object({
  id: z.string(),
  name: z.string(),
  pos: z.enum(POSITIONS),
  strength: z.number().int().min(1).max(99),
  fitness: z.number().int().min(0).max(100),
  morale: z.number().int().min(0).max(100),
  age: z.number().int().min(15).max(45),
  marketValue: z.number().min(0),
  wage: z.number().min(0),
  trait: z.string(),
  /** Matchdays remaining. 0 = available. */
  injured: z.number().int().min(0),
  suspended: z.number().int().min(0),
  individualFocus: z.string()
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

export const SQUAD_VERSION = 1;
