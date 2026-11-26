// Prototype: the station B-7 as the game draws it (`render/station/b7`: the scene, the hive's
// takeover `b7Hive`, the lamps under its film, the heartbeat), alone, at any infection.
// Keys: 1 / 2 / 3 the infection 0.35 / 0.65 / 1.0; G the goal mark's candidate (`goalLook.ts`):
// on the console, on the hatch, off.  Query: ?inf=0..1 ?escape=1 (the alarm's light) ?high (the
// High setting) ?goal=console|hatch|off.
import { GRID_STATION } from '../../../src/games/pacman/config/mazes';
import { B7World } from '../../../src/games/pacman/render/station/b7/B7World';
import { RUN_TUNE } from '../../../src/games/pacman/logic/station/StationRun';
import { drawGoalMark, type Goal } from './goalLook';

const q = new URLSearchParams(location.search);
const view = document.getElementById('view') as HTMLCanvasElement;
const ctx = view.getContext('2d') as CanvasRenderingContext2D;
const legend = document.getElementById('legend') as HTMLDivElement;
const D = Math.min(window.devicePixelRatio || 1, 2);
let inf = Math.min(1, Math.max(0, Number(q.get('inf') ?? 0.65)));
const escape = q.get('escape') === '1';
const world = new B7World(GRID_STATION);
world.setQuality(q.has('high') ? 'high' : 'medium');
const GOALS: Array<Goal | null> = ['console', 'hatch', null];
let goal: Goal | null = q.get('goal') === 'off' ? null : ((q.get('goal') as Goal | null) ?? 'console');

function showLegend(): void {
	legend.textContent =
		`Заражение · ${Math.round(inf * 100)}% · цель: ${goal === 'console' ? 'консоль' : goal === 'hatch' ? 'люк' : 'нет'}\n` +
		'1 / 2 / 3 заражение 35 / 65 / 100%  G цель';
}
window.addEventListener('keydown', (e) => {
	const level: Record<string, number> = { '1': 0.35, '2': 0.65, '3': 1 };
	if (e.key.toLowerCase() === 'g') goal = GOALS[(GOALS.indexOf(goal) + 1) % GOALS.length];
	else if (level[e.key] !== undefined) inf = level[e.key];
	else return;
	showLegend();
});
showLegend();

let last = 0;
function frame(now: number): void {
	const t = now / 1000;
	const dt = last ? Math.min(0.05, t - last) : 1 / 60;
	last = t;
	const vw = window.innerWidth;
	const vh = window.innerHeight;
	if (view.width !== Math.round(vw * D)) {
		view.width = Math.round(vw * D);
		view.height = Math.round(vh * D);
	}
	ctx.setTransform(D, 0, 0, D, 0, 0);
	world.resize(vw, vh, D);
	world.scene.setExtraLights([]);
	world.drawScene(ctx, t, dt, inf, true);
	world.drawLight(ctx, t, inf, escape ? 'alert' : 'quarantine', true);
	if (goal) {
		const at = RUN_TUNE[goal];
		const { tileSize: S, offsetX, offsetY } = world.layout;
		drawGoalMark(ctx, goal, offsetX + (at.x + 0.5) * S, offsetY + (at.y + 0.5) * S, S, t, at.y < 3);
	}
	world.drawGrain(ctx, t);
	requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
