// The weather: long clear spells and, now and then, a gentle rain shower that
// comes on and dies away slowly. The first shower of a visit comes early and
// is short (so a visitor sees the rain, the puddles and the splashing soon, and
// the evening after stays dry); the later ones follow the usual spells. Pure: timers advance by the fixed step and
// the lengths of spells come from the weather's own rng (so the rest of the
// game's randomness is untouched).
import type { Rng } from '@/shared/engine/random';
import type { IslandConfig } from '../config';

export interface Weather {
  /** Raining now (the shower's intensity follows this slowly). */
  raining: boolean;
  /** Seconds until the weather turns. */
  timeLeft: number;
  /** 0 (dry) .. 1 (full rain), easing in and out over `fadeSeconds`. */
  intensity: number;
  /** Seconds since the last shower stopped (`NO_RAIN_YET` until the first one has). */
  sinceRain: number;
  /** Showers so far this visit (the first one has its own timing). */
  showers: number;
}

/** What `sinceRain` says before any shower: long enough ago that nothing is wet. */
export const NO_RAIN_YET = Number.MAX_SAFE_INTEGER;

type WeatherSettings = IslandConfig['weather'];

function spell(raining: boolean, rng: Rng, settings: WeatherSettings): number {
  return raining
    ? rng.range(settings.minRainSeconds, settings.maxRainSeconds)
    : rng.range(settings.minClearSeconds, settings.maxClearSeconds);
}

/** Every visit starts clear, until the first shower (`firstClearSeconds`). */
export function createWeather(_rng: Rng, settings: WeatherSettings): Weather {
  return {
    raining: false,
    timeLeft: settings.firstClearSeconds,
    intensity: 0,
    sinceRain: NO_RAIN_YET,
    showers: 0,
  };
}

export function updateWeather(
  weather: Weather,
  rng: Rng,
  stepSeconds: number,
  settings: WeatherSettings,
): void {
  weather.timeLeft -= stepSeconds;
  if (weather.timeLeft <= 0) {
    weather.raining = !weather.raining;
    const first = weather.raining && weather.showers === 0;
    weather.timeLeft = first ? settings.firstRainSeconds : spell(weather.raining, rng, settings);
    if (weather.raining) weather.showers += 1;
  }
  // Counting from when the shower stops (until then, and before any shower, it stays put).
  if (weather.raining) weather.sinceRain = 0;
  else if (weather.sinceRain !== NO_RAIN_YET) weather.sinceRain += stepSeconds;
  const step = stepSeconds / settings.fadeSeconds;
  weather.intensity = weather.raining
    ? Math.min(1, weather.intensity + step)
    : Math.max(0, weather.intensity - step);
}

/** Daylight dimmed towards the rain's grey by the shower's intensity. */
export function rainyTint(
  tint: readonly [number, number, number],
  intensity: number,
  settings: WeatherSettings,
): [number, number, number] {
  const k = Math.max(0, Math.min(1, intensity));
  const [r, g, b] = settings.rainTint;
  return [tint[0] * (1 + (r - 1) * k), tint[1] * (1 + (g - 1) * k), tint[2] * (1 + (b - 1) * k)];
}
