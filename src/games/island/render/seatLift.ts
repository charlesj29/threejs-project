// How far a seated character's sprite is lifted from their feet, so they sit
// on the seat (and props they hold, like the guitar, go up with them).
import type { Player } from '../core/entities/player';

/** On a bench, chair or log: the hips sit on the seat. */
const SIT_LIFT_PX = 8;
/**
 * Soaking in the hot spring: the chest sits on the water line (the seat's feet are 13 px
 * below it; the sprite's chest row is 6 px above its bottom), the rest hidden by the near rim.
 */
const SOAK_LIFT_PX = 7;

export function seatLiftPx(body: Player): number {
  if (!body.sitting) return 0;
  return body.sitting.soaking ? SOAK_LIFT_PX : SIT_LIFT_PX;
}
