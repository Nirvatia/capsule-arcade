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
| `hud` | **broken** — imports a `GameHud.svelte` that no longer exists; fix or delete when next needed |
| `collectibles` | **broken** — throws in the item row; find it when next touched |

`winter-decay.html` is an older standalone page, kept for reference.
