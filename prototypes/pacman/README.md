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
| `screens` | menu / ready / pause / death / game-over screens |
| `fx` | effects and particles |
| `death` | the death transitions |
| `shift` | the season-turn transition |
| `level-clear` | the level-clear flow |
| `echo` | the echo bonus's wisps (spirit flames, `render/actors/EchoCloneView`) played by the real services on a season world at game scale, with the season's ghosts; `?portrait` adds the wisp large in four headings; `?capture` exposes `window.__advance(seconds)` |
| `easter-egg` | the easter egg |
| `arcade` | the secret arcade level |
| `hounds` | the station's hound pack to play (the owner's pick over the fluid swarm): the same maze, look, torch, beacons and escape as `swarm`, the pack from `logic/station/HoundPack`; R restarts (`?high` for High) |
| `squad` | the station's squad to play (DESIGN.md §7a): the game's hero and ghosts on `grid_station`, the approved art (style B) lit, no dark; the squad's brain from `logic/station/StationSquad` (it reads the hero's way and runs the fence (beams that hold him in 60-75% of the station, a phantom seen only as guttering light), the ambush (one lies as food on an eaten tile, the rest shut every other way out) and the vent (eyes glowing in a shaft, out as he passes)), power cells, the hatch charged by the food, the escape v3 (`logic/station/StationEscape`, `EscapeRush`: the console, a free way with the shortest one lit, the squad in a rage, 1-4 more breaking out, the breakthrough lane on Space (two per escape), the pulse, the restart); placeholder discs for the creatures, plain energy capsules for food. Arrows / WASD, R restarts; `?debug` (his foreseen way, roles, targets, the open way), `?ms`, `?charge=0..1` (`?charge=1` starts at the escape), `?high`; `window.__squad` (run, press, advance) |
| `swarm` | the station's swarm to play: the real maze and look, the hero on the keys, the torch fed by the dots, the swarm (`logic/station/SwarmField`), F drops / takes the torch, the four beacons, the escape; R restarts (`?high` for the High setting) |
| `creatures` | candidate bodies for the station's hounds beside the current arrowhead, in the four states (stalk / windup / lunge / flee): the void jellyfish (insects with legs or wings and drones were rejected by the owner), plus two station looks for both heroes (A: survivor with the torch, B: suit with a helmet lamp); `?v=maze` puts them on the real station maze in the dark; `?h=now|a|b` the heroes' look there; `?t=<s>` freezes time. Throwaway: delete when the owner has chosen |
| `mimics` | the anti-hero on a **lit** station, to play: copies of the hero (his own painters turned inside out: black-violet, too many teeth, three eyes) follow his trail a few seconds behind, every second one on the mirrored trail; more of them with every dozen capsules, the station turns strange (lamps drift to violet, wall screens open eyes that watch him, the stasis chamber fills with copies); a power cell gives six seconds of clarity; the clean station is baked from the game's own `stationPaint` helpers. Arrows / WASD, R restarts; `?ms`, `?n=<copies>`, `?auto` (a random runner), `?god`, `?t=<s>` (simulate first). Throwaway: delete when the owner has chosen |
| `hell-dash` | the hell boss's dash as the game draws it (`HellBlinkyView` + `doomDashFx`: the body turns into a rolling lava ball that lays a cooling track, the owner's pick B1) on the real hell world, in a scripted round at the game's timings. First screen: a contact sheet, rows the phases (bone, helm, helm with horns) and the echo, columns the moments of the round (each row at its own phase's timings); "конец следа" frames the track's old end over time; "живое" plays it with a x3 magnifier. Buttons: view, the live row, dash 10 / 3 tiles, heading, zoom, speed |
| `hero-art` | the heroes as the game draws them (the owner's picks: Pac-Man the sun with the pinwheel corona, Ms. Pac-Man the white comet with the ice bow): a contact sheet on the real season corridor (rest / run / turn / bite / rage / 1:1), portraits, a live run with a x4 magnifier; `window.__measureHero(id)` returns the reach in body radii and the tails' spread in tiles; candidates `g-heat` / `g-frost`: Gemini's "Heat and Frost" pair (`hero-art/geminiHeatFrost.ts`, lifted verbatim from the owner's preview onto our `Hero`, body 0.295 of a tile), the base to improve. Throwaway until the owner chooses |
| `season-dress` | the seasons' holiday scenes as the game draws them (`render/seasons/<season>/*Scene.ts`: Halloween, New Year, hanami, fair) on the real `MeadowWorld`. First screen: a split view, the season without its scene (left) and with it (right), with heroes, season ghosts and food. Buttons: view (split / whole / the season's contact sheet: day, night, a cabin x3, the landmark x3, a corner x4), season, with / without, day / night, weather. **`guard.mjs`** (Playwright, pixels; build the page first) checks every season: outside the walls' silhouette byte-equal with the wall dress off, no light pixels at the outer corners, the walls equal to the season without its scene; exit 1 on a failure |
| `season-look` | a diagnostic: the meadow world of a season exactly as the game draws it (`?season=spring|summer|autumn|winter`, `?storm=1`, `?night=1`) |
| `station` | the station's actors from `render/station/`, large and at game scale (`?t=<s>` freezes time); the station itself: the game, dev panel → Station |
| `station-b7` | the squad's candidates on the game's B-7 station (`station-b7/mimicLooks.ts`, the owner's mock-up STATION_MIMIC.html, the season ghosts' grammar: upright, feet, eyes): Q the mock-up's Pretender, W the Pretender for B-7, E the spore hermit, R the albino now; four walk the rails of `grid_station`. Keys 1-7 the states (hunt, tell, rage, fright, flashing, mimicry, eyes), Space a 180, Z the line-up x3 (arrows, A auto), P the mock-up's colours; `?scene` the earlier static candidates (`?cell`, `?hive`, `?inf`, `?escape`) |
| `pretender` | the Pretender for B-7 (`station-b7/mimicLooks.ts`) alone on a clean sheet, large: the four headings, a 180 live and slowed, every state with its effects (tell, rage, fright, flashing, eyes), the mimicry frame by frame and looped into the level's spore, the four kinds, the game's scale (34 and 24 px); `?candy` the mock-up's colours |
| `hud` | **broken** — imports a `GameHud.svelte` that no longer exists; fix or delete when next needed |
| `collectibles` | **broken** — throws in the item row; find it when next touched |

`winter-decay.html` is an older standalone page, kept for reference.
