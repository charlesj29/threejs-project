import { isInBounds, toIndex } from '@/shared/engine/grid';
import { hashCoords } from '@/shared/engine/random';
import { fenceSpriteKey } from '../assets/paintStructures';
import { OBJECT_REGISTRY } from '../core/world/objects';
import { NO_OBJECT, type World, type WorldObject } from '../core/world/world';

export type ObjectLayout = Pick<World, 'width' | 'height' | 'objects' | 'occupancy'>;

export interface VariantLookup {
  variants: (base: string) => readonly string[];
}

function kindAt(world: ObjectLayout, x: number, y: number): string | undefined {
  if (!isInBounds(world, x, y)) return undefined;
  const id = world.occupancy[toIndex(world, x, y)] ?? NO_OBJECT;
  return id === NO_OBJECT ? undefined : world.objects[id]?.kind;
}

/**
 * Which sprite an object uses: fences pick the piece that connects to
 * neighbouring fences; everything else picks a stable variant by position.
 */
export function objectSpriteKey(
  world: ObjectLayout,
  object: WorldObject,
  atlas: VariantLookup,
): string {
  if (object.kind === 'fence') {
    // A gate counts as fence, so the rails run up to it.
    const isFence = (dx: number, dy: number): boolean => {
      const kind = kindAt(world, object.x + dx, object.y + dy);
      return kind === 'fence' || kind === 'fence_gate';
    };
    return fenceSpriteKey(isFence(0, -1), isFence(1, 0), isFence(0, 1), isFence(-1, 0));
  }
  const base = OBJECT_REGISTRY[object.kind].spriteKey;
  const keys = atlas.variants(base);
  return keys[hashCoords(object.x, object.y) % keys.length] ?? base;
}
