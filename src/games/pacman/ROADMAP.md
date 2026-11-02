# Pac-Man — roadmap

What comes next. The game: `DESIGN.md`. The code: `ARCHITECTURE.md`. What was done and
why: the git history of `feat/pacman` (every stage ends in a commit that says what it did).

## Working agreement

One stage (or one step of a stage) per chat. A new chat starts with "read
`src/games/pacman/ROADMAP.md`, stage N" (or "stage N, step K"). Claude reads the parts
of `DESIGN.md` and `ARCHITECTURE.md` the step needs, analyses the code, proposes a plan,
waits for approval, works, updates the three documents (this plan; the design and the
architecture where they changed) and pushes to `feat/pacman`. New art and new effects
start as a prototype the owner approves first (see `ARCHITECTURE.md`, Prototypes), unless
the owner says to go straight into the game.

Token budget: code first, art last. Stages 1–4 need no new art (placeholders are fine);
art waits for stage 5, where it moves from hand-coded Canvas drawing to images the owner
makes outside the chat.

## Order

**1 → 2 → 3 → 4 → 5 → 6.** Stage 1 is next.

## Plan

1. **Refactor to solid game-dev code** (next; Opus). The architecture is sound (fixed-step
   loop, `Director` state machine, logic/render split, event bus); the cost is in large
   files that must be read whole for a small change. Not a rewrite: no behaviour changes.
   1. **Cut the large files** into modules of ~200–400 lines, one job each:
      `logic/doom/DoomBossService.ts` (~1400), `logic/rules/CombatService.ts`,
      `logic/actors/GhostService.ts`, `render/doom/DoomBake.ts`,
      `render/actors/hero/Hero.ts`, `render/actors/PlayerView.ts`,
      `render/seasons/meadow/MeadowBake.ts`. Check `config/gridConfig.ts` (~1450): maze
      data can move to its own data file so code reads never pull it in.
   2. **Pay the known debt**: `DecayPass` onto `render/common/GlPass`; states that use the
      nullable `LevelLoader` getters (`DeathState.enter`, `GameOverState`) onto
      `level.ensure()`; the ESLint config for `prototypes/pacman/hud/Proto.svelte`.
   3. **Core tests** where regressions hurt most: `Director` transitions, collisions
      (Pac-Man vs ghosts, fruit, dots), level change carrying score and lives.
   4. Update `ARCHITECTURE.md` (code map) to the new layout.

2. **Bugs and transitions** (Sonnet).
   1. Pac-Man blinks before the game starts.
   2. No screen fade on the very first start of a game (`Director.startGame`).
   3. Level change: the season turn keeps Pac-Man's sprite on screen until the next level
      starts (`RenderPipeline`, drawn while `lights` + `turn` run); hide him during the
      animation and spawn him once the new level is in place.

3. **Mechanics without new art** (Sonnet).
   1. **Echo clone mechanic** (`logic/bonuses/EchoCloneService.ts`): a rare bonus that
      spawns at a random place and sets off a riot of 7–9 Pac-Man clones for 2–3 s that
      eat everything they find (dots, fruit) and die on contact with ghosts. Today's
      `EchoCloneView` look stays until stage 6.
   2. **Hell lighting, phase 3**: in the ash storm the lights that follow Pac-Man flicker
      like a strobe and do not help visibility (`render/doom/DoomLightmap.ts`, the night
      pass in `DoomWorld`); make them calm and useful.
   3. Regular levels have no teleport effect (the hell has its teleport fog): add a simple
      one built from the existing FX (`render/fx/LevelFx.ts`); its final look is stage 6.

4. **New boss worlds, every 5th level** (Opus for the design of a world, Sonnet for the
   steps). Level 5 stays the hell; levels 10, 15, … get new worlds, each like the hell
   (`*Bake` + `*World` + a level renderer with `preview()`), its own boss and mechanics, a
   decay palette and a season-turn style (`RenderPipeline.turnStyle`). Mechanics first on
   placeholder art; the art joins stage 6.

5. **Sprite pipeline** (Sonnet). The owner is not an artist, so the art comes from image
   generators (Gemini, or locally ComfyUI/Forge through Pinokio) as plain single PNGs,
   not sprite sheets; Claude assembles them.
   1. `static/pacman/sprites/`: one folder per subject, one PNG per pose, transparent
      background, square, ~512 px. A naming rule (`ghost/summer/body.png`, `eyes.png`…).
   2. A build script that trims, scales and packs the PNGs into an atlas + JSON.
   3. A sprite loader and a `SpriteView` that draws an atlas frame at tile size; motion
      stays in code (mouth open/close, blink, squash, bob, the eyes looking at the
      heading), so one or two images per subject are enough.
   4. A prototype page `sprites`: drop PNGs into the folder and see them at tile size in
      every season, over day and night, next to the current procedural look. The owner
      iterates the images here without spending chat budget.

6. **Art pass** on top of stage 5 (one subject per chat; prototype first).
   1. **Pac-Man**: the hero (`render/actors/hero/PacmanHero`) plays on the season levels
      through `HeroView`; the hell still uses `PlayerView` (berserk, BFG); a ghost-eaten
      beat of his own. The owner did not like the current hero designs.
   2. **Ms. Pac-Man** (`MsPacmanHero` through `HeroView`): the same.
   3. **Ghosts per season** (`render/actors/GhostView.ts`, one generic look today): spring,
      summer, autumn, winter, with normal, scared, flashing and eyes-only; focus on
      cuteness; the eyes show the heading.
   4. **Echo clone look** (`render/actors/EchoCloneView.ts`).
   5. **FX**: the stage-7 rings look dull (`render/fx/LevelFx.ts`); the teleport effect;
      the teleporters' own art (`MeadowBake` portal + `MeadowWorld`), bulky today though
      the spiral works.
   6. **Hell**: the purple corrupted tiles (`DoomCombatView.drawCorruption`) read well but
      clash with the hell's look; restyle them in the hell's palette, as readable.
   7. **Death decay**: the background under the shards looks odd (a nebula plus square
      dots reads random); rework the abyss (`render/transitions/decay/decayShader.ts`).
   8. Art for the boss worlds of stage 4.

## Known issues

- Headless Chromium without a GPU runs the hell night at ~20 FPS; JS cost is ~2 ms per
  frame, the rest is software rasterisation. Check on real hardware.
- The rest of the known debt is stage 1.

## Done

- Plan v1 (first and second chats): folders and refactor; transitions and timers; the
  death decay; the season turn; the four seasons.
- Plan v2: 1 (partly: Ms. Pac-Man, the fruit, the boss reward ported), 2 dev and log
  panels, 5 HUD and screens (third chat); 3 the hell rework, 6 the arcade, 7 the FX pass
  (fourth chat).
- v2 10.1 the fruit (fifth chat): the textures lost their backdrop glow, the blooms hug the
  object, `collectibleSprite` measures the object and the glow's reach at bake time, so
  every fruit, the heart and the exit fill 0.78 of a tile and stay inside it (the heart's
  orbit is drawn closer around it). The HUD fruit icon is one tile. The bell and the key are
  redrawn (the mock-ups read as a flame and a lollipop at tile size): a classic gold bell,
  a steel-cyan key on the diagonal, both with a dark outline. Then the strawberry (read as
  a heart) and the pear (read as a lemon), and at the owner's request every other item
  (cherry, orange, pretzel, apple, melon, Galaxian, the heart with a plus, the exit): one
  outlined style, painted with `render/common/itemPaint`.
- v2 10.2 the Easter egg (sixth chat): `GoldenEgg*` renamed `EasterEgg*`; the solved lair
  code banishes the ghosts (`GhostService.banish`, a vanish animation in `GhostView`), the
  lair gate (now live in `MeadowWorld`, no longer baked) slides open, and a painted Easter
  egg waits in the lair's centre for Pac-Man. Tests: `logic/bonuses/easterEgg.test.ts`;
  prototype: `easter-egg`.
- Summer and lair readability (owner's review after 10.2): a darker summer sand, muted
  lair floors in every season, food drawn over the mood (`MeadowWorld.drawFood`), a faint
  heat haze and a lighter summer night, a little sun instead of the watermelon energizer.
  The `collectibles` prototype gained a weather toggle.
- v2 10.3/10.4 heroes in the game: `PacmanHero` and `MsPacmanHero` through `HeroView`; the
  owner rejected the designs, so the heroes move to stage 6 on sprites.
- Plan v3 (seventh chat): the plan renumbered from 1, code before art; `CLAUDE.md` and
  read-deny rules for the other games (`.claude/settings.json`).
