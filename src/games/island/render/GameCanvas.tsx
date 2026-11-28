import { Canvas } from '@react-three/fiber';
import { useCallback, useEffect, useMemo, type JSX } from 'react';
import type { WebGLRenderer } from 'three';
import { createIslandAtlas } from '../assets/islandSprites';
import { WATER_FRAME_COUNT } from '../assets/paintTiles';
import { ISLAND_CONFIG } from '../core/config';
import { interpolatedPlayerPosition, type GameState } from '../core/game/gameState';
import { ISLAND_MAP } from '../core/game/mapTravel';
import { cameraFocus, noteActivity } from '../core/game/idleTour';
import { useIslandUiStore } from '../state';
import { FollowCamera } from './FollowCamera';
import { DayNightLighting } from './DayNightLighting';
import { GameLoop } from './GameLoop';
import { Campfire } from './Campfire';
import { HotSpring } from './HotSpring';
import { InteractPrompt } from './InteractPrompt';
import { AnimalSprites } from './AnimalSprites';
import { ChimneySmoke } from './ChimneySmoke';
import { RabbitSprites } from './RabbitSprites';
import { RoosterCrow } from './RoosterCrow';
import { DuckSprites } from './DuckSprites';
import { ChoreProps } from './ChoreProps';
import { VillagerBubbles } from './VillagerBubbles';
import { BreadSteam } from './BreadSteam';
import { Butterflies } from './Butterflies';
import { Fireflies } from './Fireflies';
import { Puddles } from './Puddles';
import { EveningMusic } from './EveningMusic';
import { LakeLife } from './LakeLife';
import { PlaymateSprites } from './PlaymateSprites';
import { BirdSprites } from './BirdSprites';
import { NightWater } from './NightWater';
import { CloudShadows } from './CloudShadows';
import { Rain } from './Rain';
import { MorningMist } from './MorningMist';
import { DriftingLeaves } from './DriftingLeaves';
import { windStrength } from './breeze';
import { shownTime } from '../core/systems/dayNight';
import { StudioMarker } from './StudioMarker';
import { TapToWalk } from './TapToWalk';
import { createLightingUniforms } from './lighting';
import { PlayerSprite } from './PlayerSprite';
import { Tilemap } from './Tilemap';
import { VillagerSprites } from './VillagerSprites';
import { useKeyboardInput } from './useKeyboardInput';
import { WorldObjects } from './WorldObjects';
import { worldYFromMapPx } from './worldSpace';

const BACKGROUND_COLOR = '#1f4e79';
/** Round a small room: dark, like the space beyond the walls. */
const INDOOR_BACKGROUND = '#140e0a';

declare global {
  interface Window {
    /** Dev only: lets performance/cleanup checks read `renderer.info` from the console. */
    __islandRenderer?: WebGLRenderer;
  }
}

function exposeRendererInDev({ gl }: { gl: WebGLRenderer }): void {
  if (import.meta.env.DEV) window.__islandRenderer = gl;
}

/** The camera looks at the player's body rather than their feet. */
const CAMERA_LOOK_ABOVE_FEET_PX = 8;
/** Sitting on a bench, the camera eases a little forward: you look out at the view. */
const SIT_LOOK_AHEAD_PX = 18;
/** Above this much rain the washing is too wet to sway. */
const WET_WASHING = 0.3;

interface GameCanvasProps {
  readonly game: GameState;
}

/**
 * Root Three.js canvas for the island. 1 world unit = 1 source pixel.
 * `flat` + `linear` turn off tone mapping and colour-space conversion, so
 * painted palette colours reach the screen unchanged; antialiasing is off
 * because it blurs pixel art.
 */
export function GameCanvas({ game }: GameCanvasProps): JSX.Element {
  // Re-render (and rebuild the scene) when the player goes through a door.
  const mapId = useIslandUiStore((state) => state.mapId);
  const world = game.maps.get(mapId) ?? game.world;
  const background = world.indoor ? INDOOR_BACKGROUND : BACKGROUND_COLOR;
  const { tileSizePx, chunkSizeTiles } = ISLAND_CONFIG.map;
  const atlas = useMemo(() => createIslandAtlas(), []);
  useEffect(() => () => atlas.dispose(), [atlas]);
  // One set of lighting uniforms shared by every world material.
  const lighting = useMemo(() => createLightingUniforms(), []);

  useKeyboardInput(
    game.input,
    useCallback(() => noteActivity(game, ISLAND_CONFIG), [game]),
  );

  const mapWidthPx = world.width * tileSizePx;
  const mapHeightPx = world.height * tileSizePx;
  const bounds = useMemo(
    () => ({ minX: 0, maxX: mapWidthPx, minY: worldYFromMapPx(mapHeightPx), maxY: 0 }),
    [mapWidthPx, mapHeightPx],
  );
  const roomArea = useMemo(
    () => ({ widthPx: mapWidthPx, heightPx: mapHeightPx }),
    [mapWidthPx, mapHeightPx],
  );
  // The washing hangs still in the rain.
  const isBreezy = useCallback(() => game.weather.intensity < WET_WASHING, [game]);
  // The breeze: a little stronger as a shower comes on, calmer at night.
  const wind = useCallback(
    () => windStrength(game.weather.intensity, lighting.uLightsOn.value, ISLAND_CONFIG.breeze),
    [game, lighting],
  );
  // The time of day the scene shows (the clock, or the held noon or midnight).
  const sceneTime = useCallback(
    () => shownTime(useIslandUiStore.getState().dayNightMode, game.timeOfDay),
    [game],
  );
  // Raining hard enough for animals to take shelter.
  const raining = useCallback(
    () => game.weather.intensity >= ISLAND_CONFIG.rainyDay.shelterAt,
    [game],
  );
  const followTarget = useCallback(() => {
    const { x, y } = interpolatedPlayerPosition(game);
    const lookAhead = game.player.sitting ? SIT_LOOK_AHEAD_PX : 0;
    const player = { x, y: y - CAMERA_LOOK_ABOVE_FEET_PX + lookAhead };
    // The ambient tour (or the glide back from it) takes the camera off the player.
    const focus = cameraFocus(game, player, ISLAND_CONFIG);
    return { x: focus.x, y: worldYFromMapPx(focus.y) };
  }, [game]);

  return (
    <Canvas flat linear gl={{ antialias: false }} onCreated={exposeRendererInDev}>
      <color attach="background" args={[background]} />
      <GameLoop state={game} />
      <TapToWalk state={game} atlas={atlas} />
      <DayNightLighting
        key={`light:${mapId}`}
        state={game}
        lighting={lighting}
        background={background}
      />
      <FollowCamera
        getTarget={followTarget}
        bounds={bounds}
        tileSizePx={tileSizePx}
        fitArea={world.indoor ? roomArea : undefined}
      />
      <Tilemap
        key={`tiles:${mapId}`}
        world={world}
        atlas={atlas}
        tileSizePx={tileSizePx}
        chunkSizeTiles={chunkSizeTiles}
        waterFrameSeconds={ISLAND_CONFIG.render.waterFrameSeconds}
        waterFrameCount={WATER_FRAME_COUNT}
        lighting={lighting}
      />
      <WorldObjects
        key={`objects:${mapId}`}
        world={world}
        atlas={atlas}
        tileSizePx={tileSizePx}
        flowerFrameSeconds={ISLAND_CONFIG.render.flowerFrameSeconds}
        lighting={lighting}
        isBreezy={isBreezy}
        windStrength={wind}
        sceneTime={sceneTime}
      />
      <PlayerSprite state={game} atlas={atlas} lighting={lighting} />
      {mapId === ISLAND_MAP && <VillagerSprites state={game} atlas={atlas} lighting={lighting} />}
      {mapId === ISLAND_MAP && <ChoreProps state={game} atlas={atlas} lighting={lighting} />}
      {mapId === ISLAND_MAP && <EveningMusic state={game} atlas={atlas} lighting={lighting} />}
      {mapId === ISLAND_MAP && <PlaymateSprites state={game} atlas={atlas} lighting={lighting} />}
      {mapId === ISLAND_MAP && <VillagerBubbles state={game} atlas={atlas} />}
      {mapId === ISLAND_MAP && (
        <BreadSteam world={world} state={game} atlas={atlas} lighting={lighting} />
      )}
      <InteractPrompt state={game} atlas={atlas} />
      {mapId === ISLAND_MAP && <AnimalSprites state={game} atlas={atlas} lighting={lighting} />}
      {mapId === ISLAND_MAP && <RoosterCrow state={game} atlas={atlas} sceneTime={sceneTime} />}
      {mapId === ISLAND_MAP && <RabbitSprites state={game} atlas={atlas} lighting={lighting} />}
      {mapId === ISLAND_MAP && <DuckSprites state={game} atlas={atlas} lighting={lighting} />}
      {mapId === ISLAND_MAP && <LakeLife state={game} atlas={atlas} lighting={lighting} />}
      {mapId === ISLAND_MAP && <Puddles state={game} atlas={atlas} lighting={lighting} />}
      {mapId === ISLAND_MAP && (
        <HotSpring
          world={world}
          state={game}
          atlas={atlas}
          lighting={lighting}
          sceneTime={sceneTime}
        />
      )}
      {mapId === ISLAND_MAP && (
        <Campfire world={world} atlas={atlas} lighting={lighting} sceneTime={sceneTime} />
      )}
      {mapId === ISLAND_MAP && (
        <Butterflies world={world} atlas={atlas} lighting={lighting} raining={raining} />
      )}
      {mapId === ISLAND_MAP && (
        <BirdSprites
          state={game}
          atlas={atlas}
          lighting={lighting}
          sceneTime={sceneTime}
          raining={raining}
        />
      )}
      {mapId === ISLAND_MAP && (
        <Fireflies world={world} atlas={atlas} lighting={lighting} raining={raining} />
      )}
      {mapId === ISLAND_MAP && <NightWater state={game} atlas={atlas} sceneTime={sceneTime} />}
      {mapId === ISLAND_MAP && (
        <CloudShadows world={world} state={game} atlas={atlas} lighting={lighting} />
      )}
      {mapId === ISLAND_MAP && (
        <DriftingLeaves atlas={atlas} lighting={lighting} windStrength={wind} />
      )}
      {mapId === ISLAND_MAP && (
        <MorningMist world={world} state={game} atlas={atlas} lighting={lighting} />
      )}
      {mapId === ISLAND_MAP && (
        <Rain world={world} state={game} atlas={atlas} lighting={lighting} />
      )}
      {mapId === ISLAND_MAP && (
        <ChimneySmoke world={world} atlas={atlas} lighting={lighting} sceneTime={sceneTime} />
      )}
      {mapId === ISLAND_MAP && <StudioMarker world={world} atlas={atlas} />}
    </Canvas>
  );
}
