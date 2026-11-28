// What the island sounds like where you are: surf louder near the sea, birds
// by day, crickets at night, rain in a shower, the crackle of a fire when
// you're in a room with one, and the hot spring bubbling as you come near. Indoors, the outside is muffled. Pure: the UI
// samples this now and then and hands the levels to the audio.
import { distanceField, EIGHT_DIRECTIONS } from '@/shared/engine/grid';
import type { IslandConfig } from '../config';
import { getTileDefinition, TileId } from '../world/tiles';
import { villageTiles } from '../world/village';
import type { World } from '../world/world';

/** 0..1 per sound layer (the same layers as the audio's). */
export interface SoundscapeLevels {
  readonly waves: number;
  readonly birds: number;
  readonly crickets: number;
  readonly rain: number;
  readonly fire: number;
  /** Wind chimes round the village (day and night). */
  readonly chimes: number;
  /** A soft murmur of voices in the village (by day). */
  readonly chatter: number;
  /** Footsteps and the bell are short sounds: how loud they come through here. */
  readonly steps: number;
  readonly bell: number;
  /** The guitar at the evening gathering, louder as you get near the player. */
  readonly guitar: number;
  /** The hot spring, louder as you get near it. */
  readonly spring: number;
}

/** Steps (8-way) from every tile to the sea, and to the village. */
export interface Distances {
  readonly sea: Int32Array;
  readonly village: Int32Array;
}

/** What a footstep sounds like on the ground underfoot. */
export type Ground = 'path' | 'grass' | 'sand' | 'wood';

const GROUND_BY_TILE: Readonly<Partial<Record<number, Ground>>> = {
  [TileId.Path]: 'path',
  [TileId.Grass]: 'grass',
  [TileId.Sand]: 'sand',
  [TileId.Dock]: 'wood',
  [TileId.Floor]: 'wood',
  [TileId.Doormat]: 'grass',
};

export function groundAt(world: World, x: number, y: number, tileSizePx: number): Ground {
  const tx = Math.floor(x / tileSizePx);
  const ty = Math.floor(y / tileSizePx);
  if (tx < 0 || ty < 0 || tx >= world.width || ty >= world.height) return 'grass';
  return GROUND_BY_TILE[world.terrain[ty * world.width + tx] ?? 0] ?? 'grass';
}

/** Steps from every tile to the village (none without one: everything far away). */
export function villageDistances(world: World): Int32Array {
  const village = new Set(world.village ? villageTiles(world.village, world) : []);
  return distanceField(world, (index) => village.has(index), EIGHT_DIRECTIONS);
}

export interface Listener {
  /** The map you're on, and where you hear from (map pixels). */
  readonly world: World;
  readonly x: number;
  readonly y: number;
}

/** A small fireplace sounds a little quieter than the cottage's big one. */
const FIRE_LOUDNESS: Readonly<Record<string, number>> = { fireplace: 1, fireplace_small: 0.7 };
/** Across a room, a fire is still this loud. */
const FIRE_FLOOR = 0.3;
/** Fading out over this many tiles beyond `fireNearTiles`. */
const FIRE_FADE_TILES = 6;
/** Rain on the roof is louder than other outside sounds through the walls. */
const ROOF_RAIN = 2;

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));
/** Full within `nearTiles`, gone by `farTiles`. */
const fadeByTiles = (tiles: number, range: { nearTiles: number; farTiles: number }): number =>
  clamp01(1 - (tiles - range.nearTiles) / (range.farTiles - range.nearTiles));

/** Steps (8-way) from every tile to the nearest sea tile. */
export function seaDistances(world: World): Int32Array {
  return distanceField(
    world,
    (index) => getTileDefinition(world.terrain[index] ?? 0).waterBody === 'sea',
    EIGHT_DIRECTIONS,
  );
}

function fireLevel(
  listener: Listener,
  settings: IslandConfig['ambience'],
  tileSizePx: number,
): number {
  let level = 0;
  for (const object of listener.world.objects) {
    const loudness = FIRE_LOUDNESS[object.kind];
    if (loudness === undefined) continue;
    const dx = (object.x + 1) * tileSizePx - listener.x;
    const dy = (object.y + 0.5) * tileSizePx - listener.y;
    const tiles = Math.hypot(dx, dy) / tileSizePx;
    const fade = clamp01(1 - (tiles - settings.fireNearTiles) / FIRE_FADE_TILES);
    level = Math.max(level, loudness * (FIRE_FLOOR + (1 - FIRE_FLOOR) * fade));
  }
  return level;
}

/** The hot spring, by how far the listener is from the middle of the pool. */
function springLevel(
  listener: Listener,
  settings: IslandConfig['ambience'],
  tileSizePx: number,
): number {
  const spring = listener.world.objects.find((object) => object.kind === 'hot_spring');
  if (!spring) return 0;
  const dx = (spring.x + 2) * tileSizePx - listener.x;
  const dy = (spring.y + 1.5) * tileSizePx - listener.y;
  return fadeByTiles(Math.hypot(dx, dy) / tileSizePx, settings.spring);
}

/**
 * The mix for a listener. `night` is 0 (day) .. 1 (night), `rain` the
 * shower's intensity; `seaDistance` comes from `seaDistances` of the island.
 */
export function soundscapeLevels(
  listener: Listener,
  night: number,
  rain: number,
  distances: Distances,
  settings: IslandConfig['ambience'],
  tileSizePx: number,
  musician: { readonly x: number; readonly y: number } | null = null,
): SoundscapeLevels {
  const day = 1 - night;
  const birds = day * (1 - rain);
  const crickets = night * (1 - 0.7 * rain);
  if (listener.world.indoor) {
    const damp = settings.indoorDamping;
    return {
      waves: settings.waves.floor * damp,
      birds: birds * damp,
      crickets: crickets * damp,
      rain: clamp01(rain * damp * ROOF_RAIN),
      fire: fireLevel(listener, settings, tileSizePx),
      chimes: 0,
      chatter: 0,
      steps: 1,
      bell: damp,
      guitar: 0,
      spring: 0,
    };
  }
  const tx = Math.floor(listener.x / tileSizePx);
  const ty = Math.floor(listener.y / tileSizePx);
  const inside = tx >= 0 && ty >= 0 && tx < listener.world.width && ty < listener.world.height;
  const at = (field: Int32Array): number =>
    inside ? (field[ty * listener.world.width + tx] ?? 0) : Infinity;
  const fade = (steps: number, range: { nearTiles: number; farTiles: number }): number =>
    steps < 0 ? 0 : clamp01(1 - (steps - range.nearTiles) / (range.farTiles - range.nearTiles));
  const { floor } = settings.waves;
  const village = fade(at(distances.village), settings.village);
  return {
    waves: floor + (1 - floor) * fade(at(distances.sea), settings.waves),
    birds,
    crickets,
    rain,
    fire: 0,
    chimes: village * (1 - 0.5 * rain),
    chatter: village * day * (1 - rain),
    steps: 1,
    bell: 1,
    guitar: musician
      ? fadeByTiles(
          Math.hypot(musician.x - listener.x, musician.y - listener.y) / tileSizePx,
          settings.guitar,
        )
      : 0,
    spring: springLevel(listener, settings, tileSizePx),
  };
}
