import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, type JSX } from 'react';
import type { Mesh } from 'three';
import type { AtlasFrame } from '@/shared/render/atlasLayout';
import type { SpriteAtlas } from '@/shared/render/spriteAtlas';
import { GUITAR_GRIP, GUITAR_KEY, NOTE_KEYS } from '../assets/paintMusic';
import { ISLAND_CONFIG } from '../core/config';
import { playerFootY } from '../core/entities/player';
import type { GameState } from '../core/game/gameState';
import { eveningMusician } from '../core/systems/eveningMusic';
import type { LightingUniforms } from './lighting';
import { seatLiftPx } from './seatLift';
import { createSpriteGeometry } from './spriteGeometry';
import { createSpriteMaterial } from './spriteMaterial';
import { standingSpriteZ, worldYFromMapPx } from './worldSpace';

/** Where the hands are, from the feet (map pixels): in front of the body, at the waist. */
const HANDS = { side: 1, up: 8 } as const;
/** The guitar is held just in front of (or, seen from behind, behind) the player. */
const LAYER = 0.002;
/** Each note floats up this far over this long, swaying a little, then fades. */
const NOTE_RISE_PX = 18;
const NOTE_SECONDS = 2.4;
const NOTE_SWAY_PX = 3;
const NOTE_FADE_FROM = 0.82;
/** Notes start above the head, a little to the side. */
const NOTE_START = { side: 5, up: 22 } as const;
const NOTE_Z = 40;

/** Puts a sprite's top-left at a map pixel. */
function placeTopLeft(mesh: Mesh, frame: AtlasFrame, left: number, top: number, z: number): void {
  mesh.position.set(left + frame.width / 2, worldYFromMapPx(top) - frame.height / 2, z);
}

interface EveningMusicProps {
  readonly state: GameState;
  readonly atlas: SpriteAtlas;
  readonly lighting: LightingUniforms;
}

/**
 * The evening gathering's music: whoever plays holds a little guitar, and
 * notes float up from it, swaying as they rise (island only).
 */
export function EveningMusic({ state, atlas, lighting }: EveningMusicProps): JSX.Element {
  const guitarFrame = useMemo(() => atlas.frame(GUITAR_KEY), [atlas]);
  const noteFrames = useMemo(() => NOTE_KEYS.map((key) => atlas.frame(key)), [atlas]);
  const guitarGeometry = useMemo(() => createSpriteGeometry(guitarFrame), [guitarFrame]);
  const noteGeometries = useMemo(
    () => noteFrames.map((f) => createSpriteGeometry(f)),
    [noteFrames],
  );
  const material = useMemo(() => createSpriteMaterial(atlas.texture, lighting), [atlas, lighting]);
  const noteMaterial = useMemo(() => createSpriteMaterial(atlas.texture), [atlas]);
  useEffect(() => () => guitarGeometry.dispose(), [guitarGeometry]);
  useEffect(() => () => noteGeometries.forEach((g) => g.dispose()), [noteGeometries]);
  useEffect(() => () => material.dispose(), [material]);
  useEffect(() => () => noteMaterial.dispose(), [noteMaterial]);
  const guitar = useRef<Mesh>(null);
  const notes = useRef<(Mesh | null)[]>([]);

  useFrame(({ clock }) => {
    const player = eveningMusician(state.villagers);
    if (guitar.current) guitar.current.visible = player !== null;
    notes.current.forEach((mesh) => {
      if (mesh) mesh.visible = false;
    });
    if (!player || !guitar.current) return;
    const x = Math.round(player.x);
    // Seated (round the campfire): the guitar goes up onto the lap with them.
    const ground = Math.round(playerFootY(player.y, ISLAND_CONFIG.player));
    const feet = ground - seatLiftPx(player);
    const left = player.facing === 'left';
    const away = player.facing === 'up';
    // The guitar across the body, the neck pointing the way they face.
    guitar.current.scale.x = left ? -1 : 1;
    const handX = x + (left ? -HANDS.side : HANDS.side);
    const gripLeft = left ? handX - (guitarFrame.width - GUITAR_GRIP.x) : handX - GUITAR_GRIP.x;
    placeTopLeft(
      guitar.current,
      guitarFrame,
      gripLeft,
      feet - HANDS.up - GUITAR_GRIP.y,
      standingSpriteZ(ground) + (away ? -LAYER : LAYER),
    );
    // Notes rising one after another, each in its own colour.
    const seconds = clock.elapsedTime;
    notes.current.forEach((mesh, i) => {
      const frame = noteFrames[i];
      if (!mesh || !frame) return;
      const t = (seconds / NOTE_SECONDS + i / NOTE_KEYS.length) % 1;
      mesh.visible = t < NOTE_FADE_FROM;
      const sway = Math.round(Math.sin(t * Math.PI * 2 + i) * NOTE_SWAY_PX);
      placeTopLeft(
        mesh,
        frame,
        x + NOTE_START.side + sway,
        feet - NOTE_START.up - Math.round(t * NOTE_RISE_PX),
        NOTE_Z,
      );
    });
  });

  return (
    <group>
      <mesh ref={guitar} geometry={guitarGeometry} material={material} visible={false} />
      {noteGeometries.map((geometry, i) => (
        <mesh
          key={i}
          ref={(mesh) => {
            notes.current[i] = mesh;
          }}
          geometry={geometry}
          material={noteMaterial}
          visible={false}
        />
      ))}
    </group>
  );
}
