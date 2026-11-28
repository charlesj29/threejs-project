import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, type JSX } from 'react';
import type { Mesh } from 'three';
import type { SpriteAtlas } from '@/shared/render/spriteAtlas';
import {
  CAMPFIRE_FLAME_FOOT,
  CAMPFIRE_FLAME_KEYS,
  CAMPFIRE_GLOW_KEY,
  CAMPFIRE_KEY,
  CAMPFIRE_SPARK_KEY,
} from '../assets/paintCampfire';
import { STEAM_KEYS } from '../assets/paintSmoke';
import { ISLAND_CONFIG } from '../core/config';
import { campfireLit } from '../core/systems/campfire';
import { OBJECT_REGISTRY } from '../core/world/objects';
import type { World } from '../core/world/world';
import { DAYLIGHT, type LightingUniforms } from './lighting';
import { createSpriteGeometry } from './spriteGeometry';
import { createMistMaterial, createSpriteMaterial, setMistOpacity } from './spriteMaterial';
import { GROUND_DECAL_Z, standingSpriteZ, worldYFromMapPx } from './worldSpace';

/** Flames, then sparks and smoke, just in front of the fire ring. */
const FLAME_IN_FRONT = 0.001;
const SPARK_IN_FRONT = 0.002;
/** The glow lies on the sand, over flat decorations and under anything standing. */
const GLOW_Z = GROUND_DECAL_Z + 0.1;
/** By day, thin wisps of smoke curl up from the embers. */
const WISPS = 2;
const WISP_SECONDS = 3.2;
const WISP_RISE_PX = 12;

interface CampfireProps {
  readonly world: World;
  readonly atlas: SpriteAtlas;
  readonly lighting: LightingUniforms;
  /** The time of day the scene shows: the fire burns from dusk until dawn. */
  readonly sceneTime: () => number;
}

/**
 * The beach campfire's moving parts (the ring of stones is a world object):
 * from dusk until dawn, flames dancing over the bed, sparks flying up and a
 * warm glow on the sand round it (strongest in the dark); by day, a thin curl
 * of smoke from the embers. Flames, sparks and glow give off their own light
 * (not darkened at night).
 */
export function Campfire({ world, atlas, lighting, sceneTime }: CampfireProps): JSX.Element | null {
  const fire = useMemo(() => world.objects.find((o) => o.kind === 'campfire'), [world]);
  const settings = ISLAND_CONFIG.campfire;
  const flameGeometries = useMemo(
    () => CAMPFIRE_FLAME_KEYS.map((key) => createSpriteGeometry(atlas.frame(key))),
    [atlas],
  );
  const sparkGeometry = useMemo(
    () => createSpriteGeometry(atlas.frame(CAMPFIRE_SPARK_KEY)),
    [atlas],
  );
  const glowGeometry = useMemo(() => createSpriteGeometry(atlas.frame(CAMPFIRE_GLOW_KEY)), [atlas]);
  const wispGeometries = useMemo(
    () => STEAM_KEYS.map((key) => createSpriteGeometry(atlas.frame(key))),
    [atlas],
  );
  const glowing = useMemo(() => createSpriteMaterial(atlas.texture, DAYLIGHT), [atlas]);
  const glowMaterial = useMemo(() => createMistMaterial(atlas.texture, DAYLIGHT), [atlas]);
  const smokeMaterial = useMemo(
    () => createSpriteMaterial(atlas.texture, lighting),
    [atlas, lighting],
  );
  useEffect(() => () => flameGeometries.forEach((g) => g.dispose()), [flameGeometries]);
  useEffect(() => () => sparkGeometry.dispose(), [sparkGeometry]);
  useEffect(() => () => glowGeometry.dispose(), [glowGeometry]);
  useEffect(() => () => wispGeometries.forEach((g) => g.dispose()), [wispGeometries]);
  useEffect(() => () => glowing.dispose(), [glowing]);
  useEffect(() => () => glowMaterial.dispose(), [glowMaterial]);
  useEffect(() => () => smokeMaterial.dispose(), [smokeMaterial]);
  const flame = useRef<Mesh>(null);
  const glow = useRef<Mesh>(null);
  const sparks = useRef<(Mesh | null)[]>([]);
  const wisps = useRef<(Mesh | null)[]>([]);

  const place = useMemo(() => {
    if (!fire) return null;
    const tile = ISLAND_CONFIG.map.tileSizePx;
    const { footprint } = OBJECT_REGISTRY[fire.kind];
    const frame = atlas.frame(CAMPFIRE_KEY);
    const bottom = (fire.y + footprint.height) * tile;
    const left = (fire.x + footprint.width / 2) * tile - frame.width / 2;
    const top = bottom - frame.height;
    return {
      footX: left + CAMPFIRE_FLAME_FOOT.x,
      footY: top + CAMPFIRE_FLAME_FOOT.y,
      z: standingSpriteZ(bottom),
    };
  }, [fire, atlas]);

  useFrame(({ clock }) => {
    if (!place) return;
    const t = clock.elapsedTime;
    const lit = campfireLit(sceneTime(), settings);
    const flameMesh = flame.current;
    if (flameMesh) {
      flameMesh.visible = lit;
      const frame = Math.floor(t / ISLAND_CONFIG.render.fireFrameSeconds) % flameGeometries.length;
      const geometry = flameGeometries[frame];
      if (geometry && flameMesh.geometry !== geometry) flameMesh.geometry = geometry;
    }
    // The glow: strongest in the dark, flickering a little with the flames.
    const dark = lighting.uLightsOn.value;
    const flicker = 1 + settings.glowFlicker * Math.sin(t * 11) * Math.sin(t * 3.7);
    setMistOpacity(glowMaterial, lit ? settings.glowOpacity * dark * flicker : 0);
    if (glow.current) glow.current.visible = lit && dark > 0;
    sparks.current.forEach((mesh, i) => {
      if (!mesh) return;
      const phase = i / settings.sparks + (i % 2) * 0.13;
      const age = (t / settings.sparkSeconds + phase) % 1;
      mesh.visible = lit && age < 0.85;
      if (!mesh.visible) return;
      const drift =
        Math.sin((age + phase) * Math.PI * 3) * 3 + (i - settings.sparks / 2) * 1.2 * age;
      mesh.position.set(
        Math.round(place.footX + drift),
        worldYFromMapPx(Math.round(place.footY - 8 - age * settings.sparkRisePx)),
        place.z + SPARK_IN_FRONT,
      );
    });
    wisps.current.forEach((mesh, i) => {
      if (!mesh) return;
      const age = (t / WISP_SECONDS + i / WISPS) % 1;
      mesh.visible = !lit && age < 0.8;
      if (!mesh.visible) return;
      const geometry = wispGeometries[Math.floor(age * 4) % wispGeometries.length];
      if (geometry && mesh.geometry !== geometry) mesh.geometry = geometry;
      mesh.position.set(
        place.footX + (i === 0 ? -2 : 2),
        worldYFromMapPx(Math.round(place.footY - 4 - age * WISP_RISE_PX)),
        place.z + SPARK_IN_FRONT,
      );
    });
  });

  if (!place) return null;
  const flameFrame = atlas.frame(CAMPFIRE_FLAME_KEYS[0]);
  return (
    <group>
      <mesh
        ref={glow}
        geometry={glowGeometry}
        material={glowMaterial}
        position={[place.footX, worldYFromMapPx(place.footY - 2), GLOW_Z]}
        visible={false}
      />
      <mesh
        ref={flame}
        geometry={flameGeometries[0]}
        material={glowing}
        position={[
          place.footX,
          worldYFromMapPx(place.footY + 1) + flameFrame.height / 2,
          place.z + FLAME_IN_FRONT,
        ]}
        visible={false}
      />
      {Array.from({ length: settings.sparks }, (_, i) => (
        <mesh
          key={`spark${String(i)}`}
          ref={(mesh) => {
            sparks.current[i] = mesh;
          }}
          geometry={sparkGeometry}
          material={glowing}
          visible={false}
        />
      ))}
      {Array.from({ length: WISPS }, (_, i) => (
        <mesh
          key={`wisp${String(i)}`}
          ref={(mesh) => {
            wisps.current[i] = mesh;
          }}
          geometry={wispGeometries[0]}
          material={smokeMaterial}
          visible={false}
        />
      ))}
    </group>
  );
}
