// The beach campfire: a ring of stones round a bed of charred logs and embers
// (32×32 over its 2×2 footprint), flames that dance in four frames (drawn on
// top while it burns), a spark, a soft warm glow for the sand round it at
// night, and the seats: a log lying on its side and an upright log stool.
// Light from the top-left, like everything else.
import type { SpriteSource } from '@/shared/render/atlasLayout';
import {
  createPixelCanvas,
  fillRect,
  hexToRgba,
  setPixel,
  type PixelCanvas,
} from '@/shared/render/pixelCanvas';
import { createRng, hashString } from '@/shared/engine/random';
import { fillShape, insideEllipse } from './paint';
import { paintClumps, type Clump } from './foliage';
import { PALETTE } from './palette';

export const CAMPFIRE_KEY = 'campfire';
export const CAMPFIRE_FLAME_KEYS = [
  'campfire_flame_0',
  'campfire_flame_1',
  'campfire_flame_2',
  'campfire_flame_3',
] as const;
export const CAMPFIRE_SPARK_KEY = 'campfire_spark';
/** The warm glow on the ground round the fire (blended; faded in at night). */
export const CAMPFIRE_GLOW_KEY = 'glow_campfire';
/**
 * Where the flames stand on the fire sprite (sprite pixels from its top-left):
 * the middle of the fire bed, at the flames' foot.
 */
export const CAMPFIRE_FLAME_FOOT = { x: 16, y: 25 } as const;

const W = 32;
const H = 32;
/** The fire bed inside the ring. */
const BED = { cx: 16, cy: 22, rx: 9, ry: 5.5 } as const;
const RING = { rx: 12.5, ry: 8, stones: 11 } as const;

const ASH = hexToRgba('#4a3c34');
const CHAR = hexToRgba('#2c2420');

function fireRing(): PixelCanvas {
  const c = createPixelCanvas(W, H);
  const rng = createRng(hashString(CAMPFIRE_KEY));
  const stones: Clump[] = Array.from({ length: RING.stones }, (_, i) => {
    const angle = (i / RING.stones) * Math.PI * 2 + rng.range(-0.1, 0.1);
    return {
      cx: BED.cx + Math.cos(angle) * RING.rx,
      cy: BED.cy + Math.sin(angle) * RING.ry,
      r: rng.range(2.8, 3.6),
    };
  }).sort((a, b) => a.cy - b.cy);
  paintClumps(c, stones, PALETTE.rock);
  // The bed of ash, two charred logs crossed on it, and a few embers.
  fillShape(c, (x, y) => insideEllipse(x, y, BED.cx, BED.cy, BED.rx, BED.ry), ASH);
  for (let i = 0; i < 9; i++) {
    setPixel(c, 10 + i, 20 + Math.floor(i / 3), CHAR);
    setPixel(c, 10 + i, 21 + Math.floor(i / 3), PALETTE.bark.dark);
    setPixel(c, 21 - i, 20 + Math.floor(i / 3), CHAR);
    setPixel(c, 21 - i, 21 + Math.floor(i / 3), PALETTE.bark.base);
  }
  for (const [x, y] of [
    [13, 23],
    [18, 22],
    [16, 24],
  ] as const) {
    setPixel(c, x, y, PALETTE.fire.deep);
  }
  return c;
}

/** Heights of the three tongues of flame per frame (left, middle, right). */
const FLAME_HEIGHTS: readonly (readonly [number, number, number])[] = [
  [7, 13, 8],
  [9, 11, 6],
  [6, 14, 9],
  [8, 12, 7],
];

/** 16×18: three tongues of flame over a glowing heart; the foot is the middle of the bottom row. */
function flame(frame: number): PixelCanvas {
  const c = createPixelCanvas(16, 18);
  const fire = PALETTE.fire;
  const heights = FLAME_HEIGHTS[frame % FLAME_HEIGHTS.length] ?? [8, 12, 8];
  heights.forEach((height, i) => {
    const cx = 4.5 + i * 3.5;
    const sway = frame % 2 === 0 ? 0 : i === 1 ? 0.5 : -0.5;
    fillShape(
      c,
      (x, y) => insideEllipse(x, y, cx + sway, 17 - height / 2, 2.4, height / 2 + 0.5),
      fire.deep,
    );
  });
  heights.forEach((height, i) => {
    const cx = 4.5 + i * 3.5;
    fillShape(
      c,
      (x, y) => insideEllipse(x, y, cx, 17 - height / 3, 1.4, height / 3 + 0.5),
      fire.mid,
    );
  });
  fillShape(c, (x, y) => insideEllipse(x, y, 8, 15.5, 2.5, 2.5), fire.bright);
  return c;
}

function spark(): PixelCanvas {
  const c = createPixelCanvas(2, 2);
  fillRect(c, 0, 0, 2, 2, PALETTE.fire.bright);
  return c;
}

/** A wide, soft pool of warm light: feathered towards its edge. */
function glow(): PixelCanvas {
  const width = 112;
  const height = 72;
  const c = createPixelCanvas(width, height);
  const alphas = [26, 48, 72, 96] as const;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let band = -1;
      alphas.forEach((_, i) => {
        if (insideEllipse(x, y, width / 2, height / 2, width / 2 - i * 9, height / 2 - i * 6))
          band = i;
      });
      const alpha = alphas[band];
      if (alpha !== undefined) setPixel(c, x, y, hexToRgba('#ffb45a', alpha));
    }
  }
  return c;
}

/** 32×16 over 2×1: a log lying on its side, cut ends showing their rings. */
function logBench(): PixelCanvas {
  const c = createPixelCanvas(32, 16);
  const bark = PALETTE.bark;
  const wood = PALETTE.heartwood;
  fillRect(c, 2, 4, 28, 10, bark.outline);
  fillRect(c, 3, 5, 26, 8, bark.base);
  fillRect(c, 3, 5, 26, 2, bark.light); // the seat, worn smooth
  fillRect(c, 3, 11, 26, 2, bark.dark);
  for (const x of [8, 15, 23]) fillRect(c, x, 8, 3, 1, bark.dark); // bark cracks
  // The cut ends: rings of pale wood.
  for (const x of [1, 27]) {
    fillShape(c, (px, py) => insideEllipse(px, py, x + 2, 9, 2.6, 5), bark.outline);
    fillShape(c, (px, py) => insideEllipse(px, py, x + 2, 9, 1.8, 4), wood.base);
    setPixel(c, x + 2, 9, wood.dark);
  }
  return c;
}

/** 16×16 over 1×1: a short upright log to sit on, its top showing the rings. */
function logStool(): PixelCanvas {
  const c = createPixelCanvas(16, 16);
  const bark = PALETTE.bark;
  const wood = PALETTE.heartwood;
  fillRect(c, 3, 6, 10, 9, bark.outline);
  fillRect(c, 4, 7, 8, 7, bark.base);
  fillRect(c, 4, 7, 2, 7, bark.light);
  fillRect(c, 10, 7, 2, 7, bark.dark);
  fillShape(c, (x, y) => insideEllipse(x, y, 8, 6, 5.2, 3), bark.outline);
  fillShape(c, (x, y) => insideEllipse(x, y, 8, 6, 4.2, 2.1), wood.base);
  fillShape(c, (x, y) => insideEllipse(x, y, 8, 6, 2.2, 1), wood.light);
  setPixel(c, 8, 6, wood.dark);
  return c;
}

export function paintCampfireSprites(): SpriteSource[] {
  return [
    { key: CAMPFIRE_KEY, frames: [fireRing()] },
    ...CAMPFIRE_FLAME_KEYS.map((key, i) => ({ key, frames: [flame(i)] })),
    { key: CAMPFIRE_SPARK_KEY, frames: [spark()] },
    { key: CAMPFIRE_GLOW_KEY, frames: [glow()] },
    { key: 'log_bench', frames: [logBench()] },
    { key: 'log_stool', frames: [logStool()] },
  ];
}
