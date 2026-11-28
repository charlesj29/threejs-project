// The nature sounds, built from noise and oscillators (no audio files):
// steady beds (surf, rain, the fire's rumble) and short events scheduled on
// the audio clock (a bird's chirps, a cricket's trill, a crackle in the fire,
// a bubble rising in the hot spring).
import type { Rng } from '@/shared/engine/random';

const NOISE_SECONDS = 3;

/** Deterministic white noise to loop (the same every time). */
export function noiseBuffer(context: BaseAudioContext, seed: number): AudioBuffer {
  const buffer = context.createBuffer(1, context.sampleRate * NOISE_SECONDS, context.sampleRate);
  const data = buffer.getChannelData(0);
  let state = seed;
  for (let i = 0; i < data.length; i++) {
    state = (state * 1664525 + 1013904223) % 4294967296;
    data[i] = (state / 4294967296) * 2 - 1;
  }
  return buffer;
}

export function filter(
  context: BaseAudioContext,
  type: BiquadFilterType,
  hz: number,
  q = 0.7,
): BiquadFilterNode {
  const node = context.createBiquadFilter();
  node.type = type;
  node.frequency.value = hz;
  node.Q.value = q;
  return node;
}

function gain(context: BaseAudioContext, value: number): GainNode {
  const node = context.createGain();
  node.gain.value = value;
  return node;
}

function loopNoise(
  context: BaseAudioContext,
  noise: AudioBuffer,
  offset: number,
): AudioBufferSourceNode {
  const source = context.createBufferSource();
  source.buffer = noise;
  source.loop = true;
  source.start(0, offset);
  return source;
}

/** A slow wobble added to a gain (in place of a fixed level). */
function swell(context: BaseAudioContext, target: AudioParam, hz: number, depth: number): void {
  const osc = context.createOscillator();
  osc.frequency.value = hz;
  const amount = gain(context, depth);
  osc.connect(amount).connect(target);
  osc.start();
}

/** Surf: low rolling noise that swells and ebbs like waves, with a little fizz of foam. */
export function surf(context: BaseAudioContext, noise: AudioBuffer, out: AudioNode): void {
  const body = gain(context, 0.55);
  swell(context, body.gain, 0.09, 0.3);
  swell(context, body.gain, 0.053, 0.15);
  loopNoise(context, noise, 0)
    .connect(filter(context, 'lowpass', 480))
    .connect(body)
    .connect(out);
  const foam = gain(context, 0.12);
  swell(context, foam.gain, 0.09, 0.08);
  loopNoise(context, noise, 1.1)
    .connect(filter(context, 'bandpass', 2400, 0.5))
    .connect(foam)
    .connect(out);
}

/** Soft rain: a gentle hush of fine drops (highs rolled off, no sharp hiss) over a low patter. */
export function rainfall(context: BaseAudioContext, noise: AudioBuffer, out: AudioNode): void {
  loopNoise(context, noise, 0.4)
    .connect(filter(context, 'highpass', 600))
    .connect(filter(context, 'lowpass', 2600))
    .connect(gain(context, 0.4))
    .connect(out);
  loopNoise(context, noise, 2.2)
    .connect(filter(context, 'bandpass', 360, 0.6))
    .connect(gain(context, 0.25))
    .connect(out);
}

/** The fire's low, breathy rumble (crackles are scheduled separately). */
export function fireBed(context: BaseAudioContext, noise: AudioBuffer, out: AudioNode): void {
  const body = gain(context, 0.4);
  swell(context, body.gain, 0.31, 0.12);
  loopNoise(context, noise, 1.7)
    .connect(filter(context, 'lowpass', 200))
    .connect(body)
    .connect(out);
}

/** A tiny pop in the fire: a few milliseconds of bright noise. */
export function crackle(
  context: BaseAudioContext,
  noise: AudioBuffer,
  out: AudioNode,
  time: number,
  rng: Rng,
): void {
  const source = context.createBufferSource();
  source.buffer = noise;
  const length = rng.range(0.004, 0.02);
  const level = gain(context, 0);
  level.gain.setValueAtTime(rng.range(0.25, 0.7), time);
  level.gain.exponentialRampToValueAtTime(0.001, time + length);
  source
    .connect(filter(context, 'bandpass', rng.range(1600, 3600), 1.2))
    .connect(level)
    .connect(out);
  source.start(time, rng.range(0, NOISE_SECONDS - 0.1));
  source.stop(time + length + 0.01);
}

/** A little bird phrase: a few quick rising chirps, off to one side. */
export function birdPhrase(
  context: BaseAudioContext,
  out: AudioNode,
  time: number,
  rng: Rng,
): number {
  const pan = context.createStereoPanner();
  pan.pan.value = rng.range(-0.8, 0.8);
  pan.connect(out);
  const notes = rng.int(2, 5);
  const pitch = rng.range(2600, 3800);
  let t = time;
  for (let i = 0; i < notes; i++) {
    const osc = context.createOscillator();
    osc.type = 'sine';
    const length = rng.range(0.05, 0.09);
    osc.frequency.setValueAtTime(pitch * rng.range(0.95, 1.05), t);
    osc.frequency.exponentialRampToValueAtTime(pitch * rng.range(1.25, 1.5), t + length);
    const level = gain(context, 0);
    level.gain.setValueAtTime(0, t);
    level.gain.linearRampToValueAtTime(0.22, t + length * 0.3);
    level.gain.linearRampToValueAtTime(0, t + length);
    osc.connect(level).connect(pan);
    osc.start(t);
    osc.stop(t + length + 0.02);
    t += length + rng.range(0.04, 0.09);
  }
  return t;
}

/** A cricket's trill: three short pulses of a high tone. */
export function cricketTrill(
  context: BaseAudioContext,
  out: AudioNode,
  time: number,
  pitch: number,
): void {
  const osc = context.createOscillator();
  osc.frequency.value = pitch;
  const level = gain(context, 0);
  for (let i = 0; i < 3; i++) {
    const t = time + i * 0.045;
    level.gain.setValueAtTime(0, t);
    level.gain.linearRampToValueAtTime(0.18, t + 0.008);
    level.gain.linearRampToValueAtTime(0, t + 0.03);
  }
  osc.connect(level).connect(out);
  osc.start(time);
  osc.stop(time + 0.16);
}

/** The hot spring's soft lapping: a quiet, gently swelling wash of water. */
export function springBed(context: BaseAudioContext, noise: AudioBuffer, out: AudioNode): void {
  const body = gain(context, 0.18);
  swell(context, body.gain, 0.23, 0.06);
  loopNoise(context, noise, 0.9)
    .connect(filter(context, 'bandpass', 900, 0.8))
    .connect(body)
    .connect(out);
}

/** One bubble coming up in the warm water: a short, soft "bloop" sliding upwards. */
export function bubble(context: BaseAudioContext, out: AudioNode, time: number, rng: Rng): void {
  const osc = context.createOscillator();
  osc.type = 'sine';
  const pitch = rng.range(260, 620);
  const length = rng.range(0.04, 0.08);
  osc.frequency.setValueAtTime(pitch, time);
  osc.frequency.exponentialRampToValueAtTime(pitch * rng.range(1.8, 2.6), time + length);
  const level = gain(context, 0);
  level.gain.setValueAtTime(0, time);
  level.gain.linearRampToValueAtTime(rng.range(0.12, 0.25), time + 0.008);
  level.gain.exponentialRampToValueAtTime(0.001, time + length);
  osc.connect(level).connect(out);
  osc.start(time);
  osc.stop(time + length + 0.02);
}
