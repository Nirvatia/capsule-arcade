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

1. **Season scenes: a full setting per season, in code** (the current focus; one season per
   chat, prototype first). Today a season is one shared meadow recoloured, with a single
   landmark and per-tile random stickers on the walls; the owner wants each season to read as a
   distinct place — its own wall material and structure, its own dressed background and props —
   not a hue shift. Plan and per-season themes are agreed with the owner before code.
   Rules that hold (kept from the dropped winter rounds and the owner's brief):
   - top-down only, no pseudo-height; the maze silhouette, the corridor width, the food and the
     heroes' readability unchanged; graphics never fight the gameplay;
   - the accepted season base (background, ground, pellets, palette) stays the foundation;
   - decor sits on a surface, moves little, is composed (edge/aware), not sprinkled noise; every
     important thing reads at one tile;
   - the static is baked into `MeadowBake`; no new full-screen passes (settled season: High 3,
     Medium 1, Low 1).
   Decided with the owner: start with **winter (New Year)**; spring and summer **dress the same
   meadow** (keep the accepted base, change the wall material and the props into a full setting,
   not a new layout). Order: winter, autumn (Halloween), then spring, summer.
   Winter brief (the candidate to prototype first): snow-capped stone walls with the cap on the
   lit top/left edge and a faint ice sheen (directional, not random drifts); a snowfield ground
   and a frozen stream/pond with an ice sheen and a snow rim; composed snow piles at wall bases
   on the downwind side instead of sprinkled specks; the snowman landmark kept and joined by a
   small decorated New Year tree; warm window light and a string of lights on the cabins/bridge;
   falling snow kept. All static baked.
   Done in the game (owner's pick from the `season-winter` prototype, 2026-11-18): the walls —
   same stone, seams and moss, the snow lies on the lit top/left rim of the silhouette, full
   caps on lone blocks, base drifts on the lee side, never across the face; a deeper soft drop
   shadow under the blocks; the corridor floor — one flat slate, no per-tile shade steps, with
   quiet frost (an ice streak along the run, a rare frozen puddle, frost specks at wall bases);
   the lair — a frozen crust, a step lighter than the corridor, sheen and thin cracks; the
   energizer — a Christmas bauble (the snowman stays the meadow landmark). Mechanism: opt-in
   hooks with the shared painters as fallback — `MeadowBakeTheme.wall.paint` (whole painter),
   `.floor.paint` and `.lair.paint` (per cell) — other seasons render byte-identical; the
   default-preserving rule from the brief is kept in code and tested (`meadowBake.test.ts`).
   Left from the brief: the decorated New Year tree by the snowman, warm window light and the
   string of lights on the cabins/bridge. Corridor floors were "untouched" in the brief; the
   owner asked for a winter floor of their own — flat and quiet, nothing that reads at a
   glance while playing.
2. **Abilities: sound and tuning.** Mechanics and art are in (`AbilityService`, `DESIGN.md` §5).
   Left: sounds of their own for the token, a spent ability and a refused press (now borrowed
   wavs); hand-play whether 5 s mask / 3 s shock / 6-tile reach feel "modest but worth it"
   (`config/abilityConfig.ts`); look at her magenta ghost form beside Pinky and his gold one
   beside Clyde at game scale.
3. **The heroes: the rage bite and a cornering bot.** Left: the ghost's crunch and the chain
   200-1600 rising with the rage; a balance bot that presses turns early so its numbers show the
   cornering. Kept: no tongue; Ms. Pac-Man's bow, ball and rage as the owner likes them.
4. **Mobile: on a real phone.** Swipes/pad/dial/tap/audio-unlock are in and checked in Chromium
   iPhone emulation. Left on real hardware: iOS Safari audio unlock and pinch, swipe threshold
   and pad size under a thumb, notched safe areas, the Auto graphics tier there.
5. **Mazes**: the owner reworks the weak ones.
6. **Music track support** (blocked: the owner is working out how to generate the music). A
   looped ogg/mp3 from `static/` per world under the same volume; the hell's track is part II.

## Part II. Boss levels

1. **The hell: polish and what is left.** The fight is in the game. Left: the hell's music track
   (the owner brings it) and a balance/polish pass of the whole fight. Start from the `hell` and
   `mood` prototypes. Look rules kept: one flesh world, no void; walls as blocks, no height or
   extrusion; surround not dimmed; nothing bright that jumps forward; few bold details; a slow
   heartbeat (~2.5 s); the teleport is the iron gateway; night stays `cord`.
2. **A random boss on every 5th level, for both heroes.** Level 5 stays the hell while it is the
   only boss. With the second boss: a `BossCatalog` (id, world, maze, renderer, design page), a
   seeded pick per boss level (no immediate repeat), the same for both heroes; difficulty scaled
   by level number, not world; the dev panel can force a boss.
3. **Each new boss world** (design first, one page the owner approves; mechanics on placeholder
   art, then art in code). Still Pac-Man in a maze, a different boss/mechanic/way to play, never
   a reskin of the hell. Like the hell: `*Bake` + `*World` + a level renderer with `preview()`, a
   death `style` and a season-turn style. Candidates in order:
   1. **TRON, a neon grid** (`grid_tron`, no tunnels): the hero's light trail becomes a wall, the
      boss rides a light cycle, ghosts derez. A spatial puzzle.
   2. **An Alien Isolation stalker**: darkness, a flashlight cone, an unkillable hunter, a motion
      tracker, vents as tunnels. Stealth. Costliest in light and sound.
   3. **Sharkboy and Lavagirl, a tide**: water/lava flood tiles in waves, sharks patrol, safe
      islands change. Playful; palette clear of the hell's reds.
   4. **A Bomberman world**: bombs and blasts along the maze's lines, soft/hard walls. Think
      through with the owner.
   - Zombies rejected (a horde with weapons is the hell again). More old-arcade candidates
     (Dig Dug, Space Invaders, Frogger) can be offered before step 3.

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
