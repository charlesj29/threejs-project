// The village's day. Each villager has a role and follows its schedule by the
// clock: the baker minds the market stall in the morning, the keeper fetches
// water and sweeps the doorstep, the night owl fishes off the dock, reads on a
// bench, has a soak in the hot spring and stays out on the plaza at night; in the evening everyone gathers
// round the well, and at night the others go home (indoors, out of sight).
// Pure: the fixed step moves them (through `wander.ts`); this decides where to.
import { toIndex, type TilePoint } from '@/shared/engine/grid';
import type { Rng } from '@/shared/engine/random';
import type { IslandConfig } from '../config';
import type { Direction } from '../entities/player';
import type { Activity, Errand, Villager, VillagerRole } from '../entities/villager';
import { OBJECT_REGISTRY } from '../world/objects';
import { isWalkableTile, TileId } from '../world/tiles';
import { villageTiles, wanderTiles } from '../world/village';
import type { World, WorldObject } from '../world/world';
import { rainyActivity, type RainSettings } from './rainyDay';
import { sitOn, standUp } from './seat';
import { planErrandRoute, type Crowd } from './wander';

/** The places the village's day happens (null where this island has none). */
export interface RoutinePlaces {
  /** Behind the market stall's counter. */
  readonly stall: Spot | null;
  /** Beside the well. */
  readonly well: Spot | null;
  /** The end of the dock, facing the water. */
  readonly dock: Spot | null;
  /** On the shore where the dock starts: the fisher waits here while someone is on the dock. */
  readonly dockWait: Spot | null;
  /** The dock's planks (tile indexes). */
  readonly dockTiles: ReadonlySet<number>;
  /** The plaza's bench (the one nearest the well). */
  readonly bench: WorldObject | null;
  /** Spots round the well to gather on in the evening, nearest first. */
  readonly gather: readonly Spot[];
  /** The hot spring, and where to stand before stepping in. */
  readonly spring: { readonly object: WorldObject; readonly spot: Spot } | null;
}

export interface Spot {
  readonly tile: TilePoint;
  readonly facing: Direction;
}

const ACTIVITIES: readonly Activity[] = [
  'wander',
  'bake',
  'water',
  'sweep',
  'fish',
  'read',
  'gather',
  'soak',
  'owl',
  'home',
  'shelter',
];
const isActivity = (name: string): name is Activity => (ACTIVITIES as string[]).includes(name);

/** Outfits are roles: the farmer keeps house, the girl is the night owl, the baker bakes. */
const ROLES_BY_LOOK: readonly VillagerRole[] = ['keeper', 'owl', 'baker'];
/** How far round the well (tiles) the evening gathering spreads. */
const GATHER_RADIUS = 3;
/** Wait this long before trying again when there's no way to an errand right now. */
const RETRY_SECONDS = 1;

export function roleFor(look: number): VillagerRole {
  return ROLES_BY_LOOK[look % ROLES_BY_LOOK.length] ?? 'keeper';
}

/** What a schedule says to do at a time of day (the last entry runs past midnight). */
export function activityAt(
  schedule: readonly (readonly [number, string])[],
  time: number,
): Activity {
  const t = time - Math.floor(time);
  let current = schedule.at(-1)?.[1] ?? 'wander';
  for (const [start, activity] of schedule) if (t >= start) current = activity;
  return isActivity(current) ? current : 'wander';
}

/**
 * Where villagers may walk on errands: every open, walkable tile on the
 * island, except the strips behind the village houses (they'd look as if on
 * the roof).
 */
export function roamTiles(world: World): Set<number> {
  const roofs = new Set<number>();
  if (world.village) {
    const open = new Set(wanderTiles(world));
    for (const tile of villageTiles(world.village, world)) if (!open.has(tile)) roofs.add(tile);
  }
  const roam = new Set<number>();
  world.terrain.forEach((tile, index) => {
    if (world.blocked[index] === 0 && isWalkableTile(tile) && !roofs.has(index)) roam.add(index);
  });
  return roam;
}

const open = (world: World, roam: ReadonlySet<number>, x: number, y: number): boolean =>
  x >= 0 && y >= 0 && x < world.width && y < world.height && roam.has(toIndex(world, x, y));

/** Free tiles round an object: above (facing down at it), below, left and right, in that order. */
function spotsAround(object: WorldObject, world: World, roam: ReadonlySet<number>): Spot[] {
  const { width, height } = OBJECT_REGISTRY[object.kind].footprint;
  const middle = object.x + (width - 1) / 2;
  const byMiddle = (a: Spot, b: Spot): number =>
    Math.abs(a.tile.x - middle) - Math.abs(b.tile.x - middle);
  const row = (y: number, facing: Direction): Spot[] =>
    Array.from({ length: width }, (_, i) => ({ tile: { x: object.x + i, y }, facing }))
      .filter((s) => open(world, roam, s.tile.x, s.tile.y))
      .sort(byMiddle);
  const column = (x: number, facing: Direction): Spot[] =>
    Array.from({ length: height }, (_, i) => ({ tile: { x, y: object.y + i }, facing })).filter(
      (s) => open(world, roam, s.tile.x, s.tile.y),
    );
  return [
    ...row(object.y - 1, 'down'),
    ...row(object.y + height, 'up'),
    ...column(object.x - 1, 'right'),
    ...column(object.x + width, 'left'),
  ];
}

interface DockPlaces {
  readonly end: Spot;
  readonly wait: Spot | null;
}

/**
 * The end of the dock (the dock tile furthest along from the shore), facing on
 * out, and the shore tile where it starts (facing the dock).
 */
function dockPlaces(world: World): DockPlaces | null {
  const dock: TilePoint[] = [];
  world.terrain.forEach((tile, index) => {
    if (tile === TileId.Dock)
      dock.push({ x: index % world.width, y: Math.floor(index / world.width) });
  });
  if (dock.length === 0) return null;
  const isDock = (x: number, y: number): boolean => dock.some((d) => d.x === x && d.y === y);
  // Where the dock meets land; the end is the dock tile furthest from there.
  const root = dock.find((d) =>
    [
      [0, -1],
      [0, 1],
      [-1, 0],
      [1, 0],
    ].some(([dx = 0, dy = 0]) => {
      const x = d.x + dx;
      const y = d.y + dy;
      return !isDock(x, y) && isWalkableTile(world.terrain[toIndex(world, x, y)] ?? 0);
    }),
  );
  if (!root) return null;
  const end = dock.reduce((far, d) =>
    Math.hypot(d.x - root.x, d.y - root.y) > Math.hypot(far.x - root.x, far.y - root.y) ? d : far,
  );
  const dx = end.x - root.x;
  const dy = end.y - root.y;
  const facing: Direction =
    Math.abs(dy) >= Math.abs(dx) ? (dy >= 0 ? 'down' : 'up') : dx > 0 ? 'right' : 'left';
  return { end: { tile: end, facing }, wait: dockWaitSpot(world, root, facing, isDock) };
}

/** How far round the start of the dock (tiles) to look for a place to wait. */
const DOCK_WAIT_REACH = 2;

/**
 * Where the fisher waits while someone is on the dock: beside the way onto it,
 * never in it. Not the shore tile in front of the dock or the line leading
 * straight to it, not a path; somewhere open (free tiles all round), as close
 * to the dock as that allows. Faces the dock.
 */
function dockWaitSpot(
  world: World,
  root: TilePoint,
  out: Direction,
  isDock: (x: number, y: number) => boolean,
): Spot | null {
  const along = {
    x: out === 'right' ? 1 : out === 'left' ? -1 : 0,
    y: out === 'down' ? 1 : out === 'up' ? -1 : 0,
  };
  const shore = { x: root.x - along.x, y: root.y - along.y };
  const free = (x: number, y: number): boolean => {
    if (x < 0 || y < 0 || x >= world.width || y >= world.height || isDock(x, y)) return false;
    const i = toIndex(world, x, y);
    return world.blocked[i] === 0 && isWalkableTile(world.terrain[i] ?? 0);
  };
  // The shore tile and the line behind it (towards land) are the way in: keep off them.
  const onApproach = (x: number, y: number): boolean =>
    along.x === 0
      ? x === shore.x && (y - shore.y) * along.y <= 0
      : y === shore.y && (x - shore.x) * along.x <= 0;
  let best: { tile: TilePoint; score: number } | null = null;
  for (let oy = -DOCK_WAIT_REACH; oy <= DOCK_WAIT_REACH; oy++) {
    for (let ox = -DOCK_WAIT_REACH; ox <= DOCK_WAIT_REACH; ox++) {
      const x = shore.x + ox;
      const y = shore.y + oy;
      if (!free(x, y) || onApproach(x, y)) continue;
      if (world.terrain[toIndex(world, x, y)] === TileId.Path) continue;
      let open = 0;
      for (let ny = -1; ny <= 1; ny++) {
        for (let nx = -1; nx <= 1; nx++) if ((nx || ny) && free(x + nx, y + ny)) open++;
      }
      const score = open * 2 - Math.max(Math.abs(ox), Math.abs(oy)) * 3;
      if (!best || score > best.score) best = { tile: { x, y }, score };
    }
  }
  return best ? { tile: best.tile, facing: facingTowards(best.tile, root) } : null;
}

/** Faces from a tile towards a point (by the bigger offset). */
function facingTowards(from: TilePoint, to: { x: number; y: number }): Direction {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
}

/** Finds the stall, the well, the dock end, the plaza bench and the gathering spots. */
export function routinePlaces(world: World, roam: ReadonlySet<number>): RoutinePlaces {
  const find = (kind: string): WorldObject | undefined =>
    world.objects.find((object) => object.kind === kind);
  const stall = find('market_stall');
  const dock = dockPlaces(world);
  const dockTiles = new Set<number>();
  world.terrain.forEach((tile, index) => {
    if (tile === TileId.Dock) dockTiles.add(index);
  });
  const well = find('well');
  const wellMiddle = well ? { x: well.x + 0.5, y: well.y } : null;
  const benches = world.objects.filter((object) => object.kind === 'bench');
  const bench =
    wellMiddle && benches.length > 0
      ? benches.reduce((best, b) =>
          Math.hypot(b.x + 0.5 - wellMiddle.x, b.y - wellMiddle.y) <
          Math.hypot(best.x + 0.5 - wellMiddle.x, best.y - wellMiddle.y)
            ? b
            : best,
        )
      : null;
  const village = new Set(world.village ? wanderTiles(world) : []);
  const gather: Spot[] = [];
  if (well && wellMiddle) {
    for (let y = well.y - GATHER_RADIUS; y <= well.y + GATHER_RADIUS; y++) {
      for (let x = well.x - GATHER_RADIUS; x <= well.x + 1 + GATHER_RADIUS; x++) {
        if (!open(world, roam, x, y) || !village.has(toIndex(world, x, y))) continue;
        gather.push({ tile: { x, y }, facing: facingTowards({ x, y }, wellMiddle) });
      }
    }
    // Nearest first, but not right against the well (leave room to walk round it).
    gather.sort(
      (a, b) =>
        Math.abs(Math.hypot(a.tile.x - wellMiddle.x, a.tile.y - wellMiddle.y) - 2) -
        Math.abs(Math.hypot(b.tile.x - wellMiddle.x, b.tile.y - wellMiddle.y) - 2),
    );
  }
  const springObject = find('hot_spring');
  // Step in from the front if there's room (walking up from below), else from any side.
  const springSpots = springObject ? spotsAround(springObject, world, roam) : [];
  const springSpot = springSpots.find((s) => s.facing === 'up') ?? springSpots[0];
  return {
    stall: stall ? (spotsAround(stall, world, roam)[0] ?? null) : null,
    well: well ? (spotsAround(well, world, roam).find((s) => s.facing !== 'down') ?? null) : null,
    dock: dock?.end ?? null,
    dockWait: dock?.wait ?? null,
    dockTiles,
    bench,
    gather,
    spring: springObject && springSpot ? { object: springObject, spot: springSpot } : null,
  };
}

const errandAt = (spot: Spot): Errand => ({
  goal: spot.tile,
  facing: spot.facing,
  bench: null,
  goInside: false,
});

/** The plaza bench: stand in front of it, then sit. */
function benchErrand(bench: WorldObject): Errand {
  return { goal: { x: bench.x, y: bench.y + 1 }, facing: 'down', bench, goInside: false };
}

/** Where an activity happens for this villager, or null to wander the village. */
export function errandFor(
  villager: Villager,
  activity: Activity,
  places: RoutinePlaces,
  gatherIndex: number,
): Errand | null {
  const gatherSpot = places.gather[gatherIndex % Math.max(1, places.gather.length)];
  switch (activity) {
    case 'bake':
      return places.stall ? errandAt(places.stall) : null;
    case 'water':
      return places.well ? errandAt(places.well) : null;
    case 'sweep':
      return { goal: villager.door, facing: 'right', bench: null, goInside: false };
    case 'fish':
      return places.dock ? errandAt(places.dock) : null;
    case 'read':
    case 'owl':
      if (places.bench) return benchErrand(places.bench);
      return gatherSpot ? errandAt(gatherSpot) : null;
    case 'gather':
      return gatherSpot ? errandAt(gatherSpot) : null;
    case 'soak':
      // Walk up to the pool, then step in (it seats them like a bench).
      return places.spring
        ? { ...errandAt(places.spring.spot), bench: places.spring.object }
        : null;
    case 'shelter':
      return places.stall
        ? errandAt(places.stall)
        : { goal: villager.door, facing: 'up', bench: null, goInside: true };
    case 'home':
      return { goal: villager.door, facing: 'up', bench: null, goInside: true };
    case 'wander':
      return null;
  }
}

/** Turns between sweeping this way and that, every quarter of an hour on the island clock. */
const SWEEP_TURNS_PER_DAY = 96;

function sweepFacing(time: number): 'left' | 'right' {
  return Math.floor(time * SWEEP_TURNS_PER_DAY) % 2 === 0 ? 'right' : 'left';
}

/** Changes what a villager is doing: stands up, comes outdoors, and sets off. */
function switchActivity(
  villager: Villager,
  activity: Activity,
  places: RoutinePlaces,
  tileSizePx: number,
): void {
  standUp(villager);
  if (villager.hidden) {
    // Out of the front door for the day.
    villager.hidden = false;
    villager.x = (villager.door.x + 0.5) * tileSizePx;
    villager.y = (villager.door.y + 0.5) * tileSizePx;
    villager.previousX = villager.x;
    villager.previousY = villager.y;
  }
  villager.activity = activity;
  villager.errand = errandFor(villager, activity, places, villager.id);
  villager.atErrand = false;
  villager.route = [];
  villager.stuckTime = 0;
  villager.restTime = 0.5;
}

/** Arrived: settles in (faces the work, sits on the bench, or goes indoors). */
function arrive(villager: Villager, errand: Errand, tileSizePx: number, crowd: Crowd): void {
  villager.atErrand = true;
  villager.facing = errand.facing;
  const others = crowd.player ? [crowd.player, ...crowd.villagers] : crowd.villagers;
  if (errand.bench) sitOn(villager, errand.bench, tileSizePx, others);
  if (errand.goInside) villager.hidden = true;
}

/**
 * One fixed step of a villager's day, before they move: switch activity when
 * the clock says so, head for the errand, settle in on arrival.
 */
export function updateRoutine(
  villager: Villager,
  time: number,
  places: RoutinePlaces,
  world: World,
  crowd: Crowd,
  rng: Rng,
  schedule: IslandConfig['villagerDay'],
  tileSizePx: number,
  rain: RainSettings = { raining: false, hurryFactor: 1 },
): void {
  const scheduled = activityAt(schedule[villager.role], time);
  const wanted = rain.raining
    ? rainyActivity(villager.role, scheduled, places.stall !== null)
    : scheduled;
  if (wanted !== villager.activity && !villager.talking && !villager.chat) {
    switchActivity(villager, wanted, places, tileSizePx);
  }
  const errand = villager.errand;
  // Hurrying out of the rain to the door or the awning; a stroll otherwise.
  const sheltering = villager.activity === 'home' || villager.activity === 'shelter';
  villager.speedFactor = rain.raining && sheltering && !villager.atErrand ? rain.hurryFactor : 1;
  if (!errand || villager.talking) return;
  if (villager.atErrand) {
    // Back to the work after a chat; a sweeper turns round now and then to do the other side.
    if (!villager.sitting && !villager.hidden) {
      villager.facing = villager.activity === 'sweep' ? sweepFacing(time) : errand.facing;
    }
    return;
  }
  const tileX = Math.floor(villager.x / tileSizePx);
  const tileY = Math.floor(villager.y / tileSizePx);
  // The dock is one plank wide: don't walk out while the player is on it (they'd be
  // stuck at the end behind us); wait on the shore until it's clear.
  if (villager.activity === 'fish' && waitForDock(villager, places, world, crowd, tileSizePx)) {
    const wait = places.dockWait;
    if (!wait || villager.route.length > 0 || villager.pauseTime > 0) return;
    if (tileX === wait.tile.x && tileY === wait.tile.y) {
      villager.facing = wait.facing;
      villager.pauseTime = RETRY_SECONDS;
      return;
    }
    villager.route = planErrandRoute(villager, world, crowd, rng, tileSizePx, wait.tile);
    if (villager.route.length === 0) villager.pauseTime = RETRY_SECONDS;
    return;
  }
  if (villager.route.length > 0 || villager.pauseTime > 0) return;
  if (tileX === errand.goal.x && tileY === errand.goal.y) {
    arrive(villager, errand, tileSizePx, crowd);
    return;
  }
  villager.route = planErrandRoute(villager, world, crowd, rng, tileSizePx);
  if (villager.route.length === 0) villager.pauseTime = RETRY_SECONDS;
}

/**
 * True while the player is on the dock and the villager isn't (yet): the
 * villager should wait on the shore. Stops a route that was about to step on.
 */
function waitForDock(
  villager: Villager,
  places: RoutinePlaces,
  world: World,
  crowd: Crowd,
  tileSizePx: number,
): boolean {
  const player = crowd.player;
  if (!player || places.dockTiles.size === 0) return false;
  const tileOf = (x: number, y: number): number =>
    toIndex(world, Math.floor(x / tileSizePx), Math.floor(y / tileSizePx));
  if (!places.dockTiles.has(tileOf(player.x, player.y))) return false;
  if (places.dockTiles.has(tileOf(villager.x, villager.y))) return false;
  const next = villager.route[0];
  if (next && places.dockTiles.has(toIndex(world, next.x, next.y))) villager.route = [];
  return true;
}
