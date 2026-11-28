# CLAUDE.md

**At session start, read `docs/PROGRESS.md`** (status + exact next step), then report where the
project stands and wait for the user's go. The full spec is `PROJECT_BRIEF.md`.

## Project

A games website (React + TypeScript + Three.js via React Three Fiber). The site opens straight
into **Island** at `/`: a fixed 96×96 2D top-down world (pixel art, 16×16 tiles, orthographic
camera) loaded from a baked map file. The site has one page: every other address redirects to
`/`, and there is no site menu (user decision).
User decisions that override `PROJECT_BRIEF.md` are listed in `docs/PROGRESS.md`.

## Working agreement

- All planned milestones (M0–M4) are delivered. New work is agreed with the user first (ideas
  in `docs/ROADMAP.md`): show a short plan and wait for OK before coding.
- Finishing a milestone: `npm run check` passes → docs updated → one conventional commit on
  `master` (docs in the same commit) → short report → stop and wait. Don't push unless asked.
- Ask when a requirement is unclear or a trade-off is real; give a recommendation.
- Package manager: **npm**. New dependencies only if clearly worth it, each recorded in
  `docs/DECISIONS.md`.

## Commands

`npm run dev` · `npm run check` (typecheck + lint + test + build) · `npm run typecheck` ·
`npm run lint` · `npm test` · `npm run build` · `npm run format` · `npm run bake:island`

Deploy: pushing `master` runs `.github/workflows/deploy.yml` (check, then GitHub Pages under
`/<repo>/`). Keep asset paths relative (or use `import.meta.env.BASE_URL`), never root `/...`.

## Architecture rules (enforced by ESLint `no-restricted-imports`, see `eslint.config.js`)

- Layers: **app/pages → ui / render → core**. ui and render don't import each other.
- `src/games/*/core/**` and `src/shared/engine/**`: pure TS. No React, Three.js, R3F,
  react-router; no imports from render/assets/ui/app/pages or the zustand `state` file.
- `src/shared/**` never imports from `src/games/**`.
- app/pages import a game only via its public API (`@/games/<name>`), plus `@/games/catalog`.
- Game state lives in plain mutable objects updated by a fixed-timestep loop; zustand
  (`state.ts`) holds UI-facing state only. React must not re-render per frame.
- Tiles/objects are data-driven registries. Rendering asks the sprite atlas for sprites by key.
- Dispose Three.js geometries/materials/textures on unmount and on regenerate.
- `tests/layer-rules.test.ts` proves the layer rules fire; update it when rules change.

## Generation & world conventions

- **The live world is `src/games/island/data/island.map.json`**, never generated at runtime.
  `npm run bake:island` re-bakes the default seed (`generation.authoringSeed`, 3068120830; overwrites
  hand edits); `npm run overview:island -- <out.png>` draws a contact sheet to compare seeds.
  Visitors can also play generated islands: R or the dice button opens `/?seed=N` (shareable),
  Home goes back to `/`. Every seed must pass validation (village included).
  `bakedIsland.test.ts` must stay green.
- World grids are flat typed arrays, row-major (`y * width + x`), **y grows downwards**;
  render code flips y for Three.js.
- New generation steps that only add decorations go at the end (before `chooseSpawn`) with their
  own step rng, so existing islands keep their layout (see `hangLaundry`).
- Generation steps are pure `(context) => context` (copy arrays you change) and take
  randomness only from `createStepRng(context, '<stepName>')`. Never `Math.random()` in core.
- New invariants go into `generation/validate.ts` plus a test; generation must stay
  deterministic per seed (tests check this across 50 seeds).
- `three` is pinned to `^0.182.0` (see `docs/DECISIONS.md` D9) — don't bump it casually.

## Game loop conventions

- Simulation state lives in `GameState` (`core/game/gameState.ts`), created once per world and
  mutated by fixed 1/60 s steps (`advanceGame` from `render/GameLoop`). Systems in
  `core/systems/` are pure functions taking `stepSeconds`; never read wall-clock time in core.
- Input: key codes → actions in `core/systems/controls.ts`; DOM listeners only in
  `render/useKeyboardInput.ts`. Taps/clicks: `render/TapToWalk` → `tapAt` → `core/systems/tapToWalk.ts`. Mouse clicks walk only with
  `pointer.clickToWalk`; touch always does.
  Phones (`device.ts`, `isTouchFirst`) get their own camera framing; walking is a quick tap
  (walk there) or a held finger that the player follows (`render/TapToWalk` steers with
  `core/systems/steer.ts`, pressing virtual `TOUCH_KEYS`, so input stays one path); a small
  interact button (`ui/TouchControls`; taps continue messages) and a settings gear (`ui/HudMenu`). Render reads interpolated positions and draws at whole pixels.

## Content

- The portfolio lives in `src/games/island/core/content/portfolio.ts` (facts from Charles's CV
  only; neutral product-style sentences: no "I" and no "Charles"; Title Case subtitles;
  contact = Email copy button + WhatsApp; no LinkedIn). Screenshots and the CV PDF are in
  `public/portfolio/` (WebP, other people's details blurred). `guidance.ts`: villager
  conversations and sign labels.

## UI conventions

- UI overlays live in `games/island/ui/` and read the shared `GameState` (sampled on a timer,
  never per frame) or the zustand store (`state.ts`, UI flags only). Top right: the clock plaque (`ui/GameClock`, `debug.showClock`); F3 (dev server only) adds the FPS
  under it (`debug.fpsOnly` off: also tile and camera); `debug.alwaysShowFps` shows it always.
- Short game text uses `var(--game-font)` (M PLUS Rounded 1c, `app/global.css`); paragraphs keep
  the system font; the pixel font is for the loading line only.
- Dev-only features check `import.meta.env.DEV` (the "Dev preview · seed" badge,
  `window.__islandRenderer`).

## Audio conventions

- Music is code, not files: `src/shared/audio` (Web Audio, no React) plays a `Song` (plain
  data, e.g. `assets/chillTune.ts`). Sound starts only after a user gesture; keep it muteable.
- Nature sounds are code too (`shared/audio/ambiencePlayer.ts`); the mix comes from
  `core/systems/soundscape.ts`. One mute button (M) covers music and nature.

## Rendering conventions

- 1 world unit = 1 source pixel (tile = 16). World y = −(map y px). Use `worldSpace.ts`.
- Sprites come only from the atlas by key (`atlas.frame(key)`); paint new art in
  `games/island/assets/` and keep `islandSprites.test.ts` green.
- Standing things use `standingSpriteZ(footYPx)` for depth; flat decorations use
  `GROUND_DECAL_Z`. Hard alpha only (`discard`) — no transparency sorting. One exception:
  soft cast shadows (`shadow_*` sprites, `createShadowMaterial`, `SHADOW_Z`) blend, with a
  strict depth test so overlapping shadows never darken twice. Cloud shadows reuse that; morning
  mist (`mist_*`, `createMistMaterial`) blends too, faded as a whole by `uOpacity`; so do soft
  glows (`glow_*`, e.g. the campfire's, drawn with the mist material untinted (`DAYLIGHT`)). Trees, bushes
  and grass use `createSwayMaterial` (the top edge leans with the wind; the base stays rooted).
- Keep the camera pixel-perfect (`shared/render/PixelPerfectCamera`): whole-number pixel
  scales, snapped positions. The canvas is `flat` + `linear` (exact palette colours).
- Dispose what you create by hand (textures, geometries, materials) in effect cleanups.

## Verifying in the browser

Run `npm run dev`, then `node scripts/browser-check.mjs <url> <out.png> [settleMs] [keys]`:
headless Chrome, real-time wait for the canvas, optional key presses (e.g. `ArrowDown:900,Minus`),
screenshot, FPS sample and full console log. `CHROME_ANGLE=d3d11` renders on the GPU (real
FPS). Definition of done requires no console warnings or errors (Vite debug and React
DevTools info lines are fine).

## Conventions

- TypeScript strict + `noUncheckedIndexedAccess`; no `any`. Named exports only (no default
  exports in `src/`). Explicit return types on exported functions (`JSX.Element` for components).
- Files small (~200 lines), one responsibility. Intent-revealing names. Comments explain _why_.
- No magic numbers: game tunables go in `src/games/<game>/core/config.ts`. `CONFIG.md` (root) lists the
  settings in plain words: keep it in step when adding or renaming one.
- Import alias `@/` → `src/`. Tests: `*.test.ts` next to the code (Vitest, node environment).
- Prettier: single quotes, semicolons, trailing commas, width 100, LF line endings.
