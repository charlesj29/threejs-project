import type { IslandConfig } from '../config';
import { createInitialContext, type GenerationContext, type GenerationStep } from './context';
import { assignTerrain } from './steps/assignTerrain';
import { carveLake } from './steps/carveLake';
import { chooseSpawn } from './steps/chooseSpawn';
import { hangLaundry } from './steps/hangLaundry';
import { buildChickenCoop } from './steps/buildChickenCoop';
import { decorateCabin } from './steps/decorateCabin';
import { layPaths } from './steps/layPaths';
import { placeCabin } from './steps/placeCabin';
import { placeCampfire } from './steps/placeCampfire';
import { placeDock } from './steps/placeDock';
import { placeHotSpring } from './steps/placeHotSpring';
import { placeLedges } from './steps/placeLedges';
import { placeSignposts } from './steps/placeSignposts';
import { placeStudio } from './steps/placeStudio';
import { placeVillage } from './steps/placeVillage';
import { scatterDeadwood } from './steps/scatterDeadwood';
import { scatterFlowers } from './steps/scatterFlowers';
import { scatterRocks } from './steps/scatterRocks';
import { scatterTrees } from './steps/scatterTrees';
import { shapeIsland } from './steps/shapeIsland';

/**
 * Order matters: each step builds on the previous ones (paths are laid before
 * rocks and trees so those keep trails clear; ledges come after the trees so adding
 * them doesn't reshuffle the forests). Validation runs after the last step.
 */
export const GENERATION_STEPS: readonly GenerationStep[] = [
  shapeIsland,
  assignTerrain,
  carveLake,
  placeCabin,
  placeDock,
  layPaths,
  decorateCabin,
  scatterRocks,
  scatterTrees,
  placeLedges,
  placeVillage,
  placeStudio,
  placeSignposts,
  scatterDeadwood,
  scatterFlowers,
  hangLaundry,
  buildChickenCoop,
  placeHotSpring,
  placeCampfire,
  chooseSpawn,
];

export function runGenerationPipeline(seed: number, config: IslandConfig): GenerationContext {
  return GENERATION_STEPS.reduce(
    (context, step) => step(context),
    createInitialContext(seed, config),
  );
}
