import { useEffect, useMemo, useRef } from 'react';
import { createAmbiencePlayer } from '@/shared/audio/ambiencePlayer';
import { ISLAND_CONFIG } from '../core/config';
import type { GameState } from '../core/game/gameState';
import { cameraFocus } from '../core/game/idleTour';
import { ISLAND_MAP } from '../core/game/mapTravel';
import { campfireLit } from '../core/systems/campfire';
import { shownTime, targetLighting } from '../core/systems/dayNight';
import {
  groundAt,
  seaDistances,
  soundscapeLevels,
  villageDistances,
} from '../core/systems/soundscape';
import { eveningMusician } from '../core/systems/eveningMusic';
import { roosterCrowing } from '../core/systems/rooster';
import { useIslandUiStore } from '../state';

/** How often to check for a new footstep (ms): short, so steps land on the beat of the feet. */
const FOOTSTEP_CHECK_MS = 30;

/**
 * Nature sounds under the music (surf, birds, crickets, rain, the fire). They
 * start with the music on the first key press or click, and the same mute
 * button (M) silences both. The mix is sampled from the game a few times a
 * second (never per frame) from where the camera looks: the player, or the
 * ambient tour. Footsteps follow the player's steps (checked every few
 * frames' worth of time), and the village bell rings at its hours. Renders
 * nothing.
 */
export function AmbientSound({ game }: { readonly game: GameState }): null {
  const isMuted = useIslandUiStore((state) => state.isMusicMuted);
  const hasGestureRef = useRef(false);
  const island = game.maps.get(ISLAND_MAP) ?? game.world;
  const distances = useMemo(
    () => ({ sea: seaDistances(island), village: villageDistances(island) }),
    [island],
  );
  const player = useMemo(
    () =>
      createAmbiencePlayer({
        volume: ISLAND_CONFIG.ambience.volume,
        fadeSeconds: ISLAND_CONFIG.music.fadeSeconds,
        fadeInSeconds: ISLAND_CONFIG.music.fadeInSeconds,
        layerVolumes: ISLAND_CONFIG.ambience.layerVolumes,
      }),
    [],
  );

  useEffect(() => {
    const onFirstGesture = (): void => {
      hasGestureRef.current = true;
      window.removeEventListener('pointerup', onFirstGesture);
      window.removeEventListener('keydown', onFirstGesture);
      if (!useIslandUiStore.getState().isMusicMuted) void player.start();
    };
    // On the finger's lift (or the mouse's release): a touch only counts as the gesture that may
    // start sound when the finger comes up, so starting on the press is refused on phones.
    window.addEventListener('pointerup', onFirstGesture);
    window.addEventListener('keydown', onFirstGesture);
    return () => {
      window.removeEventListener('pointerup', onFirstGesture);
      window.removeEventListener('keydown', onFirstGesture);
      player.dispose();
    };
  }, [player]);

  useEffect(() => {
    player.setMuted(isMuted);
    // Arrived muted, unmuted later: start now (the click was the gesture).
    if (!isMuted && hasGestureRef.current) void player.start();
  }, [player, isMuted]);

  useEffect(() => {
    const settings = ISLAND_CONFIG.ambience;
    const sample = (): void => {
      const mode = useIslandUiStore.getState().dayNightMode;
      const night = targetLighting(mode, game.timeOfDay).lights;
      const where = cameraFocus(game, { x: game.player.x, y: game.player.y }, ISLAND_CONFIG);
      player.setLevels(
        soundscapeLevels(
          { world: game.world, x: where.x, y: where.y },
          night,
          game.weather.intensity,
          distances,
          settings,
          ISLAND_CONFIG.map.tileSizePx,
          eveningMusician(game.villagers),
          campfireLit(shownTime(mode, game.timeOfDay), ISLAND_CONFIG.campfire),
        ),
      );
    };
    sample();
    const timer = window.setInterval(sample, settings.sampleMs);
    return () => window.clearInterval(timer);
  }, [game, player, distances]);

  // Footsteps: one sound per step the player takes, on the ground underfoot.
  useEffect(() => {
    let heard = game.player.footfalls;
    const timer = window.setInterval(() => {
      const { player: body } = game;
      if (body.footfalls === heard) return;
      heard = body.footfalls;
      player.footstep(groundAt(game.world, body.x, body.y, ISLAND_CONFIG.map.tileSizePx));
    }, FOOTSTEP_CHECK_MS);
    return () => window.clearInterval(timer);
  }, [game, player]);

  // The village bell, when the clock passes one of its hours (not while day or night is held).
  useEffect(() => {
    let last = game.timeOfDay;
    const timer = window.setInterval(() => {
      const now = game.timeOfDay;
      const passed = ISLAND_CONFIG.ambience.bellTimes.some((hour) =>
        now >= last ? last < hour && hour <= now : hour > last || hour <= now,
      );
      last = now;
      if (passed && game.heldTime === null) player.ringBell();
    }, ISLAND_CONFIG.ambience.sampleMs);
    return () => window.clearInterval(timer);
  }, [game, player]);

  // The rooster: a crow each time one of his dawn bursts begins (not while day or night is held).
  useEffect(() => {
    let wasCrowing = false;
    const timer = window.setInterval(() => {
      const crowing = roosterCrowing(game.timeOfDay, ISLAND_CONFIG.animals);
      const rooster = game.animals.some((a) => a.kind === 'rooster' && !a.hidden);
      if (crowing && !wasCrowing && rooster && game.heldTime === null) player.crow();
      wasCrowing = crowing;
    }, ISLAND_CONFIG.ambience.sampleMs);
    return () => window.clearInterval(timer);
  }, [game, player]);

  return null;
}
