# What you can configure

Almost everything lives in one file: **`src/games/island/core/config.ts`**.
Change a value, save, and the page updates (`npm run dev`).

**Times of day** are fractions of a day: `0` = midnight, `0.25` = 6 AM, `0.5` = noon,
`0.75` = 6 PM. **Distances** are in tiles (one tile = 16 pixels) unless the name ends in `Px`.

## Quick switches

| Setting                             | What it does                                                                                |
| ----------------------------------- | ------------------------------------------------------------------------------------------- |
| `render.zoomEnabled`                | Allow zooming with + / − (and the phone zoom buttons).                                      |
| `touch.controls`                    | Phones: the small interact button (walking is tap, or hold a finger to steer).              |
| `touch.holdMs`, `touch.stopTiles`   | Phones: how long a hold before it steers; how close to the finger it stops.                 |
| `pointer.clickToWalk`               | Click the screen to walk there (phones always tap to walk).                                 |
| `tour.enabled`                      | The slow camera tour after a minute without input.                                          |
| `debug.showClock`                   | The clock at the top right.                                                                 |
| `debug.alwaysShowFps`               | Always show the FPS, on the live site too (F3: dev server only).                            |
| `debug.fpsOnly`                     | F3 shows only the FPS (`false`: also tile and camera).                                      |
| `rabbits.enabled` / `ducks.enabled` | The rabbits near the village / the ducks on the lake.                                       |
| `animals.enabled`                   | The chickens (in their run) and the village cat.                                            |
| `village.chickenCoop`               | A fenced chicken run with a hen house just outside the village (re-bake to apply).          |
| `village.chickenCoopHomesGapTiles`  | How far the chicken run keeps from the cottage and the workspace (tiles; re-bake to apply). |
| `birds.enabled`                     | Little birds in the village and seagulls over the sea.                                      |
| `playmates.enabled`                 | The village kid and the puppy.                                                              |

## Time, light and weather

| Setting                                                 | What it does                                                                                                            |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `dayNight.dayLengthSeconds`                             | How long one full day lasts, in real seconds.                                                                           |
| `dayNight.startTime`                                    | The time of day a visit starts at.                                                                                      |
| `weather.firstClearSeconds`, `weather.firstRainSeconds` | The first shower of a visit: how soon it comes and how long it lasts (early and short, so the first evening stays dry). |
| `weather.min/maxClearSeconds`                           | How long the dry weather lasts between showers.                                                                         |
| `weather.min/maxRainSeconds`                            | How long a shower lasts.                                                                                                |
| `weather.rainTint`, `dropDensity`                       | How grey the light gets and how heavy the rain looks.                                                                   |
| `mist`                                                  | When the morning mist comes and goes, and how thick it is.                                                              |
| `lanterns`                                              | How spread out the lamp posts are when they light up at dusk.                                                           |
| `villageNight`                                          | When houses go to bed, when the market stall opens, smoky mealtimes.                                                    |
| `waterLights`                                           | Stars, the moon and shooting stars on the water; sunset sparkles.                                                       |
| `breeze`                                                | How much trees and grass sway, how windy it gets, drifting leaves.                                                      |
| `clouds`                                                | How many cloud shadows drift by, and how fast.                                                                          |

## Sound

| Setting                 | What it does                                                                                                                                                              |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `music.volume`          | Music volume (0 to 1).                                                                                                                                                    |
| `ambience.volume`       | Nature sounds volume, all together.                                                                                                                                       |
| `ambience.layerVolumes` | Each sound on its own: waves, birds, crickets, rain, fire, chimes, chatter (village voices), steps, bell, guitar, spring (the hot spring). Set one to `0` to turn it off. |
| `ambience.bellTimes`    | When the village bell rings.                                                                                                                                              |

## Life on the island

| Setting                                                            | What it does                                                                                                                                                           |
| ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `villagerDay`                                                      | Each villager's day: from which time they bake, sweep, fish, read, soak (hot spring), gather or go home.                                                               |
| `social`                                                           | How often villagers chat, wave at you and hum at their chores.                                                                                                         |
| `social.catchShare`                                                | How often the fisher shows off a caught fish instead of humming.                                                                                                       |
| `lakeLife`                                                         | How often a fish leaps out of the lake, and how high.                                                                                                                  |
| `villagers.walkSpeedTilesPerSecond`                                | How fast villagers stroll.                                                                                                                                             |
| `rainyDay`                                                         | How heavy the rain must be before villagers shelter, and how fast they hurry.                                                                                          |
| `rabbits`, `ducks`                                                 | How many, how fast, and how shy they are.                                                                                                                              |
| `wildlife.night`                                                   | When the animals sleep (rabbits by cover, ducks by the shore).                                                                                                         |
| `afterRain`                                                        | After a shower: how many puddles (village paths, the kid's field), and how long they take to dry.                                                                      |
| `ambience.guitar`                                                  | How near you must be to hear the guitar at the evening gathering (full / gone, tiles).                                                                                 |
| `ambience.spring`                                                  | How near you must be to hear the hot spring bubbling (full / gone, tiles).                                                                                             |
| `ambience.rooster`                                                 | How near the hen house you must be to hear the rooster's crow (full / gone, tiles).                                                                                    |
| `ambience.campfire`                                                | How near you must be to hear the campfire crackle while it burns (full / gone, tiles).                                                                                 |
| `campfire.minGapTiles`, `campfire.maxSeaTiles`, `campfire.choices` | Where the beach campfire goes: how far from the village, houses and hot spring, how close to the sea, how many spots near the village to pick from (re-bake to apply). |
| `campfire.litTimes`                                                | When the campfire burns (from dusk round to dawn).                                                                                                                     |
| `campfire.everyDays`                                               | The village gathers round the campfire every this many evenings, the first one too (`0`: never; otherwise round the well).                                             |
| `campfire.glowOpacity`, `campfire.glowFlicker`, `campfire.spark*`  | The campfire's warm glow on the sand, how it flickers, and its sparks.                                                                                                 |
| `hotSpring.minGapTiles`, `hotSpring.choices`                       | Where the hot spring goes: how far from the village and houses, and how many cosy spots to pick from (re-bake to apply).                                               |
| `hotSpring.steam*`, `hotSpring.morning`                            | The steam over the hot spring: how many puffs, how they rise, how thick by day, on a cool morning and in the rain.                                                     |
| `playmates.splashSeconds`                                          | How long the kid splashes in a puddle after rain.                                                                                                                      |
| `birds.songSeconds`                                                | How long a bird sings (a note balloon) coming out from shelter after rain.                                                                                             |
| `animals`                                                          | How many chickens and cats, how fast, how far they roam, how jumpy the chickens are.                                                                                   |
| `animals.roosters`, `animals.chicks`                               | The rooster and the chicks in the chicken run (the chicks follow the first hen).                                                                                       |
| `animals.choreChance`                                              | How often a hen or the rooster goes to the feed trough or the water dish.                                                                                              |
| `animals.crowTimes`                                                | When the rooster crows at dawn (with a note and a crow you hear near the hen house).                                                                                   |
| `animals.chicksToBedEarly`                                         | How much earlier the chicks go into the hen house at night.                                                                                                            |
| `butterflies`, `fireflies`                                         | How many, and how they fly or blink.                                                                                                                                   |
| `birds`                                                            | How many birds and gulls, when they are out, how shy they are and how far they fly.                                                                                    |
| `playmates`                                                        | When and where (a field outside the village) the kid and puppy play, their pace, the ball, hellos.                                                                     |
| `player.walkSpeedTilesPerSecond` / `runSpeedTilesPerSecond`        | How fast you walk and run.                                                                                                                                             |
| `tour.idleSeconds`                                                 | How long without input before the tour starts.                                                                                                                         |

## The island's layout

The live island is a saved map file, so layout settings (`village`, `trees`, `lake`, `dock`,
`decorations`, ...) only change it after re-baking: run **`npm run bake:island`**. Re-baking
rebuilds the default island from its seed (`generation.authoringSeed`, 4178021422) and replaces any hand
edits. Islands opened with the dice button use the settings straight away.

## Not in the config file

| What                            | Where                                        |
| ------------------------------- | -------------------------------------------- |
| Portfolio texts (the workspace) | `src/games/island/core/content/portfolio.ts` |
| What villagers and signs say    | `src/games/island/core/content/guidance.ts`  |
| The music                       | `src/games/island/assets/chillTune.ts`       |
| CV and screenshots              | `public/portfolio/`                          |
