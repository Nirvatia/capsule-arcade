# Pac-Man prototypes

Throwaway pages built **from the game's own sources** (`src/games/pacman`), so a prototype
always shows the real code, not a hand copy. Each prototype is a folder with `main.ts` +
`index.html`; the build bundles `main.ts` into one self-contained `<name>.html` next to
`build.mjs`. The built `.html` pages are **gitignored** — regenerate them after you change any
game source.

## Build

From the repository root:

```
node prototypes/pacman/build.mjs <name>
```

e.g. `node prototypes/pacman/build.mjs hero` writes `prototypes/pacman/hero.html`.

## View

Two ways, both after a build:

- **Open the file directly**: double-click `prototypes/pacman/<name>.html` (it is fully
  self-contained, `file://` works, no server needed).
- **Through the dev server**: `npm run dev`, then
  `http://localhost:5173/prototypes/pacman/<name>.html`.

Re-run the build whenever you edit the game sources; the page does not hot-reload from
`main.ts` on its own.

## Query params / controls

Most pages read the query string and/or show buttons. Common ones:

- `hero`: `?ms` (Ms. Pac-Man), `?power` (rage), `?ball` (teleport curl), `?season=summer|autumn|winter|spring`,
  `?capture` (exposes `window.__advance(seconds)` for scripted screenshots). Buttons switch
  season / run / rest / bite / ball / death.
- `hell`: `?ms`, `?zerk`, `?chg`; buttons "Бой", "Бессмертие", "Фаза 1-3", attack buttons.
- `feel`: every `HeroFeel`/`PlayerFeel` idea on a switch, a x2 magnifier.

## The pages

| name | what it shows |
|------|---------------|
| `hero` | the heroes large and at 1:1 on real season corridors, all states |
| `feel` | how the hero feels in motion, feel switches |
| `hell` | the real boss fight, phases, weapons |
| `hell-exit` | the hell's lair gate, heartbeat, exit on `grid_doom` |
| `mood` | the hell's atmosphere / night / ash |
| `mazes` | the maze layouts |
| `fx` | effects and particles |
| `death` | the death transitions |
| `shift` | the season-turn transition |
| `level-clear` | the level-clear flow |
| `echo` | the echo bonus's wisps (spirit flames, `render/actors/EchoCloneView`) played by the real services on a season world at game scale, with the season's ghosts; `?portrait` adds the wisp large in four headings; `?capture` exposes `window.__advance(seconds)` |
| `easter-egg` | the easter egg |
| `arcade` | the secret arcade level |
| `hell-dash` | the hell boss's dash as the game draws it (`HellBlinkyView` + `doomDashFx`: the body turns into a rolling lava ball that lays a cooling track, the owner's pick B1) on the real hell world, in a scripted round at the game's timings. First screen: a contact sheet, rows the phases (bone, helm, helm with horns) and the echo, columns the moments of the round (each row at its own phase's timings); "конец следа" frames the track's old end over time; "живое" plays it with a x3 magnifier. Buttons: view, the live row, dash 10 / 3 tiles, heading, zoom, speed |
| `season-dress` | the seasons' holiday scenes as the game draws them (`render/seasons/<season>/*Scene.ts`: Halloween, New Year, hanami, fair) on the real `MeadowWorld`. First screen: a split view, the season without its scene (left) and with it (right), with heroes, season ghosts and food. Buttons: view (split / whole / the season's contact sheet: day, night, a cabin x3, the landmark x3, a corner x4), season, with / without, day / night, weather. **`guard.mjs`** (Playwright, pixels; build the page first) checks every season: outside the walls' silhouette byte-equal with the wall dress off, no light pixels at the outer corners, the walls equal to the season without its scene; exit 1 on a failure |
| `season-look` | a diagnostic: the meadow world of a season exactly as the game draws it (`?season=spring|summer|autumn|winter`, `?storm=1`, `?night=1`) |
| `station-b7` | the station B-7 as the game draws it (`render/station/b7`: the scene, the black parasite's hive with its lime life, the lamps under its film, the heartbeat) with the game's quarantine ring, lure and squad (the amoebas, their lime rage) on the real maze and the game's Cinnabar vessel walking a corridor; buttons on top switch the ring's phase, the squad, the rage, the lure, the light, the infection and a large sheet of every state |
| `pretender` | the Pretender for B-7 (`station-b7/mimicLooks.ts`) alone on a clean sheet, large: the four headings, a 180 live and slowed, every state with its effects (tell, the mask torn up and the rage's true face, fright, flashing, eyes), the mimicry frame by frame and looped into the level's spore with the lurker's gold eye tell, the four kinds, the game's scale (34 and 24 px); drawn by the game's `render/station/pretender` |
| `hell-depth` | the hell's walls sitting in the floor (the owner's pick A), in the game's own `DoomWorld` full window with the hero and the boss: light from the top left, the cord becomes a hot seam on the floor at the foot of the lit sides, a cast shadow and a crease. Buttons: Сейчас / Посадка, День / Ночь, Крупно (a loupe on the hero's corridor). Source: `hell-depth/depth.ts`; nothing in the game changes |
| `zone` | the Zone (the pure STALKER boss world, Pripyat) **playable**: the rules are the game's own code (`logic/zone`), the picture is `render/zone` (baked town, cached sprites). Arrows / WASD move, Space throws a bolt, R restarts; buttons: emission now, +3 bolts, open the Monolith, immortality, restart. Tushkans and a poltergeist chase, the artifacts scare the tushkans (eat them), anomaly pockets hold golden nuts, an emission to hide from, the Wish Granter and the next level with the wish's price |
| `net` | the Net (a cyberpunk boss world on the Lady Bug idea) **playable**: the rules are the game's own code (`logic/net`), the picture is `render/net` (a baked neon server, cached sprites). Arrows / WASD move, R restarts; buttons: hack now, slam all doors, nearly done (the alarm and the core), immortality, restart. Four drones hunt like the ghosts, the doors slam shut behind the hero for them, the nodes make them flee |
| `hell-kit` | the hell redesign's missing art, the owner's pick **«Плоть»** (`hell-kit/kitFlesh.ts`, drawn with `paint.ts`, which reuses `hellGhost`'s ghost outline, cel bands, horns and eyes and `doomItems`' parts and bloom): the food (a fang in gum), the split's hot heart energizer, the four equal flayed ghosts (a little smaller, a longer ragged skirt, not tall) and a frightened one, the new weapons' pickups without red so they stand off the floor (the Sting «Жало» a slim rifle with a venom canister and a bone sting for a muzzle, the Maw «Жерло» a short heavy cannon with glowing vents and a bone bell with fire in it, both in gunmetal like the game's pickup guns; the berserk keeps the game's fist), drawn with the game's pickup glow, the Sting's bolts, the berserk's rush as both heroes spinning up into a whirlwind of blood, and its hit, the boss with the game's new longer skirt; on the game's hell with the current hero cropped to the maze at game scale, and as a sheet beside the current pickups, with dashed tile bounds. Static; published as an artifact. Section «Неоновый контур»: the hot line round the walls at three widths (`CordLook` of `bakeFlesh`: seam, glow blur, warm spread) on the game's hell; the owner's pick B (1.2 px) is the game's since 2026-11-28 |
| `hell-weapons` | the hell's art pass, one looping card per candidate on a strip of the real hell (`DoomWorld`), at game scale (32 px tile) and enlarged; `?t=<s>` freezes every card. On top **the weapon thrown away** (`hell-weapons/fixFx.ts`, accepted, in the game): tossed back and sunk into the floor; the fizzled rush draws nothing on the field. Then **the finale and the slow** (accepted, in the game; `hell-weapons/endFx.ts`): the boss's death (he swells under turning beams, bursts white with two shock rings, flesh flung far, his horns thrown high, blood rain, a pool with his horns and embers), the heart (+1 life, a red heart in a white bone frame; accepted) and the exit (an iron hatch opening on gold light; accepted), and the phase-3 slow in place of the tar, tile by tile and reacting to the hero walking through: 1 pale hands out of a crack, 2 a web of sinews, 3 crossed chains, 4 a bright red bog. Then **the boss and the split** (accepted, in the game; `hell-weapons/bossFx.ts`): the stunned boss with skulls circling and a timer ring, the split's window (gold brackets "hit now"), the hit reaction by strength (recoil and flesh chips), the omen, the core (now and a heart in a cage of ribs), the four gathering on the core and his forming, a ghost eaten (flesh, its eyes, the score), the fright's blink. Below, the weapons (accepted and in the game, `hell-weapons/weapons.ts`) |
| `hell-actors` | the hell's actors drawn anew on a clean page (`hell-actors/actors.ts`), every state looping at game scale (32 px tile) and enlarged on a plain strip of hell floor: the boss (chase in four ways, eyes that never leave the hero, the dash's crouch, the game's lava ball (`LavaDash`, kept) rolling and turning back, the panting, the cast's swell and roar, hit, stunned, gloating, the omen, phases 1-3 told apart: bull horns growing each phase, ridged and with tusks from phase 2, a second pair of brow horns, lava cracks over him and glowing eyes in phase 3), the imps (hopping each on its beat with a whip of a tail, four ways, scared of an armed hero, popping out of the floor), the split's four flayed ghosts (characters in their eyes as the arcade's, walking four ways with a drop of blood now and then, fright and blink, the merge). `?t=<s>` freezes every card. Section «Босс: новое лицо» (the owner's pick, in the game's `hellActors.drawBoss` since 2026-11-28; the page shows the game's boss beside the old one): the same horns, body and motion, the face on a lit mask (phase 3 lit from inside), the cracks off the face, phase 3 eyes in dark sockets, bone brow ridges with a spike in place of the brow horns, the mouth glowing inside, the tusks at its corners; each card the current beside the new |
| `hero-eyes` | the fruit heroes (the game's orange and watermelon) with candidate eyes (`hero-eyes/eyes.ts`, 30% bigger than the game's), each card both running and blinking, half the loop in their power, at game scale and enlarged: now, A lively (a tall oval, big pupil and glint, a liner to the outer corner, an arched brow), B cocky (the upper lid lowered aslant, a sharp brow; her winged liner), C cute (a big round eye with a coloured iris, two big glints, a small raised brow). The orange's brow is `OrangeHero.paintBrow` |
| `hell-phase` | a **playable prototype of the fight's redesign** (`DESIGN.md` §7 "The fight, redesigned") on the real boss (`DoomBossService`: chase, attacks, phases) and the real hero, maze and food; the new rules live in `hell-phase/rules.ts` (every number in `TUNE`): food charges the BFG (the ring on the dial), the split at 1000 and 500 HP (the omen, the burst into four ghosts on `DronePack`'s chase, 18 s of Pac-Man with energizers, the return to the core, the boss stunned there), the berserk's rush, the snare, the plasma, medkit or armour on four spots off the corners. Placeholder art for what is new; the food's three candidates switch on the fly. Arrows / WASD, F or Shift is the button; buttons: the food, give an item, split now, restart, immortality |
