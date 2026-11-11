# Pac-Man — roadmap

What comes next. The game: `DESIGN.md`. The code: `ARCHITECTURE.md`. What was done and
why: the git history of `feat/pacman` (every stage ends in a commit that says what it did).

## Working agreement

One step per chat. A new chat starts with "read `src/games/pacman/ROADMAP.md`, part I,
step 2" (or "part II, step 1, hero"). Claude reads the parts of `DESIGN.md` and
`ARCHITECTURE.md` the step needs, analyses the code, proposes a plan, waits for approval,
works, updates the three documents (this plan; the design and the architecture where they
changed) and pushes to `feat/pacman`. New art and new effects start as a prototype the
owner approves first, in the chat, as screenshots (the built pages are not committed; see
`ARCHITECTURE.md`, Prototypes), unless the owner says to go straight into the game.

How the looks are decided (what worked in the eighth chat): a mock-up first, and only for what
defines a world (the world, the heroes, the boss, the walls). A candidate comparison is a throwaway
page built from the game's own sources on the real maze (`node prototypes/pacman/build.mjs <name>`,
then published as an artifact: strip the document wrapper from the built page; delete the page
when the owner has chosen), not a hand-drawn picture. Effects inside an accepted language are
restyled in one pass and shown as frame series from the `hell` prototype, not mock-up by mock-up.
Every bug fix gets a test that is checked to fail on the old behaviour. Checks before a push:
`npm run check`, `npm test`, `npx eslint src/games/pacman`, `npx prettier --check` on the changed
files (the repository-wide `npm run lint` is red for files of other games; leave them).

**All graphics are drawn in code** (Canvas2D / WebGL2). No PNG sprites, no sprite sheets,
no image pipeline. An owner's mock-up is a picture of the target look that Claude
reproduces in code; it is never loaded as an asset. Motion, particles and seasonal details
are code too.

Token budget: code first, art after the mechanics of its part. The model named per step is
a suggestion.

## Order

The plan has three parts, done in this order: **I** the main game (four seasons), **II** the boss
levels, **III** the interface. The depth and post-processing pass comes last of all (see Later).
Part I is done except the postponed items of step 4 (sound and tools: only the mute button is in).
Part II is in step 1, the hell: its
world, maze, heroes, boss, weapons, attacks and light are in the game; the owner's second round of
polish is the next work (see "Next chat" in part II). Part III (the interface) follows it.

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
   through `HeroView` and checked in the `hero` prototype. In the hell they are the same heroes
   with the BFG charge's light (part II, step 1.1).

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
   2. ~~**Dev panel rework**~~ Done (see Done, "Part I, 4.2"); the maze-cycle control was left out at
      the owner's word (nothing beyond the layout).
   3. _(Postponed: the owner is still working out how to generate the music.)_ **Music track support**: a looped file (ogg/mp3 from `static/`) per world, under the
      same volume. The seasons' music is optional; the hell's track is part II, step 1.8.

5. **Season art, in code** (one subject per chat; prototype first).
   1. ~~**Energizers vs fruit**~~ Done (see Done, "Part I, 5.1"): a seasonal object per season,
      never edible.
   2. ~~**Ghosts per season**~~ (`render/actors/GhostView.ts`, one generic look before): spring,
      summer, autumn, winter, with normal, scared, flashing and eyes-only; focus on
      cuteness; the eyes show the heading; in the style of the heroes' mock-ups.
      Done in play, all four seasons: spring a tulip bud, summer a turtle (the water drop is
      still in `cuteGhost.ts`, unused), autumn a hedgehog, winter a bunny (owner's picks from chat
      mock-ups; no tentacles, no wavy skirt). One painter, `render/actors/cuteGhost.ts`
      (ink outline, belly shade, highlight, two bean feet that step with the tiles walked,
      a face and eyes that follow the heading, a look for every state, menacing brows and
      fangs in the chase wave and cute while scattering), and a body shape per season
      (`GHOST_SHAPES`); `GhostView.style` is set by `MeadowLevelRenderer` (`GHOST_STYLES`).
      The owner approved all four ghosts as they are.
   3. ~~**Echo clone look**~~ (`render/actors/EchoCloneView.ts`): mock-ups of three new looks
      (a trail of echoes, a bubble, a hologram) were made; the owner keeps today's look.
   4. ~~**FX**~~ Done (see Done, "Part I, 5.4"): the rings are shockwaves. The owner's pick
      from three chat mock-ups; two non-wave types (a star salute, a vortex) were shown and
      not taken.
   5. ~~**Teleport art, redone**~~ Done (see Done, "Part I, 5.5"): the pad is the owner's pick
      "ripple"; the hero's rolling ball and the gather-and-flash effect stay.

6. **One death transition for every world** (Opus; design page first, then a prototype the
   owner approves). The old decay only knew "from": its abyss (a nebula plus square dots)
   read random, and losing the hell's fight is a plain fade, so there is no seam from a boss
   level back to a season. The look (6.2) is replaced; the seams (6.3) are left. The level
   clear (`SeasonTurn`) stays as it is.
   1. **The contract.** One transition pass takes the old frame and the next frame (both
      offscreen textures), an origin, a progress and a style: `(from, to, origin, progress,
style)`. Any pair works the same way: a death on a season level (`to` is the same
      level, from the respawn), losing the hell's fight (`to` is the next level), boss →
      season, season → boss. A world only supplies a `style` (palette, particle colour); it
      never writes its own death. The pass reuses the death field (`decayField`) and fronts
      (`decayTimeline`).
   2. ~~**The look**~~ Done (see Done, "Part I, 6.2"): drain and rebirth, the collapse is a
      black hole (the owner's pick from a chat mock-up). In every world's death.
   3. ~~**The next frame.**~~ Done (see Done, "Part I, 6.3"): the pass takes the next level as a
      second texture; losing the hell's fight now unfolds the next world. Boss levels of part II
      take it by adding their `style`.
   4. ~~Tests~~ for the fronts, the clock and the geometry are in `decay.test.ts`; the flow of a
      lost boss fight is in `director.test.ts`.

## Part II. Boss levels

1. **The hell: the art pass, then the polish** (Opus for the design of a look, Sonnet for
   the steps). One boss level, done properly before any other exists. Today the hell is the
   meadow recoloured (a meadow's pond and road, grey stone, cute round actors): nothing in
   it belongs together. The owner chose the look from three chat mock-ups (a forged, a
   flesh and a cult hell): **the flesh hell** (its walls became the cord, see Done).
   - **The accepted scene** (background and maze, no actors): the artifact
     `https://claude.ai/artifact/PxgBdvaWVsb7mXwsMLEgMq`, its source kept in
     `prototypes/pacman/art/hell-flesh-scene.html` (a standalone page: open it as a file). It
     is the frozen base: every later mock-up is a layer on it, in one chat artifact, and the
     owner approves it there before any port. The maze in it was the old hell's (25×26); the
     game's is now `grid_doom` (25×27).
   - **Rules of the look** (the owner's, from the rounds): the world is one flesh with no void
     and nothing hanging in the air (the corridor floor is the same flesh as the outside, a
     little darker); the walls are dark flesh islands edged by a glowing cord (the owner's pick,
     replacing the muscle ridges), **no height, no face, no extrusion**,
     so the corridors keep their full width; no bright bone or anything that jumps forward;
     details are few and bold and sit on a surface (no drips hanging off the walls); a slow
     heartbeat (about 2.5 s) and a calm background, not many fast animations; the teleport is
     a vertical rift of torn flesh around a seam of light (a round opening was rejected: it
     reads as an orifice).
   - **Known fix for the port:** the lair's veins and the walls' fibres are drawn tile by tile
     in the mock-up, so the lines break at the tile edges. In the game's bake draw the lair as
     one region in common coordinates and the wall fibres from one flow field, clipped to the
     mask (the ground outside already does).
   - **The steps**, each a mock-up on the frozen scene (buttons per state, a slow mode, "was /
     now" where it helps), approved by the owner, then ported:
     1. ~~**Both heroes in the hell, redesigned**~~ Done (see Done, "Part II, 1.1"): the
        owner's pick is the heavy armor of the "doom fighter" mock-up
        (`prototypes/pacman/art/hell-flesh-heroes.html`, artifact `1H2WF8d37coG2ZFw5z292X`);
        `PlayerView` is gone.
     2. ~~**Blinky, lord of hell**~~, in three phases (shape, colour, eyes, the change of look),
        and the imps. Done (see Done, "Part II, 1.2").
     3. ~~**Weapons and pickups**~~: BFG, barrel, berserk, medkit; the heart and the exit. Done
        (see Done, "Part II, 1.3").
     4. ~~**The attacks**~~ Done (see Done, "Part II, 1.4, family 1" and "1.4 and 1.5"): the dash
        and the rift from a mock-up, the others restyled in one pass into the hell's palette.
     5. ~~**Weather and light**~~ First version done (see Done, "1.5" entries): the night and the storm
        have a `MoodStyle` (`cord` is the game's default, `torch` and `pulse` are candidates in the
        `mood` prototype); the player's light follows him smoothly.
     6. ~~**The hell's maze**~~ Done: the owner's `config/mazes/grid_doom.ts` (25×27) is the hell's
        maze; `config/mazes/doom.ts` derives it (dots and energizers become floor, the lair's centre
        token becomes `DB`).
     7. ~~**The port**~~ Done: the flesh world (`fleshBake`, `fleshLive`), the cord walls, the heroes
        (the season heroes plus the BFG charge's light; the doom-fighter armor was dropped), Blinky
        and the imps, the weapons and pickups, the attacks. The world's death seam (part I, 6.3)
        is closed.
     8. **The hell's music track** (the owner brings it: generated or a free licence).
     9. **Balance and a polish pass** of the whole fight; the boss reward (heart or exit).

   **Next chat: the hell's second round of polish** (the owner's list, in this order). Start from
   the `hell` prototype (`node prototypes/pacman/build.mjs hell`: "Бой" runs the real fight, the
   attack buttons force an attack, "Бессмертие" keeps the hero alive, "Фаза 1-3" jump to a phase;
   query `?ms` Ms. Pac-Man, `?zerk` the berserk, `?chg` a BFG charge) and the `mood` prototype.
   1. **A full redesign of the teleports, so that they are not lost.** Today they are the scene's
      tall rifts of torn flesh (`fleshBake` rifts, `fleshLive` their light) and on the cord maze
      they sink into the red: a hero running for one cannot find it. The new look must stand out
      from the maze and the background at tile size (a hue the hell does not otherwise use, the
      pale light of the exit is taken by the exit, so pick a different one; or a clear frame and
      a motion), keep the "no round opening" rule of the scene, and show where it leads (the other
      pad). The teleport fog (`DoomWorld.teleportFog`) and the hero's rolling ball at the pad
      go with it. A comparison page first.
   2. **Readability of the boss's attacks.** Many attacks merge with the background and the maze,
      all in the same red tones: the rift's seam and burst, the cross, the eruption, the seals, the
      void cells, the corrupted tiles, the pull's cords. The rule to meet: danger reads at a glance
      against the cord maze and the dark floor, and a telegraph (it will hurt) differs from a live
      hazard (it hurts now). Ideas to try: a pale or white-hot core with a dark outline, a hue
      shift for live hazards, hatching or a moving edge for telegraphs, a floor tint under the whole
      threatened area. Test in grayscale too. A comparison page with every attack at once.
   3. ~~**Lower the heartbeat's maximum brightness.**~~ Done (see Done, "second round, 3"). The pulse (`fleshLive.heartbeat`: the wounds in
      the walls, the lair's heart, the rifts' light, the cysts, `drawCord` at night) peaks too hot.
      Lower the peak, keep the 2.5 s rhythm; it is mostly a few constants.
   4. **Blinky and the imps get lost** (the owner does not yet know what to do): they are red on a
      red world. Options to try in a comparison page: a pale rim light or a thin pale outer outline,
      a faint halo in the boss's own colour, a colour shift away from red (blackened iron with hot
      features), brighter eyes, a small shadow disc on the floor. The imps keep the arcade colours.
   5. ~~**Open decisions**~~ Decided by the owner: the night stays `cord` (`torch` and `pulse`
      remain only as candidates in the `mood` prototype); the storm's redesign is still open (ask
      before touching it); the heroes stay as they are; the armor code is deleted (see Done).
      Then part III (the interface), from a mock-up image the owner brings.

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
- The flesh hell's first frame blocks for about a second while `bakeFlesh` paints the world
  (measured in headless Chromium without a GPU; one long task, once per level); its frames
  cost more than the old hell's (33 against 45 fps in the same headless run). Check on real
  hardware; the bake can be spread over frames if it shows.
- The hell's first-frame bake and the 33 fps figure above are from a GPU-less headless browser;
  nobody has timed them on real hardware yet.
- The `collectibles` prototype throws "undefined is not iterable" in a `forEach` while it draws the item row (also on the commit before part II, 1.3) and so never reaches the exit; find it when the prototype is next touched.
- `Hero.ts` is still large (~1100 lines); the sprite-free heroes are one class family, cut what no longer serves.

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
  and the level after work as Pac-Man's. Her own berserk / BFG-charge art: part II, step 1 (heroes).
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
- Part I, 5.5: the tunnel pad as ripples (ninth chat). Two rounds of chat mock-ups (the first
  too heavy next to the old portal, the second in its light style); the owner picked
  "ripple". `render/seasons/meadow/ripplePad.ts`: a soft translucent lens whose dark heart
  and glow follow the season (`portal.glow`, `portal.deep`), four rings that widen and
  fade, a white rim with two glints and a bright heart; it replaces the swirl sprites and the
  pulsing ring in `MeadowWorld` (the theme's `portal.ring` and the two textures are gone).
  The hero sinks into a pad: he fades and shrinks as he nears its centre and comes out of it
  the same way (`padSink`, `Hero.setSink`, `HeroView`); the rolling ball and the gather-and-flash
  effect are unchanged. The hell's pads are unchanged. Checked in the `mazes` prototype on all
  four seasons; `padSink.test.ts`. Not checked in play: the hero going through a tunnel.
- Part I, 5.4: the gameplay effects as shockwaves. `render/fx/LevelFx.ts` (397
  lines) is split: `fxPresets.recipeFor` turns an `fx:event` into a pure recipe (rings,
  flashes, bursts, popups, shake, pulse), `fxDraw` draws, `fxTypes` holds the types, and
  `LevelFx` plays the recipes and ages them; the split changed no output (the old and the new
  class made the same draw calls for every event). Then the look: the owner chose "clean
  wave" from three chat mock-ups (a clean wave, rays, heavy arcs). Every ring is a shockwave
  (`fxDraw.drawWave`): a fast quartic ease-out front, a soft pressure disc behind it, a
  trailing fainter ring on a main wave, a dark rim for the bright seasons; a second ring of
  a hit is `weak` (fainter, thinner, no trailer); lives are 15 % longer (`WAVE_STRETCH`) and
  the flash is bigger. It covers the energizer (which may leave its tile), the ghost, fruit,
  egg, 1UP, the tunnel and the clone pop. Sparks, particles, pop-ups, shake and the edge
  pulse are unchanged. Tests: `render/fx/LevelFx.test.ts`; prototype: `fx` (the real worlds,
  every event, click to fire anywhere). Not done: the ghost colours are still set in
  `fxPresets.GHOST_TINT` and in `cuteGhost.ts` with slightly different values.
- Part I, 6.2: the death as a black hole (the owner's pick from a chat mock-up, in an
  artifact with a real WebGL shader). `render/transitions/decay/decayShader.ts` is new; the
  ice shards, the abyss and the dust are gone. 4 s in all (it was 5): the colour drains along
  the corridors from the death point (the geodesic death field, 0–1.2 s), the world is squeezed
  into a disc, twisted harder toward its middle and pulled into a point (from 1.0 s; the disc's
  rim burns in the world's colour, arms of light wind round it, a faint colour fringe), the
  singularity flashes and a shock wave goes out over a dark void with a few stars (`void`),
  then the same fold runs backwards round the respawn point and the level unfolds, grey, its
  colour returning along the corridors from the respawn point (the geodesic respawn field).
  The hero's own 1.75 s death plays on top, inside `shatter` (1.9 s). `FLOW.death`:
  `shatter` 1.9, `void` 0.45, `rebuild` 1.65. `decayTimeline` is the clock (a pure
  function, `decayFronts`) and `farCorner` the disc's reach; the style is the world's
  `DecayPalette` (`rim` the drain front and the hole's rim, `warm` the colour front, `wisp`
  the arms, `ice` the stars, `deep` / `mid` the void). Tests: `decay.test.ts`; prototype
  `death` (the real `LevelDecay` on the real season worlds). Not checked in play: the hero's
  death over the hole, the hell's and Ms. Pac-Man's deaths, a low-end GPU.
- The hell's look (part II, step 1): three chat mock-ups of the scene (a forged, a flesh and a
  cult hell) and several rounds on the flesh one; the owner accepted the flesh hell with muscle
  walls. The scene's source is `prototypes/pacman/art/hell-flesh-scene.html`; the rules of
  the look and the steps that follow are in part II, step 1. Nothing is in the game yet.
- Part II, 1.1, both heroes in the hell (eighth chat): the owner chose the heavy armor of the
  "doom fighter" mock-up. `render/actors/hero/heroArmor.ts` paints a helmet and a chin guard on
  the existing ball (clipped to the body outline, so the mouth stays cut and the hero stays
  round); an open strip of gold or pink stays under the helmet so the hero still reads. Pac-Man
  reads by a cyan visor slit, Ms. Pac-Man keeps her eye in a goggle. The berserk is the awoken
  look (`power`: black plates with burning cracks, fangs, the ki flames for him, the glowing bow
  for her); the BFG charge swells the body, opens the mouth wider, lights three seam lights on
  the nape, the visor and the throat green; the release is `Hero.kick()`. `Hero` takes the paint
  through `setOver(painter)` and `setCharge(k)`; `HeroView` passes `armor` from
  `PlayerDrawOptions` (now `actors/playerDrawOptions.ts`), `SharedLayers` draws both heroes
  through `HeroView` everywhere and `PlayerView` (748 lines) is deleted. The rolling ball at the
  rifts stays the heroes' own (no armor). The `hero` prototype got "Броня ада" and "Заряд BFG"
  buttons, the `hell` and `easter-egg` prototypes draw through `HeroView`. Checked: `npm run
check`, `npm test` (210), ESLint and Prettier on the changed files, the `hero` prototype in
  six states (screenshots), the `hell` fight and `easter-egg` pages without errors. Not
  checked: play on the real game page, the hero's death in the hell with armor, the heroes on
  the flesh hell (it is not ported yet: step 1.7), no unit test for the painting (the test
  environment has no canvas). The old meadow-recoloured hell still shows them.
- Part II, 1.2, Blinky and the imps (eighth chat): the owner approved the mock-up
  (`prototypes/pacman/art/hell-flesh-boss.html`, artifact `NxfN9XuEHjLp8DnAfUsjoj`), friendly
  tone kept. The boss keeps the game's ghost silhouette and states but is cel-shaded like the
  heroes (hard bands, a thick ink line, a rim light), with bone horns, ink brows and a
  deterministic shiver. Phase 1 is a red overseer with a stitched belly; phase 2 is charred,
  cracked by lava (thicker cracks than in the mock-up, so it parts from phase 1 at tile size),
  with longer glowing horns and the belly split open on his ribs; phase 3 burns white-hot with
  a second pair of horns and a skirt of flames; the echo is violet. A red body sinks into the red
  flesh, so every skin keeps the ink line, yellow eyes and the light rim. The imps keep the
  arcade colours in the same style, with an ink-outlined heading chevron. Code:
  `render/doom/hellGhost.ts` (shared: `celBands`, `celOutline`, `drawHorns`, `drawEyes`,
  `drawHeading`, `lightGlow`), `HellBlinkyView`, `HellImpView`; the snapshot and the call
  signatures are unchanged, the logic is untouched. Checked: `npm run check`, `npm test` (210),
  ESLint and Prettier on the changed files, the `hell` prototype gallery in all three phases (no
  console errors). Not checked: the fight in play (wind-up, dash, cast, phase change on the
  real page), the boss over the flesh hell (not ported yet: step 1.7). `glow` in `hellGhost.ts`
  is now unused by the boss and the imps.
- Part II, 1.3, weapons and pickups (eighth chat): the owner approved the mock-up
  (`prototypes/pacman/art/hell-flesh-items.html`, artifact `X4hxvo5hUdxShVxo9cyr3t`).
  `render/doom/doomItems.ts` paints the BFG, barrel, berserk gauntlet and medkit icons (a box of
  -50..50), baked by `DoomSprites` at the old size, so `DoomCombatView` and the pickup callers are
  untouched; the mock-up's animated bits (lens, fuse, cracks) stay the pickup's glow. `ExitView`
  is repainted as the bone arch with rays (its bloom weakened to 0.2 / 0.1 so the frame and the
  rays survive at tile size). The heart is unchanged: the mock-up's heart was the game's own.
  `DoomFxView`: the orb is pale green-white with a green halo (was yellow-orange), the berserk's
  claws and sparks are orange (were red); the rings, blasts and decals are as they were. Checked:
  `npm run check`, `npm test` (210), ESLint and Prettier on the changed files, the `hell`
  prototype (the gallery and the pickups on the map), the new exit on a throwaway page at three
  sizes. Not checked: the pickups, the barrel and the effects in a running fight; the dimmed and
  respawning states; the orb and claws in motion; everything over the flesh hell (step 1.7).
- Part II, 1.7a, the flesh hell's world (eighth chat; the owner pointed out that the actors were
  in the game but the maze was not): the accepted scene is ported. `render/doom/fleshNoise.ts`
  (seeded noise, canvas masks, fibres, veins), `fleshBake.ts` (the ground with fibres, pores,
  veins, ribs and pools of blood on a 3000 x 1700 frame so any screen stays inside flesh; the
  maze layer with corridors, blood, rifts, muscle walls with a ragged flesh band, skulls and the
  lair gate; cysts) and `fleshLive.ts` (the heartbeat, about 2.5 s, driving the glow of the
  wounds, the lair's heart, the rifts' light and the cysts; blood running along the veins; the
  pools' ripples). The scene is painted in its own units (32 to a tile) and `DoomWorld` draws it
  scaled by 24/32, baked once, the first time the world is drawn. The old stone, meadow, pond,
  cabins, lamps, pentagrams and the lava stream are gone (`doomBakeDecor`, `doomBakeWalls` and
  the old `DoomBake` painting deleted; `DoomBake.ts` keeps the two constants). The scene's
  seam note is half done: the lair's veins run over its whole floor, so no line breaks at a
  tile's edge; the walls' fibres still run along each wall tile as in the scene (a single flow
  field made diagonal streaks unlike the scene, so that part of the note stays open). The corridors and the walls' foot are painted from the bare flesh,
  before the veins, ribs and pools, as in the scene. The mist, ash storm, night and the
  corridor light map are unchanged (step 1.5). Checked: `npm run check`, `npm test` (210),
  ESLint and Prettier on the changed files, the `hell` prototype fight view (screenshots, close
  up), bake time and frame rate (see Known issues). Not checked: the death transition from the
  hell and the season turn into it, the night and the ash storm over the new world, a narrow or
  ultra-wide screen, a GPU.
- The hell's wall material (eighth chat): the muscle walls were dropped (the owner: a Pac-Man maze
  is not meant to be drawn from living matter; worse on `grid_doom`'s big islands; shell, skin,
  tendons and bone had failed before). The blood hell, the world, stays: the owner loves it. The
  maze is no longer a material but an outline: **the cord**. Islands of dark flesh with a quiet
  texture, each edged by a dark cord with a thin hot line that pulses with the heart (the classic
  mazes' outline, in the hell's own matter); the corridor floor stays near the walls in tone, a
  shadow lies at the foot of every wall, the tone wanders over a big island and the ground outside
  the maze is dimmed so the maze parts from the background. Chosen from three candidates (the cut:
  flesh islands with a wet lip, too close in tone to the floor; the cord; blackened gunmetal in the
  flesh, a cold separate world) compared on the real maze in a throwaway `walls` prototype
  (deleted). In `fleshBake` the wall is the constant `WALL`; the muscle painter, the flesh band
  at the walls' foot and the style parameter are gone. Checked: `npm run check`, `npm test` (210),
  ESLint and Prettier, the `hell` prototype fight view. Not checked: Blinky (red) on the red cord
  in a real fight, the night and the ash storm over the cord, a GPU.
- Part II, 1.4, family 1, the dash and the rift (eighth chat): the owner approved the mock-up
  (`prototypes/pacman/art/hell-flesh-attacks.html`, artifact `1Q8vziT7GyqAkkrTcT72nB`); the
  dash's floor lane stayed out (it would add information the game does not give today).
  The rift (`render/doom/doomRift.ts`, wired into `DoomCombatView`): the marking is a jagged
  seam whose red lips pull apart from the middle as the blast nears, the burst is a dark gap with
  a white-hot core along the whole corridor, and a scar smoulders and fades for 2.2 s after it
  (`RiftScars` follows the hazards). The dash (`render/doom/doomDashFx.ts`, wired into
  `HellBlinkyView`): the crouch (he rocks back and squashes, embers fly off his heels), the burst
  with four outlined afterimages (the body drawn again, fainter, `ghost`), speed lines, a dust ring
  at both ends and a skid mark on the floor that fades over 1.6 s, then the recovery: eyes half
  shut, a glow under him and steam, the sign that he takes ×1.25 damage. The logic and the numbers
  are untouched. Checked: `npm run check`, `npm test` (210), ESLint and Prettier, the `hell`
  prototype with both attacks forced (frame series, a close-up of each): the marking, the scar, the
  crouch, the skid, the speed lines and the steam show and the console is clean. Not checked: the
  burst's own 0.35 s frame in the game, phases 2 and 3 (the same code, other skins), the effects
  with the night or the ash storm over them, the split attack (it shares the dash's wedge look and
  so its crouch and afterimages).
- Part II, 1.1 revisited, the hell's heroes without armor (eighth chat): the owner judged the
  doom-fighter armor wrong for the heroes and sent them to a redesign. The armor had been made to
  read on the light red flesh; with the cord maze and the dark corridors the owner's own heroes
  read, so for now the hell's heroes are the season heroes (the awoken look is the berserk: his
  ki flames, her glowing bow) plus one thing the hell adds, the BFG charge: the body swells, a
  green ring closes in on it, a glow lights the mouth, white-hot at the end
  (`heroArmor.chargePainter`). Seen in the `hell` prototype (query `?ms`, `?zerk`, `?chg` pick
  Ms. Pac-Man, the berserk and a charge). `paintArmor` stays in `heroArmor.ts` and in the `hero`
  prototype's "Броня ада" button only until the redesign is decided. Not checked: the death in
  the hell, a real BFG fight, the night.
- Part II, 1.4 (the other attacks) and 1.5 (weather and light), one pass (eighth chat; the owner
  agreed to stop making a mock-up per family once the look was set): the old violet and the flat
  red fills are gone from the attacks, the hell's palette is the maze's cord (ink, red, orange,
  white-hot). Pull: the chains are dark-bodied cords with a hot line and ember beads. Cross: its
  four arms are marked and burst like the rift (`doomRift` takes any straight run of tiles). The
  eruption's marking and burst are orange (were violet), the corrupted tiles are ink with hot
  cracks, the locked seals and the boss's hit sparks are in the same palette. Weather and light:
  the night is weaker and softer in colour (a neutral dark maroon, not one red multiplier), the
  ash storm's tint is lighter, and the light of a burst dies down with it instead of cutting out.
  The echo keeps its cold violet on purpose, to tell it from the boss. Checked: `npm run check`,
  `npm test` (210), ESLint and Prettier, the `hell` prototype with attacks forced in phases 2 and
  3 (frame series): the cross's arms, the eruption's rings, the void cells and the rift's burst
  show in the new palette, the night keeps the maze and the cord readable, the console is clean.
  Not checked: the pull's chains and the corrupted tiles in play (not on screen in the frames),
  the seal's own burst, the split attack, a long night fight for strobing, a GPU.
- Bugs from the owner's play (eighth chat), all fixed with tests in `doomMechanics.test.ts`
  ("the boss and the board"; each was checked to fail on the old behaviour):
  1. The boss could get stuck on a tunnel's pad: a dash along the tunnel row ended on the pad (a
     dead end), and with the reverse locked the chase found no direction. Now the boss never steps
     onto a pad (`chooseChaseDirection`), a dash stops before it, and a dead end with the reverse
     locked lets him turn back.
  2. In phase 3 he vanished and reappeared in the lair: the blink's target (and the split's
     segment ends, the rift's run and the echo's path) were picked among all walkable tiles, and the
     lair is walkable for him. New `isCorridorTile` / `isLairSpace` (`DoomGraph`): attacks, blinks,
     dashes, rifts and the echo use corridor tiles only (not the lair, not a pad), and out of the lair
     he does not go back in.
  3. The slow tiles (and the void cells) stayed after he fell: only `clearEffects` ran on defeat. Now
     the first update after the defeat clears the void, the minions and the corruption
     (`DoomArena.clearCorruption`).
     The night and the ash storm are to be redesigned for the new maze (the owner's request): the
     softening of step 1.5 was a stopgap, not the redesign.
- The player's light in the night jumped from tile to tile (the owner: it lights the space "at a
  low frame rate", not following the player). Cause: `DoomLightmap` measured the light's reach in
  whole steps along the corridor from the source's tile, so the light changed in a step whenever the
  player entered a new tile. Now `pathDistances` measures from the source's exact position (the
  distance along the grid to the neighbouring tile's centre, then one tile per step), so every tile's
  brightness changes continuously as the source moves. A first version measured the first step in a
  straight line and jumped at side branches; the test (`DoomLightmap.test.ts`, a source dragged along a
  corridor in steps of 0.02 tile: no tile's distance may change by more than the step) found it, and
  fails on the old tile-based scheme. The light map is still one pixel per tile, smoothed on
  upscaling. Not checked in motion by eye.
- The hell's night and storm redesign, candidates (eighth chat; the owner wanted a redesign for the
  cord maze, not a softening): `DoomWorld` takes a `MoodStyle` (`MOOD_STYLES`: the darkness's strength
  and colour, how much of the cord's own glow stays through it, a second light thrown ahead of the
  player, how far the dark recedes on a heartbeat, the storm's tint) and `FleshLive.drawCord` draws
  the cord's and the wounds' light again over the night, so what glows by itself is not darkened.
  Three candidates in the `mood` prototype (artifact: see the chat): `cord` (the cord glows through
  the dark and holds the maze; the game's default for now), `torch` (a denser dark, a light thrown
  ahead along the heading), `pulse` (the dark recedes on every heartbeat). Nothing is chosen yet.
- The hell's second round of polish, 5: the owner's decisions (ninth chat). The night stays
  `cord`, the heroes stay the season heroes. The armor code is gone: `paintArmor`, `armorPainter`
  and the armor palettes are deleted, `heroArmor.ts` became `heroCharge.ts` (only `chargePainter`,
  the BFG charge's light), and the option and parameter that used to be called `armor` (they
  already carried only the charge painter) are `chargeLight` in `HeroView`, `PlayerDrawOptions`,
  `SharedLayers` and the `hell` prototype. The `hero` prototype lost its "Броня ада" button. The
  frozen mock-up pages in `prototypes/pacman/art/` keep their own armor code. Checked:
  `npm run check`, `npm test` (280), ESLint and Prettier on the changed files. Not checked:
  the BFG charge in a running fight (the painter's code is unchanged).
- The hell's second round of polish, 3: the heartbeat's peak (ninth chat). One constant,
  `PEAK` (0.4) in `render/doom/fleshLive.ts`, scales the beat before every light that follows it
  (the wounds and the cord, the lair's heart, the rifts' light, the cysts, the veins' blood); the
  rhythm (2.5 s, a strong beat and a weak one) and the resting glow are unchanged. Measured in the
  `hell` prototype with a fake clock over one beat (mean luminance of the region, peak against the
  old one): the lair 81.5 -> 67.7 (rest 60), the whole maze 51.9 -> 49.2; the pulse still shows
  (lair peak/rest 1.36 -> 1.13). If it is too flat, raise `PEAK`; at 0.6 the lair peaked at 76.3.
  Checked: `hell` prototype without console errors. The night's pulse (`MoodStyle.beat` in
  `DoomWorld`) also reads `heartbeat` and is not scaled; `cord` has it at 0.1.
- Screen size, the tunnel pad and the fruit's edge (tenth chat, the owner's list; the owner put the
  hell's second round (items 1, 2, 4 above) aside and went on to part III). The board:
  `render/common/boardScale.boardPlacement` replaces the `0.75 * min(...)` of `MeadowWorld` and
  `DoomWorld`. The old scale gave the walls ~69 % of the height at best (650 px on a 1080p browser
  window), and page zoom changes the container and the css px in step, so it never helped. Now the
  walls (the board without its empty border) take 85 % of the height (`BOARD_HEIGHT_SHARE`), at most
  92 % of the width, and sit centred below a 96 px band that the HUD covers (`BOARD_TOP_RESERVE`);
  on a short window (620 px high) the band wins and the walls take 84 %. Checked in the game at
  1920x950, 1280x620 and 420x800 (the HUD clears the walls at each; the hell's boss box, which
  makes the HUD taller, was not looked at). Tests: `boardScale.test.ts`. The tunnel pad's radius
  is 10 % smaller (`PAD_RADIUS` 10.8 -> 9.72; the hell's rifts are unchanged). The fruit looked
  sharp because the 250 px texture was shrunk to a 30-50 px tile in one `drawImage`, which a
  bilinear sample cannot do cleanly past 2x; `collectibleSprite` now keeps the texture halved
  down to 16 px (`mipChain`) and draws from the mip that is shrunk by 1x to 2x (`mipLevel`,
  tested). Before and after, 32 px tile: the edges are smooth, the look is the owner's. The `ghosts`
  comparison page (Blinky and the imps on the red) is deleted unchosen; the options were a pale
  rim, a halo, blackened iron, bright eyes, a floor shadow and a combination (git history, commit
  `39791b5`).
- Part I, 6.3: the lost boss fight unfolds the next world (tenth chat). The death pass
  (`DecayPass`, `decayShader`) has a second texture, `uNext`: with `DecayRequest.next` (the next
  level's maze and respawn tile) the rebirth phase unfolds that picture, and its colour returns
  along the next maze's corridors from its spawn tile (`LevelDecay.beginNext`); without it the
  pass is as before. `RenderPipeline` renders the next level (`previewFor`, the same preview the
  season turn uses) while a death with `combat.hellDefeat` plays, and stops drawing the hero once
  the hole has closed (the next world has none until its READY). `DeathState` then starts the next
  level in place (`startLevelInPlace`) instead of fading to black. Before: the hole unfolded the
  hell again and a black fade cut to the next level. Other pairs (a season death, the season turn
  into and out of a boss level) were already right. Checked in the real game (dev panel: Hell,
  Die; frames every half second): the hell drains, falls into the hole, and the summer meadow of
  level 6 unfolds out of it, READY follows with no black frame; no console errors. The HUD still
  shows the hell's boss box and "3 lives left" until READY. Test: `director.test.ts` (checked to
  fail on the old behaviour). Not done: the same for the arcade seams (the Easter egg into the
  arcade, the arcade back to the main game, game over to the menu), which still use the screen
  fade; the no-WebGL fallback veil shows no next world.
- The arcade shift, the pass, its prototype and the flow (tenth chat; the owner approved the look). The owner picked one look for each way: **in**, the Easter egg
  flashes, the world breaks into a mosaic of growing blocks with fewer colours and dims to black,
  and the CRT switches on (a bright line, then it opens upward, the tube's overdrive fading);
  **out**, the CRT switches off (the picture squashes to a line, the line to a dot, the dot
  glows on and fades) and the next world unfolds out of the dot in a ring of light. Code:
  `render/transitions/arcadeShift/` (`arcadeShiftTimeline`, a pure clock; `arcadeShiftShader`;
  `ArcadeShift`, per frame `from()` and `to()` then `compose()`; 2.6 s in, 2.2 s out), and
  `ArcadeLevelRenderer.preview` (the arcade's first screen, no actors) so the arcade can be a
  destination. Prototype `shift` (`node prototypes/pacman/build.mjs shift`: a time slider, both
  ways, four seasons). Tests: `arcadeShift.test.ts` (the clock). Wired in: a `world-shift` state
  (`core/states/WorldShiftState`, `Director.shiftWorld`, `FLOW.worldShift`) is entered from `playing`
  when the egg is taken, and from `death` (every arcade try lost) and `level-clear` (the last round)
  on the way out; the game is frozen while it runs and at the end `route` builds the level and a
  short READY opens it in place, with no fade. `RenderPipeline` draws the frozen level into
  `from` and the destination into `to` (the arcade's first screen going in, the next level's
  world coming out, the same preview the season turn uses), the arcade renderer draws a bare
  board while it runs, and the HUD is hidden during it. The dev panel's Secret button (in play)
  now shows the real way in. Checked in the real game at 1280x720 (dev panel: Secret, then Die
  three times): the summer world pixelates, the line opens, the arcade is on, READY; then the CRT
  switches off and the autumn world of level 2 unfolds from the dot, READY; no console errors.
  Tests: `director.test.ts` (in, and out after the last try). Not checked: the hell as the
  destination, the way out after the last round (the same call as after the last try), pause in
  the middle of a shift, a low-end GPU; without WebGL2 the shift cuts through black.
  board while it runs.
- Game over and the menu (tenth chat; the owner: the menu is the same overlay as the rest, so the
  death's own transition will do, and the whole interface is to be redone anyway). Game over ->
  menu has no transition now: the same overlay over the same world, so no fade. Starting a new run
  from game over or the menu: on level 1 at once (the first world is already on screen); from any
  other world the death's black hole unfolds level 1 (`world-shift`, kind `rebirth`,
  `FLOW.worldShift.rebirth` 2.5 s: the death's clock run 1.6x faster, `RenderPipeline`'s `dying`),
  then the intro READY opens it in place; a dev "start at" level keeps the old fade
  (`LevelLoader.peekNewGame` is null then). Checked in the real game (dev panel: autumn, Die
  three times, Enter on game over): the autumn world drains, falls into the hole, the summer world
  of level 1 unfolds, READY; no console errors. Tests: `director.test.ts` (four, three of them
  rewritten: a later game no longer always fades). Not done: pause -> menu and READY -> menu
  still fade, as does a dev jump; the menu still shows whatever world the run ended on, which the
  interface rework (part III) decides.
- Part I, 4.2: the dev panel's layout (tenth chat). The owner wanted the same buttons in a proper
  layout, nothing added. A chat mock-up (an artifact, season and hell views) was approved as it
  stood, then ported to `ui/debug/` with no change to `DebugController`: `devUi.css` (the look: a
  "label, controls" grid, one control height, `dev-seg` for one-of-many, `dev-switch` for on/off,
  `dev-step` for a number, chips for the long lists; everything in em from the window's font size,
  which grows with the screen: 12 to 16 px), `DevWindow` (the width is in em now; the panel opens
  below the mute button), `DevGroup` (an optional summary when folded), `PacmanDebugPanel` (a status
  card on top with FPS, state, level, lives, score and the GOD / FROZEN / PAUSED badges; groups
  ВРЕМЯ, УРОВЕНЬ, ИГРОК, БОСС in the hell, СПАВН, ОТРИСОВКА; the boss's health as three bars between
  its phase thresholds) and `DevLogWindow` (the watch rows with a bar for percentages, the channels
  as chips, the same grid). Two small changes of meaning, both visible in the mock-up: the hero is a
  two-way segment that shows who plays (it was a bare Profile button), and the lives show their
  number between -1 and +1. Checked in the real game at 1920x1080 and 1280x720, in a season and in
  the hell, with the speed, God mode and Freeze controls; no console errors. Not checked: 1440p and
  a phone, and nothing automatic (the panel is a dev overlay, with no tests).
