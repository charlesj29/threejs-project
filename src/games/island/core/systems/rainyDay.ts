// What villagers do when it rains: the keeper hurries home, the baker shelters
// under the market stall's awning (or goes home if there's no stall), and the
// night owl carries on as planned in a raincoat. Bedtime stays bedtime.
// Pure: the routine asks this instead of the schedule while it rains.
import type { Activity, Villager, VillagerRole } from '../entities/villager';

export interface RainSettings {
  /** Raining hard enough to seek shelter. */
  readonly raining: boolean;
  readonly hurryFactor: number;
}

export function rainyActivity(
  role: VillagerRole,
  scheduled: Activity,
  hasStall: boolean,
): Activity {
  if (scheduled === 'home') return 'home';
  switch (role) {
    case 'keeper':
      return 'home';
    case 'baker':
      return hasStall ? 'shelter' : 'home';
    case 'owl':
      return scheduled;
  }
}

/** Out in the rain without shelter: they put on a raincoat. */
export function wearsRaincoat(villager: Villager, raining: boolean): boolean {
  return (
    raining &&
    !villager.hidden &&
    villager.activity !== 'shelter' &&
    villager.activity !== 'home' &&
    // In the hot spring, rain is just part of the soak.
    villager.activity !== 'soak'
  );
}
