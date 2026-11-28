import { distanceField, EIGHT_DIRECTIONS, toIndex } from '@/shared/engine/grid';
import { OBJECT_REGISTRY } from '../../world/objects';
import { isWalkableTile, TileId } from '../../world/tiles';
import { createStepRng, type GenerationContext, type GenerationStep } from '../context';
import { addObject, objectLayerWithout } from '../objectLayer';
import { distanceFromBusy, isClear, makesWay, reachedFromCabin } from '../quietSpots';

/** The pool (4×3) and its stone lantern just right of its far corner: a 5×3 patch. */
const POOL = OBJECT_REGISTRY.hot_spring.footprint;
const PATCH = { width: POOL.width + 1, height: POOL.height } as const;
/** A clear ring of walkable ground round the patch, so it never cuts anyone's way. */
const MARGIN = 1;
/** Trees within this many tiles of the pool make it cosy (they count towards its score). */
const TREE_RADIUS = 4;
/** More trees than this don't make it any cosier. */
const MAX_TREES = 8;
/** Each tile further from the nearest trail costs this much score (it should be findable). */
const TRAIL_COST = 0.3;
interface Spot {
  readonly x: number;
  readonly y: number;
  readonly score: number;
}

/** Every patch that fits, at least `gap` tiles from the village, the cottage and the workspace. */
function findSpots(context: GenerationContext, gap: number, ground: ReadonlySet<number>): Spot[] {
  const { size, terrain, objects, reserved } = context;
  const fromBusy = distanceFromBusy(context);
  const fromTrail = distanceField(size, (i) => terrain[i] === TileId.Path, EIGHT_DIRECTIONS);
  const reached = reachedFromCabin(context);
  const trees = objects.filter((o) => OBJECT_REGISTRY[o.kind].category === 'tree');

  const at = (x: number, y: number): number | null =>
    x < 0 || y < 0 || x >= size.width || y >= size.height ? null : toIndex(size, x, y);
  const fits = (left: number, top: number): boolean => {
    for (let y = top - MARGIN; y < top + PATCH.height + MARGIN; y++) {
      for (let x = left - MARGIN; x < left + PATCH.width + MARGIN; x++) {
        const i = at(x, y);
        if (i === null || !isClear(context, i) || (fromBusy[i] ?? 0) < gap) return false;
        const inPatch = x >= left && y >= top && x < left + PATCH.width && y < top + PATCH.height;
        // The pool and the lantern stand on open ground; under the lantern, the corner stays open.
        const underPool = inPatch && x < left + POOL.width;
        const lantern = x === left + POOL.width && y === top;
        if (underPool || lantern) {
          if (!ground.has(terrain[i] ?? 0) || reserved[i] === 1) return false;
        } else if (!isWalkableTile(terrain[i] ?? 0) || reached[i] !== 1) {
          // The ring (and the open corner): walkable and reachable from the cottage.
          return false;
        }
      }
    }
    return true;
  };

  const spots: Spot[] = [];
  for (let top = MARGIN; top + PATCH.height + MARGIN <= size.height; top++) {
    for (let left = MARGIN; left + PATCH.width + MARGIN <= size.width; left++) {
      if (!fits(left, top)) continue;
      const cx = left + POOL.width / 2;
      const cy = top + POOL.height / 2;
      const nearby = trees.filter((t) => Math.hypot(t.x + 1 - cx, t.y - cy) <= TREE_RADIUS + 2);
      const trail = fromTrail[toIndex(size, Math.floor(cx), Math.floor(cy))] ?? 0;
      const score = Math.min(MAX_TREES, nearby.length) - TRAIL_COST * Math.max(0, trail);
      spots.push({ x: left, y: top, score });
    }
  }
  return spots;
}

/**
 * The hot spring: a warm pool ringed with rocks, with a stone lantern beside it,
 * on quiet open grass away from the village and the houses, among trees where it
 * can (but not far from a trail, so it can be found). Runs after everything else
 * that places objects (only spawn comes later), so adding it moves nothing else;
 * only the meadow flowers and tufts under it are cleared. If no quiet spot fits,
 * it settles for a spot closer in, then for sand.
 */
export const placeHotSpring: GenerationStep = (context) => {
  const { minGapTiles, choices } = context.config.hotSpring;
  const grass = new Set<number>([TileId.Grass]);
  const grassOrSand = new Set<number>([TileId.Grass, TileId.Sand]);
  const attempts: readonly [number, ReadonlySet<number>][] = [
    [minGapTiles, grass],
    [Math.ceil(minGapTiles / 2), grass],
    [Math.ceil(minGapTiles / 2), grassOrSand],
  ];
  let spots: Spot[] = [];
  for (const [gap, ground] of attempts) {
    spots = findSpots(context, gap, ground);
    if (spots.length > 0) break;
  }
  if (spots.length === 0) return context;
  spots.sort((a, b) => b.score - a.score);
  const rng = createStepRng(context, 'placeHotSpring');
  const spot = rng.pick(spots.slice(0, choices));
  const inPatch = (x: number, y: number): boolean =>
    x >= spot.x && y >= spot.y && x < spot.x + PATCH.width && y < spot.y + PATCH.height;
  const layer = objectLayerWithout(context, (o) => makesWay(o) && inPatch(o.x, o.y));
  addObject(layer, 'hot_spring', spot.x, spot.y);
  addObject(layer, 'stone_lantern', spot.x + POOL.width, spot.y);
  return { ...context, objects: layer.objects, occupancy: layer.occupancy };
};
