import { distanceField, EIGHT_DIRECTIONS, toIndex } from '@/shared/engine/grid';
import type { ObjectKind } from '../../world/objects';
import { getTileDefinition, isWalkableTile, TileId } from '../../world/tiles';
import { villageTiles } from '../../world/village';
import { createStepRng, type GenerationContext, type GenerationStep } from '../context';
import { addObject, objectLayerWithout } from '../objectLayer';
import { distanceFromBusy, isClear, makesWay, reachedFromCabin } from '../quietSpots';

/**
 * The campfire and its seats, in a 4×4 patch (tiles from its top-left):
 *
 *     . L L .     L: the log seat, facing the viewer (people sit on it facing the fire)
 *     . . . .     (the log's sitters' feet; open)
 *     R F F l     R / l: stools facing right / left, at the fire's sides
 *     . F F .     F: the fire ring (2×2)
 *
 * The open tiles stay walkable: people stand there before sitting down.
 */
export const CAMPFIRE_PATCH = { width: 4, height: 4 } as const;
const PIECES: readonly { readonly kind: ObjectKind; readonly x: number; readonly y: number }[] = [
  { kind: 'log_bench', x: 1, y: 0 },
  { kind: 'log_stool_right', x: 0, y: 2 },
  { kind: 'campfire', x: 1, y: 2 },
  { kind: 'log_stool_left', x: 3, y: 2 },
];
/** The fire ring's tiles in the patch. */
const FIRE = { x: 1, y: 2, width: 2, height: 2 } as const;
/** Tiles taken by a seat. */
const SEAT_TILES = new Set(['1,0', '2,0', '0,2', '3,2']);
/** A clear ring of walkable ground round the patch, so it never cuts anyone's way. */
const MARGIN = 1;
/** By the beach: at least this much sand in the patch or right beside it, so it joins the beach. */
const MIN_BEACH_TILES = 3;
/** A clearing away from the beach gets a sandy strip to it, up to this long. */
const MAX_STRIP_TILES = 8;
/** What the fire may stand on (the patch becomes sand). */
const LAND = new Set<number>([TileId.Sand, TileId.Grass]);

interface Spot {
  readonly x: number;
  readonly y: number;
  /** Steps to the village: the nearer, the better (villagers walk there in the evening). */
  readonly distance: number;
}

function findSpots(context: GenerationContext, maxSeaTiles: number, byTheBeach: boolean): Spot[] {
  const { size, terrain, config } = context;
  const fromBusy = distanceFromBusy(context, ['hot_spring', 'stone_lantern']);
  const fromSea = distanceField(
    size,
    (i) => getTileDefinition(terrain[i] ?? 0).waterBody === 'sea',
    EIGHT_DIRECTIONS,
  );
  const village = new Set(context.village ? villageTiles(context.village, size) : []);
  const fromVillage = distanceField(size, (i) => village.has(i), EIGHT_DIRECTIONS);
  const reached = reachedFromCabin(context);
  const gap = config.campfire.minGapTiles;
  const at = (x: number, y: number): number | null =>
    x < 0 || y < 0 || x >= size.width || y >= size.height ? null : toIndex(size, x, y);

  const fits = (left: number, top: number): boolean => {
    for (let y = top - MARGIN; y < top + CAMPFIRE_PATCH.height + MARGIN; y++) {
      for (let x = left - MARGIN; x < left + CAMPFIRE_PATCH.width + MARGIN; x++) {
        const i = at(x, y);
        if (i === null || !isClear(context, i) || (fromBusy[i] ?? 0) < gap) return false;
        const dx = x - left;
        const dy = y - top;
        const tile = terrain[i] ?? 0;
        const fire =
          dx >= FIRE.x && dx < FIRE.x + FIRE.width && dy >= FIRE.y && dy < FIRE.y + FIRE.height;
        if (fire) {
          // The fire on open land (sand or grass, not a trail), close to the sea.
          if (!LAND.has(tile) || (fromSea[i] ?? 0) > maxSeaTiles) return false;
        } else if (SEAT_TILES.has(`${String(dx)},${String(dy)}`)) {
          if (!isWalkableTile(tile) || context.reserved[i] === 1) return false;
        } else if (!isWalkableTile(tile) || reached[i] !== 1) {
          // Open ground in and round the patch: walkable, and reachable from the cottage.
          return false;
        }
      }
    }
    return true;
  };

  /** How much beach the patch takes in: sand in it or right beside it (not round a corner). */
  const beachTiles = (left: number, top: number): number => {
    let count = 0;
    for (let y = top - 1; y <= top + CAMPFIRE_PATCH.height; y++) {
      for (let x = left - 1; x <= left + CAMPFIRE_PATCH.width; x++) {
        const outsideX = x < left || x >= left + CAMPFIRE_PATCH.width;
        const outsideY = y < top || y >= top + CAMPFIRE_PATCH.height;
        if (outsideX && outsideY) continue;
        const i = at(x, y);
        if (i !== null && terrain[i] === TileId.Sand) count += 1;
      }
    }
    return count;
  };

  const spots: Spot[] = [];
  for (let top = MARGIN; top + CAMPFIRE_PATCH.height + MARGIN <= size.height; top++) {
    for (let left = MARGIN; left + CAMPFIRE_PATCH.width + MARGIN <= size.width; left++) {
      if (!fits(left, top)) continue;
      if (byTheBeach && beachTiles(left, top) < MIN_BEACH_TILES) continue;
      const middle = toIndex(size, left + FIRE.x, top + FIRE.y);
      const steps = fromVillage[middle] ?? -1;
      spots.push({ x: left, y: top, distance: steps < 0 ? Infinity : steps });
    }
  }
  return spots;
}

/**
 * The beach campfire: a ring of stones with a log seat and two stools round it,
 * at the shore (a few tiles from the sea, touching the beach), as near the
 * village as there is room (the villagers gather there some evenings). Its
 * patch becomes a sandy clearing that runs into the beach. Runs after the hot
 * spring, just before the spawn, so adding it moves nothing else; only meadow
 * decorations under it are cleared. With no room by the beach it moves inland.
 */
export const placeCampfire: GenerationStep = (context) => {
  const { maxSeaTiles, choices } = context.config.campfire;
  const attempts: readonly [number, boolean][] = [
    [maxSeaTiles, true],
    [maxSeaTiles * 2, true],
    [Infinity, false],
  ];
  let spots: Spot[] = [];
  for (const [sea, byTheBeach] of attempts) {
    spots = findSpots(context, sea, byTheBeach);
    if (spots.length > 0) break;
  }
  if (spots.length === 0) return context;
  spots.sort((a, b) => a.distance - b.distance);
  const rng = createStepRng(context, 'placeCampfire');
  const spot = rng.pick(spots.slice(0, choices));
  const inPatch = (x: number, y: number): boolean =>
    x >= spot.x &&
    y >= spot.y &&
    x < spot.x + CAMPFIRE_PATCH.width &&
    y < spot.y + CAMPFIRE_PATCH.height;
  const layer = objectLayerWithout(context, (o) => makesWay(o) && inPatch(o.x, o.y));
  for (const piece of PIECES) addObject(layer, piece.kind, spot.x + piece.x, spot.y + piece.y);
  // A sandy clearing under it all (trails stay trails), joined to the beach.
  const terrain = context.terrain.slice();
  const patch: number[] = [];
  for (let y = spot.y; y < spot.y + CAMPFIRE_PATCH.height; y++) {
    for (let x = spot.x; x < spot.x + CAMPFIRE_PATCH.width; x++)
      patch.push(toIndex(context.size, x, y));
  }
  for (const i of sandStripToBeach(context, patch)) terrain[i] = TileId.Sand;
  for (const i of patch) if (terrain[i] === TileId.Grass) terrain[i] = TileId.Sand;
  return { ...context, terrain, objects: layer.objects, occupancy: layer.occupancy };
};

/**
 * The grass tiles between the patch and the nearest beach (the shortest way,
 * edge to edge, over open grass): empty if the patch already touches the beach
 * or the beach is further than `MAX_STRIP_TILES`.
 */
function sandStripToBeach(context: GenerationContext, patch: readonly number[]): number[] {
  const { size, terrain } = context;
  const inPatch = new Set(patch);
  const cameFrom = new Map<number, number>(patch.map((i) => [i, -1]));
  let frontier = [...patch];
  for (let steps = 0; steps <= MAX_STRIP_TILES && frontier.length > 0; steps++) {
    const next: number[] = [];
    for (const i of frontier) {
      for (const n of edgeNeighbours(size, i)) {
        if (cameFrom.has(n)) continue;
        cameFrom.set(n, i);
        if (terrain[n] === TileId.Sand && !inPatch.has(n)) {
          // Walk back to the patch: those grass tiles become the strip.
          const strip: number[] = [];
          for (
            let at = cameFrom.get(n) ?? -1;
            at !== -1 && !inPatch.has(at);
            at = cameFrom.get(at) ?? -1
          ) {
            strip.push(at);
          }
          return strip;
        }
        if (terrain[n] === TileId.Grass && isClear(context, n)) next.push(n);
      }
    }
    frontier = next;
  }
  return [];
}

function edgeNeighbours(size: { width: number; height: number }, i: number): number[] {
  const x = i % size.width;
  const y = Math.floor(i / size.width);
  const out: number[] = [];
  if (x > 0) out.push(i - 1);
  if (x < size.width - 1) out.push(i + 1);
  if (y > 0) out.push(i - size.width);
  if (y < size.height - 1) out.push(i + size.width);
  return out;
}
