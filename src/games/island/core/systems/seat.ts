// Benches: sitting down and standing up again. Anyone can sit (the player,
// villagers): on the free bench tile nearest them, facing out (or the way the
// seat faces: the stools by the campfire face the fire), feet just in front of
// the bench row (so they're drawn in front of it; the renderer lifts the sitting
// sprite onto the seat). Where they stood is remembered for standing up.
// The hot spring works the same way, with seats in the water instead.
import type { Direction, Player } from '../entities/player';
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
 * Sits down on a bench (or chair, or log seat), or into the hot spring: on the
 * free spot nearest where they stand (`others`: who else might be sitting
 * there already, so two never share a spot). False if every spot is taken.
 */
export function sitOn(
  body: Player,
  bench: WorldObject,
  tileSizePx: number,
  others: readonly Player[] = [],
): boolean {
  const interaction = OBJECT_REGISTRY[bench.kind].interaction;
  const faces = interaction && 'sit' in interaction ? (interaction.faces ?? 'down') : 'down';
  const spots = isSoakSeat(bench) ? soakSpots(bench, tileSizePx) : benchSpots(bench, tileSizePx);
  const taken = (spot: { x: number; y: number }): boolean =>
    others.some((o) => o !== body && o.sitting !== null && o.x === spot.x && o.y === spot.y);
  const byDistance = [...spots].sort((a, b) => Math.abs(a.x - body.x) - Math.abs(b.x - body.x));
  const spot = byDistance.find((s) => !taken(s));
  if (!spot) return false;
  settle(body, spot.x, spot.y, isSoakSeat(bench), faces);
  return true;
}

/** One spot per bench tile: feet just in front of the bench row. */
function benchSpots(bench: WorldObject, tileSizePx: number): { x: number; y: number }[] {
  const { footprint } = OBJECT_REGISTRY[bench.kind];
  return Array.from({ length: footprint.width }, (_, i) => ({
    x: (bench.x + i + 0.5) * tileSizePx,
    y: (bench.y + footprint.height) * tileSizePx + SEAT_IN_FRONT_PX,
  }));
}

/** The hot spring's seats in the water. */
function soakSpots(spring: WorldObject, tileSizePx: number): { x: number; y: number }[] {
  const left = spring.x * tileSizePx;
  const top = spring.y * tileSizePx;
  return SOAK_SEATS_PX.map((seat) => ({ x: left + seat.x, y: top + seat.y }));
}

function settle(body: Player, x: number, y: number, soaking: boolean, facing: Direction): void {
  body.sitting = { standX: body.x, standY: body.y, soaking };
  body.x = x;
  body.y = y;
  body.previousX = body.x;
  body.previousY = body.y;
  body.facing = facing;
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
