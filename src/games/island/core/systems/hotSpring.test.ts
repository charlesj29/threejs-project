import { describe, expect, it } from 'vitest';
import { pressKey, releaseKey } from '@/shared/engine/input';
import { ISLAND_CONFIG } from '../config';
import { createGameState, stepGame, type GameState } from '../game/gameState';
import { PLAYER_FRAMES, playerFrameIndex } from './animation';
import { ISLAND_KEY_BINDINGS } from './controls';
import { SOAK_SEATS_PX, sitOn, standUp } from './seat';
import { makeTestWorld, TEST_TILE } from './testWorld';

const STEP = 1 / 60;
/** A meadow with the hot spring at (2, 2)–(5, 4). */
const world = makeTestWorld(
  Array.from({ length: 9 }, () => ',,,,,,,,,'),
  [{ kind: 'hot_spring', x: 2, y: 2 }],
);
const spring = world.objects[0];
const seat = (i: number): { x: number; y: number } => {
  const s = SOAK_SEATS_PX[i];
  if (!s) throw new Error('no seat');
  return { x: 2 * TEST_TILE + s.x, y: 2 * TEST_TILE + s.y };
};

function press(state: GameState, code: string): void {
  pressKey(state.input, ISLAND_KEY_BINDINGS, code);
  stepGame(state, STEP, ISLAND_CONFIG);
  releaseKey(state.input, ISLAND_KEY_BINDINGS, code);
}

/** Standing below the pool's right half, facing it. */
function belowTheSpring(): GameState {
  const state = createGameState(world, ISLAND_CONFIG);
  Object.assign(state.player, { x: 4.5 * TEST_TILE, y: 5.4 * TEST_TILE, facing: 'up' });
  stepGame(state, STEP, ISLAND_CONFIG);
  return state;
}

describe('soaking in the hot spring', () => {
  it('Space steps into the nearest seat in the water, facing out, sitting', () => {
    const state = belowTheSpring();
    press(state, 'Space');
    expect(state.player.sitting?.soaking).toBe(true);
    expect({ x: state.player.x, y: state.player.y }).toEqual(seat(1));
    expect(state.player.facing).toBe('down');
    expect(playerFrameIndex(state.player, ISLAND_CONFIG.player)).toBe(PLAYER_FRAMES.sit);
  });

  it('Space climbs out again, back where they stood', () => {
    const state = belowTheSpring();
    const before = { x: state.player.x, y: state.player.y };
    press(state, 'Space');
    press(state, 'Space');
    expect(state.player.sitting).toBeNull();
    expect({ x: state.player.x, y: state.player.y }).toEqual(before);
  });

  it('two never share a seat: the second takes the other one', () => {
    if (!spring) throw new Error('no spring');
    const state = belowTheSpring();
    const villager = state.villagers[0] ?? { ...state.player, sitting: null };
    Object.assign(villager, { x: state.player.x, y: state.player.y });
    sitOn(villager, spring, TEST_TILE);
    expect({ x: villager.x, y: villager.y }).toEqual(seat(1));
    sitOn(state.player, spring, TEST_TILE, [villager]);
    expect({ x: state.player.x, y: state.player.y }).toEqual(seat(0));
    standUp(villager);
    expect(villager.sitting).toBeNull();
  });

  it('a bench is still a bench (not a soak)', () => {
    const benchWorld = makeTestWorld(
      Array.from({ length: 6 }, () => ',,,,,,'),
      [{ kind: 'bench', x: 2, y: 2 }],
    );
    const state = createGameState(benchWorld, ISLAND_CONFIG);
    const bench = benchWorld.objects[0];
    if (!bench) throw new Error('no bench');
    sitOn(state.player, bench, TEST_TILE);
    expect(state.player.sitting?.soaking).toBe(false);
  });
});
