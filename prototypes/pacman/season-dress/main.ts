// Prototype: season scenes (autumn, spring, summer) beside the current ones, on the real
// `MeadowWorld`. The game's own wall painter runs untouched (only its shadow is deeper); the
// corridor is one opaque tone with a contact shadow, the pond and the river are in view, and each
// season adds its own to the walls inside their silhouette and a live layer over the frame.
// Query: ?season=autumn|spring|summer  ?v=now|new  ?storm=1  ?t=<s> (freeze time)
import { GRID_01 } from '../../../src/games/pacman/config/mazes';
import { MeadowWorld } from '../../../src/games/pacman/render/seasons/meadow/MeadowWorld';
import { meadowThemeFor } from '../../../src/games/pacman/render/seasons/meadow/meadowThemes';
import type { MeadowTheme } from '../../../src/games/pacman/render/seasons/meadow/MeadowTheme';
import { paintWalls } from '../../../src/games/pacman/render/seasons/meadow/meadowBakeWalls';
import { DRESSES } from './seasons';

const view = document.getElementById('view') as HTMLCanvasElement;
const ctx = view.getContext('2d') as CanvasRenderingContext2D;
const q = new URLSearchParams(location.search);
const season = DRESSES[q.get('season') ?? 'autumn'] ? (q.get('season') ?? 'autumn') : 'autumn';
const dress = DRESSES[season];
const NEW = q.get('v') !== 'now';
const storm = q.has('storm') ? 1 : 0;
const FROZEN = q.has('t') ? Number(q.get('t')) : null;
const vw = window.innerWidth;
const vh = window.innerHeight;
view.width = vw;
view.height = vh;

function themed(base: MeadowTheme): MeadowTheme {
	if (!NEW) return base;
	const tone = dress.floor.base;
	return {
		...base,
		bake: {
			...base.bake,
			// the walls' own painter lays a half tile of `floor.tiles[0]` under their rounded corners:
			// it must be the corridor's colour, or a square of the old tone shows at every corner
			floor: { ...base.bake.floor, tiles: [tone, tone, tone], paint: (f, cell) => dress.cell(f, cell) },
			wall: {
				...base.bake.wall,
				paint: (f) => {
					dress.pre(f, GRID_01);
					paintWalls(f, { shadow: [9, 3, 4] });
					dress.walls(f);
				}
			}
		}
	};
}

const world = new MeadowWorld(GRID_01, themed(meadowThemeFor(season) as MeadowTheme));
world.resize(vw, vh, 1);
world.setMood(storm, 0);
world.setLairGate(0);
for (let i = 0; i < 120; i += 1) world.update(0.1);

function frame(now: number): void {
	const t = FROZEN ?? now / 1000;
	world.update(1 / 60);
	world.drawWorld(ctx);
	world.drawMood(ctx);
	world.drawFood(ctx, () => false);
	world.drawOverlay(ctx);
	if (NEW) dress.overlay(ctx, t, world.layout, GRID_01, storm);
	requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
