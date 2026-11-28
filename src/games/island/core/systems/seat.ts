// Benches: sitting down and standing up again. Anyone can sit (the player,
// villagers): on the bench tile nearest them, facing out, feet just in front of
// the bench row (so they're drawn in front of it; the renderer lifts the sitting
// sprite onto the seat). Where they stood is remembered for standing up.
// The hot spring works the same way, with seats in the water instead.
import type { Player } from '../entities/player';
import { OBJECT_REGISTRY } from '../world/objects';
import type { WorldObject } from '../world/world';

/** Sitting, the feet rest just in front of the bench row (so the sitter draws in front of it). */
const SEAT_IN_FRONT_PX = 1;

/**
 * The hot spring's two seats in the water (map px from its top-left, where the feet are):
 * side by side, low enough in the pool that its near rim is drawn in front of the soaker.
 */
export const SOAK_SEATS_PX: readonly { readonly x: number; readonly y: number }[] = [
  { x: 22, y: 37 },
  { x: 42, y: 37 },
];

/** True for things you sit in rather than on (the hot spring). */
export function isSoakSeat(seat: WorldObject): boolean {
  const interaction = OBJECT_REGISTRY[seat.kind].interaction;
  return interaction !== undefined && 'sit' in interaction && interaction.soak === true;
}

/**
 * Sits down on a bench (or chair), or into the hot spring. `others`: who else
 * might be soaking already, so two never share a seat in the water.
 */
export function sitOn(
  body: Player,
  bench: WorldObject,
  tileSizePx: number,
  others: readonly Player[] = [],
): void {
  if (isSoakSeat(bench)) {
    soakIn(body, bench, tileSizePx, others);
    return;
  }
  const { footprint } = OBJECT_REGISTRY[bench.kind];
  const nearest = Math.floor(body.x / tileSizePx);
  const tileX = Math.min(bench.x + footprint.width - 1, Math.max(bench.x, nearest));
  settle(
    body,
    (tileX + 0.5) * tileSizePx,
    (bench.y + footprint.height) * tileSizePx + SEAT_IN_FRONT_PX,
    false,
  );
}

/** Into the hot spring: the free seat nearest where they stand (the nearest one if both are taken). */
function soakIn(
  body: Player,
  spring: WorldObject,
  tileSizePx: number,
  others: readonly Player[],
): void {
  const left = spring.x * tileSizePx;
  const top = spring.y * tileSizePx;
  const seats = SOAK_SEATS_PX.map((seat) => ({ x: left + seat.x, y: top + seat.y }));
  const taken = (seat: { x: number; y: number }): boolean =>
    others.some(
      (o) => o !== body && o.sitting?.soaking === true && o.x === seat.x && o.y === seat.y,
    );
  const byDistance = [...seats].sort((a, b) => Math.abs(a.x - body.x) - Math.abs(b.x - body.x));
  const seat = byDistance.find((s) => !taken(s)) ?? byDistance[0];
  if (seat) settle(body, seat.x, seat.y, true);
}

function settle(body: Player, x: number, y: number, soaking: boolean): void {
  body.sitting = { standX: body.x, standY: body.y, soaking };
  body.x = x;
  body.y = y;
  body.previousX = body.x;
  body.previousY = body.y;
  body.facing = 'down';
  body.moving = false;
}

/** Stands up from a bench, back where they were before sitting down. */
export function standUp(body: Player): void {
  if (!body.sitting) return;
  body.x = body.sitting.standX;
  body.y = body.sitting.standY;
  body.previousX = body.x;
  body.previousY = body.y;
  body.sitting = null;
}
