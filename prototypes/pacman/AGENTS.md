# Pac-Man prototype rules

These rules refine the root `AGENTS.md` for work inside this directory.

## Keep the preview small

- Reuse an existing prototype that already shows the relevant world or painter. Create a new page only when no existing one can host the candidate.
- Use the game's real paint helpers, but do not import `LevelSession`, game flow, AI, or a full level renderer for static art.
- One canvas and one candidate are enough. Compare against the current look on the same frame when possible.
- Do not build custom control panels, layer switches, capture APIs, FPS meters, responsive test matrices, or interactive movement unless the owner explicitly asks for them.
- Use one or two focused source modules. Group small objects into families such as `flora`, `architecture`, and `surfaces`; do not create a file for every lamp or ornament.

## Asset-first scenes

- Define shared palette, light direction, shadows, scale, and seeded randomness before drawing separate object families.
- Establish style with a stone border, a path surface, and one tree (or their scene-specific equivalents) before producing the rest.
- Keep walls, corridors, lair transitions, contour snow, and lighting coherent at scene level. Independent objects must not become unrelated stickers.
- Preview assets together at game scale and at one enlarged scale. A full scene is assembled only after the master assets are approved.

## Stop conditions

- Build with `node prototypes/pacman/build.mjs <name>` and inspect the browser result.
- By default, stop after a full day frame, a full night frame, and one material detail frame. Additional checks require a new visual problem or an explicit owner request.
- Do not run the full application build, unit test suite, mobile emulation, or performance measurements for a static visual candidate.
- Do not iterate on preview controls or bundle size. Iterate on the asset named by the owner.
- Remove rejected throwaway candidates when the owner has chosen, but keep accepted standalone HTML available for review.
