import { describe, expect, it } from 'vitest';
import { pressKey, releaseKey } from '@/shared/engine/input';
import { ISLAND_CONFIG } from '../config';
import { createPlayer, type Direction } from '../entities/player';
import { createGameState, stepGame } from '../game/gameState';
import { ISLAND_KEY_BINDINGS } from './controls';
import { createVillager } from '../entities/villager';
import { HEN_HOUSE_LINES } from '../content/guidance';
import { dayPhase } from './dayNight';
import { findInteractTarget } from './interaction';
import { areaTiles, makeTestWorld, TEST_TILE } from './testWorld';

const STEP = 1 / 60;
const SETTINGS = {
  ...ISLAND_CONFIG.player,
  ...ISLAND_CONFIG.interaction,
  villagerPages: () => ['Hi!'],
  signPages: () => ['A sign'],
};
/** A meadow with a mailbox at (2, 1) and a rock at (4, 1). */
const world = makeTestWorld(
  Array.from({ length: 5 }, () => ',,,,,,'),
  [
    { kind: 'mailbox', x: 2, y: 1 },
    { kind: 'rock', x: 4, y: 1 },
  ],
);

function playerAt(
  tileX: number,
  tileY: number,
  facing: Direction,
): ReturnType<typeof createPlayer> {
  const player = createPlayer({ x: tileX, y: tileY }, TEST_TILE);
  player.facing = facing;
  return player;
}

function tapSpace(state: ReturnType<typeof createGameState>): void {
  pressKey(state.input, ISLAND_KEY_BINDINGS, 'Space');
  stepGame(state, STEP, ISLAND_CONFIG);
  releaseKey(state.input, ISLAND_KEY_BINDINGS, 'Space');
}

describe('interaction', () => {
  it('finds the mailbox when standing next to it and facing it', () => {
    const target = findInteractTarget(world, playerAt(2, 2, 'up'), [], SETTINGS, TEST_TILE);
    expect(target?.kind === 'object' && target.object.kind).toBe('mailbox');
    expect(target?.pages).toEqual(["It's empty."]);
  });

  it('finds nothing when facing away or when the thing has nothing to say', () => {
    expect(findInteractTarget(world, playerAt(2, 2, 'down'), [], SETTINGS, TEST_TILE)).toBeNull();
    expect(findInteractTarget(world, playerAt(4, 2, 'up'), [], SETTINGS, TEST_TILE)).toBeNull();
  });

  it('opens the message with Space, holds the player still, and closes it with Space', () => {
    const state = createGameState(world, ISLAND_CONFIG);
    Object.assign(state.player, playerAt(2, 2, 'up'));
    stepGame(state, STEP, ISLAND_CONFIG);
    const target = state.interactTarget;
    expect(target?.kind === 'object' && target.object.kind).toBe('mailbox');

    tapSpace(state);
    expect(state.dialog).toEqual({ pages: ["It's empty."], page: 0 });

    const y = state.player.y;
    pressKey(state.input, ISLAND_KEY_BINDINGS, 'ArrowDown');
    for (let i = 0; i < 10; i++) stepGame(state, STEP, ISLAND_CONFIG);
    expect(state.player.y).toBe(y);
    releaseKey(state.input, ISLAND_KEY_BINDINGS, 'ArrowDown');

    tapSpace(state);
    expect(state.dialog).toBeNull();
  });

  it('ignores Space with nothing in reach', () => {
    const state = createGameState(world, ISLAND_CONFIG);
    Object.assign(state.player, playerAt(0, 4, 'right'));
    tapSpace(state);
    expect(state.dialog).toBeNull();
  });

  it('talks to a villager in front of the player', () => {
    const villager = createVillager(
      0,
      0,
      { x: 2, y: 3 },
      areaTiles({ left: 0, top: 0, right: 5, bottom: 4 }, 6),
      TEST_TILE,
    );
    const target = findInteractTarget(
      world,
      playerAt(1, 3, 'right'),
      [villager],
      SETTINGS,
      TEST_TILE,
    );
    expect(target?.kind).toBe('villager');
    expect(target?.pages).toEqual(['Hi!']);
  });
});

describe('the hen house', () => {
  it('says what the hens are up to at this time of day', () => {
    const coopWorld = makeTestWorld(
      Array.from({ length: 6 }, () => ',,,,,,'),
      [{ kind: 'chicken_coop', x: 2, y: 1 }],
    );
    for (const time of [0.4, 0.95]) {
      const state = createGameState(coopWorld, ISLAND_CONFIG);
      state.timeOfDay = time;
      Object.assign(state.player, playerAt(2, 3, 'up'));
      stepGame(state, STEP, ISLAND_CONFIG);
      tapSpace(state);
      expect(state.dialog?.pages).toEqual([HEN_HOUSE_LINES[dayPhase(time)]]);
    }
  });
});
