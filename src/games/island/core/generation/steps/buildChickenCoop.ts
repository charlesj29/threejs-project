import { toIndex } from '@/shared/engine/grid';
import { isWalkableTile, TileId } from '../../world/tiles';
import { villageHouses, villageTiles } from '../../world/village';
import { getDoorFrontTile, type WorldObject } from '../../world/world';
import type { ObjectKind } from '../../world/objects';
import { createStepRng, type GenerationContext, type GenerationStep } from '../context';
import { addObject, objectLayerWithout } from '../objectLayer';
import { isClear, makesWay, reachedFromCabin, staysConnected } from '../quietSpots';

/** The run, fence included (tiles); the hen house stands in its top-left corner inside. */
export const CHICKEN_RUN = { width: 7, height: 5 } as const;
/** A clear ring of walkable ground round the fence, so the run never cuts anyone's way. */
const MARGIN = 1;
/** Among the few spots nearest the bakery (or the village's middle), one is picked at random. */
const NEAREST_CHOICES = 3;

/**
 * What else goes in and round the run (tiles from the run's top-left, fence included):
 *
 *     F F F F F F F
 *     F H H . . T F s     H: hen house (2×2)   T: feed trough   W: water dish
 *     F H H . . . F s     .: open ground       ~: a straw patch
 *     F . . ~ . W F s     G: the gate          s: sunflowers outside the fence
 *     F F F G F F F
 */
const GATE = { x: 3, y: CHICKEN_RUN.height - 1 } as const;
const PIECES: readonly { readonly kind: ObjectKind; readonly x: number; readonly y: number }[] = [
  { kind: 'chicken_coop', x: 1, y: 1 },
  { kind: 'feed_trough', x: 5, y: 1 },
  { kind: 'water_dish', x: 5, y: 3 },
  { kind: 'straw_patch', x: 3, y: 3 },
  { kind: 'sunflower', x: CHICKEN_RUN.width, y: 1 },
  { kind: 'sunflower', x: CHICKEN_RUN.width, y: 2 },
  { kind: 'sunflower', x: CHICKEN_RUN.width, y: 3 },
];

/**
 * The ways to try, in order: just outside the village on grass, then closer in, then sand too;
 * last, without the clear walkway all round (trees may stand by the fence), as long as the gate
 * can be reached and the run cuts nobody's way anywhere.
 */
interface Attempt {
  readonly villageGap: number;
  readonly ground: ReadonlySet<number>;
  readonly walkway: boolean;
}
const GRASS = new Set<number>([TileId.Grass]);
const GRASS_OR_SAND = new Set<number>([TileId.Grass, TileId.Sand]);
const ATTEMPTS: readonly Attempt[] = [
  { villageGap: 2, ground: GRASS, walkway: true },
  { villageGap: 1, ground: GRASS, walkway: true },
  { villageGap: 1, ground: GRASS_OR_SAND, walkway: true },
  { villageGap: 1, ground: GRASS_OR_SAND, walkway: false },
];
/** Without the walkway, only this many of the nearest spots are checked for cutting anyone off. */
const CONNECTED_CHECKS = 40;

interface Spot {
  readonly x: number;
  readonly y: number;
  readonly distance: number;
}

function findSpots(
  context: GenerationContext,
  anchor: { x: number; y: number },
  inVillage: ReadonlySet<number>,
  { villageGap, ground, walkway: needsWalkway }: Attempt,
  reached: Uint8Array,
): Spot[] {
  const { size, terrain } = context;
  const at = (x: number, y: number): number | null =>
    x < 0 || y < 0 || x >= size.width || y >= size.height ? null : toIndex(size, x, y);
  const nearVillage = (x: number, y: number): boolean => {
    for (let dy = -villageGap; dy <= villageGap; dy++) {
      for (let dx = -villageGap; dx <= villageGap; dx++) {
        const i = at(x + dx, y + dy);
        if (i !== null && inVillage.has(i)) return true;
      }
    }
    return false;
  };
  /** The pen's own tiles: open ground, off the paths, clear of the village. */
  const penTile = (x: number, y: number): boolean => {
    const i = at(x, y);
    return i !== null && ground.has(terrain[i] ?? 0) && isClear(context, i) && !nearVillage(x, y);
  };
  /** The ring round it: open, walkable ground. */
  const walkway = (x: number, y: number): boolean => {
    const i = at(x, y);
    return i !== null && isWalkableTile(terrain[i] ?? 0) && isClear(context, i);
  };
  const fits = (left: number, top: number): boolean => {
    for (let y = top - MARGIN; y < top + CHICKEN_RUN.height + MARGIN; y++) {
      for (let x = left - MARGIN; x < left + CHICKEN_RUN.width + MARGIN; x++) {
        const ring =
          x < left || y < top || x >= left + CHICKEN_RUN.width || y >= top + CHICKEN_RUN.height;
        if (ring ? needsWalkway && !walkway(x, y) : !penTile(x, y)) return false;
      }
    }
    // Without the walkway, at least the way up to the gate is open.
    const gateFront = at(left + GATE.x, top + GATE.y + 1);
    return (
      needsWalkway ||
      (gateFront !== null && walkway(left + GATE.x, top + GATE.y + 1) && reached[gateFront] === 1)
    );
  };
  const spots: Spot[] = [];
  for (let top = MARGIN; top + CHICKEN_RUN.height + MARGIN <= size.height; top++) {
    for (let left = MARGIN; left + CHICKEN_RUN.width + MARGIN <= size.width; left++) {
      if (!fits(left, top)) continue;
      const cx = left + CHICKEN_RUN.width / 2;
      const cy = top + CHICKEN_RUN.height / 2;
      spots.push({ x: left, y: top, distance: Math.hypot(cx - anchor.x, cy - anchor.y) });
    }
  }
  return spots;
}

/**
 * A chicken run near the village: a fenced pen with a gate, a little hen house,
 * a feed trough, a water dish and a straw patch, with sunflowers along the
 * outside of the fence; on open grass just outside the village (off the paths,
 * with a clear walkway all round), as near the bakery as there is room. If no
 * spot fits, it tries closer to the village, then on sand too, then without the
 * walkway (as long as the run cuts nobody off), so every island has one. Runs after everything else that places objects (only the quiet
 * places and the spawn come later), so adding it moves nothing else; only the
 * meadow flowers and tufts where it stands are cleared.
 */
export const buildChickenCoop: GenerationStep = (context) => {
  const { size, village, config } = context;
  if (!village || !config.village.chickenCoop) return context;
  const inside = villageTiles(village, size);
  const insideSet = new Set(inside);
  const bakery = villageHouses({ objects: context.objects }).find((h) => h.kind === 'house_bakery');
  const anchor = bakery
    ? getDoorFrontTile(bakery)
    : {
        x: Math.round(inside.reduce((s, t) => s + (t % size.width), 0) / inside.length),
        y: Math.round(inside.reduce((s, t) => s + Math.floor(t / size.width), 0) / inside.length),
      };
  const reached = reachedFromCabin(context);
  let spots: Spot[] = [];
  for (const attempt of ATTEMPTS) {
    spots = findSpots(context, anchor, insideSet, attempt, reached);
    spots.sort((a, b) => a.distance - b.distance);
    if (!attempt.walkway) {
      // No walkway all round: keep only runs that close nobody's way off.
      spots = spots
        .slice(0, CONNECTED_CHECKS)
        .filter((s) => staysConnected(context, reached, runTiles(context, s)));
    }
    if (spots.length > 0) break;
  }
  if (spots.length === 0) return context;
  const rng = createStepRng(context, 'buildChickenCoop');
  const spot = rng.pick(spots.slice(0, NEAREST_CHOICES));
  const taken = new Set(PIECES.map((p) => `${String(spot.x + p.x)},${String(spot.y + p.y)}`));
  const inPen = (o: WorldObject): boolean =>
    o.x >= spot.x &&
    o.y >= spot.y &&
    o.x < spot.x + CHICKEN_RUN.width &&
    o.y < spot.y + CHICKEN_RUN.height;
  const layer = objectLayerWithout(
    context,
    (o) => makesWay(o) && (inPen(o) || taken.has(`${String(o.x)},${String(o.y)}`)),
  );
  // The fence all round (with the gate in the front), then everything in and round the run.
  for (let y = spot.y; y < spot.y + CHICKEN_RUN.height; y++) {
    for (let x = spot.x; x < spot.x + CHICKEN_RUN.width; x++) {
      const edge =
        x === spot.x ||
        y === spot.y ||
        x === spot.x + CHICKEN_RUN.width - 1 ||
        y === spot.y + CHICKEN_RUN.height - 1;
      if (!edge) continue;
      const gate = x === spot.x + GATE.x && y === spot.y + GATE.y;
      addObject(layer, gate ? 'fence_gate' : 'fence', x, y);
    }
  }
  for (const piece of PIECES) {
    const x = spot.x + piece.x;
    const y = spot.y + piece.y;
    // Sunflowers only on open grass or sand (not a trail; there may be trees by the fence).
    const i = toIndex(size, x, y);
    const open = GRASS_OR_SAND.has(context.terrain[i] ?? 0) && isClear(context, i);
    if (piece.kind === 'sunflower' && !open) continue;
    addObject(layer, piece.kind, x, y);
  }
  return { ...context, objects: layer.objects, occupancy: layer.occupancy };
};

/** The run's tiles (fence included). */
function runTiles(context: GenerationContext, spot: { x: number; y: number }): Set<number> {
  const tiles = new Set<number>();
  for (let y = spot.y; y < spot.y + CHICKEN_RUN.height; y++) {
    for (let x = spot.x; x < spot.x + CHICKEN_RUN.width; x++)
      tiles.add(toIndex(context.size, x, y));
  }
  return tiles;
}
