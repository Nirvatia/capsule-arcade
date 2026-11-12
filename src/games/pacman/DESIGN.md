# Pac-Man (neo-arcade) — design document

What the game is and how it plays. How the code is built: `ARCHITECTURE.md`. What comes
next: `ROADMAP.md`. Numbers live in the config files named in each section; this document
quotes them for reading, the code is the source of truth.

## 1. Concept and tone

A maze-chase game in the spirit of the arcade classic, set in living worlds: four seasons
that turn into each other, a hell with a boss every fifth level, and a hidden 80s arcade.
The look is organic and alive, not metal: soft bodies, breathing, squash and stretch,
cute where it can be, harsh where it must be (the hell). Everything important reads at the
size of one tile.

## 2. Players and controls

- Two profiles, picked in the menu or with `H`: **Pac-Man** and **Ms. Pac-Man**. They
  differ in their energizer power (§4) and in which worlds they see (only Pac-Man goes to
  the hell, §7).
- Arrows or `WASD` steer. A key may be pressed early (the turn is taken at the next
  junction) or up to 0.15 tile late; a reversal turns round on the spot; a held key keeps
  steering through pauses, deaths and fades.
- `Enter` confirms (start, resume); READY cannot be skipped. `F` / `Shift` fires a hell weapon,
  `Space` / `P` pauses, `M` mutes and unmutes the sound, `H` switches the hero in the menu and
  on the game-over screen. `Esc` does nothing: leaving a game goes through the pause screen's
  Menu button.
- English by default, Russian switchable (remembered).

## 3. The run

- A new game starts on level 1 with 3 lives and runs until the lives are gone.
- Level `n` is a season: 1 summer, 2 autumn, 3 winter, 4 spring, then again
  (`logic/level/SeasonCatalog.ts`). Every 5th level is the hell, for both heroes. Boss levels do not count in the season cycle: season levels run 1–4, 6–9, 11–14, … Later a random boss world joins on every 5th level (roadmap, part II). The four season mazes `grid_01`–`grid_04` come one per season level: the first cycle in order, every later cycle in a random order (never the same maze twice in a row), so each run of four plays all four. The hell and the secret level keep the old maze for now.
- Level 7 hides the way into the secret level (§8, the arcade); after it the run continues
  on the level after the one it was entered from.
- Score and lives carry over between levels. Extra life at 10 000 points, then every
  30 000 (`config/scoreConfig.ts`).

## 4. Core rules (season levels)

- **Speeds**: Pac-Man 6 tiles/s, ghosts 5.4 (scared ×0.6, eyes ×1.6); seasons tune them
  slightly (§6).
- **Food**: dots 10, energizers 50. Clearing the board wins the level: +1000, and +2000 more
  for a perfect clear (no death, no dot lost).
- **Energizer (Pac-Man)**: the ghosts turn scared and turn round for the season's power time
  (6–6.5 s); they flash in the last 2 s. Eaten ghosts give 200, 400, 800, 1600 within one
  energizer and run home as eyes.
- **Overdrive (Ms. Pac-Man)**: instead of scaring, an energizer starts a 5 s overdrive.
  Touching a ghost hypnotises it for 4 s (+200). Touching another moves the hypnosis over
  (+200) and frees the first, scared. A ghost that wakes up on its own is enraged for 2 s
  (faster, deadly). The hypnotised ghost plans once, for the time it has, by path length (as
  a ghost walks: no turning back, tunnels count): with at least 6 dots it can really eat in
  that time it is a **feeder** (green pupils): it follows the greedy route from dot cluster to
  cluster (the dots on the way count, an eaten corridor is not walked twice) and eats for her,
  at 0.8 of its speed. With fewer, or too far, it is a **hunter** (red pupils): it chases the
  nearest other ghost out of the lair by path, at its full speed, and eats it on touch (it
  goes home as eyes, +200 for each, no chain). The mode holds for the whole hypnosis; a
  hypnosis moved to another ghost plans again. A frightened ghost within 4 tiles of a hunter
  runs from it, not from her. With no food and nobody to hunt, it stays a feeder.
- **Death**: touching an active ghost costs a life; the board shatters and rebuilds from
  the respawn point (§10). No lives left: game over.

### Ghosts (season levels)

Four ghosts with fixed names and colours: Blinky (red), Pinky (pink), Inky (cyan), Clyde
(orange). They leave the lair one by one (0, 3, 6, 9 s) and alternate scatter (7 s, each
to its corner) and chase (20 s). In chase Blinky heads straight for Pac-Man, Pinky for a
point ahead of him, Inky for a point mirrored through Blinky, Clyde chases from afar and
backs off up close (`logic/actors/GhostService.ts`). Their eyes look where they are going.

**Difficulty ramp** (`config/difficultyConfig.ts`): season levels get harder up to season
level 13, boss levels not counted. Per level: ghosts +0.9 % speed (never above the hero's own
speed, at most +10 %), energizer -0.35 s (not below 2.5 s), scatter -0.25 s (down to 4 s),
chase +0.7 s (up to 28 s), lair exits 4 % earlier (down to half), hypnosis overdrive -0.17 s
(down to 3 s). Level 1 is the base game. The secret level uses its own rounds. Tuned with the
balance bot: about twice the deaths at season level 10 as at level 1, still cleared.

## 5. Bonuses

- **Fruit**: two per level, after 70 and 170 dots, on a fixed pad, for the season's fruit
  time (12–14 s), blinking as it runs out. Values: cherry 100, strawberry 300, orange
  500, pretzel 500, apple 700, pear 1000, melon 1000, banana 2000, Galaxian 2000, bell 3000, key 5000.
  The kind follows the arcade orders (`logic/bonuses/fruitCatalog.ts`): Pac-Man cherry,
  strawberry, orange ×2, apple ×2, melon ×2, Galaxian ×2, bell ×2, then the key; Ms.
  Pac-Man cherry, strawberry, orange, pretzel, apple, pear, banana on levels 1–7, then one of those at random, fixed per level so the HUD row agrees.
- **Lair code and the Easter egg** (level 7): eat (or, for Ms. Pac-Man, hypnotise) the
  ghosts in the order Blinky, Pinky, Inky, Clyde. Every ghost stops and vanishes (1.2 s:
  it swells, shrinks and rises as it fades, sparks in its colour) and is gone for the rest
  of the level; the lair gate slides into its posts (0.8 s); the Easter egg appears in the
  lair's centre, between the ghosts' spawns. Pac-Man walks in and takes it: the remaining
  dots turn into points, +500, and the arcade starts. Clearing the dots first just ends
  the level.
- **Echo clone** (both heroes, season levels only): a rare bonus. About a third of the levels
  (`config/echoConfig.ts`) get one token, on an eaten dot tile at least 8 steps (by path) from
  the hero, once a random 30-70 % of the dots are eaten; it waits 8 s. Taking it sets off a
  riot: 7-9 echo wisps run out of the token's tile in different ways for 2-3 s, eating the dots (the usual 10
  points) and the fruit they meet, never the energizers. A clone dies on an active (or
  enraged) ghost; frightened ghosts and eyes are harmless to it. If the clones eat the last
  dot the level ends as usual.

## 6. Seasons

One meadow world in four seasons, each with its own colours, landmark (hay bale, picnic
blanket, beach umbrella, snowman), meadow decoration, food sprites and weather
(`render/seasons/<season>/<season>Theme.ts`).

- Food stays calm and small: dots about a fifth of a tile with no inner detail;
  energizers differ from dots in shape, colour and size, and never look like food or a
  collectible. Each season has its own: a cherry blossom (spring), a starfish (summer), a
  jack-o'-lantern (autumn), a snowman (winter); the pellets are a yellow button, a white
  pebble, an amber bead and an ice drop. All are ink-outlined, in the heroes' cel style
  (`render/seasons/meadow/seasonFood.ts`).
- Food is drawn over the weather and the night, like the actors: it always reads. The
  floor is dark enough for the dots, the lair floor muted so ghosts and the egg read on
  it; the weather stays faint (no big pale blobs over the board).
- **Weather** rises at 50 % of the dots eaten (spring petal wind, summer heat shimmer,
  autumn rain, winter blizzard); **night** falls at 75 %.
- Gameplay tuning (`SeasonCatalog.seasonModifiers`): spring power 6.5 s; summer fruit
  14 s; autumn ghosts ×0.97; winter Pac-Man ×0.97.
- **Tunnel** (the pads at the maze's sides): two tiles before a pad the hero curls into a
  rolling ball of his own kind and flashes: Pac-Man a gold ball with fire swirls, fire drops
  circling it and fire sparks behind; Ms. Pac-Man a pink ball with her bow's scarlet polka-dot
  ribbons wound round it, twinkles and hearts circling and shed. At the pad the season's
  particles gather into it and flash; at the exit a ring goes out with a burst of them. The
  ball keeps rolling for about 0.6 s after the tunnel, then opens back up with a flash.
  Heroes only; the ghosts go through unmarked (the hell has its own fog).
- **Season turn** (level clear): beads of light run down the corridors from the last dot,
  then every tile flips like a card to the next level's world, with that world's
  particles thrown up at the front. The next level starts in place, without a fade.

## 7. The hell (boss level)

Both heroes play it with the hell's own kit (weapons, pickups); Ms. Pac-Man's overdrive and
hypnosis have no ghosts to work on here, and her berserk shows as her powered look.

Level 5 (and every 5th): a burnt version of the meadow with lava, pentagrams and teleporter
pads, and no ghosts but their lord.

- **Boss: Blinky, lord of hell** — a red demon ghost, one tile in size, 1500 HP, three
  phases (at 1000 and 500 HP), each with its look and attack set
  (`logic/doom/DoomBalance.ts`):
  - phase 1: ambush chase, dash, rift (the corridor burns end to end);
  - phase 2: + seals (the junctions ahead of Pac-Man burn, a hit if standing on one, then
    stay locked), pull, cross, void trail; an ash storm rises;
  - phase 3: + split (boss and echo close in from both ends), eruption (a disc around
    Pac-Man, then the ring around it), corruption of the outer corridors (slows), blink,
    brood (imps: small horned ghosts in Pinky / Inky / Clyde colours); night falls.
  - Every attack is telegraphed and checked for fairness: there is always a way out.
- **Player**: 3 HP in the fight (separate from lives). Losing them drops Pac-Man into the
  abyss: the run goes on to the next level without losing a life.
- **Weapons** (corner pickups, one slot): BFG (charge, then a green orb), barrel (placed,
  explodes), berserk (a fist: faster, bites the boss, minions extend it), medkit.
- **Reward**: when the boss dies a heart appears at the far end of the maze from the player
  (it has to be run for) and an exit far from both;
  taking either ends the level as a win, the heart also gives +1 life.
- Direction rule: every actor shows where it heads (eyes; the imps add a small chevron; the boss's eyes are enough
  on the tile's leading edge; Pac-Man has his mouth).

## 8. The arcade (secret level)

Our own 80s-style arcade inside the game (not a copy of any existing game's art, rules or
sound): pixel art at 10 px a tile through a light CRT pass, stepped 30 fps animation,
chiptune sound (`config/arcadeConfig.ts`).

- Three rounds on the main maze, each faster; fruit pear, pretzel, melon; a cleared round
  pays 2000, the last one 10 000 more. After round 2 an intermission: Blinky chalks an
  ambush plan on a board, Pac-Man eats the chalk.
- Its own 3 tries, carried between rounds: dying never costs the game's lives; losing all
  tries returns to the main game with no penalty.
- Plain Pac-Man rules for both profiles (energizers scare), no egg, no echo.
- Ghost characters: Blinky the hunter (straight at Pac-Man), Pinky the ambusher (the
  junction he runs into), Inky the herder (the junction behind him), Clyde the keeper
  (guards the quarter with the most food, chases only up close); per-round scatter / chase
  waves, then chase for good.

## 9. Feedback and effects

- Eating a ghost: a 0.12 s hit-stop, a flash, a shockwave and sparks in the ghost's colour,
  a score pop-up, a small shake.
- Energizer: a big shockwave (it may leave its tile), the season's particles, an edge pulse. Fruit and egg: a burst of
  the season's particles and a pop-up. Extra life: "1UP". A ghost brushing past: a whoosh.
- One style for all seasons, coloured by the season. The hell and the arcade keep their
  own effects.
- The shockwave (`fxDraw.drawWave`) is the one ring look: a fast front, a soft disc behind
  it, a fainter trailing ring, a dark rim. A hit's second ring is fainter and thinner.
  The tunnel (a gather, a wave at the far mouth) and the echo clone's pop use it too.

## 10. Flow and screens

- Menu (profile, high score, language) → READY (5 s with a jingle on a new game,
  2 s after a death or a level change) → play. The session's first game starts at once
  (the menu already shows level 1); later games go through a fade.
  READY is not skippable: it always runs its countdown, and no screen has a Skip button.
  The lives left ("2 LIVES LEFT", "LAST LIFE") are shown as a small board under READY after a
  death, never during the death's black hole, so the transition is not covered.
- The maze's walls (the board without its empty border) take 80 % of the screen's height
  (`BOARD_HEIGHT_SHARE`), at most 92 % of the width, below the HUD band.
- Buttons on the screens (the hero coins, Start, the language and sound knobs) lift a little on
  hover; the target under the cursor itself never moves, so the hover cannot flicker. The main
  button (Start, Resume) has no glow or extra frame.
- Pause from READY, play, death and level clear; it resumes the same moment. A hidden tab
  or a lost window focus pauses on its own.
- Death, a black hole (4 s): the colour drains along the corridors from the death point, the
  world is squeezed into a disc, twisted and pulled into a point whose rim burns in the
  world's colour, the singularity flashes, and the level unfolds again from the respawn point,
  grey at first, its colour returning along the corridors (each season and the hell have
  their own palette). Pac-Man's own death plays on top. The arcade has its own pixel death.
- Game over: score, new record, play again (input locked for 1 s so a held key does not
  restart at once).
- HUD on the season levels (landscape screens, aspect 1.5 and up): things that stand in the
  world, in the margins at both sides of the maze, in the world's own material (wood, ice, bark
  and cloth; the owner's mock-up). Left: a score board on two stakes and a record tag hung under
  it. Right: a level board with the world's emblem, a cloth banner with its name, a lives
  counter (the hero and a painted number), a trail of the season's pellets for the food left
  (eaten ones are holes), a dial with the season's energizer and a ring that runs down (the
  seconds inside; the night, at three quarters of the dots, dims the whole HUD with the world), and
  a pause knob in the corner. The boards sway, the hero and the energizer bob. No fruit row (the
  owner dropped it). The sound switch is a knob of the same stuff at the bottom left, in every
  world. On a tall or squarish screen the same things are smaller and in two bands, one above the maze
  and one below it (top: score board and record tag, level board with banner, lives; bottom:
  the food trail, the dial, the pause knob, and the sound knob at the left). The boss levels have their own, in bone, flesh and ember (the same skeleton plus the boss's):
  above the maze the boss's health bar, a riveted iron plate like the maze's walls with the boss's
  name, the number and three phase pips above it and a dark trough in three compartments, one per
  phase, that drain from the right: hot-metal fill with a white-hot leading edge, the phase reached
  framed, burned-out compartments cracked, white-gold in the last phase (the reward hint hangs
  there once he falls); the hero's hearts on a bone rail, apart
  from the lives counter; a dial with the weapon in hand whose ring is the BFG's charge or the
  berserk running down (the berserk is a fist in flame, the dial glows red and the ring is pale
  gold, so it is not lost against the orange); the numerals glow like embers and the hearts beat at the hell's pulse.
  The arcade has its own
  arcade HUD (1UP, high score, round, tries, the rounds' fruit).

## 11. Audio

Sample sound effects on the season levels and the hell (`static/assets/pacman/sfx/`):
start jingle, chomp, energizer, ghost eaten, fruit, death, extra life, the siren and the
scared loop. The arcade synthesises its own (`audio/ArcadeSynth.ts`).

## 12. Art direction (keep)

- Organic and alive, not metal: soft bodies, breathing; the heroes stay round (their size
  pulses on a spring, they are never stretched into an ellipse).
- Effects stay inside the tile (no coronas spilling onto walls).
- Pac-Man (the owner's "Shonen" mock-up): a cel-shaded gold ball in hard tone bands with a white highlight and the season's rim light on the nape, a thin ink line (heavier in the shadow), no eyes, a wide wedge mouth (about 92° open) with a dark cavity and a tongue. Powered: cream, gold and orange-red bands, ink-outlined ki flames behind, a star on the highlight.
- Ms. Pac-Man (the owner's "Maho-shoujo" mock-up): his pair, pink and cel-shaded: a big glossy eye with a gradient iris, an ink wing on the lid, a lash and a brow, blush strokes, red lipstick on the ends of the lips, a little fang, and a scarlet polka-dot bow on a spring with a flower on its knot that carries the season (blossom, sun, maple leaf, snowflake). Powered: the bow glows, rose-gold ki flames, a lifted brow, a star in the eye.
- The heroes' trail is the season's own particles shed along the path (petals, sparks, leaves, snowflakes; Ms. Pac-Man's twinkles; fire when powered): never lines, ribbons or puffs (they read as sticks, strings and gas), and it bends with a turn.
- Eyes show where an actor is heading.
- Food is calm (§6); energizers read differently from dots.
- Boss: harsh and dangerous, changes visibly by phase, fits in one tile.
- Ash and night are driven by boss phases, never by UI buttons.
- Fruit: one file per fruit (`render/items/fruit/*View.ts`), each with its own art.
- Fruit, the heart and the exit stay inside their tile, glow included: the object is 0.78
  of a tile, the bloom hugs it, no halo spills onto the walls.
- One style for all of them: a clear silhouette with a wide dark outline, gradient fill,
  a gloss and a glint (`render/common/itemPaint`); the mock-ups' looks are not kept.
- A boss level ends by the player's choice: the heart (+1 life) or the exit.
- **The hell's weapons and pickups (in the game)**: BFG (a steel cannon with a green lens),
  barrel (acid green, a flame mark, a lit fuse), berserk (a cream fist in an orange flame, the same
  as the HUD's icon: a dark iron gauntlet was lost on the grey plates), medkit (white with a red cross), each with a
  wide dark outline, a light top and a gloss. The acid greens and the flame part from the red flesh and the grey plates; red would sink. The exit is a door of the walls' iron standing ajar in a
  riveted frame, cold light pouring out onto the floor, the only cold thing in the flesh (the
  owner's pick over the old bone arch, which was seen but did not read as an exit). The heart stays the mint heart
  with a plus. The BFG orb is a pale green-white plasma with a green halo; the berserk's claws
  are orange.
- **Blinky and the imps (in the game)**: the arcade ghost silhouette, cel-shaded like the
  heroes (hard tone bands, a thick ink line, a rim light), bone horns, ink brows over yellow eyes.
  One body colour, the arcade red, in every phase (the other colours are the imps': Pinky's,
  Inky's and Clyde's, kept with their heading chevron). The phases differ by iron, the maze's own:
  phase 1 short bone horns; phase 2 an iron helm; phase 3 the helm, cheek plates and long iron
  horns. No wound, cracks, second pair of horns, glow or flames: each phase adds one thing, so the
  shape stays readable at one tile. The echo is violet. A red body sinks into the red flesh, so the
  ink line, the eyes and the rim light carry him.
- **The boss's attacks (in the game)**: one visual language, so danger reads at a glance on the grey
  plates and the dark floor, and a warning never looks like a blow or a slow like damage.
  _Damage_ (the rift, the cross's arms, the eruption's disc, the seals' junctions): the warning is
  amber hazard hatching that marches over the tiles and a dashed edge, no glow and no fill; the blow
  is a white-hot core with an orange edge and a dark outline, one continuous beam along a rift or an
  arm, a disc of hot tiles with a shock ring for the eruption. What a rift leaves is only soot.
  _The seal_ keeps its ring and pentagram, outlined in ink and lit pale: while it burns the ring
  closes and the star is drawn stroke by stroke on a darkened tile; once locked it is a dark plate
  with the whole glyph, a temporary wall that does no harm. _A void cell_ left by the boss is an
  iron shutter with braces, rivets and a dim red sigil, also a temporary wall. _Slowing_ (the
  corrupted corridors of phase 3): black glossy tar with bubbles, clipped to its tiles, nothing
  burns. _The pull_ is unchanged (cords with ember beads).
- **The hell's heroes (final, as they are)**: the season heroes (the owner's decision: they stay as they are, no hell mark, no armor) plus one thing the hell adds, the BFG charge: the body swells and the mouth gapes, a green ring closes in on it, a glow lights the throat, white-hot at the end; the release is a recoil and a flash. The berserk is the awoken look (his ki flames, her glowing bow). The rolling ball at the rifts is the heroes' own.
- **The hell's night and storm (in the game, first version)**: the night is a neutral dark maroon that multiplies the world, cut by a light map that follows the corridors from the player, the boss, the pickups and the bursts (the player's light follows him smoothly); the cord's and the wounds' own light is drawn again over the dark, so the maze stays readable as a glowing lattice. The storm is ash streaks and embers with a warm tint. The owner kept the night as it is (`cord`); the storm's redesign is still open (`ROADMAP.md`, part II, step 1.1).
- **The hell's look (in the game)**: the flesh hell. One flesh for the whole
  world, no void and nothing hanging in the air; the maze is built of charred iron plates (the owner's pick, "metal doom"): one block to a tile,
  neutral and lighter than the red floor so the maze parts from the ground in grey too, each with a
  bevel, a seam and four rivets, every island edged by a dark outline with a thin hot line that
  pulses with the heart. No height or face (the bevel is inside the tile), so the corridors keep
  their full width; the lair's gate (two riveted leaves of the walls' iron with glowing slots, between two iron posts) slides open only for whoever goes through it, the boss, his echo or an imp (leaving the lair, or stepping into the doorway from the corridor; never for the boss running past) and shuts behind them; the corridor floor is a dark flesh, and the ground outside the maze is not
  dimmed further (a darker surround makes the maze hang in the air). A little rust (stains in the corners, streaks from the rivets) and blood (spatters, in patches, some with drips) sit on the plates, so they belong to the scene. Ribs half buried, veins, cysts and pools of blood around; a slow heartbeat
  light (a breathing swell, not a flash: the owner found the sharp beat tiring); few, bold details on a surface, nothing hanging; a calm background. The teleport is an
  iron gateway set in the end of the corridor (the maze's own iron with rivets and lamps), a cyan
  field with bands running along it and chevrons flowing in from the corridor, so it shows where it
  leads; cyan is used nowhere else in the hell, so it is never lost against the red. The boss is redone to
  read on it (`ROADMAP.md`, part II, step 1).

### Art status

| Element                                                         | State                                                                                                       |
| --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Seasons (world, food, weather, night), season turn, death decay | final as palettes; a full scene per season (Halloween, New Year) is to come (ROADMAP I.3)                   |
| Blinky lord of hell, imps                                       | final: cel-shaded like the heroes (part II, 1.2)                                                            |
| Hell world (the flesh hell)                                     | final: the accepted scene is in the game (part II, 1.7a); weather and light follow                          |
| Hell weapons                                                    | final (part II, 1.3)                                                                                        |
| Arcade                                                          | final (keeps its own pixel HUD)                                                                             |
| HUD                                                             | season worlds: final (side HUD, part III 1-2); the hell, narrow screens, arcade: to come                    |
| Screens                                                         | seasons and the hell: final (part III 4-5); the arcade keeps its cards                                      |
| Fruit, heart                                                    | final (inside the tile, calm glow)                                                                          |
| Hell pickups (BFG, barrel, berserk, medkit), the exit           | final: the heroes' ink-outlined style (part II, 1.3)                                                        |
| Easter egg                                                      | final: a painted egg (pink, lilac, mint, blue)                                                              |
| Pac-Man                                                         | final; the same in the hell, plus the BFG charge's light                                                    |
| Ms. Pac-Man                                                     | final: the owner's "Maho-shoujo" mock-up in code; the same in the hell                                      |
| Season ghosts                                                   | final: a tulip bud, a turtle, a hedgehog, a bunny (one painter, a shape per season)                         |
| Echo clone                                                      | final: echo wisps (an ice disc with a notch, halo, comet tail, threads between neighbours), 0.255 of a tile |
| Teleporters, ring effects                                       | final: shockwaves (5.4), ripple pad (5.5)                                                                   |

## 13. Boss worlds to come (ideas, not designed)

Each new boss level is still Pac-Man in a maze, but with its own boss, mechanic and way to play;
the hell is combat, so the others must not be. The order proposed (`ROADMAP.md`, part II, step 3):

- **TRON**: the hero's light trail becomes a wall for a few seconds, the boss rides a light cycle
  that cuts the maze. A spatial puzzle on a neon grid.
- **An Alien Isolation style stalker**: darkness, a flashlight cone, one hunter that cannot be
  killed, a motion tracker, the vents as tunnels. Stealth.
- **Sharkboy and Lavagirl**: a tide of water and lava floods the tiles in waves, sharks patrol the
  water. Terrain, a playful tone, clear of the hell's reds.
- **A Bomberman style world**: blasts along the maze's lines. To be thought through.

Zombies were rejected (a horde with weapons is the hell again). Each world gets a one-page design
the owner approves before code.
