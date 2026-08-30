import { z } from 'zod';
import { hashString, type Rng } from '$lib/engine/rng';
import { POSITIONS } from './positions';
import { AttributesSchema, FOCUS } from './attributes';
import { squadContent } from './content';
import { createPlayer, strengthOf } from './rules';
import { EMPTY_RECORD } from '$lib/content/talents';
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
  individualFocus: z.enum(FOCUS),
  /**
   * What he has done, so a talent can test a CHANGE rather than a level.
   *
   * `debutStrength` is the load-bearing field: nothing else in `Player`
   * remembers what he used to be, so "gained twenty-five points since he
   * arrived" is inexpressible without it. Written once when he first enters
   * the game — generated, signed or graduated — and never again.
   *
   * On the player rather than in a `Record<playerId, …>` inside the talents
   * module, for the same reason as his contract and his training focus: it is
   * a fact ABOUT him. It moves with him when he is sold and disappears when he
   * retires, where a keyed map would leave an entry behind for everyone who
   * ever left.
   */
  record: z.object({
    debutAge: z.number().int().min(0),
    debutStrength: z.number().int().min(0),
    seasonsHere: z.number().int().min(0),
    matches: z.number().int().min(0),
    goals: z.number().int().min(0),
    cleanSheets: z.number().int().min(0),
    injuries: z.number().int().min(0)
  }),
  /**
   * Matchdays left on the current deal. 0 means out of contract — the player
   * leaves for nothing at the next `contracts` week tick.
   *
   * Lives on the player, not in a lookup inside `contracts`, for the same
   * reason `individualFocus` lives here rather than in `training`: a contract
   * is a fact ABOUT a player. It belongs to them, moves with them when they
   * are sold, and disappears when they retire — a `Record<playerId, Contract>`
   * would leave one entry behind for every player who ever left, forever, and
   * give two systems a chance to disagree about the same fact. See the note
   * beside `FOCUS` in attributes.ts.
   */
  contractMatchdays: z.number().int().min(0)
});
export type Player = z.infer<typeof PlayerSchema>;

export const SquadSchema = z.object({
  players: z.array(PlayerSchema),
  /**
   * Every `einmalig` talent this CAREER has ever handed out.
   *
   * Career-level, never squad-level, and it never shrinks. Selling a player
   * does not un-have him: the club had its Jahrhunderttalent. Tracking it per
   * squad would let the same once-in-a-lifetime name be farmed by cycling
   * players through, which is the joke telling itself twice.
   */
  awardedTalents: z.array(z.string()),
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
  return { players, lineup: [], captainId: null, awardedTalents: [] };
}

/**
 * v3: every player carries a contract (`contractMatchdays`). v2: `strength:
 * number` became `attributes: {...}`, and strength is derived.
 */
/** v4: every player carries the record a talent is earned against. */
export const SQUAD_VERSION = 4;

/**
 * A deterministic stand-in for "how much contract is left", for a save that
 * predates contracts entirely.
 *
 * `migrate` gets no `rng` — only `old` and `fromVersion` — so a fixed default
 * for every player would give an entire legacy squad the exact same expiry
 * matchday. That would make every contract in an old career come due at once,
 * which is a bug this migration can prevent for free: hash the player's own
 * id into the same range `createPlayer` draws from, so the spread looks like
 * it always looked this way without needing a random source at all.
 */
function migratedContract(playerId: string): number {
  const { min, max } = squadContent.initialContract;
  return min + (hashString(playerId) % (max - min + 1));
}

export function migrateSquad(old: unknown, fromVersion: number): SquadState {
  const base = old as { players?: unknown[]; lineup?: string[]; captainId?: string | null };
  const players = (base.players ?? []).map((raw) => {
    const p = raw as Record<string, unknown>;
    const withAttributes: Record<string, unknown> = p.attributes
      ? p
      : /*
         * A v1 player carried one number. Spreading it flat across the five
         * keeps their overall almost exactly where it was in their own
         * position — the weights sum to 1 — so a career loaded from v1 does
         * not silently get better or worse at the moment of upgrading.
         */
        { ...p, attributes: uniform(typeof p.strength === 'number' ? p.strength : 50) };

    const id = typeof withAttributes.id === 'string' ? withAttributes.id : 'unknown';
    const player = {
      ...withAttributes,
      contractMatchdays:
        typeof withAttributes.contractMatchdays === 'number'
          ? withAttributes.contractMatchdays
          : migratedContract(id)
    } as unknown as Player;

    /*
     * An old save cannot say what a player used to be, so his debut is taken as
     * where he is NOW. That deliberately under-awards: a veteran who improved
     * twenty points before the upgrade reads as having improved none, and will
     * not be handed a Jahrhunderttalent for a career this save never recorded.
     * Awarding one on no evidence would be worse than awarding none.
     */
    if (!player.record) {
      player.record = {
        ...EMPTY_RECORD,
        debutAge: player.age,
        debutStrength: strengthOf(player)
      };
    }
    return player;
  });
  return {
    players,
    lineup: base.lineup ?? [],
    captainId: base.captainId ?? null,
    awardedTalents: (base as { awardedTalents?: string[] }).awardedTalents ?? []
  };
}
