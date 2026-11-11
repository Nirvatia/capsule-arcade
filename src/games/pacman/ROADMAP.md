# Pac-Man — roadmap

What is left to do. The game: `DESIGN.md`. The code: `ARCHITECTURE.md`. What was done and
why: the git history of `feat/pacman` (every stage ends in a commit that says what it did; the
long "Done" log that used to live here was dropped, the history has it).

## Working agreement

One step per chat. A new chat starts with "read `src/games/pacman/ROADMAP.md`, step N" (for
example "part II, step 3, TRON"). Claude reads the parts of `DESIGN.md` and `ARCHITECTURE.md`
the step needs, analyses the code, proposes a plan, waits for approval, works, updates the
three documents (this plan: delete what is done and add what came up; the design and the
architecture where they changed) and pushes to `feat/pacman`. New art and new effects start as
a prototype the owner approves first, in the chat, as screenshots (the built pages are not
committed; see `ARCHITECTURE.md`, Prototypes), unless the owner says to go straight into the
game.

How the looks are decided: a mock-up first, and only for what defines a world (the world, the
heroes, the boss, the walls). A candidate comparison is a throwaway page built from the game's
own sources on the real maze (`node prototypes/pacman/build.mjs <name>`, then published as an
artifact: strip the document wrapper from the built page; delete the page when the owner has
chosen), not a hand-drawn picture. Effects inside an accepted language are restyled in one
pass and shown as frame series, not mock-up by mock-up.

Every bug fix gets a test that is checked to fail on the old behaviour. Checks before a push:
`npm run check`, `npm test`, `npx eslint src/games/pacman`, `npx prettier --check` on the
changed files (the repository-wide `npm run lint` is red for files of other games; leave
them). A UI change is also looked at in a browser (Playwright against `vite dev`).

**All graphics are drawn in code** (Canvas2D / WebGL2). No PNG sprites, no sprite sheets, no
image pipeline. An owner's mock-up is a picture of the target look that Claude reproduces in
code; it is never loaded as an asset. Motion, particles and seasonal details are code too.

Token budget: code first, art after the mechanics of its part. The model named per step is a
suggestion (Opus for the design of a look or a mechanic, Sonnet for the steps).

## Order

**I** the main game (what is left: the volume slider, the seasons' scenes), **II** the boss
levels (the hell's polish, then the random boss, then the new worlds), **III** the interface of
each new boss. The depth and post-processing pass comes last of all (see Later).

## Part I. The main game

1. **Volume slider** (Sonnet). The mute button and the `M` key are in. Left: a volume slider
   next to the button, saved in `localStorage` like the mute (`audio/audioSettings`,
   `PacmanAudioPlayer`, `ArcadeSynth`'s master gain).
2. **Music track support** (postponed: the owner is still working out how to generate the
   music). A looped file (ogg/mp3 from `static/`) per world, under the same volume. The
   seasons' music is optional; the hell's track is part II, step 1.5.
3. **Season scenes, in code** (Opus for the look, one season per chat, prototype first). Today
   a season is a palette and a few props on one meadow. The owner wants a whole scene per
   season, in the maze and in the background, not a recolour:
   1. **Autumn: Halloween.** Pumpkins, cobwebs, bats, a gravestone or a lantern here and
      there; the walls and the ground dressed for it too, not only the margins.
   2. **Winter: New Year.** A fir tree, baubles, garlands, snow on the walls, lights.
   3. **Spring and summer** get the same treatment afterwards (their themes to be decided with
      the owner).
   4. **The hell** scene is reworked after the rest (part II, step 1.7).
      Rules that still hold: the walls and the corridors keep their full width, nothing hangs in
      the air in the maze, the decor sits on a surface and moves little, and every important
      thing reads at the size of one tile.

## Part II. Boss levels

1. **The hell: the second round of polish and what is left** (Opus for a look, Sonnet for the
   steps). The hell is in the game (the flesh world, the cord maze, the heroes, Blinky and the
   imps, the weapons, the attacks, the light). The look's rules, kept from the owner's rounds:
   one flesh with no void; walls are dark flesh islands edged by a glowing cord (no height, no
   face, no extrusion); no bright bone or anything that jumps forward; few bold details on a
   surface; a slow heartbeat (about 2.5 s) and a calm background; the teleport is a vertical
   rift (a round opening reads as an orifice and was rejected); the night stays `cord`; the
   heroes are the season heroes plus the BFG charge. Start from the `hell` prototype
   (`node prototypes/pacman/build.mjs hell`: "Бой" runs the real fight, the attack buttons force
   an attack, "Бессмертие" keeps the hero alive, "Фаза 1-3" jump to a phase; query `?ms`,
   `?zerk`, `?chg`) and the `mood` prototype. The owner's list, in this order:
   1. **A full redesign of the teleports.** The rifts sink into the red: a hero running for one
      cannot find it. The new look must stand out from the maze and the background at tile
      size (a hue the hell does not otherwise use; the exit's pale light is taken), keep the "no
      round opening" rule, and show where it leads (the other pad). The teleport fog
      (`DoomWorld.teleportFog`) and the hero's rolling ball at the pad go with it. A comparison
      page first.
   2. **Readability of the boss's attacks.** The rift's seam and burst, the cross, the eruption,
      the seals, the void cells, the corrupted tiles and the pull's cords merge with the maze
      in the same reds. Danger must read at a glance against the cord maze and the dark floor,
      and a telegraph (it will hurt) must differ from a live hazard (it hurts now). Ideas: a
      pale or white-hot core with a dark outline, a hue shift for live hazards, hatching or a
      moving edge for telegraphs, a floor tint under the threatened area. Test in grayscale
      too. A comparison page with every attack at once.
   3. **Blinky and the imps get lost** on the red world. Options for a comparison page: a pale
      rim light or a thin pale outer outline, a faint halo in the boss's own colour, a shift
      away from red (blackened iron with hot features), brighter eyes, a small shadow disc on
      the floor. The imps keep the arcade colours.
   4. **The storm's redesign** is open: ask the owner before touching it.
   5. **The hell's music track** (the owner brings it: generated or a free licence).
   6. **Balance and a polish pass** of the whole fight; the boss reward (heart or exit).
   7. **The hell's scene** reworked together with the seasons' scenes (part I, step 3.4).
2. **A random boss on every 5th level, for both heroes.** Level 5 stays the hell while it is
   the only boss. The selection arrives with the second boss: a `BossCatalog` (id, world, maze,
   renderer, design page), a seeded pick per boss level (no immediate repeat), the same for
   Pac-Man and Ms. Pac-Man. A boss world is no longer tied to a level number, so the boss's
   difficulty is scaled by the level number, not by the world. The dev panel can force a boss.
3. **Each new boss world** (Opus for the design, Sonnet for the steps): still Pac-Man in a
   maze, with a different boss, a different mechanic and a different way to play, never a
   reskin of the hell's fight. Like the hell: `*Bake` + `*World` + a level renderer with
   `preview()`, a death `style` for the universal transition and a season-turn style
   (`RenderPipeline.turnStyle`). Each starts with a one-page design (boss, mechanic, rules, how
   it differs from the others) that the owner approves before code; mechanics on placeholder
   art first, then the art, all in code. Its interface is part III. The candidates, in the order
   proposed (each differs from the others in what the player does: the hell is combat):
   1. **TRON, a neon grid** (the maze is `grid_tron`, no tunnels). The hero leaves a light
      trail that becomes a wall for a few seconds; the boss rides a light cycle that cuts the
      maze; the ghosts derez. A spatial puzzle. The best fit for movement on rails.
   2. **An Alien Isolation style stalker.** Darkness, a flashlight cone, one hunter that cannot
      be killed, a motion tracker instead of weapons, the vents as tunnels. Stealth, the
      opposite of the hell. The costliest in light and sound.
   3. **Sharkboy and Lavagirl: a tide.** A playful tone. The mechanic is the terrain, not a
      boss bar: water and lava flood the tiles in waves, sharks patrol the water, the safe
      islands change. Ms. Pac-Man fits. Its palette must stay clear of the hell's reds.
   4. **A Bomberman style world** (an idea from the old arcades): bombs and blasts along the
      maze's lines, soft and hard walls. To be thought through with the owner.
   - Zombies were rejected: a horde with weapons is the hell again.
   - The owner knows few old arcades: more candidates (Dig Dug, Space Invaders, Frogger) can
     be offered in a chat before step 3 starts.

## Part III. The interface

1. **A skin per boss level.** The hell's is done. Each new boss world has its own interface
   (the hell's boss box: name, phase, HP with phase marks, the player's HP, weapon, berserk,
   BFG charge, the reward hint), on the same skeleton. Added as each boss lands.
2. The arcade (secret level) keeps its own pixel HUD.

## Later

**Depth and post-processing** (the very end). More volume with modern 2D techniques, as far as
WebGL2 over Canvas2D allows (no tessellation shaders in WebGL2):

1. Soft drop shadows for actors and walls; walls with height (a baked height map and a bevel).
2. Normal maps for walls and bodies drawn in code, so the world lights (energizers, the hell's
   lights, the neon grid) shade them.
3. A post-processing stack on `render/common/GlPass`: bloom, colour grading per world, a light
   vignette, optional chromatic aberration on hits.
4. A performance budget: everything switchable, measured on real hardware.

## Known issues

- Headless Chromium without a GPU runs the hell night at ~20 FPS and the flesh hell's first
  frame blocks for about a second while `bakeFlesh` paints the world (once per level). Nobody
  has timed either on real hardware; if the bake shows, spread it over frames.
- The `collectibles` prototype throws "undefined is not iterable" in a `forEach` while it draws
  the item row and so never reaches the exit; find it when the prototype is next touched.
- `Hero.ts` is still large (~960 lines); the sprite-free heroes are one class family, cut what
  no longer serves.
- Not checked in play: the hero's death over the black hole, the hell's and Ms. Pac-Man's
  deaths, a low-end GPU, the hero going through a season tunnel, the hell's night and ash storm
  over the cord maze.
