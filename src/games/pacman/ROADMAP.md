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
   1. **The station** (the focus again since 2026-11-25; `DESIGN.md` §7a). Out of the rotation
      until done (the dev panel's Station brings it). The look is approved (2026-11-22): style B
      of the `station` prototype, now lit. History: the ghost version (in the game:
      `StationService` with HP, the rewind, the beam, flares, cocoons; `render/station/`), then
      the swarm (`prototypes/pacman/swarm`, `logic/station/SwarmField`, `stationSwarm`: the bugs
      glitched, a fluid threat read fuzzy), then the hounds (`prototypes/pacman/hounds`,
      `logic/station/HoundPack`, `stationHound`: they played, but the owner disliked the hounds'
      look and the endless dark). The redesign of 2026-11-25: **a squad** of four with plays
      (the train, the pincer, the mimics, later the threads), each with a tell and an answer,
      power cells, the food charging the hatch, and **an escape** as a scene along a lit route,
      made easy. Steps, one per chat:
      1. **The design page**: approved (2026-11-25).
      2. **The squad to play**: v1 built and played (2026-11-25): the owner found the timer's
         set pieces dull (the train most of the time), the escape too easy, the one-tile pillars
         in the maze bad, the threads unclear. **v2** (same day, awaits his play):
         `grid_station` without one-tile pillars; `logic/station/StationSquad` rewritten (reads
         the hero's way, roles, three tactics picked by the situation: the fence, the ambush,
         the vent; the phantom), the escape's chase at 0.95 with dashes to junctions ahead
         under a red warning; `prototypes/pacman/squad` draws them (beams, the shaft's eyes, the
         phantom as guttering light) and `?debug` shows what the squad thinks. Measured with a
         player bot (avoids the squad within 2 tiles, eats the nearest food): all three
         tactics come each game, something happens every 4-6 s, a step costs under 11 ms; a
         blind runner loses the pulse in most escapes, never the escape. After the owner's
         play: tune, then delete the hounds and the swarm (pages, `HoundPack`, `SwarmField`,
         `stationHound`, `stationSwarm`). The tripwire and the shadow are in reserve.
         The owner played v2 (2026-11-25): much better; two creatures stuck rocking at their
         posts (fixed: one that reaches its post hunts on, tested), the escape still easy.
         **Escape v3** (same day, awaits his play): a free way, the squad in a rage, 1-4 more
         breaking out (`logic/station/EscapeRush`), his breakthrough lane (Space, two per
         escape), a pulse that reaches 3 tiles only (`DESIGN.md` §7a).
      3. **The creatures' look**: tile-sized, no legs, four tempers; a prototype (the void
         jellyfish of the `creatures` page is a starting point), the owner picks.
      4. A fourth tactic if the three need company (the tripwire or the shadow).
      5. Into the game: the squad and the escape in place of `StationService`'s ghost parts;
         the station's HUD; both heroes' station look (a prototype first); the hatch, the doors
         and the route's art; the caught transition and the world turn; sound; a performance
         check of the lit station.
   2. **Sharkboy and Lavagirl, a tide**: water/lava flood tiles in waves, sharks patrol, safe
      islands change. Playful; palette clear of the hell's reds.
   3. **A Bomberman world**: tried and dropped (2026-11-25, `DESIGN.md` §13): waiting on a fuse
      breaks Pac-Man's motion. Recoverable from commit `e65ce2a`.
   - Zombies rejected (a horde with weapons is the hell again). TRON dropped for the station.
     Bomberman dropped. Candidates: a Dig Dug-like quarry (the yard's art reused), the tide.

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
