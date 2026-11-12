// Prototype: the grid world's look (`src/games/pacman/TRON.md`), second attempt, built from the
// game's own modules (`render/grid/*`, `logic/grid/LightWall`). The hero is the real player logic
// on `grid_tron`, steered with the arrows; the boss's cycle and the programs drive themselves (no
// crashes yet: the mechanics come next). Buttons: three light setups, flat or tilted camera (the
// abyss sits deeper than the arena), the hero, the dive in. Query: ?light=b&tilt&ms&capture
// (capture: window.__advance(seconds), window.__key(direction)).
import { GRID_TRON } from '../../../src/games/pacman/config/mazes/grid_tron';
import { EventBus } from '../../../src/games/pacman/engine/EventBus';
import type { PacmanEventMap } from '../../../src/games/pacman/core/Events';
import { GridModel } from '../../../src/games/pacman/logic/maze/GridModel';
import { GridService } from '../../../src/games/pacman/logic/maze/GridService';
import { LevelProgress } from '../../../src/games/pacman/logic/level/LevelProgress';
import { ScoreModel } from '../../../src/games/pacman/logic/level/ScoreModel';
import { PlayerService } from '../../../src/games/pacman/logic/actors/PlayerService';
import type { PlayerDirection } from '../../../src/games/pacman/logic/actors/PlayerModel';
import { LightWall, cutHead } from '../../../src/games/pacman/logic/grid/LightWall';
import type { WallPoint } from '../../../src/games/pacman/logic/grid/LightWall';
import { bakeArena } from '../../../src/games/pacman/render/grid/gridArena';
import type { ArenaBake } from '../../../src/games/pacman/render/grid/gridArena';
import { GLOW_SETUPS, GlowChain } from '../../../src/games/pacman/render/grid/gridGlow';
import { GridAbyss } from '../../../src/games/pacman/render/grid/gridAbyss';
import {
	drawBit,
	drawCycle,
	drawHero,
	drawOverclock,
	drawProgram
} from '../../../src/games/pacman/render/grid/gridActors';
import { Derez, drawLightWall } from '../../../src/games/pacman/render/grid/gridTrail';
import { ENEMY, HERO, WORLD } from '../../../src/games/pacman/render/grid/gridPalette';

type LightId = 'a' | 'b' | 'c';
const q = new URLSearchParams(location.search);
let light: LightId = (['a', 'b', 'c'] as const).includes(q.get('light') as LightId)
	? (q.get('light') as LightId)
	: 'b';
let tilt = q.has('tilt');
let ms = q.has('ms');
const D = Math.min(window.devicePixelRatio || 1, 2);

const $ = <E extends HTMLElement>(id: string) => document.getElementById(id) as E;
const abyssCv = $<HTMLCanvasElement>('abyss');
const worldCv = $<HTMLCanvasElement>('world');
const hudCv = $<HTMLCanvasElement>('hud');
const actx = abyssCv.getContext('2d') as CanvasRenderingContext2D;
const wctx = worldCv.getContext('2d') as CanvasRenderingContext2D;
const hctx = hudCv.getContext('2d') as CanvasRenderingContext2D;

const S = GRID_TRON;
const ROWS = S.length;
const COLS = S[0].length;
const HUD_TOP = 70;

// ── the game's own logic for the hero ──
let events: EventBus<PacmanEventMap>;
let grid: GridService;
let progress: LevelProgress;
let player: PlayerService;
const heroWall = new LightWall(5);
const bossWall = new LightWall(14);
const heroDerez = new Derez();
const bossDerez = new Derez();
const abyss = new GridAbyss();
const glow = new GlowChain();
const held: PlayerDirection[] = [];

// ── the boss and the programs: tile walkers on autopilot ──
type Dir = 0 | 1 | 2 | 3;
const DX = [1, 0, -1, 0];
const DY = [0, 1, 0, -1];
interface Walker {
	c: number;
	r: number;
	dir: Dir;
	prog: number;
	speed: number;
}
let boss: Walker;
let programs: Walker[] = [];
let seed = 17;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
const walkable = (c: number, r: number) => grid.isWalkable(c, r) && !['LT', 'BY', 'IY', 'PY', 'CE', 'LE'].includes(S[r]?.[c] ?? '');

/** Tiles a wall of light covers now (the boss steers clear of them). */
function wallTiles(): Set<string> {
	const out = new Set<string>();
	for (const pts of [heroWall.polyline(), bossWall.polyline()]) {
		for (let i = 1; i < pts.length; i++) {
			const a = pts[i - 1];
			const b = pts[i];
			const n = Math.ceil(Math.abs(b.x - a.x) + Math.abs(b.y - a.y)) * 2;
			for (let k = 0; k <= n; k++) {
				const x = a.x + ((b.x - a.x) * k) / Math.max(1, n);
				const y = a.y + ((b.y - a.y) * k) / Math.max(1, n);
				out.add(`${Math.floor(x)},${Math.floor(y)}`);
			}
		}
	}
	return out;
}

function choose(w: Walker, avoid: Set<string> | null): void {
	const options = ([0, 1, 2, 3] as Dir[]).filter((d) => {
		if (d === (w.dir + 2) % 4) return false;
		const c = w.c + DX[d];
		const r = w.r + DY[d];
		return walkable(c, r) && !(avoid && avoid.has(`${c},${r}`));
	});
	if (options.length === 0) {
		const any = ([0, 1, 2, 3] as Dir[]).filter((d) => walkable(w.c + DX[d], w.r + DY[d]));
		w.dir = any.includes(w.dir) ? w.dir : (any[0] ?? w.dir);
		return;
	}
	w.dir = options.includes(w.dir) && rnd() < 0.6 ? w.dir : options[Math.floor(rnd() * options.length)];
}

function step(w: Walker, dt: number, avoid: Set<string> | null): void {
	w.prog += w.speed * dt;
	while (w.prog >= 1) {
		w.prog -= 1;
		w.c += DX[w.dir];
		w.r += DY[w.dir];
		choose(w, avoid);
	}
	if (!walkable(w.c + DX[w.dir], w.r + DY[w.dir])) choose(w, avoid);
}

const where = (w: Walker): WallPoint => {
	const k = walkable(w.c + DX[w.dir], w.r + DY[w.dir]) ? w.prog : 0;
	return { x: w.c + 0.5 + DX[w.dir] * k, y: w.r + 0.5 + DY[w.dir] * k };
};

function start(): void {
	events = new EventBus<PacmanEventMap>();
	grid = new GridService(new GridModel(S));
	progress = new LevelProgress(grid, new ScoreModel(), events);
	player = new PlayerService(grid, progress, events);
	heroWall.reset();
	bossWall.reset();
	boss = { c: 12, r: 4, dir: 0, prog: 0, speed: 8 };
	programs = [
		{ c: 4, r: 13, dir: 3, prog: 0, speed: 4.2 },
		{ c: 20, r: 13, dir: 1, prog: 0, speed: 4.2 },
		{ c: 12, r: 16, dir: 0, prog: 0, speed: 4.2 }
	];
	dive = 0;
	boot = 0;
}

// ── layout ──
let vw = 0;
let vh = 0;
let T = 20;
let ox = 0;
let oy = 0;
let arena: ArenaBake | null = null;
let time = 0;
let dive = 0;
let boot = 0;

function layout(): void {
	vw = window.innerWidth;
	vh = window.innerHeight;
	for (const cv of [abyssCv, worldCv, hudCv]) {
		cv.width = Math.round(vw * D);
		cv.height = Math.round(vh * D);
		cv.style.width = `${vw}px`;
		cv.style.height = `${vh}px`;
	}
	const avail = vh - HUD_TOP - 64;
	T = Math.floor(Math.min((vw - 32) / COLS, avail / ROWS));
	ox = Math.round((vw - COLS * T) / 2);
	oy = Math.round(HUD_TOP + (avail - ROWS * T) / 2);
	arena = bakeArena(S, { T, ox, oy, vw, vh, dpr: D });
	applyTilt();
}

function applyTilt(): void {
	document.body.classList.toggle('tilt', tilt);
	$('tilt').setAttribute('aria-pressed', String(tilt));
	$('tilt').textContent = tilt ? 'Вид: наклон' : 'Вид: сверху';
}

// ── input ──
const KEYS: Record<string, PlayerDirection> = {
	ArrowUp: 'UP',
	KeyW: 'UP',
	ArrowDown: 'DOWN',
	KeyS: 'DOWN',
	ArrowLeft: 'LEFT',
	KeyA: 'LEFT',
	ArrowRight: 'RIGHT',
	KeyD: 'RIGHT'
};
window.addEventListener('keydown', (e) => {
	const d = KEYS[e.code];
	if (!d) return;
	e.preventDefault();
	if (e.repeat) return;
	held.splice(0, held.length, ...held.filter((x) => x !== d), d);
	player.setDesiredDirection(d);
});
window.addEventListener('keyup', (e) => {
	const d = KEYS[e.code];
	if (d) held.splice(0, held.length, ...held.filter((x) => x !== d));
});

// ── the frame ──
const ANGLE: Record<string, number> = { RIGHT: 0, DOWN: Math.PI / 2, LEFT: Math.PI, UP: -Math.PI / 2 };

function frame(dt: number): void {
	time += dt;
	dive += dt;
	boot += dt;
	const last = held[held.length - 1];
	if (last) player.setDesiredDirection(last);
	player.update(dt);
	if (progress.remainingDots <= 0) start();
	// the hero's wall grows with the bits he has eaten
	heroWall.setLength(Math.min(16, 5 + progress.collectedDots * 0.06));
	const hp = player.position;
	heroWall.advance(hp.x, hp.y);
	const avoid = wallTiles();
	step(boss, dt, avoid);
	bossWall.advance(where(boss).x, where(boss).y);
	for (const p of programs) step(p, dt, null);
	abyss.update(dt);
	heroDerez.update(dt);
	bossDerez.update(dt);

	// the dive: from high above, then in; the plane below comes nearer slower
	const k = Math.min(1, dive / 2.4);
	const e = 1 - Math.pow(1 - k, 3);
	const zoom = 0.28 + 0.72 * e;
	actx.setTransform(D, 0, 0, D, 0, 0);
	abyss.draw(actx, vw, vh, 0.75 + 0.25 * e);

	const W = vw * D;
	const H = vh * D;
	if (!arena) return;
	// the arena's transform: css px, scaled by the dive round the screen's centre
	const cx = vw / 2;
	const cy = (vh + HUD_TOP) / 2;
	const place = (c: CanvasRenderingContext2D) => {
		c.setTransform(D, 0, 0, D, 0, 0);
		c.translate(cx, cy);
		c.scale(zoom, zoom);
		c.translate(-cx, -cy);
	};
	const px = (p: WallPoint): WallPoint => ({ x: ox + p.x * T, y: oy + p.y * T });
	const lift = tilt ? T * 0.4 : 0;

	wctx.setTransform(1, 0, 0, 1, 0, 0);
	wctx.clearRect(0, 0, W, H);
	place(wctx);
	wctx.drawImage(arena.dark, 0, 0, vw, vh);
	const em = glow.begin(W, H);
	place(em);
	em.drawImage(arena.light, 0, 0, vw, vh);
	// bits and overclocks, from the real level progress
	em.fillStyle = WORLD.core;
	em.globalAlpha = 0.5;
	for (let r = 0; r < ROWS; r++) {
		for (let c = 0; c < COLS; c++) {
			if (progress.isCollected(c, r)) continue;
			if (S[r][c] === 'DT') drawBit(em, ox + (c + 0.5) * T, oy + (r + 0.5) * T, T);
		}
	}
	em.globalAlpha = 1;
	for (let r = 0; r < ROWS; r++) {
		for (let c = 0; c < COLS; c++) {
			if (S[r][c] === 'EU' && !progress.isCollected(c, r)) {
				drawOverclock(em, ox + (c + 0.5) * T, oy + (r + 0.5) * T, T, time);
			}
		}
	}
	// the walls of light: they leave the rider's back
	const heroLine = cutHead(heroWall.polyline(), 0.42).map(px);
	const bossLine = cutHead(bossWall.polyline(), 0.62).map(px);
	drawLightWall(em, bossLine, ENEMY, T, lift);
	drawLightWall(em, heroLine, HERO, T, lift);
	const tail = (w: LightWall) => (w.tail ? px(w.tail) : null);
	heroDerez.shed(tail(heroWall), heroWall.shed, T);
	bossDerez.shed(tail(bossWall), bossWall.shed, T);
	heroDerez.draw(em, HERO);
	bossDerez.draw(em, ENEMY);
	// the riders and the programs
	const rise = tilt ? T * 0.22 : 0;
	for (const p of programs) {
		const w = px(where(p));
		drawProgram(wctx, em, w.x, w.y - rise, T, time);
	}
	const b = px(where(boss));
	drawCycle(wctx, em, b.x, b.y - rise, T, (boss.dir * Math.PI) / 2);
	const h = px(hp);
	const moving = Boolean(player.facing);
	drawHero(
		wctx,
		em,
		h.x,
		h.y - rise,
		T,
		ANGLE[player.facing ?? 'LEFT'],
		moving ? Math.abs(Math.sin(time * 14)) : 0.3,
		ms
	);
	// the light over everything, the floor mirroring it
	glow.compose(wctx, GLOW_SETUPS[light], (c) => {
		place(c);
		c.clip(arena!.floor);
		c.setTransform(1, 0, 0, 1, 0, 0);
	});
	drawHud();
}

// ── the HUD (prototype only; the game's is Svelte): one hairline across the top, labels sitting
// on it, the wall's energy as ticks on the line, the boss as an identity disc. It boots: the line
// draws out from the centre, then the rest lights up. ──
function drawHud(): void {
	const x = hctx;
	x.setTransform(D, 0, 0, D, 0, 0);
	x.clearRect(0, 0, vw, vh);
	const b = (from: number, len = 0.4) => Math.max(0, Math.min(1, (boot - from) / len));
	const y = 44;
	const font = (size: number) => `${size}px Michroma, "Arial Narrow", sans-serif`;
	x.lineCap = 'butt';
	// the hairline
	const k = b(0.1, 0.6);
	if (k > 0) {
		x.strokeStyle = WORLD.mid;
		x.globalAlpha = 0.7;
		x.lineWidth = 1;
		x.beginPath();
		x.moveTo(vw / 2 - (vw / 2 - 24) * k, y + 0.5);
		x.lineTo(vw / 2 + (vw / 2 - 24) * k, y + 0.5);
		x.stroke();
		x.globalAlpha = 1;
	}
	x.textBaseline = 'alphabetic';
	// the score, left
	if (b(0.7) > 0) {
		x.globalAlpha = b(0.7);
		x.fillStyle = WORLD.mid;
		x.font = font(9);
		x.fillText('SCORE', 24, y - 26);
		x.fillStyle = HERO.core;
		x.font = font(16);
		x.fillText(String(progress.collectedDots * 10).padStart(6, '0'), 24, y - 8);
		x.globalAlpha = 1;
	}
	// the wall's energy: ticks on the line, lit up to its length
	if (b(0.9) > 0) {
		const n = 40;
		const span = Math.min(420, vw * 0.36);
		const x0 = vw / 2 - span / 2;
		const lit = Math.round(((heroWall.length - 5) / 11) * n * b(0.9, 0.8));
		x.fillStyle = WORLD.mid;
		x.font = font(9);
		x.globalAlpha = b(0.9);
		x.fillText('WALL', x0, y - 26);
		for (let i = 0; i < n; i++) {
			const on = i <= lit;
			x.fillStyle = on ? HERO.mid : 'rgba(54,220,255,0.18)';
			const hgt = on ? 12 : 6;
			x.fillRect(Math.round(x0 + (i * span) / n), y - hgt, 2, hgt);
		}
		x.globalAlpha = 1;
	}
	// the boss: an identity disc, three segments (one per crash), a ring, a core
	if (b(1.1) > 0) {
		const rx = vw - 48;
		const ry = y - 14;
		x.globalAlpha = b(1.1);
		x.fillStyle = ENEMY.mid;
		x.font = font(9);
		x.textAlign = 'right';
		x.fillText('CYCLE', rx - 30, y - 26);
		x.textAlign = 'left';
		const seg = b(1.2, 0.6) * 3;
		for (let i = 0; i < 3; i++) {
			const a0 = -Math.PI / 2 + (i * Math.PI * 2) / 3 + 0.12;
			const a1 = a0 + ((Math.PI * 2) / 3 - 0.24) * Math.max(0, Math.min(1, seg - i));
			x.strokeStyle = ENEMY.mid;
			x.lineWidth = 3;
			x.beginPath();
			x.arc(rx, ry, 16, a0, a1);
			x.stroke();
		}
		x.strokeStyle = ENEMY.mid;
		x.lineWidth = 1;
		x.beginPath();
		x.arc(rx, ry, 9, 0, Math.PI * 2);
		x.stroke();
		x.fillStyle = ENEMY.core;
		x.fillRect(rx - 1.5, ry - 1.5, 3, 3);
		x.globalAlpha = 1;
	}
}

// ── controls ──
function pressed(): void {
	for (const b of document.querySelectorAll<HTMLButtonElement>('[data-light]')) {
		b.setAttribute('aria-pressed', String(b.dataset.light === light));
	}
	$('who').textContent = ms ? 'Ms. Pac-Man' : 'Pac-Man';
}
for (const b of document.querySelectorAll<HTMLButtonElement>('#ctl button')) {
	b.tabIndex = -1;
	b.addEventListener('mousedown', (e) => e.preventDefault());
}
for (const b of document.querySelectorAll<HTMLButtonElement>('[data-light]')) {
	b.textContent = GLOW_SETUPS[b.dataset.light as LightId].name;
	b.addEventListener('click', () => {
		light = b.dataset.light as LightId;
		pressed();
	});
}
$('tilt').addEventListener('click', () => {
	tilt = !tilt;
	applyTilt();
});
$('who').addEventListener('click', () => {
	ms = !ms;
	pressed();
});
$('dive').addEventListener('click', () => {
	dive = 0;
	boot = 0;
});

start();
window.addEventListener('resize', layout);
layout();
pressed();
if (q.has('capture')) {
	const w = window as unknown as { __advance: (s: number) => void; __key: (d: PlayerDirection) => void };
	w.__advance = (seconds: number) => {
		for (let i = 0; i < Math.round(seconds * 60); i++) frame(1 / 60);
	};
	w.__key = (d) => {
		held.splice(0, held.length, d);
		player.setDesiredDirection(d);
	};
} else {
	let lastT = performance.now();
	const loop = (now: number) => {
		frame(Math.min(0.05, Math.max(0, (now - lastT) / 1000)));
		lastT = now;
		requestAnimationFrame(loop);
	};
	requestAnimationFrame(loop);
}
