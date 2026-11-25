// Prototype: two candidates on the game's own B-7 station (render/station/b7), for the owner's
// approval: the infestation B (the infection in the bulkheads, `veins.ts`) against the mock-up's
// (A), and the station's HUD (`hudLook.ts`). Static frames, no play.
//   ?hive=b|a  ?inf=0..1  ?escape=1  ?hp=0..3  ?hurt=0..1  ?high
import { GRID_STATION } from '../../../src/games/pacman/config/mazes';
import { B7World } from '../../../src/games/pacman/render/station/b7/B7World';
import { bakeVeins } from './veins';
import { drawStationHud } from './hudLook';

const q = new URLSearchParams(location.search);
const view = document.getElementById('view') as HTMLCanvasElement;
const ctx = view.getContext('2d') as CanvasRenderingContext2D;
const D = Math.min(window.devicePixelRatio || 1, 2);
const inf = Math.min(1, Math.max(0, Number(q.get('inf') ?? 0.7)));
const escape = q.get('escape') === '1';
const world = new B7World(GRID_STATION, q.get('hive') === 'a' ? undefined : (s) => bakeVeins(s, GRID_STATION));
world.setQuality(q.has('high') ? 'high' : 'medium');

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
	if (q.get('hud') !== '0') {
		const L = world.layout;
		const x = L.offsetX + L.tileSize;
		const w = L.tileSize * 23;
		drawStationHud(ctx, x, Math.max(6, L.offsetY + L.tileSize - 58), w, {
			hp: Number(q.get('hp') ?? 2),
			hurt: Number(q.get('hurt') ?? 0),
			charge: Math.min(1, inf / 0.85),
			infection: inf,
			escape,
			lures: 1,
			time: t
		});
	}
	requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
