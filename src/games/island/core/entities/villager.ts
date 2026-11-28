import type { TilePoint } from '@/shared/engine/grid';
import type { WorldObject } from '../world/world';
import {
  createPlayer,
  hitboxAt,
  type Box,
  type Direction,
  type HitboxSize,
  type Player,
} from './player';

/** What a villager is up to (their day follows the clock: see `systems/routine.ts`). */
export type Activity =
  | 'wander'
  | 'bake'
  | 'water'
  | 'sweep'
  | 'fish'
  | 'read'
  | 'gather'
  /** A soak in the hot spring before the evening. */
  | 'soak'
  | 'owl'
  | 'home'
  /** Out of the rain under the market stall's awning. */
  | 'shelter';

/** Somewhere to be for an activity, and how to be there. */
export interface Errand {
  readonly goal: TilePoint;
  readonly facing: Direction;
  /** Sit on this bench on arrival. */
  readonly bench: WorldObject | null;
  /** Go indoors on arrival (home for the night). */
  readonly goInside: boolean;
}

/**
 * A villager walks and animates exactly like the player (same body, same
 * movement code), plus a little state for wandering inside the village.
 */
export interface Villager extends Player {
  readonly id: number;
  /** Which outfit (sprite strip) this villager wears. */
  readonly look: number;
  /** The only tiles this villager ever walks on (inside the village fence). */
  readonly home: ReadonlySet<number>;
  /** The same tiles as a list, for picking somewhere to go. */
  readonly homeTiles: readonly number[];
  /** Tiles still to walk through (centres), nearest first. */
  route: TilePoint[];
  /** Seconds left to stand around before picking somewhere new. */
  restTime: number;
  /** Seconds spent unable to move along the route (someone in the way). */
  stuckTime: number;
  /** Seconds to wait before trying a blocked way again. */
  pauseTime: number;
  /** Talking with the player: stands still, facing them. */
  talking: boolean;
  /** How many times the player has talked to them (their conversations take turns). */
  timesTalked: number;
  /** Who they are in the village's day (which schedule they follow). */
  readonly role: VillagerRole;
  /** Where they can walk on errands (any open path on the island, not just the village). */
  readonly roam: ReadonlySet<number>;
  /** Their front door (the tile in front of it): home at night. */
  readonly door: TilePoint;
  activity: Activity;
  /** Where the current activity happens (null: wandering the village). */
  errand: Errand | null;
  /** Arrived and doing it (sweeping, fishing, sitting...). */
  atErrand: boolean;
  /** Indoors for the night: not drawn, not solid, not talking. */
  hidden: boolean;
  /** Chatting with another villager (their id), for this many more seconds. */
  chat: { readonly partner: number; seconds: number } | null;
  /** A little speech bubble over their head (chatting, humming, waving), for this long. */
  bubble: { readonly kind: BubbleKind; seconds: number } | null;
  /** Seconds before the next chat, the next wave at the player, the next hum at a chore. */
  chatCooldown: number;
  waveCooldown: number;
  humIn: number;
  /** Walking pace against a stroll (1; more when hurrying out of the rain). */
  speedFactor: number;
}

/** What a villager's speech bubble shows. */
export type BubbleKind = 'dots' | 'smile' | 'note' | 'wave' | 'fish' | 'heart';

export type VillagerRole = 'baker' | 'keeper' | 'owl';

export function createVillager(
  id: number,
  look: number,
  spawn: TilePoint,
  homeTiles: readonly number[],
  tileSizePx: number,
  role: VillagerRole = 'keeper',
  roam: ReadonlySet<number> = new Set(homeTiles),
): Villager {
  return {
    ...createPlayer(spawn, tileSizePx),
    id,
    look,
    home: new Set(homeTiles),
    homeTiles,
    route: [],
    restTime: 1 + id,
    stuckTime: 0,
    pauseTime: 0,
    talking: false,
    timesTalked: 0,
    role,
    roam,
    door: spawn,
    activity: 'wander',
    errand: null,
    atErrand: false,
    hidden: false,
    chat: null,
    bubble: null,
    chatCooldown: 0,
    waveCooldown: 0,
    humIn: 5 + id * 3,
    speedFactor: 1,
  };
}

/** True if two feet hitboxes overlap. */
export function overlaps(a: Box, b: Box): boolean {
  return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
}

/** True if `body` at its current position overlaps any of `others` (bodies are feet hitboxes). */
export function bumpsInto(body: Player, others: readonly Player[], size: HitboxSize): boolean {
  const box = hitboxAt(body.x, body.y, size);
  return others.some((other) => other !== body && overlaps(box, hitboxAt(other.x, other.y, size)));
}
