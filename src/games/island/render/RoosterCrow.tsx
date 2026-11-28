import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, type JSX } from 'react';
import type { Mesh } from 'three';
import type { SpriteAtlas } from '@/shared/render/spriteAtlas';
import { NOTE_KEYS } from '../assets/paintMusic';
import { ISLAND_CONFIG } from '../core/config';
import type { GameState } from '../core/game/gameState';
import { roosterCrowing } from '../core/systems/rooster';
import { createSpriteGeometry } from './spriteGeometry';
import { createSpriteMaterial } from './spriteMaterial';
import { worldYFromMapPx } from './worldSpace';

/** Each note floats up this far over this long from above the rooster's head, swaying a little. */
const NOTE_RISE_PX = 12;
const NOTE_SECONDS = 1.1;
const NOTE_START_UP_PX = 16;
const NOTE_SWAY_PX = 2;
/** Notes stay in front of everything near them. */
const NOTE_Z = 40;

interface RoosterCrowProps {
  readonly state: GameState;
  readonly atlas: SpriteAtlas;
  /** The time of day the scene shows: he crows at dawn. */
  readonly sceneTime: () => number;
}

/** While the rooster crows at dawn, little notes float up from his beak, one after another. */
export function RoosterCrow({ state, atlas, sceneTime }: RoosterCrowProps): JSX.Element {
  const geometries = useMemo(
    () => NOTE_KEYS.map((key) => createSpriteGeometry(atlas.frame(key))),
    [atlas],
  );
  const material = useMemo(() => createSpriteMaterial(atlas.texture), [atlas]);
  useEffect(() => () => geometries.forEach((g) => g.dispose()), [geometries]);
  useEffect(() => () => material.dispose(), [material]);
  const note = useRef<Mesh>(null);

  useFrame(({ clock }) => {
    const mesh = note.current;
    if (!mesh) return;
    const rooster = state.animals.find((a) => a.kind === 'rooster' && !a.hidden && !a.fleeing);
    const crowing = roosterCrowing(sceneTime(), ISLAND_CONFIG.animals);
    mesh.visible = rooster !== undefined && crowing;
    if (!rooster || !mesh.visible) return;
    const t = (clock.elapsedTime % NOTE_SECONDS) / NOTE_SECONDS;
    const geometry = geometries[Math.floor(clock.elapsedTime / NOTE_SECONDS) % geometries.length];
    if (geometry && mesh.geometry !== geometry) mesh.geometry = geometry;
    const ahead = rooster.facing === 'left' ? -4 : rooster.facing === 'right' ? 4 : 0;
    mesh.position.set(
      Math.round(rooster.x + ahead + Math.sin(t * Math.PI * 2) * NOTE_SWAY_PX),
      worldYFromMapPx(Math.round(rooster.y - NOTE_START_UP_PX - t * NOTE_RISE_PX)),
      NOTE_Z,
    );
  });

  return <mesh ref={note} geometry={geometries[0]} material={material} visible={false} />;
}
