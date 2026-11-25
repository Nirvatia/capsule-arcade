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

**I** the main game (abilities' sound/tuning, the heroes' rage
bite, a real-phone check, the mazes), **II** the boss levels (the hell's polish, the random boss,
the new worlds), **III** the interface of each new boss. The depth/post-processing pass comes
last (see Later).

## Part I. The main game

1. **Abilities: sound and tuning.** Mechanics and art are in (`AbilityService`, `DESIGN.md` §5).
   Left: sounds of their own for the token, a spent ability and a refused press (now borrowed
   wavs); hand-play whether 5 s mask / 3 s shock / 6-tile reach feel "modest but worth it"
   (`config/abilityConfig.ts`); look at her magenta ghost form beside Pinky and his gold one
   beside Clyde at game scale.
2. **The heroes: the rage bite and a cornering bot.** Left: the ghost's crunch and the chain
   200-1600 rising with the rage; a balance bot that presses turns early so its numbers show the
   cornering. Kept: no tongue; the heroes' looks are the owner's picks of `hero-art` (2026-11-23): Pac-Man the
   sun with the pinwheel corona, Ms. Pac-Man the white comet with the ice bow (`DESIGN.md` §12).
3. **Mobile: on a real phone.** Swipes/pad/dial/tap/audio-unlock are in and checked in Chromium
   iPhone emulation. Left on real hardware: iOS Safari audio unlock and pinch, swipe threshold
   and pad size under a thumb, notched safe areas, the Auto graphics tier there.
4. **Mazes**: the owner reworks the weak ones.
5. **Music**: the support is in (`WORLD_MUSIC`, `OST.md`: the format, the briefs, the prompts).
   Left: the owner's real tracks (the hell's replaces the synthesised placeholder; the station
   next; the seasons optional).

## Part II. Boss levels

1. **The hell: polish and what is left.** The fight is in the game; the boss's dash is the lava
   ball (the owner's pick of `hell-dash`, 2026-11-23). Left: the hell's real music track (a
   synthesised placeholder plays now, `OST.md`) and a balance/polish pass of the whole fight; whether the dash wants a warning
   stripe along its line (the turn into the ball now ends the telegraph, the line shows only by
   his eyes). Start from the `hell` and
   `mood` prototypes. Look rules kept: one flesh world, no void; walls as blocks, no height or
   extrusion; surround not dimmed; nothing bright that jumps forward; few bold details; a slow
   heartbeat (~2.5 s); the teleport is the iron gateway; night stays `cord`.
2. **A random boss on every 5th level, for both heroes**: in (`logic/level/BossCatalog`). It
   draws from `BOSS_ROTATION`, the finished bosses: the hell alone since the station was shelved
   (2026-11-25). Left: difficulty scaled by level number, not world, once a second boss is in.
3. **Each new boss world** (design first, one page the owner approves; mechanics on placeholder
   art, then art in code). Still Pac-Man in a maze, a different boss/mechanic/way to play, never
   a reskin of the hell. Like the hell: `*Bake` + `*World` + a level renderer with `preview()`, a
   death `style` and a season-turn style; every element but the heroes has art of its own.
   1. **The station** (shelved 2026-11-25, unfinished: out of the rotation, the dev panel's
      Station still brings it; `DESIGN.md` §7a; the steps below wait). It
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
   3. **A Bomberman world, "the demolition yard"** (the next focus). The idea and the look are
      proposed (`DESIGN.md` §13, 2026-11-25) and await the owner's answer: the open question is a
      boss bomber or none. Then, one step per chat: the design page settled in `DESIGN.md`
      (§7b); bombs, blasts and crates as game code on placeholder art (`logic/yard/`, tested),
      routed by `BOSS_ROTATION`; a look prototype of a few master assets (the floor, a wall, a
      crate, a bomb, the blast); the art in code.
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

- **Season scenes, unmeasured.** The holiday scenes are in the game (the owner's refinements of
  2026-11-23, `DESIGN.md` §6). Nobody has measured their cost on real hardware, nor the storm
  layer's memory (`bake.wet`: a half-resolution copy of the background, autumn and winter). The
  bridge and the top cabin are off a 16:9 screen. Rules for any later change: top-down only; the
  maze silhouette, the corridor width, the food and the heroes' readability unchanged; nothing on
  a wall's rounded corner (the pixel guard: `node prototypes/pacman/season-dress/guard.mjs` after
  building the page); the static baked, no new full-screen pass in the settled state. To add a
  season (two are planned): `HeroSeason` / `SEASON_LOOKS`, `SEASON_GHOST`, the `meadowThemes`
  registry, a `render/seasons/<season>/` theme and scene, `SeasonCatalog`'s modifiers, the food
  sprites, a burrow pad.
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
