import { describe, expect, it } from 'vitest';
import { ISLAND_CONFIG } from '../config';
import { generateValidWorld } from '../generation/testUtils';
import { buildInteriorWorld, INTERIORS } from '../world/interiors';
import { getTileDefinition } from '../world/tiles';
import { groundAt, seaDistances, soundscapeLevels, villageDistances } from './soundscape';

const TILE = ISLAND_CONFIG.map.tileSizePx;
const settings = ISLAND_CONFIG.ambience;
const island = generateValidWorld(46);
const sea = { sea: seaDistances(island), village: villageDistances(island) };

/** The centre of a tile that is (or isn't) right by the sea. */
function spot(bySea: boolean): { x: number; y: number } {
  for (let i = 0; i < island.terrain.length; i++) {
    const land = getTileDefinition(island.terrain[i] ?? 0).waterBody === null;
    if (!land) continue;
    const steps = sea.sea[i] ?? 0;
    if (bySea ? steps === 1 : steps > settings.waves.farTiles) {
      return {
        x: ((i % island.width) + 0.5) * TILE,
        y: (Math.floor(i / island.width) + 0.5) * TILE,
      };
    }
  }
  throw new Error('no such spot');
}

describe('soundscape', () => {
  it('hears wind chimes and voices in the village by day, only chimes at night', () => {
    const gate = island.village?.gate;
    if (!gate) throw new Error('no village');
    const where = { world: island, x: (gate.x + 0.5) * TILE, y: (gate.y + 0.5) * TILE };
    const day = soundscapeLevels(where, 0, 0, sea, settings, TILE);
    const night = soundscapeLevels(where, 1, 0, sea, settings, TILE);
    expect(day.chimes).toBe(1);
    expect(day.chatter).toBe(1);
    expect(night.chimes).toBe(1);
    expect(night.chatter).toBe(0);
    const far = soundscapeLevels({ world: island, ...spot(true) }, 0, 0, sea, settings, TILE);
    expect(far.chatter).toBeLessThan(day.chatter);
  });

  it('knows the ground underfoot', () => {
    const tileOf = (id: number): { x: number; y: number } => {
      const i = island.terrain.indexOf(id);
      return {
        x: ((i % island.width) + 0.5) * TILE,
        y: (Math.floor(i / island.width) + 0.5) * TILE,
      };
    };
    const at = (p: { x: number; y: number }): string => groundAt(island, p.x, p.y, TILE);
    expect(at(tileOf(6))).toBe('path');
    expect(at(tileOf(3))).toBe('grass');
    expect(at(tileOf(2))).toBe('sand');
    expect(at(tileOf(7))).toBe('wood');
  });

  it('has loud surf by the sea and only a distant murmur inland', () => {
    const beach = soundscapeLevels({ world: island, ...spot(true) }, 0, 0, sea, settings, TILE);
    const inland = soundscapeLevels({ world: island, ...spot(false) }, 0, 0, sea, settings, TILE);
    expect(beach.waves).toBe(1);
    expect(inland.waves).toBe(settings.waves.floor);
  });

  it('has birds by day and crickets at night; rain quietens them', () => {
    const where = { world: island, ...spot(false) };
    const day = soundscapeLevels(where, 0, 0, sea, settings, TILE);
    const night = soundscapeLevels(where, 1, 0, sea, settings, TILE);
    const rainyDay = soundscapeLevels(where, 0, 1, sea, settings, TILE);
    expect(day).toMatchObject({ birds: 1, crickets: 0, rain: 0, fire: 0 });
    expect(night).toMatchObject({ birds: 0, crickets: 1 });
    expect(rainyDay).toMatchObject({ birds: 0, rain: 1 });
  });

  it('muffles the outside indoors and lets you hear the fire, loudest beside it', () => {
    const definition = INTERIORS.cottage;
    if (!definition) throw new Error('no cottage');
    const cottage = buildInteriorWorld(definition);
    const fireplace = cottage.objects.find((o) => o.kind === 'fireplace');
    if (!fireplace) throw new Error('no fireplace');
    const byFire = { world: cottage, x: (fireplace.x + 1) * TILE, y: (fireplace.y + 1.5) * TILE };
    const farCorner = { world: cottage, x: 12.5 * TILE, y: 8.5 * TILE };
    const near = soundscapeLevels(byFire, 0, 1, sea, settings, TILE);
    const far = soundscapeLevels(farCorner, 0, 1, sea, settings, TILE);
    expect(near.fire).toBe(1);
    expect(far.fire).toBeLessThan(near.fire);
    expect(far.fire).toBeGreaterThan(0);
    expect(near.birds).toBe(0);
    expect(near.rain).toBeLessThan(1);
    expect(near.waves).toBeLessThan(settings.waves.floor);
  });

  it('bubbles by the hot spring, fading out as you walk away (and not indoors)', () => {
    const spring = island.objects.find((o) => o.kind === 'hot_spring');
    if (!spring) throw new Error('no hot spring');
    const middle = { x: (spring.x + 2) * TILE, y: (spring.y + 1.5) * TILE };
    const near = soundscapeLevels({ world: island, ...middle }, 0, 0, sea, settings, TILE);
    const away = {
      world: island,
      x: middle.x,
      y: middle.y + (settings.spring.farTiles + 1) * TILE,
    };
    expect(near.spring).toBe(1);
    expect(soundscapeLevels(away, 0, 0, sea, settings, TILE).spring).toBe(0);
    const definition = INTERIORS.cottage;
    if (!definition) throw new Error('no cottage');
    const indoors = { world: buildInteriorWorld(definition), x: 3 * TILE, y: 3 * TILE };
    expect(soundscapeLevels(indoors, 0, 0, sea, settings, TILE).spring).toBe(0);
  });
});
