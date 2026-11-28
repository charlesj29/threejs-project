import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, type JSX } from 'react';
import type { Mesh } from 'three';
import type { SpriteAtlas } from '@/shared/render/spriteAtlas';
import {
  HOT_SPRING_FRONT_KEY,
  HOT_SPRING_WATERLINE,
  SOAK_RIPPLE_KEYS,
  SPRING_STEAM_KEYS,
  SPRING_STEAM_SPOTS,
} from '../assets/paintHotSpring';
import { ISLAND_CONFIG } from '../core/config';
import type { Player } from '../core/entities/player';
import type { GameState } from '../core/game/gameState';
import { SOAK_SEATS_PX } from '../core/systems/seat';
import { OBJECT_REGISTRY } from '../core/world/objects';
import type { World } from '../core/world/world';
import type { LightingUniforms } from './lighting';
import { createSpriteGeometry } from './spriteGeometry';
import {
  createMistMaterial,
  createSpriteMaterial,
  setMistOpacity,
  type MistMaterial,
} from './spriteMaterial';
import { steamPuff, steamThickness } from './springSteam';
import { standingSpriteZ, worldYFromMapPx } from './worldSpace';

/** The ripple ring round a soaker swaps between its two sizes this often. */
const RIPPLE_SECONDS = 0.9;
/** Ripples, then steam, just in front of the pool's near rim. */
const RIPPLE_IN_FRONT = 0.001;
const STEAM_IN_FRONT = 0.002;

interface HotSpringProps {
  readonly world: World;
  readonly state: GameState;
  readonly atlas: SpriteAtlas;
  readonly lighting: LightingUniforms;
  /** The time of day the scene shows: the steam is thickest on a cool morning. */
  readonly sceneTime: () => number;
}

/**
 * The hot spring's moving parts (the pool itself is a flat world object): its
 * near rim drawn in front of anyone soaking (so they sit in the water up to the
 * chest), a ring of ripples round each soaker, and soft steam rising from the
 * water, thickest on a cool morning and in the rain.
 */
export function HotSpring({
  world,
  state,
  atlas,
  lighting,
  sceneTime,
}: HotSpringProps): JSX.Element | null {
  const spring = useMemo(() => world.objects.find((o) => o.kind === 'hot_spring'), [world]);
  const settings = ISLAND_CONFIG.hotSpring;
  const frontGeometry = useMemo(
    () => createSpriteGeometry(atlas.frame(HOT_SPRING_FRONT_KEY)),
    [atlas],
  );
  const rippleGeometries = useMemo(
    () => SOAK_RIPPLE_KEYS.map((key) => createSpriteGeometry(atlas.frame(key))),
    [atlas],
  );
  const steamGeometries = useMemo(
    () => SPRING_STEAM_KEYS.map((key) => createSpriteGeometry(atlas.frame(key))),
    [atlas],
  );
  const material = useMemo(() => createSpriteMaterial(atlas.texture, lighting), [atlas, lighting]);
  // One material per puff: each fades on its own.
  const steamMaterials = useMemo<MistMaterial[]>(
    () =>
      Array.from({ length: settings.steamPuffs }, () =>
        createMistMaterial(atlas.texture, lighting),
      ),
    [atlas, lighting, settings.steamPuffs],
  );
  useEffect(() => () => frontGeometry.dispose(), [frontGeometry]);
  useEffect(() => () => rippleGeometries.forEach((g) => g.dispose()), [rippleGeometries]);
  useEffect(() => () => steamGeometries.forEach((g) => g.dispose()), [steamGeometries]);
  useEffect(() => () => material.dispose(), [material]);
  useEffect(() => () => steamMaterials.forEach((m) => m.dispose()), [steamMaterials]);
  const ripples = useRef<(Mesh | null)[]>([]);
  const puffs = useRef<(Mesh | null)[]>([]);

  const place = useMemo(() => {
    if (!spring) return null;
    const tile = ISLAND_CONFIG.map.tileSizePx;
    const { footprint } = OBJECT_REGISTRY[spring.kind];
    const left = spring.x * tile;
    const top = spring.y * tile;
    const bottom = (spring.y + footprint.height) * tile;
    const frontZ = standingSpriteZ(bottom);
    const frame = atlas.frame(HOT_SPRING_FRONT_KEY);
    return {
      left,
      top,
      front: {
        x: left + (footprint.width * tile) / 2,
        y: worldYFromMapPx(bottom) + frame.height / 2,
        z: frontZ,
      },
    };
  }, [spring, atlas]);

  useFrame(({ clock }) => {
    if (!place) return;
    // Ripples round whoever is soaking (the player, or a villager having a soak).
    const soakers: Player[] = [state.player, ...state.villagers.filter((v) => !v.hidden)].filter(
      (body) => body.sitting?.soaking === true,
    );
    const rippleGeometry = rippleGeometries[Math.floor(clock.elapsedTime / RIPPLE_SECONDS) % 2];
    ripples.current.forEach((mesh, i) => {
      if (!mesh) return;
      const body = soakers[i];
      mesh.visible = body !== undefined;
      if (!body) return;
      if (rippleGeometry && mesh.geometry !== rippleGeometry) mesh.geometry = rippleGeometry;
      const rippleBottom = place.top + HOT_SPRING_WATERLINE + 2;
      mesh.position.set(
        Math.round(body.x),
        worldYFromMapPx(rippleBottom) + 2,
        place.front.z + RIPPLE_IN_FRONT,
      );
    });
    // Steam: puffs taking turns, each rising and drifting a little, fading in and away.
    const thickness = steamThickness(sceneTime(), state.weather.intensity, settings);
    puffs.current.forEach((mesh, i) => {
      const material = steamMaterials[i];
      const spot = SPRING_STEAM_SPOTS[i % SPRING_STEAM_SPOTS.length];
      if (!mesh || !material || !spot) return;
      const phase = (i / steamMaterials.length + spot.x * 0.017) % 1;
      const age = (clock.elapsedTime / settings.steamSeconds + phase) % 1;
      const puff = steamPuff(age, phase, settings.steamRisePx);
      setMistOpacity(material, thickness * puff.fade);
      mesh.position.set(
        Math.round(place.left + spot.x + puff.dx),
        worldYFromMapPx(Math.round(place.top + spot.y + puff.dy)),
        place.front.z + STEAM_IN_FRONT,
      );
    });
  });

  if (!place) return null;
  return (
    <group>
      <mesh
        geometry={frontGeometry}
        material={material}
        position={[place.front.x, place.front.y, place.front.z]}
      />
      {SOAK_SEATS_PX.map((_, i) => (
        <mesh
          key={`ripple${String(i)}`}
          ref={(mesh) => {
            ripples.current[i] = mesh;
          }}
          geometry={rippleGeometries[0]}
          material={material}
          visible={false}
        />
      ))}
      {steamMaterials.map((steam, i) => (
        <mesh
          key={`steam${String(i)}`}
          ref={(mesh) => {
            puffs.current[i] = mesh;
          }}
          geometry={steamGeometries[i % steamGeometries.length]}
          material={steam}
        />
      ))}
    </group>
  );
}
