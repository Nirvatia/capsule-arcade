# Pac-Man — architecture

How the code is built. The game itself: `DESIGN.md`. The plan: `ROADMAP.md`.

## Code map

```
core/        GameMain (wiring, input → director, auto-pause, HUD frame, the graphics setting), Events, InputController
             Director (transition table, pause stack, screen fade, `flow` snapshot)
  flow/      GameState interface, StateClock (timeline of named phases)
  states/    menu, ready (intro | short), playing, paused, death, level-clear, game-over
  debug/     DebugController (every dev command, dev builds only), FrameMeter (frame
             and input timings for the panel)
engine/      EventBus, GameLoop, TimeControl
config/      gridConfig (tile tokens, level constants), mazes/ (one file per maze, one
             string per row, checked by parseMaze; `grid_01`–`grid_04` the season mazes,
             `classic01` the secret level's, `doom` the hell's; validateMaze), scores, actor contact distance,
             flowConfig (every flow duration), arcadeConfig (the secret level's rounds),
             abilityConfig (the abilities: the token, the mask, the shock), echoConfig
             (the echo's riot), hypnosisConfig (the overdrive and the
             hypnosis: times, the feeder's threshold, the hunter's speed)
logic/
  level/     LevelLoader (the run: level number, profile, secret / boss routing, arcade
             round and tries, carry-over), LevelSession (all services of one level, built
             together, never partial), SeasonCatalog (season and maze of a season level, per-season
             modifiers), MazeCycle (the order the four mazes come in), BossCatalog (which
             boss a boss level gets: the hell or the station, seeded per run, no repeat),
             LevelProgress, ScoreModel
  maze/      GridModel, GridService, SpawnLocator, LairExit
  actors/    Player*, Ghost*, ghostTargets (scatter, chase, flight), ghostRoutes (routes by
             path length: shortestRoute, planFeeding), arcadeTargets (the arcade ghosts' characters)
  rules/     CombatService (power, lives / tries, score, death, hit-stop), ghostContact
             (who touches which ghost, per profile; near misses), HypnosisService
             (Ms. Pac-Man overdrive and hypnosis: feeder / hunter, guides the ghost), LairCodeService
  bonuses/   fruit, Easter egg, AbilityService (the season levels' abilities: the token, the
             slot, the F key, the mask, the shock; it owns the EchoCloneService riot), boss reward
  station/   the station's rules: SwarmField (the swarm as a density over the corridors),
             HoundPack (the hounds: a pack that hunts tile by tile and moves like animals),
             StationService (HP and the rewind, the beam's and the flares'
             scare, the paces, the metamorphosis and the cocoons, the phases, the super flare),
             stationBeam (the flashlight cone and the super flare's corridor as the rules see them)
  doom/      the hell: DoomBossService (the boss's state machine), DoomArena (hazards,
             seals, void, pull, corruption, echo, shake), DoomMinionSwarm, DoomAttackPlanner
             (which attack, fair or not), DoomTargeting (tile picks), weapons, pickups
  debug/     debugLog (dev log lines; no-op in production)
render/
  RenderPipeline   canvas, HiDPI, render clock → a RenderFrame per frame, picks the level
                   renderer, runs the decay and the season turn
  RenderFrame      frame data + the LevelRenderer / WorldPreview interfaces
  SharedLayers     Pac-Man, Ms. Pac-Man and the bonuses (every level)
  seasons/meadow/  MeadowBake (static world: a frame + one function per layer; decor and
                   walls in meadowBakeDecor / meadowBakeWalls) + MeadowWorld (live layer) +
                   MeadowLevelRenderer, driven by a MeadowTheme per season
                   (seasons/<season>/<season>Theme.ts). A theme may opt into its own wall /
                   floor / lair paint through MeadowBakeTheme hooks; without them the shared
                   painters render, so a season that does not opt in is unchanged. Each season
                   carries a holiday scene (`MeadowBakeTheme.scene`, seasonScene: autumnScene
                   Halloween, winterScene New Year, springScene hanami, summerScene fair, with
                   sceneProps' top-down painters): the bake runs its wall dress clipped to the
                   walls' silhouette after the unchanged wall painter, its props and its
                   landmark extras, and collects what glows at night (`SceneLit`); MeadowWorld
                   draws those lights with its own night lights and the scene's few moving bits
                   (`scene.live`) over the mood. Autumn, spring and summer share the corridor
                   floor `sceneFloor` (one opaque tone, a contact shadow, grass at the feet).
  doom/            DoomLevelRenderer, the flesh hell: DoomWorld (camera, mood) over a scene
                   baked once (fleshBake, with fleshNoise) and moved by the heartbeat
                   (fleshLive), light map, Blinky lord of hell, imps, combat and weapon FX;
                   the boss's dash (doomDashFx: LavaDash, the body turned into a rolling lava
                   ball that lays a cooling track, its timing read from the telegraph's run)
  station/         the station (style B): StationBake (the scene baked once at a scale fitted
                   to the screen, in layers: base, the surround's glow, the walls' safety edge
                   and light strip, the resin per phase; painted by stationPaint / stationMarks /
                   stationProps / stationSurround / stationMaze / stationWalls), StationWorld
                   (camera, the layers scaled to the screen once, the dark: stationLight's small
                   light map with the vignette and grade folded in, the glow, grain on High),
                   StationLevelRenderer (+ preview), actors: stationFood (spores, flares),
                   stationWraith, stationHunter (hunter, cocoon), stationTracker
  arcade/          the secret level: pixel sprites, maze bake, view, CRT pass, intermission,
                   ArcadeLevelRenderer
  fx/              LevelFx (gameplay effects on the season levels: it plays and ages the
                   effects), fxPresets (`recipeFor`: an event to a pure recipe), fxDraw
                   (the shockwave, flashes, sparks, pop-ups, edge pulse), fxTypes
  transitions/decay/       the death black hole: field (Dijkstra), timeline (pure clock), WebGL2 pass
  transitions/seasonTurn/  level clear: corridor lights + tile cards to the next world
  transitions/arcadeShift/ the way into the arcade (mosaic, CRT on) and out of it (CRT off, a dot unfolds the world)
  actors/ (hero/: the shared Hero, PacmanHero (the sun), MsPacmanHero (the white comet, `drawIceBow` shared with the mask's ghost form; her two tails are heroWake ribbons), heroSeasons (the season's colours), heroFx (fire drops, outline-free embers, the highlight star); heroCharge (the hell's BFG charge light, painted over the body), playerDrawOptions; HeroView drives them, in every world, with the game's feel `GAME_FEEL`: the gaze, the smear, the bump, the shadow, the kick-up, the sphere, and the food's pull through `SharedLayers.attract`) items/ (fruit: one file each; bonus life, exit, egg) maze/ debug/
  common/          textures, trailRibbon (pure trails: a ribbon from an actor's recent positions whose width and alpha go to 0 at both ends and with age; the dash's lava track, the comet's tails), GlPass (every WebGL2 pass), moodBuffer (a world's atmosphere and
                   night in two small maps, a shade and a light, drawn over the screen, over a
                   part of it or into a baked background), renderQuality (the quality tiers' DPR
                   caps and atmosphere rates), graphicsSetting (the player's choice: Auto or a
                   tier, remembered in localStorage), autoQuality (Auto: steps the tier down
                   while a lower one is faster), boardScale
                   (where the maze goes on the screen: 80 % of the height, below the HUD band),
                   colour, maths, seeded random, worldDecor (the decor layout and stream shared
                   by every world)
audio/       PacmanAudioPlayer (samples; routes the arcade to ArcadeSynth; a world's own music
             from WORLD_MUSIC loops in place of the siren, paused for the fright and the pause,
             see OST.md), ArcadeSynth, audioSettings (mute and master volume, in localStorage)
ui/          PacmanUi (HUD + screens + fade over the canvas), hud/ (season/: the HUD of the
             four season worlds, `SeasonHud` in the side margins and `SeasonHudStack` in two bands
             on a taller screen, over `seasonArt` and `seasonThemes`; `BossHud`, the boss levels' one, over
             `hellArt`; ArcadeHud; hudSnapshot, hudFrame; the coins and life icons bake the real hero via `heroPortrait`,
             with the Lives board's icon geometry shared in `livesLayout`), screens/ (`WorldScreens` over `screenArt` for the
             seasons and the hell; `GameScreens`, the older cards, for the arcade; both pause screens'
             Game Select button uses `goto(resolve('/'))`),
             debug/ (dev panel and log), MuteButton (a knob, bottom left, and the volume slider beside it), i18n;
             the graphics setting is a plank under the menu and the pause screen (a button on the arcade's pause card)
```

## Rules of thumb

- Logic never imports render. Render reads logic through `RenderFrame` (`frame.level`,
  `frame.director`) and never mutates it; the doom FX queue is the one consumer-side
  drain. Logic tells render about moments through events: `audio:cue`, `fx:event`.
- A new level kind = a new `LevelRenderer`; the pipeline only picks one per frame.
- A world (the hell today, the boss worlds of part II next) is a folder pair:
  `logic/<world>/` (services, balance, tests) and `render/<world>/` (`*Bake` with the
  layer shape above, `*World`, the level renderer), plus its route in
  `LevelLoader.worldOf` and a `LevelSession` slot. Logic stays free of render.
- Keep files at ~200–400 lines, one job each. Pure rules (targets, contacts, attack
  choice) live in functions of their own, so tests call them directly instead of
  casting into private fields.
- Per-level state goes into `LevelSession`; anything that survives a level change is
  carried explicitly by `LevelLoader.changeLevel` (score, lives, life threshold, arcade
  tries).
- Shared drawing helpers go to `render/common/`, not copied into views.
- A meadow frame: `MeadowWorld.drawWorld` (the background with the atmosphere that holds
  still, the live lair gate, portals and smoke, the drift), `drawMood` (High's live mist and
  light, the night's local lights), `drawFood` (dots, energizers), then the actors and
  `drawOverlay` (weather). Food sits over the mood so neither night nor weather dims it.
- Fill rate is the budget. On integrated graphics a frame is bound by how many full-screen
  layers it blends, not by script: a GPU that falls behind queues frames, the picture stays
  smooth and the controls lag. Count a new full-screen layer as a cost. A world's atmosphere
  (mist, light, wash, storm tint, vignette and the night tint) goes through
  `render/common/moodBuffer`: covering layers become a small shade map, additive layers and the
  covering layers' colour a light map. No gradient is built per frame: paint it once into a
  sprite.
- A season bakes its atmosphere. The mood only changes twice a level (the weather at half the
  dots, the night at three quarters), so once it has settled `MeadowWorld` bakes the maps into
  a copy of the background (`lit`), six strips over six frames, and draws that copy alone. While
  the mood moves, the same maps go over the raw background every frame (repainted every frame on
  High, at 30 Hz on Medium, at 15 Hz on Low), so the swap to the baked copy shows nothing.
  Full-screen passes of a settled season: Medium and Low one (everything holds still and is
  baked, the mist where it stands by the middle of a level), High three (the covering layers and
  the night are baked; the drifting mist's cover and the whole stack's light stay two live
  maps, which is the same picture as before the bake); while the mood moves, three and four.
  The vignette is in the baked maps, under the actors; the night's lights, the weather and the
  drift take its darkening from a lookup (`vignetteAt`). The world objects that move under the
  atmosphere (lair gate, portals, chimney smoke) are `liveObjects`: over the baked copy each
  one's rectangle is redrawn from the raw background, the object and that part of the maps, on
  whole device pixels. New static decor belongs in the bake (`MeadowBake`), never between
  `drawWorld` and `drawMood`: what is painted there lies over the baked atmosphere.
- The render quality is the player's graphics setting (`render/common/graphicsSetting`: Auto,
  High, Medium, Low; a store, remembered). `GameMain` applies it to `RenderPipeline.setQuality`:
  the tier caps the canvas's DPR in every world (2 / 1.5 / 1) and sets a season's atmosphere.
  With Auto, `AutoQuality` is fed the frame times of play (not of the menu, READY or a pause):
  a two-second window slower than 48 frames a second steps one tier down; if the next window is
  not at least 15 % faster, the fill rate is not what holds the frames (a 30 Hz screen, a busy
  processor), so it goes back up and stops looking; it never steps up otherwise. What it found
  is remembered; picking Auto again makes it look from High.
- Collectibles (fruit, bonus life, exit) draw through `render/items/collectibleSprite`:
  callers pass the tile size and the time; the bake measures the object and how far its
  glow reaches over its ticker, so the object fills 0.78 of the tile and nothing leaves
  the tile. Textures carry no backdrop glow; `extraBounds` declares what `extra` draws. Their
  textures are painted with `render/common/itemPaint` (256-unit design, outline, gloss,
  sparkle).
- A level renderer returns the board layout. In the death state it leaves Pac-Man out:
  `RenderPipeline` renders the level offscreen, runs the decay pass, then draws Pac-Man
  on top. The arcade draws its own death and level clear (no decay, no season turn).
- No PixiJS: per-pixel effects are WebGL2 passes (`render/common/GlPass`) over the
  Canvas2D frame, uploaded only while the effect runs.
- Timed things are `StateClock` phases with durations in `config/flowConfig.ts`.
  Animations read `frame.flow` (`state`, `phase`, `phaseProgress`, `progress`,
  `remaining`, `paused`, `fade`) and keep no timers of their own for flow events.
- State changes go through `Director`; a change missing from its `TRANSITIONS` table is
  logged and ignored. Level changes use `director.changeLevel(route)` (fade + short
  READY) or `director.startLevelInPlace(route)` (no fade: after the season turn, and
  between arcade rounds).
- The HUD and the screens are Svelte, fed by one `HudSnapshot` built every frame
  (`ui/hud/hudSnapshot`). Gameplay score pop-ups are the exception: `render/fx/fxDraw` draws
  them on the canvas in the HUD's Lilita One.

## Game flow

```
menu ──(no fade on the first world)──▶ ready(intro 5 s, jingle) ──▶ playing ──▶ death ──▶ ready(short 2 s)
                  ▲   skip: Enter                │  │          └─ no lives ─▶ game-over
                  │                              │  └─▶ level-clear (season turn) ─▶ ready(short)
game-over ─no fade (same overlay, same world)┘   └─ Easter egg ─▶ world-shift (enter) ─▶ arcade ready(short)
game-over / menu ─▶ start: on level 1 at once; from another world world-shift (rebirth: the
      death's black hole unfolds level 1) ─▶ ready(intro); a dev start-at level keeps the fade
hell: losing the fight (abyss) ──black hole unfolds the next world, no fade──▶ next level, ready(short)
boss level: boss dies → heart + exit → taking either ends the level (level-clear)
arcade: death ─▶ ready(short) | last try ─world-shift (leave)─▶ main game; level-clear: flash
      (+ intermission after round 2) ─▶ next round in place | after round 3 ─world-shift (leave)─▶ home
```

Fades remain for the pause and READY → menu, a dev jump to a level and a dev start-at level.

pause (Space/P): ready, playing, death, level-clear — freezes and resumes the
same state; tab hidden / window blur auto-pauses; requests during a fade apply after it.

```

Phases (`config/flowConfig.ts`): death `shatter` (drain, fall into the hole) → `void` (flash,
dark) → `rebuild` (unfold, colour returns), 4 s (arcade: `fold` → `pause`); level clear `lights` → `turn` → `settle` (arcade: `flash` → `intermission`).
The screen fade is a DOM layer over the HUD and the screens, under the dev panels.

## Controls (implementation)

`InputController` tracks held direction keys; `GameMain` applies the latest held one
every frame, so a held key survives pauses, deaths and fades. A reversal turns Pac-Man
round on the spot (`PlayerModel.reverse`); a turn pressed up to 0.15 tile past a junction
still takes it (`LATE_TURN`). Food is eaten once the hero's centre is within `EAT_REACH`
(0.3 of a tile, `config/actorConfig`) of it, so a turn back just short of a dot still takes it.
A turn pressed within `CORNER_WINDOW` (0.4 of a tile) of a junction is cut: `PlayerModel.cutCorner`
counts the hero on the junction (its food eaten) and keeps where he really is as a corner offset
that every step on the new axis shrinks as much, so he runs the corner on the diagonal (the
arcade's cornering; not into a tunnel's pad). `CombatService` sets Pac-Man's rage speed each
frame (`RAGE`, `rageSpeed` in `config/actorConfig`: +20 % for the first second, then +10 %, a step; not
her overdrive, not the arcade). Taking an energizer never stops play; only eating a ghost has
its separate hit-stop.
Tests: `logic/actors/playerControl.test.ts`, `logic/actors/playerCorner.test.ts`.

Touch (`core/touchInput.ts`): `InputController` listens to the window's pointer events (not
the mouse's); a `SwipeTracker` turns a finger's moves into direction presses and holds the last
one while the finger stays (`heldDirection` takes a held key first, then the pad, then the
swipe). Touches on anything marked `data-no-swipe` (the HUD dials, the stick's zone) or on a button never
steer. The floating stick (`ui/TouchPad.svelte`) and the dials reach the game through `ScreenActions`
(`steer`, `fire`). `GameMain.holdPageForTouch` sets `touch-action: none` and friends on the page
while the game is open and unlocks the audio on the first touch or key
(`PacmanAudioPlayer.unlock`, `ArcadeSynth.unlock`). `ui/controlsSetting.ts` holds the touch
screen flag and the control scheme (swipe / stick, remembered; the scheme's id stays `pad`). Tests:
`core/touchInput.test.ts`.

`F` / `Shift` set one fire request (`LevelLoader.requestFire`) that `PlayingState` consumes each
frame: the hell's weapons take it, a season level hands it to `AbilityService.use`. The
abilities update before the ghosts and the combat, so a mask put on this frame shields the
hero from this frame's touches. The mask reaches the rules in two places: `CombatService`
treats the hero as untouchable while `AbilityService.shieldsHero` (`setShield`), and
`GhostService.setHeroHidden` sends the hunters to their scatter corners. The shock holds a
ghost with `GhostService.freeze` (its state stays, so it is still deadly); a scare, eyes or a
reset frees it. The token's tile comes from `SpawnLocator.findReachableTile` (a step window by
path from the hero, the tiles around hunting ghosts closed).

## Balance tool

`logic/balance/balanceBot.ts` plays one season level on the real services (no screen): the
nearest dot by path, out of the ghosts' reach, an energizer when a ghost is near, scared ghosts
while the power lasts; a middling player on purpose, seeded (the game's own dice too).
`BALANCE=1 BALANCE_SEEDS=12 BALANCE_OUT=<file> npx vitest run src/games/pacman/logic/balance`
runs every season maze in every season as both heroes and writes a table (clear rate, time,
deaths, first death, score, ability token and hypnosis statistics; the bot never spends an ability); without `BALANCE` the report is
skipped. `BALANCE=levels` (with `BALANCE_LEVELS=1,4,...`) plays chosen game levels one by one
to read the difficulty ramp (`config/difficultyConfig.ts`, applied in `buildLevelSession`).

## Debug tools (dev build only)

- Dev panels: `` ` `` or the DEV button; `F8` steps one frame. Panel groups (`ui/debug/`, the
  look is `devUi.css`): a status card with FPS, p95 update/render times, rAF backlog, input-to-
  render latency and the canvas size, then ВРЕМЯ, УРОВЕНЬ, ИГРОК, БОСС (the hell), СПАВН,
  ОТРИСОВКА (quality low/medium/high: the buttons set the player's graphics setting, which
  turns Auto off; debug overlays and the season layer switches: atmosphere, night, weather,
  drift, vignette; a switch bakes the world again). The log window shows live timers and
  the `debug:log` stream. The text grows with the screen (12 to 16 px). `FrameMeter` keeps the
  last few seconds and exists in dev builds only.
- `window.__pacman = { level, director, render }` for the console and Playwright.
  Directions are upper case: `level.setDesiredDirection('LEFT')`. `director.startGame()`
  fades for 0.8 s before READY; wait for it before `showPlaying()` / `debug*()` (both are
  ignored during a fade). `director.flow` shows the state, phase and timers. Useful:
  `debugGotoLevel(n)`, `debugEnterSecret()`, `debugEnterHell()`, `debugCompleteLevel()`,
  `debugKillPlayer()`, `debugGrantAbility('echo' | 'mask' | 'shock')` (the slot; F spends it),
  `abilities.debugSpawn(level.player, level.ghosts, kind)` (a token). The СПАВН panel has the
  same as buttons.
- Deterministic screenshots: Playwright `page.clock.install()` + a seeded `Math.random`
  init script make most frames repeatable; boss phase 3 and the death wave stay chaotic.

## Tests

`npx vitest run src/games/pacman`:

- `core/director.test.ts` — game flow: fades, READY, pause everywhere, auto-pause,
  game-over lock, transition table.
- `core/debug/debugTools.test.ts` — time control, boss debug hooks, silent dev log, the frame
  meter's summaries and input samples.
- `render/common/renderQuality.test.ts` — the quality names and the DPR cap of each tier.
- `render/common/autoQuality.test.ts` — Auto: fast frames keep the tier, a slow window steps
  down, a tier that is no faster is undone and ends the search, the frames after a change and
  stalls do not count, a remembered result.
- `render/common/graphicsSetting.test.ts` — the order of the choices, what Auto remembered.
- `render/common/moodBuffer.test.ts` — the atmosphere maps on a recording 2D context: shade then
  light, the night's multiply, a cover-only stack, a part of the maps, the edges stretched over a
  bake's margins, the repaint rate, and a painter that leaves its alpha behind.
- `render/common/math.test.ts` — `settle`: an eased value lands on its target (a mood that never
  lands is never baked).
- `render/common/trailRibbon.test.ts` — the trail never ends in a cut: width and alpha 0 at both
  ends in every frame of a dash of 3/6/12 tiles, no step along it, gone a life after the stop,
  motes that fade in and out.
- `render/doom/doomDashFx.test.ts` — the boss turns into the lava ball only over the telegraph's
  last 0.25 s (whatever its length), smoothly, and back into the body over 0.28 s after the stop.
- `render/actors/hero/heroWake.test.ts` — the comet's tails: both ends 0 through a turn and
  after the stop, gone a life later.
- `logic/actors/playerControl.test.ts` — reversal, late turns, held keys.
- `logic/actors/playerCorner.test.ts` — cornering on the diagonal, the rage's dash and the energizer's hit-stop.
- `logic/doom/doomMechanics.test.ts` — pickups, BFG, minions, attack sets per phase,
  fairness (rift, eruption, seals), maze stays connected.
- `logic/bonuses/bossReward.test.ts` — heart and exit.
- `logic/bonuses/easterEgg.test.ts` — the egg in the lair's centre, the vanish → gate →
  egg order, banished ghosts frozen, nothing outside level 7.
- `logic/level/arcade.test.ts` — tries, rounds, intermission, restart, ghost characters.
- `config/mazes/mazes.test.ts` — the validator and every maze file.
- `config/difficulty.test.ts` — the ramp is monotonic and capped, level 1 is the base, a late
  level has faster ghosts / shorter waves, no ghost outruns the hero, the secret level is
  untouched.
- `logic/balance/balanceBot.test.ts` — the balance bot plays a level and a seed plays one game.
- `logic/actors/ghostRoutes.test.ts` — routes by path length, no turning back, tunnels, the
  feeding plan.
- `logic/rules/hypnosis.test.ts` — feeder / hunter choice, the mode holds, a hunter eats (200
  each), frightened ghosts run from it.
- `logic/bonuses/echoClone.test.ts` — the echo's riot: 7-9 clones for 3 s from the given tile,
  dots and fruit eaten, energizers left, active ghosts kill a clone, the end.
- `logic/bonuses/abilities.test.ts` — the token (the chance and the kinds, the window, reachable
  in 8-18 steps on a way past no ghost, gone for good), the slot through a death, the refusals
  (an empty slot, the power on, nobody in the shock's reach), the echo from the hero, the mask
  (ghosts pass through, the grace, the hunters go to their corners, an energizer ends it), the
  shock (the chain, the held ghosts stay deadly, an energizer frees them).
- `render/actors/hero/heroTrail.test.ts` — the heroes' season table, their element trails and rolling ball.
- `logic/actors/playerTunnel.test.ts` — the tunnel's `teleport` fx.
- `logic/level/mazeCycle.test.ts` — the maze order, the season levels without the boss
  levels.
- `logic/level/levelRouting.test.ts` — seasons in order, the hell every 5th level per
  profile, the maze of each level, score / lives / next-life threshold carried across a level change.
- `logic/rules/fx.test.ts` — fx events, hit-stop, near misses.
- `logic/rules/ghostContact.test.ts` — eat, death, overdrive and who never touches, for
  both profiles.
- `render/transitions/decay/decay.test.ts` — the decay field, the black hole's clock and reach.

## Prototypes

New art and effects start as a page built from the game's own sources:
`prototypes/pacman/<name>/main.ts` + `index.html`, built by
`node prototypes/pacman/build.mjs <name>` into `prototypes/pacman/<name>.html`. The built
pages are not stored in git (`.gitignore`); the owner looks at prototypes in the chat, as
screenshots or an artifact Claude builds from the page, never by opening the files. The
approved prototype already is the game code. `prototypes/pacman/art/hell-flesh-scene.html` is
not a built prototype but the source of the accepted hell scene (a standalone page, open it as a
file), the reference for the hell's art pass; `hell-flesh-heroes.html` is the same scene with
the heroes' mock-up on it (the armor the owner dropped). Existing: `hell`, `arcade`,
`hud`, `death` (the death black hole: the real `LevelDecay` on the real worlds, a slider over the 4 s),
`collectibles` (with each item's reach from its tile centre and a tile grid),
`mazes` (every season maze in every season, with marks for tunnels, spawn, fruit and lair),
`mood` (the hell's night and ash storm styles side by side on the real `grid_doom`, the hero walking a corridor so the light can be judged in motion),
`level-clear`, `fx` (every gameplay effect on the real season worlds, click to fire),
`easter-egg` (the lair code's reward played by the real
services), `hero` (the hero stage: Pac-Man or Ms. Pac-Man large on a dark panel and on strips of the real season worlds, magnified and 1:1, with season buttons and the hell's BFG charge; `render/actors/hero`: the shared `Hero`, `PacmanHero`,
`MsPacmanHero`, `heroCharge`), `feel` (how the hero feels in motion: the real player logic on a season level, driven by the arrows, every `HeroFeel` / `PlayerFeel` idea on a switch (all on in the game), a x2 magnifier), `hell-exit` (the hell's lair gate opened only by who goes through it, the calmer heartbeat against the old curve, and the exit, on the real `grid_doom`), `echo` (the echo bonus's wisps played by the real services on a season world at game scale), `station` (the station's actors drawn by the game's own `render/station/` painters, large and at game scale: wraiths with both glitch looks, hunters, cocoon, spores, flares); `winter-decay.html` is an older standalone page.
```
