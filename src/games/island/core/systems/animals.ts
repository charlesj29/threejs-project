// Village animals: a few hens, a rooster and two chicks in their fenced run
// with the hen house, and a cat that pads round the village. The chicks keep
// close behind their mother; the hens go to the feed trough and the water dish
// now and then; the rooster stops to crow at dawn. They pick a nearby open tile, walk
// straight to it, rest (pecking, sitting, napping), and pick again, keeping to
// their own ground and never walking through anybody. Chickens scurry about
// their run when someone comes close. In the rain the chickens huddle by the
// hen house and the cat waits on a doorstep as a neat loaf; at night the
// chickens go into the hen house and the cat sleeps on its doorstep. Pure: the
// rng passed in drives them.
import { toIndex, type TilePoint } from '@/shared/engine/grid';
import { findPath } from '@/shared/engine/pathfinding';
import type { Rng } from '@/shared/engine/random';
import type { IslandConfig } from '../config';
import { villageHouses, villagerSpawns } from '../world/village';
import { getDoorFrontTile, type World } from '../world/world';
import { CHICKEN_RUN } from '../generation/steps/buildChickenCoop';
import { OBJECT_REGISTRY } from '../world/objects';
import { isWalkableTile } from '../world/tiles';
import { SMALL_BODY, type Spot } from './bodies';

export type AnimalKind = 'chicken' | 'rooster' | 'chick' | 'cat';

/** The birds of the chicken run (they share its ways: the run, the hen house, scurrying off). */
export function isPoultry(kind: AnimalKind): boolean {
  return kind !== 'cat';
}

/** Somewhere to stand by the trough or the dish, facing it. */
export interface Chore {
  readonly x: number;
  readonly y: number;
  readonly facing: 'left' | 'right';
}
/** Out and about, sheltering from the rain, or asleep (as the other animals: see `wildlifeRest`). */
export type AnimalRest = 'free' | 'shelter' | 'sleep';

export interface Animal {
  readonly id: number;
  readonly kind: AnimalKind;
  /** Map pixels: the middle of the feet. */
  x: number;
  y: number;
  previousX: number;
  previousY: number;
  /** Which way it looks: the side view (right mirrored), the back going up, the front coming down. */
  facing: 'left' | 'right' | 'up' | 'down';
  /** Where it's walking to (map pixels), or null while resting. */
  target: { x: number; y: number } | null;
  /** Seconds left resting before it wanders again. */
  restTime: number;
  /** Seconds spent resting so far (a cat dozes off after a while). */
  restedFor: number;
  /** Scurrying away from someone (a chicken), faster than a stroll. */
  fleeing: boolean;
  /** Pottering about, huddled against the rain, or asleep. */
  pose: 'idle' | 'huddle' | 'sleep';
  /** Its sheltered spot (map pixels): where it waits out the rain (and the cat sleeps). */
  readonly shelter: { readonly x: number; readonly y: number };
  /** Every sheltered spot it may huddle on in the rain (a chicken takes any free one by the hen house). */
  readonly shelters: ReadonlySet<number>;
  /** Seconds spent waiting for someone in the way on the way home (then it goes round them). */
  waited: number;
  /** The ground it keeps to: the chicken run, or the village. */
  readonly home: ReadonlySet<number>;
  /** The tile before the hen house door (chickens): in there for the night. Null for the cat. */
  readonly den: { readonly x: number; readonly y: number } | null;
  /** Inside the hen house for the night: not drawn, not in anyone's way. */
  hidden: boolean;
  /** The way home to shelter or the hen house (tiles still to walk through), and where it leads. */
  route: number[];
  routeGoal: number;
  /** A chick's mother (an animal id), or null, and where it keeps beside her (map pixels). */
  readonly follows: number | null;
  readonly followOffset: { readonly x: number; readonly y: number };
  /** Places it goes now and then for food or water (hens and the rooster). */
  readonly chores: readonly Chore[];
  /** On the way to a chore: the way to face on arrival. */
  choreFacing: 'left' | 'right' | null;
}

type AnimalSettings = IslandConfig['animals'];

/** Close enough to the target to stop (map pixels). */
const ARRIVE_PX = 0.75;
const FLEE_TRIES = 10;
/** On the way home, wait this long for someone in the way before going round them (seconds). */
const GO_ROUND_SECONDS = 1;
/** Shelter spots are this close to a door (tiles). */
const SHELTER_REACH_TILES = 3;
/** A chick keeps this close to its mother (map pixels), a little behind and to one side. */
const FOLLOW_PX = 6;
const CHICK_OFFSETS: readonly { readonly x: number; readonly y: number }[] = [
  { x: -11, y: 6 },
  { x: 11, y: 7 },
];

function speedOf(animal: Animal, settings: AnimalSettings): number {
  const base =
    animal.kind === 'cat' ? settings.catSpeedTilesPerSecond : settings.chickenSpeedTilesPerSecond;
  return animal.fleeing ? base * settings.fleeSpeedFactor : base;
}

const indexOf = (world: World, x: number, y: number, tileSizePx: number): number =>
  toIndex(world, Math.floor(x / tileSizePx), Math.floor(y / tileSizePx));

const centre = (world: World, tile: number, tileSizePx: number): { x: number; y: number } => ({
  x: ((tile % world.width) + 0.5) * tileSizePx,
  y: (Math.floor(tile / world.width) + 0.5) * tileSizePx,
});

const gap = (world: World, a: number, b: number): number =>
  Math.max(
    Math.abs((a % world.width) - (b % world.width)),
    Math.abs(Math.floor(a / world.width) - Math.floor(b / world.width)),
  );

/** The chicken run: open ground inside its fence (the hen house left out), and the tile before its door. */
export function chickenRun(world: World): { tiles: number[]; door: number } | null {
  const coop = world.objects.find((object) => object.kind === 'chicken_coop');
  if (!coop) return null;
  const { footprint } = OBJECT_REGISTRY.chicken_coop;
  const tiles: number[] = [];
  // The fence runs one tile round the inside, which starts at the hen house's corner.
  for (let y = coop.y; y < coop.y + CHICKEN_RUN.height - 2; y++) {
    for (let x = coop.x; x < coop.x + CHICKEN_RUN.width - 2; x++) {
      const underHouse = x < coop.x + footprint.width && y < coop.y + footprint.height;
      const i = toIndex(world, x, y);
      if (!underHouse && world.blocked[i] === 0) tiles.push(i);
    }
  }
  return { tiles, door: toIndex(world, coop.x, coop.y + footprint.height) };
}

/** Chickens in their run (or the village, if there's none) and a cat in the village; none when switched off. */
export function createAnimals(
  world: World,
  home: readonly number[],
  rng: Rng,
  settings: AnimalSettings,
  tileSizePx: number,
): Animal[] {
  const doors = new Set(villagerSpawns(world).map((d) => toIndex(world, d.x, d.y)));
  const open = home.filter((i) => world.blocked[i] === 0 && !doors.has(i));
  if (!settings.enabled || open.length === 0) return [];
  const bakery = villageHouses(world).find((house) => house.kind === 'house_bakery');
  const bakeryDoor = bakery
    ? ((front: TilePoint) => toIndex(world, front.x, front.y))(getDoorFrontTile(bakery))
    : null;
  // Sheltered spots: along the house wall beside a door (under the eaves), never on a tile
  // touching any door, so nobody's way in or out is ever blocked. Wall-side first, nearest first.
  const touchesDoor = (t: number): boolean =>
    [...doors].some(
      (d) =>
        Math.abs((t % world.width) - (d % world.width)) +
          Math.abs(Math.floor(t / world.width) - Math.floor(d / world.width)) <=
        1,
    );
  const row = (t: number): number => Math.floor(t / world.width);
  const byDoor = (door: number): number[] =>
    open
      .filter((t) => gap(world, t, door) <= SHELTER_REACH_TILES && !touchesDoor(t))
      .sort(
        (a, b) =>
          Number(row(a) !== row(door)) - Number(row(b) !== row(door)) ||
          gap(world, a, door) - gap(world, b, door),
      );
  const run = chickenRun(world);
  const villageSet = new Set(open);
  const runSet = run ? new Set(run.tiles) : villageSet;
  // In the rain the chickens huddle by the hen house (never on its doorway).
  const coop = run
    ? run.tiles
        .filter((t) => t !== run.door)
        .sort((a, b) => gap(world, a, run.door) - gap(world, b, run.door))
    : bakeryDoor === null
      ? []
      : byDoor(bakeryDoor);
  const otherDoor = [...doors].find((d) => d !== bakeryDoor) ?? null;
  const doorstep = otherDoor === null ? [] : byDoor(otherDoor);
  // The rooster and the chicks only live in a run.
  const kinds: AnimalKind[] = [
    ...Array.from({ length: settings.chickens }, (): AnimalKind => 'chicken'),
    ...Array.from({ length: run ? settings.roosters : 0 }, (): AnimalKind => 'rooster'),
    ...Array.from({ length: run ? settings.chicks : 0 }, (): AnimalKind => 'chick'),
    ...Array.from({ length: settings.cats }, (): AnimalKind => 'cat'),
  ];
  const birds = kinds.filter(isPoultry).length;
  const mother = kinds.indexOf('chicken');
  const chores = run ? choresIn(world, new Set(run.tiles), tileSizePx) : [];
  let chickens = 0;
  let cats = 0;
  let chicks = 0;
  const started = new Set<number>();
  return kinds.map((kind, id) => {
    const chicken = isPoultry(kind);
    // Each starts on a tile of its own (as long as there are enough).
    const ground = chicken && run && run.tiles.length > 0 ? run.tiles : open;
    const free = ground.filter((t) => !started.has(t));
    const tile = rng.pick(free.length > 0 ? free : ground);
    started.add(tile);
    const spots = chicken ? coop : doorstep;
    const nth = chicken ? chickens++ : cats++;
    const chickIndex = kind === 'chick' ? chicks++ : -1;
    const shelterTile = spots[nth] ?? tile;
    const { x, y } = centre(world, tile, tileSizePx);
    return {
      id,
      kind,
      x,
      y,
      previousX: x,
      previousY: y,
      facing: rng.chance(0.5) ? 'left' : 'right',
      target: null,
      restTime: rng.range(settings.minRestSeconds, settings.maxRestSeconds),
      restedFor: 0,
      fleeing: false,
      pose: 'idle',
      shelter: centre(world, shelterTile, tileSizePx),
      shelters: new Set(chicken && run ? coop.slice(0, birds + 2) : [shelterTile]),
      waited: 0,
      home: chicken ? runSet : villageSet,
      den: chicken && run ? centre(world, run.door, tileSizePx) : null,
      hidden: false,
      route: [],
      routeGoal: -1,
      follows: chickIndex >= 0 && mother >= 0 ? mother : null,
      followOffset: chickOffset(Math.max(0, chickIndex)),
      chores: kind === 'chicken' || kind === 'rooster' ? chores : [],
      choreFacing: null,
    };
  });
}

/** Where the nth chick keeps beside its mother: each on its own side, a little behind. */
function chickOffset(chickIndex: number): { readonly x: number; readonly y: number } {
  return CHICK_OFFSETS[chickIndex % CHICK_OFFSETS.length] ?? { x: 0, y: 6 };
}

/** Beside the feed trough and the water dish (on the run's open ground), facing them. */
function choresIn(world: World, run: ReadonlySet<number>, tile: number): Chore[] {
  const chores: Chore[] = [];
  for (const object of world.objects) {
    if (object.kind !== 'feed_trough' && object.kind !== 'water_dish') continue;
    for (const [dx, facing] of [
      [-1, 'right'],
      [1, 'left'],
    ] as const) {
      const x = object.x + dx;
      if (x < 0 || x >= world.width || !run.has(toIndex(world, x, object.y))) continue;
      chores.push({ x: (x + 0.5) * tile, y: (object.y + 0.5) * tile, facing });
      break;
    }
  }
  return chores;
}

/** An open village tile nobody stands on. */
function isOpen(
  world: World,
  home: ReadonlySet<number>,
  occupied: ReadonlySet<number>,
  x: number,
  y: number,
): boolean {
  if (x < 0 || y < 0 || x >= world.width || y >= world.height) return false;
  const i = toIndex(world, x, y);
  return home.has(i) && world.blocked[i] === 0 && !occupied.has(i);
}

/**
 * Where to wait out the rain: its own sheltered spot, or (if someone has
 * already settled there) the nearest other free one, so nobody walks into a
 * friend huddled on its spot.
 */
function shelterGoal(
  animal: Animal,
  world: World,
  here: number,
  occupied: ReadonlySet<number>,
  tileSizePx: number,
): { x: number; y: number } {
  const own = indexOf(world, animal.shelter.x, animal.shelter.y, tileSizePx);
  if (own === here || !occupied.has(own)) return animal.shelter;
  const free = [...animal.shelters]
    .filter((t) => t === here || !occupied.has(t))
    .sort((a, b) => gap(world, a, here) - gap(world, b, here));
  const tile = free[0];
  return tile === undefined ? animal.shelter : centre(world, tile, tileSizePx);
}

/** A random open village tile within the wander radius, or null. */
function pickTarget(
  animal: Animal,
  world: World,
  home: ReadonlySet<number>,
  occupied: ReadonlySet<number>,
  rng: Rng,
  settings: AnimalSettings,
  tileSizePx: number,
): TilePoint | null {
  const here = { x: Math.floor(animal.x / tileSizePx), y: Math.floor(animal.y / tileSizePx) };
  const r = settings.wanderRadiusTiles;
  for (let tries = 0; tries < 8; tries++) {
    const x = here.x + rng.int(-r, r);
    const y = here.y + rng.int(-r, r);
    if (isOpen(world, home, occupied, x, y)) return { x, y };
  }
  return null;
}

/** A path over open, walkable ground (doorsteps too) from one tile to another (the tiles after the first). */
function wayHome(
  world: World,
  from: number,
  to: number,
  avoid: ReadonlySet<number> = new Set(),
): number[] {
  const cost = (i: number): number =>
    i === from ||
    (world.blocked[i] === 0 && isWalkableTile(world.terrain[i] ?? 0) && (i === to || !avoid.has(i)))
      ? 1
      : Infinity;
  return findPath(world, from, to, cost)?.slice(1) ?? [];
}

/** Of a few open tiles round about, the one furthest from whoever came too close. */
function fleeTarget(
  animal: Animal,
  from: Spot,
  world: World,
  home: ReadonlySet<number>,
  occupied: ReadonlySet<number>,
  rng: Rng,
  settings: AnimalSettings,
  tileSizePx: number,
): { x: number; y: number } | null {
  const here = { x: Math.floor(animal.x / tileSizePx), y: Math.floor(animal.y / tileSizePx) };
  const r = settings.wanderRadiusTiles;
  let best: { x: number; y: number } | null = null;
  let bestDistance = Math.hypot(from.x - animal.x, from.y - animal.y);
  for (let tries = 0; tries < FLEE_TRIES; tries++) {
    const x = here.x + rng.int(-r, r);
    const y = here.y + rng.int(-r, r);
    if (!isOpen(world, home, occupied, x, y)) continue;
    const c = { x: (x + 0.5) * tileSizePx, y: (y + 0.5) * tileSizePx };
    const distance = Math.hypot(from.x - c.x, from.y - c.y);
    if (distance > bestDistance) {
      bestDistance = distance;
      best = c;
    }
  }
  return best;
}

/**
 * One fixed step: scurry from anyone too close (chickens), head for shelter
 * in the rain or at night, or walk towards the target (stopping at anything
 * solid or anybody in the way), or rest.
 */
export function updateAnimal(
  animal: Animal,
  world: World,
  rng: Rng,
  stepSeconds: number,
  settings: AnimalSettings,
  tileSizePx: number,
  rest: AnimalRest = 'free',
  scarers: readonly Spot[] = [],
  occupied: ReadonlySet<number> = new Set(),
  nearby: readonly Spot[] = [],
  /** A chick's mother: it keeps close behind her. */
  leader: Spot | null = null,
  /** The rooster's dawn crow is on: he stands still for it. */
  crowing = false,
): void {
  animal.previousX = animal.x;
  animal.previousY = animal.y;
  const home = animal.home;
  // Morning: out of the hen house again.
  if (animal.hidden && rest !== 'sleep') {
    animal.hidden = false;
    animal.pose = 'idle';
  }
  if (animal.hidden) return;
  // The rooster stands still to crow (at dawn, out and about).
  if (crowing && rest === 'free' && !animal.fleeing) {
    animal.target = null;
    animal.pose = 'idle';
    return;
  }
  if (isPoultry(animal.kind) && !animal.fleeing) {
    const reach = settings.fleeRadiusTiles * tileSizePx;
    const scarer = scarers.find((s) => Math.hypot(s.x - animal.x, s.y - animal.y) < reach);
    const away = scarer
      ? fleeTarget(animal, scarer, world, home, occupied, rng, settings, tileSizePx)
      : null;
    if (away) {
      animal.target = away;
      animal.fleeing = true;
      animal.pose = 'idle';
    }
  }
  if (!animal.fleeing && rest !== 'free') {
    // Already huddled down for this shower (on a spot, or where it got stuck): it stays put.
    if (rest === 'shelter' && animal.pose === 'huddle') {
      animal.target = null;
      return;
    }
    // Night: chickens go into the hen house; otherwise to the sheltered spot.
    const here = indexOf(world, animal.x, animal.y, tileSizePx);
    const goal =
      rest === 'sleep' && animal.den
        ? animal.den
        : shelterGoal(animal, world, here, occupied, tileSizePx);
    const spot = indexOf(world, goal.x, goal.y, tileSizePx);
    // Settled: in the hen house for the night, or on any free sheltered spot in the rain (so two
    // chickens never wait for ever to swap places).
    const sheltered = rest !== 'sleep' || !animal.den ? animal.shelters.has(here) : false;
    if (here === spot || sheltered) {
      animal.target = null;
      animal.route = [];
      animal.waited = 0;
      if (rest === 'sleep' && animal.den) animal.hidden = true;
      animal.pose = rest === 'sleep' ? 'sleep' : 'huddle';
      return;
    }
    // Follow a proper path (round houses and fences), one tile at a time.
    if (animal.routeGoal !== spot || animal.route.length === 0) {
      animal.routeGoal = spot;
      animal.route = wayHome(world, here, spot);
    }
    if (animal.route[0] === here) animal.route.shift();
    const next = animal.route[0];
    animal.target = next === undefined ? goal : centre(world, next, tileSizePx);
  } else if (rest === 'free') {
    animal.pose = 'idle';
  }
  // A chick out and about trots after its mother (and pecks about when it's close).
  if (leader && rest === 'free' && !animal.fleeing) {
    const wanted = { x: leader.x + animal.followOffset.x, y: leader.y + animal.followOffset.y };
    const inRun = home.has(indexOf(world, wanted.x, wanted.y, tileSizePx));
    const goal = inRun ? wanted : { x: leader.x, y: leader.y };
    if (Math.hypot(goal.x - animal.x, goal.y - animal.y) > FOLLOW_PX) animal.target = goal;
    else {
      animal.target = null;
      animal.restedFor += stepSeconds;
      return;
    }
  }
  const target = animal.target;
  if (!target) {
    animal.restTime -= stepSeconds;
    animal.restedFor += stepSeconds;
    if (animal.restTime > 0) return;
    animal.restTime = rng.range(settings.minRestSeconds, settings.maxRestSeconds);
    // Now and then a hen (or the rooster) goes for food or a drink.
    const chore =
      animal.chores.length > 0 && rng.chance(settings.choreChance) ? rng.pick(animal.chores) : null;
    if (chore && !occupied.has(indexOf(world, chore.x, chore.y, tileSizePx))) {
      animal.target = { x: chore.x, y: chore.y };
      animal.choreFacing = chore.facing;
      animal.restedFor = 0;
      return;
    }
    const tile = pickTarget(animal, world, home, occupied, rng, settings, tileSizePx);
    if (!tile) return;
    animal.target = { x: (tile.x + 0.5) * tileSizePx, y: (tile.y + 0.5) * tileSizePx };
    animal.choreFacing = null;
    animal.restedFor = 0;
    return;
  }
  const dx = target.x - animal.x;
  const dy = target.y - animal.y;
  const distance = Math.hypot(dx, dy);
  if (distance <= ARRIVE_PX) {
    animal.target = null;
    animal.fleeing = false;
    // At the trough or the dish: turn to it.
    if (animal.choreFacing) animal.facing = animal.choreFacing;
    animal.choreFacing = null;
    return;
  }
  const step = Math.min(distance, speedOf(animal, settings) * tileSizePx * stepSeconds);
  const nextX = animal.x + (dx / distance) * step;
  const nextY = animal.y + (dy / distance) * step;
  const here = indexOf(world, animal.x, animal.y, tileSizePx);
  const tile = indexOf(world, nextX, nextY, tileSizePx);
  // Somebody in the way (their tile, or right beside the next step): wait for them (on the
  // way home), or give up and rest (wandering).
  const crowding = nearby.some((other) => {
    const close =
      Math.abs(other.x - nextX) < SMALL_BODY.width && Math.abs(other.y - nextY) < SMALL_BODY.height;
    return (
      close &&
      Math.hypot(other.x - nextX, other.y - nextY) <
        Math.hypot(other.x - animal.x, other.y - animal.y)
    );
  });
  if ((tile !== here && occupied.has(tile)) || crowding) {
    if (rest === 'free' || animal.fleeing) {
      animal.target = null;
      animal.fleeing = false;
      return;
    }
    // On the way home and somebody's in the way: in the rain, after a moment it huddles where it
    // is (it's only rain); at night it finds a way round them (it must reach the hen house).
    animal.waited += stepSeconds;
    if (animal.waited >= GO_ROUND_SECONDS) {
      animal.waited = 0;
      if (rest === 'shelter') {
        animal.target = null;
        animal.route = [];
        animal.pose = 'huddle';
      } else {
        const round = wayHome(world, here, animal.routeGoal, occupied);
        if (round.length > 0) animal.route = round;
      }
    }
    return;
  }
  animal.waited = 0;
  // Solid things (and, wandering, the edge of its ground) stop it: rest here instead.
  const homeward = rest !== 'free' && !animal.fleeing;
  if (world.blocked[tile] !== 0 || (!homeward && !home.has(tile))) {
    animal.target = null;
    animal.fleeing = false;
    animal.route = [];
    return;
  }
  // Faces the way it goes: sideways, or up (its back) or down (its front) when that's the way.
  if (Math.abs(dx) >= Math.abs(dy)) {
    if (Math.abs(dx) > 0.1) animal.facing = dx > 0 ? 'right' : 'left';
  } else animal.facing = dy > 0 ? 'down' : 'up';
  animal.x = nextX;
  animal.y = nextY;
}
