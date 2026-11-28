import type { TilePoint } from '@/shared/engine/grid';

export type Direction = 'down' | 'up' | 'left' | 'right';

export const DIRECTIONS: readonly Direction[] = ['down', 'up', 'left', 'right'];

/**
 * The player: a plain mutable object updated by the fixed-step loop (never
 * React state). Positions are in map pixels (y down) and mark the centre of
 * the feet hitbox.
 */
export interface Player {
  x: number;
  y: number;
  /** Position at the previous logic step, for render interpolation. */
  previousX: number;
  previousY: number;
  facing: Direction;
  moving: boolean;
  running: boolean;
  /** Pixels walked since the player last stood still (drives the walk / run cycle). */
  strideDistance: number;
  /** Seconds spent standing still (drives the idle breathing). */
  idleTime: number;
  /** Steps taken so far (a foot touches down twice per walk cycle): footstep sounds count these. */
  footfalls: number;
  /** Sitting on a bench (or soaking in the hot spring): where to stand up again, or null. */
  sitting: { readonly standX: number; readonly standY: number; readonly soaking: boolean } | null;
}

export interface Box {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

export interface HitboxSize {
  readonly hitboxWidthPx: number;
  readonly hitboxHeightPx: number;
}

/** The player starts standing in the middle of the spawn tile, facing down (towards the viewer). */
export function createPlayer(spawn: TilePoint, tileSizePx: number): Player {
  const x = (spawn.x + 0.5) * tileSizePx;
  const y = (spawn.y + 0.5) * tileSizePx;
  return {
    x,
    y,
    previousX: x,
    previousY: y,
    facing: 'down',
    moving: false,
    running: false,
    strideDistance: 0,
    idleTime: 0,
    footfalls: 0,
    sitting: null,
  };
}

/** The feet hitbox centred on (x, y). */
export function hitboxAt(x: number, y: number, size: HitboxSize): Box {
  const halfWidth = size.hitboxWidthPx / 2;
  const halfHeight = size.hitboxHeightPx / 2;
  return { left: x - halfWidth, top: y - halfHeight, right: x + halfWidth, bottom: y + halfHeight };
}

/** Map-pixel y of the bottom of the feet: what depth sorting compares against other sprites. */
export function playerFootY(y: number, size: HitboxSize): number {
  return y + size.hitboxHeightPx / 2;
}
