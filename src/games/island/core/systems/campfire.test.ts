import { describe, expect, it } from 'vitest';
import { ISLAND_CONFIG } from '../config';
import { createGameState, stepGame } from '../game/gameState';
import { campfireEvening, campfireLit } from './campfire';
import { sitOn } from './seat';
import { makeTestWorld, TEST_TILE } from './testWorld';

const settings = ISLAND_CONFIG.campfire;

describe('the campfire', () => {
  it('burns from dusk round to dawn', () => {
    const [from, to] = settings.litTimes;
    expect(campfireLit(from, settings)).toBe(true);
    expect(campfireLit(0.95, settings)).toBe(true);
    expect(campfireLit(to - 0.01, settings)).toBe(true);
    expect(campfireLit(0.5, settings)).toBe(false);
  });

  it('brings the village round it every few evenings, starting with the first', () => {
    expect(campfireEvening(0, settings)).toBe(true);
    expect(campfireEvening(1, settings)).toBe(settings.everyDays === 1);
    expect(campfireEvening(settings.everyDays, settings)).toBe(true);
    expect(campfireEvening(0, { ...settings, everyDays: 0 })).toBe(false);
  });

  it('counts the days at midnight', () => {
    const world = makeTestWorld(Array.from({ length: 4 }, () => ',,,,'));
    const state = createGameState(world, ISLAND_CONFIG);
    state.timeOfDay = 0.9999999;
    stepGame(state, 1, ISLAND_CONFIG);
    expect(state.day).toBe(1);
  });
});

describe('seats round the campfire', () => {
  const world = makeTestWorld(
    Array.from({ length: 8 }, () => ',,,,,,,,'),
    [
      { kind: 'log_bench', x: 3, y: 1 },
      { kind: 'log_stool_right', x: 2, y: 3 },
      { kind: 'campfire', x: 3, y: 3 },
      { kind: 'log_stool_left', x: 5, y: 3 },
    ],
  );
  const find = (kind: string) => {
    const object = world.objects.find((o) => o.kind === kind);
    if (!object) throw new Error(kind);
    return object;
  };

  it('the stools face the fire; the log faces the viewer', () => {
    const state = createGameState(world, ISLAND_CONFIG);
    sitOn(state.player, find('log_stool_right'), TEST_TILE);
    expect(state.player.facing).toBe('right');
    sitOn(state.player, find('log_stool_left'), TEST_TILE);
    expect(state.player.facing).toBe('left');
    sitOn(state.player, find('log_bench'), TEST_TILE);
    expect(state.player.facing).toBe('down');
  });

  it('two never share a spot: the next one along, or none left', () => {
    const state = createGameState(world, ISLAND_CONFIG);
    const a = { ...state.player, sitting: null };
    const b = { ...state.player, sitting: null };
    const c = { ...state.player, sitting: null };
    const log = find('log_bench');
    expect(sitOn(a, log, TEST_TILE)).toBe(true);
    expect(sitOn(b, log, TEST_TILE, [a])).toBe(true);
    expect(b.x).not.toBe(a.x);
    expect(sitOn(c, log, TEST_TILE, [a, b])).toBe(false);
    expect(c.sitting).toBeNull();
  });
});
