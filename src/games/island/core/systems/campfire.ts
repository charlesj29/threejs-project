// The beach campfire: when it burns, and which evenings the village gathers
// round it (instead of the well). Pure.
import type { IslandConfig } from '../config';
import { duringTimes } from './dayNight';

type Settings = IslandConfig['campfire'];

/** Burning from dusk until dawn (`time`: island time, 0..1). */
export function campfireLit(time: number, settings: Settings): boolean {
  return duringTimes(time, settings.litTimes);
}

/** The village gathers at the campfire every `everyDays` evenings, starting with the first. */
export function campfireEvening(day: number, settings: Settings): boolean {
  return settings.everyDays > 0 && day % settings.everyDays === 0;
}
