# Capsule Arcade agent rules

## Scope

- Work on Pac-Man: `src/games/pacman/` and `prototypes/pacman/`.
- Do not search or read `src/games/snake/`, `src/games/tetris/`, or `src/games/simon/` unless the user explicitly asks to work on those games.
- Do not browse `node_modules/`, `.svelte-kit/`, `build/`, `dist/`, `package-lock.json`, or bundled `prototypes/pacman/*.html`. Read a generated file only when the task is specifically about that artifact.
- `.ignore` limits discovery, not builds or deliberate reads. Narrow searches to the task's directory instead of scanning the repository.

## Spend context deliberately

- Start Pac-Man work with `src/games/pacman/ROADMAP.md`. Read only the sections of `DESIGN.md` and `ARCHITECTURE.md` needed for the current change.
- Search for a symbol before reading a file. Read the matching function and its types, not whole large files by default.
- Reuse information already gathered in the session. Do not repeat searches or reread files to confirm an unchanged fact.
- Do not read generated bundles, screenshots, logs, or test output unless they are needed for the current decision.
- Do not launch subagents unless the user explicitly requests delegation. Independent context is useful only for a genuinely large independent task.
- Keep progress notes and final answers focused. Do not narrate routine tool calls or restate the plan after every step.

## Prototypes and approval

- New art and effects require the owner's approval before implementation and another approval before transfer into the game.
- A visual prototype is a static candidate, not a small game. Do not add gameplay, AI, diagnostic menus, performance tooling, mobile matrices, or full-project checks unless the owner asks for them after approving the look.
- Prefer an existing preview page. Add at most one or two small candidate modules rather than building a new preview application.
- For a new scene, first approve a few master assets and a shared style, then compose the scene from modules. Do not write the whole scene before this checkpoint.
- Stop after the agreed screenshots. The default set is one full day frame, one night frame, and one material detail frame.
- If a candidate is rejected, change only the named asset or surface. Do not rebuild the entire scene or its preview infrastructure.
- Do not read or polish the generated HTML bundle. Edit source modules and regenerate it for preview.

## Checks

- For a static prototype, build the prototype and check it in a browser. Full application checks belong to game integration or shared-code changes.
- For game integration, run `npm run check`, `npm test`, `npx eslint src/games/pacman`, and Prettier on changed files.
- Do not rerun an unchanged check or broaden verification merely because a command is available.
- Do not create documentation, reports, or test scaffolding unless the task or existing project conventions require them.
