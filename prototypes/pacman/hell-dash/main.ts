// Prototype: the hell boss's dash. The real hell world and Blinky's own body (`HellBlinkyView`),
// a scripted dash along a corridor (crouch, dash, recover, rest, over and over), and three
// candidate whirlwinds for the dash's effects next to the current one (`now`).
// Query: ?v=now|A|B|C  ?t=<seconds> (freeze at that time)  ?p=1|2|3 (the phase's iron).
import { GRID_DOOM } from '../../../src/games/pacman/config/mazes';
import { DoomWorld } from '../../../src/games/pacman/render/doom/DoomWorld';
import { HellBlinkyView } from '../../../src/games/pacman/render/doom/HellBlinkyView';
import type { BossSnapshot } from '../../../src/games/pacman/render/doom/HellBlinkyView';
import type { DoomStateName, DoomShape } from '../../../src/games/pacman/logic/doom/DoomBossModel';
import { ashFunnel, dustDevil, fireCyclone, floorSwirls, smokeCollar, tailFade, tailPath, windupPull } from './vortex';
import type { Pt } from './vortex';

const view = document.getElementById('view') as HTMLCanvasElement;
const ctx = view.getContext('2d') as CanvasRenderingContext2D;
const D = Math.min(window.devicePixelRatio || 1, 2);
const q = new URLSearchParams(location.search);
const V = (['now', 'A', 'B', 'C'] as const).find((v) => v === q.get('v')) ?? 'A';
const PHASE = Math.min(3, Math.max(1, Number(q.get('p') ?? 1)));
const FROZEN = q.has('t') ? Number(q.get('t')) : null;

const world = new DoomWorld(GRID_DOOM, [
	{ x: 3, y: 8 },
	{ x: 18, y: 8 },
	{ x: 20, y: 8 }
]);
const body = new HellBlinkyView();
let vw = 0;
let vh = 0;

// the script of one round, seconds
const CYCLE = 4.8;
const X0 = 5.5;
const X1 = 17.5;
const ROW = 8.5;
const WIND = 0.7;
const DASH = 1.4;
const REC = 1.0;
const SPEED = (X1 - X0) / DASH;

interface Beat {
	x: number;
	state: DoomStateName;
	shape: DoomShape;
	progress: number;
}
function beat(t: number): Beat {
	const c = ((t % CYCLE) + CYCLE) % CYCLE;
	if (c < WIND) return { x: X0, state: 'TELEGRAPH', shape: 'wedge', progress: c / WIND };
	if (c < WIND + DASH) return { x: X0 + (c - WIND) * SPEED, state: 'ACTIVE', shape: 'wedge', progress: 1 };
	if (c < WIND + DASH + REC) return { x: X1, state: 'RECOVER', shape: 'normal', progress: 0 };
	return { x: X1, state: 'CHASE', shape: 'normal', progress: 0 };
}

function snap(b: Beat, alpha = 1): BossSnapshot {
	return {
		x: b.x,
		y: ROW,
		phase: PHASE,
		state: b.state,
		shape: b.shape,
		dir: 'RIGHT',
		progress: b.progress,
		alpha,
		intro: 1,
		look: 0,
		hit: 0,
		echo: false
	};
}

function frame(now: number): void {
	const t = FROZEN ?? now / 1000;
	ctx.setTransform(D, 0, 0, D, 0, 0);
	ctx.fillStyle = '#000';
	ctx.fillRect(0, 0, vw, vh);
	world.update(1 / 60);
	world.setMood(false, false);
	world.drawWorld(ctx);
	world.drawMood(ctx, []);
	const L = world.layout;
	const S = L.tileSize;
	const px = (x: number) => L.offsetX + x * S;
	const py = (y: number) => L.offsetY + y * S;
	const b = beat(t);
	const bx = px(b.x);
	const by = py(ROW);
	// the boss's last 1.8 s, newest first, in px
	const hist: Pt[] = [];
	for (let k = 0; k <= 108; k += 1) {
		const age = k / 60;
		hist.push({ x: px(beat(t - age).x), y: by, age });
	}
	const dashing = b.state === 'ACTIVE';
	const fade = tailFade(hist.filter((h) => beat(t - h.age).state === 'ACTIVE'), dashing, 0.8);
	const trail = hist.filter((h) => beat(t - h.age).state === 'ACTIVE' || (h.age < 0.8 && beat(t - h.age - 0.02).state === 'ACTIVE'));
	const tail = tailPath(trail, S * 5, 40);
	if (V === 'now') {
		body.draw(ctx, snap(b), L, t);
	} else {
		if (V === 'A') floorSwirls(ctx, S, trail, fade);
		if (b.state === 'TELEGRAPH') windupPull(ctx, S, bx, by, b.progress, t);
		if (V === 'A') dustDevil(ctx, S, tail, t, fade);
		if (V === 'B') fireCyclone(ctx, S, tail, t, fade);
		if (V === 'C') ashFunnel(ctx, S, tail, t, fade);
		body.draw(ctx, snap(b), L, t, b.state === 'ACTIVE');
		if (V === 'A' && dashing) smokeCollar(ctx, S, bx, by, t, 1);
	}
	(window as unknown as { __boss: unknown }).__boss = { x: bx, y: by, S };
	ctx.fillStyle = 'rgba(255,230,220,.8)';
	ctx.font = '600 13px "Courier New", monospace';
	ctx.fillText(`${V}  t=${(t % CYCLE).toFixed(2)}s  ${b.state}`, 16, 24);
	requestAnimationFrame(frame);
}

function layout(): void {
	vw = window.innerWidth;
	vh = window.innerHeight;
	view.width = Math.round(vw * D);
	view.height = Math.round(vh * D);
	view.style.width = `${vw}px`;
	view.style.height = `${vh}px`;
	world.resize(vw, vh, D);
	for (let i = 0; i < 60; i += 1) world.update(0.1);
}
window.addEventListener('resize', layout);
layout();
requestAnimationFrame(frame);
