// Prototype: the anti-hero on a lit station (DESIGN.md §7a rethought). The station is a normal,
// working, clean one; the hero runs the real maze on the real movement rules and eats energy
// capsules. After a while a copy of him appears on his own trail and follows his path a few
// seconds behind, wearing the hero's body inside out (`mimicLook`); the next one walks the
// MIRRORED trail (the maze is left-right symmetric), so it comes from the other side. Every dozen
// capsules brings another, and the station turns strange: the lamps drift to violet, the wall
// screens open eyes that watch him, the stasis chamber fills with copies. A power cell (the
// energizer) gives six seconds of clarity: the station is itself again and the copies are
// harmless ghosts. A touch costs health. Arrows / WASD steer, R restarts.
// Query: ?ms (Ms. Pac-Man), ?n=<copies at the start>, ?auto (a random runner), ?god (no damage),
// ?t=<s> (simulate that long first, for screenshots).
import { GRID_STATION } from '../../../src/games/pacman/config/mazes';
import { EventBus } from '../../../src/games/pacman/engine/EventBus';
import type { PacmanEventMap } from '../../../src/games/pacman/core/Events';
import { GridModel } from '../../../src/games/pacman/logic/maze/GridModel';
import { GridService } from '../../../src/games/pacman/logic/maze/GridService';
import { LevelProgress } from '../../../src/games/pacman/logic/level/LevelProgress';
import { ScoreModel } from '../../../src/games/pacman/logic/level/ScoreModel';
import { PlayerService } from '../../../src/games/pacman/logic/actors/PlayerService';
import type { PlayerDirection } from '../../../src/games/pacman/logic/actors/PlayerModel';
import { GAME_FEEL } from '../../../src/games/pacman/render/actors/HeroView';
import type { Hero } from '../../../src/games/pacman/render/actors/hero/Hero';
import { PacmanHero } from '../../../src/games/pacman/render/actors/hero/PacmanHero';
import { MsPacmanHero } from '../../../src/games/pacman/render/actors/hero/MsPacmanHero';
import { LitWorld } from './litStation';
import { MIMIC, MimicMs, MimicPacman, mimicPainter, mimicPainterMs } from './mimicLook';

const view = document.getElementById('view') as HTMLCanvasElement;
const ctx = view.getContext('2d') as CanvasRenderingContext2D;
const D = Math.min(window.devicePixelRatio || 1, 2);
const params = new URLSearchParams(location.search);
const MS = params.has('ms');
const AUTO = params.has('auto');
const GOD = params.has('god');
const grid = GRID_STATION;
const W = grid[0].length;

/** Everything to tune by feel. */
const TUNE = {
	/** Capsules before the first copy, and between the next ones. */
	first: 10,
	every: 12,
	/** Seconds behind him: the first copy, and the step to each next one. */
	delay: 5,
	delayStep: 2.4,
	max: 8,
	/** Seconds of clarity from a power cell. */
	clarity: 6,
	/** Health a touch takes, the grace after one (s), and how close counts (tiles). */
	damage: 0.34,
	grace: 1,
	touch: 0.5
};

interface Sample {
	t: number;
	x: number;
	y: number;
}
interface Mimic {
	id: number;
	delay: number;
	mirror: boolean;
	born: number;
	hero: Hero;
	angle: number;
	/** The time it is frozen at while it stutters, or null. */
	frozen: number | null;
	nextGlitch: number;
	x: number;
	y: number;
	moving: boolean;
}
interface Run {
	grid: GridService;
	progress: LevelProgress;
	player: PlayerService;
	hist: Sample[];
	mimics: Mimic[];
	time: number;
	eaten: number;
	nextSpawn: number;
	hp: number;
	grace: number;
	clarity: number;
	end: 'caught' | null;
}

const world = new LitWorld(grid);
const mkHero = (): Hero => {
	const h = MS ? new MsPacmanHero() : new PacmanHero();
	h.setFeel(GAME_FEEL);
	return h;
};
const hero = mkHero();
let heroAngle = 0;
let strange = 0;
const DIRS: Record<PlayerDirection, [number, number]> = { UP: [0, -1], DOWN: [0, 1], LEFT: [-1, 0], RIGHT: [1, 0] };
const OPP: Record<PlayerDirection, PlayerDirection> = { UP: 'DOWN', DOWN: 'UP', LEFT: 'RIGHT', RIGHT: 'LEFT' };
const ENERGIZERS: Array<{ x: number; y: number }> = [];
grid.forEach((row, y) => row.forEach((tk, x) => tk === 'EU' && ENERGIZERS.push({ x, y })));

function newRun(): Run {
	const g = new GridService(new GridModel(grid));
	const events = new EventBus<PacmanEventMap>();
	const progress = new LevelProgress(g, new ScoreModel(), events);
	const player = new PlayerService(g, progress, events);
	return {
		grid: g,
		progress,
		player,
		hist: [],
		mimics: [],
		time: 0,
		eaten: 0,
		nextSpawn: TUNE.first,
		hp: 1,
		grace: 0,
		clarity: 0,
		end: null
	};
}
let run = newRun();
/** Where everyone was drawn, in css px: a hook for scripted close-up screenshots. */
let px: { hero: { x: number; y: number }; mimics: Array<{ x: number; y: number }>; tile: number } | null = null;
(window as unknown as { __px: () => typeof px }).__px = () => px;
const held: PlayerDirection[] = [];

/** Where the hero was `t` seconds into the run (between two samples). */
function sampleAt(r: Run, t: number): Sample {
	const h = r.hist;
	if (h.length === 0) return { t, x: r.player.position.x, y: r.player.position.y };
	if (t <= h[0].t) return h[0];
	if (t >= h[h.length - 1].t) return h[h.length - 1];
	let lo = 0;
	let hi = h.length - 1;
	while (hi - lo > 1) {
		const mid = (lo + hi) >> 1;
		if (h[mid].t <= t) lo = mid;
		else hi = mid;
	}
	const k = (t - h[lo].t) / (h[hi].t - h[lo].t || 1);
	return { t, x: h[lo].x + (h[hi].x - h[lo].x) * k, y: h[lo].y + (h[hi].y - h[lo].y) * k };
}

function spawn(r: Run): void {
	const k = r.mimics.length;
	if (k >= TUNE.max) return;
	const h = MS ? new MimicMs() : new MimicPacman();
	h.setFeel({ ...GAME_FEEL, eye: false });
	h.setOver(MS ? mimicPainterMs : mimicPainter);
	const delay = TUNE.delay + k * TUNE.delayStep + Math.random() * 1.2;
	const at = sampleAt(r, r.time - delay);
	r.mimics.push({
		id: k + 1,
		delay,
		// every second copy walks the mirrored trail: it comes from the other side
		mirror: k % 2 === 1,
		born: r.time,
		hero: h,
		angle: 0,
		frozen: null,
		nextGlitch: r.time + 2 + Math.random() * 3,
		x: at.x,
		y: at.y,
		moving: true
	});
}

let autoTimer = 0;
function autopilot(r: Run, dt: number): void {
	autoTimer -= dt;
	if (autoTimer > 0) return;
	autoTimer = 0.25 + Math.random() * 0.7;
	const tile = r.player.tile;
	const f = r.player.facing;
	const dirs = (['UP', 'DOWN', 'LEFT', 'RIGHT'] as const).filter((d) => {
		const [dx, dy] = DIRS[d];
		return r.grid.isWalkable(tile.x + dx, tile.y + dy) && d !== (f ? OPP[f] : null);
	});
	const pick = f && dirs.includes(f) && Math.random() < 0.6 ? f : dirs[Math.floor(Math.random() * dirs.length)];
	if (pick) r.player.setDesiredDirection(pick);
}

function step(r: Run, dt: number): void {
	if (r.end) return;
	r.time += dt;
	if (AUTO) autopilot(r, dt);
	const want = held[held.length - 1];
	if (want) r.player.setDesiredDirection(want);
	const before = r.progress.remainingDots;
	const cellsBefore = ENERGIZERS.filter((e) => r.progress.isCollected(e.x, e.y)).length;
	r.player.update(dt);
	r.eaten += before - r.progress.remainingDots;
	const p = r.player.position;
	r.hist.push({ t: r.time, x: p.x, y: p.y });
	if (ENERGIZERS.filter((e) => r.progress.isCollected(e.x, e.y)).length > cellsBefore) r.clarity = TUNE.clarity;
	r.clarity = Math.max(0, r.clarity - dt);
	if (r.eaten >= r.nextSpawn) {
		spawn(r);
		r.nextSpawn += TUNE.every;
	}
	r.grace = Math.max(0, r.grace - dt);
	for (const m of r.mimics) {
		// a stutter: it freezes for a breath, then catches up in one jump
		if (m.frozen === null && r.time > m.nextGlitch) {
			m.frozen = r.time - m.delay;
			m.nextGlitch = r.time + 0.22;
		} else if (m.frozen !== null && r.time > m.nextGlitch) {
			m.frozen = null;
			m.nextGlitch = r.time + 2.5 + Math.random() * 3.5;
		}
		const tq = m.frozen ?? r.time - m.delay;
		const a = sampleAt(r, tq);
		const b = sampleAt(r, tq + 0.06);
		const ax = m.mirror ? W - a.x : a.x;
		const bx = m.mirror ? W - b.x : b.x;
		const moved = Math.hypot(bx - ax, b.y - a.y);
		if (moved > 0.002) {
			const target = Math.atan2(b.y - a.y, bx - ax);
			let d = target - m.angle;
			while (d > Math.PI) d -= Math.PI * 2;
			while (d < -Math.PI) d += Math.PI * 2;
			m.angle += d * Math.min(1, dt * 18);
		}
		m.moving = moved > 0.002 && m.frozen === null;
		m.x = ax;
		m.y = a.y;
		if (!GOD && r.clarity <= 0 && r.grace <= 0 && Math.hypot(m.x - p.x, m.y - p.y) < TUNE.touch) {
			r.hp = Math.max(0, r.hp - TUNE.damage);
			r.grace = TUNE.grace;
		}
	}
	if (r.hp <= 0) r.end = 'caught';
}

function draw(r: Run, dt: number, now: number): void {
	const vw = window.innerWidth;
	const vh = window.innerHeight;
	if (view.width !== Math.round(vw * D) || view.height !== Math.round(vh * D)) {
		view.width = Math.round(vw * D);
		view.height = Math.round(vh * D);
	}
	ctx.setTransform(D, 0, 0, D, 0, 0);
	world.resize(vw, vh, D);
	const L = world.layout;
	const S = L.tileSize;
	const t = now / 1000;
	const target = r.clarity > 0 ? 0 : Math.min(1, r.mimics.length / 6);
	strange += (target - strange) * Math.min(1, dt * (target < strange ? 3 : 0.8));
	// the grade belongs to the station only: the hero and the copies keep their own colours
	const grade = strange > 0.01 ? `hue-rotate(${(strange * 26 + Math.sin(t * 0.3) * 5 * strange).toFixed(1)}deg) saturate(${(1 + strange * 0.3).toFixed(2)})` : 'none';
	ctx.fillStyle = '#070b10';
	ctx.fillRect(0, 0, vw, vh);
	ctx.filter = grade;
	world.draw(ctx, t);
	world.drawLights(ctx, t, strange);
	world.drawChamber(ctx, t, r.mimics.length, strange);
	ctx.filter = 'none';
	const taken = (x: number, y: number): boolean => r.progress.isCollected(x, y);
	world.drawChips(ctx, taken);
	world.drawCells(ctx, taken, t);
	world.drawMonitors(ctx, t, strange, r.player.position);
	// the copies, then him
	for (const m of r.mimics) {
		const age = Math.min(1, (r.time - m.born) / 1.4);
		const stutter = m.frozen !== null ? 0.55 : 1;
		ctx.save();
		ctx.globalAlpha = age * stutter * (r.clarity > 0 ? 0.3 : 1);
		m.hero.setRadius(S * 0.33);
		m.hero.update(dt, {
			x: L.offsetX + m.x * S,
			y: L.offsetY + m.y * S,
			angle: m.angle,
			moving: m.moving,
			power: false,
			ending: false,
			season: MIMIC
		});
		m.hero.draw(ctx);
		ctx.restore();
	}
	const p = r.player.position;
	const f = r.player.facing;
	if (f) {
		const [dx, dy] = DIRS[f];
		let d = Math.atan2(dy, dx) - heroAngle;
		while (d > Math.PI) d -= Math.PI * 2;
		while (d < -Math.PI) d += Math.PI * 2;
		heroAngle += d * Math.min(1, dt * 30);
	}
	hero.setRadius(S * 0.33);
	hero.update(dt, {
		x: L.offsetX + p.x * S,
		y: L.offsetY + p.y * S,
		angle: heroAngle,
		moving: !!f,
		power: r.clarity > 0,
		ending: r.clarity > 0 && r.clarity < 1.2,
		dying: r.end === 'caught',
		season: 'summer'
	});
	hero.draw(ctx);
	hud(r, vw, vh);
	px = {
		hero: { x: L.offsetX + p.x * S, y: L.offsetY + p.y * S },
		mimics: r.mimics.map((m) => ({ x: L.offsetX + m.x * S, y: L.offsetY + m.y * S })),
		tile: S
	};
}

function bar(x: number, y: number, w: number, v: number, color: string, label: string): void {
	ctx.fillStyle = 'rgba(0,0,0,.55)';
	ctx.fillRect(x - 2, y - 2, w + 4, 16);
	ctx.fillStyle = '#1a2229';
	ctx.fillRect(x, y, w, 12);
	ctx.fillStyle = color;
	ctx.fillRect(x, y, w * Math.max(0, Math.min(1, v)), 12);
	ctx.fillStyle = '#e8f4f8';
	ctx.font = '700 12px "Courier New", monospace';
	ctx.textAlign = 'left';
	ctx.fillText(label, x, y - 6);
}

function hud(r: Run, vw: number, vh: number): void {
	bar(24, 40, 200, r.hp, '#ff4b6a', 'HEALTH');
	bar(24, 80, 200, r.clarity / TUNE.clarity, '#6dffe0', r.clarity > 0 ? 'CLARITY' : 'POWER CELL = CLARITY');
	ctx.fillStyle = '#e8f4f8';
	ctx.font = '700 13px "Courier New", monospace';
	ctx.textAlign = 'left';
	ctx.fillText(`COPIES ${r.mimics.length}   CAPSULES ${r.eaten}`, 24, 122);
	ctx.fillStyle = 'rgba(232,244,248,.65)';
	ctx.font = '12px "Courier New", monospace';
	ctx.fillText('arrows/WASD · R restart', 24, vh - 20);
	if (r.end) {
		ctx.fillStyle = 'rgba(0,0,0,.6)';
		ctx.fillRect(0, vh / 2 - 50, vw, 100);
		ctx.fillStyle = '#ff4b6a';
		ctx.font = '700 40px "Arial Narrow", Arial, sans-serif';
		ctx.textAlign = 'center';
		ctx.fillText('CAUGHT BY YOURSELF', vw / 2, vh / 2 + 6);
		ctx.font = '14px "Courier New", monospace';
		ctx.fillText(`${r.time | 0} s · R to run again`, vw / 2, vh / 2 + 34);
		ctx.textAlign = 'left';
	}
}

const KEYS: Record<string, PlayerDirection> = {
	ArrowUp: 'UP',
	ArrowDown: 'DOWN',
	ArrowLeft: 'LEFT',
	ArrowRight: 'RIGHT',
	KeyW: 'UP',
	KeyS: 'DOWN',
	KeyA: 'LEFT',
	KeyD: 'RIGHT'
};
window.addEventListener('keydown', (e) => {
	const dir = KEYS[e.code];
	if (dir) {
		e.preventDefault();
		if (!held.includes(dir)) held.push(dir);
	} else if (e.code === 'KeyR') {
		run = newRun();
		held.length = 0;
		hero.reset();
		strange = 0;
	}
});
window.addEventListener('keyup', (e) => {
	const dir = KEYS[e.code];
	const i = dir ? held.indexOf(dir) : -1;
	if (i >= 0) held.splice(i, 1);
});
window.addEventListener('blur', () => (held.length = 0));

// scripted starts for screenshots: copies at the start, a head start of simulated play
const preset = Number(params.get('n') ?? 0);
const warm = Number(params.get('t') ?? 0);
for (let s = 0; s < warm; s += 1 / 30) {
	step(run, 1 / 30);
	if (s < 0.05) for (let i = 0; i < preset; i += 1) spawn(run);
}
if (warm === 0) for (let i = 0; i < preset; i += 1) spawn(run);
strange = Math.min(1, run.mimics.length / 6);

let last = -1;
function frame(now: number): void {
	const dt = last < 0 ? 1 / 60 : Math.min(0.05, (now - last) / 1000);
	last = now;
	step(run, dt);
	draw(run, dt, now);
	requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
