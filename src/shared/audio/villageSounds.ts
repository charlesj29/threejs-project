// Village sounds, made in code like the rest: wind chimes (soft bell tones
// from a pentatonic scale), a murmur of distant voices (filtered noise shaped
// into syllables), footsteps on different ground, and a distant village bell.
import type { Rng } from '@/shared/engine/random';
import { filter } from './ambienceSounds';

/** What a footstep sounds like (the game names the ground underfoot). */
export type FootstepGround = 'path' | 'grass' | 'sand' | 'wood';

/** A gentle major-pentatonic set, high and airy. */
const CHIME_NOTES = [1047, 1175, 1319, 1568, 1760, 2093] as const;
const BELL = { pitch: 330, strikes: 3, gapSeconds: 2.4, ringSeconds: 4.5 } as const;
/** A bell's overtones (ratios to the note) and their levels: slightly out of tune, like bronze. */
const BELL_PARTIALS = [
  [1, 0.5],
  [2.01, 0.28],
  [2.76, 0.18],
  [5.4, 0.08],
] as const;

function envelope(
  context: BaseAudioContext,
  time: number,
  peak: number,
  attack: number,
  decay: number,
): GainNode {
  const node = context.createGain();
  node.gain.setValueAtTime(0, time);
  node.gain.linearRampToValueAtTime(peak, time + attack);
  node.gain.exponentialRampToValueAtTime(0.0001, time + attack + decay);
  return node;
}

/** One to three chime tones, a little apart, ringing out slowly. */
export function chimes(context: BaseAudioContext, out: AudioNode, time: number, rng: Rng): number {
  const pan = context.createStereoPanner();
  pan.pan.value = rng.range(-0.6, 0.6);
  pan.connect(out);
  let t = time;
  for (let i = rng.int(1, 3); i > 0; i--) {
    const osc = context.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = rng.pick(CHIME_NOTES);
    const ring = rng.range(1.6, 2.6);
    osc.connect(envelope(context, t, rng.range(0.25, 0.45), 0.004, ring)).connect(pan);
    osc.start(t);
    osc.stop(t + ring + 0.1);
    t += rng.range(0.12, 0.4);
  }
  return t;
}

/** A continuous source of "voice" noise (two vowel-like bands) for the murmur to shape. */
export function voiceBed(context: BaseAudioContext, noise: AudioBuffer, out: AudioNode): GainNode {
  const syllables = context.createGain();
  syllables.gain.value = 0;
  const source = context.createBufferSource();
  source.buffer = noise;
  source.loop = true;
  const low = filter(context, 'bandpass', 520, 3);
  const high = filter(context, 'bandpass', 1450, 4);
  source.connect(low).connect(syllables);
  source.connect(high).connect(syllables);
  syllables.connect(filter(context, 'lowpass', 1800)).connect(out);
  source.start(0, 0.7);
  return syllables;
}

/** One soft "syllable" of distant talk: a short swell of the voice bed. */
export function syllable(syllables: GainNode, time: number, rng: Rng): number {
  const length = rng.range(0.09, 0.22);
  const peak = rng.range(0.4, 1);
  syllables.gain.setValueAtTime(0, time);
  syllables.gain.linearRampToValueAtTime(peak, time + length * 0.35);
  syllables.gain.linearRampToValueAtTime(0, time + length);
  // Now and then a pause between phrases.
  return time + length + (rng.chance(0.15) ? rng.range(0.6, 1.6) : rng.range(0.02, 0.08));
}

/** A footstep: a short burst shaped by the ground (crunch, swish, hush or hollow knock). */
export function footstep(
  context: BaseAudioContext,
  noise: AudioBuffer,
  out: AudioNode,
  time: number,
  ground: FootstepGround,
  rng: Rng,
): void {
  const burst = (hz: number, q: number, length: number, peak: number, at: number): void => {
    const source = context.createBufferSource();
    source.buffer = noise;
    source
      .connect(filter(context, 'bandpass', hz * rng.range(0.9, 1.1), q))
      .connect(envelope(context, at, peak, 0.004, length))
      .connect(out);
    source.start(at, rng.range(0, 2));
    source.stop(at + length + 0.05);
  };
  switch (ground) {
    case 'path': // gravel: two quick crunches
      burst(2400, 1.4, 0.035, 0.6, time);
      burst(1800, 1.2, 0.04, 0.45, time + 0.03);
      break;
    case 'grass':
      burst(900, 0.8, 0.07, 0.35, time);
      break;
    case 'sand':
      burst(1300, 0.6, 0.09, 0.3, time);
      break;
    case 'wood': {
      // A hollow knock: a low thump with a light click.
      const osc = context.createOscillator();
      osc.frequency.setValueAtTime(150, time);
      osc.frequency.exponentialRampToValueAtTime(85, time + 0.07);
      osc.connect(envelope(context, time, 0.7, 0.003, 0.08)).connect(out);
      osc.start(time);
      osc.stop(time + 0.12);
      burst(1300, 2, 0.015, 0.25, time);
      break;
    }
  }
}

/** The village bell, far off: three slow strikes that ring and fade. */
export function bell(context: BaseAudioContext, out: AudioNode, time: number): void {
  const far = filter(context, 'lowpass', 2400);
  far.connect(out);
  for (let strike = 0; strike < BELL.strikes; strike++) {
    const at = time + strike * BELL.gapSeconds;
    for (const [ratio, level] of BELL_PARTIALS) {
      const osc = context.createOscillator();
      osc.frequency.value = BELL.pitch * ratio;
      // Higher overtones die away faster.
      osc
        .connect(envelope(context, at, level, 0.006, BELL.ringSeconds / ratio ** 0.5))
        .connect(far);
      osc.start(at);
      osc.stop(at + BELL.ringSeconds + 0.1);
    }
  }
}

/**
 * One chord on a little guitar, picked note by note (low to high), each string
 * a soft pluck: a triangle tone with a quiet octave above, quick to sound and
 * slow to die away. Returns when the next chord should start.
 */
export function strum(
  context: BaseAudioContext,
  out: AudioNode,
  time: number,
  chord: readonly number[],
  rng: Rng,
): number {
  let t = time;
  for (const frequency of chord) {
    for (const [type, multiple, peak] of [
      ['triangle', 1, 0.5],
      ['sine', 2, 0.12],
    ] as const) {
      const osc = context.createOscillator();
      osc.type = type;
      osc.frequency.value = frequency * multiple;
      const ring = rng.range(1.4, 1.9);
      osc.connect(envelope(context, t, peak, 0.006, ring)).connect(out);
      osc.start(t);
      osc.stop(t + ring + 0.1);
    }
    t += rng.range(0.32, 0.4);
  }
  return t + rng.range(0.15, 0.3);
}

/** The rooster's "cock-a-doodle-doo": three short calls, then a long one that rises and falls. */
const CROW_NOTES: readonly (readonly [start: number, peak: number, seconds: number])[] = [
  [520, 640, 0.11],
  [600, 700, 0.1],
  [640, 760, 0.12],
  [700, 980, 0.55],
];

/** A soft, slightly far-off crow (a reedy tone through a gentle filter). */
export function crow(context: BaseAudioContext, out: AudioNode, time: number): void {
  const soft = filter(context, 'bandpass', 1300, 0.9);
  soft.connect(out);
  let at = time;
  for (const [start, peak, seconds] of CROW_NOTES) {
    const osc = context.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(start, at);
    osc.frequency.linearRampToValueAtTime(peak, at + seconds * 0.35);
    osc.frequency.linearRampToValueAtTime(start * 0.92, at + seconds);
    osc.connect(envelope(context, at, 0.22, 0.015, seconds)).connect(soft);
    osc.start(at);
    osc.stop(at + seconds + 0.05);
    at += seconds + 0.04;
  }
}
