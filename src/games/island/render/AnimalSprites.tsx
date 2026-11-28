import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, type JSX } from 'react';
import type { Mesh } from 'three';
import type { SpriteAtlas } from '@/shared/render/spriteAtlas';
import { ANIMAL_FRAMES, animalKey, type AnimalView } from '../assets/animalFrames';
import type { GameState } from '../core/game/gameState';
import { isPoultry, type Animal } from '../core/systems/animals';
import type { LightingUniforms } from './lighting';
import { PLAYER_SHADOW } from './objectShadows';
import { createSpriteGeometry, setSpriteGeometryFrame } from './spriteGeometry';
import { createShadowMaterial, createSpriteMaterial, setAnimationFrame } from './spriteMaterial';
import { SHADOW_Z, standingSpriteZ, worldYFromMapPx } from './worldSpace';

/** Walk frames change this often; a resting chicken pecks now and then. */
const WALK_FRAME_SECONDS = 0.18;
const PECK_EVERY_SECONDS = 1.3;
const PECK_SECONDS = 0.35;
/** A resting cat dozes off after this long; sitting, it flicks its tail now and then. */
const CAT_DOZE_SECONDS = 3;
const TAIL_FLICK_EVERY_SECONDS = 2.8;
const TAIL_FLICK_SECONDS = 0.3;
/** The feet are this far above the sprite's bottom edge. */
const FOOT_INSET_PX = 1;

/** Side, back (going up) or front (coming down); resting, napping and asleep from the side. */
function viewOf(animal: Animal): AnimalView {
  const resting =
    animal.pose !== 'idle' ||
    (animal.kind === 'cat' && !animal.target && animal.restedFor > CAT_DOZE_SECONDS);
  if (resting) return 'side';
  return animal.facing === 'up' ? 'back' : animal.facing === 'down' ? 'front' : 'side';
}

/** Which frame of its strip an animal shows now. */
function animalFrame(animal: Animal, seconds: number): number {
  const stride = Math.floor(seconds / WALK_FRAME_SECONDS) % 2;
  if (isPoultry(animal.kind)) {
    const frames = ANIMAL_FRAMES.chicken;
    if (animal.pose === 'sleep') return frames.sleep;
    if (animal.pose === 'huddle') return frames.huddle;
    // Scurrying: the steps come twice as fast.
    const pace = animal.fleeing ? Math.floor((seconds * 2) / WALK_FRAME_SECONDS) % 2 : stride;
    if (animal.target) return frames.walk[pace] ?? frames.stand;
    const pecking = (seconds + animal.id * 0.7) % PECK_EVERY_SECONDS < PECK_SECONDS;
    return pecking ? frames.peck : frames.stand;
  }
  const frames = ANIMAL_FRAMES.cat;
  if (animal.pose === 'sleep') return frames.sleep;
  if (animal.pose === 'huddle') return frames.loaf;
  if (animal.target) return frames.walk[stride] ?? frames.sit;
  if (animal.restedFor > CAT_DOZE_SECONDS) return frames.sleep;
  // Sitting, with a flick of the tail now and then.
  return (seconds + animal.id) % TAIL_FLICK_EVERY_SECONDS < TAIL_FLICK_SECONDS
    ? frames.flick
    : frames.sit;
}

interface AnimalSpriteProps {
  readonly animal: Animal;
  readonly state: GameState;
  readonly atlas: SpriteAtlas;
  readonly lighting: LightingUniforms;
}

function AnimalSprite({ animal, state, atlas, lighting }: AnimalSpriteProps): JSX.Element {
  const meshRef = useRef<Mesh>(null);
  const shadowRef = useRef<Mesh>(null);
  const frame = atlas.frame(animalKey(animal.kind, 'side'));
  const geometry = useMemo(() => createSpriteGeometry(frame), [frame]);
  const shownView = useRef<AnimalView>('side');
  const material = useMemo(() => createSpriteMaterial(atlas.texture, lighting), [atlas, lighting]);
  const shadowGeometry = useMemo(
    () => createSpriteGeometry(atlas.frame(PLAYER_SHADOW.key)),
    [atlas],
  );
  const shadowMaterial = useMemo(
    () => createShadowMaterial(atlas.texture, lighting),
    [atlas, lighting],
  );
  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => material.dispose(), [material]);
  useEffect(() => () => shadowGeometry.dispose(), [shadowGeometry]);
  useEffect(() => () => shadowMaterial.dispose(), [shadowMaterial]);

  useFrame(({ clock }) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    // In the hen house for the night: out of sight.
    mesh.visible = !animal.hidden;
    if (shadowRef.current) shadowRef.current.visible = !animal.hidden;
    if (animal.hidden) return;
    setAnimationFrame(material, animalFrame(animal, clock.elapsedTime));
    const t = state.interpolation;
    const x = Math.round(animal.previousX + (animal.x - animal.previousX) * t);
    const footY = Math.round(animal.previousY + (animal.y - animal.previousY) * t);
    // The view for the way it faces (resting poses are drawn from the side).
    const view = viewOf(animal);
    if (view !== shownView.current) {
      setSpriteGeometryFrame(geometry, atlas.frame(animalKey(animal.kind, view)));
      shownView.current = view;
    }
    mesh.scale.x = view === 'side' && animal.facing === 'right' ? -1 : 1;
    mesh.position.set(
      x,
      worldYFromMapPx(footY + FOOT_INSET_PX) + frame.height / 2,
      standingSpriteZ(footY),
    );
    shadowRef.current?.position.set(x + 1, worldYFromMapPx(footY), SHADOW_Z);
  });

  return (
    <>
      <mesh ref={shadowRef} geometry={shadowGeometry} material={shadowMaterial} />
      <mesh ref={meshRef} geometry={geometry} material={material} />
    </>
  );
}

interface AnimalSpritesProps {
  readonly state: GameState;
  readonly atlas: SpriteAtlas;
  readonly lighting: LightingUniforms;
}

/** The village's chickens and cat (shown on the island only). */
export function AnimalSprites({ state, atlas, lighting }: AnimalSpritesProps): JSX.Element {
  return (
    <group>
      {state.animals.map((animal) => (
        <AnimalSprite
          key={animal.id}
          animal={animal}
          state={state}
          atlas={atlas}
          lighting={lighting}
        />
      ))}
    </group>
  );
}
