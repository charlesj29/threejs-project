import { describe, expect, it } from 'vitest';
import { OBJECT_KINDS, OBJECT_REGISTRY } from '../core/world/objects';
import { TILE_DEFINITIONS } from '../core/world/tiles';
import { cliffPieceKey } from './paintCliff';
import { createIslandAtlas, paintIslandSprites } from './islandSprites';
import { TILE_PX } from './paint';
import { PLAYER_FRAME_COUNT } from '../core/systems/animation';
import { ANIMAL_FRAME_COUNT } from './paintAnimals';
import { RABBIT_FRAME_COUNT } from './paintRabbits';
import { DUCK_FRAME_COUNT, DUCK_KEYS, DUCKLING_FRAME_COUNT } from './paintDucks';
import { BUTTERFLY_FRAME_COUNT } from './paintInsects';
import { BIRD_FRAME_COUNT } from './paintBirds';
import { KID_FRAME_COUNT } from './paintPlaymates';
import { DOG_FRAME_COUNT } from './paintPuppy';
import { SLEEPING_CAT_FRAME_COUNT, SLEEPING_CAT_KEY } from './paintCat';
import { BROOM_FRAME_COUNT, CHORE_KEYS } from './paintChoreProps';
import { LAUNDRY_FRAME_COUNT, LAUNDRY_KEY } from './paintLaundry';
import { FIRE_FRAME_COUNT } from './paintFurniture';
import { FLOWER_FRAME_COUNT } from './paintObjects';
import { fenceSpriteKey } from './paintStructures';
import { WATER_FRAME_COUNT } from './paintTiles';
import { EDGE_MATERIALS } from './paintTransitions';

describe('island sprites', () => {
  const atlas = createIslandAtlas();

  it('has a sprite (or variants) for every tile in the registry', () => {
    for (const tile of TILE_DEFINITIONS) {
      if (tile.underlay !== undefined) continue; // drawn via orientation-specific sprites
      for (const key of atlas.variants(tile.spriteKey)) {
        expect(atlas.has(key), key).toBe(true);
        expect(atlas.frame(key).width).toBe(TILE_PX);
        expect(atlas.frame(key).height).toBe(TILE_PX);
      }
    }
    expect(atlas.has('tile_dock_h')).toBe(true);
    expect(atlas.has('tile_dock_v')).toBe(true);
  });

  it('has a sprite (or variants) for every object kind', () => {
    for (const kind of OBJECT_KINDS) {
      const keys = atlas.variants(OBJECT_REGISTRY[kind].spriteKey);
      for (const key of keys) expect(atlas.has(key), key).toBe(true);
    }
  });

  it('sizes standing sprites to their footprint plus height above it', () => {
    expect(atlas.frame('tree_oak.0')).toMatchObject({ width: 32, height: 32 });
    expect(atlas.frame('tree_pine.0')).toMatchObject({ width: 32, height: 32 });
    expect(atlas.frame('tree_small.0')).toMatchObject({ width: 16, height: 32 });
    expect(atlas.frame('bush.0')).toMatchObject({ width: 16, height: 16 });
    expect(atlas.frame('mailbox')).toMatchObject({ width: 16, height: 24 });
    expect(atlas.frame('cabin')).toMatchObject({ width: 96, height: 80 });
    expect(atlas.frame('tree_giant.0')).toMatchObject({ width: 48, height: 48 });
    expect(atlas.frame('rock.0')).toMatchObject({ width: 16, height: 16 });
  });

  it('has two variants of every shoreline overlay for every edge material', () => {
    for (const material of EDGE_MATERIALS) {
      const pieces = [
        ...['n', 'e', 's', 'w'].map((d) => `edge_${material}_${d}`),
        ...['ne', 'se', 'sw', 'nw'].map((d) => `corner_${material}_${d}`),
      ];
      for (const piece of pieces) {
        const variants = atlas.variants(piece);
        expect(variants, piece).toHaveLength(2);
        for (const key of variants) expect(atlas.has(key), key).toBe(true);
      }
    }
  });

  it('has several grass variants so meadows do not repeat', () => {
    expect(atlas.variants('tile_grass').length).toBeGreaterThanOrEqual(4);
  });

  it('paints cast shadows, mist and glows semi-transparent and everything else with hard alpha', () => {
    for (const source of paintIslandSprites()) {
      const alphas = new Set<number>();
      for (const frame of source.frames) {
        for (let i = 3; i < frame.data.length; i += 4) alphas.add(frame.data[i] ?? 0);
      }
      const partial = [...alphas].filter((a) => a > 0 && a < 255);
      const soft = ['shadow_', 'mist_', 'glow_'].some((prefix) => source.key.startsWith(prefix));
      if (soft) expect(partial.length, source.key).toBeGreaterThan(0);
      else expect(partial, source.key).toEqual([]);
    }
  });

  it('animates only water, flowers, characters, the fire, animals, rabbits, ducks, butterflies, the cat, the broom and the washing, each with its frame count', () => {
    for (const source of paintIslandSprites()) {
      const isWater = /^tile_(deep_sea|shallow_sea|lake_water|lake_shallow)\./.test(source.key);
      const isFlower = /^flower_(red|yellow|blue|white)$/.test(source.key);
      const isPlayer = source.key.startsWith('player_') || source.key.startsWith('villager_');
      const isFire = /^fireplace(_small)?(_lights)?$/.test(source.key);
      const isAnimal = source.key.startsWith('animal_');
      const isRabbit = source.key.startsWith('rabbit_');
      const isButterfly = source.key.startsWith('butterfly_');
      const isBird = source.key.startsWith('bird_');
      const isKid = source.key.startsWith('kid_');
      const expected = isWater
        ? WATER_FRAME_COUNT
        : isFlower
          ? FLOWER_FRAME_COUNT
          : isPlayer
            ? PLAYER_FRAME_COUNT
            : isFire
              ? FIRE_FRAME_COUNT
              : isAnimal
                ? ANIMAL_FRAME_COUNT
                : isRabbit
                  ? RABBIT_FRAME_COUNT
                  : isKid
                    ? KID_FRAME_COUNT
                    : source.key.startsWith('dog_')
                      ? DOG_FRAME_COUNT
                      : isBird
                        ? BIRD_FRAME_COUNT
                        : isButterfly
                          ? BUTTERFLY_FRAME_COUNT
                          : source.key === DUCK_KEYS.mother
                            ? DUCK_FRAME_COUNT
                            : source.key === DUCK_KEYS.duckling
                              ? DUCKLING_FRAME_COUNT
                              : source.key === SLEEPING_CAT_KEY
                                ? SLEEPING_CAT_FRAME_COUNT
                                : source.key === CHORE_KEYS.broom
                                  ? BROOM_FRAME_COUNT
                                  : source.key === LAUNDRY_KEY
                                    ? LAUNDRY_FRAME_COUNT
                                    : 1;
      expect(source.frames.length, source.key).toBe(expected);
    }
  });

  it('has a rocky ledge piece for every combination of neighbours', () => {
    const sides = ['ledge', 'grass', 'sand'] as const;
    for (const west of sides) {
      for (const east of sides) {
        const key = cliffPieceKey(west, east);
        expect(atlas.variants(key)[0], key).not.toBe(key);
      }
    }
  });

  it('has a fence piece for every connection pattern', () => {
    for (let mask = 0; mask < 16; mask++) {
      const key = fenceSpriteKey(!!(mask & 1), !!(mask & 2), !!(mask & 4), !!(mask & 8));
      expect(atlas.has(key), key).toBe(true);
    }
  });

  it('paints identical pixels every time', () => {
    const first = paintIslandSprites();
    const second = paintIslandSprites();
    expect(second.map((s) => s.frames.map((f) => [...f.data]))).toEqual(
      first.map((s) => s.frames.map((f) => [...f.data])),
    );
  });
});
