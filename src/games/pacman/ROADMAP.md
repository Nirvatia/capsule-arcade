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

Token budget: code first, art last. Stages 1–6 need no new art (placeholders are fine);
art waits for stage 7, where it moves from hand-coded Canvas drawing to images the owner
makes outside the chat. The model named per stage is a suggestion.

## Order

**1 → 2 → … → 10.** Stage 2 is next.

## Plan

1. ~~**Refactor to solid game-dev code**~~. Done (see Done).

2. **Bugs** (Sonnet).
   1. ~~**Boss levels for Ms. Pac-Man too**~~. Done (see Done).
   2. ~~**Fruit order**~~. Done (see Done).
   3. ~~**Respawn heading**~~. Done (see Done).
   4. ~~**Lair door for the ghosts**~~. Done (see Done).
   5. ~~**No chevron on the hell boss**~~. Done (see Done).
   6. Pac-Man blinks before the game starts.
   7. No screen fade on the very first start of a game (`Director.startGame`).
   8. Level change: the season turn keeps Pac-Man's sprite on screen until the next level
      starts (`RenderPipeline`, drawn while `lights` + `turn` run); hide him during the
      animation and spawn him once the new level is in place.

3. **Sound and tools** (Sonnet).
   1. **Mute** button and key (`M`), and a **volume** slider; both saved in
      `localStorage`, applied on the synth's master gain (`audio/ArcadeSynth`).
   2. **Music track support**: a looped file (ogg/mp3 from `static/`) per world, under the
      same volume; first the hell's own doom-like track, which the owner brings (generated
      or a free licence).
   3. **Dev panel rework** (`ui/debug/*`): readable at 1440p (text and controls scale with
      the screen), buttons grouped in collapsible sections by topic instead of one block,
      the most used actions first.

4. **Mechanics and balance** (Sonnet; Opus for the hypnosis design).
   1. **Echo clone mechanic** (`logic/bonuses/EchoCloneService.ts`): a rare bonus that
      spawns at a random place and sets off a riot of 7–9 Pac-Man clones for 2–3 s that
      eat everything they find (dots, fruit) and die on contact with ghosts. Today's
      `EchoCloneView` look stays until stage 8.
   2. **Hypnosis for Ms. Pac-Man, two modes** (owner's design;
      `logic/rules/HypnosisService.ts`, `logic/actors/ghostTargets.ts`). Today the
      hypnotised ghost heads for the dot nearest _in a straight line_
      (`nearestDotTarget`), through walls, so it is useful only half the time.
      - When a ghost is hypnotised, plan once for the time it has (hypnosis left, its
        speed): walk the maze by path length (BFS over ghost-walkable tiles) and count how
        many dots it can really eat in that time, greedily from cluster to cluster (no
        doubling back over eaten corridors).
      - Enough food (at least a threshold of dots, a config value): **feeder** mode, it
        follows that route and eats.
      - Too little or too far: **hunter** mode, it chases the nearest other ghost by path
        and eats it on contact (eyes home, points like Pac-Man's ghost chain).
      - The mode is fixed for the whole hypnosis; a new hypnosis (moved to another ghost)
        plans again. It may end with nothing eaten, as a wasted Pac-Man energizer can.
      - Open points for the plan: the threshold and the chain points; whether hunted
        ghosts react; how the mode reads on screen (eye colour now, art in stage 8).
      - Tests: the feeder's route beats the straight-line pick on a maze with food behind
        a wall; the hunter is chosen when the food is gone or out of reach; the mode
        does not flip mid-hypnosis.
   3. **Hell lighting, phase 3**: in the ash storm the lights that follow Pac-Man flicker
      like a strobe and do not help visibility (`render/doom/DoomLightmap.ts`, the night
      pass in `DoomWorld`); make them calm and useful.
   4. Regular levels have no teleport effect (the hell has its teleport fog): add a simple
      one built from the existing FX (`render/fx/LevelFx.ts`); its final look is stage 8.
   5. **Balance check**: compare speeds, timers and scores with the arcade originals and
      with play on levels 1–15; change configs only where something is off. If all is
      fine, this step closes with no change.

5. **The remaining mazes** (Opus). Today one maze (`GRID_01`, hand-made by the owner: an
   empty border so the canvas does not cut the walls, islands without inner void, two-
   letter tokens). Models are bad at typing maze matrices, so no maze is typed by hand:
   1. A converter script from a compact ASCII drawing of a maze (one char per tile) to the
      game's token rows, applying the owner's rules (border, filled islands).
   2. A validator (used by the script and a test): all dots reachable, tunnels paired,
      the lair, the spawn pads and the fruit pad present, symmetry where expected.
   3. The mazes one by one, each checked in a prototype page before it joins
      `SeasonCatalog`'s rotation; then decide which maze goes with which levels.
   4. Whether the empty border is still needed (the canvas may no longer cut lines).

6. **New boss worlds, every 5th level** (Opus for the design of a world, Sonnet for the
   steps). Level 5 stays the hell; each later world is still Pac-Man in a maze, with a
   different boss, a different mechanic and a different way to play, never a reskin of
   the hell's fight. Each world like the hell (`*Bake` + `*World` + a level renderer with
   `preview()`), with a decay palette and a season-turn style
   (`RenderPipeline.turnStyle`). Mechanics first on placeholder art; the art joins stage 8.
   1. **Level 10: a neon grid world** in the spirit of TRON (light trails, a grid arena).
   2. **Level 15: a shark-and-lava world** in the spirit of _Sharkboy and Lavagirl_ (a
      playful, over-the-top tone).
   3. Each world starts with a one-page design (boss, mechanic, rules, how it differs from
      the hell) that the owner approves before code.

7. **Sprite pipeline** (Sonnet). The owner is not an artist, so the art comes from image
   generators (Gemini, or locally ComfyUI/Fooocus through Pinokio) as plain single PNGs,
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

8. **Art pass** on top of stage 7 (one subject per chat; prototype first).
   1. **Energizers vs fruit**: in spring and autumn the energizers look edible and are
      mixed up with fruit. Energizers must read as non-food objects (an orb, a crystal, a
      charm) in every season; fruit stays food.
   2. **Pac-Man**: the hero (`render/actors/hero/PacmanHero`) plays on the season levels
      through `HeroView`; the hell still uses `PlayerView` (berserk, BFG); a ghost-eaten
      beat of his own. The owner did not like the current hero designs. `Hero.ts` (~940
      lines) and `PlayerView.ts` (~730) were left uncut in stage 1 on purpose: the sprite
      heroes replace them; cut what survives.
   3. **Ms. Pac-Man** (`MsPacmanHero` through `HeroView`): the same.
   4. **Ghosts per season** (`render/actors/GhostView.ts`, one generic look today): spring,
      summer, autumn, winter, with normal, scared, flashing and eyes-only; focus on
      cuteness; the eyes show the heading.
   5. **Echo clone look** (`render/actors/EchoCloneView.ts`).
   6. **FX**: the stage-7 rings look dull (`render/fx/LevelFx.ts`); the teleport effect;
      the teleporters' own art (`MeadowBake` portal + `MeadowWorld`), bulky today though
      the spiral works.
   7. **Hell**: the purple corrupted tiles (`DoomCombatView.drawCorruption`) read well but
      clash with the hell's look; restyle them in the hell's palette, as readable.
   8. **Death decay**: the background under the shards looks odd (a nebula plus square
      dots reads random); rework the abyss (`render/transitions/decay/decayShader.ts`).
   9. Art for the boss worlds of stage 6.

9. **UI and screens**. The HUD and the screens look bad. Built from a mock-up image the
   owner brings (made in a generator or found as a reference), not designed in the chat:
   Claude implements a given picture well and designs one poorly.
   1. The HUD (`ui/hud/*`) and the menu, pause and READY screens (`ui/screens/*`).
   2. A full **game-over screen**: the final score, the best score, level reached, fruit
      collected, restart and menu.

10. **Depth and post-processing** (the very end). More volume with modern 2D techniques,
    as far as WebGL2 over Canvas2D allows (no tessellation shaders in WebGL2):
    1. Soft drop shadows for actors and walls; walls with height (a baked height map and
       a bevel).
    2. Normal maps for sprites and walls, so the world lights (energizers, the hell's
       lights, the neon grid) shade them.
    3. A post-processing stack on `render/common/GlPass`: bloom, colour grading per world,
       a light vignette, optional chromatic aberration on hits.
    4. A performance budget: everything switchable, measured on real hardware.

## Known issues

- Headless Chromium without a GPU runs the hell night at ~20 FPS; JS cost is ~2 ms per
  frame, the rest is software rasterisation. Check on real hardware.
- `Hero.ts` and `PlayerView.ts` are still large (see 8.2).

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
  owner rejected the designs, so the heroes move to stage 8 on sprites.
- Plan v3 (seventh chat): the plan renumbered from 1, code before art; the owner's bug and
  feature list folded in; `CLAUDE.md` and read-deny rules for the other games
  (`.claude/settings.json`).
- v3 1, the refactor (seventh chat). No behaviour changed; every step checked by the
  tests, a browser run (start, death decay, the hell's attacks) and, for the bakes, a
  pixel hash of every world's background before and after.
  - The mazes moved out of `config/gridConfig.ts` (1448 → 36 lines) into
    `config/mazes/`, one string per row, checked by `parseMaze` at import.
  - `DoomBossService` (1475 lines) split into the boss's state machine plus `DoomArena`,
    `DoomMinionSwarm`, `DoomAttackPlanner` and `DoomTargeting`; its tests stopped casting
    into private fields.
  - `CombatService` → `ghostContact` (pure contact rules + near misses);
    `GhostService` → `ghostTargets` (pure targets).
  - `MeadowBake` and `DoomBake` shared copied code → `render/common/worldDecor`; each
    bake is a frame plus one function per layer, decor and walls in files of their own.
  - Debt paid: `DecayPass` on `GlPass`; `DeathState` / `GameOverState` on
    `level.ensure()`; ESLint lints the prototypes' Svelte files.
  - Structure kept: a world is a `logic/<world>` + `render/<world>` pair
    (`ARCHITECTURE.md`, Rules of thumb); moving folders would have cost more than it
    gives.
  - New tests: `ghostContact.test.ts`, `levelRouting.test.ts` (74 tests in all).
- v3 2.1 (seventh chat): every 5th level is the hell for both heroes
  (`LevelLoader.worldOf`; the dev Hell button no longer switches to Pac-Man). Ms. Pac-Man
  plays it as her own hero (`HeroView`), berserk as her powered look; her death, the abyss
  and the level after work as Pac-Man's. Her own berserk / BFG-charge art: stage 8.
- v3 2.2 (seventh chat): the fruit follows the arcade orders per hero
  (`fruitForLevel(level, profile)`; Ms. Pac-Man's melon stands in for the banana; her
  random fruit from level 8 is fixed per level so the HUD row and the board agree). Test:
  `logic/bonuses/fruitOrder.test.ts`.
- v3 2.3–2.5 (seventh chat): after a respawn (or before the first move) the hero faces
  the start direction, not the last heading (`HeroView`, `PlayerView`: no facing → start
  angle). The lair gate slides open for a ghost leaving the lair or coming home as eyes
  and shuts after it (`MeadowLevelRenderer.updateGhostGate`; the Easter egg's door still
  wins). The hell boss lost its heading chevron (the imps keep theirs).
