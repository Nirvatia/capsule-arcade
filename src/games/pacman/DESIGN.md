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
  steering through pauses, deaths and fades. Cornering, as in the arcade: a turn pressed
  within 0.4 of a tile of a junction is taken at once and the hero runs the corner on the
  diagonal, gaining that much ground (the ghosts cannot).
- `Enter` confirms (start, resume); READY cannot be skipped. `F` / `Shift` spends the carried ability on a season level (§5) and fires a weapon in the hell,
  `Space` / `P` pauses, `M` mutes and unmutes the sound, `H` switches the hero in the menu and
  on the game-over screen. `Esc` does nothing: the pause screen's Menu button returns to the
  Pac-Man menu, and Game Select leaves for the arcade's game-selection page.
- **Touch screens** (a phone, a tablet): a swipe anywhere on the game steers, and the finger
  kept down keeps steering, as a held key does; a drag that bends turns again without lifting
  the finger. The HUD's dial is the button: it spends the ability on a season level and fires
  in the hell. The menu's CONTROLS plank (touch screens only, remembered) adds an on-screen stick
  (the owner's pick A, 2026-11-24): a floating stick under the left thumb, no small arrows; a
  finger anywhere in its zone (the left of the lower HUD band on a tall screen, the left margin
  on a landscape one, never over the maze) sets the base there, the knob's lean steers, a drag
  past the rim pulls the base along; at rest a faint stick waits. The ability's dial is a big
  button under the right thumb; on a tall screen the pause knob sits up by the lives board; on a
  touch screen the sound knob leaves the play and waits in the pause. START, the pause knob and
  the screens' planks are tapped. The page does
  not scroll, zoom or select under the fingers; the first touch starts the sound. The menu's
  chalk board shows the touch help instead of the keys.
- The sound knob sits in the bottom-left corner; hovering it slides out a volume slider (on a
  touch screen with room beside the board the slider stays out). The volume is remembered;
  turning it up from silence unmutes.
- English by default, Russian switchable (remembered).
- Graphics: a plank under the menu and under the pause screen, one click to the next setting:
  Auto (the default), High, Medium, Low; remembered. Auto starts on High and steps down by
  itself while the game cannot keep its frame rate and a lower setting really is faster; it
  never steps back up on its own. High is the full picture: the screen's own resolution (up to
  twice the css size), the mist drifting and the sun rays flickering. Medium and Low keep the
  same scene with the mist and the rays standing still, at a lower resolution on a dense screen
  (1.5 times and once the css size).

## 3. The run

- A new game starts on level 1 with 3 lives and runs until the lives are gone.
- Level `n` is a season: 1 summer, 2 autumn, 3 winter, 4 spring, then again
  (`logic/level/SeasonCatalog.ts`). Every 5th level is a boss level, for both heroes: the boss is picked at random per run from the finished bosses and never the same twice in a row while there are two (`logic/level/BossCatalog.ts`, `BOSS_ROTATION`). Now that is the hell alone: the station (§7a) is shelved, unfinished, and comes only from the dev panel. Boss levels do not count in the season cycle: season levels run 1–4, 6–9, 11–14, … The four season mazes `grid_01`–`grid_04` come one per season level: the first cycle in order, every later cycle in a random order (never the same maze twice in a row), so each run of four plays all four. The hell and the secret level keep the old maze for now.
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
  energizer and run home as eyes. Pac-Man dashes while it lasts: +20 % speed for its first
  second, then +10 % to its end, a step with no blend (not in the arcade).
- **The energizer's blow (both heroes)**: the play stops for 0.1 s as it is eaten (§9).
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

### Abilities (season levels, both heroes)

A rare power the player carries and spends at the right moment. There are three: **echo**,
**mask** and **shock**. They are modest on purpose: one per level at most, and only worth it
in the right situation.

- **The token.** A season level rolls once (`config/abilityConfig.ts`): about half the levels
  get one ability token, of a kind picked at random (equal odds), the others get none. Once a
  random 30-70 % of the dots are eaten the token appears on an eaten dot tile 8-18 steps (by
  path, tunnels not counted) from the hero, on a way that does not pass through or beside an
  active ghost (no such tile now: it tries again a moment later). It waits 8 s and blinks in
  its last 2 s; missed, it is gone for the level. At most one token per level, never a second.
- **The icons.** The three tokens (and the HUD slot's icons) are one family, medallions (the
  owner's pick of the `power-icons` prototype, 2026-11-23; `render/actors/abilityIcons.ts`): one
  gold rim with a coin's notches, an enamel field in the ability's colour (echo teal, mask gold,
  shock blue), a white sign with an ink outline (the echo a wisp with three copies running off
  it, the mask a ghost, the shock a bolt), in a breathing halo of the same colour.
- **The slot.** Taking the token puts the ability in the hero's slot (shown in the HUD). It
  stays through a death on the same level and burns at the level's end, unspent or not.
- **Spending.** `F` / `Shift` spends it. Not during an energizer (Pac-Man) or an overdrive (Ms.
  Pac-Man): the press is refused with a short fizzle and the ability stays. An energizer eaten
  while the mask or the shock runs ends that ability at once (the energizer works as usual); an
  echo riot keeps running.
- **Echo.** 7-9 echo wisps run out of the hero's tile in different ways for 3 s, eating the dots
  (the usual 10 points) and the fruit they meet, never the energizers. A wisp dies on an active
  (or enraged) ghost; frightened ghosts and eyes are harmless to it. If they eat the last dot the
  level ends as usual. Worth it in a part of the maze still full of dots.
- **Mask.** The hero turns into a ghost for 5 s (blinking in the last 1 s): the ghosts do not
  touch it, and the ones in chase go to their scatter corners instead (they lose the hero). It
  eats dots and fruit as usual but cannot eat or hypnotise ghosts. When it ends inside a ghost,
  the hero is untouchable for 0.5 s more. Worth it when the hero is cornered.
- **Shock.** A discharge strikes the nearest active (or enraged) ghost within 6 tiles of the
  hero and jumps on to every other one within 6 tiles of a ghost already struck. Struck ghosts
  stand still for 3 s (shaking in the last 0.5 s) and stay deadly to touch: the shock stops them,
  it does not open a way through them. Scared, hypnotised and lair ghosts and eyes are not
  struck. With no ghost in reach the press is refused with a fizzle and the ability stays. Worth
  it when the ghosts bunch up close.
- While the mask or the shock runs, the HUD slot shows the time left.

## 6. Seasons

One meadow world in four seasons, each with its own colours, landmark (hay bale, picnic
blanket, beach umbrella, snowman), meadow decoration, food sprites and weather
(`render/seasons/<season>/<season>Theme.ts`).

- Food stays calm and small: dots about a fifth of a tile with no inner detail;
  energizers differ from dots in shape, colour and size, and never look like food or a
  collectible. Each season has its own: a temari thread ball (spring), a starfish (summer), a
  jack-o'-lantern (autumn), a red Christmas bauble with a white snowflake (winter). The pellets
  have a silhouette of their own and one simple detail, in a colour apart from their season's
  walls (the owner, 2026-11-23): a cherry petal (spring), a popcorn puff (summer), an eyeball candy
  (autumn), an ice-blue snowball (winter). All are ink-outlined, in the heroes' cel style
  (`render/seasons/meadow/seasonFood.ts`).
- Food is drawn over the weather and the night, like the actors: it always reads. The
  floor is dark enough for the dots, the lair floor muted so ghosts and the egg read on
  it; the weather stays faint (no big pale blobs over the board).
- A season dresses the maze itself through opt-in bake hooks on its theme
  (`MeadowBakeTheme.wall.paint`, `paintWalls`'s `foot` for a band at the walls' feet,
  `.floor.paint` per cell, `.wet` for the ground after rain, the scene's `wallDress` on the
  stone). Every season shares the base: the shared stone, the corridor one opaque tone with a
  contact shadow, the lair the common tile floor. Winter (`winter/winterDress.ts`): a full snow
  blanket on the walls (the stone a thin rim, the corners' rounding kept), a thin snow bank at
  their feet that leaves the corridor its width, a dark blue-grey corridor of trodden snow, rare
  short icicles under long walls. Autumn (`autumn/autumnDress.ts`): wet leaf litter at the walls'
  feet, wet moss on their edges and a few stuck leaves. Spring's walls are the shared stone in light sandstone with young moss in the joints and a moss
  band at their feet, the corridor earth (the owner's pick, 2026-11-23, after the Japanese garden
  was rejected: spring must not read as summer, nor glare). Summer's walls carry Jumanji-like
  lianas (`meadow/wallFlora.ts`): few thick curving stems along the open edges a step inside the
  silhouette, wrapping round the rounded corners, big leaves now and then, never a mat over the
  top; roots and shoots at the walls' feet. Winter's snow reaches the arc on the roundings, so
  the stone contour shows along the straight runs only. The snowman stays the winter landmark.
- **Holiday scenes** (the owner's picks of the `season-dress` prototype, 2026-11-23, refined to
  his questionnaire and reviews the same day): each season is a finished holiday scene on the same meadow and layout
  (the pond and the stream where they are), all seen from above and baked, a few moving bits
  live. Autumn is **Halloween** (cobweb fans over the walls' outer corners and spiders, carved
  pumpkins whose lid cuts glow and whose light spills on the ground, candles, two small
  graveyards, sheet ghosts lying in the grass, a witch's cauldron, a big orb web on the grass,
  bat shadows gliding over the meadow, faint rain rings). In the rain autumn's ground gets wet instead of misty: the theme's `wet`
  layer (baked once at half resolution, faded in over ~12 s as the storm soaks it, part of the
  settled bake, no extra pass) darkens the ground, makes the stone's rims, the roofs and the
  bridge glisten and fills puddles (one tile each, lying wide across the corridor with an uneven edge; larger
  ones on the meadow); at night the nearby lights lie in them as soft spots. The rain is a careful downpour (dense,
  thin streaks, rings on the floor), a few leaves blow across it. Winter's weather is a blizzard:
  dense flakes in three depths with a faint cool rim, gusts, thin streaks of drifting snow. No
  white veil; while it blows fresh snow piles up a little at the walls' feet and on their lit rims
  (the theme's `wet` layer, as autumn's wet ground). Where
  the lair meets its entrance, the corridor's tone runs into its tiles (no hard step). Winter is **New Year** (a
  decorated tree with presents and sparklers beside each snowman, lights round the cabins' roofs
  and on the bridge, warm window light, holly on the lamps). Spring is a **hanami** (every tree in
  blossom, petal carpets, blankets, paper lanterns between the trees and in two strings from lamp
  to lamp, petals on the walls). Summer is a **fair** (striped tents, festoons, balloons, a
  turning carousel beside each umbrella, pennants along the festoons between the tents, none on the walls). What glows lights up at
  night: the scene's lamps and windows as even pools on the ground without a halo round the lamp;
  the energizers' and portals' light is soft at night; a storm never brightens the night (its
  tint, the mist and the warm light fade out as the night falls, the weather dims). The walls' stone and rounded corners are never repainted: what lies on them is a pass of
  its own clipped to their silhouette, checked by the prototype's pixel guard: a dress may cover a
  wall's top but never the stone rim along the rounded corners. No season has grass blades at the
  walls' feet any more.
- **Weather** rises at 50 % of the dots eaten (spring a soft petal wind with pollen
  motes, summer heat haze with poplar fluff, autumn a careful downpour, winter a blizzard); **night** falls at 75 %.
- Gameplay tuning (`SeasonCatalog.seasonModifiers`): spring power 6.5 s; summer fruit
  14 s; autumn ghosts ×0.97; winter Pac-Man ×0.97.
- **The lair gate** (live, `meadow/lairGate.ts`; the owner's pick A of `lair-gate`, 2026-11-24):
  a wooden double gate in the walls' 3/4 view (boards, a Z brace, iron hinges, a ring latch)
  between two stone posts in the season's wall stone (summer a warm stone beside the hedge),
  dressed by the season: spring a blossoming twig and a flower on each post, summer a vine with
  a yellow flower and leaf tufts, autumn caught leaves and a small pumpkin on each post, winter
  a thin snow line with icicles and snow caps. Opening, each leaf slides into its post.
- **Tunnel pads** (baked): each season's burrow under a small translucent live ripple (winter an ice
  hole, autumn a hollow stump, spring a sandstone well, summer a whirlpool in the sand;
  `meadow/burrows.ts`), on a trodden patch where the corridor's tone runs out past the pad and fades into the meadow with a
  ragged edge of the season's ground cover (no worn path). Winter's cabin roofs lie under one
  snow cover with a dark ridge. The meadow's trees and shrubs are the season's own (`meadow/flora.ts`):
  winter firs with snow on the lit tips and bare frosted shrubs, autumn half-bare russet crowns with
  the branches showing and twiggy shrubs with last leaves, spring sakura and fresh maples with
  azaleas in flower, summer thick green crowns and shrubs with red berries. The cabins are homes
  (`meadow/homestead.ts`): a bench by the door, a woodpile against the far wall, a small lamp by
  the door that lights the ground as a pool at night (paths and fences were tried and dropped).
  No sticker patches (`meadow/seasonDetails.ts`): the roofs carry fallen leaves and moss in the
  joints (autumn), handfuls of petals (spring), sun-faded tiles (summer); the meadow's stones give
  way to leaf piles, clover with dandelions, dry grass. The chimney smoke is a touch fuller.
- **Tunnel** (the pads at the maze's sides): two tiles before a pad the hero curls into a
  rolling ball of his own kind and flashes: Pac-Man a gold ball with fire swirls, fire drops
  circling it and fire sparks behind; Ms. Pac-Man a pearl ball with one continuous silver-white
  spiral, twinkles and one pink star circling it. At the pad the season's
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

## 7a. The station (boss level)

**Approved by the owner on 2026-11-25.** The second boss world: an abandoned
research station, lit, and the thing that got out of its quarantine lab is a **squad**: four
creatures that hunt together and change how they hunt. Working name "the station" (code id
`station`); the owner names it and the squad. The horror is **surprise**, not darkness: the
player sees everything and cannot be sure what the squad does next. The goal is an **escape**:
power the hatch, then run a lit route out, played as a scene. Third design: the ghost version
(ghosts on rails broke the horror, the darkness hid everything), then the swarm, then the hounds
(they played, but the hounds looked wrong and the endless dark hid the walls and the enemies).
Numbers are starting points, later in `config/stationConfig.ts`.

- **The rule of surprise**: every play of the squad has a **tell** (1-1.5 s before it: the
  station's lights flicker, a sound, the creatures' eyes turn one colour) and an **answer** the
  player can find. A surprise without a tell is unfair; with one it reads "they are lining up:
  the train is coming".
- **Place in the run**: shelved until done (out of `BOSS_ROTATION`, the dev panel's Station
  brings it).
- **Heroes**: both, each with a station look of their own (prototyped first). Controls and speed
  unchanged. The station's kit only: no season abilities, no overdrive or hypnosis, no fruit, no
  Easter egg.
- **The squad**: four creatures of one tile, no legs (bodies like the seasons' ghosts, their own
  look: a prototype, the owner picks), each with a colour. Its brain (v2, 2026-11-25, after the
  owner played v1: a timer running set pieces made the train the whole show) **reads the hero**
  (his way: on along a corridor, at a junction toward the nearest food he has not eaten, never
  back without a reason; 14 steps ahead), gives each creature a **role** (hunter, cutter,
  fencer, phantom, lurker, venter) and runs **one of three tactics**, picked by what the
  situation offers (none twice running), with a calm beat of 3-5 s between (the classic scatter
  and chase) and a tell of 1.3 s before each (the lights dim and flicker, the eyes turn gold):
  1. **The fence** (the owner's idea): two fencers walk to two lines across the station (a row or
     a column each) and light beams along them; the hero is held in 60-75% of the station (the
     pair is found by a search over the maze graph, tunnels and vents counted, each line needed);
     one hunts him there; the fourth is a **phantom**: unseen, shown only by the light guttering
     round it. Tell: the lines shown faint, then dashed and thickening while the fencers charge
     (1.5 s): he may slip across before they light. A beam stops him, not the squad; it holds
     about 9 s. The fencers holding it do not bite.
  2. **The ambush**: one fades out and lies as food on a tile he has already eaten, along his
     way (the tell for an attentive player: "there was nothing here"; it breathes out of step);
     the others shut every way out of where he is but the one that leads to it. Stepping on it
     holds him 0.8 s while the rest close in. It creeps a tile along the eaten corridors now
     and then, but only while he does not look its way.
  3. **The vent** (the owner's idea): one hides in a shaft near his way (a vent in the outer wall
     or a side tunnel): its eyes and a glow show in the grille all along; as he passes (3
     steps) the glow swells for 1.2 s and it comes out; the others drive him that way.
     The tripwire (one strings a thread across a corridor on his way; touching it calls the squad)
     and the shadow (one follows at a fixed distance and strikes when he stops or turns back) are
     in reserve.
- **The power cells**: four, in the corners (where the energizers are): about 6 s the squad is
  frightened and can be eaten (eyes home, 200-1600), whatever tactic is on: the beams go dark,
  the hidden come out and flee.
- **The food** charges the hatch: the HUD shows the charge; at about 75% of the food the
  escape is ready (the rest is score). The classic eating route stays the core; the mimics turn
  the eaten corridors into the place to watch.
- **Caught** before the escape: the station's three hits (its own, not the run's lives); the
  third ends the level without the reward (the hell's rule), the run goes on.
- **The escape**, a scene (v3, 2026-11-25: the owner found v1 and v2 too easy): the charge is
  full, the alarm turns the station red, the console lights. The hero runs to it; then the way
  is **free** (no doors, no set route: strip lights only show the shortest way to the hatch,
  laid anew from wherever he is). The squad goes into a **rage** (a little faster than he is;
  half at him, half at his way six steps on; from anywhere, not only behind), and **1-4 more
  break out** of the containment's door and the vents (one every 0.6 s), enraged the same way.
  His answer is the **breakthrough** (Space, two per escape): for 2.5 s his way to the hatch
  lights as a lane of white light; whoever stands on it is thrown to the side and stunned
  (1.5 s), none may step on it while it is lit. Kept simple:
  - the first touch is forgiven: his pulse goes off, throws off those within 3 tiles (stunned
    1.2 s), the rest come on;
  - a second touch: the escape starts over from the console (the breakthroughs back), the
    squad held 3 s; no hit lost, the level is never lost in the escape.
    He goes out through the hatch: the level's end and its reward. Measured with two bots: one
    that runs the lights blind loses half its escapes to restarts; one that breaks through when
    something is near (two per escape) gets out every time. The console is at the bottom of the
    maze (12,24), the hatch is the top-left vent (6,1): about five seconds of running.
  - **The goal is held**, not only said (the words fade; the owner: the first time one gets
    lost): once charged, a beacon stands on the console until he reaches it, then on the hatch
    (rings running out over the floor, a column of light, a bobbing chevron, the hatch gauge's
    green); the HUD's hatch line reads → CONSOLE, then → HATCH, pulsing slowly.
- **Light** (no endless dark): the station runs on its working and emergency lights, the walls,
  the floor, the food and the creatures always read; mood comes from light that changes (a
  flicker as a play's tell, a lamp dying in one corridor, the alarm's red in the escape), fog and
  sound. Nothing flashes faster than three times a second, no full-screen flash.
- **The HUD**: the station's own on the boss HUD's skeleton: the hatch charge, the three hits,
  the pulse in the escape.
- **In the game (2026-11-25)**: the look is the owner's mock-up `Station_Level_v2.html` (the
  biolab B-7: the hull round the maze, the biolab with its tanks, the observation deck with the
  storm planet, 2.5D bulkhead walls as engineering modules, the sunken lair pit, the
  infestation creeping per phase, amber bio-spores for food, lab power cells), on the game's
  maze. Its phase follows the hatch: containment, the breakout from half the charge, the
  absorption in the escape; the light is the quarantine's, the alarm's (dark, red beacons) in
  the escape, with **a flashlight round the hero** (the owner) so the dark maze reads. The infestation is a
  **total takeover** (the owner, 2026-11-26; `b7Hive`): from the lair out, volumetric veins
  first (every wall by 90% infection), then flesh over the wall plates (every wall at 100%, the
  escape), cysts, lips over the edges (the corridors' middles stay clean, the walls' amber edges
  keep the maze readable), a soft heartbeat out of the lair every 6 s; the lair's blast doors
  are torn apart from inside, flesh in the breach (its grate and cocoons as before). The squad
  are **Pretenders** (the owner's `STATION_MIMIC.html`, its `smileMimic` refined for B-7,
  2026-11-26; `render/station/pretender`): the season ghosts' grammar (upright, never turned, two
  bean feet stepping with the distance, a lean, eyes that show the way; a gliding or crawling
  body read clumsy on the rails, worst on a 180), drawn at their real point. A creature in the
  squad's colour (a little cooler, a cold rim light) wears a strapped ivory mask (the spore's
  ivory, button eyes that look nowhere, a stitched smile); the mask hangs back and slips away
  from the heading, so a gold slit eye peeks on the heading's side; the tell slips it further
  (the eye pulses, the smile widens); the rage pushes it up onto the head in a moment and shows
  the true face (gold slit eyes, a chomping mouth of bone teeth, a coral throat; it throbs and
  shakes, no ring); the fright is the classic blue with a sweat drop and the blink at the end;
  eaten, its gold eyes run home; it folds into the level's spore for the disguise (the mask
  home, the feet tucked, then the spore). A lurker's **tells**: a soft shadow, sitting off the tile's centre towards a wall,
  its gold slit eye opening for a moment every few seconds, turned toward him, a tremble when he comes within 3 tiles, the
  breathing out of step; the run's first lurkers teach (a slow fold of 1.5 s at least 5 steps
  along his way, every tell stronger, fading over three ambushes). The tells are the logic's
  (`MimicTells`), any body can take them.
- **Art**: the approved style B (2026-11-22), lit: the quarantine lab (scorched bulkheads with
  claw gouges and soot, heavy deck plates with drag trails, the specimen tanks, the hull breach,
  the dead crew, the window in the deck onto the storm below), a cold grade, light grain. The
  lair is the burst containment the squad comes out of. The food: plain energy capsules (the owner: the spores' shape is too
  busy), and its mimic, the power cell, the console, the route's strip lights, the doors and the hatch:
  art of their own. The hell's look rules hold: walls as blocks, no height, all reads at one
  tile.
- **Sound**: the station's hum, a sting for each tell, the train's rhythm, the alarm in the
  escape. Samples the owner brings or synthesised: open.
- **Maze**: `grid_station` (no one-tile pillars since 2026-11-25): long corridors with blind
  corners, the side tunnels, vent pairs in
  dead-end pockets of the outer wall; plus the console's tile and the escape route, set by hand.

## 8. The arcade (secret level)

Our own 80s-style arcade inside the game (not a copy of any existing game's art, rules or
sound): pixel art at 10 px a tile through a light CRT pass, stepped 30 fps animation,
chiptune sound (`config/arcadeConfig.ts`).

- Three rounds on the main maze, each faster; fruit pear, pretzel, melon; a cleared round
  pays 2000, the last one 10 000 more. After round 2 an intermission: Blinky chalks an
  ambush plan on a board, Pac-Man eats the chalk.
- Its own 3 tries, carried between rounds: dying never costs the game's lives; losing all
  tries returns to the main game with no penalty.
- Plain Pac-Man rules for both profiles (energizers scare), no egg, no abilities.
- Ghost characters: Blinky the hunter (straight at Pac-Man), Pinky the ambusher (the
  junction he runs into), Inky the herder (the junction behind him), Clyde the keeper
  (guards the quarter with the most food, chases only up close); per-round scatter / chase
  waves, then chase for good.

## 9. Feedback and effects

- Eating a ghost: a 0.12 s hit-stop, a flash, a shockwave and sparks in the ghost's colour,
  a score pop-up, a small shake. Ghost, fruit and egg points read `+200` and so on, in the
  HUD's Lilita One with a gold-white fill, a dark outline and a soft event-coloured glow.
- Energizer: a blow. A 0.1 s hit-stop, a white flash, three shockwaves (the season's, gold,
  white; they may leave the tile), the season's particles and gold sparks, an edge pulse, a
  hard shake; the hero's own beat (wind-up, flash) and his rage look. Fruit and egg: a burst of
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
  counter (the hero, fully inside the board through its bob, and a painted number), a trail of the season's pellets for the food left
  (eaten ones are holes), the ability's dial (the ability carried or running, its ring running
  down with the seconds inside; an empty well otherwise) and beside it, only while the power or
  her overdrive runs, a small badge with the board's own energizer (`energizerIcon`, baked from
  the season's painter) and its own ring and seconds (2026-11-24: the two never share a dial);
  the night, at three quarters of the dots, dims the whole HUD with the world; and a pause knob
  in the corner. The boards sway, the hero bobs. No fruit row (the
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
- The heroes are glass vessels (the owner's mock-up `Heroes.html`, carried over as drawn on 2026-11-25), 0.33 of a tile (the mock-up's 0.295 grown back to the old size, the owner): body, contour and effects reach 0.48 of a tile, like the old corona (a bite's 0.26 s pulse touches the tile's edge).
- Pac-Man, the crimson cinnabar vessel: a glossy crimson glass ball 85% full, an air bubble rolling along the top of the glass and the liquid sloshing on a bite and a turn, gold grains drifting inside, a curved window highlight, a glowing gold wedge eye that blinks, a see-through mouth (no cavity drawn), a cinnabar curl on the nape. The power (the rage) turns the contour inside out: the dark ink becomes a glowing gold rim, the body goes obsidian-ruby. The ball in a tunnel: a gold double spiral on crimson.
- How both heroes move (the owner's brief: a circle seen from above that feels like it moves
  through the maze; the silhouette stays simple, the motion comes from acting and from the world
  answering): the eye looks where the player has asked to turn before the turn comes; a corner is
  really cut (§2), so no drawn lean; the turn itself is a short smear
  along the new heading and kicks up a few of the world's particles; running into a wall squashes
  him against it; a soft contact shadow lies to the lower right (the key light is upper left);
  faint meridians roll back over the body, so it reads as a ball; the dots just ahead lean into
  the mouth and shrink. No tongue for either hero.
- Ms. Pac-Man, the jade squall vessel: the same glass ball in jade, a sculpted cinnabar-red silk bow with a gold knot and swallow tails, a curl of jade wind on the nape, the wedge eye curved; in the power a glowing white-mint rim and an obsidian-jade body. The ball: a jade triskele.
- The heroes' trail is a ribbon stream (the vessels' one exception to "no ribbons"): his a crimson stroke with a gold thread and glossy drops, hers a mint ribbon of wind with white air cuts; in the power the stream mirrors the inverted body (a glowing shell, a dark core, gold stars / a double braid of wind). The same in every season (the owner, 2026-11-25: no season particles on the vessels); it bends with a turn and is never drawn across a tunnel jump.
- The menu and HUD coins carry smooth vector versions of the classic arcade icons (`heroPortrait`), not the in-game sun and pearl star.
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
- **The boss's dash (in the game, the owner's pick B1 of the `hell-dash` prototype)**: not a
  trail behind the body but a transformation. Over the telegraph's last 0.25 s (the crouch, its
  floor glowing and cracking, comes first) the body shrinks into a red-hot lava ball with a net of
  glowing cracks that roll with it; his eyes sit upright on its front, looking where it rolls; the
  phase's iron stays as the axle studs (bone horns, long iron ones in phase 3) and, from phase 2,
  an iron hoop round it like a tyre. It lays a lava track that cools white, orange, red, a dark
  crust breaking into irregular plates (never even hatching: that is the warnings' language), and
  is gone; the track tapers to nothing at both ends and goes on fading after the stop. At the stop
  he turns back into the body over 0.28 s and pants steam that spreads flat over the floor. The
  echo is the same in violet. Everything stays within the corridor's width; nothing flashes.
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
- **The hell's heroes (final, as they are)**: the season heroes (the owner's decision: they stay as they are, no hell mark, no armor) plus one thing the hell adds, the BFG charge: the body swells and the mouth gapes, a green ring closes in on it, a glow lights the throat, white-hot at the end; the release is a recoil and a flash. The berserk is the rage look (his flare). The rolling ball at the rifts is the heroes' own.
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

| Element                                                         | State                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Seasons (world, food, weather, night), season turn, death decay | the holiday scenes in the game (Halloween, New Year, hanami, fair; §6), refined to the owner's reviews; cost unmeasured on real hardware                                                                                                                                                                                                                                                                                                                                                                                 |
| Blinky lord of hell, imps                                       | final: cel-shaded like the heroes (part II, 1.2)                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Hell world (the flesh hell)                                     | final: the accepted scene is in the game (part II, 1.7a); weather and light follow                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Hell weapons                                                    | final (part II, 1.3)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Arcade                                                          | final (keeps its own pixel HUD)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| HUD                                                             | season worlds: final (side HUD, part III 1-2); the hell, narrow screens, arcade: to come                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Screens                                                         | seasons and the hell: final (part III 4-5); the arcade keeps its cards                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Fruit, heart                                                    | final (inside the tile, calm glow)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Hell pickups (BFG, barrel, berserk, medkit), the exit           | final: the heroes' ink-outlined style (part II, 1.3)                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Easter egg                                                      | final: a painted egg (pink, lilac, mint, blue)                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Pac-Man                                                         | in the game: the crimson cinnabar vessel (the owner's mock-up `Heroes.html`); the same in the hell, plus the BFG charge's light                                                                                                                                                                                                                                                                                                                                                                                          |
| Ms. Pac-Man                                                     | in the game: the jade squall vessel with the red bow (the owner's mock-up `Heroes.html`)                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Season ghosts                                                   | final: a ladybug, a turtle, a hedgehog, a bunny with short ears (one painter, a shape per season; the ladybug and the shorter ears are the owner's picks of `animals`, 2026-11-24)                                                                                                                                                                                                                                                                                                                                       |
| Echo clone                                                      | final: echo wisps as spirit flames (the owner's pick B, 2026-11-24): a round teal head with a face, a tail licking back, cel bands, an ink outline, sparks behind; an ink-ring pop at birth, ink-rimmed shards when caught; no halo or threads; 0.255 of a tile                                                                                                                                                                                                                                                          |
| Mask, shock, the HUD slot                                       | final (the `powers` prototype): tokens a gold ghost sheet and an electric ball with a bold bolt and three contacts in a breathing ring; the mask is the season's ghost in the hero's colour (his gold, her violet with her ice bow) in a dashed halo inside the tile, a 0.45 s turn (squash, flash, puff, pop) in and out, a see-through peek in its last second; the shock is branching lightning hop by hop, the held ghosts cold blue with crawling arcs, a shake and a puff of smoke; the dial shows the slot's icon |
| Teleporters, ring effects                                       | final: shockwaves (5.4), ripple pad (5.5)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |

## 13. Boss worlds to come (ideas, not designed)

Each new boss level is still Pac-Man in a maze, but with its own boss, mechanic and way to play;
the hell is combat, so the others must not be. The order proposed (`ROADMAP.md`, part II, step 3):

- **The station** (§7a): redesigned round a squad and an escape (2026-11-25), the focus.
- **A Bomberman world, "the demolition yard"**: tried and dropped (2026-11-25). Played, it became
  "lay a bomb, step back, wait" in a maze crammed with crates: waiting breaks Pac-Man's constant
  motion, and bombs without the wait are just a weapon, which is the hell's. Its approved look
  (sand, asphalt corridors, concrete barriers, crates, brass nuts, the bomb, the blast) and its
  rules can be taken back from commit `e65ce2a` (`prototypes/pacman/yard`, `logic/yard`), e.g.
  for a quarry in the spirit of Dig Dug (the hero digs his way, the ghosts walk his tunnels,
  boulders fall on them).
- **Sharkboy and Lavagirl**: a tide of water and lava floods the tiles in waves, sharks patrol the
  water. Terrain, a playful tone, clear of the hell's reds.

Zombies were rejected (a horde with weapons is the hell again). Each world gets a one-page design
the owner approves before code.
