// Prototype: two candidates on the game's own B-7 station (render/station/b7), for the owner's
// approval: the infestation B (the infection in the bulkheads, `veins.ts`) against the mock-up's
// (A), and warm candidates for the power cell (`?cell`). Static frames, no play.
//   ?cell=gold|ember|rose (the power cell's warm candidates)  ?hive=b|a  ?inf=0..1  ?escape=1  ?high
import { GRID_STATION } from '../../../src/games/pacman/config/mazes';
import { B7World } from '../../../src/games/pacman/render/station/b7/B7World';
import { bakeVeins } from '../../../src/games/pacman/render/station/b7/b7Veins';

const q = new URLSearchParams(location.search);
const view = document.getElementById('view') as HTMLCanvasElement;
const ctx = view.getContext('2d') as CanvasRenderingContext2D;
const D = Math.min(window.devicePixelRatio || 1, 2);
const inf = Math.min(1, Math.max(0, Number(q.get('inf') ?? 0.7)));
const escape = q.get('escape') === '1';
const world = new B7World(GRID_STATION, q.get('hive') === 'a' ? undefined : (s) => bakeVeins(s, GRID_STATION));
world.setQuality(q.has('high') ? 'high' : 'medium');

/** Warm candidates for the power cell (the owner: the cold one does not fit; warmer, apart from the amber spores). */
const CELLS = {
	gold: { aura: '255, 226, 150', halo: '255, 176, 70', rim: '220, 120, 30', core: ['#fff4cc', '#ffc34d', '#c2600f'], ring: 'rgba(255, 236, 180, 0.95)', light: '255, 200, 110' },
	ember: { aura: '255, 200, 170', halo: '255, 110, 70', rim: '200, 50, 30', core: ['#ffe1cf', '#ff7a4a', '#b22a14'], ring: 'rgba(255, 214, 190, 0.95)', light: '255, 130, 90' },
	rose: { aura: '255, 210, 236', halo: '255, 110, 190', rim: '190, 40, 140', core: ['#ffe3f4', '#ff6fbf', '#a3146e'], ring: 'rgba(255, 220, 240, 0.95)', light: '255, 130, 200' }
} as const;
const pick = q.get('cell') as keyof typeof CELLS | null;
if (pick && CELLS[pick]) world.scene.setCellPalette(CELLS[pick]);

function frame(now: number): void {
	const t = now / 1000;
	const vw = window.innerWidth;
	const vh = window.innerHeight;
	if (view.width !== Math.round(vw * D)) {
		view.width = Math.round(vw * D);
		view.height = Math.round(vh * D);
	}
	ctx.setTransform(D, 0, 0, D, 0, 0);
	world.resize(vw, vh, D);
	world.scene.setExtraLights([]);
	world.drawScene(ctx, t, 1 / 60, inf, true);
	world.drawLight(ctx, t, inf, escape ? 'alert' : 'quarantine', true);
	world.drawGrain(ctx, t);
	requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
