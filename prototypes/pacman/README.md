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
| `hell-dash` | the hell boss's dash as a **transformation** on the real hell world, beside the game's current dash (`сейчас`). First screen: a contact sheet, rows the variants, columns the moments of one round (crouch, the turn, the run, the return at the stop, steam, the trail +1.2 s and +2.2 s); "конец следа" frames the trail's old end over time; "живое" plays the round with a x3 magnifier. Buttons: variant, phase (bone / helm / helm with horns), dash 10 or 3 tiles, heading → or ↓, zoom 1:1 / ×2 / ×4, speed. A fire tornado seen from above with his face in the eye of the storm (A1 flame arms, A2 ash hurricane with an eye wall and a street of smoke curls) and a lava ball / meteor that rolls and lays a cooling lava track (B1 cracked crust, B2 obsidian with a fire bow and a molten groove). The trails are `trail.ts`, pure functions tested in `trail.test.ts` (width and alpha 0 at both ends in every frame, no step along, gone after their life). The game's timings (`DoomBalance`). Query (for scripts): `mode=sheet|tail|live`, `v`, `p`, `len=long|short`, `lane=h|v`, `zoom`, `t=<s>`; `window.__measure(v, phase, len, 'trail'|'form')` returns how far the effects reach across and ahead of the dash line (in tiles) and a luminance series for the flicker check. Throwaway |
| `hero-art` | the heroes' mad experiment beside the game's heroes (`сейчас`): **Pac-Man a real sun** (`sun.ts`): the accepted bands alive (a slow boil, faculae, a soft sunspot riding the turn), red plasma arches on the limb, one ring of fire under one ink line in three coronas (A flame ring, B sun emblem, C pinwheel), blown back by a solar wind that lags a turn; a trail of cooling embers only (white-gold to brown, nothing rises); the rage white-hot with erupting arches; corona and glow measured inside 1.45 radii (`CORONA_REACH`). **Ms. Pac-Man a white comet** (`comet.ts`): an icy nucleus, a coma to 1.45 radii, a warm curved dust tail and a straight blue ion tail made of her path (`wake.ts` on `common/trail.ts`, tested in `wake.test.ts`: both ends 0, through a turn and after the stop), ice crystals instead of stars, the rage an outburst; A bow + beauty mark + pearl earring, B ice bow + pink glint + curl, C the bow's knot sheds the tails as its ribbons. First screen: the contact sheet on the real season corridor, rows the candidates, columns rest / run / turn / bite / rage / the game's 1:1; "портреты" big on a plain ground; "живое" runs a route through the maze with a x4 magnifier. Buttons: heroes, season corridor, zoom, hero and rage for "живое". `window.__measureHero(id)` returns the reach (body radii) at rest / run / rage and the tails' spread (tiles). Throwaway |
| `season-dress` | each season a **holiday scene** on the real `MeadowWorld` (same layout; pond and stream where they are; no river), beside the game's season. First screen: a split view, the game's season left, the new scene right, on the same board, with heroes, season ghosts and food on it for readability. Autumn = Halloween (cobweb fans over the walls' outer corners and spiders, carved pumpkins with glowing lid cuts and light on the ground, candles, two graveyards, sheet ghosts lying in the grass, a cauldron, a big orb web on the grass, bat shadows live, faint rain rings; no puddles); winter = New Year (a decorated tree with presents and sparklers by each snowman, lights round the cabins' roofs and on the bridge, warm window light, holly on the lamps; the accepted winter walls/floor/bauble untouched); spring A hanami ★ (every tree in blossom, petal carpets, blankets, two strings of paper lanterns lamp to lamp, petals on the walls) / B Easter; summer B fair ★ (tents, festoons, balloons, a carousel turning live, bunting on the frame) / A beach. Buttons: view (split / whole / the season's contact sheet: day, night, a cabin x3, the landmark x3, a corner x4), season, concepts, now / new, layers (floor, shadows, wall dress, props, live), day / night, weather. The floor is the accepted opaque one-tone corridor with a contact shadow and grass at the walls' feet (winter keeps its own). The walls' painter runs unchanged; the wall dress is a separate pass clipped to their silhouette, checked by **`guard.mjs`** (Playwright, pixels): outside the silhouette byte-equal with the dress off, no light pixels at the outer corners, the walls equal to the game's (`node prototypes/pacman/season-dress/guard.mjs` after a build; exit 1 on a failure). Query (scripts): `mode=split|full|sheet`, `season`, `spring=hanami|easter`, `summer=fair|beach`, `v=now|new`, `layers=…`, `night`, `storm`, `t`. Throwaway |
| `season-look` | a diagnostic: the meadow world of a season exactly as the game draws it (`?season=spring|summer|autumn|winter`, `?storm=1`, `?night=1`) |
| `station` | the station's actors from `render/station/`, large and at game scale (`?t=<s>` freezes time); the station itself: the game, dev panel → Station |
| `hud` | **broken** — imports a `GameHud.svelte` that no longer exists; fix or delete when next needed |
| `collectibles` | **broken** — throws in the item row; find it when next touched |

`winter-decay.html` is an older standalone page, kept for reference.
