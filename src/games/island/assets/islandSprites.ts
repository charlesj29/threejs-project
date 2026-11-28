import type { SpriteSource } from '@/shared/render/atlasLayout';
import { buildSpriteAtlas, type SpriteAtlas } from '@/shared/render/spriteAtlas';
import { OBJECT_KINDS, OBJECT_REGISTRY } from '../core/world/objects';
import { paintAnimalSprites } from './paintAnimals';
import { paintBubbleSprites } from './paintBubbles';
import { paintCatSprites } from './paintCat';
import { paintChorePropSprites } from './paintChoreProps';
import { paintCabinSprites } from './paintCabin';
import { paintCampfireSprites } from './paintCampfire';
import { paintCliffSprites } from './paintCliff';
import { paintDeadwoodSprites } from './paintDeadwood';
import { paintDuckSprites } from './paintDucks';
import { paintFurnitureSprites } from './paintFurniture';
import { paintInteriorSprites } from './paintInterior';
import { paintHotSpringSprites } from './paintHotSpring';
import { paintHouseSprites } from './paintHouses';
import { paintInsectSprites } from './paintInsects';
import { paintBirdSprites } from './paintBirds';
import { paintLakeLifeSprites } from './paintLakeLife';
import { paintPlaymateSprites } from './paintPlaymates';
import { paintPuppySprites } from './paintPuppy';
import { paintCoopSprites } from './paintCoop';
import { paintMusicSprites } from './paintMusic';
import { paintWaterLightSprites } from './paintWaterLights';
import { paintLaundrySprites } from './paintLaundry';
import { paintWindowLights } from './paintLights';
import { paintObjectSprites } from './paintObjects';
import { paintPlayerSprites } from './paintPlayer';
import { paintPlazaSprites } from './paintPlaza';
import { paintRabbitSprites } from './paintRabbits';
import { paintRunPropSprites } from './paintRunProps';
import { paintPropSprites } from './paintProps';
import { paintShadowSprites } from './paintShadows';
import { paintSmokeSprites } from './paintSmoke';
import { paintStructureSprites } from './paintStructures';
import { paintStudioSprites } from './paintStudio';
import { paintStudioFurnitureSprites } from './paintStudioFurniture';
import { paintTileSprites } from './paintTiles';
import { paintTransitionSprites } from './paintTransitions';
import { paintWeatherSprites } from './paintWeather';
import { paintUiSprites } from './paintUi';
import { paintVillagePropSprites } from './paintVillageProps';

/** Buildings and lamps get a night-time light overlay (registry: `litAtNight`). */
const LIT_SPRITE_KEYS = OBJECT_KINDS.filter((kind) => OBJECT_REGISTRY[kind].litAtNight).map(
  (kind) => OBJECT_REGISTRY[kind].spriteKey,
);

/** Every sprite the island needs, painted in code. */
export function paintIslandSprites(): SpriteSource[] {
  const sprites = [
    ...paintTileSprites(),
    ...paintCliffSprites(),
    ...paintInteriorSprites(),
    ...paintTransitionSprites(),
    ...paintObjectSprites(),
    ...paintDeadwoodSprites(),
    ...paintStructureSprites(),
    ...paintPropSprites(),
    ...paintVillagePropSprites(),
    ...paintPlazaSprites(),
    ...paintFurnitureSprites(),
    ...paintStudioFurnitureSprites(),
    ...paintCabinSprites(),
    ...paintHouseSprites(),
    ...paintStudioSprites(),
    ...paintPlayerSprites(),
    ...paintAnimalSprites(),
    ...paintRabbitSprites(),
    ...paintDuckSprites(),
    ...paintInsectSprites(),
    ...paintBirdSprites(),
    ...paintLakeLifeSprites(),
    ...paintPlaymateSprites(),
    ...paintPuppySprites(),
    ...paintCoopSprites(),
    ...paintRunPropSprites(),
    ...paintHotSpringSprites(),
    ...paintCampfireSprites(),
    ...paintMusicSprites(),
    ...paintWaterLightSprites(),
    ...paintCatSprites(),
    ...paintBubbleSprites(),
    ...paintChorePropSprites(),
    ...paintLaundrySprites(),
    ...paintWeatherSprites(),
    ...paintShadowSprites(),
    ...paintSmokeSprites(),
    ...paintUiSprites(),
  ];
  return [...sprites, ...paintWindowLights(sprites, LIT_SPRITE_KEYS)];
}

/** Builds the island's texture atlas. The caller owns it and must call `dispose()`. */
export function createIslandAtlas(): SpriteAtlas {
  return buildSpriteAtlas(paintIslandSprites());
}
