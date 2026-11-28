import { describe, expect, it } from 'vitest';
import { toIndex } from '@/shared/engine/grid';
import { ISLAND_CONFIG } from '../../config';
import { OBJECT_REGISTRY } from '../../world/objects';
import { TileId } from '../../world/tiles';
import { villageTiles } from '../../world/village';
import type { World, WorldObject } from '../../world/world';
import { createInitialContext } from '../context';
import { GENERATION_STEPS } from '../pipeline';
import { generateValidWorld } from '../testUtils';
import { validateGeneration } from '../validate';
import { buildChickenCoop, CHICKEN_RUN, RUN_LAYOUTS } from './buildChickenCoop';

/** The layout the run was built with (the one whose fence matches what stands there). */
function layoutOf(world: World, left: number, top: number): (typeof RUN_LAYOUTS)[number] {
  const fenced = (x: number, y: number): boolean =>
    world.objects.some(
      (o) => (o.kind === 'fence' || o.kind === 'fence_gate') && o.x === x && o.y === y,
    );
  const match = RUN_LAYOUTS.find((layout) =>
    layout.rows.every((row, dy) =>
      [...row].every((cell, dx) => (cell === 'F' || cell === 'G') === fenced(left + dx, top + dy)),
    ),
  );
  if (!match) throw new Error('the fence matches no layout');
  return match;
}

/** Steps (8-way) between the run's box and an object's footprint. */
function gapTo(left: number, top: number, o: WorldObject): number {
  const { footprint } = OBJECT_REGISTRY[o.kind];
  const dx = Math.max(0, o.x - (left + CHICKEN_RUN.width), left - (o.x + footprint.width));
  const dy = Math.max(0, o.y - (top + CHICKEN_RUN.height), top - (o.y + footprint.height));
  return Math.max(dx, dy);
}

describe('the chicken run', () => {
  it.each([46, 1, 2, 3, 7, 12, 15])(
    'an L-shaped pen with a gate, a hen house, a trough and a dish, just outside the village, away from the cottage and the workspace (seed %i)',
    (seed) => {
      const world = generateValidWorld(seed);
      const coop = world.objects.find((o) => o.kind === 'chicken_coop');
      if (!coop) throw new Error('no chicken run');
      const left = coop.x - 1;
      const top = coop.y - 1;
      const layout = layoutOf(world, left, top);
      const at = (kind: string, x: number, y: number): boolean =>
        world.objects.some((o) => o.kind === kind && o.x === x && o.y === y);
      for (const piece of layout.pieces) {
        expect(at(piece.kind, left + piece.x, top + piece.y), piece.kind).toBe(true);
      }
      if (!world.village) throw new Error('no village');
      const village = villageTiles(world.village, world);
      const inVillage = new Set(village);
      let nearest = Infinity;
      layout.rows.forEach((row, dy) => {
        [...row].forEach((cell, dx) => {
          if (cell === ' ') return;
          const i = toIndex(world, left + dx, top + dy);
          expect(inVillage.has(i)).toBe(false);
          expect([TileId.Grass, TileId.Sand]).toContain(world.terrain[i]);
          for (const t of village) {
            const steps = Math.max(
              Math.abs((t % world.width) - (left + dx)),
              Math.abs(Math.floor(t / world.width) - (top + dy)),
            );
            nearest = Math.min(nearest, steps);
          }
        });
      });
      expect(nearest).toBeLessThanOrEqual(3);
      for (const home of world.objects.filter((o) => o.kind === 'cabin' || o.kind === 'studio')) {
        expect(gapTo(left, top, home), home.kind).toBeGreaterThanOrEqual(
          ISLAND_CONFIG.village.chickenCoopHomesGapTiles - 1,
        );
      }
    },
  );

  it('is added last: elsewhere nothing moves; in its glade only nature makes way', () => {
    // Up to the run (steps after it, like the hot spring, may then pick other spots).
    const upToRun = GENERATION_STEPS.slice(0, GENERATION_STEPS.indexOf(buildChickenCoop) + 1);
    const steps = upToRun.filter((step) => step !== buildChickenCoop);
    const without = steps.reduce((c, step) => step(c), createInitialContext(46, ISLAND_CONFIG));
    const withRun = upToRun.reduce((c, step) => step(c), createInitialContext(46, ISLAND_CONFIG));
    const coop = withRun.objects.find((o) => o.kind === 'chicken_coop');
    if (!coop) throw new Error('no chicken run');
    // The run and the walkway round it (big trees reaching in from one tile further).
    const nearRun = (o: { x: number; y: number }): boolean =>
      o.x >= coop.x - 3 &&
      o.y >= coop.y - 2 &&
      o.x <= coop.x - 1 + CHICKEN_RUN.width &&
      o.y <= coop.y - 1 + CHICKEN_RUN.height;
    const where = (objects: readonly { kind: string; x: number; y: number }[]): string[] =>
      objects.map((o) => `${o.kind}@${String(o.x)},${String(o.y)}`);
    expect(where(withRun.objects.filter((o) => !nearRun(o)))).toEqual(
      where(without.objects.filter((o) => !nearRun(o))),
    );
    const kept = new Set(where(withRun.objects));
    for (const o of without.objects.filter((o) => nearRun(o) && !kept.has(where([o])[0] ?? ''))) {
      expect(['tree', 'bush', 'rock', 'deadwood', 'flower', 'grass', 'ground']).toContain(
        OBJECT_REGISTRY[o.kind].category,
      );
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
