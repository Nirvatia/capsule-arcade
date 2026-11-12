// Prototype: the owner's hell fixes on the real world (grid_doom, calm phase): the lair gate in
// the walls' iron, opened only by who goes through it (the boss runs past it, then goes in and
// out); the calmer heartbeat (the glow live, and its curve against the old one); the exit (an
// iron door ajar, the owner's pick), at game scale on the maze and magnified. Query: ?capture (window.__advance(seconds)).
import { GRID_DOOM } from '../../../src/games/pacman/config/mazes';
import { DoomWorld } from '../../../src/games/pacman/render/doom/DoomWorld';
import { HellBlinkyView } from '../../../src/games/pacman/render/doom/HellBlinkyView';
import { heartbeat } from '../../../src/games/pacman/render/doom/fleshLive';
import { easeGate, gateTiles, gateWanted, lairSide } from '../../../src/games/pacman/render/doom/doomGate';
import { drawExit } from '../../../src/games/pacman/render/items/ExitView';

const q = new URLSearchParams(location.search);
const D = Math.min(window.devicePixelRatio || 1, 2);
const $ = (id: string) => document.getElementById(id) as HTMLCanvasElement;
const worldCv = $('world');
const exitCv = $('exits');
const pulseCv = $('pulse');
const world = new DoomWorld(GRID_DOOM, []);
const boss = new HellBlinkyView();
const grid = {
	width: GRID_DOOM[0].length,
	height: GRID_DOOM.length,
	tileAt: (x: number, y: number) => GRID_DOOM[y]?.[x]
};
const tiles = gateTiles(grid);
const side = lairSide(grid, tiles);
let gate = 0;
let time = 0;

const STYLES: ReadonlyArray<{ name: string; x: number }> = [{ name: 'Выход', x: 11.5 }];

/** The boss's walk: past the gate along the corridor and back, then into the lair and out. */
const PATH: ReadonlyArray<readonly [number, number]> = [
	[8.5, 10.5],
	[16.5, 10.5],
	[8.5, 10.5],
	[12.5, 10.5],
	[12.5, 13.5],
	[12.5, 10.5],
	[8.5, 10.5]
];
const SPEED = 4;
function bossAt(t: number): { x: number; y: number; dir: 'LEFT' | 'RIGHT' | 'UP' | 'DOWN' } {
	const legs = PATH.slice(1).map((b, i) => ({ a: PATH[i], b, len: Math.hypot(b[0] - PATH[i][0], b[1] - PATH[i][1]) }));
	const total = legs.reduce((s, l) => s + l.len, 0);
	let d = (t * SPEED) % total;
	for (const l of legs) {
		if (d <= l.len) {
			const k = d / l.len;
			const dx = l.b[0] - l.a[0];
			const dy = l.b[1] - l.a[1];
			const dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'RIGHT' : 'LEFT') : dy > 0 ? 'DOWN' : 'UP';
			return { x: l.a[0] + dx * k, y: l.a[1] + dy * k, dir };
		}
		d -= l.len;
	}
	return { x: PATH[0][0], y: PATH[0][1], dir: 'RIGHT' };
}

/** The heartbeat before this change, for the curve. */
function oldBeat(t: number): number {
	const ph = (t * 0.4) % 1;
	return Math.exp(-Math.pow(ph / 0.07, 2)) + 0.65 * Math.exp(-Math.pow((ph - 0.2) / 0.08, 2));
}

function fit(cv: HTMLCanvasElement): { ctx: CanvasRenderingContext2D; w: number; h: number } {
	const w = cv.clientWidth;
	const h = cv.clientHeight;
	if (cv.width !== Math.round(w * D) || cv.height !== Math.round(h * D)) {
		cv.width = Math.round(w * D);
		cv.height = Math.round(h * D);
	}
	const ctx = cv.getContext('2d') as CanvasRenderingContext2D;
	ctx.setTransform(D, 0, 0, D, 0, 0);
	return { ctx, w, h };
}

function frame(dt: number): void {
	time += dt;
	const b = bossAt(time);
	gate = easeGate(gate, gateWanted(tiles, [b], side), dt);

	// the world at game scale
	const W = fit(worldCv);
	world.resize(W.w, W.h, D);
	world.setGateOpen(gate);
	world.update(dt);
	world.drawWorld(W.ctx);
	const L = world.layout;
	const S = L.tileSize;
	for (const st of STYLES) {
		drawExit(W.ctx, L.offsetX + st.x * S, L.offsetY + 24.5 * S, S, time);
	}
	boss.draw(
		W.ctx,
		{
			x: b.x,
			y: b.y,
			phase: 1,
			state: 'CHASE',
			shape: 'normal',
			dir: b.dir,
			progress: 0,
			alpha: 1,
			intro: 1,
			look: 0,
			hit: 0,
			echo: false
		},
		L,
		time
	);
	world.drawMood(W.ctx, []);
	world.drawOverlay(W.ctx);
	W.ctx.font = '600 12px "Trebuchet MS", system-ui, sans-serif';
	W.ctx.textAlign = 'center';
	for (const st of STYLES) {
		const x = L.offsetX + st.x * S;
		const y = L.offsetY + 25.6 * S;
		W.ctx.fillStyle = 'rgba(0,0,0,.6)';
		W.ctx.fillRect(x - 44, y - 2, 88, 17);
		W.ctx.fillStyle = '#fff';
		W.ctx.fillText(st.name, x, y + 11);
	}
	W.ctx.textAlign = 'left';
	W.ctx.fillStyle = 'rgba(0,0,0,.6)';
	W.ctx.fillRect(10, 10, 210, 22);
	W.ctx.fillStyle = gate > 0.05 ? '#ffb070' : '#fff';
	W.ctx.fillText(`Двери: ${gate > 0.05 ? 'открываются' : 'закрыты'}`, 18, 25);

	// the exits magnified
	const E = fit(exitCv);
	E.ctx.fillStyle = '#1a0c0f';
	E.ctx.fillRect(0, 0, E.w, E.h);
	const cell = E.w / STYLES.length;
	const big = Math.min(cell * 0.5, E.h * 0.7);
	E.ctx.textAlign = 'center';
	E.ctx.font = '700 14px "Trebuchet MS", system-ui, sans-serif';
	STYLES.forEach((st, i) => {
		drawExit(E.ctx, cell * (i + 0.5), E.h * 0.45, big, time);
		E.ctx.fillStyle = '#efe0d8';
		E.ctx.fillText(st.name, cell * (i + 0.5), E.h - 10);
	});

	// the heartbeat: the old curve and the new one over two beats, a cursor at now
	const P = fit(pulseCv);
	P.ctx.fillStyle = '#1a0c0f';
	P.ctx.fillRect(0, 0, P.w, P.h);
	const span = 5;
	const curve = (f: (t: number) => number, peak: number, colour: string) => {
		P.ctx.strokeStyle = colour;
		P.ctx.lineWidth = 2;
		P.ctx.beginPath();
		for (let i = 0; i <= 300; i++) {
			const t = (i / 300) * span;
			const x = 10 + (i / 300) * (P.w - 20);
			const y = P.h - 24 - f(t) * peak * (P.h - 44) * 2;
			if (i === 0) P.ctx.moveTo(x, y);
			else P.ctx.lineTo(x, y);
		}
		P.ctx.stroke();
	};
	curve(oldBeat, 0.4, 'rgba(255,120,90,.55)');
	curve(heartbeat, 0.28, '#ffd27a');
	const cx = 10 + ((time % span) / span) * (P.w - 20);
	P.ctx.strokeStyle = 'rgba(255,255,255,.35)';
	P.ctx.beginPath();
	P.ctx.moveTo(cx, 6);
	P.ctx.lineTo(cx, P.h - 20);
	P.ctx.stroke();
	P.ctx.font = '600 12px "Trebuchet MS", system-ui, sans-serif';
	P.ctx.textAlign = 'left';
	P.ctx.fillStyle = 'rgba(255,120,90,.9)';
	P.ctx.fillText('было', 12, P.h - 6);
	P.ctx.fillStyle = '#ffd27a';
	P.ctx.fillText('стало (сила свечения, 5 с)', 56, P.h - 6);
}

if (q.has('capture')) {
	(window as unknown as { __advance: (s: number) => void }).__advance = (seconds: number) => {
		for (let i = 0; i < Math.round(seconds * 60); i++) frame(1 / 60);
	};
	frame(0);
} else {
	let last = performance.now();
	const loop = (now: number) => {
		frame(Math.min(0.1, Math.max(0, (now - last) / 1000)));
		last = now;
		requestAnimationFrame(loop);
	};
	requestAnimationFrame(loop);
}
