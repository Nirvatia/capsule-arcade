# Pac-Man — roadmap

What is left to do. The game: `DESIGN.md`. The code: `ARCHITECTURE.md`. What was done and why:
the git history of `feat/pacman` (every stage ends in a commit that says what it did). Done work
is not logged here; only the open stages and the rules that constrain them.

## Working agreement

One step per chat. A new chat starts with "read `src/games/pacman/ROADMAP.md`, step N". The
assistant reads the parts of `DESIGN.md` and `ARCHITECTURE.md` the step needs, analyses the code,
proposes a plan, waits for approval, works, updates the three documents (this plan: delete what
is done and add what came up; the design and the architecture where they changed) and pushes to
`feat/pacman`. New art and new effects start as a prototype the owner approves first, in the
chat, as screenshots, unless the owner says to go straight into the game.

Prototypes: build and view them yourself via `prototypes/pacman/README.md`
(`node prototypes/pacman/build.mjs <name>`, then open the built `.html`). A candidate comparison
is a throwaway page built from the game's own sources on the real maze, published as an artifact
(strip the document wrapper); delete the page when the owner has chosen. Effects inside an
accepted language are restyled in one pass and shown as frame series, not mock-up by mock-up.

Every bug fix gets a test that is checked to fail on the old behaviour. Checks before a push:
`npm run check`, `npm test`, `npx eslint src/games/pacman`, `npx prettier --check` on the changed
files (the repository-wide `npm run lint` is red for other games; leave them). A UI change is
also looked at in a browser (Playwright against `vite dev`).

**All graphics are drawn in code** (Canvas2D / WebGL2). No PNG sprites, no sprite sheets, no
image pipeline. An owner's mock-up is a picture of the target look reproduced in code; it is
never loaded as an asset. Motion, particles and seasonal details are code too.

Token budget: code first, art after the mechanics of its part.

## Order

**I** the main game (the seasons' scenes first, then abilities' sound/tuning, the heroes' rage
bite, a real-phone check, the mazes), **II** the boss levels (the hell's polish, the random boss,
the new worlds), **III** the interface of each new boss. The depth/post-processing pass comes
last (see Later).

## Part I. The main game

1. **Season scenes: the owner's refinements** (the current focus; his answers of 2026-11-23 to
   the season questionnaire). Done, in review: spring as a Japanese garden (plaster walls with a
   tile edge, raked gravel, a deck lair, pebbles, toro lanterns, koi, temari, a soft petal wind), the tunnel pads (no worn
   path: a trodden patch fading into the meadow, a rune ring), winter's roofs under one snow cover, the meadow's trees and shrubs
   per season (`meadow/flora.ts`), the cabins as homes (paths, fences, benches, woodpiles, path
   lamps; `meadow/homestead.ts`) and summer (ivy, a slower carousel, heat haze with poplar fluff); winter on
   the shared base (snow blanket, thin bank, trodden-snow corridor, tile lair, icicles, the new
   bauble, a blizzard without a white veil, fresh snow piling up while it blows), the food of every season, autumn's wet ground (puddles, sheen, reflections, thin rain with leaves, no mist), the night lights as
   ground pools and a storm that never brightens the night (`DESIGN.md` §6). Left, one chat:
   The owner's review of that pass (2026-11-23) and his decisions, to do next:
   - **Spring**: the Japanese garden is rejected (other walls, the whole maze glares). Revert
     `e63845a` (plaster, gravel, deck, pebbles, toro, koi) and give spring the shared stone in
     light sandstone tones (young moss in the joints), the corridor earth as before; it must not
     read as summer by colour alone. Keep the temari.
   - **Winter**: keep the contour round the walls (the bank's shade line) but draw it only along
     the straight runs, fading out ~8 units before every rounded corner: it makes the corners look
     sharp.
   - **Summer**: the ivy plus the bunting on the walls is a mess and the ivy hurts readability.
     The bunting leaves the maze's frame for festoons between the tents on the meadow; the ivy
     gives way to Jumanji-like lianas and roots: few, thick, curving stems with big leaves gripping
     the walls' edges and corners, never a mat over the top.
   - **Cabins**: remove the paths and the fences (`meadow/homestead.ts`); the bench, the woodpile
     and the lamps stay (the lamps by the door, not along a path).
   - **Tunnel pads**: a pad of each season's own, a "burrow" the hero dives into, under the same
     live ripple: winter an ice hole, autumn a hollow stump, spring a stone well, summer a
     whirlpool in the sand. The trodden patch without a path stays. (The rune ring is hidden under
     the live pad and goes.)
   - **No sticker patches**: the translucent ellipses on the cabins' roofs and the meadow's patches
     become seasonal: roofs with real fallen leaves and moss in the tile joints (autumn), handfuls
     of petals (spring), clean sun-faded tiles (summer); the meadow with leaf piles (autumn),
     clover and dandelions (spring), dry grass patches (summer).
   - The chimney smoke a little clearer.
   - The pumpkin and the starfish stay as they are (the owner: not in the plans).

   Rules that hold: top-down only; the maze silhouette, the corridor width, the food and the
   heroes' readability unchanged; nothing new hides the walls or narrows the corridors; the
   static is baked (hooks of `MeadowBake`), no new full-screen passes in the settled state
   (High 3, Medium 1, Low 1), the live bits small sprites, nothing flashing faster than 3 times a
   second; the stone rim along the rounded corners is never covered (the pixel guard:
   `node prototypes/pacman/season-dress/guard.mjs` after building the page). Open from the port:
   the bridge and the top cabin are off a 16:9 screen; nobody has measured the scenes' cost (and
   the wet layer's memory, a half-resolution copy of the bake) on real hardware. To add a season
   later (two are planned): `HeroSeason` / `SEASON_LOOKS`, `SEASON_GHOST`, the `meadowThemes`
   registry, a `render/seasons/<season>/` theme and scene, `SeasonCatalog`'s modifiers, the food
   sprites.

2. **Abilities: sound and tuning.** Mechanics and art are in (`AbilityService`, `DESIGN.md` §5).
   Left: sounds of their own for the token, a spent ability and a refused press (now borrowed
   wavs); hand-play whether 5 s mask / 3 s shock / 6-tile reach feel "modest but worth it"
   (`config/abilityConfig.ts`); look at her magenta ghost form beside Pinky and his gold one
   beside Clyde at game scale.
3. **The heroes: the rage bite and a cornering bot.** Left: the ghost's crunch and the chain
   200-1600 rising with the rage; a balance bot that presses turns early so its numbers show the
   cornering. Kept: no tongue; the heroes' looks are the owner's picks of `hero-art` (2026-11-23): Pac-Man the
   sun with the pinwheel corona, Ms. Pac-Man the white comet with the ice bow (`DESIGN.md` §12).
4. **Mobile: on a real phone.** Swipes/pad/dial/tap/audio-unlock are in and checked in Chromium
   iPhone emulation. Left on real hardware: iOS Safari audio unlock and pinch, swipe threshold
   and pad size under a thumb, notched safe areas, the Auto graphics tier there.
5. **Mazes**: the owner reworks the weak ones.
6. **Music track support** (blocked: the owner is working out how to generate the music). A
   looped ogg/mp3 from `static/` per world under the same volume; the hell's track is part II.

## Part II. Boss levels

1. **The hell: polish and what is left.** The fight is in the game; the boss's dash is the lava
   ball (the owner's pick of `hell-dash`, 2026-11-23). Left: the hell's music track (the owner
   brings it) and a balance/polish pass of the whole fight; whether the dash wants a warning
   stripe along its line (the turn into the ball now ends the telegraph, the line shows only by
   his eyes). Start from the `hell` and
   `mood` prototypes. Look rules kept: one flesh world, no void; walls as blocks, no height or
   extrusion; surround not dimmed; nothing bright that jumps forward; few bold details; a slow
   heartbeat (~2.5 s); the teleport is the iron gateway; night stays `cord`.
2. **A random boss on every 5th level, for both heroes**: in (`logic/level/BossCatalog`, the
   hell and the station). Left: difficulty scaled by level number, not world, once the station
   has its rules.
3. **Each new boss world** (design first, one page the owner approves; mechanics on placeholder
   art, then art in code). Still Pac-Man in a maze, a different boss/mechanic/way to play, never
   a reskin of the hell. Like the hell: `*Bake` + `*World` + a level renderer with `preview()`, a
   death `style` and a season-turn style; every element but the heroes has art of its own.
   1. **The station** (the current focus; `DESIGN.md` §7a). It
      replaced TRON (dropped with its `grid_tron`). Steps, one per chat:
      The look is approved (2026-11-22): **style B** of the `station` prototype, the
      quarantine lab (scorched bulkheads with claw gouges and blood, deck plates with drag
      trails, specimen tanks, the hull breach, the dead crew, the floor viewport onto the storm,
      spores for food, wraiths for ghosts, the husk with a face for the cocoon, a cold grade,
      scanlines, grain). Style A is dropped. No new mock-up: the rest is tuned in the game.
      In the game (2026-11-22): `BossCatalog` picks the hell or the station per boss level
      (seeded, no repeat; the dev panel's Hell / Station / Boss: auto force it);
      `render/station/` draws the station (style B). The level still plays by the season
      rules with unkillable wraiths.
      The owner played the ghost version twice and redesigned the level (2026-11-22,
      `DESIGN.md` §7a): **a swarm** instead of the ghosts, a **torch** fed by the dots instead
      of the flashlight, **four beacons** that change the map instead of phases, no boss, an
      escape at the end. What is in the game from the ghost version (`StationService`: HP and
      the rewind, the beam, flares, cocoons, the super flare) is replaced step by step; the
      fixes stay (no season kit, one wall contour, nothing flashing, vents in pockets).
      1. **The swarm prototype**: built (`prototypes/pacman/swarm`), awaits the owner's play.
         The swarm is game code from the start: `logic/station/SwarmField` (a density over the
         corridors that pours from the nest and the vents, spreads, flows toward the hero, never
         enters light and is pushed out of it; tested) and `render/station/stationSwarm` (the
         bugs as cached sprites streaming along the flow, the swarm's glow as one scaled density
         map). The torch, its fuel, the health, the beacons and the escape are in the page for
         the feel, with every number in its `TUNE`.
         The owner played it: the bugs glitched (they were re-placed from the density every
         frame instead of living on), and a fluid swarm risks a fuzzy, unreadable threat. His
         pick: a **mini-swarm of hounds** instead, prototyped in `prototypes/pacman/hounds`
         (built, awaits his play): `logic/station/HoundPack` (6-10 bright seekers that choose
         their way tile by tile but move like animals: creep with pauses, sniff at junctions,
         hold a breath and dash down a straight corridor, tire, round the corners, spread to cut
         the ways, shy back from fire at once; a bite costs health; tested) and
         `render/station/stationHound` (an arrowhead lit from inside, a burning eye at the tip,
         legs and tail catching its fire; `HoundMotion` eases the path into curves). The torch,
         the beacons and the escape stay. Which one the level keeps is the owner's call.
      2. The swarm rules in the game in place of the ghosts and `StationService`'s ghost parts;
         walls and floor readable in the dark; the surround's own light; the nest's door.
      3. The station's horror HUD (health, fuel, beacons).
      4. Both heroes' station look: a prototype first, the owner approves.
      5. The caught transition and the world turn; the hatch's own art.
      6. Sound (sources open: the owner's samples or synthesised).
         Cost: light, the swarm and sound carry the play here; the dark and the torch go through
         the light map, the swarm's bugs are cached sprites, not a new full-screen layer.
   2. **Sharkboy and Lavagirl, a tide**: water/lava flood tiles in waves, sharks patrol, safe
      islands change. Playful; palette clear of the hell's reds.
   3. **A Bomberman world**: bombs and blasts along the maze's lines, soft/hard walls. Think
      through with the owner.
   - Zombies rejected (a horde with weapons is the hell again). TRON dropped for the station. More
     old-arcade candidates (Dig Dug, Space Invaders, Frogger) can be offered before step 3.

## Part III. The interface

1. **A skin per boss level** on the hell's skeleton (boss box: name, phase, HP with marks,
   player HP, weapon, berserk, BFG charge, reward hint). Added as each boss lands.
2. The arcade (secret level) keeps its own pixel HUD.

## Later

**Depth and post-processing** (the very end), as far as WebGL2 over Canvas2D allows:

1. Soft drop shadows; walls with height (baked height map + bevel).
2. Normal maps for walls/bodies so the world lights shade them.
3. A post stack on `render/common/GlPass`: bloom, per-world grading, vignette, optional
   chromatic aberration on hits.
4. A performance budget: everything switchable, measured on real hardware.

## Known issues

- **Weak graphics.** Integrated GPUs feel sluggish controls with smooth frames (GPU-bound frame
  queue). The settled atmosphere is baked (Medium/Low blend one full-screen layer, High three);
  tiers cap DPR 1/1.5/2. Measured in Chromium without a GPU: winter High 38→49 FPS (DPR 1),
  Medium 50→60. Nobody has measured a real weak PC: check Auto steps down there; if frame times
  stay short while controls lag, feed Auto the rAF backlog. If still lagging: High's two live
  mist maps, a Low below screen resolution, then the hell's additive glow layers and ground (the
  hell does not bake its atmosphere yet). The dev frame meter reads FPS, p95, rAF backlog,
  input-to-render latency.
- Headless Chromium without a GPU runs the hell night ~20 FPS; the flesh hell's first frame
  blocks ~1 s in `bakeFlesh`. Untimed on real hardware; if the bake shows, spread it over frames.
- The `hud` prototype does not build (imports a removed `GameHud.svelte`); fix or delete when
  next needed.
- The `collectibles` prototype throws "undefined is not iterable" in the item row; find it when
  next touched.
- `Hero.ts` is still large; cut what no longer serves.
- Not checked in play: the hero's death over the black hole, the hell's and Ms. Pac-Man's deaths,
  a low-end GPU, a season tunnel, the hell's night and ash storm over the cord maze.
