import { describe, expect, it } from 'vitest';
import { toIndex } from '@/shared/engine/grid';
import { ISLAND_CONFIG } from '../../config';
import { OBJECT_REGISTRY } from '../../world/objects';
import { isWalkableTile } from '../../world/tiles';
import { villageTiles } from '../../world/village';
import { createInitialContext } from '../context';
import { GENERATION_STEPS } from '../pipeline';
import { generateValidWorld } from '../testUtils';
import { validateGeneration } from '../validate';
import { placeHotSpring } from './placeHotSpring';

const POOL = OBJECT_REGISTRY.hot_spring.footprint;

describe('the hot spring', () => {
  it.each([46, 1, 2, 3, 7, 12])(
    'a pool with a stone lantern, away from the village, with open ground round it (seed %i)',
    (seed) => {
      const world = generateValidWorld(seed);
      const springs = world.objects.filter((o) => o.kind === 'hot_spring');
      expect(springs).toHaveLength(1);
      const spring = springs[0];
      if (!spring) throw new Error('no hot spring');
      const lantern = world.objects.find((o) => o.kind === 'stone_lantern');
      expect(lantern).toMatchObject({ x: spring.x + POOL.width, y: spring.y });
      const village = new Set(world.village ? villageTiles(world.village, world) : []);
      // Nothing in the village; the ring round it walkable and free of anything solid.
      for (let y = spring.y - 1; y <= spring.y + POOL.height; y++) {
        for (let x = spring.x - 1; x <= spring.x + POOL.width + 1; x++) {
          const i = toIndex(world, x, y);
          expect(village.has(i)).toBe(false);
          const inPatch = y >= spring.y && y < spring.y + POOL.height && x >= spring.x;
          const solid = inPatch && (x < spring.x + POOL.width || y === spring.y);
          if (!solid) {
            expect(isWalkableTile(world.terrain[i] ?? 0), `${String(x)},${String(y)}`).toBe(true);
            expect(world.blocked[i], `${String(x)},${String(y)}`).toBe(0);
          }
        }
      }
    },
  );

  it('is added near the end: everything else on the island stays where it was', () => {
    const steps = GENERATION_STEPS.filter((step) => step !== placeHotSpring);
    const without = steps.reduce((c, step) => step(c), createInitialContext(46, ISLAND_CONFIG));
    const withSpring = GENERATION_STEPS.reduce(
      (c, step) => step(c),
      createInitialContext(46, ISLAND_CONFIG),
    );
    const spring = withSpring.objects.find((o) => o.kind === 'hot_spring');
    if (!spring) throw new Error('no hot spring');
    const inPatch = (o: { x: number; y: number }): boolean =>
      o.x >= spring.x &&
      o.y >= spring.y &&
      o.x <= spring.x + POOL.width &&
      o.y < spring.y + POOL.height;
    const where = (objects: readonly { kind: string; x: number; y: number }[]): string[] =>
      objects.map((o) => `${o.kind}@${String(o.x)},${String(o.y)}`);
    expect(where(withSpring.objects.filter((o) => !inPatch(o)))).toEqual(
      where(without.objects.filter((o) => !inPatch(o))),
    );
    for (const o of without.objects.filter(inPatch)) {
      expect(['flower', 'grass', 'ground']).toContain(OBJECT_REGISTRY[o.kind].category);
    }
    expect(withSpring.terrain).toEqual(without.terrain);
    expect(withSpring.spawn).toEqual(without.spawn);
  });

  it('is required: an island without one does not pass validation', () => {
    const steps = GENERATION_STEPS.filter((step) => step !== placeHotSpring);
    const without = steps.reduce((c, step) => step(c), createInitialContext(46, ISLAND_CONFIG));
    expect(validateGeneration(without).map((issue) => issue.code)).toContain('hot-spring-missing');
  });
});
