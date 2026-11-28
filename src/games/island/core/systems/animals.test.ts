import { describe, expect, it } from 'vitest';
import { toIndex } from '@/shared/engine/grid';
import { ISLAND_CONFIG } from '../config';
import { createGameState, stepGame } from '../game/gameState';
import { generateValidWorld } from '../generation/testUtils';
import { chickenRun, isPoultry } from './animals';
import { roosterCrowing } from './rooster';

const STEP = 1 / 60;
const TILE = ISLAND_CONFIG.map.tileSizePx;

function simulate(seconds: number, time = 0.4): ReturnType<typeof createGameState> {
  const state = createGameState(generateValidWorld(46), ISLAND_CONFIG);
  Object.assign(state, { timeOfDay: time });
  for (let i = 0; i < seconds / STEP; i++) stepGame(state, STEP, ISLAND_CONFIG);
  return state;
}

const tileOf = (state: ReturnType<typeof createGameState>, a: { x: number; y: number }): number =>
  toIndex(state.world, Math.floor(a.x / TILE), Math.floor(a.y / TILE));

describe('village animals', () => {
  it('can be switched off', () => {
    const off = { ...ISLAND_CONFIG, animals: { ...ISLAND_CONFIG.animals, enabled: false } };
    expect(createGameState(generateValidWorld(46), off).animals).toEqual([]);
  });

  const state = simulate(40);

  it('are three hens, a rooster, two chicks and a cat', () => {
    expect(state.animals.map((a) => a.kind).sort()).toEqual([
      'cat',
      'chick',
      'chick',
      'chicken',
      'chicken',
      'chicken',
      'rooster',
    ]);
  });

  it('chickens keep to their run; the cat to the village; nobody stands in anything solid', () => {
    const run = new Set(chickenRun(state.world)?.tiles ?? []);
    expect(run.size).toBeGreaterThan(0);
    for (const animal of state.animals) {
      const tile = tileOf(state, animal);
      if (isPoultry(animal.kind)) expect(run.has(tile), animal.kind).toBe(true);
      else expect(state.villageHome.has(tile)).toBe(true);
      expect(state.world.blocked[tile]).toBe(0);
    }
  });

  it('wander about (not frozen) and do the same for the same island', () => {
    const again = simulate(40);
    expect(again.animals.map((a) => [a.x, a.y])).toEqual(state.animals.map((a) => [a.x, a.y]));
    const start = createGameState(generateValidWorld(46), ISLAND_CONFIG);
    const moved = state.animals.some((a, i) => {
      const before = start.animals[i];
      return before !== undefined && (a.x !== before.x || a.y !== before.y);
    });
    expect(moved).toBe(true);
  });

  it('the chicks keep close to their mother', () => {
    const later = simulate(70);
    const chicks = later.animals.filter((a) => a.kind === 'chick');
    expect(chicks).toHaveLength(2);
    for (const chick of chicks) {
      const mother = later.animals.find((a) => a.id === chick.follows);
      if (!mother) throw new Error('no mother');
      expect(mother.kind).toBe('chicken');
      expect(Math.hypot(chick.x - mother.x, chick.y - mother.y)).toBeLessThan(2.5 * TILE);
    }
  });

  it('the hens visit the trough and the dish, and turn to face them', () => {
    const busyConfig = {
      ...ISLAND_CONFIG,
      animals: { ...ISLAND_CONFIG.animals, choreChance: 1 },
    };
    const busy = createGameState(generateValidWorld(46), busyConfig);
    Object.assign(busy, { timeOfDay: 0.4 });
    const hen = busy.animals.find((a) => a.kind === 'chicken');
    if (!hen) throw new Error('no hen');
    expect(hen.chores.length).toBe(2);
    let atChore = false;
    for (let i = 0; i < 40 / STEP && !atChore; i++) {
      stepGame(busy, STEP, busyConfig);
      atChore = hen.chores.some(
        (c) => !hen.target && Math.hypot(c.x - hen.x, c.y - hen.y) < 1 && hen.facing === c.facing,
      );
    }
    expect(atChore).toBe(true);
  });

  it('the rooster stands still to crow at dawn', () => {
    const [from] = ISLAND_CONFIG.animals.crowTimes[0] ?? [0.215];
    expect(roosterCrowing(from, ISLAND_CONFIG.animals)).toBe(true);
    expect(roosterCrowing(0.5, ISLAND_CONFIG.animals)).toBe(false);
    const dawn = simulate(2, from);
    const rooster = dawn.animals.find((a) => a.kind === 'rooster');
    if (!rooster) throw new Error('no rooster');
    expect(rooster.target).toBeNull();
  });

  it('at night the chickens go into the hen house and the cat sleeps on its doorstep', () => {
    const night = simulate(60, 0.9);
    for (const animal of night.animals) {
      if (isPoultry(animal.kind)) expect(animal.hidden, animal.kind).toBe(true);
      else expect(animal.pose).toBe('sleep');
    }
  });
});
