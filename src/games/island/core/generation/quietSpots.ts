// Helpers for placing the island's quiet places (the hot spring, the campfire)
// late in generation: what may make way for them, how far every tile is from
// the busy parts of the island, and what can be walked to from the cottage.
import { distanceField, EIGHT_DIRECTIONS, floodFill, toIndex } from '@/shared/engine/grid';
import { computeBlockedMask } from '../world/collision';
import { OBJECT_REGISTRY, type ObjectKind } from '../world/objects';
import { villageTiles } from '../world/village';
import { getDoorFrontTile, NO_OBJECT, type WorldObject } from '../world/world';
import type { GenerationContext } from './context';

/** Meadow decorations (flowers, grass tufts, fallen branches) give way to a new place. */
const SOFT = new Set(['flower', 'grass', 'ground']);

/** A meadow decoration you can walk over: it may be cleared to make room. */
export function makesWay(object: WorldObject): boolean {
  const definition = OBJECT_REGISTRY[object.kind];
  return SOFT.has(definition.category) && !definition.blocksMovement;
}

/** Nothing on the tile, or only something that makes way. */
export function isClear(context: GenerationContext, index: number): boolean {
  const id = context.occupancy[index] ?? NO_OBJECT;
  const object = id === NO_OBJECT ? undefined : context.objects[id];
  return !object || makesWay(object);
}

/**
 * Steps (8-way) from every tile to the village, the buildings, and any object
 * of the `also` kinds (other quiet places to keep apart from).
 */
export function distanceFromBusy(
  context: GenerationContext,
  also: readonly ObjectKind[] = [],
): Int32Array {
  const { size, objects } = context;
  const busy = new Set(context.village ? villageTiles(context.village, size) : []);
  for (const o of objects) {
    const definition = OBJECT_REGISTRY[o.kind];
    if (definition.category !== 'building' && !also.includes(o.kind)) continue;
    for (let dy = 0; dy < definition.footprint.height; dy++) {
      for (let dx = 0; dx < definition.footprint.width; dx++) {
        busy.add(toIndex(size, o.x + dx, o.y + dy));
      }
    }
  }
  return distanceField(size, (i) => busy.has(i), EIGHT_DIRECTIONS);
}

/** 1 for every tile that can be walked to from the cottage door (as things stand now). */
export function reachedFromCabin(context: GenerationContext): Uint8Array {
  const { size, terrain, objects } = context;
  const blocked = computeBlockedMask(size, terrain, objects);
  const door = context.cabin ? getDoorFrontTile(context.cabin) : null;
  return door
    ? floodFill(size, [toIndex(size, door.x, door.y)], (i) => blocked[i] === 0)
    : new Uint8Array(terrain.length);
}
