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

- Two profiles, picked in the menu or with `M`: **Pac-Man** and **Ms. Pac-Man**. They
  differ in their energizer power (§4) and in which worlds they see (only Pac-Man goes to
  the hell, §7).
- Arrows or `WASD` steer. A key may be pressed early (the turn is taken at the next
  junction) or up to 0.15 tile late; a reversal turns round on the spot; a held key keeps
  steering through pauses, deaths and fades.
- `Enter` confirms (start, skip the intro READY), `F` / `Shift` fires a hell weapon,
  `Space` / `P` pauses, `Esc` pauses in play and backs out of screens.
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
  (`config/echoConfig.ts`) get one token, at a random place and once a random 30-70 % of the
  dots are eaten; it waits 8 s. Taking it sets off a riot: 7-9 blue mini copies of the hero
  run out of the token's tile in different ways for 2-3 s, eating the dots (the usual 10
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
- **Reward**: when the boss dies a heart appears where it fell and an exit at the far end;
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
- Pause from READY, play, death and level clear; it resumes the same moment. A hidden tab
  or a lost window focus pauses on its own.
- Death, a black hole (4 s): the colour drains along the corridors from the death point, the
  world is squeezed into a disc, twisted and pulled into a point whose rim burns in the
  world's colour, the singularity flashes, and the level unfolds again from the respawn point,
  grey at first, its colour returning along the corridors (each season and the hell have
  their own palette). Pac-Man's own death plays on top. The arcade has its own pixel death.
- Game over: score, new record, play again (input locked for 1 s so a held key does not
  restart at once).
- HUD: one compact box at the top centre (score and high score, level and world, lives,
  power timer or weapon, dot progress); on boss levels a boss box below it (name, phase, HP
  with phase marks, the player's HP, weapon, berserk, BFG charge, the reward hint). The
  arcade has its own arcade HUD (1UP, high score, round, tries, the rounds' fruit).

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
  barrel (acid green, a flame mark, a lit fuse), berserk (a black iron gauntlet with bone spikes
  and burning cracks, the hero's own berserk look), medkit (white with a red cross), each with a
  wide dark outline, a light top and a gloss. The acid greens part from the red flesh, the iron
  matches the berserk armor; red would sink. The exit is an arch of bone on a bone step with pale
  light pouring out in rays, the only cold thing in the flesh. The heart stays the mint heart
  with a plus. The BFG orb is a pale green-white plasma with a green halo; the berserk's claws
  are orange.
- **Blinky and the imps (in the game)**: the arcade ghost silhouette, cel-shaded like the
  heroes (hard tone bands, a thick ink line, a rim light), bone horns, ink brows over yellow eyes.
  Phase 1 a red overseer with a stitched belly; phase 2 charred and cracked by lava, longer
  glowing horns, the belly split open on his ribs; phase 3 white-hot, a second pair of horns, a
  skirt of flames; the echo is violet. The imps keep Pinky's, Inky's and Clyde's colours and the
  heading chevron. A red body sinks into the red flesh, so the ink line, the eyes and the rim
  light carry him.
- **The hell's heroes (final, as they are)**: the season heroes (the owner's decision: they stay as they are, no hell mark, no armor) plus one thing the hell adds, the BFG charge: the body swells and the mouth gapes, a green ring closes in on it, a glow lights the throat, white-hot at the end; the release is a recoil and a flash. The berserk is the awoken look (his ki flames, her glowing bow). The rolling ball at the rifts is the heroes' own.
- **The hell's night and storm (in the game, first version)**: the night is a neutral dark maroon that multiplies the world, cut by a light map that follows the corridors from the player, the boss, the pickups and the bursts (the player's light follows him smoothly); the cord's and the wounds' own light is drawn again over the dark, so the maze stays readable as a glowing lattice. The storm is ash streaks and embers with a warm tint. The owner kept the night as it is (`cord`); the storm's redesign is still open (`ROADMAP.md`, part II, next chat).
- **The hell's look (in the game)**: the flesh hell. One flesh for the whole
  world, no void and nothing hanging in the air; the maze is drawn as an outline, "the cord":
  islands of dark flesh with a quiet texture, each edged by a dark cord with a thin hot line that
  pulses with the heart, never given height or a face, so the corridors keep their full width;
  the corridor floor is the same flesh as the outside, a little darker, and the ground outside the
  maze is dimmed, so the maze parts from the background. Ribs half buried, veins, cysts and pools of blood around; a slow heartbeat
  light; few, bold details on a surface, nothing hanging; a calm background. The teleport is a
  vertical rift of torn flesh around a seam of light. The boss is redone to
  read on it (`ROADMAP.md`, part II, step 1).

### Art status

| Element                                                         | State                                                                                   |
| --------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Seasons (world, food, weather, night), season turn, death decay | final; death is a black hole (part I, 6.2); the seams between worlds are not done (6.3) |
| Blinky lord of hell, imps                                       | final: cel-shaded like the heroes (part II, 1.2)                                        |
| Hell world (the flesh hell)                                     | final: the accepted scene is in the game (part II, 1.7a); weather and light follow      |
| Hell weapons                                                    | final (part II, 1.3)                                                                    |
| Arcade                                                          | final (keeps its own pixel HUD)                                                         |
| HUD and screens                                                 | final; to be replaced (part III)                                                        |
| Fruit, heart                                                    | final (inside the tile, calm glow)                                                      |
| Hell pickups (BFG, barrel, berserk, medkit), the exit           | final: the heroes' ink-outlined style (part II, 1.3)                                    |
| Easter egg                                                      | final: a painted egg (pink, lilac, mint, blue)                                          |
| Pac-Man                                                         | final; the same in the hell, plus the BFG charge's light                                |
| Ms. Pac-Man                                                     | final: the owner's "Maho-shoujo" mock-up in code; the same in the hell                  |
| Season ghosts                                                   | missing: one generic look today (part I, 5.2)                                           |
| Echo clone                                                      | to redo (part I, 5.3)                                                                   |
| Teleporters, ring effects                                       | final: shockwaves (5.4), ripple pad (5.5)                                               |
