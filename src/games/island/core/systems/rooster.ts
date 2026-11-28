// The rooster's dawn crow: a few times as the sun comes up. Pure.
import type { IslandConfig } from '../config';
import { duringTimes } from './dayNight';

/** True while the rooster is crowing (`time`: island time, 0..1). */
export function roosterCrowing(time: number, settings: IslandConfig['animals']): boolean {
  return settings.crowTimes.some((range) => duringTimes(time, range));
}
