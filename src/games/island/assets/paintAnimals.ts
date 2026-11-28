// Village animals, soft and round like the rabbits, facing left (mirrored to
// face right; front and back views in paintAnimalViews.ts), feet on the bottom
// rows: a plump white chicken with a red comb, a russet rooster with a golden
// head, a tall comb and a dark sickle tail, a fluffy yellow chick, and a grey
// tabby cat with a white chest. Every strip has six frames:
//   chicken, rooster, chick: stand, peck, two walk steps, huddled (fluffed
//            against the rain), asleep (head tucked, eyes closed);
//   cat:     sit, two walk steps, curled up asleep, sitting with the tail
//            flicked, and a "loaf" (paws tucked in, sheltering from the rain).
import type { SpriteSource } from '@/shared/render/atlasLayout';
import { hexToRgba, type Rgba } from '@/shared/render/pixelCanvas';
import { capsule, ellipse, outline, put, softCanvas, softGrid, type SoftGrid } from './softShapes';

import { ANIMAL_FRAME_COUNT, ANIMAL_FRAMES, ANIMAL_VIEWS, animalKey } from './animalFrames';
import { catView, chickenView, chickView } from './paintAnimalViews';

export { ANIMAL_FRAME_COUNT, ANIMAL_FRAMES } from './animalFrames';

const SIZE = 16;

/** A hen, or (with `rooster`) the rooster: a dark sickle tail, a golden head, a taller comb. */
function chicken(frame: number, rooster = false): SoftGrid {
  const g = softGrid(SIZE, SIZE);
  const f = ANIMAL_FRAMES.chicken;
  const resting = frame === f.huddle || frame === f.sleep;
  const head = rooster ? 'h' : 'w';
  if (resting) {
    if (rooster) capsule(g, 11.6, 10.4, 14, 6.4, 1.2, 'k');
    // Sitting down, fluffed into a round ball; the head sunk in.
    capsule(g, 12, 10, 13.4, 8, 1, 'w'); // tail tuft
    ellipse(g, 8.6, 11.4, 5.2, 3.6, 'w', 's');
    ellipse(g, 5.4, 8.4, 2.6, 2.4, head);
    put(g, 4.6, 5.8, 'r'); // comb
    put(g, 5.6, 5.8, 'r');
    if (rooster) put(g, 5.1, 5, 'r');
    put(g, 2.6, 8.8, 'y'); // beak
    if (frame === f.sleep) {
      put(g, 4.2, 8.2, 'o'); // eyes closed
      put(g, 5, 8.2, 'o');
    } else put(g, 4.4, 8, 'e');
    put(g, 5.2, 9.4, 'p');
    outline(g);
    return g;
  }
  const peck = frame === f.peck;
  const step = frame === f.walk[0] ? 1 : frame === f.walk[1] ? -1 : 0;
  const bob = step !== 0 ? -0.4 : 0;
  // Little orange legs, stepping when walking.
  capsule(g, 7.6, 12, 7.6 - step, 14.4, 0.5, 'y');
  capsule(g, 9.6, 12, 9.6 + step, 14.4, 0.5, 'y');
  if (rooster) {
    // The sickle tail: dark feathers arching up and over, with a green sheen.
    capsule(g, 11.2, 9 + bob, 13.6, 3.6 + bob, 1.3, 'k');
    capsule(g, 12.4, 9.4 + bob, 14.6, 6.4 + bob, 1, 'k');
    put(g, 13, 4.6 + bob, 'g');
    put(g, 14, 6.8 + bob, 'g');
  } else capsule(g, 11.4, 8.6 + bob, 13.4, 6.2 + bob, 1.1, 'w'); // tail tuft, perked up
  ellipse(g, 8.6, 10 + bob, 4.6, 3.4, 'w', 's'); // plump body
  ellipse(g, 9.4, 10.2 + bob, 2, 1.3, 's'); // folded wing
  const hx = peck ? 3.6 : 5;
  const hy = peck ? 10.6 : 6 + bob;
  ellipse(g, hx, hy, 2.4, 2.3, head);
  put(g, hx - 0.4, hy - 2.4, 'r'); // comb: two little bumps (three, and taller, on the rooster)
  put(g, hx + 0.6, hy - 2.6, 'r');
  if (rooster) {
    put(g, hx + 0.1, hy - 3.4, 'r');
    put(g, hx + 1.4, hy - 2.2, 'r');
  }
  put(g, hx - 2.6, hy + 0.2, 'y'); // beak
  put(g, hx - 1.4, hy + 1.4, 'r'); // wattle
  put(g, hx - 0.6, hy - 0.4, 'e');
  put(g, hx + 0.2, hy + 0.8, 'p'); // rosy cheek
  outline(g);
  return g;
}

const CHICKEN: Readonly<Record<string, Rgba>> = {
  o: hexToRgba('#5a4440'),
  w: hexToRgba('#fbf7ef'),
  s: hexToRgba('#ddd3c4'),
  r: hexToRgba('#e0564a'),
  y: hexToRgba('#f2a943'),
  e: hexToRgba('#2a2026'),
  p: hexToRgba('#f5b0a8'),
};

const ROOSTER: Readonly<Record<string, Rgba>> = {
  ...CHICKEN,
  w: hexToRgba('#c8673a'),
  s: hexToRgba('#9a4a2a'),
  h: hexToRgba('#eaa64e'),
  r: hexToRgba('#e23a30'),
  k: hexToRgba('#2e3a36'),
  g: hexToRgba('#3f7452'),
};

/** A chick: a little ball of yellow fluff with a stubby beak. */
function chick(frame: number): SoftGrid {
  const g = softGrid(SIZE, SIZE);
  const f = ANIMAL_FRAMES.chick;
  const resting = frame === f.huddle || frame === f.sleep;
  if (resting) {
    ellipse(g, 8.6, 12.8, 3.4, 2.4, 'w', 's');
    ellipse(g, 6.6, 11.6, 1.9, 1.7, 'w');
    put(g, 5, 11.8, 'y');
    put(g, 6.2, 11.2, frame === f.sleep ? 'o' : 'e');
    outline(g);
    return g;
  }
  const peck = frame === f.peck;
  const step = frame === f.walk[0] ? 1 : frame === f.walk[1] ? -1 : 0;
  capsule(g, 8, 13.6, 8 - step * 0.6, 14.6, 0.4, 'y');
  capsule(g, 9.6, 13.6, 9.6 + step * 0.6, 14.6, 0.4, 'y');
  ellipse(g, 8.8, 12, 3, 2.3, 'w', 's');
  put(g, 11.6, 11, 'w'); // a fluffy tail tip
  const hx = peck ? 5.6 : 6.6;
  const hy = peck ? 12.4 : 9.4 - (step !== 0 ? 0.3 : 0);
  ellipse(g, hx, hy, 1.9, 1.8, 'w');
  put(g, hx - 1.9, hy + 0.3, 'y'); // beak
  put(g, hx - 0.5, hy - 0.4, 'e');
  outline(g);
  return g;
}

const CHICK: Readonly<Record<string, Rgba>> = {
  o: hexToRgba('#8a6a24'),
  w: hexToRgba('#fbe27a'),
  s: hexToRgba('#e8c052'),
  y: hexToRgba('#f2943a'),
  e: hexToRgba('#2a2026'),
};

/** Pointy ears either side of a round head. */
function ears(g: SoftGrid, hx: number, hy: number): void {
  capsule(g, hx - 1.6, hy - 1.6, hx - 2.2, hy - 3.4, 0.7, 'g');
  capsule(g, hx + 1.2, hy - 1.8, hx + 1.6, hy - 3.6, 0.7, 'g');
}

function catFace(g: SoftGrid, hx: number, hy: number, asleep = false): void {
  ellipse(g, hx - 0.6, hy + 1, 1.6, 1.1, 'c'); // white muzzle
  put(g, hx - 1.8, hy + 0.4, 'n'); // nose
  if (asleep) {
    put(g, hx - 1.4, hy - 0.4, 'o');
    put(g, hx - 0.6, hy - 0.4, 'o');
  } else put(g, hx - 1, hy - 0.6, 'e');
  put(g, hx + 0.4, hy + 0.8, 'p');
  put(g, hx + 0.4, hy - 1.6, 'd'); // a tabby stripe on the brow
}

function cat(frame: number): SoftGrid {
  const g = softGrid(SIZE, SIZE);
  const f = ANIMAL_FRAMES.cat;
  if (frame === f.sleep) {
    // Curled up: a round grey loaf with the tail wrapped round the front.
    ellipse(g, 8.6, 12, 5.6, 2.8, 'g', 'd');
    capsule(g, 13, 12.6, 6, 14, 0.9, 'g');
    ellipse(g, 4.8, 11.6, 2.6, 2.2, 'g');
    ears(g, 4.8, 11.6);
    catFace(g, 4.8, 11.6, true);
    put(g, 9, 10, 'd'); // stripes along the back
    put(g, 11, 10.4, 'd');
    outline(g);
    return g;
  }
  if (frame === f.loaf) {
    // Paws tucked in, a neat round loaf, eyes open: waiting out the rain.
    capsule(g, 12.4, 12.6, 13.6, 10.4, 0.8, 'g');
    ellipse(g, 8.6, 11.6, 4.8, 3, 'g', 'd');
    ellipse(g, 7.6, 12.6, 2, 1.2, 'c'); // white chest
    ellipse(g, 5.2, 8.4, 2.6, 2.4, 'g');
    ears(g, 5.2, 8.4);
    catFace(g, 5.2, 8.4);
    put(g, 9.6, 9.8, 'd');
    put(g, 11.4, 10.4, 'd');
    outline(g);
    return g;
  }
  const sitting = frame === f.sit || frame === f.flick;
  if (sitting) {
    // Sitting up, the tail curled round the feet (or flicked up).
    if (frame === f.flick) capsule(g, 11.6, 12.6, 13.6, 9, 0.8, 'g');
    else capsule(g, 11.6, 13.6, 13.8, 13, 0.8, 'g');
    ellipse(g, 9, 11, 3.4, 3.6, 'g', 'd');
    ellipse(g, 8, 12, 1.6, 2, 'c'); // white chest
    capsule(g, 7.4, 12.6, 7.4, 14.4, 0.7, 'c'); // front paws
    put(g, 10.4, 9, 'd');
    put(g, 11, 11, 'd');
    ellipse(g, 6.4, 6.4, 2.8, 2.6, 'g');
    ears(g, 6.4, 6.4);
    catFace(g, 6.4, 6.4);
  } else {
    const step = frame === f.walk[0] ? 1 : -1;
    capsule(g, 13, 9.6, 14.4, 6.2, 0.8, 'g'); // tail up
    capsule(g, 6, 12, 6 - step * 0.8, 14.4, 0.8, 'c');
    capsule(g, 7.6, 12, 7.6 + step * 0.8, 14.4, 0.8, 'd');
    capsule(g, 10.4, 12, 10.4 + step * 0.8, 14.4, 0.8, 'd');
    capsule(g, 12, 12, 12 - step * 0.8, 14.4, 0.8, 'g');
    ellipse(g, 9, 10.6, 4.8, 3, 'g', 'd');
    ellipse(g, 7.4, 11.8, 1.8, 1, 'c'); // white chest
    put(g, 8.4, 8.4, 'd');
    put(g, 10.4, 8.4, 'd');
    put(g, 12.2, 9, 'd');
    ellipse(g, 4.6, 8, 2.6, 2.4, 'g');
    ears(g, 4.6, 8);
    catFace(g, 4.6, 8);
  }
  outline(g);
  return g;
}

const CAT: Readonly<Record<string, Rgba>> = {
  o: hexToRgba('#3c3640'),
  g: hexToRgba('#a8a4b0'),
  d: hexToRgba('#7c7888'),
  c: hexToRgba('#f8f6f2'),
  e: hexToRgba('#3a6a48'),
  n: hexToRgba('#e89aa0'),
  p: hexToRgba('#f2b4b4'),
};

export function paintAnimalSprites(): SpriteSource[] {
  const frames = Array.from({ length: ANIMAL_FRAME_COUNT }, (_, i) => i);
  // Side (facing left; mirrored for right), front (coming down) and back (going up).
  return ANIMAL_VIEWS.flatMap((view) => [
    {
      key: animalKey('chicken', view),
      frames: frames.map((i) =>
        softCanvas(view === 'side' ? chicken(i) : chickenView(i, view === 'front'), CHICKEN),
      ),
    },
    {
      key: animalKey('rooster', view),
      frames: frames.map((i) =>
        softCanvas(
          view === 'side' ? chicken(i, true) : chickenView(i, view === 'front', true),
          ROOSTER,
        ),
      ),
    },
    {
      key: animalKey('chick', view),
      frames: frames.map((i) =>
        softCanvas(view === 'side' ? chick(i) : chickView(i, view === 'front'), CHICK),
      ),
    },
    {
      key: animalKey('cat', view),
      frames: frames.map((i) =>
        softCanvas(view === 'side' ? cat(i) : catView(i, view === 'front'), CAT),
      ),
    },
  ]);
}
