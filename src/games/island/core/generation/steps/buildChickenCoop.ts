import { distanceField, EIGHT_DIRECTIONS, toIndex } from '@/shared/engine/grid';
import { OBJECT_REGISTRY, type ObjectCategory, type ObjectKind } from '../../world/objects';
import { isWalkableTile, TileId } from '../../world/tiles';
import { villageHouses, villageTiles } from '../../world/village';
import { getDoorFrontTile, NO_OBJECT, type WorldObject } from '../../world/world';
import { createStepRng, type GenerationContext, type GenerationStep } from '../context';
import { addObject, objectLayerWithout } from '../objectLayer';
import { reachedFromCabin, staysConnected } from '../quietSpots';

interface Piece {
  readonly kind: ObjectKind;
  readonly x: number;
  readonly y: number;
}

/**
 * The run is an L (tiles from its top-left): F fence, G the gate, . inside, a
 * space outside. The hen house always stands in the top-left corner inside;
 * the L's cut corner is at the bottom right, or (mirrored) the bottom left.
 *
 *     F F F F F F F            F F F F F F F
 *     F H H . . T F            F H H . . T F    H: hen house (2×2)
 *     F H H . . . F            F H H . . . F    T: feed trough
 *     F . . . . W F            F . . . . W F    W: water dish
 *     F ~ . . F F F            F F F ~ . . F    ~: a straw patch
 *     F . . . F                    F . . . F
 *     F F G F F                    F F G F F
 */
export const RUN_LAYOUTS: readonly {
  readonly rows: readonly string[];
  readonly pieces: readonly Piece[];
}[] = [
  {
    rows: ['FFFFFFF', 'F.....F', 'F.....F', 'F.....F', 'F...FFF', 'F...F  ', 'FFGFF  '],
    pieces: [
      { kind: 'chicken_coop', x: 1, y: 1 },
      { kind: 'feed_trough', x: 5, y: 1 },
      { kind: 'water_dish', x: 5, y: 3 },
      { kind: 'straw_patch', x: 1, y: 4 },
    ],
  },
  {
    rows: ['FFFFFFF', 'F.....F', 'F.....F', 'F.....F', 'FFF...F', '  F...F', '  FFGFF'],
    pieces: [
      { kind: 'chicken_coop', x: 1, y: 1 },
      { kind: 'feed_trough', x: 5, y: 1 },
      { kind: 'water_dish', x: 5, y: 3 },
      { kind: 'straw_patch', x: 3, y: 4 },
    ],
  },
];
/** The run's bounding box (tiles), the same for every layout. */
export const CHICKEN_RUN = { width: 7, height: 7 } as const;
/** A clear ring of walkable ground round the fence, so the run never cuts anyone's way. */
const MARGIN = 1;
/** Among the few best spots, one is picked at random. */
const BEST_CHOICES = 3;
/** "Near the village": the run's nearest tile within this many steps of it (preferred). */
const NEAR_VILLAGE_TILES = 3;
/** Each tree, bush or rock the glade would clear counts like this many tiles further away. */
const CLEARING_COST = 2;
/** Only this many of the best spots are checked for cutting anyone off. */
const CONNECTED_CHECKS = 40;
/** Nature makes way for the run (it clears a little glade); anything people built never does. */
const NATURAL: ReadonlySet<ObjectCategory> = new Set([
  'tree',
  'bush',
  'rock',
  'deadwood',
  'flower',
  'grass',
  'ground',
]);
/** The run stands on open land: grass or sand (never a trail, never water). */
const LAND = new Set<number>([TileId.Grass, TileId.Sand]);

type Layout = (typeof RUN_LAYOUTS)[number];

/** What a tile of a layout is: 'F', 'G', '.' or ' ' (outside). */
const cellAt = (layout: Layout, dx: number, dy: number): string => layout.rows[dy]?.[dx] ?? ' ';

/** The gate of a layout, from the run's top-left. */
function gateOf(layout: Layout): { x: number; y: number } {
  const y = layout.rows.findIndex((row) => row.includes('G'));
  return { x: layout.rows[y]?.indexOf('G') ?? 0, y };
}

interface Spot {
  readonly x: number;
  readonly y: number;
  readonly layout: Layout;
  /** Lower is better: the walk from the bakery, plus what the glade would clear. */
  readonly score: number;
  readonly near: boolean;
}

/** May this object make way for the run? (natural, and not a hot spring or the like) */
function natural(object: WorldObject): boolean {
  const definition = OBJECT_REGISTRY[object.kind];
  return NATURAL.has(definition.category) && object.kind !== 'hot_spring';
}

/** Every spot the run (and its walkway round it) could take, with how good it is. */
function findSpots(context: GenerationContext, homesGap: number): Spot[] {
  const { size, terrain, occupancy, objects, village } = context;
  const inVillage = new Set(village ? villageTiles(village, size) : []);
  const bakery = villageHouses({ objects }).find((h) => h.kind === 'house_bakery');
  const villageList = [...inVillage];
  const anchor = bakery
    ? getDoorFrontTile(bakery)
    : {
        x: villageList.reduce((s, t) => s + (t % size.width), 0) / Math.max(1, villageList.length),
        y:
          villageList.reduce((s, t) => s + Math.floor(t / size.width), 0) /
          Math.max(1, villageList.length),
      };
  const homes = new Set<number>();
  for (const o of objects) {
    if (o.kind !== 'cabin' && o.kind !== 'studio') continue;
    const { footprint } = OBJECT_REGISTRY[o.kind];
    for (let dy = 0; dy < footprint.height; dy++) {
      for (let dx = 0; dx < footprint.width; dx++) homes.add(toIndex(size, o.x + dx, o.y + dy));
    }
  }
  const fromHomes = distanceField(size, (i) => homes.has(i), EIGHT_DIRECTIONS);
  const fromVillage = distanceField(size, (i) => inVillage.has(i), EIGHT_DIRECTIONS);
  /** 0: free; 1: a natural thing that would be cleared; -1: something that can't move. */
  const clearing = (i: number): number => {
    const id = occupancy[i] ?? NO_OBJECT;
    const object = id === NO_OBJECT ? undefined : objects[id];
    if (!object) return 0;
    if (!natural(object)) return -1;
    return OBJECT_REGISTRY[object.kind].blocksMovement ? 1 : 0;
  };
  const spots: Spot[] = [];
  for (let top = MARGIN; top + CHICKEN_RUN.height + MARGIN <= size.height; top++) {
    for (let left = MARGIN; left + CHICKEN_RUN.width + MARGIN <= size.width; left++) {
      for (const layout of RUN_LAYOUTS) {
        let cleared = 0;
        let nearest = Infinity;
        let ok = true;
        for (let y = top - MARGIN; ok && y < top + CHICKEN_RUN.height + MARGIN; y++) {
          for (let x = left - MARGIN; x < left + CHICKEN_RUN.width + MARGIN; x++) {
            const i = toIndex(size, x, y);
            const pen = cellAt(layout, x - left, y - top) !== ' ';
            const tile = terrain[i] ?? 0;
            const clear = clearing(i);
            // Away from the cottage and the workspace; outside the village; open land under the
            // pen, walkable ground round it; nothing built in the way.
            if (
              (fromHomes[i] ?? 0) < homesGap ||
              inVillage.has(i) ||
              clear < 0 ||
              (pen ? !LAND.has(tile) : !isWalkableTile(tile))
            ) {
              ok = false;
              break;
            }
            cleared += clear;
            if (pen) nearest = Math.min(nearest, fromVillage[i] ?? Infinity);
          }
        }
        if (!ok) continue;
        const cx = left + CHICKEN_RUN.width / 2;
        const cy = top + CHICKEN_RUN.height / 2;
        const score = Math.hypot(cx - anchor.x, cy - anchor.y) + CLEARING_COST * cleared;
        spots.push({ x: left, y: top, layout, score, near: nearest <= NEAR_VILLAGE_TILES });
      }
    }
  }
  return spots;
}

/** The run's own tiles (fence included), and the walkway ring round it. */
function areaOf(
  spot: Spot,
  size: { width: number; height: number },
): {
  run: Set<number>;
  ring: Set<number>;
} {
  const run = new Set<number>();
  const ring = new Set<number>();
  for (let y = spot.y - MARGIN; y < spot.y + CHICKEN_RUN.height + MARGIN; y++) {
    for (let x = spot.x - MARGIN; x < spot.x + CHICKEN_RUN.width + MARGIN; x++) {
      const pen = cellAt(spot.layout, x - spot.x, y - spot.y) !== ' ';
      (pen ? run : ring).add(toIndex(size, x, y));
    }
  }
  return { run, ring };
}

/**
 * A chicken run just outside the village: an L-shaped fenced pen with a gate, a
 * little hen house, a feed trough, a water dish and a straw patch, with a clear
 * walkway all round, well away from the cottage and the workspace, as near the
 * bakery as it can be. Where trees, bushes or rocks stand in the way it clears a
 * little glade (spots that clear less are preferred); anything built (fences,
 * houses, trails) never moves. Spots near the village come first; only if none
 * fits does it go further out, and only if nothing fits at all does it come
 * closer to the cottage and the workspace, so every island has one. Runs after
 * everything else that places objects (only the quiet places and the spawn come
 * later), so nothing else moves.
 */
export const buildChickenCoop: GenerationStep = (context) => {
  const { size, village, config } = context;
  if (!village || !config.village.chickenCoop) return context;
  const reached = reachedFromCabin(context);
  let chosen: Spot[] = [];
  for (const homesGap of [config.village.chickenCoopHomesGapTiles, 2]) {
    const spots = findSpots(context, homesGap);
    for (const nearOnly of [true, false]) {
      chosen = spots
        .filter((s) => !nearOnly || s.near)
        .sort((a, b) => a.score - b.score)
        .slice(0, CONNECTED_CHECKS)
        .filter((s) => {
          // The gate's front is reachable, and the run cuts nobody off.
          const gate = gateOf(s.layout);
          const front = toIndex(size, s.x + gate.x, s.y + gate.y + 1);
          return reached[front] === 1 && staysConnected(context, reached, areaOf(s, size).run);
        })
        .slice(0, BEST_CHOICES);
      if (chosen.length > 0) break;
    }
    if (chosen.length > 0) break;
  }
  if (chosen.length === 0) return context;
  const rng = createStepRng(context, 'buildChickenCoop');
  const spot = rng.pick(chosen);
  const { run, ring } = areaOf(spot, size);
  // Clear the glade: nature under the run and its walkway makes way (big trees reaching in too).
  const inArea = (o: WorldObject): boolean => {
    const { footprint } = OBJECT_REGISTRY[o.kind];
    for (let dy = 0; dy < footprint.height; dy++) {
      for (let dx = 0; dx < footprint.width; dx++) {
        const i = toIndex(size, o.x + dx, o.y + dy);
        if (run.has(i) || ring.has(i)) return true;
      }
    }
    return false;
  };
  const layer = objectLayerWithout(context, (o) => natural(o) && inArea(o));
  // The fence (with the gate), then everything inside.
  spot.layout.rows.forEach((row, dy) => {
    [...row].forEach((cell, dx) => {
      if (cell === 'F') addObject(layer, 'fence', spot.x + dx, spot.y + dy);
      if (cell === 'G') addObject(layer, 'fence_gate', spot.x + dx, spot.y + dy);
    });
  });
  for (const piece of spot.layout.pieces) {
    addObject(layer, piece.kind, spot.x + piece.x, spot.y + piece.y);
  }
  return { ...context, objects: layer.objects, occupancy: layer.occupancy };
};
