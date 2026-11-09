# Pac-Man — roadmap

What comes next. The game: `DESIGN.md`. The code: `ARCHITECTURE.md`. What was done and
why: the git history of `feat/pacman` (every stage ends in a commit that says what it did).

## Working agreement

One step per chat. A new chat starts with "read `src/games/pacman/ROADMAP.md`, part I,
step 2" (or "part II, step 1.3"). Claude reads the parts of `DESIGN.md` and
`ARCHITECTURE.md` the step needs, analyses the code, proposes a plan, waits for approval,
works, updates the three documents (this plan; the design and the architecture where they
changed) and pushes to `feat/pacman`. New art and new effects start as a prototype the
owner approves first, in the chat, as screenshots (the built pages are not committed; see
`ARCHITECTURE.md`, Prototypes), unless the owner says to go straight into the game.

**All graphics are drawn in code** (Canvas2D / WebGL2). No PNG sprites, no sprite sheets,
no image pipeline. An owner's mock-up is a picture of the target look that Claude
reproduces in code; it is never loaded as an asset. Motion, particles and seasonal details
are code too.

Token budget: code first, art after the mechanics of its part. The model named per step is
a suggestion.

## Order

The plan has three parts, done in this order: **I** the main game (four seasons),
**II** the boss levels, **III** the interface. The depth and post-processing pass comes
last of all (see Later). Part I is next: step 1 is done but for its border question, step 2 (the heroes) follows.

## Part I. The main game: four seasons (mechanics and graphics)

1. **Mazes** (Opus). Four season mazes, `config/mazes/grid_01.ts` … `grid_04.ts`, made by
   the owner (25×27 tiles, one token per tile, checked by `parseMaze` at import), replace
   the single `classic01` in the season rotation. Done except the border question (see
   Done, "Part I, 1").
   1. ~~**Maze cycle.**~~ Done.
   2. ~~**Boss levels are not part of the cycle.**~~ Done.
   3. ~~**Validator.**~~ Done.
   4. ~~**Each maze checked in a prototype page.**~~ Done (`mazes`).
   5. Whether the empty border is still needed (the canvas may no longer cut lines). Open:
      the owner decides on the `mazes` prototype.
   6. ~~**`classic01` stays** as the fallback.~~ Done: `GRID_CLASSIC` serves the secret level
      and the tests; the hell stays on `doom.ts`. `grid_doom` (not finished: a row short) and
      `grid_tron` wait for part II.

2. **The heroes in code** (Opus for the look, Sonnet for the wiring). The owner's
   mock-ups, "Pac-Man · Shonen" and "Ms. Pac-Man · Maho-shoujo" (the Design canvas
   `3D55jqVpyq2Y5iTD5BWh3w`, anime direction, final), become `render/actors/hero/*`. First a
   prototype (`hero`), the owner approves it, then it goes into the game through
   `HeroView`. What the mock-ups fix:
   - **Pac-Man (Shonen).** Cel-shading: three body tones plus a highlight zone, warm
     bounce light in the lower shadow, a rim light in the season's colour on the back.
     Thick ink outline, thicker in the shadow (offset fill plus stroke). A face without an
     eye: a mouth with depth and a tongue, character without a gaze. The mouth is
     animated in code (three bite frames).
   - **Ms. Pac-Man (Maho-shoujo).** Pink, same cel-shading. A big scarlet bow: two polka-
     dot loops, folds, a gloss, a knot with a shadow, two tails that sway in code, a
     season badge on the knot. A face with a large eye (gradient iris, ink "wing" of the
     lid, lashes, brow), blush, lipstick, a little fang.
   - **Energizer state (code).** The palette cracks open, ki-flame tongues of up to 1.2 R
     stream behind (the length trembles with time), a spark at the highlight. Ms. Pac-Man:
     the bow glows, the flames are rose-gold, the brow shifts, the highlight becomes a
     star.
   - **Trail.** Speed lines in the season's colour, dust puffs, seasonal particles (petals,
     sparks, leaves, snow crystals). Ms. Pac-Man: two ribbons (the season's and a pink one)
     with an outline, and manga star-twinkles.
   - Everything stays inside the tile (`DESIGN.md`, art direction): the flames and ribbons
     are drawn to the tile edge, no halo on the walls. The heroes stay round and breathe on
     their spring.
   - Then cut `Hero.ts` (~940 lines) and what survives of `PlayerView.ts` (~730) once the
     new heroes replace them. The hell keeps `PlayerView` until part II, step 1 (berserk,
     BFG).
   - `DESIGN.md` §12 (Pac-Man "fire", Ms. Pac-Man "starlight") is rewritten to the
     mock-ups when this step lands.

3. **Mechanics and balance** (Sonnet; Opus for the hypnosis design).
   1. **Echo clone mechanic** (`logic/bonuses/EchoCloneService.ts`): a rare bonus that
      spawns at a random place and sets off a riot of 7–9 Pac-Man clones for 2–3 s that
      eat everything they find (dots, fruit) and die on contact with ghosts. Today's
      `EchoCloneView` look stays until step 5.
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
        ghosts react; how the mode reads on screen (eye colour now, art in step 5).
      - Tests: the feeder's route beats the straight-line pick on a maze with food behind
        a wall; the hunter is chosen when the food is gone or out of reach; the mode
        does not flip mid-hypnosis.
   3. Regular levels have no teleport effect (the hell has its teleport fog): add a simple
      one built from the existing FX (`render/fx/LevelFx.ts`); its final look is step 5.
   4. **Balance check**, after the mazes: compare speeds, timers and scores with the
      arcade originals and with play on levels 1–15 on all four mazes (dot counts run from
      227 to 268, `grid_04` has no tunnel); change configs only where something is off. If
      all is fine, this step closes with no change.

4. **Sound and tools** (Sonnet).
   1. **Mute** button and key (`M`), and a **volume** slider; both saved in
      `localStorage`, applied on the synth's master gain (`audio/ArcadeSynth`).
   2. **Dev panel rework** (`ui/debug/*`): readable at 1440p (text and controls scale with
      the screen), buttons grouped in collapsible sections by topic instead of one block,
      the most used actions first; a control for the maze cycle (force a maze, show the
      cycle).
   3. **Music track support**: a looped file (ogg/mp3 from `static/`) per world, under the
      same volume. The seasons' music is optional; the hell's track is part II, step 1.

5. **Season art, in code** (one subject per chat; prototype first).
   1. **Energizers vs fruit**: in spring and autumn the energizers look edible and are
      mixed up with fruit. Energizers must read as non-food objects (an orb, a crystal, a
      charm) in every season; fruit stays food.
   2. **Ghosts per season** (`render/actors/GhostView.ts`, one generic look today): spring,
      summer, autumn, winter, with normal, scared, flashing and eyes-only; focus on
      cuteness; the eyes show the heading; in the style of the heroes' mock-ups.
   3. **Echo clone look** (`render/actors/EchoCloneView.ts`).
   4. **FX**: the stage-7 rings look dull (`render/fx/LevelFx.ts`); the teleport effect;
      the teleporters' own art (`MeadowBake` portal + `MeadowWorld`), bulky today though
      the spiral works.

6. **One death transition for every world** (Opus; design page first, then a prototype the
   owner approves). Today's decay works on the level's picture, but it only knows "from":
   the abyss (a nebula plus square dots) reads random, and losing the hell's fight is a
   plain fade, so there is no seam from a boss level back to a season. The level clear
   (`SeasonTurn`) stays as it is.
   1. **The contract.** One transition pass takes the old frame and the next frame (both
      offscreen textures), an origin, a progress and a style: `(from, to, origin, progress,
style)`. Any pair works the same way: a death on a season level (`to` is the same
      level, from the respawn), losing the hell's fight (`to` is the next level), boss →
      season, season → boss. A world only supplies a `style` (palette, particle colour); it
      never writes its own death. The pass reuses the death field (`decayField`) and fronts
      (`decayTimeline`).
   2. **The look (owner's pick, idea 1: drain and rebirth).** The colour drains out of the
      world in a wave from the death point (a grey, withering look that needs no leaves or
      snow, so it fits the hell and the neon grid); the world collapses into a point on the
      hero; a ring then spreads from the respawn point and uncovers the next frame. Open
      points for the design page: the climax in the middle (what the collapse looks like),
      the hero's own death burst in the heroes' ki-flame style (drawn with the heroes, step 2),
      timings in `FLOW.death`, and the style fields.
   3. The hell's lost fight (the abyss) uses the same pass instead of the fade, and the
      boss levels of part II take it by adding their `style`.
   4. Tests: the fronts and the field for any `from` / `to` pair; the no-WebGL fallback
      still covers the screen; the `decay.test.ts` cases carry over.

## Part II. Boss levels

1. **The hell: finish and polish first** (Opus). One boss level, done properly before any
   other exists.
   1. **Lighting, phase 3**: in the ash storm the lights that follow Pac-Man flicker like
      a strobe and do not help visibility (`render/doom/DoomLightmap.ts`, the night pass in
      `DoomWorld`); make them calm and useful.
   2. **Corrupted tiles**: the purple tiles (`DoomCombatView.drawCorruption`) read well
      but clash with the hell's look; restyle them in the hell's palette, as readable.
   3. **The hell's maze**: finish `grid_doom` (a row short today), move the hell onto it
      and retire the `classic01` fallback for the hell. The arena code (`DoomArena`,
      `DoomTargeting`) sizes itself by the maze; check it on 27 rows.
   4. **The heroes in the hell**: the hell's player view (berserk, BFG) in the new heroes'
      look, for both heroes (Ms. Pac-Man's own berserk and BFG-charge art); retire
      `PlayerView`.
   5. **The hell's music track** (the owner brings it: generated or a free licence).
   6. **Balance and a polish pass** of the whole fight; the boss reward (heart or exit).
2. **A random boss on every 5th level, for both heroes.** Level 5 stays the hell while it
   is the only boss. The selection arrives with the second boss: a `BossCatalog` (id,
   world, maze, renderer, design page), a seeded pick per boss level (no immediate repeat),
   the same for Pac-Man and Ms. Pac-Man. A boss world is no longer tied to a level number
   (the old "10 = neon, 15 = sharks"), so the boss's difficulty is scaled by the level
   number, not by the world. The dev panel can force a boss.
3. **Each new boss world** (Opus for the design, Sonnet for the steps): still Pac-Man in
   a maze, with a different boss, a different mechanic and a different way to play, never
   a reskin of the hell's fight. Like the hell: `*Bake` + `*World` + a level renderer with
   `preview()`, a death `style` for the universal transition (part I, step 6) and a season-turn style (`RenderPipeline.turnStyle`). Each
   starts with a one-page design (boss, mechanic, rules, how it differs from the others)
   that the owner approves before code; mechanics on placeholder art first, then the art,
   all in code. Its interface is part III.
   1. **A neon grid world** in the spirit of TRON (light trails, a grid arena); the maze
      is `grid_tron` (no tunnels).
   2. **A shark-and-lava world** in the spirit of _Sharkboy and Lavagirl_ (a playful,
      over-the-top tone).

## Part III. The interface

Replace the HUD and the screens (`ui/hud/*`, `ui/screens/*`, the boss box) with a real
in-game look, built from mock-ups the owner brings (made in a generator or found as a
reference), not designed in the chat: Claude implements a given picture well and designs
one poorly. The whole interface is code-drawn (CSS / SVG / Canvas), no raster assets.

1. **One skeleton.** The same layout and slots in every world: score and high score,
   level and world, lives, fruit row, power timer or weapon, dot progress, pause. Built
   once, on the `HudSnapshot` that exists.
2. **A skin per season.** The skeleton stays; the palette and small details follow the
   season (a few small things, not a new layout).
3. **A skin per boss level.** Each boss world has its own interface (the hell's boss box:
   name, phase, HP with phase marks, the player's HP, weapon, berserk, BFG charge, the
   reward hint), on the same skeleton. Added as each boss lands; the hell's comes first.
4. **The screens**: menu, pause and READY in the same family.
5. **A full game-over screen**: the final score, the best score, level reached, fruit
   collected, restart and menu.
6. The arcade (secret level) keeps its own pixel HUD.

## Later

**Depth and post-processing** (the very end). More volume with modern 2D techniques, as
far as WebGL2 over Canvas2D allows (no tessellation shaders in WebGL2):

1. Soft drop shadows for actors and walls; walls with height (a baked height map and a
   bevel).
2. Normal maps for walls and bodies drawn in code, so the world lights (energizers, the
   hell's lights, the neon grid) shade them.
3. A post-processing stack on `render/common/GlPass`: bloom, colour grading per world, a
   light vignette, optional chromatic aberration on hits.
4. A performance budget: everything switchable, measured on real hardware.

## Known issues

- Headless Chromium without a GPU runs the hell night at ~20 FPS; JS cost is ~2 ms per
  frame, the rest is software rasterisation. Check on real hardware.
- `Hero.ts` and `PlayerView.ts` are still large (see part I, step 2 and part II, step 1.4).
- `grid_01` … `grid_doom` all carry the name `classic06` inside `parseMaze` (part I, 1.3).

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
  owner rejected the designs, so the heroes were redone from the owner's mock-ups (part I,
  step 2).
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
  and the level after work as Pac-Man's. Her own berserk / BFG-charge art: part II, step 1.4.
- v3 2.2 (seventh chat): the fruit follows the arcade orders per hero
  (`fruitForLevel(level, profile)`; her
  random fruit from level 8 is fixed per level so the HUD row and the board agree). Test:
  `logic/bonuses/fruitOrder.test.ts`.
- v3 2.3–2.5 (seventh chat): after a respawn (or before the first move) the hero faces
  the start direction, not the last heading (`HeroView`, `PlayerView`: no facing → start
  angle). The lair gate slides open for a ghost leaving the lair or coming home as eyes
  and shuts after it (`MeadowLevelRenderer.updateGhostGate`; the Easter egg's door still
  wins). The hell boss lost its heading chevron (the imps keep theirs).
- v3 2.6–2.8 (seventh chat): the respawn shield's blink shows only in play
  (`PlayerDrawOptions.shield`; the shield waits through READY, so the hero blinked while
  standing still). In the season turn Pac-Man fades out at the end of the lights and the
  next level spawns him at its start (`RenderPipeline`). Found on the way: the hero's size
  `Spring` blew up on a long frame (explicit Euler, dt up to 0.1 s), which drew a giant
  Pac-Man for a frame after the turn, after a death or on any hitch; it now integrates in
  1/120 s sub-steps (`render/actors/hero/spring.test.ts`).
- v3 2.7 (seventh chat, the owner's meaning: _remove_ the fade): the session's first game
  starts at once, since the menu already shows level 1's world (`Director.startGame`,
  `playedOnce`); later games still fade in.
- Banana (seventh chat, the owner's request): `render/items/fruit/BananaView` in the
  outlined item style (a fat diagonal crescent, brown stem and tip), 2000 points, Ms.
  Pac-Man's level-7 fruit; shown in the `collectibles` prototype.
- Plan v4 (eighth chat): the plan split into part I (the main game: mazes, heroes,
  mechanics, sound, season art, one death transition), part II (boss levels: the hell first, then a random boss
  per 5th level, then new worlds) and part III (the interface). The owner's `grid_01` …
  `grid_04` (plus `grid_doom`, `grid_tron`) are in `config/mazes/`; boss levels do not count
  in the maze cycle. All graphics are code-drawn: the PNG sprite pipeline (old stage 7) and
  the ASCII maze converter (old 5.1) are dropped.
- Part I, 1: the mazes (eighth chat). `grid_01` … `grid_04` are the season mazes
  (`SEASON_MAZES`), the old `classic01` is `GRID_CLASSIC` (the secret level, the tests);
  every maze has its own name inside `parseMaze`.
  - `config/mazes/validateMaze` (empty border, one Pac-Man / fruit / ghost pad each, a lair
    with an exit, tunnels in pairs or none, every dot, energizer and the fruit pad reachable
    through the tunnels with the lair shut) and `mazes.test.ts`: all four pass, so do
    `classic01`, `grid_tron` and the unfinished `grid_doom`.
  - `logic/level/MazeCycle`: the first cycle plays 1, 2, 3, 4 (the menu shows level 1, so
    the game starts on the maze it shows); every later cycle is a shuffle seeded by the run
    (`LevelLoader.mazeSeed`, new in `startNewGame`, `setMazeSeed` for tests), and never opens
    on the maze the cycle before closed on. A pure function of `(seed, cycle)`, so a dev jump
    to any level lands on the maze a normal run would reach.
  - Boss levels do not count: `seasonLevelOf(level) = level − floor(level / 5)`, so the
    seasons run 1–4, 6–9, 11–14 (level 6 is summer again). `SeasonData.maze` names the maze;
    the dev panel's season buttons use `firstLevelOfSeason`.
  - `worldDecor` takes the maze's tunnel row (`tunnelRowOf`; none for `grid_04`) instead of
    the fixed row 12, and the decor cache key includes it. The hell's decor is unchanged
    (its tunnel row is still 12).
  - Tests: 113 in all (`mazeCycle.test.ts`, `mazes.test.ts`, three new cases in
    `levelRouting.test.ts`). Checked in a browser: the `mazes` prototype (4 mazes × 4
    seasons, with marks for tunnels, spawn, fruit, lair) and the real game on levels 1–11 (the
    maze, the season and the dot count follow the plan, no console errors).
