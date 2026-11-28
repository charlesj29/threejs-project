// The chicken coop's hen house: a little wooden hut with a red gable roof, a
// round doorway with straw peeking out, a ramp down to the run, a perch bar, a
// nesting box with eggs in the straw, and a rooster weathervane on the ridge.
// 32×48 over a 2×2 footprint (the roof and vane rise above it). Light from the
// top-left, like everything else.
import type { SpriteSource } from '@/shared/render/atlasLayout';
import {
  createPixelCanvas,
  fillRect,
  hexToRgba,
  setPixel,
  type PixelCanvas,
} from '@/shared/render/pixelCanvas';
import { PALETTE } from './palette';

export const COOP_KEY = 'chicken_coop';

/** Deep brown: the dark inside the hen house. */
const DOORWAY = hexToRgba('#2e1c10');
const EGG = hexToRgba('#fbf3e2');
const EGG_SHINE = hexToRgba('#ffffff');

const W = 32;
/** The hut itself is 40 tall; the weathervane adds this much on top. */
const VANE_PX = 8;
const H = 40;
/** The roof's apex, and the row its eaves come down to. */
const APEX = { x: 15.5, y: 3 } as const;
const EAVES_Y = 18;
/** The walls (planks) and the round doorway (its middle and radius). */
const WALL = { left: 4, right: 27, top: 17, bottom: 37 } as const;
const DOOR = { x: 13, y: 31, r: 4 } as const;

function henHouse(): PixelCanvas {
  const c = createPixelCanvas(W, H);
  const wood = PALETTE.heartwood;
  const roof = PALETTE.roof;
  // Plank walls, seams every four pixels, shaded on the right.
  fillRect(
    c,
    WALL.left - 1,
    WALL.top,
    WALL.right - WALL.left + 3,
    WALL.bottom - WALL.top + 2,
    wood.outline,
  );
  fillRect(
    c,
    WALL.left,
    WALL.top,
    WALL.right - WALL.left + 1,
    WALL.bottom - WALL.top + 1,
    wood.light,
  );
  for (let x = WALL.left; x <= WALL.right; x++) {
    if ((x - WALL.left) % 4 === 3)
      fillRect(c, x, WALL.top, 1, WALL.bottom - WALL.top + 1, wood.base);
  }
  fillRect(c, WALL.right - 3, WALL.top, 4, WALL.bottom - WALL.top + 1, wood.base);
  fillRect(c, WALL.left, WALL.bottom - 1, WALL.right - WALL.left + 1, 2, wood.dark); // the sill
  // The round doorway, dark inside, with straw peeking out at the bottom.
  for (let y = DOOR.y - DOOR.r; y <= DOOR.y + DOOR.r; y++) {
    for (let x = DOOR.x - DOOR.r; x <= DOOR.x + DOOR.r; x++) {
      const d = Math.hypot(x - DOOR.x, (y - DOOR.y) * 1.1);
      if (d <= DOOR.r - 0.6 && y <= WALL.bottom - 2) setPixel(c, x, y, DOORWAY);
      else if (d <= DOOR.r + 0.4 && y <= WALL.bottom - 2) setPixel(c, x, y, wood.outline);
    }
  }
  for (const [x, y] of [
    [11, 34],
    [12, 33],
    [14, 34],
    [15, 33],
    [13, 34],
  ] as const) {
    setPixel(c, x, y, PALETTE.thatch.light);
  }
  // A little ramp with cleats, down to the run on the right of the door.
  for (let i = 0; i < 9; i++) {
    const x = DOOR.x + 3 + i;
    const y = WALL.bottom - 3 + Math.floor(i / 2.2);
    fillRect(c, x, y, 1, 2, i % 3 === 1 ? wood.dark : wood.highlight);
    setPixel(c, x, y + 2, wood.outline);
  }
  // A perch bar across the wall.
  fillRect(c, 19, 24, 7, 1, wood.dark);
  // A nesting box on the wall: a little open crate of straw with two eggs peeking out.
  fillRect(c, 19, 27, 8, 6, wood.outline);
  fillRect(c, 20, 28, 6, 4, PALETTE.thatch.base);
  fillRect(c, 20, 28, 6, 1, PALETTE.thatch.dark);
  setPixel(c, 20, 29, PALETTE.thatch.light);
  setPixel(c, 25, 30, PALETTE.thatch.light);
  // Three eggs in a little heap.
  for (const [x, y] of [
    [21, 30],
    [23, 30],
    [22, 29],
  ] as const) {
    setPixel(c, x, y, EGG);
    setPixel(c, x + 1, y, EGG);
  }
  setPixel(c, 22, 29, EGG_SHINE);
  fillRect(c, 19, 33, 8, 1, wood.dark);
  // The gable roof: shingle rows, overhanging the walls.
  for (let y = APEX.y; y <= EAVES_Y; y++) {
    const half = ((y - APEX.y) / (EAVES_Y - APEX.y)) * (W / 2 + 0.5);
    const left = Math.round(APEX.x - half);
    const right = Math.round(APEX.x + half);
    fillRect(c, left, y, right - left + 1, 1, roof.outline);
    if (right - left > 2) {
      const shade = (y - APEX.y) % 4 === 3 ? roof.dark : y < APEX.y + 5 ? roof.light : roof.base;
      fillRect(c, left + 1, y, right - left - 1, 1, shade);
      fillRect(
        c,
        Math.round(APEX.x) + 1,
        y,
        Math.max(0, right - Math.round(APEX.x) - 1),
        1,
        (y - APEX.y) % 4 === 3 ? roof.outline : roof.dark,
      );
    }
  }
  fillRect(c, 0, EAVES_Y, W, 1, roof.outline); // the eaves' edge
  setPixel(c, Math.round(APEX.x) - 1, APEX.y + 2, roof.highlight);
  return c;
}

/** The hut with a rooster weathervane standing on the ridge above it. */
function henHouseWithVane(): PixelCanvas {
  const hut = henHouse();
  const c = createPixelCanvas(W, H + VANE_PX);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      if ((hut.data[i + 3] ?? 0) === 0) continue;
      setPixel(c, x, y + VANE_PX, [
        hut.data[i] ?? 0,
        hut.data[i + 1] ?? 0,
        hut.data[i + 2] ?? 0,
        255,
      ]);
    }
  }
  const iron = PALETTE.rock.outline;
  const x = Math.round(APEX.x);
  fillRect(c, x, 4, 1, APEX.y + VANE_PX - 3, iron); // the pole, down to the ridge
  fillRect(c, x - 3, 7, 7, 1, iron); // the arrow
  setPixel(c, x + 4, 7, iron);
  setPixel(c, x + 3, 6, iron);
  setPixel(c, x + 3, 8, iron);
  // A little rooster on top: body, raised tail, comb.
  fillRect(c, x - 2, 2, 4, 2, iron);
  fillRect(c, x - 3, 1, 2, 1, iron);
  setPixel(c, x - 3, 0, PALETTE.roof.base);
  fillRect(c, x + 2, 0, 1, 3, iron);
  setPixel(c, x + 1, 0, iron);
  return c;
}

export function paintCoopSprites(): SpriteSource[] {
  return [{ key: COOP_KEY, frames: [henHouseWithVane()] }];
}
