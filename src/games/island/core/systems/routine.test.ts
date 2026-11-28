import { describe, expect, it } from 'vitest';
import { ISLAND_CONFIG, type IslandConfig } from '../config';
import { createGameState, setHeldTime, stepGame, type GameState } from '../game/gameState';
import { generateValidWorld } from '../generation/testUtils';
import { MIDNIGHT } from './dayNight';
import { villagerGreeting } from './guidance';
import { activityAt } from './routine';
import { TileId } from '../world/tiles';

const STEP = 1 / 30;
const TILE = ISLAND_CONFIG.map.tileSizePx;
/** The clock stands still, so the village stays in one part of the day; and it stays dry. */
const STILL: IslandConfig = {
  ...ISLAND_CONFIG,
  dayNight: { ...ISLAND_CONFIG.dayNight, dayLengthSeconds: 1e9 },
  weather: { ...ISLAND_CONFIG.weather, minClearSeconds: 1e9, maxClearSeconds: 1e9 },
};

function villageAt(time: number, seed = 46): GameState {
  const state = createGameState(generateValidWorld(seed), STILL);
  // The player waits indoors, so nobody has to walk round them.
  Object.assign(state, { mapId: 'cottage', timeOfDay: time });
  return state;
}

function wait(state: GameState, seconds: number): void {
  for (let i = 0; i < seconds / STEP; i++) stepGame(state, STEP, STILL);
}

const byRole = (state: GameState, role: string) => {
  const villager = state.villagers.find((v) => v.role === role);
  if (!villager) throw new Error(`no ${role}`);
  return villager;
};

describe('activityAt', () => {
  const schedule = ISLAND_CONFIG.villagerDay.keeper;
  it('follows the schedule and wraps past midnight', () => {
    expect(activityAt(schedule, 0.25)).toBe('water');
    expect(activityAt(schedule, 0.4)).toBe('sweep');
    expect(activityAt(schedule, 0.75)).toBe('gather');
    expect(activityAt(schedule, 0.9)).toBe('home');
    expect(activityAt(schedule, 0.05)).toBe('home');
  });
});

describe('the village day', () => {
  it('finds the stall, the well, the dock end, the plaza bench and room to gather', () => {
    const places = villageAt(0.3).routinePlaces;
    expect(places.stall).not.toBeNull();
    expect(places.well).not.toBeNull();
    expect(places.dock).not.toBeNull();
    expect(places.bench).not.toBeNull();
    expect(places.gather.length).toBeGreaterThanOrEqual(3);
  });

  it.each([46, 1, 7])('sends everyone to their morning chores (seed %i)', (seed) => {
    const state = villageAt(0.3, seed);
    wait(state, 90);
    for (const villager of state.villagers) {
      expect(villager.hidden).toBe(false);
      if (!villager.errand) continue;
      expect(villager.atErrand, `${villager.role} doing ${villager.activity}`).toBe(true);
      expect(Math.floor(villager.x / TILE)).toBe(villager.errand.goal.x);
    }
    expect(byRole(state, 'baker').activity).toBe('bake');
    expect(byRole(state, 'owl').activity).toBe('fish');
  });

  it('in the rain: the keeper goes home, the baker shelters at the stall, the owl fishes on', () => {
    const state = villageAt(0.3);
    Object.assign(state.weather, { raining: true, intensity: 1, timeLeft: 1e9 });
    wait(state, 90);
    expect(byRole(state, 'keeper').hidden).toBe(true);
    const baker = byRole(state, 'baker');
    expect(baker.activity).toBe('shelter');
    expect(baker.atErrand).toBe(true);
    expect(byRole(state, 'owl').activity).toBe('fish');
  });

  it('sends the others home at night, while the night owl sits on the plaza bench', () => {
    const state = villageAt(0.95);
    wait(state, 90);
    expect(byRole(state, 'baker').hidden).toBe(true);
    expect(byRole(state, 'keeper').hidden).toBe(true);
    const owl = byRole(state, 'owl');
    expect(owl.hidden).toBe(false);
    expect(owl.sitting).not.toBeNull();
  });

  it('takes the night owl for a soak in the hot spring before the evening', () => {
    const state = villageAt(0.65);
    wait(state, 120);
    const owl = byRole(state, 'owl');
    expect(owl.activity).toBe('soak');
    expect(owl.sitting?.soaking).toBe(true);
  });

  it('keeps the held night of the day/night button', () => {
    const state = villageAt(0.3);
    setHeldTime(state, MIDNIGHT);
    wait(state, 90);
    expect(byRole(state, 'baker').hidden).toBe(true);
  });

  it('comes back out of the front door in the morning', () => {
    const state = villageAt(0.95);
    wait(state, 60);
    const baker = byRole(state, 'baker');
    expect(baker.hidden).toBe(true);
    state.timeOfDay = 0.3;
    wait(state, 1);
    expect(baker.hidden).toBe(false);
    expect(Math.floor(baker.y / TILE)).toBeLessThanOrEqual(baker.door.y + 1);
  });
});

describe('greetings', () => {
  it('fit what the villager is doing, else the time of day', () => {
    expect(villagerGreeting('bake', 'morning')).toMatch(/bread/);
    expect(villagerGreeting('fish', 'morning')).toMatch(/biting/);
    expect(villagerGreeting('wander', 'afternoon')).toBe('Good afternoon!');
    expect(villagerGreeting('owl', 'night')).toMatch(/stars/);
    expect(villagerGreeting('owl', 'evening')).toMatch(/evening/i);
  });
});

describe('who lives where', () => {
  it('puts the baker in the bakery when the village has one', () => {
    let checked = 0;
    for (const seed of [46, 1, 2, 3, 7, 12]) {
      const state = villageAt(0.3, seed);
      const bakery = state.world.objects.find((o) => o.kind === 'house_bakery');
      if (!bakery) continue;
      const baker = byRole(state, 'baker');
      expect(baker.door.x).toBeGreaterThanOrEqual(bakery.x);
      expect(baker.door.x).toBeLessThan(bakery.x + 5);
      expect(baker.door.y).toBe(bakery.y + 3);
      checked += 1;
    }
    expect(checked).toBeGreaterThan(0);
  });
});

describe('sharing the dock', () => {
  it.each([46, 1, 7])('waits beside the way onto the dock, never blocking it (seed %i)', (seed) => {
    const state = villageAt(0.3, seed);
    const { dockWait, dockTiles } = state.routinePlaces;
    const world = state.world;
    if (!dockWait) throw new Error('no place to wait');
    const waitIndex = dockWait.tile.y * world.width + dockWait.tile.x;
    expect(dockTiles.has(waitIndex)).toBe(false);
    expect(world.terrain[waitIndex]).not.toBe(TileId.Path);
    // With someone standing there, the dock can still be reached from the cottage door.
    const start = world.spawn.y * world.width + world.spawn.x;
    const seen = new Set([start]);
    const queue = [start];
    for (const at of queue) {
      const x = at % world.width;
      const y = Math.floor(at / world.width);
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ] as const) {
        const next = (y + dy) * world.width + x + dx;
        if (seen.has(next) || next === waitIndex) continue;
        if (world.blocked[next] !== 0 && !dockTiles.has(next)) continue;
        seen.add(next);
        queue.push(next);
      }
    }
    for (const plank of dockTiles) expect(seen.has(plank)).toBe(true);
  });

  it('lets the player have the dock: waits on the shore, then goes out once it is clear', () => {
    const state = createGameState(generateValidWorld(46), STILL);
    Object.assign(state, { timeOfDay: 0.3 });
    const end = state.routinePlaces.dock;
    if (!end) throw new Error('no dock');
    // The player stands on the dock, near its end.
    Object.assign(state.player, {
      x: (end.tile.x + 0.5) * TILE,
      y: (end.tile.y + 0.5) * TILE,
    });
    Object.assign(state.player, { previousX: state.player.x, previousY: state.player.y });
    wait(state, 90);
    const owl = byRole(state, 'owl');
    const owlTile = Math.floor(owl.y / TILE) * state.world.width + Math.floor(owl.x / TILE);
    expect(state.routinePlaces.dockTiles.has(owlTile)).toBe(false);
    expect(owl.atErrand).toBe(false);
    // The player walks off home; the night owl goes out to fish.
    Object.assign(state, { mapId: 'cottage' });
    wait(state, 60);
    expect(owl.atErrand).toBe(true);
    expect(owl.activity).toBe('fish');
  });
});
