import { describe, expect, it } from 'vitest';
import { ISLAND_CONFIG } from '../core/config';
import { steamPuff, steamThickness } from './springSteam';

const settings = ISLAND_CONFIG.hotSpring;

describe('the hot spring steam', () => {
  it('is thin by day, thickest in the middle of the cool morning', () => {
    const [from, to] = settings.morning;
    expect(steamThickness(0.6, 0, settings)).toBeCloseTo(settings.steamDay);
    expect(steamThickness((from + to) / 2, 0, settings)).toBeCloseTo(settings.steamMorning);
    expect(steamThickness(from, 0, settings)).toBeCloseTo(settings.steamDay);
  });

  it('thickens in the rain', () => {
    expect(steamThickness(0.6, 1, settings)).toBeCloseTo(
      Math.max(settings.steamDay, settings.steamRain),
    );
  });

  it('puffs rise, and fade in and away', () => {
    expect(steamPuff(0, 0, 10).fade).toBeCloseTo(0);
    expect(steamPuff(0.5, 0, 10).fade).toBeCloseTo(1);
    expect(steamPuff(0.5, 0, 10).dy).toBeLessThan(0);
  });
});
