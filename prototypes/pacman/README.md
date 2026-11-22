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
| `echo` | the echo bonus wisps on a season world |
| `easter-egg` | the easter egg |
| `arcade` | the secret arcade level |
| `hounds` | the station's hound pack to play (the owner's pick over the fluid swarm): the same maze, look, torch, beacons and escape as `swarm`, the pack from `logic/station/HoundPack`; R restarts (`?high` for High) |
| `swarm` | the station's swarm to play: the real maze and look, the hero on the keys, the torch fed by the dots, the swarm (`logic/station/SwarmField`), F drops / takes the torch, the four beacons, the escape; R restarts (`?high` for the High setting) |
| `creatures` | candidate bodies for the station's hounds beside the current arrowhead, in the four states (stalk / windup / lunge / flee): the void jellyfish (insects with legs or wings and drones were rejected by the owner), plus two station looks for both heroes (A: survivor with the torch, B: suit with a helmet lamp); `?v=maze` puts them on the real station maze in the dark; `?h=now|a|b` the heroes' look there; `?t=<s>` freezes time. Throwaway: delete when the owner has chosen |
| `mimics` | the anti-hero on a **lit** station, to play: copies of the hero (his own painters turned inside out: black-violet, too many teeth, three eyes) follow his trail a few seconds behind, every second one on the mirrored trail; more of them with every dozen capsules, the station turns strange (lamps drift to violet, wall screens open eyes that watch him, the stasis chamber fills with copies); a power cell gives six seconds of clarity; the clean station is baked from the game's own `stationPaint` helpers. Arrows / WASD, R restarts; `?ms`, `?n=<copies>`, `?auto` (a random runner), `?god`, `?t=<s>` (simulate first). Throwaway: delete when the owner has chosen |
| `hell-dash` | the hell boss's dash on the real hell world and Blinky's own body: the current effects (`?v=now`) beside three whirlwinds: A dust devil (a tapering rope of embers and ash), B fire cyclone (a twisting flame ribbon with white-hot strands), C ash funnel (rings); every effect stays inside the corridor's width; `?t=<s>` freezes the scripted round (crouch 0-0.7, dash 0.7-2.1, recover 2.1-3.1), `?p=1|2|3` the phase's iron. Throwaway |
| `hero-art` | the heroes' art candidates beside the current ones (rest / run / rage / game scale): Pac-Man's corona without the hedgehog's quills (A flame ring, B sun emblem, C pinwheel, all grown from one ring of fire) with one trail language, the sun's (cooling embers streaming back, no stars); Ms. Pac-Man's details (A beauty mark + pearl earring, B curl + pink sparkle). `?t=<s>` freezes. Throwaway |
| `season-look` | a diagnostic: the meadow world of a season exactly as the game draws it (`?season=spring|summer|autumn|winter`, `?storm=1`, `?night=1`) |
| `station` | the station's actors from `render/station/`, large and at game scale (`?t=<s>` freezes time); the station itself: the game, dev panel → Station |
| `hud` | **broken** — imports a `GameHud.svelte` that no longer exists; fix or delete when next needed |
| `collectibles` | **broken** — throws in the item row; find it when next touched |

`winter-decay.html` is an older standalone page, kept for reference.
