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
             boss a boss level gets from BOSS_ROTATION, the finished ones (the hell and the
             station), seeded per run, no repeat),
             LevelProgress, ScoreModel
  maze/      GridModel, GridService, SpawnLocator, LairExit
  actors/    Player*, Ghost*, ghostTargets (scatter, chase, flight), ghostRoutes (routes by
             path length: shortestRoute, planFeeding), arcadeTargets (the arcade ghosts' characters)
  rules/     CombatService (power, lives / tries, score, death, hit-stop), ghostContact
             (who touches which ghost, per profile; near misses), HypnosisService
             (Ms. Pac-Man overdrive and hypnosis: feeder / hunter, guides the ghost), LairCodeService
  bonuses/   fruit, Easter egg, AbilityService (the season levels' abilities: the token, the
             slot, the F key, the mask, the shock; it owns the EchoCloneService riot), boss reward
  station/   the station's rules: StationRun (the level in the game: the squad, the hatch's charge,
             the power cells, the lurker's hold, the three hits, the escape with the rush, the
             pulse, the breakthrough; StationGrid puts the doors and the zone's seals in the way and keeps
             the exit hatch shut until the escape), stationLayout (the console CN, the exit EX and the
             breakout's doors read from the matrix),
             MimicTells (a lurker's tells, pure), QuarantineZone (the fence's zone, pure: a stepped block of tiles, walls and corridors, each corner cut by its own staircase, wall islands and the lair kept whole, the hero's tile always in; its doors and the posts' spots), StationSquad (the squad's brain: it reads the hero's way,
             gives roles, runs the fence (a quarantine zone round a point ahead of him: a seal across every corridor that leaves it, a thin one he can tear), the
             ambush and the vent, the phantom, the escape's chase and interceptions; it steers
             the hunting ghosts through GhostService.setSquadGuide), EscapeRush (the escape's breakout: 1-4 more running at the hero
             and at his way, kept off his breakthrough lane), StationEscape (the hatch's charge, the console, the
             route laid anew off it, the doors, the pulse, the restart); the older StationService
             (the ghost version: HP and the rewind, the beam, flares, cocoons, phases, the super
             flare) and stationBeam, to be replaced
  doom/      the hell: DoomBossService (the boss's state machine), DoomArena (hazards,
             seals, void, pull, corruption, echo, shake), DoomMinionSwarm, DoomAttackPlanner
             (which attack, fair or not), DoomTargeting (tile picks); DoomAbilityService (the
             hero's side: health, the food meter, the weapon in hand: the berserk's rush and
             counter, the Sting held down, the Maw charged standing still; the pickups on
             `DOOM_PICKUP_TILES`), DoomSplitService (the split
             at each threshold: the boss frozen, four ghosts on `net/DronePack`, the core, the
             all-four stun rule). `PlayingState` skips the boss's update while `bossFrozen`
             and passes `LevelLoader.fireHeld` (the fire key and the dial report their release)
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
                   ball that lays a cooling track, its timing read from the telegraph's run);
                   fleshKit (with fleshPaint): the redesign's art, the owner's pick «Плоть»
                   (the food as one cached fang sprite, the split's hot heart energizer and its
                   four flayed ghosts, the Sting's bolts, the Maw's pickup icon;
                   weaponArt (the weapons pass, `hell-weapons`): the Sting's icon, the medkit, the
                   Sting's muzzle and hits, the rush as the fang saw with its trail, hit and the
                   counter's gold ready ring, the Maw's charge and its two hits, a weapon arriving
                   and spent, the refused press; WeaponFxView plays the weapons' fx events
                   (`sting-hit`, `rush-hit`, `maw-hit`, `spent`, `ghost-eaten`,
                   `split-form`) with them; bossArt (the boss and split pass): the stun's
                   skulls and timer, the split's window brackets, hit chips by strength (the
                   renderer adds his recoil), the omen's cracks, the core (a heart in ribs), his
                   forming, a ghost eaten; finaleArt (the finale pass): the boss's death
                   (the renderer plays it where he fell, then keeps his pool), the hell's heart
                   and exit (`SharedLayers` draws them in the hell), the phase-3 slow as hands
                   of the damned (`handPoints`, tested)
  station/         the station in the game: StationLevelRenderer over b7/ (b7Scene: the owner's
                   mock-up Station_Level_v2 carried over as drawn on the game's maze; B7World:
                   the hull and baked architecture as one screen layer per resize, the phase's
                   infestation one per phase change, the live props in stage space, the light
                   map of sprite lights with the flashlight, bloom by downscale, grain on High),
                   b7Hive (the infestation, the total takeover by a black parasite with a lime life: veins, organics over the plates, the torn lair doors, the heartbeat; revealed from the lair by the infection), pretender (the squad's creature, the game side: the state to the look, RailGait, the mimicry, the eaten eyes, the lurker's eye) and stepper (its painter, the owner's pick: one `heat`, `tell` and `fright` blend the looks), stepperRage (the rage's face, the maniac, painted over the stepper's hot red body), drawLurkerEye (the lurker's gold eye tell), quarantineRing (the fence's zone: the warning hatch, dashed outline and door chevrons; the tinted tiles, the crisp outline with its inner band, the steel shutters across the corridors; the zone's tiles cached as one path), lureFlare (the escape's lure), goalMark (the goal's mark on the console, then the hatch), squadMarks (the plays'
                   and the escape's marks).
  arcade/          the secret level: pixel sprites, maze bake, view, CRT pass, intermission,
                   ArcadeLevelRenderer
  fx/              LevelFx (gameplay effects on the season levels: it plays and ages the
                   effects), fxPresets (`recipeFor`: an event to a pure recipe), fxDraw
                   (the shockwave, flashes, sparks, pop-ups, edge pulse), fxTypes
  transitions/decay/       the death black hole: field (Dijkstra), timeline (pure clock), WebGL2 pass
  transitions/seasonTurn/  level clear: corridor lights + tile cards to the next world
  transitions/arcadeShift/ the way into the arcade (mosaic, CRT on) and out of it (CRT off, a dot unfolds the world)
  actors/ (hero/: the shared Hero; the heroes in the game are the fruits, FruitHero (OrangeHero, MelonHero: cel-shaded cut fruits, the buff's ice rim and fizzy ribbon, the calm juice ribbon), with `heroSkin` (the look kept in storage, 'fruit' by default or 'vessel'; HeroView takes the body's radius per look; the dev panel's Герои switches and reloads; the HUD and menu icons follow it, `heroIcon`); the vessels, the other choice: vesselHero (their base: the wedge eye, the drop and star shapes, the stream's flicks, the contour turned inside out in the power through Hero's `drawSilhouetteOutline` hook; `CJ_BODY_RATIO` is HeroView's radius), CinnabarHero (Pac-Man), JadeHero (Ms. Pac-Man); their streams are heroWake ribbons at `VESSEL_STREAM_STEP`; the previous looks PacmanHero (the sun) and MsPacmanHero (the white comet, `drawIceBow` still drawn by the mask's ghost form) are kept for the icons and the prototypes; heroSeasons (the season's colours), heroFx (fire drops, outline-free embers, the highlight star); heroCharge (the hell's BFG charge light, painted over the body), playerDrawOptions; HeroView drives them, in every world, with the game's feel `GAME_FEEL`: the gaze, the smear, the bump, the shadow, the kick-up, the sphere, and the food's pull through `SharedLayers.attract`) items/ (fruit: one file each; bonus life, exit, egg) maze/ debug/
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
             on a taller screen, over `seasonArt` and `seasonThemes`; `BossHud`, the hell's, over
             `hellArt`; `StationHud`, the station's (steel `STATION_THEME`, `StationBar`, `stationArt`); ArcadeHud; hudSnapshot, hudFrame; the coins and life icons bake the real hero via `heroPortrait`,
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
- `logic/doom/doomRedesign.test.ts` — the hell's redesign: the map keeps its food off the pickup
  spots; the energizers light only in the split; the Maw fires only on a full meter; the split
  freezes the boss and refills the food; none eaten: neither hurt nor stunned, some: 75 HP each,
  all four: stunned and unhurt; the weapons are off in it; the berserk's rush and its cooldown,
  its counter (x3, unhurt) and the counter window in a burning rift; the Sting held down on the
  meter; a new weapon replaces the one in hand; the medkit only for a hurt hero.
- `render/doom/doomDashFx.test.ts` — the boss turns into the lava ball only over the telegraph's
  last 0.25 s (whatever its length), smoothly, and back into the body over 0.28 s after the stop.
- `render/actors/hero/heroWake.test.ts` — the comet's tails: both ends 0 through a turn and
  after the stop, gone a life later.
- `logic/station/stationRun.test.ts` — the station level: three hits and the level taken; out
  through the hatch in the escape. `logic/station/mimicTells.test.ts` — a lurker's tells (off
  the centre, the shadow, the rare blink, the tremble only near, stronger while it teaches).
- `render/actors/hero/fruitHero.test.ts` — the fruits draw in every state in balance; the look setting and a blocked storage.
- `render/actors/hero/vesselHero.test.ts` — the vessels' stream is not drawn across a tunnel
  jump (the mock-up's did).
- `logic/actors/playerControl.test.ts` — reversal, late turns, held keys.
- `logic/actors/playerCorner.test.ts` — cornering on the diagonal, the rage's dash and the energizer's hit-stop.
- `logic/zone/zone.test.ts` — the Zone: its maze passes `validateMaze`; the emission's phases; the
  anomalies' placement, warning and inertness; the bolt; a tushkan's walk and death; the wave's
  hurt in the open and none in a shelter; the Monolith, the wishes and their modifiers.
  The Zone's code (a boss world candidate, `DESIGN.md` §7b): `logic/zone/` (`ZoneService`
  composes `ZoneAnomalies`, `EmissionClock`, `TushkanPack`, `Poltergeist`, `ZoneWishes` over the
  game's `GridService`/`PlayerService`/`LevelProgress`; `ZoneMap` reads artifacts, the Monolith,
  shelters and burrows from any maze), `config/zoneConfig.ts`, `config/mazes/grid_zone.ts`; the
  picture: `render/zone/` (`zoneBake` the baked Pripyat, `zoneSprites` the cached actors and props,
  `ZoneView` composes them with the live anomalies, the wave and the hints; the caller draws the hero
  in between). Not wired into `LevelSession` or `BossCatalog` yet; it runs in `prototypes/pacman/zone`.
- `logic/net/net.test.ts` — the Net: the doors on straight corridor edges away from the spawn;
  a door slamming shut behind the hero, both ways, then opening; drones kept in the corridors and
  off a shut door; their release; a hit with grace and three hits ending the level; the hack and the
  eaten chain; the alarm, the core and the end.
  The Net's code (a boss world candidate, `DESIGN.md` §7c): `logic/net/` (`NetService` composes
  `NetDoors` and `DronePack` over the game's `GridService`/`PlayerService`/`LevelProgress`, reading
  the artifacts, the core and the burrows with `logic/zone/ZoneMap`), `config/netConfig.ts`; the
  picture: `render/net/` (`netBake` the baked server, `netSprites`, `NetView`; the caller draws the
  hero in between). It plays on `grid_zone`. Not wired into `LevelSession` or `BossCatalog` yet; it
  runs in `prototypes/pacman/net`.
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
approved prototype already is the game code; a page whose subject left the game (a rejected
candidate, an old look) is deleted (the owner, 2026-11-26), the list of pages is
`prototypes/pacman/README.md`.
```
