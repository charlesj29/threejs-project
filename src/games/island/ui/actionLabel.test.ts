import { describe, expect, it } from 'vitest';
import { ISLAND_CONFIG } from '../core/config';
import { createGameState } from '../core/game/gameState';
import { makeTestWorld } from '../core/systems/testWorld';
import { actionLabel } from './actionLabel';

const world = makeTestWorld(
  Array.from({ length: 6 }, () => ',,,,,,'),
  [
    { kind: 'sign', x: 2, y: 2 },
    { kind: 'bench', x: 4, y: 2 },
  ],
);

describe('actionLabel', () => {
  const state = createGameState(world, ISLAND_CONFIG);

  it('says nothing with nothing in reach', () => {
    expect(actionLabel(state)).toBeNull();
  });

  it('reads signs, sits on benches, stands up, and pages through messages', () => {
    const sign = state.world.objects.find((o) => o.kind === 'sign');
    const bench = state.world.objects.find((o) => o.kind === 'bench');
    if (!sign || !bench) throw new Error('test world');
    state.interactTarget = { kind: 'object', object: sign, pages: ['A sign'] };
    expect(actionLabel(state)).toBe('Read');
    state.interactTarget = { kind: 'object', object: bench, pages: [], sit: true };
    expect(actionLabel(state)).toBe('Sit');
    state.player.sitting = { standX: 0, standY: 0, soaking: false };
    expect(actionLabel(state)).toBe('Stand');
    state.player.sitting = { standX: 0, standY: 0, soaking: true };
    expect(actionLabel(state)).toBe('Get out');
    state.player.sitting = null;
    state.dialog = { pages: ['one', 'two'], page: 0 };
    expect(actionLabel(state)).toBe('Next');
    state.dialog.page = 1;
    expect(actionLabel(state)).toBe('Close');
  });
});
