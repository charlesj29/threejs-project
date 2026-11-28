import { describe, expect, it } from 'vitest';
import { toIndex } from '@/shared/engine/grid';
import { ISLAND_CONFIG } from '../../config';
import { OBJECT_REGISTRY } from '../../world/objects';
import { TileId } from '../../world/tiles';
import { villageTiles } from '../../world/village';
import { createInitialContext } from '../context';
import { GENERATION_STEPS } from '../pipeline';
import { generateValidWorld } from '../testUtils';
import { validateGeneration } from '../validate';
import { buildChickenCoop, CHICKEN_RUN } from './buildChickenCoop';

describe('the chicken run', () => {
  it.each([46, 1, 2, 3, 7, 12])(
    'a fenced pen with a gate, a hen house, a trough and a dish, outside the village (seed %i)',
    (seed) => {
      const world = generateValidWorld(seed);
      const coop = world.objects.find((o) => o.kind === 'chicken_coop');
      if (!coop) throw new Error('no chicken run');
      const left = coop.x - 1;
      const top = coop.y - 1;
      const village = new Set(world.village ? villageTiles(world.village, world) : []);
      const fences = new Set(
        world.objects
          .filter((o) => o.kind === 'fence' || o.kind === 'fence_gate')
          .map((o) => toIndex(world, o.x, o.y)),
      );
      const at = (kind: string, x: number, y: number): boolean =>
        world.objects.some((o) => o.kind === kind && o.x === x && o.y === y);
      expect(at('fence_gate', left + 3, top + CHICKEN_RUN.height - 1)).toBe(true);
      expect(at('feed_trough', left + 5, top + 1)).toBe(true);
      expect(at('water_dish', left + 5, top + 3)).toBe(true);
      for (let y = top; y < top + CHICKEN_RUN.height; y++) {
        for (let x = left; x < left + CHICKEN_RUN.width; x++) {
          const i = toIndex(world, x, y);
          const edge =
            x === left ||
            y === top ||
            x === left + CHICKEN_RUN.width - 1 ||
            y === top + CHICKEN_RUN.height - 1;
          expect(fences.has(i), `fence at ${String(x)},${String(y)}`).toBe(edge);
          expect(village.has(i)).toBe(false);
          expect([TileId.Grass, TileId.Sand]).toContain(world.terrain[i]);
        }
      }
    },
  );

  it('is added last: everything else on the island stays where it was', () => {
    // Up to the run (steps after it, like the hot spring, may then pick other spots).
    const upToRun = GENERATION_STEPS.slice(0, GENERATION_STEPS.indexOf(buildChickenCoop) + 1);
    const steps = upToRun.filter((step) => step !== buildChickenCoop);
    const without = steps.reduce((c, step) => step(c), createInitialContext(46, ISLAND_CONFIG));
    const withRun = upToRun.reduce((c, step) => step(c), createInitialContext(46, ISLAND_CONFIG));
    const coop = withRun.objects.find((o) => o.kind === 'chicken_coop');
    if (!coop) throw new Error('no chicken run');
    const inPen = (o: { x: number; y: number }): boolean =>
      o.x >= coop.x - 1 &&
      o.y >= coop.y - 1 &&
      // (one column more: the sunflowers outside the fence)
      o.x <= coop.x - 1 + CHICKEN_RUN.width &&
      o.y < coop.y - 1 + CHICKEN_RUN.height;
    // Outside the pen nothing moved; inside, only meadow decorations made way.
    const where = (objects: readonly { kind: string; x: number; y: number }[]): string[] =>
      objects.map((o) => `${o.kind}@${String(o.x)},${String(o.y)}`);
    expect(where(withRun.objects.filter((o) => !inPen(o)))).toEqual(
      where(without.objects.filter((o) => !inPen(o))),
    );
    const cleared = without.objects.filter(inPen);
    for (const o of cleared) {
      expect(['flower', 'grass', 'ground']).toContain(OBJECT_REGISTRY[o.kind].category);
    }
    expect(withRun.terrain).toEqual(without.terrain);
  });

  it('is required: an island without one does not pass validation', () => {
    const steps = GENERATION_STEPS.filter((step) => step !== buildChickenCoop);
    const without = steps.reduce((c, step) => step(c), createInitialContext(46, ISLAND_CONFIG));
    expect(validateGeneration(without).map((issue) => issue.code)).toContain(
      'chicken-coop-missing',
    );
  });
});
