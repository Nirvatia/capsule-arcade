# The grid world — one-page design (draft for the owner's approval)

The second boss world (`ROADMAP.md`, part II, step 3.1), in the language of the TRON films: the
language, not a copy. The names, the boss and the ship are our own. The maze is `grid_tron`
(long corridors, nested loops, no tunnels).

## What the player does

A light-cycle duel inside a maze. No weapons and no HP: **one mistake ends it**.

- **The hero's light wall.** The hero leaves a wall of light behind him. It stands for a few
  seconds, then derezzes from the tail. Its length is his energy: every bit (dot) eaten makes it
  longer, up to a cap; at the start it is short.
- **Any light wall kills at a touch**, his own or the boss's: an instant derez. A ghost (a
  program) that touches one derezzes too.
- **The boss rides a light cycle**, faster than the hero, and cuts the maze with its own wall,
  closing corridors for a while. The map keeps changing.
- **The only way to win: make the boss crash into a wall.** Three crashes, three phases. Each
  phase it is faster and its wall stands longer; in phase 3 it cuts across corners.
- **Overclock (the energizer):** for a few seconds the hero's wall is twice as long and brighter:
  the window for a trap.
- **The ghosts** are the boss's programs: they chase as usual and derez on any wall, the
  player's way to clear the board.
- After the third crash: the reward (a heart or the exit), as in the hell.

How it differs: the hell is a fight (weapons, HP, attacks to dodge); the grid has no shot and no
HP, only trajectories. Every death is the player's own reading of the map.

## How it looks (the rules every frame is checked against)

1. **Darkness is the material.** About nine tenths of the frame is black or near black; light
   is thin edges only.
2. **The glow is exact, not soft:** a white, almost burnt core, a narrow coloured halo, a faint
   wide one. Three layers, never one blur.
3. **Colour is the side.** Cyan is the hero, orange-red the enemy, a cold white the world.
   Anything else is an event.
4. **Surfaces are glossy:** the floor reflects the walls and the trails.
5. **A trail is a wall, not a track:** a rigid ribbon with a bright top edge that stands, then
   derezzes.

Scale and speed in a view from above: the arena is a platform of dark glass over an abyss; far
below a city of light drifts slowly (parallax) and a grid fades into haze; pulses run along the
lines. The level opens high above the arena and dives in; a ship's shadow passes over and drops
the boss. A mild camera tilt (about 18°) gives the walls height; flat or tilted is the owner's
call in the prototype.

## Actors

- **Pac-Man:** a light outline. A dark disc with a thin cyan rim along the edge and the mouth's
  cut, faint circuit lines inside; the same gaze and acting as on the other levels.
- **Ms. Pac-Man:** the same, her bow as two light triangles.
- **The boss:** an orange-red angular rider on a cycle: polygons against the heroes' circles, so
  the sides differ by shape as well as by colour.
- **Ghosts:** small orange wireframe programs.
- **Bits:** small white squares; the overclock is a cyan diamond.
- **Death:** the derez: the body falls apart into cubes along the grid (the universal death
  transition gets a `derez` style).

## Interface

Thin lines, cut corners, segmented gauges, a narrow geometric typeface. The boss's HP is a ring
of three segments (one per crash); the hero's wall energy is a bar. On the level's start the HUD
boots: the lines draw in one after another.

## Light, technically

The emissive parts are drawn into their own layer at half resolution, blurred in two passes and
added over the frame (core + narrow halo + wide halo). The world is mostly black, so the frame is
cheap even on integrated graphics: thin lines, no full-screen haze.

## Open questions for the owner

- Flat or tilted camera (the prototype shows both).
- Wall length by dots eaten, or a fixed length.
- The heroes' outline look (the prototype shows it).
