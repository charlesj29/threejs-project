// In and round the chicken run: a wooden gate (a fence tile; the rails of the
// fence beside it run up to its posts), a feed trough full of grain, a water
// dish, a patch of straw, and tall sunflowers along the outside of the fence.
// 16×16 each, the sunflowers 16×28 (they rise above their tile). Light from
// the top-left, like everything else.
import type { SpriteSource } from '@/shared/render/atlasLayout';
import {
  createPixelCanvas,
  fillRect,
  hexToRgba,
  setPixel,
  type PixelCanvas,
} from '@/shared/render/pixelCanvas';
import { fillShape, insideEllipse } from './paint';
import { PALETTE } from './palette';

const GRAIN = hexToRgba('#e8c46a');
const GRAIN_DARK = hexToRgba('#b8903e');

/** A plank gate between two posts, braced corner to corner, with a latch. */
function gate(): PixelCanvas {
  const c = createPixelCanvas(16, 16);
  const { outline, dark, base, light, highlight } = PALETTE.fence;
  // The frame: top and bottom bars and three upright planks.
  fillRect(c, 1, 4, 14, 11, outline);
  fillRect(c, 2, 5, 12, 9, base);
  for (const x of [5, 8, 11]) fillRect(c, x, 5, 1, 9, dark);
  fillRect(c, 2, 5, 12, 1, light);
  // A brace from the bottom of the hinge side to the top of the latch side.
  for (let i = 0; i < 10; i++) setPixel(c, 3 + i, 13 - Math.floor(i * 0.85), highlight);
  // Posts at both ends, a little taller than the gate, and the latch.
  for (const x of [0, 14]) {
    fillRect(c, x, 2, 2, 14, outline);
    setPixel(c, x + (x === 0 ? 1 : 0), 3, light);
  }
  fillRect(c, 12, 8, 2, 2, PALETTE.rock.dark);
  return c;
}

/** A low wooden trough heaped with grain (seen from above, a little from the front). */
function feedTrough(): PixelCanvas {
  const c = createPixelCanvas(16, 16);
  const wood = PALETTE.dock;
  fillRect(c, 1, 6, 14, 7, wood.outline);
  fillRect(c, 2, 7, 12, 5, wood.base);
  fillRect(c, 2, 11, 12, 1, wood.dark);
  fillRect(c, 3, 7, 10, 3, GRAIN);
  for (const [x, y] of [
    [4, 8],
    [7, 7],
    [9, 9],
    [11, 8],
  ] as const) {
    setPixel(c, x, y, GRAIN_DARK);
  }
  // A few grains spilled on the ground in front.
  for (const [x, y] of [
    [3, 14],
    [8, 14],
    [12, 13],
  ] as const) {
    setPixel(c, x, y, GRAIN);
  }
  return c;
}

/** A round stone dish of water with a glint. */
function waterDish(): PixelCanvas {
  const c = createPixelCanvas(16, 16);
  const stone = PALETTE.rock;
  fillShape(c, (x, y) => insideEllipse(x, y, 8, 10, 6, 4), stone.base, stone.outline);
  fillShape(c, (x, y) => insideEllipse(x, y, 8, 9.6, 4.4, 2.6), PALETTE.lakeShallow.base);
  setPixel(c, 6, 9, PALETTE.lakeShallow.highlight);
  setPixel(c, 7, 9, PALETTE.lakeShallow.light);
  fillRect(c, 4, 13, 8, 1, stone.dark);
  return c;
}

/** Loose straw scattered on the ground. */
function strawPatch(): PixelCanvas {
  const c = createPixelCanvas(16, 16);
  const straw = PALETTE.thatch;
  const strands: readonly (readonly [number, number, number, number])[] = [
    [2, 6, 4, 1],
    [6, 4, 3, 1],
    [9, 7, 5, 1],
    [3, 10, 5, 1],
    [8, 11, 4, 1],
    [11, 4, 3, 1],
    [5, 13, 4, 1],
  ];
  strands.forEach(([x, y, w, h], i) => fillRect(c, x, y, w, h, i % 2 ? straw.base : straw.light));
  for (const [x, y] of [
    [5, 7],
    [12, 9],
    [7, 9],
    [10, 13],
  ] as const) {
    setPixel(c, x, y, straw.dark);
  }
  return c;
}

/** One big sunflower and a smaller one beside it, on leafy stems. */
function sunflower(): PixelCanvas {
  const c = createPixelCanvas(16, 28);
  const leaf = PALETTE.leafy;
  const petal = hexToRgba('#f6c83a');
  const petalShade = hexToRgba('#d8962a');
  const seeds = hexToRgba('#6a4224');
  const head = (cx: number, cy: number, r: number): void => {
    fillShape(c, (x, y) => insideEllipse(x, y, cx, cy, r, r), petal, petalShade);
    fillShape(c, (x, y) => insideEllipse(x, y, cx, cy, r * 0.45, r * 0.45), seeds);
    setPixel(c, Math.round(cx - r * 0.5), Math.round(cy - r * 0.6), hexToRgba('#fde68a'));
  };
  // Stems and leaves.
  fillRect(c, 9, 9, 2, 19, leaf.dark);
  fillRect(c, 4, 15, 1, 13, leaf.dark);
  // A leaf each side: a pointed blade, lit on top.
  const blade = (x: number, y: number, dir: 1 | -1): void => {
    fillRect(c, dir > 0 ? x : x - 3, y - 1, 4, 1, leaf.light);
    fillRect(c, dir > 0 ? x : x - 4, y, 5, 1, leaf.base);
    setPixel(c, x + dir * 5, y, leaf.dark);
    fillRect(c, dir > 0 ? x + 1 : x - 3, y + 1, 3, 1, leaf.dark);
  };
  blade(11, 17, 1);
  blade(8, 21, -1);
  blade(3, 23, -1);
  head(10, 6, 5);
  head(4, 13, 3.2);
  return c;
}

export function paintRunPropSprites(): SpriteSource[] {
  return [
    { key: 'fence_gate', frames: [gate()] },
    { key: 'feed_trough', frames: [feedTrough()] },
    { key: 'water_dish', frames: [waterDish()] },
    { key: 'straw_patch', frames: [strawPatch()] },
    { key: 'sunflower', frames: [sunflower()] },
  ];
}
