// Interacting with things: the player reaches a little way past their feet in
// the direction they face; whatever interactive thing or villager is there can
// be checked / talked to with Space, which opens a message of one or more pages
// (no reply choices).
import { isInBounds, toIndex } from '@/shared/engine/grid';
import { hitboxAt, type HitboxSize, type Player } from '../entities/player';
import type { Villager } from '../entities/villager';
import type { PanelId } from '../content/portfolio';
import { OBJECT_REGISTRY } from '../world/objects';
import { NO_OBJECT, type World, type WorldObject } from '../world/world';

/** A part of the portfolio to show in the panel, opened at a page. */
export interface PanelOpen {
  readonly id: PanelId;
  readonly page: number;
}

/** Something the player can interact with right now: a message (pages) or a panel. */
export type InteractTarget =
  | {
      readonly kind: 'object';
      readonly object: WorldObject;
      readonly pages: readonly string[];
      readonly panel?: PanelOpen;
      /** A bench: sit down on it. */
      readonly sit?: boolean;
    }
  | { readonly kind: 'villager'; readonly villager: Villager; readonly pages: readonly string[] };

/** An open message box: its pages and the one showing. */
export interface Dialog {
  readonly pages: readonly string[];
  page: number;
}

const FACING_STEP = {
  up: { dx: 0, dy: -1 },
  down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 },
} as const;

/**
 * Around a villager's feet, the part of them you can reach: their whole
 * body above the feet, a little to each side and just below.
 */
const TALK_ZONE = { side: 8, above: 14, below: 6 };

/** The map point just in front of the player's feet. */
export function reachPoint(
  player: Player,
  size: HitboxSize,
  reachPx: number,
): { x: number; y: number } {
  const box = hitboxAt(player.x, player.y, size);
  const step = FACING_STEP[player.facing];
  return {
    x: player.x + step.dx * ((box.right - box.left) / 2 + reachPx),
    y: player.y + step.dy * ((box.bottom - box.top) / 2 + reachPx),
  };
}

function villagerAt(
  villagers: readonly Villager[],
  point: { x: number; y: number },
): Villager | null {
  return (
    villagers.find(
      (v) =>
        Math.abs(point.x - v.x) <= TALK_ZONE.side &&
        point.y >= v.y - TALK_ZONE.above &&
        point.y <= v.y + TALK_ZONE.below,
    ) ?? null
  );
}

export interface InteractionSettings extends HitboxSize {
  readonly reachPx: number;
  /** What a villager says right now. */
  readonly villagerPages: (villager: Villager) => readonly string[];
  /** What a signpost says (it points to this island's landmarks). */
  readonly signPages: (sign: WorldObject) => readonly string[];
  /** What a thing says right now, if it changes through the day (the hen house); null: as usual. */
  readonly livePages?: (object: WorldObject) => readonly string[] | null;
}

/** The villager or interactive object in front of the player, if any. */
export function findInteractTarget(
  world: World,
  player: Player,
  villagers: readonly Villager[],
  settings: InteractionSettings,
  tileSizePx: number,
): InteractTarget | null {
  const point = reachPoint(player, settings, settings.reachPx);
  const villager = villagerAt(villagers, point);
  if (villager) return { kind: 'villager', villager, pages: settings.villagerPages(villager) };

  const tileX = Math.floor(point.x / tileSizePx);
  const tileY = Math.floor(point.y / tileSizePx);
  if (!isInBounds(world, tileX, tileY)) return null;
  const id = world.occupancy[toIndex(world, tileX, tileY)] ?? NO_OBJECT;
  const object = id === NO_OBJECT ? undefined : world.objects[id];
  if (!object) return null;
  const { interaction, door, signpost } = OBJECT_REGISTRY[object.kind];
  if (signpost) return { kind: 'object', object, pages: settings.signPages(object) };
  // A building answers only at its door, not when you face one of its walls.
  const atDoor = !door || (tileX === object.x + door.x && tileY === object.y + door.y);
  if (!interaction || !atDoor) return null;
  const live = settings.livePages?.(object);
  if (live) return { kind: 'object', object, pages: live };
  if ('sit' in interaction) return { kind: 'object', object, pages: [], sit: true };
  if ('panel' in interaction) {
    const page = interaction.pagePerTile ? tileX - object.x : 0;
    return { kind: 'object', object, pages: [], panel: { id: interaction.panel, page } };
  }
  return { kind: 'object', object, pages: interaction.pages };
}
