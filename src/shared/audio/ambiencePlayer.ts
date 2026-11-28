// Nature sounds under the music: surf, rain, a fire, birds and crickets, each
// a layer whose level the game sets (louder near the sea, birds by day,
// crickets at night...). Levels glide, so walking about never jumps. Short
// sounds are queued ahead on the audio clock. Like the music, it can only
// start after a user gesture: call `start()` from one.
import { createRng } from '@/shared/engine/random';
import {
  birdPhrase,
  bubble,
  crackle,
  cricketTrill,
  fireBed,
  noiseBuffer,
  rainfall,
  springBed,
  surf,
} from './ambienceSounds';
import { startTicker, type Ticker } from './ticker';
import {
  bell,
  chimes,
  footstep,
  strum,
  syllable,
  voiceBed,
  type FootstepGround,
} from './villageSounds';

export type AmbienceLayer =
  | 'waves'
  | 'birds'
  | 'crickets'
  | 'rain'
  | 'fire'
  | 'chimes'
  | 'chatter'
  | 'steps'
  | 'bell'
  /** A little guitar played at the evening gathering. */
  | 'guitar'
  /** The hot spring: soft lapping and bubbles. */
  | 'spring';
/** 0..1 per layer. */
export type AmbienceLevels = Readonly<Record<AmbienceLayer, number>>;

export const AMBIENCE_LAYERS: readonly AmbienceLayer[] = [
  'waves',
  'birds',
  'crickets',
  'rain',
  'fire',
  'chimes',
  'chatter',
  'steps',
  'bell',
  'guitar',
  'spring',
];

export interface AmbiencePlayerOptions {
  /** 0..1 volume of the whole layer. */
  readonly volume: number;
  readonly fadeSeconds: number;
  readonly fadeInSeconds: number;
  /** Each layer at full level, balanced against the others (0..1). */
  readonly layerVolumes: AmbienceLevels;
}

export interface AmbiencePlayer {
  start: () => Promise<void>;
  setMuted: (muted: boolean) => void;
  setLevels: (levels: AmbienceLevels) => void;
  /** A footstep on this ground, now. */
  footstep: (ground: FootstepGround) => void;
  /** The distant village bell (three strikes). */
  ringBell: () => void;
  dispose: () => void;
}

/** How quickly a layer follows a new level (seconds, time constant). */
const GLIDE_SECONDS = 0.8;
/** Below this a layer counts as silent, and its short sounds aren't queued. */
const AUDIBLE = 0.02;
const LOOKAHEAD_SECONDS = 0.4;
const TICK_MS = 50;
/** Seconds between bird phrases (scaled down when birds are loud), crackles and trills. */
const BIRD_GAP = { min: 1.8, max: 6.5 } as const;
const CRACKLE_GAP = { min: 0.05, max: 0.45 } as const;
const CHIME_GAP = { min: 2.5, max: 7 } as const;
const BUBBLE_GAP = { min: 0.12, max: 0.9 } as const;
const CRICKETS = [
  { pitch: 4600, every: 0.72 },
  { pitch: 5150, every: 0.93 },
] as const;
const RNG_SEED = 0xa3b1;
/** The guitar's slow, warm round of chords (C, A minor, F, G), each picked low to high (Hz). */
const GUITAR_CHORDS: readonly (readonly number[])[] = [
  [130.81, 196, 261.63, 329.63],
  [110, 164.81, 220, 261.63],
  [87.31, 130.81, 174.61, 220],
  [98, 146.83, 196, 246.94],
];

interface Graph {
  readonly context: AudioContext;
  readonly master: GainNode;
  readonly layers: Readonly<Record<AmbienceLayer, GainNode>>;
  readonly noise: AudioBuffer;
  /** The murmur's syllables open and close this gain on the voice bed. */
  readonly syllables: GainNode;
}

function buildGraph(context: AudioContext): Graph {
  const master = context.createGain();
  master.gain.value = 0;
  master.connect(context.destination);
  const layer = (): GainNode => {
    const node = context.createGain();
    node.gain.value = 0;
    node.connect(master);
    return node;
  };
  const layers = {
    waves: layer(),
    birds: layer(),
    crickets: layer(),
    rain: layer(),
    fire: layer(),
    chimes: layer(),
    chatter: layer(),
    steps: layer(),
    bell: layer(),
    guitar: layer(),
    spring: layer(),
  };
  const noise = noiseBuffer(context, 11);
  surf(context, noise, layers.waves);
  rainfall(context, noise, layers.rain);
  fireBed(context, noise, layers.fire);
  springBed(context, noise, layers.spring);
  const syllables = voiceBed(context, noise, layers.chatter);
  return { context, master, layers, noise, syllables };
}

export function createAmbiencePlayer(options: AmbiencePlayerOptions): AmbiencePlayer {
  let graph: Graph | null = null;
  let ticker: Ticker | null = null;
  let muted = false;
  let levels: AmbienceLevels = {
    waves: 0,
    birds: 0,
    crickets: 0,
    rain: 0,
    fire: 0,
    chimes: 0,
    chatter: 0,
    steps: 0,
    bell: 0,
    guitar: 0,
    spring: 0,
  };
  const rng = createRng(RNG_SEED);
  const next = {
    bird: 0,
    crackle: 0,
    chime: 0,
    syllable: 0,
    strum: 0,
    chord: 0,
    bubble: 0,
    crickets: CRICKETS.map(() => 0),
  };

  /** Queues the short sounds due before the lookahead horizon (or skips them while silent). */
  const tick = (): void => {
    if (!graph || graph.context.state !== 'running') return;
    const { context, layers, noise } = graph;
    const now = context.currentTime;
    const horizon = now + LOOKAHEAD_SECONDS;
    if (levels.birds < AUDIBLE) next.bird = Math.max(next.bird, now);
    while (levels.birds >= AUDIBLE && next.bird < horizon) {
      const end = birdPhrase(context, layers.birds, Math.max(next.bird, now), rng);
      next.bird = end + rng.range(BIRD_GAP.min, BIRD_GAP.max) / (0.5 + levels.birds);
    }
    if (levels.fire < AUDIBLE) next.crackle = Math.max(next.crackle, now);
    while (levels.fire >= AUDIBLE && next.crackle < horizon) {
      crackle(context, noise, layers.fire, Math.max(next.crackle, now), rng);
      next.crackle = Math.max(next.crackle, now) + rng.range(CRACKLE_GAP.min, CRACKLE_GAP.max);
    }
    if (levels.chimes < AUDIBLE) next.chime = Math.max(next.chime, now);
    while (levels.chimes >= AUDIBLE && next.chime < horizon) {
      const end = chimes(context, layers.chimes, Math.max(next.chime, now), rng);
      next.chime = end + rng.range(CHIME_GAP.min, CHIME_GAP.max) / (0.5 + levels.chimes);
    }
    if (levels.chatter < AUDIBLE) next.syllable = Math.max(next.syllable, now);
    while (levels.chatter >= AUDIBLE && next.syllable < horizon) {
      next.syllable = syllable(graph.syllables, Math.max(next.syllable, now), rng);
    }
    // The guitar: chord after chord round the progression, while it can be heard.
    if (levels.guitar < AUDIBLE) next.strum = Math.max(next.strum, now);
    while (levels.guitar >= AUDIBLE && next.strum < horizon) {
      const chord = GUITAR_CHORDS[next.chord % GUITAR_CHORDS.length] ?? [];
      next.strum = strum(context, layers.guitar, Math.max(next.strum, now), chord, rng);
      next.chord += 1;
    }
    if (levels.spring < AUDIBLE) next.bubble = Math.max(next.bubble, now);
    while (levels.spring >= AUDIBLE && next.bubble < horizon) {
      bubble(context, layers.spring, Math.max(next.bubble, now), rng);
      next.bubble = Math.max(next.bubble, now) + rng.range(BUBBLE_GAP.min, BUBBLE_GAP.max);
    }
    CRICKETS.forEach((cricket, i) => {
      let at = Math.max(next.crickets[i] ?? 0, now);
      while (levels.crickets >= AUDIBLE && at < horizon) {
        cricketTrill(context, layers.crickets, at, cricket.pitch);
        at += cricket.every * rng.range(0.9, 1.1);
      }
      next.crickets[i] = at;
    });
  };

  const fadeTo = (level: number, seconds: number): void => {
    if (!graph) return;
    const { gain } = graph.master;
    const now = graph.context.currentTime;
    gain.cancelScheduledValues(now);
    gain.setValueAtTime(gain.value, now);
    gain.linearRampToValueAtTime(level, now + seconds);
  };

  const applyLevels = (): void => {
    if (!graph) return;
    const now = graph.context.currentTime;
    for (const layer of AMBIENCE_LAYERS) {
      const target = Math.max(0, Math.min(1, levels[layer])) * options.layerVolumes[layer];
      graph.layers[layer].gain.setTargetAtTime(target, now, GLIDE_SECONDS);
    }
  };

  const onVisibility = (): void => {
    if (!graph) return;
    if (document.hidden) void graph.context.suspend();
    else if (!muted) void graph.context.resume();
  };

  return {
    start: async () => {
      if (!graph) {
        graph = buildGraph(new AudioContext({ latencyHint: 'playback' }));
        ticker = startTicker(TICK_MS, tick);
        document.addEventListener('visibilitychange', onVisibility);
        await graph.context.resume();
        applyLevels();
        fadeTo(muted ? 0 : options.volume, options.fadeInSeconds);
        return;
      }
      await graph.context.resume();
      fadeTo(muted ? 0 : options.volume, options.fadeSeconds);
    },
    setMuted: (value) => {
      muted = value;
      const current = graph;
      if (!current) return;
      if (muted) {
        fadeTo(0, options.fadeSeconds);
        window.setTimeout(() => {
          if (muted) void current.context.suspend();
        }, options.fadeSeconds * 1000);
      } else {
        void current.context.resume().then(() => fadeTo(options.volume, options.fadeSeconds));
      }
    },
    setLevels: (value) => {
      levels = value;
      applyLevels();
    },
    footstep: (ground) => {
      if (!graph || graph.context.state !== 'running' || levels.steps < AUDIBLE) return;
      footstep(
        graph.context,
        graph.noise,
        graph.layers.steps,
        graph.context.currentTime,
        ground,
        rng,
      );
    },
    ringBell: () => {
      if (!graph || graph.context.state !== 'running' || levels.bell < AUDIBLE) return;
      bell(graph.context, graph.layers.bell, graph.context.currentTime + 0.05);
    },
    dispose: () => {
      ticker?.stop();
      document.removeEventListener('visibilitychange', onVisibility);
      void graph?.context.close();
      graph = null;
      ticker = null;
    },
  };
}
