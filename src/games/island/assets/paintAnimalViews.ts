// The village animals seen from the front (coming towards you) and from the
// back (going away), soft and round like their side views. Same frames as the
// side strips (see `animalFrames.ts`); resting poses are drawn simply, since
// the renderer shows those from the side.
import { ANIMAL_FRAMES } from './animalFrames';
import { capsule, ellipse, outline, put, softGrid, type SoftGrid } from './softShapes';

const SIZE = 16;
const MID = 7.5;

/** Two little legs; one lifts (shorter) on each walking step. */
function legs(
  g: SoftGrid,
  frame: number,
  walk: readonly number[],
  spread: number,
  top: number,
  letter: string,
): void {
  const lift = frame === walk[0] ? 1 : frame === walk[1] ? -1 : 0;
  capsule(g, MID - spread, top, MID - spread, lift > 0 ? 13.6 : 14.4, 0.5, letter);
  capsule(g, MID + spread, top, MID + spread, lift < 0 ? 13.6 : 14.4, 0.5, letter);
}

/** A hen, or (with `rooster`) the rooster with his dark sickle tail and golden head. */
export function chickenView(frame: number, front: boolean, rooster = false): SoftGrid {
  const g = softGrid(SIZE, SIZE);
  const f = ANIMAL_FRAMES.chicken;
  const resting = frame === f.huddle || frame === f.sleep;
  const head = rooster ? 'h' : 'w';
  if (!resting) legs(g, frame, f.walk, 1.4, 12, 'y');
  const bodyY = resting ? 11.4 : 10.2;
  if (rooster && front) {
    // From the front, the sickle tail just shows behind the body on each side.
    capsule(g, MID - 2.4, bodyY - 0.6, MID - 4.4, bodyY - 3.4, 1, 'k');
    capsule(g, MID + 2.4, bodyY - 0.6, MID + 4.4, bodyY - 3.4, 1, 'k');
    put(g, MID + 4.2, bodyY - 3.2, 'g');
  } else if (rooster) {
    // From behind, a dark tuft of tail feathers over the back.
    capsule(g, MID - 0.7, bodyY - 1, MID - 0.9, bodyY - 5.2, 1.4, 'k');
    capsule(g, MID + 0.9, bodyY - 1, MID + 1.3, bodyY - 4.6, 1.2, 'k');
    put(g, MID - 0.8, bodyY - 4.6, 'g');
  } else if (!front) capsule(g, MID, bodyY - 1, MID, bodyY - 5, 1.3, 'w'); // the tail tuft, seen from behind
  ellipse(g, MID, bodyY, 4.2, resting ? 3.4 : 3.4, 'w', 's');
  ellipse(g, MID - 3.4, bodyY + 0.2, 1.2, 1.8, 's'); // wings at the sides
  ellipse(g, MID + 3.4, bodyY + 0.2, 1.2, 1.8, 's');
  const peck = frame === f.peck;
  const hy = resting ? 8 : peck ? 8.6 : 5.6;
  if (front || peck) ellipse(g, MID, hy, 2.5, 2.3, head);
  else ellipse(g, MID, hy + 0.4, 2.4, 2.1, head); // the back of the head
  put(g, MID - 0.5, hy - 2.4, 'r'); // comb
  put(g, MID + 0.5, hy - 2.6, 'r');
  if (rooster) put(g, MID, hy - 3.4, 'r');
  if (front) {
    put(g, MID, hy + 0.9, 'y'); // beak
    put(g, MID, hy + 1.9, 'r'); // wattle
    if (frame === f.sleep) {
      put(g, MID - 1.3, hy - 0.2, 'o');
      put(g, MID + 1.3, hy - 0.2, 'o');
    } else {
      put(g, MID - 1.2, hy - 0.4, 'e');
      put(g, MID + 1.2, hy - 0.4, 'e');
    }
    put(g, MID - 2, hy + 0.8, 'p');
    put(g, MID + 2, hy + 0.8, 'p');
  }
  outline(g);
  return g;
}

/** A chick from the front or behind: a fluffy yellow ball with a round head. */
export function chickView(frame: number, front: boolean): SoftGrid {
  const g = softGrid(SIZE, SIZE);
  const f = ANIMAL_FRAMES.chick;
  const resting = frame === f.huddle || frame === f.sleep;
  if (!resting) legs(g, frame, f.walk, 1, 13.4, 'y');
  const bodyY = resting ? 12.8 : 12;
  ellipse(g, MID, bodyY, 2.8, 2.3, 'w', 's');
  const hy = resting ? 10.6 : frame === f.peck ? 11.4 : 9.2;
  ellipse(g, MID, hy, 1.9, 1.8, 'w');
  if (front) {
    put(g, MID, hy + 0.8, 'y');
    const eye = frame === f.sleep ? 'o' : 'e';
    put(g, MID - 0.9, hy - 0.3, eye);
    put(g, MID + 0.9, hy - 0.3, eye);
  } else put(g, MID, bodyY - 2.4, 's'); // a tuft of fluff at the back
  outline(g);
  return g;
}

/** Pointy ears either side of a round head. */
function ears(g: SoftGrid, hy: number): void {
  capsule(g, MID - 1.8, hy - 1.6, MID - 2.4, hy - 3.4, 0.7, 'g');
  capsule(g, MID + 1.8, hy - 1.6, MID + 2.4, hy - 3.4, 0.7, 'g');
}

export function catView(frame: number, front: boolean): SoftGrid {
  const g = softGrid(SIZE, SIZE);
  const f = ANIMAL_FRAMES.cat;
  const walking = frame === f.walk[0] || frame === f.walk[1];
  const flick = frame === f.flick;
  // The tail: curled round the paws, flicked up, or held up while walking.
  if (front) {
    if (flick) capsule(g, MID + 3, 12.6, MID + 5.4, 9, 0.8, 'g');
    else if (!walking) capsule(g, MID + 2.6, 13.8, MID + 5.4, 12.8, 0.8, 'g');
  }
  if (walking) legs(g, frame, f.walk, 1.6, 11.6, front ? 'c' : 'd');
  // From behind the back is the darker grey, so the lighter head and tail stand out on it.
  const bodyRx = front ? 3.4 : 4;
  ellipse(g, MID, walking ? 10.6 : 11.2, bodyRx, walking ? 2.8 : 3.2, front ? 'g' : 'd', 'd');
  if (front) {
    ellipse(g, MID, walking ? 10.8 : 11.6, 1.7, walking ? 1.6 : 2.2, 'c'); // white chest
    if (!walking) {
      put(g, MID - 1, 14, 'c'); // front paws
      put(g, MID + 1, 14, 'c');
    }
  } else {
    // From behind: the stripes down the back, and the tail held up.
    put(g, MID - 1.6, 10.4, 'g');
    put(g, MID + 1.6, 10.4, 'g');
    const tip = flick ? MID - 2.6 : MID + 2;
    capsule(g, MID, 12, tip, 7.4, 0.9, 'g');
    put(g, tip, 7, 'c');
  }
  const hy = walking ? 6.6 : 6.4;
  // A round head (from behind, narrower than the body, so the cat reads as a little pear).
  ellipse(g, MID, hy, front ? 3 : 2.5, 2.6, 'g');
  ears(g, hy);
  put(g, MID, hy - 1.8, 'd'); // a tabby stripe on the brow
  if (front) {
    ellipse(g, MID, hy + 1.2, 1.4, 0.9, 'c'); // white muzzle
    put(g, MID, hy + 0.8, 'n');
    if (frame === f.sleep) {
      put(g, MID - 1.4, hy - 0.2, 'o');
      put(g, MID + 1.4, hy - 0.2, 'o');
    } else {
      put(g, MID - 1.2, hy - 0.3, 'e');
      put(g, MID + 1.2, hy - 0.3, 'e');
    }
    put(g, MID - 2.1, hy + 0.8, 'p');
    put(g, MID + 2.1, hy + 0.8, 'p');
  }
  outline(g);
  return g;
}
