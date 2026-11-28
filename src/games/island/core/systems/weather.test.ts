import { describe, expect, it } from 'vitest';
import { createRng } from '@/shared/engine/random';
import { ISLAND_CONFIG } from '../config';
import { createWeather, NO_RAIN_YET, rainyTint, updateWeather } from './weather';

const settings = ISLAND_CONFIG.weather;
const STEP = 1 / 10;

describe('weather', () => {
  it('starts clear; the first shower comes early and is short', () => {
    const weather = createWeather(createRng(1), settings);
    expect(weather).toMatchObject({ raining: false, intensity: 0 });
    const rng = createRng(2);
    let t = 0;
    for (; !weather.raining; t += STEP) updateWeather(weather, rng, STEP, settings);
    expect(t).toBeCloseTo(settings.firstClearSeconds, 0);
    const started = t;
    for (; weather.raining; t += STEP) updateWeather(weather, rng, STEP, settings);
    expect(t - started).toBeCloseTo(settings.firstRainSeconds, 0);
    // Then a usual dry spell.
    const dry = t;
    for (; !weather.raining; t += STEP) updateWeather(weather, rng, STEP, settings);
    expect(t - dry).toBeGreaterThanOrEqual(settings.minClearSeconds - STEP);
  });

  it('rains now and then: showers of the configured length, easing in and out', () => {
    const rng = createRng(5);
    const weather = createWeather(rng, settings);
    const showers: number[] = [];
    let current = 0;
    let largestStep = 0;
    let previous = 0;
    for (let t = 0; t < 3600; t += STEP) {
      updateWeather(weather, rng, STEP, settings);
      largestStep = Math.max(largestStep, Math.abs(weather.intensity - previous));
      previous = weather.intensity;
      if (weather.raining) current += STEP;
      else if (current > 0) {
        showers.push(current);
        current = 0;
      }
    }
    // An hour holds as many dry-spell-plus-shower cycles as the configured lengths allow
    // (the last shower may still be running, so one fewer is counted at worst).
    const longestCycle = settings.maxClearSeconds + settings.maxRainSeconds;
    const shortestCycle = settings.minClearSeconds + settings.minRainSeconds;
    expect(showers.length).toBeGreaterThanOrEqual(Math.floor(3600 / longestCycle) - 1);
    expect(showers.length).toBeLessThanOrEqual(Math.ceil(3600 / shortestCycle));
    // (The first shower has its own length.)
    for (const length of showers.slice(1)) {
      expect(length).toBeGreaterThanOrEqual(settings.minRainSeconds - STEP);
      expect(length).toBeLessThanOrEqual(settings.maxRainSeconds + STEP);
    }
    // No sudden jumps: the intensity follows over `fadeSeconds`.
    expect(largestStep).toBeLessThanOrEqual(STEP / settings.fadeSeconds + 1e-9);
  });

  it('greys the light by the shower', () => {
    expect(rainyTint([1, 1, 1], 0, settings)).toEqual([1, 1, 1]);
    expect(rainyTint([1, 1, 1], 1, settings)).toEqual([...settings.rainTint]);
  });

  it('counts the seconds since the last shower stopped', () => {
    const weather = createWeather(createRng(3), settings);
    expect(weather.sinceRain).toBe(NO_RAIN_YET);
    Object.assign(weather, { raining: true, timeLeft: 0.5 });
    updateWeather(weather, createRng(4), 0.1, settings);
    expect(weather.sinceRain).toBe(0);
    for (let i = 0; i < 20; i++) updateWeather(weather, createRng(5), 0.1, settings);
    expect(weather.raining).toBe(false);
    expect(weather.sinceRain).toBeGreaterThan(1);
  });
});
