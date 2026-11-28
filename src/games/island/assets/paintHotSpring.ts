// The hot spring: a warm, milky-turquoise pool in a ring of rounded rocks
// (64×48 over its 4×3 footprint), plus its near half on its own (drawn in
// front of anyone soaking, so they sit in the water up to the chest), a ring
// of ripples round a soaker, soft steam puffs, and a little stone lantern
// whose window glows after dark. Light from the top-left, like everything else.
import type { SpriteSource } from '@/shared/render/atlasLayout';
import {
  createPixelCanvas,
  fillRect,
  hexToRgba,
  setPixel,
  type PixelCanvas,
  type Rgba,
} from '@/shared/render/pixelCanvas';
import { createRng, hashString } from '@/shared/engine/random';
import { insideEllipse } from './paint';
import { paintClumps, type Clump } from './foliage';
import { PALETTE } from './palette';

export const HOT_SPRING_KEY = 'hot_spring';
export const HOT_SPRING_FRONT_KEY = 'hot_spring_front';
export const SOAK_RIPPLE_KEYS = ['soak_ripple_0', 'soak_ripple_1'] as const;
/** Soft steam puffs (blended, like the mist). */
export const SPRING_STEAM_KEYS = ['mist_steam_0', 'mist_steam_1', 'mist_steam_2'] as const;

const W = 64;
const H = 48;
/** The water: an ellipse inside the ring of rocks. */
const WATER = { cx: 32, cy: 24.5, rx: 23.5, ry: 14.5 } as const;
/** The rocks sit round this ellipse. */
const RIM = { rx: 27, ry: 18.5, rocks: 18 } as const;
/**
 * The water line: rows from here down are the pool's near half, drawn in front of soakers.
 * A soaker's chest sits on it (see `SOAK_LIFT_PX` in CharacterSprite).
 */
export const HOT_SPRING_WATERLINE = 27;
/** Where steam rises from (sprite pixels from the top-left): spread over the water. */
export const SPRING_STEAM_SPOTS: readonly { readonly x: number; readonly y: number }[] = [
  { x: 18, y: 20 },
  { x: 30, y: 16 },
  { x: 44, y: 21 },
  { x: 25, y: 30 },
  { x: 38, y: 32 },
  { x: 50, y: 27 },
];

/** Milky warm water: darker in the shade under the far rim, glints on top. */
const WATER_TONES = {
  shade: hexToRgba('#4f9fb4'),
  base: hexToRgba('#78c8d4'),
  light: hexToRgba('#9edde2'),
  glint: hexToRgba('#e2f8f6'),
} as const;

function pool(): PixelCanvas {
  const c = createPixelCanvas(W, H);
  const rng = createRng(hashString(HOT_SPRING_KEY));
  // Rocks round the rim, far ones first so the near ones overlap them.
  const rocks: Clump[] = Array.from({ length: RIM.rocks }, (_, i) => {
    const angle = (i / RIM.rocks) * Math.PI * 2 + rng.range(-0.08, 0.08);
    return {
      cx: WATER.cx + Math.cos(angle) * RIM.rx,
      cy: WATER.cy + Math.sin(angle) * RIM.ry,
      r: rng.range(4.6, 6),
    };
  }).sort((a, b) => a.cy - b.cy);
  paintClumps(c, rocks, PALETTE.rock);
  // The water over the inner half of the rocks.
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!insideEllipse(x, y, WATER.cx, WATER.cy, WATER.rx, WATER.ry)) continue;
      // The far rim shades the water just below it.
      const shaded = !insideEllipse(x, y - 3, WATER.cx, WATER.cy, WATER.rx, WATER.ry);
      setPixel(c, x, y, shaded ? WATER_TONES.shade : WATER_TONES.base);
    }
  }
  // Lighter swirls of warm water and a few glints.
  const swirls: readonly (readonly [number, number, number])[] = [
    [20, 19, 7],
    [36, 17, 5],
    [27, 25, 9],
    [43, 28, 6],
    [18, 31, 5],
    [33, 34, 7],
  ];
  for (const [x, y, length] of swirls) fillRect(c, x, y, length, 1, WATER_TONES.light);
  for (const [x, y] of [
    [22, 19],
    [38, 17],
    [30, 25],
    [45, 28],
  ] as const) {
    setPixel(c, x, y, WATER_TONES.glint);
  }
  return c;
}

/** The pool's near half: everything from the water line down (the rest clear). */
function poolFront(full: PixelCanvas): PixelCanvas {
  const c = createPixelCanvas(W, H);
  for (let y = HOT_SPRING_WATERLINE; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      if ((full.data[i + 3] ?? 0) === 0) continue;
      setPixel(c, x, y, [full.data[i] ?? 0, full.data[i + 1] ?? 0, full.data[i + 2] ?? 0, 255]);
    }
  }
  return c;
}

/** A thin ring of ripples round a soaker's chest at the water line (two sizes, alternating). */
function ripple(wide: boolean): PixelCanvas {
  const c = createPixelCanvas(18, 4);
  const half = wide ? 8 : 7;
  for (let x = 9 - half; x <= 8 + half; x++) {
    // Only the ends and the near edge show: the body hides the back of the ring.
    const end = x <= 9 - half + 1 || x >= 8 + half - 1;
    setPixel(c, x, end ? 1 : 3, WATER_TONES.glint);
  }
  setPixel(c, 9 - half, 2, WATER_TONES.glint);
  setPixel(c, 8 + half, 2, WATER_TONES.glint);
  return c;
}

/** A soft puff of steam: feathered towards the edge. */
function steamPuff(width: number, height: number): PixelCanvas {
  const c = createPixelCanvas(width, height);
  const cx = (width - 1) / 2;
  const cy = (height - 1) / 2;
  const alphas = [60, 100, 140] as const;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let band = -1;
      alphas.forEach((_, i) => {
        if (insideEllipse(x, y, cx, cy, width / 2 - i * 1.4, height / 2 - i * 1)) band = i;
      });
      const alpha = alphas[band];
      if (alpha !== undefined) setPixel(c, x, y, hexToRgba('#f4f8f8', alpha));
    }
  }
  return c;
}

/** A small stone lantern: a footing, a post, a lamp box with a glowing window, a wide cap. */
function stoneLantern(): PixelCanvas {
  const c = createPixelCanvas(16, 24);
  const stone = PALETTE.rock;
  const block = (x: number, y: number, w: number, h: number, tone: Rgba): void => {
    fillRect(c, x - 1, y - 1, w + 2, h + 2, stone.outline);
    fillRect(c, x, y, w, h, tone);
    fillRect(c, x, y, w, 1, stone.light);
    fillRect(c, x + w - 1, y, 1, h, stone.dark);
  };
  block(4, 21, 8, 2, stone.base); // footing
  block(6, 15, 4, 5, stone.base); // post
  block(4, 8, 8, 6, stone.base); // lamp box
  // The window (window glass, so it glows at night) with a bar across.
  fillRect(c, 6, 10, 4, 3, PALETTE.cabin.glass);
  setPixel(c, 6, 10, PALETTE.cabin.shine);
  // The cap: wide and low, tipped up at the ends, with a knob on top.
  fillRect(c, 2, 5, 12, 3, stone.outline);
  fillRect(c, 1, 6, 1, 1, stone.outline);
  fillRect(c, 14, 6, 1, 1, stone.outline);
  fillRect(c, 3, 6, 10, 1, stone.light);
  fillRect(c, 3, 5, 10, 1, stone.highlight);
  fillRect(c, 6, 2, 4, 3, stone.outline);
  fillRect(c, 7, 3, 2, 2, stone.light);
  return c;
}

export function paintHotSpringSprites(): SpriteSource[] {
  const full = pool();
  return [
    { key: HOT_SPRING_KEY, frames: [full] },
    { key: HOT_SPRING_FRONT_KEY, frames: [poolFront(full)] },
    { key: SOAK_RIPPLE_KEYS[0], frames: [ripple(false)] },
    { key: SOAK_RIPPLE_KEYS[1], frames: [ripple(true)] },
    { key: SPRING_STEAM_KEYS[0], frames: [steamPuff(12, 8)] },
    { key: SPRING_STEAM_KEYS[1], frames: [steamPuff(16, 10)] },
    { key: SPRING_STEAM_KEYS[2], frames: [steamPuff(10, 7)] },
    { key: 'stone_lantern', frames: [stoneLantern()] },
  ];
}
