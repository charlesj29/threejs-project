// All tunable numbers for the island game live here. Generation, movement and
// rendering read from this object instead of hard-coding values.
import type { FractalNoiseOptions } from '@/shared/engine/noise';

/** An inclusive whole-number range. */
export interface Range {
  readonly min: number;
  readonly max: number;
}

export interface IslandConfig {
  readonly map: {
    /** Size of a generated map (the baked map file defines the live world's size). */
    readonly widthTiles: number;
    readonly heightTiles: number;
    readonly tileSizePx: number;
    /** Map files store terrain in square chunks of this many tiles, so the world can grow. */
    readonly chunkSizeTiles: number;
  };
  readonly generation: {
    /** Attempts (original seed + derived retry seeds) before giving up. */
    readonly maxAttempts: number;
    /** Seed used by `npm run bake:island` when none is given. */
    readonly authoringSeed: number;
  };
  readonly island: {
    readonly noise: FractalNoiseOptions;
    /** 0 = pure noise, 1 = pure radial gradient. Higher = rounder island. */
    readonly radialWeight: number;
    /** Tiles from the map edge that are always deep sea. */
    readonly edgeWaterTiles: number;
  };
  /** Elevation thresholds (0..1): below deepSeaMax is deep sea, etc.; above sandMax is grass. */
  readonly terrain: {
    readonly deepSeaMax: number;
    readonly shallowSeaMax: number;
    readonly sandMax: number;
  };
  readonly lake: {
    readonly minRadius: number;
    readonly maxRadius: number;
    readonly shapeNoise: FractalNoiseOptions;
    /** How much the noise bends the lake edge, as a fraction of the radius. */
    readonly shapeNoiseAmount: number;
    readonly shallowWidthTiles: number;
    readonly shoreWidthTiles: number;
    /** Extra grass tiles required between the lake shore and the coast. */
    readonly minCoastGapTiles: number;
  };
  readonly cabin: {
    /** Grass ring around the cabin kept free of trees. */
    readonly marginTiles: number;
    /** Clear grass rows in front of (below) the door. */
    readonly frontClearanceTiles: number;
    readonly minWaterDistanceTiles: number;
    /** Preferred maximum distance from the lake, so the cabin overlooks it. */
    readonly maxLakeDistanceTiles: number;
    /**
     * Authoring hint: put the cabin on the suitable site nearest this tile (its top-left)
     * instead of a random one, so the landmark stays put when the cabin's size or the
     * placement rules change. null = random.
     */
    readonly anchor: { readonly x: number; readonly y: number } | null;
  };
  readonly dock: {
    readonly lengthTiles: number;
  };
  readonly paths: {
    /** Bends trails; higher = more winding. */
    readonly meanderNoise: FractalNoiseOptions;
    readonly meanderStrength: number;
    readonly grassCost: number;
    readonly sandCost: number;
    /** Walking an existing trail is cheap, so trails merge instead of running in parallel. */
    readonly existingPathCost: number;
    /** Number of beach destinations for trails from the cabin. */
    readonly beachTrails: number;
  };
  readonly rocks: {
    readonly clusterNoise: FractalNoiseOptions;
    readonly clusterThreshold: number;
    readonly clusterDensity: number;
    readonly scatteredChance: number;
  };
  readonly trees: {
    readonly forestNoise: FractalNoiseOptions;
    /** Forest noise above this value counts as forest. */
    readonly forestThreshold: number;
    /**
     * Forest cores (forest noise above denseThreshold) become dense, interlocking
     * canopy, but only where the low-frequency character noise is above
     * characterThreshold — so some forests are dense and others stay loose.
     */
    readonly denseThreshold: number;
    readonly characterNoise: FractalNoiseOptions;
    readonly characterThreshold: number;
    /** Chance of a tree on a free tile in loose forest. */
    readonly looseDensity: number;
    /** Share of loose-forest and meadow trees that are big (2×2) rather than small. */
    readonly bigTreeShare: number;
    /** Share of broadleaf big trees that are great (wide-crowned) forest trees. */
    readonly giantShare: number;
    readonly meadowTreeChance: number;
    readonly meadowBushChance: number;
    /** Low-frequency noise that groups oaks and pines into stands. */
    readonly speciesNoise: FractalNoiseOptions;
  };
  /** Rocky ledges where the grass drops straight down to a beach (south-facing coasts). */
  /** The small village near the cottage (layout in core/world/village.ts). */
  /** The small fenced village near the cottage; its shape and layout vary per seed. */
  readonly village: {
    /** How far from the cottage (in tiles) to look for a clear spot. */
    readonly searchRadiusTiles: number;
    /** Size of the inside of the fence before corners are cut away. */
    readonly interiorWidth: Range;
    readonly interiorHeight: Range;
    /** Up to this many corners are notched out (an irregular, sometimes L-shaped outline). */
    readonly maxNotches: number;
    readonly notchWidth: Range;
    readonly notchHeight: Range;
    /** Open grass between the fence and the houses. */
    readonly gapTiles: Range;
    readonly lampPosts: number;
    /** Houses per village, picked from the house styles (VILLAGE_HOUSE_KINDS). */
    readonly houses: number;
    /** Shapes to try before giving up on a village for this seed. */
    readonly shapeAttempts: number;
    /** Each tree or rock a site would clear counts like this many tiles of distance. */
    readonly clearedObjectCost: number;
    /** Washing lines hung beside the houses (placed last, so nothing else moves). */
    readonly laundryLines: number;
    /** A fenced chicken run with a hen house just outside the village (placed last, like the lines). */
    readonly chickenCoop: boolean;
  };
  /** The village's chickens and cat. */
  readonly animals: {
    /** false = no animals in the village (the code and art stay, ready to switch back on). */
    readonly enabled: boolean;
    readonly chickens: number;
    readonly cats: number;
    readonly chickenSpeedTilesPerSecond: number;
    readonly catSpeedTilesPerSecond: number;
    /** How far (tiles) an animal wanders from where it stands. */
    readonly wanderRadiusTiles: number;
    readonly minRestSeconds: number;
    readonly maxRestSeconds: number;
    /** Chickens scurry off when someone is this close (tiles), this much faster than a stroll. */
    readonly fleeRadiusTiles: number;
    readonly fleeSpeedFactor: number;
  };
  /**
   * The animals' night and rainy days: rabbits sleep by a tree or bush at night and huddle there
   * in the rain; the ducks sleep by the shore; birds shelter under trees in the rain; butterflies,
   * fireflies and gulls hide while it rains. (Rain counts once it is `rainyDay.shelterAt` heavy.)
   */
  readonly wildlife: {
    /** When the animals sleep (times of day; wraps past midnight). */
    readonly night: readonly [from: number, to: number];
  };
  /** Wild rabbits in the meadows around the village. */
  readonly rabbits: {
    readonly enabled: boolean;
    readonly white: number;
    readonly brown: number;
    /** Their meadow: open land this many steps from the village's edge... */
    readonly nearVillageTiles: Range;
    /** ...and at least this many tiles from any building (cottage, studio, houses). */
    readonly buildingClearanceTiles: number;
    /** One hop (one tile). */
    readonly hopSeconds: number;
    /** How far a run of hops goes, at most (tiles). */
    readonly hopRangeTiles: number;
    readonly minIdleSeconds: number;
    readonly maxIdleSeconds: number;
    /** Closer than this (tiles) and a rabbit hops away, this many hops. */
    readonly fleeRadiusTiles: number;
    readonly fleeHops: number;
  };
  /**
   * Little birds hopping and pecking in flocks before the studio, before the cottage and round the
   * village well (they flutter off when you come close),
   * and seagulls gliding over the sea. Out by day only.
   */
  readonly birds: {
    readonly enabled: boolean;
    readonly brown: number;
    readonly blue: number;
    /** The times of day they are out (0.25 = 6 AM, 0.75 = 6 PM). */
    readonly awake: readonly [from: number, to: number];
    readonly fleeRadiusTiles: number;
    /** How big each flock's place is (studio, cottage, village well: radius in tiles). */
    readonly areaRadiusTiles: number;
    /** How far a startled bird flies (tiles), and how fast (map pixels per second). */
    readonly flyTiles: Range;
    readonly flySpeedPx: number;
    readonly minIdleSeconds: number;
    readonly maxIdleSeconds: number;
    readonly gulls: number;
    /** How long a bird's song bubble shows as it comes out from shelter after rain. */
    readonly songSeconds: number;
    /** How wide a seagull's lazy loop is (map pixels), and how long one loop takes. */
    readonly gullLoopPx: number;
    readonly gullLoopSeconds: number;
  };
  /**
   * A village kid and a puppy who play in a field just outside the village by day (fetch, chase,
   * a rest) and go home at
   * dusk; the puppy trots over to say hello when you come near.
   */
  readonly playmates: {
    readonly enabled: boolean;
    /** The times of day they are out playing (0.25 = 6 AM, 0.75 = 6 PM). */
    readonly awake: readonly [from: number, to: number];
    readonly kidSpeedTilesPerSecond: number;
    readonly dogSpeedTilesPerSecond: number;
    /** The puppy dashing after the ball. */
    readonly dogRunSpeedTilesPerSecond: number;
    /** How far the ball is thrown (tiles), and how many throws a game of fetch lasts. */
    readonly throwTiles: Range;
    readonly throwsPerGame: Range;
    readonly chaseSeconds: number;
    readonly restSeconds: number;
    /** The puppy comes to say hello when you are this close (tiles), then not again for a while. */
    readonly greetRangeTiles: number;
    readonly greetCooldownSeconds: number;
    /** After a shower, how long the kid splashes about in a puddle. */
    readonly splashSeconds: number;
    /** Their field: how far outside the village edge (tiles), and how big (radius, tiles). */
    readonly fieldTiles: Range;
    readonly playRadiusTiles: number;
  };
  /** A mother duck and her ducklings on the lake. */
  readonly ducks: {
    readonly enabled: boolean;
    readonly ducklings: number;
    /** Gliding speed (map pixels per second); a little faster when shooed. */
    readonly swimSpeedPx: number;
    readonly shooedSpeedFactor: number;
    /** How far one outing goes, at most (tiles). */
    readonly roamRangeTiles: number;
    readonly minIdleSeconds: number;
    readonly maxIdleSeconds: number;
    /** Chance that a pause is spent dabbling (head under, tail up), and for how long. */
    readonly dabbleChance: number;
    readonly dabbleSeconds: number;
    /** Ducklings keep this gap (map pixels, centre to centre) to the duck ahead, closing it at this rate (1/s). */
    readonly followGapPx: number;
    /** The first duckling stays a little further back: the mother is bigger. */
    readonly motherGapPx: number;
    readonly followRate: number;
    /** Closer than this (tiles) and the family paddles away from the player. */
    readonly shyRadiusTiles: number;
  };
  /** Butterflies flitting between flowers (daytime only; drawn, not simulated). */
  readonly butterflies: {
    readonly count: number;
    /** Each one keeps to its own patch of flowers, this far (tiles) from the others. */
    readonly minSpacingTiles: number;
    /** It flies to a second flower up to this far away (tiles), rests, and flies back. */
    readonly hopRangeTiles: number;
    readonly flightSeconds: number;
    readonly restSeconds: number;
    /** How far a flight wanders off the straight line (map pixels), and how high it goes. */
    readonly wanderPx: number;
    readonly heightPx: number;
    /** One wing beat frame while flying. */
    readonly flapFrameSeconds: number;
  };
  /** Little swarms of fireflies by the lake (night only; drawn, not simulated). */
  readonly fireflies: {
    readonly swarms: number;
    readonly perSwarm: number;
    readonly minSpacingTiles: number;
    /** How far a firefly drifts from its swarm's centre (map pixels). */
    readonly driftPx: number;
    /** One blink cycle lasts between these (seconds); about half of it is lit. */
    readonly minBlinkSeconds: number;
    readonly maxBlinkSeconds: number;
  };
  /** The Developer's Studio: placed near the cottage, after the village. */
  readonly studio: {
    /** How far from the cottage door (in tiles) to look. */
    readonly searchRadiusTiles: number;
    /** Ideal distance from the cottage door: a short walk. */
    readonly preferredDistanceTiles: number;
    readonly minDistanceTiles: number;
    /** Rows of clear ground kept in front of the door. */
    readonly frontClearanceTiles: number;
    /** Each tree or rock the site would clear counts like this many tiles of distance. */
    readonly clearedObjectCost: number;
  };
  readonly ledges: {
    /** Runs of ledge follow this noise along the coast. */
    readonly noise: FractalNoiseOptions;
    readonly threshold: number;
    /** Shorter runs are dropped (a lone ledge tile looks like a mistake). */
    readonly minRunTiles: number;
  };
  /** Stumps and fallen branches near trees. */
  readonly deadwood: {
    readonly searchRadiusTiles: number;
    /** Trees within the radius needed before a tile counts as woodland. */
    readonly minNearbyTrees: number;
    readonly stumpChance: number;
    readonly branchChance: number;
  };
  readonly decorations: {
    readonly flowerPatchNoise: FractalNoiseOptions;
    readonly flowerPatchThreshold: number;
    readonly flowerPatchDensity: number;
    readonly scatteredFlowerChance: number;
    /** Picks the dominant flower colour of a patch. */
    readonly flowerColorNoise: FractalNoiseOptions;
    readonly grassTuftChance: number;
  };
  readonly loop: {
    /** Fixed logic rate; rendering interpolates between steps. */
    readonly stepsPerSecond: number;
    /** After a stall, run at most this many steps in one frame (no catch-up burst). */
    readonly maxStepsPerFrame: number;
  };
  /** The hot spring: where it goes (generation) and its steam. */
  readonly hotSpring: {
    /** Generation: at least this many tiles from the village, the cottage and the workspace. */
    readonly minGapTiles: number;
    /** Generation: picks at random among this many of the cosiest spots (trees round, near a trail). */
    readonly choices: number;
    /** Steam puffs over the water at once, how long each one rises, and how high it gets. */
    readonly steamPuffs: number;
    readonly steamSeconds: number;
    readonly steamRisePx: number;
    /** How thick the steam is (0..1) by day, on a cool morning, and in the rain (the most wins). */
    readonly steamDay: number;
    readonly steamMorning: number;
    readonly steamRain: number;
    /** The cool morning (island time, 0..1): the steam is thickest. */
    readonly morning: readonly [number, number];
  };
  readonly player: {
    readonly walkSpeedTilesPerSecond: number;
    readonly runSpeedTilesPerSecond: number;
    /** Collision box around the feet (the body above can overlap things behind it). */
    readonly hitboxWidthPx: number;
    readonly hitboxHeightPx: number;
    /** When walking into an obstacle's corner by up to this many px, slide around it. */
    readonly cornerSlidePx: number;
    /** Distance one full walk / run cycle (two steps) covers, so the feet don't slide. */
    readonly walkCyclePx: number;
    readonly runCyclePx: number;
    /** Idle: one slow breath (standing for breathHoldSeconds, then sinking a pixel). */
    readonly breathCycleSeconds: number;
    readonly breathHoldSeconds: number;
    /** A blink of blinkSeconds every blinkEverySeconds (not a multiple of the breath, so they drift). */
    readonly blinkEverySeconds: number;
    readonly blinkSeconds: number;
  };
  readonly dayNight: {
    /** Real seconds for one full day (dawn, day, dusk, night). */
    readonly dayLengthSeconds: number;
    /** Time of day when the game starts (0 = midnight, 0.5 = noon). */
    readonly startTime: number;
    /** How quickly the light follows a change of mode (higher = faster). */
    readonly transitionSharpness: number;
  };
  readonly doors: {
    /** Each half of a door transition: fading to black, then back in. */
    readonly fadeSeconds: number;
  };
  readonly interaction: {
    /** How far past the feet hitbox, in the facing direction, the player can reach. */
    readonly reachPx: number;
  };
  readonly villagers: {
    /** Strolling pace (the player walks at 4). */
    readonly walkSpeedTilesPerSecond: number;
    /** Standing around between walks. */
    readonly minRestSeconds: number;
    readonly maxRestSeconds: number;
    /** Give up on a walk after being blocked this long. */
    readonly giveUpSeconds: number;
  };
  /**
   * Villagers in the rain: once a shower is this heavy (0..1) the keeper hurries home, the baker
   * shelters under the market stall's awning and the night owl carries on in a raincoat.
   */
  readonly rainyDay: {
    readonly shelterAt: number;
    /** How much faster than a stroll they hurry to shelter. */
    readonly hurryFactor: number;
  };
  /**
   * Each villager's day: from each start time (fraction of a day: 0.25 = 6 AM,
   * 0.5 = noon) they do that activity until the next one; the last runs past
   * midnight into the first. The night owl stays out on the plaza bench.
   */
  /** Villagers being social: chatting when they meet, waving at you, humming at their chores. */
  readonly social: {
    /** Two strolling villagers this close (tiles) stop for a chat, this long, taking turns. */
    readonly chatRangeTiles: number;
    readonly chatSeconds: number;
    readonly chatTurnSeconds: number;
    /** Gathered round the well in the evening (or the night owl on its bench), they chat across a wider circle. */
    readonly gatherChatRangeTiles: number;
    /** After a chat, a villager waits this long before the next. */
    readonly chatCooldownSeconds: number;
    /** You within this many tiles: a wave (shown this long), at most every so often. */
    readonly waveRangeTiles: number;
    readonly waveSeconds: number;
    readonly waveCooldownSeconds: number;
    /** At a chore, a hum (a little note) every so often, shown this long. */
    readonly humMinSeconds: number;
    readonly humMaxSeconds: number;
    readonly humSeconds: number;
    /** Of the fisher's hums, the share that show off a caught fish instead (0..1). */
    readonly catchShare: number;
  };
  /** Life on the lake: now and then a fish leaps out (about how often, how long, how high). */
  readonly lakeLife: {
    readonly fishJumpEverySeconds: number;
    readonly fishJumpSeconds: number;
    readonly fishJumpHeightPx: number;
  };
  readonly villagerDay: Readonly<
    Record<'baker' | 'keeper' | 'owl', readonly (readonly [start: number, activity: string])[]>
  >;
  /** Clear spells and gentle rain showers (seconds of real time). */
  readonly weather: {
    readonly minClearSeconds: number;
    readonly maxClearSeconds: number;
    readonly minRainSeconds: number;
    readonly maxRainSeconds: number;
    /** How long rain takes to come on or die away. */
    readonly fadeSeconds: number;
    /** Daylight is multiplied by this in full rain (a soft grey). */
    readonly rainTint: readonly [r: number, g: number, b: number];
    /** Rain streaks per 1,000 square map pixels of view at full rain (capped), and rings on the lake. */
    readonly dropDensity: number;
    readonly maxDrops: number;
    readonly lakeRings: number;
    /** Map pixels per second: falling, and blown sideways. */
    readonly fallSpeedPx: number;
    readonly windPx: number;
  };
  /** Morning mist over the lake and meadows: comes at dawn, lifts by mid-morning. */
  readonly mist: {
    readonly patches: number;
    /** Times of day (fractions: 0.25 = 6 AM): starts, fully there, starts lifting, gone. */
    readonly appears: number;
    readonly thickFrom: number;
    readonly thickUntil: number;
    readonly gone: number;
    /** At its thickest, 0..1. */
    readonly maxOpacity: number;
    /** Drift (map pixels per second). */
    readonly driftPx: number;
  };
  /**
   * Lamp posts light one by one at dusk, in a wave out from the village well:
   * each switches on when the evening light passes its own point in this range
   * (0.5 = when lamps start coming on, 1 = full night).
   */
  readonly lanterns: { readonly first: number; readonly last: number };
  /**
   * The village going to sleep (times of day: 0.25 = 6 AM, 0.5 = noon, 0.75 = 6 PM):
   * house windows go dark one by one between `lightsOutFrom` and `lightsOutTo` (until dawn,
   * `wakeAt`); the market stall is open from `stallOpens` to `stallCloses`; chimneys smoke
   * most at breakfast and dinner.
   */
  readonly villageNight: {
    readonly lightsOutFrom: number;
    readonly lightsOutTo: number;
    readonly wakeAt: number;
    readonly stallOpens: number;
    readonly stallCloses: number;
    readonly breakfast: readonly [from: number, to: number];
    readonly dinner: readonly [from: number, to: number];
  };
  /**
   * Light on the water: stars and the moon reflected at night (now and then a shooting star),
   * golden sparkles on the lake at sunrise and sunset (times of day: 0.25 = 6 AM).
   */
  readonly waterLights: {
    /** Stars reflected on the sea, and (closer together) on the lake. */
    readonly stars: number;
    readonly lakeStars: number;
    readonly glints: number;
    readonly night: readonly [from: number, to: number];
    readonly dawn: readonly [from: number, to: number];
    readonly dusk: readonly [from: number, to: number];
    /** How fast the stars twinkle (seconds per twinkle). */
    readonly twinkleSeconds: number;
    /** About how often a shooting star crosses the water at night, and how long it takes. */
    readonly shootingStarEverySeconds: number;
    readonly shootingStarSeconds: number;
  };
  /**
   * After a shower: puddles (on village paths and in the kid's field) that dry up over
   * `drySeconds`, and the kid splashing in them; the birds sing as they come out from under the
   * trees (`birds.songSeconds`).
   */
  readonly afterRain: {
    readonly villagePuddles: number;
    readonly fieldPuddles: number;
    readonly drySeconds: number;
  };
  /** A breeze through the island: trees, bushes and grass sway; a few leaves drift by day. */
  readonly breeze: {
    /** How far the top of a tree leans at full wind (map pixels); the base stays rooted. */
    readonly swayPx: number;
    /** Usual wind strength (0..1), how much a shower adds, and how much calmer night is. */
    readonly base: number;
    readonly rainBoost: number;
    readonly nightCalm: number;
    /** Leaves drifting across the view at full wind, and their speed (map pixels per second). */
    readonly leaves: number;
    readonly leafSpeedPx: number;
  };
  /** Soft cloud shadows drifting over the island by day. */
  readonly clouds: {
    readonly count: number;
    /** Drift (map pixels per second). */
    readonly speedPx: number;
  };
  /** After a while with no input, the camera glides slowly round the island. */
  readonly tour: {
    /** false: no ambient tour (the camera always stays with the player). */
    readonly enabled: boolean;
    readonly idleSeconds: number;
    /** Gliding speed (map pixels per second) and the pause at each place. */
    readonly speedPx: number;
    readonly holdSeconds: number;
    /** Gliding back to the player when the tour ends. */
    readonly returnSeconds: number;
  };
  /** Nature sounds under the music. */
  readonly ambience: {
    /** 0..1 volume of the whole layer. */
    readonly volume: number;
    /** Each sound at full strength, 0..1 (balance them here; e.g. lower `rain` for softer rain). */
    readonly layerVolumes: {
      readonly waves: number;
      readonly birds: number;
      readonly crickets: number;
      readonly rain: number;
      readonly fire: number;
      readonly chimes: number;
      readonly chatter: number;
      readonly steps: number;
      readonly bell: number;
      readonly guitar: number;
      readonly spring: number;
    };
    /** The evening guitar is loudest within `nearTiles` of the player, gone by `farTiles`. */
    readonly guitar: { readonly nearTiles: number; readonly farTiles: number };
    /** The hot spring is loudest within `nearTiles` of it, gone by `farTiles`. */
    readonly spring: { readonly nearTiles: number; readonly farTiles: number };
    /** Wind chimes and voices are loudest within `nearTiles` of the village, gone by `farTiles`. */
    readonly village: { readonly nearTiles: number; readonly farTiles: number };
    /** When the distant village bell rings (fractions of a day: 0.5 = noon, 0.75 = 6 PM). */
    readonly bellTimes: readonly number[];
    /** Waves are loudest within `nearTiles` of the sea and fade out by `farTiles`. */
    readonly waves: {
      readonly nearTiles: number;
      readonly farTiles: number;
      readonly floor: number;
    };
    /** Indoors, outside sounds are this much quieter; a fire is loud within `fireNearTiles`. */
    readonly indoorDamping: number;
    readonly fireNearTiles: number;
    /** How often the UI updates the mix (ms). */
    readonly sampleMs: number;
  };
  readonly music: {
    /** 0..1 master volume: background music should sit under the game, not over it. */
    readonly volume: number;
    readonly fadeSeconds: number;
    /** The first start fades in gently instead of bursting in. */
    readonly fadeInSeconds: number;
    /** Sitting or touring: the music goes softer and warmer (lowpass Hz, volume factor). */
    readonly mellowLowpassHz: number;
    readonly mellowVolume: number;
    readonly mellowSeconds: number;
  };
  /**
   * Phones and tablets (touch first, no keys): a quick tap walks there (or up to what you tapped,
   * to use it); a finger held down (or slid) steers: the player walks towards it until it lets go.
   */
  readonly touch: {
    /** The small interact button that pops up when something is in reach. */
    readonly controls: boolean;
    /** Held this long (ms) without sliding, a touch steers instead of being a tap. */
    readonly holdMs: number;
    /** Steering stops this close to the finger (tiles). */
    readonly stopTiles: number;
  };
  /** Clicking the screen to walk there (and on things, to walk up and use them). */
  readonly pointer: {
    /**
     * Mouse and pen clicks walk the player (false: walk with the keys only;
     * clicks still turn message pages). Phones always tap to walk: they have no keys.
     */
    readonly clickToWalk: boolean;
  };
  readonly debug: {
    /** How quickly the FPS readout follows frame-time changes (higher = jumpier). */
    readonly fpsSmoothingSharpness: number;
    /** How often the F3 overlay refreshes its text. */
    readonly overlayRefreshMs: number;
    /** The island clock (a plaque with the time and part of the day), top right. F3 adds the FPS under it. */
    readonly showClock: boolean;
    /** true: F3 adds only the FPS; false: also the tile and camera. */
    readonly fpsOnly: boolean;
    /** Always show the FPS under the clock, on the live site too (F3 works on the dev server only). */
    readonly alwaysShowFps: boolean;
  };
  readonly render: {
    /** Handheld-like framing: pick the whole-number scale that shows about this many tiles across. */
    readonly targetTilesAcross: number;
    /** ...but never fewer than this many tiles top to bottom (wide, short windows). */
    readonly minTilesTall: number;
    /**
     * Zoom steps applied on load, relative to the automatic framing (negative = further out).
     * The user's preferred view is three steps out (as if pressing "−" three times).
     */
    readonly defaultZoomSteps: number;
    /**
     * Phones and tablets: the automatic scale aims for this many tiles across instead (about
     * the framing three zoom steps in from the desktop default), then `touchDefaultZoomSteps`.
     */
    readonly touchTargetTilesAcross: number;
    readonly touchDefaultZoomSteps: number;
    /**
     * Lets visitors zoom (+ / − keys, the zoom buttons on phones). false = the camera stays at
     * the default framing above and the zoom controls are hidden.
     */
    readonly zoomEnabled: boolean;
    readonly minPixelScale: number;
    readonly maxPixelScale: number;
    readonly waterFrameSeconds: number;
    readonly flowerFrameSeconds: number;
    /** How long each frame of the fireplace flames shows. */
    readonly fireFrameSeconds: number;
    /** How long a chimney smoke puff takes to rise and fade. */
    readonly smokePuffSeconds: number;
    /** Soft, dithered patches of slightly deeper grass (shaded in the tilemap shader). */
    readonly grassPatches: {
      readonly noise: FractalNoiseOptions;
      readonly threshold: number;
      readonly shade: number;
      readonly ditherSpread: number;
    };
    /** How quickly the camera catches up with the player (higher = snappier). */
    readonly cameraFollowSharpness: number;
  };
  readonly validation: {
    readonly minLandShare: number;
    readonly maxLandShare: number;
    /** Share of walkable land the player must be able to reach from spawn. */
    readonly minReachableShare: number;
  };
}

const noise = (scale: number, octaves = 1): FractalNoiseOptions => ({
  scale,
  octaves,
  persistence: 0.5,
  lacunarity: 2,
});

export const ISLAND_CONFIG: IslandConfig = {
  map: { widthTiles: 96, heightTiles: 96, tileSizePx: 16, chunkSizeTiles: 32 },
  generation: { maxAttempts: 10, authoringSeed: 3068120830 },
  island: { noise: noise(0.03, 4), radialWeight: 0.55, edgeWaterTiles: 6 },
  terrain: { deepSeaMax: 0.32, shallowSeaMax: 0.37, sandMax: 0.4 },
  lake: {
    minRadius: 6,
    maxRadius: 8,
    shapeNoise: noise(0.12, 2),
    shapeNoiseAmount: 0.38,
    shallowWidthTiles: 1,
    shoreWidthTiles: 1,
    minCoastGapTiles: 3,
  },
  cabin: {
    marginTiles: 1,
    frontClearanceTiles: 3,
    minWaterDistanceTiles: 4,
    maxLakeDistanceTiles: 12,
    anchor: { x: 52, y: 50 },
  },
  dock: { lengthTiles: 4 },
  paths: {
    meanderNoise: noise(0.06, 2),
    meanderStrength: 3,
    grassCost: 1,
    sandCost: 3,
    existingPathCost: 0.4,
    beachTrails: 2,
  },
  rocks: {
    clusterNoise: noise(0.1, 2),
    clusterThreshold: 0.72,
    clusterDensity: 0.25,
    scatteredChance: 0.002,
  },
  trees: {
    forestNoise: noise(0.05, 3),
    forestThreshold: 0.56,
    denseThreshold: 0.62,
    characterNoise: noise(0.024),
    characterThreshold: 0.45,
    looseDensity: 0.2,
    bigTreeShare: 0.6,
    giantShare: 0.3,
    meadowTreeChance: 0.005,
    meadowBushChance: 0.008,
    speciesNoise: noise(0.04),
  },
  village: {
    searchRadiusTiles: 30,
    interiorWidth: { min: 21, max: 25 },
    interiorHeight: { min: 17, max: 20 },
    maxNotches: 2,
    notchWidth: { min: 4, max: 6 },
    notchHeight: { min: 3, max: 5 },
    gapTiles: { min: 2, max: 3 },
    lampPosts: 4,
    houses: 3,
    shapeAttempts: 12,
    clearedObjectCost: 3,
    laundryLines: 2,
    chickenCoop: true,
  },
  animals: {
    enabled: true,
    chickens: 3,
    cats: 1,
    chickenSpeedTilesPerSecond: 1.6,
    catSpeedTilesPerSecond: 0.9,
    wanderRadiusTiles: 3,
    minRestSeconds: 1.5,
    maxRestSeconds: 6,
    fleeRadiusTiles: 1.8,
    fleeSpeedFactor: 2,
  },
  wildlife: { night: [0.84, 0.24] },
  rabbits: {
    enabled: true,
    white: 1,
    brown: 2,
    nearVillageTiles: { min: 3, max: 10 },
    buildingClearanceTiles: 4,
    hopSeconds: 0.34,
    hopRangeTiles: 4,
    minIdleSeconds: 1.5,
    maxIdleSeconds: 5,
    fleeRadiusTiles: 2.5,
    fleeHops: 3,
  },
  birds: {
    enabled: true,
    brown: 4,
    blue: 2,
    awake: [0.24, 0.8],
    fleeRadiusTiles: 2.2,
    areaRadiusTiles: 5,
    flyTiles: { min: 4, max: 8 },
    flySpeedPx: 70,
    minIdleSeconds: 0.8,
    maxIdleSeconds: 3,
    gulls: 3,
    songSeconds: 2.5,
    gullLoopPx: 40,
    gullLoopSeconds: 26,
  },
  playmates: {
    enabled: true,
    awake: [0.3, 0.78],
    kidSpeedTilesPerSecond: 1.8,
    dogSpeedTilesPerSecond: 2.4,
    dogRunSpeedTilesPerSecond: 4.5,
    throwTiles: { min: 3, max: 5 },
    throwsPerGame: { min: 2, max: 4 },
    chaseSeconds: 12,
    restSeconds: 8,
    greetRangeTiles: 3,
    greetCooldownSeconds: 30,
    splashSeconds: 8,
    fieldTiles: { min: 2, max: 6 },
    playRadiusTiles: 4,
  },
  ducks: {
    enabled: true,
    ducklings: 2,
    swimSpeedPx: 9,
    shooedSpeedFactor: 1.8,
    roamRangeTiles: 6,
    minIdleSeconds: 2,
    maxIdleSeconds: 6,
    dabbleChance: 0.4,
    dabbleSeconds: 1.6,
    followGapPx: 10,
    motherGapPx: 13,
    followRate: 3,
    shyRadiusTiles: 2.5,
  },
  butterflies: {
    count: 4,
    minSpacingTiles: 8,
    hopRangeTiles: 4,
    flightSeconds: 7,
    restSeconds: 3.5,
    wanderPx: 14,
    heightPx: 10,
    flapFrameSeconds: 0.07,
  },
  fireflies: {
    swarms: 3,
    perSwarm: 4,
    minSpacingTiles: 6,
    driftPx: 18,
    minBlinkSeconds: 2.4,
    maxBlinkSeconds: 3.6,
  },
  studio: {
    searchRadiusTiles: 28,
    preferredDistanceTiles: 12,
    minDistanceTiles: 8,
    frontClearanceTiles: 2,
    clearedObjectCost: 1,
  },
  ledges: { noise: noise(0.08, 2), threshold: 0.35, minRunTiles: 2 },
  deadwood: { searchRadiusTiles: 2, minNearbyTrees: 2, stumpChance: 0.015, branchChance: 0.03 },
  decorations: {
    flowerPatchNoise: noise(0.09, 2),
    flowerPatchThreshold: 0.66,
    flowerPatchDensity: 0.35,
    scatteredFlowerChance: 0.01,
    flowerColorNoise: noise(0.06),
    grassTuftChance: 0.05,
  },
  loop: { stepsPerSecond: 60, maxStepsPerFrame: 5 },
  hotSpring: {
    minGapTiles: 6,
    choices: 3,
    steamPuffs: 6,
    steamSeconds: 5,
    steamRisePx: 14,
    steamDay: 0.35,
    steamMorning: 0.75,
    steamRain: 0.6,
    morning: [0.2, 0.36],
  },
  player: {
    walkSpeedTilesPerSecond: 4,
    runSpeedTilesPerSecond: 7.5,
    hitboxWidthPx: 10,
    hitboxHeightPx: 6,
    cornerSlidePx: 5,
    walkCyclePx: 40,
    runCyclePx: 60,
    breathCycleSeconds: 2.6,
    breathHoldSeconds: 1.5,
    blinkEverySeconds: 3.7,
    blinkSeconds: 0.14,
  },
  dayNight: {
    // One full day (dawn → day → dusk → night) in real seconds, e.g. 300 = 5 minutes.
    dayLengthSeconds: 300,
    startTime: 0.33,
    transitionSharpness: 2.5,
  },
  doors: { fadeSeconds: 0.3 },
  interaction: { reachPx: 8 },
  villagers: {
    walkSpeedTilesPerSecond: 1.5,
    minRestSeconds: 2,
    maxRestSeconds: 6,
    giveUpSeconds: 1.5,
  },
  rainyDay: { shelterAt: 0.35, hurryFactor: 1.7 },
  social: {
    chatRangeTiles: 2,
    chatSeconds: 6,
    chatTurnSeconds: 1.5,
    gatherChatRangeTiles: 5,
    chatCooldownSeconds: 15,
    waveRangeTiles: 2.5,
    waveSeconds: 1.8,
    waveCooldownSeconds: 40,
    humMinSeconds: 8,
    humMaxSeconds: 20,
    humSeconds: 2.5,
    catchShare: 0.5,
  },
  lakeLife: { fishJumpEverySeconds: 8, fishJumpSeconds: 0.9, fishJumpHeightPx: 12 },
  villagerDay: {
    baker: [
      [0.22, 'wander'],
      [0.27, 'bake'],
      [0.55, 'wander'],
      [0.72, 'gather'],
      [0.85, 'home'],
    ],
    keeper: [
      [0.22, 'water'],
      [0.36, 'sweep'],
      [0.5, 'wander'],
      [0.72, 'gather'],
      [0.85, 'home'],
    ],
    owl: [
      [0.22, 'fish'],
      [0.48, 'read'],
      [0.62, 'soak'],
      [0.72, 'owl'],
    ],
  },
  weather: {
    minClearSeconds: 60,
    maxClearSeconds: 90,
    minRainSeconds: 90,
    maxRainSeconds: 120,
    fadeSeconds: 10,
    rainTint: [0.625, 0.715, 0.78],
    dropDensity: 0.55,
    maxDrops: 600,
    lakeRings: 15,
    fallSpeedPx: 210,
    windPx: 45,
  },
  mist: {
    patches: 7,
    appears: 0.17,
    thickFrom: 0.22,
    thickUntil: 0.29,
    gone: 0.4,
    maxOpacity: 0.6,
    driftPx: 2.5,
  },
  lanterns: { first: 0.5, last: 0.95 },
  villageNight: {
    lightsOutFrom: 0.9,
    lightsOutTo: 0.97,
    wakeAt: 0.22,
    stallOpens: 0.26,
    stallCloses: 0.8,
    breakfast: [0.26, 0.34],
    dinner: [0.72, 0.8],
  },
  waterLights: {
    stars: 60,
    lakeStars: 16,
    glints: 24,
    night: [0.83, 0.2],
    dawn: [0.21, 0.3],
    dusk: [0.72, 0.81],
    twinkleSeconds: 3,
    shootingStarEverySeconds: 50,
    shootingStarSeconds: 1.2,
  },
  afterRain: {
    villagePuddles: 4,
    fieldPuddles: 2,
    drySeconds: 40,
  },
  breeze: { swayPx: 3, base: 0.7, rainBoost: 0.5, nightCalm: 0.5, leaves: 10, leafSpeedPx: 20 },
  clouds: { count: 5, speedPx: 4 },
  tour: { enabled: true, idleSeconds: 60, speedPx: 14, holdSeconds: 7, returnSeconds: 2.5 },
  ambience: {
    volume: 0.5,
    layerVolumes: {
      waves: 0.5,
      birds: 0.35,
      crickets: 0.16,
      rain: 0.2,
      fire: 0.5,
      chimes: 0.22,
      chatter: 0.1,
      steps: 0.3,
      bell: 0.28,
      guitar: 0.3,
      spring: 0.3,
    },
    guitar: { nearTiles: 3, farTiles: 14 },
    spring: { nearTiles: 2, farTiles: 9 },
    village: { nearTiles: 1, farTiles: 14 },
    bellTimes: [0.5, 0.75],
    waves: { nearTiles: 2, farTiles: 16, floor: 0.06 },
    indoorDamping: 0.3,
    fireNearTiles: 3,
    sampleMs: 250,
  },
  music: {
    volume: 0.55,
    fadeSeconds: 0.4,
    fadeInSeconds: 3,
    mellowLowpassHz: 1300,
    mellowVolume: 0.7,
    mellowSeconds: 2.5,
  },
  touch: { controls: true, holdMs: 180, stopTiles: 0.4 },
  pointer: { clickToWalk: false },
  debug: {
    fpsSmoothingSharpness: 3,
    overlayRefreshMs: 250,
    showClock: true,
    fpsOnly: true,
    alwaysShowFps: true,
  },
  render: {
    targetTilesAcross: 20,
    minTilesTall: 11,
    defaultZoomSteps: -3,
    touchTargetTilesAcross: 18,
    touchDefaultZoomSteps: 0,
    zoomEnabled: false,
    minPixelScale: 1,
    maxPixelScale: 12,
    waterFrameSeconds: 0.5,
    flowerFrameSeconds: 0.6,
    fireFrameSeconds: 0.14,
    smokePuffSeconds: 3.6,
    grassPatches: { noise: noise(0.07, 2), threshold: 0.55, shade: 0.92, ditherSpread: 0.14 },
    cameraFollowSharpness: 8,
  },
  validation: { minLandShare: 0.2, maxLandShare: 0.65, minReachableShare: 0.3 },
};
