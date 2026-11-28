import { describe, expect, it } from 'vitest';
import { toIndex } from '@/shared/engine/grid';
import { ISLAND_CONFIG } from '../../config';
import { OBJECT_REGISTRY } from '../../world/objects';
import { getTileDefinition, TileId } from '../../world/tiles';
import { createInitialContext } from '../context';
import { GENERATION_STEPS } from '../pipeline';
import { generateValidWorld } from '../testUtils';
import { validateGeneration } from '../validate';
import { CAMPFIRE_PATCH, placeCampfire } from './placeCampfire';

describe('the beach campfire', () => {
  it.each([46, 1, 2, 3, 7, 12])(
    'a fire ring with a log seat and two stools, on a sandy patch by the sea (seed %i)',
    (seed) => {
      const world = generateValidWorld(seed);
      const fire = world.objects.find((o) => o.kind === 'campfire');
      if (!fire) throw new Error('no campfire');
      const left = fire.x - 1;
      const top = fire.y - 2;
      const at = (kind: string, x: number, y: number): boolean =>
        world.objects.some((o) => o.kind === kind && o.x === x && o.y === y);
      expect(at('log_bench', left + 1, top)).toBe(true);
      expect(at('log_stool_right', left, top + 2)).toBe(true);
      expect(at('log_stool_left', left + 3, top + 2)).toBe(true);
      // The patch is sand (or trail), and the sea is close by.
      let sea = false;
      for (let y = top - 6; y < top + CAMPFIRE_PATCH.height + 6; y++) {
        for (let x = left - 6; x < left + CAMPFIRE_PATCH.width + 6; x++) {
          const tile = world.terrain[toIndex(world, x, y)] ?? 0;
          sea ||= getTileDefinition(tile).waterBody === 'sea';
          const inPatch =
            x >= left &&
            y >= top &&
            x < left + CAMPFIRE_PATCH.width &&
            y < top + CAMPFIRE_PATCH.height;
          if (inPatch) expect([TileId.Sand, TileId.Path]).toContain(tile);
        }
      }
      expect(sea).toBe(true);
      // The spots in front of the seats are open.
      for (const [x, y] of [
        [left + 1, top + 1],
        [left + 2, top + 1],
        [left, top + 3],
        [left + 3, top + 3],
      ] as const) {
        expect(world.blocked[toIndex(world, x, y)]).toBe(0);
      }
    },
  );

  it('is added near the end: only its patch (and a sandy strip to the beach) changes', () => {
    const steps = GENERATION_STEPS.filter((step) => step !== placeCampfire);
    const without = steps.reduce((c, step) => step(c), createInitialContext(46, ISLAND_CONFIG));
    const withFire = GENERATION_STEPS.reduce(
      (c, step) => step(c),
      createInitialContext(46, ISLAND_CONFIG),
    );
    const fire = withFire.objects.find((o) => o.kind === 'campfire');
    if (!fire) throw new Error('no campfire');
    const left = fire.x - 1;
    const top = fire.y - 2;
    const inPatch = (x: number, y: number): boolean =>
      x >= left && y >= top && x < left + CAMPFIRE_PATCH.width && y < top + CAMPFIRE_PATCH.height;
    const where = (objects: readonly { kind: string; x: number; y: number }[]): string[] =>
      objects.map((o) => `${o.kind}@${String(o.x)},${String(o.y)}`);
    expect(where(withFire.objects.filter((o) => !inPatch(o.x, o.y)))).toEqual(
      where(without.objects.filter((o) => !inPatch(o.x, o.y))),
    );
    for (const o of without.objects.filter((o) => inPatch(o.x, o.y))) {
      expect(['flower', 'grass', 'ground']).toContain(OBJECT_REGISTRY[o.kind].category);
    }
    withFire.terrain.forEach((tile, i) => {
      const x = i % withFire.size.width;
      const y = Math.floor(i / withFire.size.width);
      if (inPatch(x, y) || tile === without.terrain[i]) return;
      // Outside the patch only grass near it turns to sand (the strip down to the beach).
      expect([without.terrain[i], tile]).toEqual([TileId.Grass, TileId.Sand]);
      expect(Math.abs(x - (left + 1.5)) + Math.abs(y - (top + 1.5))).toBeLessThan(14);
    });
    expect(withFire.spawn).toEqual(without.spawn);
  });

  it('is required: an island without one does not pass validation', () => {
    const steps = GENERATION_STEPS.filter((step) => step !== placeCampfire);
    const without = steps.reduce((c, step) => step(c), createInitialContext(46, ISLAND_CONFIG));
    expect(validateGeneration(without).map((issue) => issue.code)).toContain('campfire-missing');
  });
});
