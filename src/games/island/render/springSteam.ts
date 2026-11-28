// How the hot spring's steam looks over time. Pure, so it's unit-tested.
import type { IslandConfig } from '../core/config';

type Settings = IslandConfig['hotSpring'];

/**
 * How thick the steam is (0..1): thin by day, thickest in the cool morning
 * (easing in and out at its ends) and in the rain. `time` is island time (0..1).
 */
export function steamThickness(time: number, rain: number, settings: Settings): number {
  const [from, to] = settings.morning;
  const t = time - Math.floor(time);
  const half = (to - from) / 2;
  // 1 in the middle of the morning, 0 at its ends and outside it.
  const morning = t >= from && t <= to ? 1 - Math.abs(t - (from + half)) / half : 0;
  const cool = settings.steamDay + (settings.steamMorning - settings.steamDay) * morning;
  return Math.max(cool, settings.steamRain * Math.max(0, Math.min(1, rain)));
}

/** One puff `age` (0..1) into its life: how far it has risen and drifted, and how visible it is. */
export function steamPuff(
  age: number,
  phase: number,
  risePx: number,
): { readonly dx: number; readonly dy: number; readonly fade: number } {
  return {
    dx: Math.sin((age + phase) * Math.PI * 2) * 1.5 + age * 3,
    dy: -age * risePx,
    // Fades in, then thins away as it rises.
    fade: Math.sin(Math.PI * age),
  };
}
