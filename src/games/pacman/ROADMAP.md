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
last of all (see Later). Part I is in progress: steps 1 (mazes), 2 (heroes) and 3
(mechanics and balance) are done; step 4 (sound and tools) has only the mute button, the
rest is postponed; step 5 (season art) is under way: 5.1 and 5.2 are in the game (5.2 waits
for the owner's review), then 5.3 (echo clones) and 5.5 (teleport art) closed with today's looks kept, and 5.4.

## Part I. The main game: four seasons (mechanics and graphics)

1. **Mazes** (Opus). Four season mazes, `config/mazes/grid_01.ts` … `grid_04.ts`, made by
   the owner (25×27 tiles, one token per tile, checked by `parseMaze` at import), replace
   the single `classic01` in the season rotation. Done (see Done, "Part I, 1").
   1. ~~**Maze cycle.**~~ Done.
   2. ~~**Boss levels are not part of the cycle.**~~ Done.
   3. ~~**Validator.**~~ Done.
   4. ~~**Each maze checked in a prototype page.**~~ Done (`mazes`).
   5. ~~Whether the empty border is still needed.~~ Decided: it stays. The canvas no longer
      cuts the walls (the bake reaches past the maze), but the border keeps every maze at
      25×27, so the scale, the decor and the lair centre stay the same from maze to maze.
   6. ~~**`classic01` stays** as the fallback.~~ Done: `GRID_CLASSIC` serves the secret level
      and the tests; the hell stays on `doom.ts`. `grid_doom` (not finished: a row short) and
      `grid_tron` wait for part II.

2. ~~**The heroes in code**~~ Done (see Done, "Part I, 2"). The owner's mock-ups,
   "Pac-Man · Shonen" and "Ms. Pac-Man · Maho-shoujo" (the Design canvas
   `3D55jqVpyq2Y5iTD5BWh3w`, anime direction), are `render/actors/hero/*`, in the game
   through `HeroView` and checked in the `hero` prototype. The hell keeps `PlayerView` for
   Pac-Man until part II, step 1.4 (berserk, BFG).

3. **Mechanics and balance** (Sonnet; Opus for the hypnosis design).
   1. ~~**Echo clone mechanic**~~ Done (see Done, "Part I, 3.1").
   2. ~~**Hypnosis for Ms. Pac-Man, two modes**~~ Done (see Done, "Part I, 3.2").
   3. ~~Regular levels have no teleport effect~~ Done (see Done, "Part I, 3.3"). Its final look
      is step 5.4.
   4. ~~**Balance check**~~ Done (see Done, "Part I, 3.4"): a balance bot, and a difficulty
      ramp by season level.

4. **Sound and tools** (Sonnet).
   1. **Mute** button and key, and a **volume** slider; both saved in `localStorage`.
      Done: the mute button (top-left, a gold 48 px button; on a narrow screen at the left edge, mid-height, `ui/MuteButton.svelte`; `audio/audioSettings`
      keeps the choice, `PacmanAudioPlayer` mutes the samples and `ArcadeSynth` its master
      gain). Left: the volume slider, and a key (`M` is taken: it switches the hero).
   2. _(Postponed by the owner.)_ **Dev panel rework** (`ui/debug/*`): readable at 1440p (text and controls scale with
      the screen), buttons grouped in collapsible sections by topic instead of one block,
      the most used actions first; a control for the maze cycle (force a maze, show the
      cycle).
   3. _(Postponed: the owner is still working out how to generate the music.)_ **Music track support**: a looped file (ogg/mp3 from `static/`) per world, under the
      same volume. The seasons' music is optional; the hell's track is part II, step 1.

5. **Season art, in code** (one subject per chat; prototype first).
   1. ~~**Energizers vs fruit**~~ Done (see Done, "Part I, 5.1"): a seasonal object per season,
      never edible.
   2. **Ghosts per season** (`render/actors/GhostView.ts`, one generic look today): spring,
      summer, autumn, winter, with normal, scared, flashing and eyes-only; focus on
      cuteness; the eyes show the heading; in the style of the heroes' mock-ups.
      Done in play, all four seasons: spring a tulip bud, summer a turtle (the water drop is
      still in `cuteGhost.ts`, unused), autumn a hedgehog, winter a bunny (owner's picks from chat
      mock-ups; no tentacles, no wavy skirt). One painter, `render/actors/cuteGhost.ts`
      (ink outline, belly shade, highlight, two bean feet that step with the tiles walked,
      a face and eyes that follow the heading, a look for every state, menacing brows and
      fangs in the chase wave and cute while scattering), and a body shape per season
      (`GHOST_SHAPES`); `GhostView.style` is set by `MeadowLevelRenderer` (`GHOST_STYLES`).
      Next: the owner's review of all four in play, then fixes (sizes, faces, contrast of the
      scared blue on winter's grey path).
   3. ~~**Echo clone look**~~ (`render/actors/EchoCloneView.ts`): mock-ups of three new looks
      (a trail of echoes, a bubble, a hologram) were made; the owner keeps today's look.
   4. **FX**: the stage-7 rings look dull (`render/fx/LevelFx.ts`).
   5. ~~**Teleport art, redone**~~ Closed: mock-ups of three looks (a funnel, a wreath of the
      season's things, a burrow) were made, and the owner finds today's teleport (the
      rolling ball and the pad) better made, so it stays.

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
- Part I, 2: the heroes in code (eighth chat), from the owner's mock-ups, checked in the `hero`
  prototype (a big hero on a dark panel, and strips of the real season worlds, magnified and
  1:1) and in the live game on all four seasons and the hell.
  - Pac-Man "Shonen": cel body (three tone bands, a pale zone and a hard highlight, a warm
    bounce light, the season's rim light on the nape), a thin ink line heavier in the shadow,
    no eye, a wide mouth with a dark rounded cavity and a tongue, three bite frames; the
    energizer splits the palette (cream, gold, orange-red), opens ink-outlined ki flames (at
    most 1.2 body radii) and puts a star on the highlight.
  - Ms. Pac-Man "Maho-shoujo": pink cel body; a big gradient-iris eye with an ink wing on the
    lid, a lash and a brow, blush strokes, red lipstick on the ends of the lips, a little
    fang; a scarlet polka-dot bow on a spring with a flower on the knot that carries the
    season (blossom, sun, maple leaf, snowflake); powered: the bow glows, rose-gold ki flames,
    a lifted brow, a star in the eye.
  - The season reaches the hero (`HeroState.season`, `HeroView.setSeason`,
    `heroSeasons.ts`); the hell has its own look for Ms. Pac-Man.
  - The trail went through four rejected designs (speed lines and ribbons drawn in the hero's
    frame turned like a rigid stick; then thin streaks, round puffs that read as gas, arcs and
    chevrons) and ended as a stream of the season's own particles (petals that flip as they
    flutter, tumbling leaves, sparkling snowflakes, sparks, Ms. Pac-Man's twinkles; fire sparks
    and fire drops when powered), each shed behind him with a kick back and left lying where it
    fell, so a turn bends the trail along the path he took. No dust: it read as gas.
  - Shared effects in `heroFx.ts`; `Hero.random` is mulberry32 (the old Park-Miller gave
    correlated consecutive draws). Found on the way: after a flash the mouth cut used a
    leftover faint `fillStyle` and cut the mouth only partly.
  - Cut: the CG style (`cgShading.ts`), the old soft painted disc, the brush texture, the
    ribbon trail (`RibbonTrail.ts`), the mouth and aura glows. `Hero.ts` is ~960 lines of
    shared machinery.
  - Tests: `hero/heroTrail.test.ts` (the season table, the trail is shed only while running,
    bends with a turn, is not dropped across a teleport, the season's kinds, fire when powered,
    dies down); 126 in all.
- Part I, 3.1: the echo clones (eighth chat). `EchoCloneService` rewritten for a riot:
  about a third of the season levels (`config/echoConfig.ts`) get one token at a random place,
  once a random 30-70 % of the dots are eaten (8 s to take it); taking it sets off 7-9 clones
  that leave the token's tile one after another, each in its own way, for 2-3 s. They run like
  rioters (at a junction a random way but not back, leaning to the dots still ahead; through
  the tunnels), eat dots for the usual points and the fruit they meet (`FruitService.eatAt`),
  leave the energizers, and die on an active or enraged ghost (frightened ghosts and eyes are
  harmless; an `echo-pop` fx). Both heroes. The view draws the token and every clone as a real
  blue mini hero (`EchoCloneView`: Pac-Man's or Ms. Pac-Man's own body, mouth and trail in an
  ice-blue palette; her bow, lipstick and blush blue too). HUD timer from the riot's length; dev
  panel: Echo (token) and Riot (now). Tests: `echoClone.test.ts` (14); 140 in all. Checked in the
  live game for both heroes (token, riot, the end).
- Part I, 3.2: the hypnosis in two modes (eighth chat). The hypnotised ghost plans once, for the
  time it has, by path length (`logic/actors/ghostRoutes`: a breadth-first search over tile and
  facing that moves as a ghost does, never straight back unless it is a dead end, through the
  tunnels, and a greedy feeding plan that counts the dots passed on the way). With at least 6
  dots (`config/hypnosisConfig.ts`) it can really eat in its 4 s it is a **feeder** (green
  pupils), else a **hunter** (red pupils); with no food and no prey it stays a feeder. The mode
  holds for the whole hypnosis, a hypnosis moved to another ghost plans again. `HypnosisService`
  guides the ghost (`HypnosisGuide`: next step, speed, whom a frightened ghost flees from);
  the feeder re-plans from each tile (so a dot eaten by Ms. Pac-Man or a clone changes the
  route, the mode does not), the hunter walks the shortest path to the nearest ghost out of the
  lair and eats it on touch: eyes, +200 each (no chain), the `ghost-eaten` fx and sound, also a
  ghost that is not frightened. A frightened ghost within 4 tiles of the hunter runs from it,
  not from her. The feeder goes at 0.8 of the ghost's speed as before, the hunter at 1.0 (found
  in the live trace: at 0.8 a fleeing ghost, 0.6 of the speed, is closed on at ~1 tile a second
  and a ghost 5 tiles away was never caught in 4 s). Measured: on 60 thinned boards the feeder
  eats 4 % more than the old straight-line rule (better in 9 cases, worse in 4); the real gain
  is the mode and a ghost that no longer butts against walls. Checked in the live game (feeder
  with 16 planned dots, hunter with the food gone ate a ghost). Tests: `ghostRoutes.test.ts`
  (10), `hypnosis.test.ts` (16); 166 in all. Not done: the crumbs I mentioned for the feeder's
  look (only the pupils tell the mode until step 5.2).
- Part I, 3.3: the tunnel effect on the season levels (eighth chat), at the owner's wish a
  rolling ball of the hero's own kind. Two tiles before a pad the hero curls into a ball
  (`Hero.setBall`, a flash and a spring pop hide the change), rolls (the pattern turns with the
  distance travelled) and opens back up 0.6 s after the tunnel. Pac-Man: a gold ball with three
  fire swirls, fire drops circling it, fire sparks behind. Ms. Pac-Man: a pink ball wound with
  her bow's scarlet polka-dot ribbons, twinkles and hearts circling and shed. `PlayerService`
  now sends a `teleport` fx (in and out); `LevelFx` gathers the season's particles into the pad
  with a flash and a ring, and on the exit rings out and bursts; `SharedLayers.padAhead` spots a
  pad one or two tiles ahead, `HeroView` keeps the ball until the tunnel is behind it. Heroes
  only (the ghosts go through unmarked, as the hell's fog is only his), never while dying.
  Fire sparks got bigger and a thinner outline (they read as dark dots). Checked frame by
  frame in the live game for both heroes (the game's own F8 step). Tests: ball and tunnel
  cases in `heroTrail.test.ts` and `playerTunnel.test.ts`; 172 in all.
- Part I, 3.4: the balance check and a difficulty ramp. `logic/balance/balanceBot.ts` plays a
  level headlessly on the real services (seeded, `Math.random` swapped during a run) and
  `BALANCE=1` / `BALANCE=levels` print a table of mazes / levels. Findings on the flat game:
  all four mazes and seasons were alike (about 2.2 deaths a level, 100 % cleared; `grid_04`
  a little slower, left as is by the owner's choice), but nothing got harder with the level.
  New `config/difficultyConfig.ts` (`levelTuning(seasonLevel)`, boss levels not counted) ramps
  over season levels 1-13: ghost speed up to +10 %, energizer -0.35 s a level (floor 2.5 s),
  scatter 7 -> 4 s, chase 20 -> 28 s, lair exits up to twice as early, hypnosis overdrive
  5 -> 3 s. Deviation from the plan (+30 % ghost speed): the ghosts are capped at the hero's
  own speed (`LevelSession` clamps by `PlayerService.baseSpeed`); at +30 % they outran the hero
  and the bot's deaths went from 2.6 to 12 by season level 8 and over 30 later. Measured (bot,
  16 runs, deaths a level, Pac-Man / Ms. Pac-Man): level 1 2.4 / 2.7, season level 10 (game
  level 12) 6.1 / 5.5, about 2.3x; clear rate 100 % (94 % at game level 17 for Ms. Pac-Man).
  Ghosts get no tunnel slowdown (the owner's choice). The secret level keeps its own rounds.
  Tests: `config/difficulty.test.ts`; 182 in all.
- Part I, 5.1: the energizers and pellets of the four seasons (ninth chat). The owner picked
  from mock-ups made in a chat artifact (three sets per season, after a first round of
  gems and orbs was rejected): spring a cherry blossom, summer a starfish, autumn a
  jack-o'-lantern, winter a snowman. Pellets: a yellow button, a white pebble, an amber
  bead, an ice drop. One ink-outlined cel style like the heroes, painted in
  `render/seasons/meadow/seasonFood.ts` and wired through each theme's `live.pellet` and
  `live.energizer`; the old tulip, clover, sun, drop, fly agaric, acorn, crystal and ice
  diamond textures are gone. Energizers sway, none spins, so the snowman stays upright;
  the autumn glow and night light are warm (the lit face), winter's pale blue. Checked in
  the `mazes` prototype on all four seasons; no new tests (art). Not done: the pumpkin's
  flicker and the butterfly-style animation of the mock-up (the world only sways a texture).
- Part I, small fixes after the owner's review (ninth chat): the ghosts of each season are
  larger (spring +15 %, summer +20 %, autumn +10 %, winter +5 %: `GHOST_SHAPES[*].scale`);
  the spring energizer (blossom) is 20 % smaller and the summer one (starfish) 25 % smaller;
  the hero no longer shows the halo for the respawn shield (`Hero`, `HeroView`; the hell's
  `PlayerView` still blinks) and no longer grows while powered (the steady +7 % is gone; the
  wind-up and the burst's pop stay); the stale notes in this file (Order, the maze names
  `classic06`, which every maze already had of its own) are corrected.
