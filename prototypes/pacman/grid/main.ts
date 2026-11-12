// Prototype: the look of the grid world (the TRON-language boss level, `src/games/pacman/TRON.md`)
// on the real `grid_tron`, before any of its mechanics exist. Darkness first, light only on
// edges; the glow in three layers (a burnt core, a narrow halo, a wide one) made by drawing every
// emissive thing into its own layer and blurring it down and back up; a platform of dark glass
// over an abyss with a city of light drifting far below; walls as dark monoliths with lit edges;
// the hero as a light outline that leaves a wall, the boss's orange cycle cutting the maze with its
// own; programs (ghosts) as orange wireframes; a HUD of thin lines that boots. Autopilot only:
// nobody crashes yet. Buttons: three light setups, flat or tilted camera, the hero, the dive in.
// Query: ?light=b&tilt&ms&capture (capture: window.__advance(seconds)).
import { GRID_TRON } from '../../../src/games/pacman/config/mazes/grid_tron';

type Light = 'a' | 'b' | 'c';
interface LightSetup {
	readonly name: string;
	/** The crisp emissive layer, the narrow halo (1/4 res), the wide halo (1/16 res). */
	readonly core: number;
	readonly narrow: number;
	readonly wide: number;
	/** The floor's reflection of the light. */
	readonly mirror: number;
}
const LIGHTS: Record<Light, LightSetup> = {
	a: { name: 'Свет A: сдержанный', core: 1, narrow: 0.55, wide: 0.22, mirror: 0.1 },
	b: { name: 'Свет B: классика', core: 1, narrow: 0.85, wide: 0.45, mirror: 0.16 },
	c: { name: 'Свет C: пафос', core: 1, narrow: 1.1, wide: 0.85, mirror: 0.24 }
};

const HERO = { core: '#e8fdff', mid: '#3fe0ff', deep: '#0a6c9a' };
const ENEMY = { core: '#ffe4cc', mid: '#ff6a1a', deep: '#8a2400' };
const WORLD = { core: '#f2fbff', mid: '#9fd6ff', dim: 'rgba(120,190,255,0.10)' };

const q = new URLSearchParams(location.search);
let light: Light = (['a', 'b', 'c'] as const).includes(q.get('light') as Light)
	? (q.get('light') as Light)
	: 'b';
let tilt = q.has('tilt');
let ms = q.has('ms');
const D = Math.min(window.devicePixelRatio || 1, 2);

const $ = <E extends HTMLElement>(id: string) => document.getElementById(id) as E;
const stage = $<HTMLDivElement>('stage');
const view = $<HTMLCanvasElement>('view');
const hud = $<HTMLCanvasElement>('hud');
const ctx = view.getContext('2d') as CanvasRenderingContext2D;
const hctx = hud.getContext('2d') as CanvasRenderingContext2D;

function canvas(w: number, h: number): { cv: HTMLCanvasElement; x: CanvasRenderingContext2D } {
	const cv = document.createElement('canvas');
	cv.width = Math.max(1, Math.round(w));
	cv.height = Math.max(1, Math.round(h));
	return { cv, x: cv.getContext('2d') as CanvasRenderingContext2D };
}

// ── the maze ─────────────────────────────────────────────────────────────────
const S = GRID_TRON;
const ROWS = S.length;
const COLS = S[0].length;
const WALK = new Set(['DT', 'EU', 'FT', 'PM']);
const isWall = (c: number, r: number) => S[r]?.[c] === 'WL';
const isWalk = (c: number, r: number) => WALK.has(S[r]?.[c] ?? '');
const isLair = (c: number, r: number) => ['LT', 'BY', 'IY', 'PY', 'CE', 'LE'].includes(S[r]?.[c] ?? '');

// ── layout ───────────────────────────────────────────────────────────────────
let vw = 0;
let vh = 0;
let T = 20;
let ox = 0;
let oy = 0;
const HUD_TOP = 64;

function layout(): void {
	vw = window.innerWidth;
	vh = window.innerHeight;
	for (const cv of [view, hud]) {
		cv.width = Math.round(vw * D);
		cv.height = Math.round(vh * D);
		cv.style.width = `${vw}px`;
		cv.style.height = `${vh}px`;
	}
	const avail = vh - HUD_TOP - 70;
	T = Math.floor(Math.min((vw - 32) / COLS, avail / ROWS));
	ox = Math.round((vw - COLS * T) / 2);
	oy = Math.round(HUD_TOP + (avail - ROWS * T) / 2);
	bakeAbyss();
	bakeArena();
	applyTilt();
}

function applyTilt(): void {
	stage.style.transform = tilt
		? 'perspective(1500px) rotateX(20deg) scale(0.94) translateY(-2%)'
		: 'none';
	$('tilt').setAttribute('aria-pressed', String(tilt));
	$('tilt').textContent = tilt ? 'Вид: наклон' : 'Вид: сверху';
}

// ── the abyss: a city of light far below, a grid fading into haze ────────────
let abyss: HTMLCanvasElement | null = null;
let city: Array<{ x: number; y: number; w: number; h: number; c: string; a: number }> = [];
function bakeAbyss(): void {
	const { cv, x } = canvas(vw * D, vh * D);
	x.scale(D, D);
	const g = x.createRadialGradient(vw / 2, vh * 0.55, 0, vw / 2, vh * 0.55, Math.max(vw, vh) * 0.75);
	g.addColorStop(0, '#04101c');
	g.addColorStop(0.6, '#01060c');
	g.addColorStop(1, '#000104');
	x.fillStyle = g;
	x.fillRect(0, 0, vw, vh);
	abyss = cv;
	let seed = 7;
	const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
	city = Array.from({ length: 140 }, () => {
		const warm = rnd() < 0.18;
		return {
			x: rnd() * 1.4 - 0.2,
			y: rnd() * 1.4 - 0.2,
			w: 2 + rnd() * 14,
			h: 1 + rnd() * 3,
			c: warm ? '255,140,60' : '120,200,255',
			a: 0.15 + rnd() * 0.35
		};
	});
}

// ── the arena: platform, floor grid, wall monoliths (baked); their lit edges (emissive) ──
let arena: HTMLCanvasElement | null = null;
let edges: HTMLCanvasElement | null = null;
/** How tall the walls stand in the tilted view, tiles. */
const WALL_H = 0.42;
function bakeArena(): void {
	const W = vw * D;
	const H = vh * D;
	const a = canvas(W, H);
	const e = canvas(W, H);
	a.x.scale(D, D);
	e.x.scale(D, D);
	const px = (c: number) => ox + c * T;
	const py = (r: number) => oy + r * T;
	// the platform: dark glass, its edge a cold line
	const m = T * 0.6;
	a.x.fillStyle = 'rgba(6,12,20,0.94)';
	a.x.beginPath();
	a.x.roundRect(px(1) - m, py(1) - m, (COLS - 2) * T + 2 * m, (ROWS - 2) * T + 2 * m, T * 0.4);
	a.x.fill();
	e.x.strokeStyle = WORLD.mid;
	e.x.globalAlpha = 0.55;
	e.x.lineWidth = Math.max(1, T * 0.05);
	e.x.beginPath();
	e.x.roundRect(px(1) - m, py(1) - m, (COLS - 2) * T + 2 * m, (ROWS - 2) * T + 2 * m, T * 0.4);
	e.x.stroke();
	e.x.globalAlpha = 1;
	// the floor's grid: one faint line per tile
	a.x.strokeStyle = WORLD.dim;
	a.x.lineWidth = 1;
	a.x.beginPath();
	for (let c = 1; c < COLS; c++) {
		a.x.moveTo(px(c) + 0.5, py(1));
		a.x.lineTo(px(c) + 0.5, py(ROWS - 1));
	}
	for (let r = 1; r < ROWS; r++) {
		a.x.moveTo(px(1), py(r) + 0.5);
		a.x.lineTo(px(COLS - 1), py(r) + 0.5);
	}
	a.x.stroke();
	// the lair: a slightly lit pit
	for (let r = 0; r < ROWS; r++) {
		for (let c = 0; c < COLS; c++) {
			if (isLair(c, r)) {
				a.x.fillStyle = 'rgba(255,106,26,0.06)';
				a.x.fillRect(px(c), py(r), T, T);
			}
		}
	}
	// the monoliths: dark blocks; their outline, inset, is the light
	const inset = T * 0.12;
	for (let r = 0; r < ROWS; r++) {
		for (let c = 0; c < COLS; c++) {
			if (!isWall(c, r)) continue;
			a.x.fillStyle = '#020407';
			a.x.fillRect(px(c), py(r), T, T);
		}
	}
	e.x.strokeStyle = WORLD.mid;
	e.x.lineWidth = Math.max(1, T * 0.04);
	e.x.lineCap = 'square';
	e.x.beginPath();
	for (let r = 0; r < ROWS; r++) {
		for (let c = 0; c < COLS; c++) {
			if (!isWall(c, r)) continue;
			const x0 = px(c);
			const y0 = py(r);
			const open = (dc: number, dr: number) => !isWall(c + dc, r + dr) && S[r + dr]?.[c + dc] !== 'ES';
			// one segment per side that faces the floor, inset into the block
			const sx0 = open(-1, 0) ? x0 + inset : x0;
			const sx1 = open(1, 0) ? x0 + T - inset : x0 + T;
			const sy0 = open(0, -1) ? y0 + inset : y0;
			const sy1 = open(0, 1) ? y0 + T - inset : y0 + T;
			if (open(0, -1)) {
				e.x.moveTo(sx0, y0 + inset);
				e.x.lineTo(sx1, y0 + inset);
			}
			if (open(0, 1)) {
				e.x.moveTo(sx0, y0 + T - inset);
				e.x.lineTo(sx1, y0 + T - inset);
			}
			if (open(-1, 0)) {
				e.x.moveTo(x0 + inset, sy0);
				e.x.lineTo(x0 + inset, sy1);
			}
			if (open(1, 0)) {
				e.x.moveTo(x0 + T - inset, sy0);
				e.x.lineTo(x0 + T - inset, sy1);
			}
		}
	}
	e.x.globalAlpha = 0.42;
	e.x.stroke();
	e.x.globalAlpha = 1;
	arena = a.cv;
	edges = e.cv;
}

// ── actors on autopilot ──────────────────────────────────────────────────────
type Dir = 0 | 1 | 2 | 3;
const DX = [1, 0, -1, 0];
const DY = [0, 1, 0, -1];
interface Actor {
	c: number;
	r: number;
	dir: Dir;
	prog: number;
	speed: number;
	trail: Array<{ x: number; y: number; t: number }>;
	life: number;
}
const occupied = new Map<string, number>();
const key = (c: number, r: number) => `${c},${r}`;

function actor(c: number, r: number, dir: Dir, speed: number, life: number): Actor {
	return { c, r, dir, prog: 0, speed, trail: [], life };
}
let hero = actor(12, 20, 2, 6, 2.6);
let boss = actor(12, 4, 0, 8.5, 3.4);
let programs: Actor[] = [];
let bits = new Set<string>();
let time = 0;
let boot = 0;
let dive = 0;
let seed = 11;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);

function reset(): void {
	hero = actor(12, 20, 2, 6, 2.6);
	boss = actor(12, 4, 0, 8.5, 3.4);
	programs = [actor(4, 13, 3, 4.5, 0), actor(20, 13, 1, 4.5, 0), actor(12, 16, 0, 4.5, 0)];
	bits = new Set();
	for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (S[r][c] === 'DT') bits.add(key(c, r));
	occupied.clear();
	boot = 0;
	dive = 0;
}

/** At a tile: keep going if it can, else turn; never back unless boxed in; avoid live walls. */
function choose(a: Actor, avoid: boolean): void {
	const options: Dir[] = [];
	for (const d of [0, 1, 2, 3] as Dir[]) {
		if (d === ((a.dir + 2) % 4)) continue;
		const c = a.c + DX[d];
		const r = a.r + DY[d];
		if (!isWalk(c, r)) continue;
		if (avoid && (occupied.get(key(c, r)) ?? 0) > time) continue;
		options.push(d);
	}
	if (options.length === 0) {
		a.dir = ((a.dir + 2) % 4) as Dir;
		return;
	}
	const straight = options.includes(a.dir);
	a.dir = straight && rnd() < 0.55 ? a.dir : options[Math.floor(rnd() * options.length)];
}

function move(a: Actor, dt: number, avoid: boolean): void {
	a.prog += a.speed * dt;
	while (a.prog >= 1) {
		a.prog -= 1;
		a.c += DX[a.dir];
		a.r += DY[a.dir];
		if (a.life > 0) occupied.set(key(a.c, a.r), time + a.life);
		if (a === hero) bits.delete(key(a.c, a.r));
		choose(a, avoid);
		if (!isWalk(a.c + DX[a.dir], a.r + DY[a.dir])) choose(a, false);
	}
	if (a.life > 0) {
		const p = pos(a);
		a.trail.push({ x: p.x, y: p.y, t: time });
		a.trail = a.trail.filter((q) => time - q.t < a.life);
	}
}

function pos(a: Actor): { x: number; y: number } {
	const ok = isWalk(a.c + DX[a.dir], a.r + DY[a.dir]);
	const k = ok ? a.prog : 0;
	return { x: a.c + 0.5 + DX[a.dir] * k, y: a.r + 0.5 + DY[a.dir] * k };
}

// ── drawing ──────────────────────────────────────────────────────────────────
let em: { cv: HTMLCanvasElement; x: CanvasRenderingContext2D } | null = null;
let halos: Array<{ cv: HTMLCanvasElement; x: CanvasRenderingContext2D }> = [];
function layers(): void {
	const W = vw * D;
	const H = vh * D;
	if (!em || em.cv.width !== Math.round(W) || em.cv.height !== Math.round(H)) {
		em = canvas(W, H);
		halos = [canvas(W / 4, H / 4), canvas(W / 8, H / 8), canvas(W / 16, H / 16)];
	}
}

const X = (tx: number) => ox + tx * T;
const Y = (ty: number) => oy + ty * T;

/** A light wall along a trail: flat, a bright band; tilted, a ribbon standing up. */
function wall(x: CanvasRenderingContext2D, a: Actor, col: { core: string; mid: string }): void {
	// the wall starts at his back, not inside him
	const head = pos(a);
	const pts = a.trail.filter((q) => Math.hypot(q.x - head.x, q.y - head.y) > 0.42);
	if (pts.length < 2) return;
	const lift = tilt ? WALL_H * T : 0;
	const fade = (t: number) => Math.min(1, (a.life - (time - t)) / 0.35);
	x.lineCap = 'round';
	x.lineJoin = 'round';
	if (lift > 0) {
		// the ribbon's face, translucent, then its top edge
		x.fillStyle = col.mid;
		for (let i = 1; i < pts.length; i++) {
			const p0 = pts[i - 1];
			const p1 = pts[i];
			x.globalAlpha = 0.28 * fade(p0.t);
			x.beginPath();
			x.moveTo(X(p0.x), Y(p0.y));
			x.lineTo(X(p1.x), Y(p1.y));
			x.lineTo(X(p1.x), Y(p1.y) - lift);
			x.lineTo(X(p0.x), Y(p0.y) - lift);
			x.closePath();
			x.fill();
		}
	}
	for (const [w, c, al] of [
		[0.16, col.mid, 0.95],
		[0.05, col.core, 1]
	] as const) {
		x.strokeStyle = c;
		x.lineWidth = Math.max(1, T * w);
		for (let i = 1; i < pts.length; i++) {
			const p0 = pts[i - 1];
			const p1 = pts[i];
			// the tail derezzes: it flickers out in the last moments
			const f = fade(p0.t);
			if (f < 1 && Math.floor((time + i) * 24) % 3 === 0) continue;
			x.globalAlpha = al * f;
			x.beginPath();
			x.moveTo(X(p0.x), Y(p0.y) - lift);
			x.lineTo(X(p1.x), Y(p1.y) - lift);
			x.stroke();
		}
	}
	x.globalAlpha = 1;
}

/** The hero: a dark disc, its rim and the mouth's cut in light, circuit lines inside. */
function drawHero(dark: CanvasRenderingContext2D, x: CanvasRenderingContext2D): void {
	const p = pos(hero);
	const cx = X(p.x);
	const cy = Y(p.y) - (tilt ? T * 0.2 : 0);
	const R = T * 0.42;
	const ang = (hero.dir * Math.PI) / 2;
	const open = 0.12 + 0.5 * Math.abs(Math.sin(time * 14));
	dark.fillStyle = '#01050a';
	dark.beginPath();
	dark.moveTo(cx, cy);
	dark.arc(cx, cy, R, ang + open, ang + Math.PI * 2 - open);
	dark.closePath();
	dark.fill();
	x.lineCap = 'round';
	x.lineJoin = 'round';
	x.strokeStyle = HERO.mid;
	x.lineWidth = Math.max(1.2, T * 0.1);
	x.beginPath();
	x.moveTo(cx, cy);
	x.arc(cx, cy, R, ang + open, ang + Math.PI * 2 - open);
	x.closePath();
	x.stroke();
	x.strokeStyle = HERO.core;
	x.lineWidth = Math.max(1, T * 0.035);
	x.stroke();
	// circuits: an inner arc and two short traces, faint
	x.globalAlpha = 0.55;
	x.strokeStyle = HERO.mid;
	x.lineWidth = Math.max(1, T * 0.03);
	x.beginPath();
	x.arc(cx, cy, R * 0.55, ang + open + 0.5, ang + Math.PI * 2 - open - 0.5);
	x.moveTo(cx + Math.cos(ang + Math.PI) * R * 0.55, cy + Math.sin(ang + Math.PI) * R * 0.55);
	x.lineTo(cx + Math.cos(ang + Math.PI) * R * 0.85, cy + Math.sin(ang + Math.PI) * R * 0.85);
	x.stroke();
	x.globalAlpha = 1;
	// the eye: a dot of light (her bow: two light triangles)
	const ex = cx + Math.cos(ang - 1.2) * R * 0.5;
	const ey = cy + Math.sin(ang - 1.2) * R * 0.5;
	x.fillStyle = HERO.core;
	x.beginPath();
	x.arc(ex, ey, Math.max(1.2, T * 0.05), 0, Math.PI * 2);
	x.fill();
	if (ms) {
		const bx = cx + Math.cos(ang - 2.1) * R * 0.95;
		const by = cy + Math.sin(ang - 2.1) * R * 0.95;
		const s = R * 0.42;
		x.strokeStyle = HERO.core;
		x.lineWidth = Math.max(1, T * 0.05);
		x.beginPath();
		x.moveTo(bx, by);
		x.lineTo(bx - s, by - s * 0.55);
		x.lineTo(bx - s, by + s * 0.55);
		x.closePath();
		x.moveTo(bx, by);
		x.lineTo(bx + s, by - s * 0.55);
		x.lineTo(bx + s, by + s * 0.55);
		x.closePath();
		x.stroke();
	}
}

/** The boss: an angular cycle, dark, its facets drawn in orange light, a hot headlight. */
function drawBoss(dark: CanvasRenderingContext2D, x: CanvasRenderingContext2D): void {
	const p = pos(boss);
	const cx = X(p.x);
	const cy = Y(p.y) - (tilt ? T * 0.25 : 0);
	const ang = (boss.dir * Math.PI) / 2;
	const L = T * 0.62;
	const Wd = T * 0.3;
	const shape: Array<[number, number]> = [
		[L, 0],
		[L * 0.55, -Wd],
		[-L * 0.7, -Wd],
		[-L, -Wd * 0.45],
		[-L, Wd * 0.45],
		[-L * 0.7, Wd],
		[L * 0.55, Wd]
	];
	const pt = ([u, v]: [number, number]): [number, number] => [
		cx + Math.cos(ang) * u - Math.sin(ang) * v,
		cy + Math.sin(ang) * u + Math.cos(ang) * v
	];
	const path = (c: CanvasRenderingContext2D) => {
		c.beginPath();
		shape.forEach((s, i) => {
			const [a, b] = pt(s);
			if (i === 0) c.moveTo(a, b);
			else c.lineTo(a, b);
		});
		c.closePath();
	};
	dark.fillStyle = '#070201';
	path(dark);
	dark.fill();
	x.lineJoin = 'miter';
	x.strokeStyle = ENEMY.mid;
	x.lineWidth = Math.max(1.2, T * 0.09);
	path(x);
	x.stroke();
	x.strokeStyle = ENEMY.core;
	x.lineWidth = Math.max(1, T * 0.03);
	x.stroke();
	// the spine and the rider's wedge
	x.strokeStyle = ENEMY.mid;
	x.lineWidth = Math.max(1, T * 0.04);
	x.beginPath();
	const [s0x, s0y] = pt([-L * 0.6, 0]);
	const [s1x, s1y] = pt([L * 0.45, 0]);
	x.moveTo(s0x, s0y);
	x.lineTo(s1x, s1y);
	const [r0x, r0y] = pt([-L * 0.1, -Wd * 0.6]);
	const [r1x, r1y] = pt([L * 0.25, 0]);
	const [r2x, r2y] = pt([-L * 0.1, Wd * 0.6]);
	x.moveTo(r0x, r0y);
	x.lineTo(r1x, r1y);
	x.lineTo(r2x, r2y);
	x.stroke();
	const [hx, hy] = pt([L * 0.9, 0]);
	x.fillStyle = '#ffffff';
	x.beginPath();
	x.arc(hx, hy, Math.max(1.5, T * 0.07), 0, Math.PI * 2);
	x.fill();
}

/** A program: an orange wireframe diamond with a cross inside. */
function drawProgram(a: Actor, x: CanvasRenderingContext2D, dark: CanvasRenderingContext2D): void {
	const p = pos(a);
	const cx = X(p.x);
	const cy = Y(p.y) - (tilt ? T * 0.15 : 0);
	const s = T * 0.34 * (1 + 0.06 * Math.sin(time * 6 + a.c));
	dark.fillStyle = '#060201';
	dark.beginPath();
	dark.moveTo(cx, cy - s);
	dark.lineTo(cx + s, cy);
	dark.lineTo(cx, cy + s);
	dark.lineTo(cx - s, cy);
	dark.closePath();
	dark.fill();
	x.strokeStyle = ENEMY.mid;
	x.lineWidth = Math.max(1, T * 0.06);
	x.beginPath();
	x.moveTo(cx, cy - s);
	x.lineTo(cx + s, cy);
	x.lineTo(cx, cy + s);
	x.lineTo(cx - s, cy);
	x.closePath();
	x.moveTo(cx - s * 0.45, cy);
	x.lineTo(cx + s * 0.45, cy);
	x.moveTo(cx, cy - s * 0.45);
	x.lineTo(cx, cy + s * 0.45);
	x.stroke();
}

function frame(dt: number): void {
	time += dt;
	boot += dt;
	dive += dt;
	move(hero, dt, true);
	move(boss, dt, true);
	for (const p of programs) move(p, dt, true);
	layers();
	if (!em || !abyss || !arena || !edges) return;
	const W = vw * D;
	const H = vh * D;
	const L = LIGHTS[light];

	// the dive: from high above, the arena small over the abyss, then in
	const k = Math.min(1, dive / 2.2);
	const e = 1 - Math.pow(1 - k, 3);
	const zoom = 0.3 + 0.7 * e;

	ctx.setTransform(1, 0, 0, 1, 0, 0);
	ctx.globalCompositeOperation = 'source-over';
	ctx.globalAlpha = 1;
	ctx.drawImage(abyss, 0, 0);
	// the city of light far below: it drifts, slower than the arena would
	ctx.setTransform(D, 0, 0, D, 0, 0);
	ctx.globalCompositeOperation = 'lighter';
	const drift = time * 6;
	const cz = 0.5 + 0.5 * zoom;
	for (const b of city) {
		const bx = vw / 2 + ((b.x * vw + drift) % (vw * 1.4) - vw / 2 - vw * 0.2) * cz;
		const by = vh / 2 + (b.y * vh - vh / 2) * cz;
		ctx.fillStyle = `rgba(${b.c},${b.a * 0.6})`;
		ctx.fillRect(bx, by, b.w * cz, b.h * cz);
	}
	// the deep grid: faint lines, pulses running along them
	ctx.strokeStyle = 'rgba(80,160,255,0.06)';
	ctx.lineWidth = 1;
	const gs = 46 * cz;
	const gox = (vw / 2) % gs;
	ctx.beginPath();
	for (let gx = gox - gs; gx < vw + gs; gx += gs) {
		ctx.moveTo(gx, 0);
		ctx.lineTo(gx, vh);
	}
	for (let gy = ((vh / 2 + time * 10) % gs) - gs; gy < vh + gs; gy += gs) {
		ctx.moveTo(0, gy);
		ctx.lineTo(vw, gy);
	}
	ctx.stroke();
	for (let i = 0; i < 6; i++) {
		const gx = gox + gs * ((i * 7) % Math.floor(vw / gs));
		const gy = ((time * 120 + i * 173) % (vh + 200)) - 100;
		const gr = ctx.createLinearGradient(gx, gy - 60, gx, gy);
		gr.addColorStop(0, 'rgba(120,200,255,0)');
		gr.addColorStop(1, 'rgba(160,220,255,0.35)');
		ctx.strokeStyle = gr;
		ctx.beginPath();
		ctx.moveTo(gx, gy - 60);
		ctx.lineTo(gx, gy);
		ctx.stroke();
	}
	ctx.globalCompositeOperation = 'source-over';

	// the arena, scaled by the dive around the screen's centre
	const arenaT = (c: CanvasRenderingContext2D, scale: number) => {
		c.setTransform(scale, 0, 0, scale, 0, 0);
		c.translate(vw / 2, vh / 2 + 10);
		c.scale(zoom, zoom);
		c.translate(-vw / 2, -vh / 2 - 10);
	};
	arenaT(ctx, D);
	ctx.drawImage(arena, 0, 0, vw, vh);

	// the emissive layer: edges, bits, walls of light, the actors' light
	const ex = em.x;
	ex.setTransform(1, 0, 0, 1, 0, 0);
	ex.clearRect(0, 0, W, H);
	arenaT(ex, D);
	ex.globalAlpha = 1;
	ex.drawImage(edges, 0, 0, vw, vh);
	ex.fillStyle = WORLD.core;
	for (const b of bits) {
		const [c, r] = b.split(',').map(Number);
		const s = Math.max(1.5, T * 0.09);
		ex.globalAlpha = 0.45;
		ex.fillRect(X(c + 0.5) - s / 2, Y(r + 0.5) - s / 2, s, s);
	}
	for (const [c, r] of [
		[2, 2],
		[22, 2],
		[2, 24],
		[22, 24]
	]) {
		const s = T * 0.24 * (1 + 0.15 * Math.sin(time * 4));
		ex.globalAlpha = 1;
		ex.strokeStyle = HERO.mid;
		ex.lineWidth = Math.max(1, T * 0.06);
		ex.beginPath();
		ex.moveTo(X(c + 0.5), Y(r + 0.5) - s);
		ex.lineTo(X(c + 0.5) + s, Y(r + 0.5));
		ex.lineTo(X(c + 0.5), Y(r + 0.5) + s);
		ex.lineTo(X(c + 0.5) - s, Y(r + 0.5));
		ex.closePath();
		ex.stroke();
	}
	ex.globalAlpha = 1;
	wall(ex, boss, ENEMY);
	wall(ex, hero, HERO);
	for (const p of programs) drawProgram(p, ex, ctx);
	drawBoss(ctx, ex);
	drawHero(ctx, ex);

	// the light: halos down the chain, then everything added over the frame
	const [h1, h2, h3] = halos;
	for (const h of halos) {
		h.x.setTransform(1, 0, 0, 1, 0, 0);
		h.x.globalCompositeOperation = 'copy';
		h.x.imageSmoothingEnabled = true;
	}
	h1.x.drawImage(em.cv, 0, 0, h1.cv.width, h1.cv.height);
	h2.x.drawImage(h1.cv, 0, 0, h2.cv.width, h2.cv.height);
	h3.x.drawImage(h2.cv, 0, 0, h3.cv.width, h3.cv.height);
	ctx.setTransform(1, 0, 0, 1, 0, 0);
	ctx.globalCompositeOperation = 'lighter';
	// the floor's mirror: the wide light, shifted down a little
	ctx.globalAlpha = L.mirror;
	ctx.drawImage(h2.cv, 0, T * D * 0.35, W, H);
	ctx.globalAlpha = L.wide;
	ctx.drawImage(h3.cv, 0, 0, W, H);
	ctx.drawImage(h3.cv, 0, 0, W, H);
	ctx.globalAlpha = L.narrow;
	ctx.drawImage(h1.cv, 0, 0, W, H);
	ctx.globalAlpha = L.core;
	ctx.drawImage(em.cv, 0, 0);
	ctx.globalAlpha = 1;
	ctx.globalCompositeOperation = 'source-over';

	drawHud();
}

// ── the HUD: thin lines, cut corners, segmented gauges; it boots line by line ──
function drawHud(): void {
	const x = hctx;
	x.setTransform(D, 0, 0, D, 0, 0);
	x.clearRect(0, 0, vw, vh);
	const b = (from: number) => Math.max(0, Math.min(1, (boot - from) / 0.35));
	x.lineCap = 'square';
	x.shadowColor = HERO.mid;
	x.shadowBlur = 8;
	const panel = (px: number, py: number, w: number, h: number, k: number, col: string) => {
		if (k <= 0) return;
		const c = 10;
		const len = (w + h) * 2 * k;
		x.strokeStyle = col;
		x.lineWidth = 1.5;
		x.setLineDash([len, 9999]);
		x.beginPath();
		x.moveTo(px + c, py);
		x.lineTo(px + w, py);
		x.lineTo(px + w, py + h - c);
		x.lineTo(px + w - c, py + h);
		x.lineTo(px, py + h);
		x.lineTo(px, py + c);
		x.closePath();
		x.stroke();
		x.setLineDash([]);
	};
	const font = (size: number) => `600 ${size}px Orbitron, "Rajdhani", "Arial Narrow", sans-serif`;
	// the score, left
	panel(16, 14, 210, 40, b(0.1), HERO.mid);
	if (b(0.35) > 0) {
		x.globalAlpha = b(0.35);
		x.fillStyle = HERO.core;
		x.font = font(11);
		x.fillText('SCORE', 28, 30);
		x.font = font(18);
		x.fillText(String(Math.floor(time * 37) * 10).padStart(7, '0'), 92, 42);
		x.globalAlpha = 1;
	}
	// the wall's energy, in the middle: segments
	const ew = Math.min(320, vw * 0.3);
	const exx = vw / 2 - ew / 2;
	panel(exx, 14, ew, 40, b(0.25), HERO.mid);
	if (b(0.5) > 0) {
		x.globalAlpha = b(0.5);
		x.fillStyle = HERO.core;
		x.font = font(10);
		x.fillText('WALL ENERGY', exx + 12, 28);
		const n = 16;
		const filled = Math.round(n * (0.35 + 0.3 * (0.5 + 0.5 * Math.sin(time * 0.6))));
		for (let i = 0; i < n; i++) {
			x.fillStyle = i < filled ? HERO.mid : 'rgba(63,224,255,0.15)';
			x.fillRect(exx + 12 + i * ((ew - 24) / n), 35, (ew - 24) / n - 3, 9);
		}
		x.globalAlpha = 1;
	}
	// the boss: a ring of three segments, right
	x.shadowColor = ENEMY.mid;
	panel(vw - 226, 14, 210, 40, b(0.4), ENEMY.mid);
	if (b(0.65) > 0) {
		x.globalAlpha = b(0.65);
		x.fillStyle = ENEMY.core;
		x.font = font(11);
		x.fillText('CYCLE.EXE', vw - 214, 38);
		const rx = vw - 46;
		const ry = 34;
		for (let i = 0; i < 3; i++) {
			x.strokeStyle = i < 2 ? ENEMY.mid : 'rgba(255,106,26,0.2)';
			x.lineWidth = 4;
			x.beginPath();
			x.arc(rx, ry, 13, -Math.PI / 2 + i * ((Math.PI * 2) / 3) + 0.15, -Math.PI / 2 + (i + 1) * ((Math.PI * 2) / 3) - 0.15);
			x.stroke();
		}
		x.globalAlpha = 1;
	}
	x.shadowBlur = 0;
}

// ── controls ─────────────────────────────────────────────────────────────────
function pressed(): void {
	for (const b of document.querySelectorAll<HTMLButtonElement>('[data-light]')) {
		b.setAttribute('aria-pressed', String(b.dataset.light === light));
	}
	$('who').textContent = ms ? 'Ms. Pac-Man' : 'Pac-Man';
}
for (const b of document.querySelectorAll<HTMLButtonElement>('[data-light]')) {
	b.textContent = LIGHTS[b.dataset.light as Light].name;
	b.addEventListener('click', () => {
		light = b.dataset.light as Light;
		pressed();
	});
}
$('tilt').addEventListener('click', () => {
	tilt = !tilt;
	bakeArena();
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

reset();
window.addEventListener('resize', layout);
layout();
pressed();
if (q.has('capture')) {
	(window as unknown as { __advance: (s: number) => void }).__advance = (seconds: number) => {
		for (let i = 0; i < Math.round(seconds * 60); i++) frame(1 / 60);
	};
} else {
	let last = performance.now();
	const loop = (now: number) => {
		frame(Math.min(0.05, Math.max(0, (now - last) / 1000)));
		last = now;
		requestAnimationFrame(loop);
	};
	requestAnimationFrame(loop);
}
