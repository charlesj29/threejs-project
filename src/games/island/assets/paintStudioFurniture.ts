// The Developer's Studio's portfolio pieces. Standing pieces rise above their
// footprint like the cottage furniture; wall pieces (phones, timeline,
// certificates) are drawn on the back wall with clear pixels at the bottom so
// the wainscot shows below them.
import type { SpriteSource } from '@/shared/render/atlasLayout';
import {
  createPixelCanvas,
  fillRect,
  setPixel,
  type PixelCanvas,
  type Rgba,
} from '@/shared/render/pixelCanvas';
import { PALETTE } from './palette';

const O = PALETTE.wall.outline;
const WOOD = PALETTE.dock;

/** A desk top with two legs, `top` px from the sprite's top (32 wide). */
function deskBase(c: PixelCanvas, top: number): void {
  fillRect(c, 0, top, 32, 12, O);
  fillRect(c, 1, top + 1, 30, 8, WOOD.light);
  fillRect(c, 1, top + 9, 30, 2, WOOD.dark);
  for (const x of [2, 27]) {
    fillRect(c, x, top + 11, 3, c.height - top - 11, O);
    fillRect(c, x + 1, top + 11, 1, c.height - top - 12, WOOD.base);
  }
}

/** 32×28 over 2×1: a desk with an open laptop (an app on screen) and a mug. */
function deskLaptop(): PixelCanvas {
  const c = createPixelCanvas(32, 28);
  deskBase(c, 12);
  const s = PALETTE.screen;
  fillRect(c, 8, 1, 14, 11, O); // lid
  fillRect(c, 9, 2, 12, 8, s.base);
  fillRect(c, 10, 3, 4, 2, s.glow); // a little app layout
  fillRect(c, 10, 6, 9, 1, PALETTE.paper.line);
  fillRect(c, 10, 8, 6, 1, PALETTE.paper.line);
  fillRect(c, 6, 12, 18, 2, O); // keyboard base
  fillRect(c, 7, 12, 16, 1, s.body);
  // A mug of coffee.
  fillRect(c, 25, 7, 5, 6, O);
  fillRect(c, 26, 8, 3, 4, PALETTE.paper.base);
  setPixel(c, 30, 9, O);
  return c;
}

const PHONE = { width: 7, height: 10 } as const;
/** The screen inside a phone, relative to its top-left. */
const SCREEN = { x: 1, y: 2, width: 5, height: 6 } as const;
/** Where the shelf's top is, and how far apart the phones stand (one per tile). */
const SHELF_TOP = 25;
const PHONE_SLOT = 16;

/** An app on a phone screen: a coloured header, two cards and a tab bar. */
function appScreen(c: PixelCanvas, x: number, y: number, brand: Rgba): void {
  const { width, height } = SCREEN;
  fillRect(c, x, y, width, height, PALETTE.paper.base);
  fillRect(c, x, y, width, 2, brand); // header
  fillRect(c, x + 1, y, 2, 1, PALETTE.paper.base); // a title in the header
  for (const top of [y + 2, y + 3]) {
    fillRect(c, x + 1, top, width - 2, 1, PALETTE.paper.line); // cards
    setPixel(c, x + 1, top, brand);
  }
  fillRect(c, x, y + height - 1, width, 1, PALETTE.paper.line); // tab bar
  setPixel(c, x + 2, y + height - 1, brand);
}

/** This island on a phone: sea, a sandy shore and a green island with a red roof. */
function islandScreen(c: PixelCanvas, x: number, y: number): void {
  const { width, height } = SCREEN;
  fillRect(c, x, y, width, height, PALETTE.shallowSea.base);
  fillRect(c, x + 1, y + 1, width - 2, height - 2, PALETTE.sand.base);
  fillRect(c, x + 1, y + 2, width - 2, height - 4, PALETTE.grass.base);
  setPixel(c, x + 2, y + 2, PALETTE.roof.base);
  setPixel(c, x + 3, y + 3, PALETTE.oak.dark);
  setPixel(c, x, y, PALETTE.foam.bright);
}

/** A smartphone standing on the shelf: rounded body, camera dot, screen, home bar. */
function phone(
  c: PixelCanvas,
  x: number,
  y: number,
  paint: (sx: number, sy: number) => void,
): void {
  const { width, height } = PHONE;
  fillRect(c, x + 1, y, width - 2, height, O);
  fillRect(c, x, y + 1, width, height - 2, O);
  fillRect(c, x + 1, y + 1, width - 2, height - 2, PALETTE.screen.body);
  paint(x + SCREEN.x, y + SCREEN.y);
  setPixel(c, x + Math.floor(width / 2), y + 1, PALETTE.screen.dark); // camera dot
  fillRect(c, x + Math.floor(width / 2) - 1, y + height - 2, 2, 1, PALETTE.screen.base); // home bar
}

/** 96×32 over 6×1 (wall): six phones on a display shelf, one per project (each opens it). */
function phoneWall(): PixelCanvas {
  const c = createPixelCanvas(96, 32);
  // In the order of the projects panel: Tokoplas, Poly, Seller, Driver, klikUMKM, this island.
  const brands = [
    PALETTE.terracotta.light,
    PALETTE.slate.dark,
    PALETTE.teal.light,
    PALETTE.fire.mid,
    PALETTE.moss.light,
  ];
  // Each phone stands in the middle of its tile (the tile that opens its project).
  const left = (i: number): number => i * PHONE_SLOT + (PHONE_SLOT - PHONE.width) / 2;
  const top = SHELF_TOP - PHONE.height;
  brands.forEach((brand, i) => phone(c, left(i), top, (sx, sy) => appScreen(c, sx, sy, brand)));
  phone(c, left(brands.length), top, (sx, sy) => islandScreen(c, sx, sy));
  // The wooden shelf they stand on, with a bracket under each end.
  fillRect(c, 0, SHELF_TOP, 96, 3, O);
  fillRect(c, 1, SHELF_TOP, 94, 1, WOOD.light);
  fillRect(c, 1, SHELF_TOP + 1, 94, 1, WOOD.base);
  for (const x of [6, 88]) fillRect(c, x, SHELF_TOP + 3, 2, 3, O);
  return c;
}

/** 32×40 over 2×1: a bookshelf of tech books, a tablet and a small cactus. */
function techShelf(): PixelCanvas {
  const c = createPixelCanvas(32, 40);
  const wood = PALETTE.bark;
  fillRect(c, 0, 0, 32, 40, O);
  fillRect(c, 1, 1, 30, 38, wood.base);
  const spines = [
    PALETTE.teal.base,
    PALETTE.slate.light,
    PALETTE.gold.base,
    PALETTE.screen.base,
    PALETTE.flowers.blue.petal,
    PALETTE.terracotta.light,
  ];
  for (const top of [3, 15, 27]) {
    fillRect(c, 2, top, 28, 10, wood.outline);
    let x = 3;
    let n = top + 1;
    const end = top === 15 ? 18 : 29; // the middle shelf leaves room for the tablet
    while (x < end) {
      const width = 2 + (n % 2);
      const height = 6 + (n % 4);
      fillRect(c, x, top + 10 - height, width, height, spines[n % spines.length] ?? wood.light);
      x += width + 1;
      n += 5;
    }
    fillRect(c, 1, top + 10, 30, 2, wood.light);
  }
  // A tablet leaning on the middle shelf, and a cactus on top.
  fillRect(c, 20, 16, 8, 9, O);
  fillRect(c, 21, 17, 6, 7, PALETTE.screen.base);
  fillRect(c, 22, 18, 3, 1, PALETTE.screen.glow);
  fillRect(c, 25, 2, 3, 3, PALETTE.terracotta.base);
  fillRect(c, 26, 0, 1, 2, PALETTE.moss.base);
  return c;
}

/** 48×32 over 3×1 (wall): a cork board with cards along a red string. */
function timelineBoard(): PixelCanvas {
  const c = createPixelCanvas(48, 32);
  fillRect(c, 1, 3, 46, 22, O);
  fillRect(c, 2, 4, 44, 20, PALETTE.heartwood.dark);
  fillRect(c, 3, 5, 42, 18, PALETTE.cork.base);
  for (let y = 5; y < 23; y++) {
    for (let x = 3; x < 45; x++) {
      if ((x * 7 + y * 13) % 11 === 0) setPixel(c, x, y, PALETTE.cork.dark);
      else if ((x * 5 + y * 3) % 17 === 0) setPixel(c, x, y, PALETTE.cork.light);
    }
  }
  fillRect(c, 4, 14, 40, 1, PALETTE.paper.seal); // the string
  [5, 15, 25, 35].forEach((x, i) => {
    const y = i % 2 === 0 ? 6 : 15;
    fillRect(c, x, y, 8, 7, PALETTE.paper.line);
    fillRect(c, x, y, 7, 6, PALETTE.paper.base);
    fillRect(c, x + 1, y + 2, 5, 1, PALETTE.paper.line);
    fillRect(c, x + 1, y + 4, 3, 1, PALETTE.paper.line);
    setPixel(c, x + 3, y, PALETTE.paper.seal); // pin
  });
  return c;
}

/** A small gold cup, its foot at (x, bottom). */
function cup(c: PixelCanvas, x: number, bottom: number, size: number): void {
  const g = PALETTE.gold;
  fillRect(c, x - 2, bottom - 1, 5, 1, g.dark); // foot
  fillRect(c, x, bottom - 3, 1, 2, g.base); // stem
  fillRect(c, x - size, bottom - 3 - size, size * 2 + 1, size, g.base);
  fillRect(c, x - size, bottom - 3 - size, 1, size, g.light);
  setPixel(c, x - size - 1, bottom - 2 - size, g.dark); // handles
  setPixel(c, x + size + 1, bottom - 2 - size, g.dark);
}

/** 32×40 over 2×1: a trophy shelf with cups, a medal and a star plaque. */
function trophyShelf(): PixelCanvas {
  const c = createPixelCanvas(32, 40);
  const wood = PALETTE.bark;
  fillRect(c, 0, 0, 32, 40, O);
  fillRect(c, 1, 1, 30, 38, wood.base);
  for (const top of [3, 15, 27]) {
    fillRect(c, 2, top, 28, 10, wood.outline);
    fillRect(c, 1, top + 10, 30, 2, wood.light);
  }
  cup(c, 9, 13, 3);
  cup(c, 22, 13, 2);
  // A medal on a ribbon.
  fillRect(c, 7, 16, 2, 4, PALETTE.paper.seal);
  fillRect(c, 10, 16, 2, 4, PALETTE.flowers.blue.petal);
  fillRect(c, 7, 20, 5, 4, PALETTE.gold.base);
  setPixel(c, 8, 21, PALETTE.gold.highlight);
  cup(c, 22, 25, 3);
  // A star plaque.
  fillRect(c, 6, 28, 10, 9, PALETTE.heartwood.base);
  const star = [
    [10, 29],
    [9, 31],
    [10, 31],
    [11, 31],
    [8, 32],
    [12, 32],
    [9, 33],
    [10, 33],
    [11, 33],
    [9, 34],
    [11, 34],
  ] as const;
  for (const [x, y] of star) setPixel(c, x, y, PALETTE.gold.light);
  cup(c, 23, 37, 2);
  return c;
}

/** One framed certificate (13×17), top-left at x, y. */
function certificate(c: PixelCanvas, x: number, y: number): void {
  fillRect(c, x, y, 13, 17, O);
  fillRect(c, x + 1, y + 1, 11, 15, PALETTE.gold.dark);
  fillRect(c, x + 2, y + 2, 9, 13, PALETTE.paper.base);
  fillRect(c, x + 3, y + 4, 7, 1, PALETTE.paper.line);
  fillRect(c, x + 3, y + 6, 7, 1, PALETTE.paper.line);
  fillRect(c, x + 3, y + 8, 5, 1, PALETTE.paper.line);
  fillRect(c, x + 7, y + 11, 3, 3, PALETTE.paper.seal);
}

/** 32×32 over 2×1 (wall): two framed certificates. */
function certificates(): PixelCanvas {
  const c = createPixelCanvas(32, 32);
  certificate(c, 2, 5);
  certificate(c, 17, 5);
  return c;
}

/** 32×28 over 2×1: a post desk with a telephone, envelopes and a mail tray. */
function postDesk(): PixelCanvas {
  const c = createPixelCanvas(32, 28);
  deskBase(c, 12);
  // A red telephone.
  fillRect(c, 3, 6, 11, 7, O);
  fillRect(c, 4, 8, 9, 4, PALETTE.quilt.base);
  fillRect(c, 3, 5, 11, 2, O);
  fillRect(c, 4, 5, 9, 1, PALETTE.quilt.light); // handset
  fillRect(c, 7, 9, 3, 2, PALETTE.paper.base); // dial
  // A stack of envelopes and a tray of letters.
  for (const [y, color] of [
    [10, PALETTE.paper.base],
    [8, PALETTE.paper.line],
    [6, PALETTE.paper.base],
  ] as const) {
    fillRect(c, 17, y, 11, 3, O);
    fillRect(c, 18, y, 9, 2, color);
  }
  setPixel(c, 22, 7, PALETTE.paper.seal);
  return c;
}

export function paintStudioFurnitureSprites(): SpriteSource[] {
  return [
    { key: 'desk_laptop', frames: [deskLaptop()] },
    { key: 'phone_wall', frames: [phoneWall()] },
    { key: 'tech_shelf', frames: [techShelf()] },
    { key: 'timeline_board', frames: [timelineBoard()] },
    { key: 'trophy_shelf', frames: [trophyShelf()] },
    { key: 'certificates', frames: [certificates()] },
    { key: 'post_desk', frames: [postDesk()] },
  ];
}
