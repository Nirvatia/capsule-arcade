# Pac-Man — roadmap

What is left to do. The game: `DESIGN.md`. The code: `ARCHITECTURE.md`. What was done and why:
the git history of `feat/pacman` (every stage ends in a commit that says what it did). Done work
is not logged here; only the open stages and the rules that constrain them.

## Working agreement

The owner decides when a new chat starts; do not suggest one. For a step, the assistant reads the parts of `DESIGN.md` and `ARCHITECTURE.md` the step needs, analyses the code,
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
   cornering. Kept: no tongue; the heroes' looks are the owner's mock-up `Heroes.html` (in the game
   2026-11-25, carried over as drawn; `DESIGN.md` §12): Pac-Man the cinnabar vessel, Ms. Pac-Man
   the jade vessel. Left: the owner plays them; then delete the sun and the comet (`PacmanHero`,
   `MsPacmanHero` and their tests; `drawIceBow` moves to the mask) unless the icons want them. The
   menu/HUD icons are simplified vessels since 2026-11-26 (`heroIcon`), the sun and the comet
   are not needed for them.
   **Fruit heroes: in the game** (2026-11-27; `render/actors/hero/FruitHero`, `DESIGN.md` §12): an
   orange for Pac-Man, a watermelon with a gold bow for Ms. Pac-Man, the buff's ice rim and fizzy
   ribbon, the calm juice ribbon; the HUD and menu icons follow. The glass vessels stay as the other
   look (`heroSkin`, the dev panel's «Герои»; no player-facing choice yet). The prototype pages
   `fresh-fruit` (the owner's version and mine side by side) and `fruit-final` stay until he has
   played the fruits. Left: the owner's play (the size, the bow at game scale, the fruits on the
   station's black hive and in the hell: the orange reads on both, the watermelon on the hell's red
   flesh is unchecked); whether the vessels deserve a menu choice or go; the fruit's death in play;
   the ability and the hell's overlays on the fruit (drawn by the base, unchecked); then delete
   the vessels, the sun and the comet if the owner wants no second look.
3. **Mazes**: the owner reworks the weak ones.
4. **Music**: the support is in (`WORLD_MUSIC`; `OST.md` the format, the rules and local generation, `OST_GAME.md`, `OST_HELL.md`, `OST_STATION.md` the briefs and prompts). The owner is replacing the whole soundtrack and renaming the game (2026-11-27): the tracks carry no title.
   Left: the owner's real tracks (the hell's replaces the synthesised placeholder; the station
   next; the seasons optional).

## Part II. Boss levels

1. **The hell: polish and what is left.** The fight is in the game; the boss's dash is the lava
   ball (the owner's pick of `hell-dash`, 2026-11-23). Left: the hell's real music track (a
   synthesised placeholder plays now, `OST.md`) and a balance/polish pass of the whole fight; whether the dash wants a warning
   stripe along its line (the turn into the ball now ends the telegraph, the line shows only by
   his eyes). Start from the `hell` and
   `mood` prototypes. Look rules kept: one flesh world, no void; walls as blocks sitting in the
   floor (light from the top left, a cast shadow), no height or extrusion; surround not dimmed; nothing bright that jumps forward; few bold details; a slow
   heartbeat (~2.5 s); the teleport is the iron gateway; night stays `cord`; no round marks on the
   spawn's and the fruit's tiles (removed 2026-11-28).
   **The hell, the owner's list (2026-11-27)**: he finds the fight too empty (most of the time you
   wander an empty maze) and the BFG too strong. Done: the BFG's orb 350 to 250 and its tracers 150 to
   100 (six orb hits for the boss, was five), the tar pool keeps a margin from its tile's edge (tested).
   **The redesign is approved (2026-11-28, `DESIGN.md` §7 "The fight, redesigned")**: food charges
   the BFG, the split is the phase change (at 1000 and 500 HP, the core in a corridor, 18 s of plain
   Pac-Man, eaten ghosts are damage and stun), the berserk is one rush, the snare replaces the
   barrel, the plasma and the armour are new pickups, the pickups leave the corners. Steps, one per
   chat: (a) the playable prototype `hell-phase` on the real boss (`DoomBossService`) with the new
   rules in its own `rules.ts`, placeholder art for what is new: built, awaits the owner's play;
   (b) the rules into `logic/doom` (food in the map and `assertDoomMap`, the split in the boss's
   state machine, the arsenal) with tests; (c) the art: the food's sprite, the four ghosts (equal,
   the boss's armour darker than the imps now), the rush, the snare, the plasma, the armour, the
   core; prototype first; (d) the HUD (the charge ring, the split's timer; the BFG's charge must
   show while another item is in hand, the prototype hides it under the snare).
   The owner played it (2026-11-28): "plays briskly"; his rule, in the prototype: the stun only for
   all four eaten (no HP then), fewer give 75 HP each and no stun.
   **Earlier mock-ups** (`prototypes/pacman/hell-phase`, built from the game's own hell):
   (1) **food** for the empty maze. Round one (souls, bones, eyes): the souls' glow hurt the eyes, the
   bones read but were noisy, the eyes were too faint. Round two (bone, fang, bigger plain eye, each on a
   small shadow, no glow): the eye reads best, but **the owner picked the fang** (2026-11-27: it does
   not clutter the maze and is easy to see). The game turns the drawn maze's dots into floor and
   `assertDoomMap` demands a map without them, so food needs both changed; its effect (score, heals, the
   BFG's charge) is open. (2) **the split**: four still frames were rejected (unconnected, the omen read
   as a sticker); now a **playable scripted loop** (arrow keys; fight 7 s, the omen, the burst, 22 s of
   plain Pac-Man with the weapon shut off, the four running back into the lair, the weak boss 4.5 s that a
   touch hits), on the real hero, maze, food and the ghosts' chase (`PlayerService`, `DronePack`);
   open: how long, whether the energizers stay (they do in the mock), what surviving earns, the real
   boss's pathing and attacks instead of the generic chase. **A hole the owner found: the mock returns
   the four into the lair and opens it, but the hero never enters the lair and the BFG's orb stops at
   walls, so the weak boss could not be hit. The boss must re-form in a corridor the hero can reach and
   shoot along (and why there needs a reason).**
2. **A random boss on every 5th level, for both heroes**: in (`logic/level/BossCatalog`). It
   draws from `BOSS_ROTATION`, the finished bosses: the hell and the station (since 2026-11-26).
   Left: difficulty scaled by level number, not world, now that a second boss is in.
3. **Each new boss world** (design first, one page the owner approves; mechanics on placeholder
   art, then art in code). Still Pac-Man in a maze, a different boss/mechanic/way to play, never
   a reskin of the hell. Like the hell: `*Bake` + `*World` + a level renderer with `preview()`, a
   death `style` and a season-turn style; every element but the heroes has art of its own.
   1. **The station** (the focus again since 2026-11-25; `DESIGN.md` §7a). In the rotation since
      2026-11-26 (the owner; the dev panel's Station still brings it at once). The look is approved (2026-11-22): style B
      of the `station` prototype (deleted), now lit. History: the ghost version (in the game:
      `StationService` with HP, the rewind, the beam, flares, cocoons; `render/station/`), then
      the swarm (`prototypes/pacman/swarm`, `logic/station/SwarmField`, `stationSwarm`: the bugs
      glitched, a fluid threat read fuzzy), then the hounds (`prototypes/pacman/hounds`,
      `logic/station/HoundPack`, `stationHound`: they played, but the owner disliked the hounds'
      look and the endless dark). The redesign of 2026-11-25: **a squad** of four with plays
      (the train, the pincer, the mimics, later the threads), each with a tell and an answer,
      power cells, the food charging the hatch, and **an escape** as a scene along a lit route,
      made easy. Steps:
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
         play: tune (the hounds and the swarm are deleted, 2026-11-26). The tripwire and the
         shadow are in reserve.
         The owner played v2 (2026-11-25): much better; two creatures stuck rocking at their
         posts (fixed: one that reaches its post hunts on, tested), the escape still easy.
         **Escape v3** (same day, awaits his play): a free way, the squad in a rage, 1-4 more
         breaking out (`logic/station/EscapeRush`), his breakthrough lane (Space, two per
         escape), a pulse that reaches 3 tiles only (`DESIGN.md` §7a).
         The owner played v3 (2026-11-25): it works; the tactics stay as they are, with two
         problems to solve next: (1) **the fence's beams cross walls**: the idea is liked, but
         the hero must be held by the maze itself (e.g. fencers sealing the corridors that
         join two parts of the maze: a cut on the maze's graph of corridors, each seal a short
         barrier from wall to wall); (2) **the lurker can hardly be told from food**: the
         out-of-step breathing is not enough; it needs more cues that can be learned (it sits
         only on eaten tiles already). The owner has a mock-up of the level and is making one
         of the mimics with Gemini (one HTML file of Canvas2D code: the creature's states and
         effects per tactic); both came to be reproduced in code.
         **In the game (2026-11-25, the dev panel's Station)**, the owner's call to try it so
         and tune after: the level's look is his mock-up `Station_Level_v2.html` carried over as
         drawn on `grid_station` (`render/station/b7`); the squad were the glass albinos of his
         `Station_Mimics_2.html` (since 2026-11-26 the Pretenders, below); the rules are the prototype's, now
         `logic/station/StationRun` in place of `StationService`; a lurker lies as one of the
         level's spores with the tells of `MimicTells` (a shadow, off the centre, its eyes now and
         then, a tremble when he is near, the breathing out of step; the run's first lurkers teach:
         a slow fold, farther along his way, stronger tells); the escape is dark (the alarm's light)
         with a flashlight round the hero; the fire key is the breakthrough. Left, from the
         owner's play: the tells' contrast (they read subtle at game scale) and whether he wants
         the hero's glance as a tell; the fence still lights whole lines through walls (the cut on
         the maze graph needs sectors: `grid_station` has no 60-75% split with 2-3 seals, the
         best takes 6-7; waits on his answer); the station's HUD (a text readout stands in); the
         level's first frame blocks ~0.8 s in the bake (the base and three infestation layers).
         The old `StationService` (and its tests) stays until the owner has played this; then
         delete it (the style-B painters and the squad prototype are gone, 2026-11-26).
      3. **The creatures' look**: the Pretender since 2026-11-26 (below); the glass albino
         before it, deleted.
         The owner's first play (2026-11-25), done the same day: the albinos glided
         (deleted with them); a touch costs one of three
         HP, in the escape too (no restart; safe 1.5 s; the screen's edges pulse red); the escape's
         lure on the fire key (two per escape: far from him, off his way; the enraged run to it
         round him); no route lights; the phantom is the glass body almost clear; the infection
         is one value from the hatch's charge and slowly the time, revealing the infestation from
         the lair out and sinking the light (lamps fail one by one, the beacons rise); the power
         cells are cold blue-white plasma; synthesised music (calm, a dread layer by the
         infection, the escape) and effects (`audio/StationSynth`, OST.md). The owner's second look
         (2026-11-25): the infestation B is in the game (`render/station/b7/b7Veins`: veins under
         the wall plates, sick amber wall edges, spores on a few crests, the floor clean but a thin
         stain; to be refined later); the station has its own HUD (`StationHud`: the game's boards
         in riveted steel, square and still, smaller; `StationBar` above the maze: the hatch's
         charge and the infection, the alarm in the escape; the HP as hearts, the one just lost
         flashing; the lure's dial in the escape); the in-canvas readout is gone. The power cell is the hot coral
         (the owner's pick). The third look (same day): no teleport into hiding: the lurker walks
         to its tile and folds there, the venter walks into the nearest vent and comes out of the
         one by his way (`StationSquad.going`; tested); a disguised lurker glides its creep; the
         screens (READY, pause, the menu's plates) are the station's steel, square and still (a
         riveted plate with hazard bands for READY).
         The owner (2026-11-26): a gliding or crawling body reads clumsy on the rails, worst on a
         180; the season ghosts' grammar works (upright, feet, eyes that show the way). **The
         Pretender is in the game** in place of the albino (`render/station/pretender`, the
         `pretender` prototype's sheet, `DESIGN.md` §7a; the rage without a ring, the mask up and
         the true face). The lurker's eye tell is its gold slit eye now
         (`drawLurkerEye`, turned toward the hero), and the albino, its glide, the hounds, the
         swarm and the `creatures` page are deleted (2026-11-26). Left, from his play: its
         readability at game scale; the phantom as the Pretender almost clear; then delete the
         spore hermit and the station-b7 page's candidate keys.
      4. **The fence is the quarantine zone** (`DESIGN.md` §7a; the goal hints done too: a beacon
         held on the console, then the hatch, and the HUD's goal line). It began as a ring
         (2026-11-26); the owner (2026-11-27) chose the bile film for its look, then redrew its
         shape: no circle and no plugs in the walls but **a stepped block of the maze's tiles**,
         each corner cut by its own staircase, walls included, wall islands and the lair never cut
         (`logic/station/QuarantineZone`, tested; `render/station/quarantineRing`). The block holds
         the hero to the tile; the corridors that leave it carry the seals. The lure
         is a cyan signal flare (`lureFlare`); the squad's size is the stepper's (0.9 of a tile). The rage
         is the red maniac (2026-11-27, step 6; it was an acid overheat); the flare is cyan; the cells go out at
         the alarm; the rage 10% smaller; the console and the exit are tokens of the matrix (`CN`,
         `EX`; the exit shut until the escape), the breakout comes from the vents and the
         containment's door; the matrix holds one vent pair less until the owner redraws the vents
         and the exit.
         **The zone's art is redrawn** (2026-11-27, the owner: the seals were bulky, the warning and
         the zone's highlight wanted better art; three candidate seals on the `station-b7` page,
         his pick: the **shutters**): the seals are two thin steel leaves closing from the walls with
         hazard bars on their free ends and a lit seam; the outline is one crisp line with a soft band
         inside and no veins; the warning is an amber hatch, a dashed outline and chevrons on the
         doors where the seals will stand (`DESIGN.md` §7a). The laser beam and the thread were the
         other two; not kept. Left: the shutters' weight at station scale (a closed seal reads as a
         small lit dot with its leaves thin; thicken if the owner wants it bolder); the zone's size (9-11 tiles) and the
         corner cuts by hand; the zone not yet seen in a live game (the logic and the painter are
         tested apart); the frame series of the tell, the charge and the tearing in the game's
         painter; how often the thin seal comes; whether the outline wants a line along the maze's
         rim. The spore cloud stays in reserve (the owner likes it). Then a fourth tactic if the
         three need company (the tripwire or the shadow).
      5. **The total takeover** (the owner, 2026-11-26: the veins lack the feeling of alien
         organics seizing the station; agreed: flesh over the plates by phase, volumetric veins
         with nodes, a heartbeat out of the lair, cysts on crests, lamps under film). Candidate C
         in the `station-b7` page (`?scene`, `hiveC.ts`): the veins reach every wall by 90%, the
         flesh trails them and covers all at 100% (the escape). The owner likes it; the beat
         every 6 s and soft (it hurt the eyes); the lair (the owner: no flesh lips for a gate):
         massive blast doors torn apart from inside (a breach a tile wide, the ends bent outward,
         petals of steel, flesh oozing through), no hazard lintel; lips over the pit's rim, cords
         to the cocoons; the grate and the old cocoons kept (the owner; `createB7Scene`'s
         `lairDoors: false`). In the game since (`b7Hive`), with the lamps under the film (they shine
         on warm, beating with the hive) and the Pretenders larger with a soft glow (the hero's
         too). The world with the hive bakes in ~0.7 s in headless Chromium. The reveal
         stalled the frame as he ate (the owner, a 5070 Ti; each step of its front masked two
         stage-sized layers into new canvases, ~+85 ms in headless Chromium, 141 times a level);
         now it repaints the front's tiles into one standing canvas (no stall). Left: the
         heartbeat's cost on a weak GPU.
      6. **A new look for the infestation and the squad**: in the game (2026-11-26, after many
         candidates; `DESIGN.md` §7a lists what was dropped): the hive is a black parasite with a
         lime life (its form kept). The squad were amoebas of gel; the owner found them drifting
         jellies without expression or a sense of life on the grid and (2026-11-27) picked the
         **stepper**, a blob on four feet with a face and a character per kind, its rage the
         maniac (`render/station/stepper`, in the game with all its looks: calm, the tell, the
         fright and its white blink, the rage by a heat value, the eyes running home, the fold
         into the spore). Left: the lurker's eye tell is still the Pretender's gold slit eye
         (whether it changes, the owner); the stepper's size and feel on a real screen (it is
         drawn at 0.9 of a tile, its crest within the tile); the heat's size jump out of the
         rage; the station's red beacons at high infection may want amber or lime beside the black
         hive; parasites crawling the veins now and then, the cysts as clutches (the owner liked
         the idea).
         **The rage is the maniac** (2026-11-27, the owner's pick of three characters after four
         rounds of faces; `DESIGN.md` §7a): the lime overheat (cracks, sockets, a grin) read badly
         and sloppy; rounds of clean faces followed (a unibrow, thick brows and pupils looking
         apart were rejected). In the game: a hot red body in flat bands, bulging white eyes with
         tiny pupils on the heading, a thin raised brow over each, a grin ear to ear with two
         rows of pointed teeth that chomps (`render/station/stepperRage`); no cracks, soot, bubbles,
         embers or glow at the heart. The maw (tiny eyes, a huge fanged mouth with a tongue) and
         the cyclops were the other two; not kept. Left: his play at game scale (24 px included);
         the red rage beside Blinky's calm red and the hell's reds in the dark maze; whether the
         four kinds want a touch of character in the rage (now one face for all).
         From the owner's play (2026-11-27), done: the rage's glow spilled onto the walls (now
         inside the tile, fainter); a runner standing in a corridor on his way froze there when the
         lure was thrown (the lure's closed ground is now crossed when there is no other way,
         tested). Left: sometimes only 3-4 enraged are seen where 5-8 are meant (squad 4 + 1-4
         runners; a simulation with a still hero gives 5-8 every time): stunned runners are drawn
         pale blue as in the fright, and the pack runs nose to tail so the sprites overlap, both
         unproven; wants the owner's repro.
      7. Into the game: the squad and the escape in place of `StationService`'s ghost parts;
         the station's HUD; both heroes' station look (a prototype first); the hatch, the doors
         and the route's art; the caught transition and the world turn; sound; a performance
         check of the lit station.
   2. **Sharkboy and Lavagirl, a tide**: water/lava flood tiles in waves, sharks patrol, safe
      islands change. Playful; palette clear of the hell's reds.
   3. **A Bomberman world**: tried and dropped (2026-11-25, `DESIGN.md` §13): waiting on a fuse
      breaks Pac-Man's motion. Recoverable from commit `e65ce2a`.
   - Zombies rejected (a horde with weapons is the hell again). TRON dropped for the station.
     Bomberman dropped. Candidates: a Dig Dug-like quarry (the yard's art reused), the tide.
   - **Nightwood dropped** (2026-11-27, built and played): "light against the dark" in an Alan
     Wake style does not work in Pac-Man. **A rule for every boss world: the maze reads in full
     light**, no dark mazes (the station's endless dark hid the walls and the enemies too). The
     code, the prototype and the dev entry are removed (the git history keeps them).
   - **The Zone dropped** (2026-11-27, built twice and played: "careful exploration, Pac-Man runs on
     drive"). The code stays unwired (`logic/zone`, `render/zone`, `prototypes/pacman/zone`, `DESIGN.md`
     §7b); delete it when the owner says. **The drive test** it left, a rule for every boss world: the
     hero never has to wait; only what chases him costs a life; the rest helps or offers a risk for a
     reward; few things on the maze, bold and readable.
   - **The Net dropped** (2026-11-27, played: "just Pac-Man with gates; no escape from the drones in the
     alarm"): a tool without a goal, and my surge made the drones faster than the hero. The code stays
     unwired (`render/net`, `prototypes/pacman/net`; `logic/net`'s drones and doors live on in the
     Port); delete when the owner says. Rules it left: **a boss world must change the objective, not
     only add a tool**; and **there is always a way out: the hero is never slower than what chases him.**
   - **The Port, played** (2026-11-27): the owner passed it twice without trying; the art was
     unreadable (every container its own colour, everything coloured at once); "partly works", he is
     thinking. What he sees in the other two: the hell keeps Pac-Man's tension (you flee the boss's
     attacks all the time and look for chances), the station is pure Pac-Man, harder, with traps. So
     **the hunted boss must still threaten the hero** (attacks to flee, not only drones), the world needs
     **few hues** (one dominant colour, accents rare), and the first pass should be hard.
   - **The Port is the current candidate** (`DESIGN.md` §7d): the hero **hunts a boss** (the Broker,
     a smuggler AI hacking four crane terminals one by one; catch him at a terminal or on the run, three
     bites end him, if he hacks all four he gets away), the port's drones hunt the hero, the yard gates
     slam shut behind him (they cut the drones and the Broker's way), nuts charge a dash, power cells
     slow the Broker and scare the drones. A container terminal at night. A playable prototype:
     `prototypes/pacman/port` (rules in `logic/port`, picture in `render/port`, tested). Left: the
     owner's play and tuning (`config/portConfig.ts`); the names; his own maze (`grid_port` is a first
     one, terminals in `portConfig`); the weather and the day variant; the Broker's phases' looks, the
     drones' catch-me moments, sound, the HUD; the fruit heroes' look here; then wiring
     (`LevelSession`, `BossCatalog`, the dev panel).
   - **Art standard for every boss world** (the owner, 2026-11-27, after two worlds fell short of the
     game's level): a **maze of its own** (never another world's flipped), a **whole scene round it**
     (the seasons' houses and parasols, the hell's ribs and cysts: here the sea, a ship, cranes,
     warehouses), materials with **light and depth** (a bevel or rim, one light from the top left,
     shadows down and right, wear), **detailed cached sprites** with a dark outline and a rim light; and
     few things on the corridors. The ideas weighed (2026-11-27): from modern games a hack, a wanted
     level, a beat-locked maze, a purge wall; from retro Lady Bug's gates (taken), Thief's doors,
     Rally-X's smoke, Pengo's blocks, Qix's territory.

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
- `Hero.ts` is still large; cut what no longer serves.
- Not checked in play: the hero's death over the black hole, the hell's and Ms. Pac-Man's deaths,
  a low-end GPU, a season tunnel, the hell's night and ash storm over the cord maze.
