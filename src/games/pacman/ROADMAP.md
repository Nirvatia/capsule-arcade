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

**I** the main game (what is left: the abilities' sounds and tuning, a check on a real phone,
the heroes' look, the seasons' scenes), **II** the boss levels (the hell's polish, then the random boss, then the new
worlds), **III** the interface of each new boss. The depth and post-processing pass comes last of
all (see Later).

## Part I. The main game

1. **Music track support** (postponed: the owner is still working out how to generate the
   music). A looped file (ogg/mp3 from `static/`) per world, under the same volume. The
   seasons' music is optional; the hell's track is part II, step 1.1.
2. **Abilities: echo, mask, shock** (Opus High, one chat; the rules are in `DESIGN.md` §5,
   Abilities). A season level may hold one ability token (or none); the hero carries the taken
   ability in a slot and spends it with F (the hell's fire key). The echo clone stops being an
   instant bonus and becomes one of the three.
   Done: the rules (`DESIGN.md` §5), the mechanics (`AbilityService`), and the art the owner
   picked in the `powers` prototype (deleted after the pick): the tokens M1 (a gold ghost sheet)
   and S2 (a plasma ball), the mask as the season's ghost in the hero's colour in a halo kept
   inside the tile (C), the shock as branching lightning (V1), the slot's icon in the HUD dial
   (`render/actors/abilityArt.ts`, `AbilityView`, `ui/hud/season/AbilitySlot.svelte`).
   Left:
   1. Sounds of their own for the token, a spent ability and a refused press (now borrowed
      arcade wavs: `credit`, `extend`, a quiet `eat_dot_1`).
   2. Not yet played by hand: whether 5 s of mask, 3 s of shock and a 6-tile reach feel
      "modest but worth it"; tune after a few runs (`config/abilityConfig.ts`). Also look at it in
      play: her magenta ghost form beside Pinky and his gold one beside Clyde at game scale (the
      halo, her bow and the calm face tell them apart in the prototype).
3. **Mobile controls: on a real phone.** Done: swipes, the optional pad, the dial as the ability
   and fire button, tap screens, the page held still, the audio unlocked by the first touch, the
   touch help (`DESIGN.md` §2). Checked only in Chromium's iPhone emulation (portrait and
   landscape). Left for a real phone: iOS Safari's audio unlock and pinch, how the swipe's length
   (`swipeThreshold`) and the pad's size feel under a thumb, the safe areas of a notched screen,
   and the Auto graphics tier there.
4. **The heroes' redesign** (Opus, prototype first). The owner likes the heroes but they lack
   force: bulky in the maze (a radius of 0.39 of a tile, 0.78 of the corridor), no rage in the
   energizer (only a palette and flames), the moves feel thick though the render is clean. The
   owner wants a full redesign: a nimble form (smaller, ~0.31 of a tile, not necessarily a pure
   ball) and a true rage transformation in the energizer / overdrive. Stages:
   1. **The `heroes` prototype: all three directions rejected** (the page is deleted). A ninja
      ball with a headband, B a jelly, C a predator cub / maned beast, each with a rage form. The
      owner liked the ideas, not the execution. Lessons for the next round:
      - the art must match the rest of the game: build on the heroes' own material (`Hero.ts`:
        the palette ramp, rim and bounce light, highlights, particles), not a new flat painter;
      - one tile: small accessories (a headband, ears, a tail, many spikes) turn to noise there;
        the silhouette must read on its own;
      - the body stays inside its tile: no shape that stretches into an oval;
      - the headband idea was liked, but it reads badly at one tile.
        Next: the feel first, on the current art (stage 2), to see how much of the missing force was
        the art at all; then the art from a reference the owner approves (his mock-up, or one made
        from Claude's written briefs), reproduced in code at the game's level.
        1b. The `rage` prototype (second round, on the heroes' own machinery: 1, his flame mane / her
        wings; 2, his molten core and comet tail / her crystal): rejected too, deleted. The clue the
        owner took from it: the element works for the heroes (the fiery Pac-Man), and Ms. Pac-Man
        should be an element as well. Why it keeps coming back (talked through with the owner): the
        circle with a mouth already reads as a celestial body, the hero's verb is to consume (fire,
        a star, the black hole of the death), one tile kills details but keeps light, colour and
        motion, and a stream of fire is the speed the heroes lacked.
        1c. **The `elements` prototype (built, awaiting the owner's word;** `node prototypes/pacman/
build.mjs elements`, `?v=1|2|3&scene=sheet|compare|seasons|maze&season=`): the everyday form
        first, as the owner asked (the trail and the rage after it), in three variants, all on
        `PacmanHero` / `MsPacmanHero` with the body's paint their own (`Hero` got an always-on
        `drawAura` hook; `MsPacmanHero` a `drawBow` hook):
        - 1, fire and a nebula (`elements/forms.ts`; the owner: "looks better", kept as variant 1):
          an ember core in a mantle of anime flames that rise at rest and stream back along the
          run; a deep violet body with clouds and stars drifting inside, a halo of star dust, her
          bow a ribbon of light. 0.33 of a tile.
        - 2, cosmos, from scratch (`elements/cosmos.ts`): a sun (self-lit radial bands from a
          white heart to a red limb, their edges boiling; a corona of twelve turning rays,
          straight and wavy in turn, under one ink line, that the run stretches back into a solar
          wind; glints of sunlight for a trail) and a galaxy (deep space with a tilted spiral
          galaxy turning inside, a glowing limb, a pale cloud round her eye so the lashes read;
          her bow a bipolar nebula: two glowing lobes, a star at the knot). Tried and dropped on
          the way: soft additive rays (unseen on the floors), prominence loops (read as a
          teapot's handles), thin rays (a sea urchin); orange rays were too close to autumn's
          orange hedgehog, so they are gold.
        - 3, fire and water, from scratch (`elements/fireWater.ts`): each hero a drop of its
          element, one silhouette and one ink line (the tail painted under the body with its ink
          and again over the body's ink outside it): flat anime fire running from the body into a
          flickering tail and two side licks, which rise at rest and sweep back on the run, little
          flames for a trail; Ms. Pac-Man blue water, cel-shaded under the key light (a hard
          highlight, the light gathering on the far side, bubbles rising), all but round at rest
          and drawn out on the run, a water bow, coral lipstick, droplets for a trail. 0.32 of a
          tile. The rolling ball's meridians are off on variants 2 and 3 (they read as lines on
          the element).
        Next, once the owner picks a look: the flexible trail, then the rage (an inferno; her
        overdrive a supernova or its water/galaxy counterpart).
   2. The feel, whatever the art: the size, real corner cutting in `PlayerService` (a turn
      pressed early takes the corner on the diagonal; the ghosts cannot), the rage's dash
      (+20-25 % fading to +10 %) and its bite (a stronger hit-stop, the ghost's crunch, the chain
      200-1600 rising); the balance bot checks the ramp after.
   3. The chosen art in detail: turning, chewing, the death, the turn into rage and back, Ms.
      Pac-Man; then all that hangs on the old heroes: the HUD's life icons and the menu's hero
      coins (SVG), the mask's ghost form (her bow), the death's black hole.
      Kept: no tongue; Ms. Pac-Man's bow.
5. **Season scenes, in code** (Opus for the look, one season per chat, prototype first). None is
   started: the winter prototypes (`winter-scene`, the New Year dressing, and
   `winter-materials`, the wall materials) were both dropped. Today a season is a palette and a
   few props on one meadow; the owner wants a whole scene per season, in the maze and in the
   background, not a recolour. Lessons kept from the dropped winter rounds: the accepted season
   art (the background, the ground, the pellets, the palette) is the base; top-down only, no
   pseudo-height; the maze silhouette, the corridor width, the food and the heroes' readability
   unchanged; the static baked into `MeadowBake` (what is painted over `drawWorld` lies over the
   baked atmosphere); no new full-screen passes (a settled season: High 3, Medium 1, Low 1). The
   order: winter (New Year), autumn (Halloween: pumpkins, cobwebs, bats, a gravestone or a
   lantern, the walls and the ground dressed too), then spring and summer (themes to be decided
   with the owner). Rules that still hold: the walls and the corridors keep their full width,
   nothing hangs in the air in the maze, the decor sits on a surface and moves little, and every
   important thing reads at the size of one tile.
6. **Mazes**: the owner reworks the weak ones.

## Part II. Boss levels

1. **The hell: the polish and what is left** (Opus for a look, Sonnet for the steps). The hell is
   in the game: the flesh world, the maze of charred iron plates (with a little blood and rust),
   the heroes, Blinky and the imps, the weapons, the attacks, the light. The look's rules, kept
   from the owner's rounds: one flesh world with no void; the maze is built of blocks (the owner:
   walls are best as blocks, living matter does not suit a maze) with no height, face or
   extrusion, so the corridors keep their full width; the surround is not dimmed (a darker
   surround makes the maze hang in the air); no bright bone or anything that jumps forward; few
   bold details on a surface; a slow heartbeat (about 2.5 s) and a calm background; the teleport
   is the iron gateway (cyan, with chevrons that flow in); the night stays
   `cord`; the heroes are the season heroes plus the BFG charge. Start from the `hell`
   prototype (`node prototypes/pacman/build.mjs hell`: "Бой" runs the real fight, the attack
   buttons force an attack, "Бессмертие" keeps the hero alive, "Фаза 1-3" jump to a phase; query
   `?ms`, `?zerk`, `?chg`) and the `mood` prototype. Left (the owner: everything else in the
   hell is done):
   1. **The hell's music track** (the owner brings it: generated or a free licence).
   2. **Balance and a polish pass** of the whole fight.
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

- **Weak graphics.** The owner's report: on PCs with integrated graphics the controls feel
  sluggish from the start of a level, while the animation stays smooth (a GPU-bound frame
  queue); the atmosphere was the heaviest layer. Done: a season bakes its settled atmosphere
  into the background (`ARCHITECTURE.md`, Rules of thumb), so Medium and Low blend one
  full-screen layer and High three, instead of four; the tiers cap the canvas at DPR 1 / 1.5 / 2.
  Measured in Chromium without a GPU, winter, 1600x900, day / storm and night, before → after:
  at DPR 1 High 38 / 34 → 49 / 44 FPS, Medium 50 / 43 → 60 / 60, Low 59 / 57 → 60 / 60; at DPR 2
  High 12 / 9 → 15 / 13, Medium (2400x1350) 58 / 48. The picture is the same within the noise of
  the weather particles (High), the swap to the baked copy differs by 0.5 of 255 on average.
  The graphics setting is in the menu and on the pause screen (Auto by default, `DESIGN.md`
  §2); in the same browser at DPR 2 Auto goes from High to Medium in the first seconds of play
  and stays there. Nobody has measured it on a weak PC yet (the owner has none at hand): Auto
  judges by the frame times, and the report was of smooth frames with late controls, so check
  there that Auto does step down; if the frame times stay short while the controls lag, feed it
  the rAF backlog as well. If it still lags there:
  High's two live maps (the drifting mist costs two passes), a Low that renders below the
  screen's resolution, then the hell's maze-sized glow layers (`emis` and `glow`, drawn
  additively twice, four times at night) and the hell's ground; the hell does not bake its
  atmosphere yet and its quality tiers only cap the DPR. The dev frame meter reads FPS,
  update/render p95, the rAF backlog and input-to-render latency.
- Headless Chromium without a GPU runs the hell night at ~20 FPS and the flesh hell's first
  frame blocks for about a second while `bakeFlesh` paints the world (once per level). Nobody
  has timed either on real hardware; if the bake shows, spread it over frames.
- The `hud` prototype does not build: it imports a `GameHud.svelte` that no longer exists (the HUD
  was split into `SeasonHud`, `SeasonHudStack`, `BossHud`). Fix or delete it when it is next needed.
- The `collectibles` prototype throws "undefined is not iterable" in a `forEach` while it draws
  the item row and so never reaches the exit; find it when the prototype is next touched.
- `Hero.ts` is still large (~960 lines); the sprite-free heroes are one class family, cut what
  no longer serves.
- Not checked in play: the hero's death over the black hole, the hell's and Ms. Pac-Man's
  deaths, a low-end GPU, the hero going through a season tunnel, the hell's night and ash storm
  over the cord maze.
