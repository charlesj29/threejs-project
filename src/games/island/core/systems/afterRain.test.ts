import { describe, expect, it } from 'vitest';
import { createRng } from '@/shared/engine/random';
import { ISLAND_CONFIG } from '../config';
import { generateValidWorld } from '../generation/testUtils';
import { wanderTiles } from '../world/village';
import { birdAreas } from './birdAreas';
import { createBirds, updateBird } from './birds';
import { tileOf } from './playmateMotion';
import { createPlaymates, updatePlaymates } from './playmates';
import { villagePuddles, wetness } from './puddles';
import { roamTiles } from './routine';
import { NO_RAIN_YET, type Weather } from './weather';

const TILE = ISLAND_CONFIG.map.tileSizePx;
const settings = ISLAND_CONFIG.afterRain;
const world = generateValidWorld(46);
const roam = roamTiles(world);
const weather = (w: Partial<Weather>): Weather => ({
  raining: false,
  timeLeft: 10,
  intensity: 0,
  sinceRain: NO_RAIN_YET,
  showers: 0,
  ...w,
});

describe('after the rain', () => {
  it('puddles fill with the rain and dry up slowly afterwards', () => {
    expect(wetness(weather({}), settings)).toBe(0);
    expect(wetness(weather({ raining: true, intensity: 1, sinceRain: 0 }), settings)).toBe(1);
    const drying = wetness(weather({ sinceRain: settings.drySeconds / 2 }), settings);
    expect(drying).toBeCloseTo(0.5);
    expect(wetness(weather({ sinceRain: settings.drySeconds + 1 }), settings)).toBe(0);
  });

  it('form on the village paths', () => {
    const spots = villagePuddles(world, wanderTiles(world), settings);
    expect(spots.length).toBe(settings.villagePuddles);
  });

  it('the kid goes splashing in a puddle in the field', () => {
    const p = createPlaymates(world, roam, ISLAND_CONFIG.playmates, TILE, settings.fieldPuddles);
    if (!p) throw new Error('no playmates');
    expect(p.puddles.length).toBe(settings.fieldPuddles);
    const rng = createRng(3);
    let splashed = false;
    for (let i = 0; i < 60 * 60; i++) {
      updatePlaymates(p, null, 0.5, rng, 1 / 60, ISLAND_CONFIG.playmates, false, [], 1);
      if (p.mode === 'splash' && p.splashAt !== null && tileOf(p.kid, p.ground) === p.splashAt) {
        splashed = true;
      }
    }
    expect(splashed).toBe(true);
  });

  it('the birds sing as they come out from shelter', () => {
    const areas = birdAreas(world, roam, ISLAND_CONFIG.birds.areaRadiusTiles);
    const [bird] = createBirds(world, areas, createRng(4), ISLAND_CONFIG.birds, TILE);
    if (!bird) throw new Error('no bird');
    const rng = createRng(5);
    const step = (raining: boolean): void =>
      updateBird(
        bird,
        world,
        bird.homeSet,
        bird.home,
        null,
        rng,
        1 / 60,
        ISLAND_CONFIG.birds,
        TILE,
        raining,
      );
    for (let i = 0; i < 60 * 20; i++) step(true);
    expect(bird.idle).toBe('huddle');
    step(false);
    expect(bird.song).toBeGreaterThan(0);
  });
});
