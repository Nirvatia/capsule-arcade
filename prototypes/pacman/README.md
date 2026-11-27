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
| `cartridge` | the boss world "the cartridge" (a bad retro port) on the game's arcade board and CRT pass: a giant grey cartridge in the lair, its label a bad face that watches the hero (buttons: calm / angry), and the world's rules as pictures (tearing, pits, false walls, flicker, a lag with a tracking band, the continue screen), a ×6 close-up of the boss. A candidate, not in the game |
| `nightwood` | the night forest (the boss level "light against the dark", now in the game: `render/nightwood`) as a prototype with its own painters (`nightwood/forest.ts`, `nightArt.ts`): the baked forest, rays over the maze's grid, the torch, the lamps, fog, the Taken under shrouds, the Presence's whirl; buttons for the torch, the foes' shroud states, the boss's mood, fog and lamps; three close-ups. Older than the game's version (tendrils, bug-like Taken, scattered trees) |
| `pretender` | the Pretender for B-7 (`station-b7/mimicLooks.ts`) alone on a clean sheet, large: the four headings, a 180 live and slowed, every state with its effects (tell, the mask torn up and the rage's true face, fright, flashing, eyes), the mimicry frame by frame and looped into the level's spore with the lurker's gold eye tell, the four kinds, the game's scale (34 and 24 px); drawn by the game's `render/station/pretender` |

