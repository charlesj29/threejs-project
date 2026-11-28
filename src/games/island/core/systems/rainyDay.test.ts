import { describe, expect, it } from 'vitest';
import { ISLAND_CONFIG } from '../config';
import { createVillager } from '../entities/villager';
import { rainyActivity, wearsRaincoat } from './rainyDay';

describe('a rainy day in the village', () => {
  it('sends the keeper home, the baker under the awning, and lets the night owl carry on', () => {
    expect(rainyActivity('keeper', 'sweep', true)).toBe('home');
    expect(rainyActivity('baker', 'wander', true)).toBe('shelter');
    expect(rainyActivity('baker', 'wander', false)).toBe('home');
    expect(rainyActivity('owl', 'fish', true)).toBe('fish');
    expect(rainyActivity('owl', 'home', true)).toBe('home');
  });

  it('puts a raincoat on whoever stays out in the rain', () => {
    const v = createVillager(0, 1, { x: 3, y: 3 }, [], ISLAND_CONFIG.map.tileSizePx, 'owl');
    v.activity = 'fish';
    expect(wearsRaincoat(v, true)).toBe(true);
    expect(wearsRaincoat(v, false)).toBe(false);
    v.activity = 'shelter';
    expect(wearsRaincoat(v, true)).toBe(false);
    // Soaking in the hot spring, the rain is just part of it.
    v.activity = 'soak';
    expect(wearsRaincoat(v, true)).toBe(false);
  });
});
