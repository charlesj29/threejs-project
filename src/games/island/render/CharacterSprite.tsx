import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, type JSX } from 'react';
import type { Mesh } from 'three';
import type { SpriteAtlas } from '@/shared/render/spriteAtlas';
import { ISLAND_CONFIG } from '../core/config';
import { playerFootY, type Direction, type Player } from '../core/entities/player';
import type { GameState } from '../core/game/gameState';
import { playerFrameIndex } from '../core/systems/animation';
import type { LightingUniforms } from './lighting';
import { PLAYER_SHADOW } from './objectShadows';
import { createSpriteGeometry, setSpriteGeometryFrame } from './spriteGeometry';
import { createShadowMaterial, createSpriteMaterial, setAnimationFrame } from './spriteMaterial';
import { SHADOW_Z, standingSpriteZ, worldYFromMapPx } from './worldSpace';

/** How far a sitting character is lifted, so the hips sit on the bench seat. */
const SIT_LIFT_PX = 8;
/**
 * Soaking in the hot spring: lifted so the chest sits on the water line (the seat's feet are 13 px
 * below it; the sprite's chest row is 6 px above its bottom), the rest hidden by the near rim.
 */
const SOAK_LIFT_PX = 7;

interface CharacterSpriteProps {
  /** The player or a villager: anything that walks and animates like the player. */
  readonly body: Player;
  /** Atlas key of the animation strip for a facing direction. */
  readonly spriteKeyFor: (facing: Direction) => string;
  /** Read for the interpolation factor between logic steps. */
  readonly state: GameState;
  readonly atlas: SpriteAtlas;
  readonly lighting: LightingUniforms;
}

/**
 * Draws a character from the simulation every frame: interpolated position
 * snapped to whole pixels (crisp), the strip for the facing direction, the
 * animation frame, a soft shadow, and depth from the feet so crowns, roofs and
 * fences cover them when they stand behind.
 */
export function CharacterSprite({
  body,
  spriteKeyFor,
  state,
  atlas,
  lighting,
}: CharacterSpriteProps): JSX.Element {
  const meshRef = useRef<Mesh>(null);
  const shadowRef = useRef<Mesh>(null);
  const shownKey = useRef('');
  const geometry = useMemo(
    () => createSpriteGeometry(atlas.frame(spriteKeyFor(body.facing))),
    [atlas, body, spriteKeyFor],
  );
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

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const key = spriteKeyFor(body.facing);
    const frame = atlas.frame(key);
    if (shownKey.current !== key) {
      setSpriteGeometryFrame(geometry, frame);
      shownKey.current = key;
    }
    setAnimationFrame(material, playerFrameIndex(body, ISLAND_CONFIG.player));
    const t = state.interpolation;
    const x = Math.round(body.previousX + (body.x - body.previousX) * t);
    const y = body.previousY + (body.y - body.previousY) * t;
    const footY = Math.round(playerFootY(y, ISLAND_CONFIG.player));
    // Sitting on a bench: drawn up on the seat (depth stays at the feet, in front of the bench).
    const lift = body.sitting ? (body.sitting.soaking ? SOAK_LIFT_PX : SIT_LIFT_PX) : 0;
    mesh.position.set(x, worldYFromMapPx(footY - lift) + frame.height / 2, standingSpriteZ(footY));
    if (shadowRef.current) shadowRef.current.visible = !body.sitting;
    shadowRef.current?.position.set(
      x + PLAYER_SHADOW.offsetX,
      worldYFromMapPx(footY + PLAYER_SHADOW.offsetY),
      SHADOW_Z,
    );
  });

  return (
    <>
      <mesh ref={shadowRef} geometry={shadowGeometry} material={shadowMaterial} />
      <mesh ref={meshRef} geometry={geometry} material={material} />
    </>
  );
}
