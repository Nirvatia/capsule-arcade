// Prototype: the station's hounds as insects and as drones, with the heroes' station look, drawn
// by candidate painters (`./looks.ts`) next to the current arrowhead. Two views on one canvas:
// `?v=gallery` (default): every candidate in the four states (stalk / windup / lunge / flee),
// the heroes in three looks, and a game-scale strip; `?v=maze`: the real station maze in its
// dark, a hero with his torch and the candidates patrolling the corridors through the hound's
// cycle (creep, hold a breath, dash). `?h=now|a|b` picks the heroes' look there; `?t=<s>`
// freezes time after simulating that long.
import { GRID_STATION } from '../../../src/games/pacman/config/mazes';
import { StationWorld } from '../../../src/games/pacman/render/station/StationWorld';
import { drawFlare, drawSpore } from '../../../src/games/pacman/render/station/stationFood';
import { GAME_FEEL } from '../../../src/games/pacman/render/actors/HeroView';
import type { Hero } from '../../../src/games/pacman/render/actors/hero/Hero';
import { PacmanHero } from '../../../src/games/pacman/render/actors/hero/PacmanHero';
import { MsPacmanHero } from '../../../src/games/pacman/render/actors/hero/MsPacmanHero';
import type { HeroSeason } from '../../../src/games/pacman/render/actors/hero/heroSeasons';
import { LOOKS, STATION_A, STATION_B, fakeHound, helmetPainter, sootPainter } from './looks';
import type { Look, StateId } from './looks';

const view = document.getElementById('view') as HTMLCanvasElement;
const ctx = view.getContext('2d') as CanvasRenderingContext2D;
const D = Math.min(window.devicePixelRatio || 1, 2);
const params = new URLSearchParams(location.search);
// a page opened without a query (inside an app) can carry its defaults in `window.CREATURES`
const preset = (window as unknown as { CREATURES?: Record<string, string> }).CREATURES ?? {};
const pick = (k: string): string | null => params.get(k) ?? preset[k] ?? null;
const V = pick('v') === 'maze' ? 'maze' : 'gallery';
const FROZEN = pick('t') !== null ? Number(pick('t')) : null;
const HERO_LOOK = (['now', 'a', 'b'] as const).find((k) => k === pick('h')) ?? 'a';
const STEP = 1 / 60;

// ------------------------------------------------------------------------------- the heroes

type Variant = 'now' | 'a' | 'b';
const VARIANTS: ReadonlyArray<{ id: Variant; name: string; season: HeroSeason }> = [
	{ id: 'now', name: 'now (a season look)', season: 'winter' },
	{ id: 'a', name: 'A: survivor, carries the fire', season: STATION_A },
	{ id: 'b', name: 'B: in a suit, helmet lamp', season: STATION_B }
];

function makeHero(ms: boolean, v: Variant): Hero {
	const h = ms ? new MsPacmanHero() : new PacmanHero();
	h.setFeel(GAME_FEEL);
	h.setOver(v === 'a' ? sootPainter : v === 'b' ? helmetPainter : null);
	return h;
}

interface HeroSlot {
	hero: Hero;
	season: HeroSeason;
}
const slot = (ms: boolean, v: Variant): HeroSlot => ({
	hero: makeHero(ms, v),
	season: VARIANTS.find((x) => x.id === v)?.season ?? 'winter'
});
/** Big heroes (gallery), small ones (the game-scale strip), per hero and look. */
const big = [false, true].map((ms) => VARIANTS.map((v) => slot(ms, v.id)));
const small = [false, true].map((ms) => VARIANTS.map((v) => slot(ms, v.id)));

function runHero(s: HeroSlot, dt: number, x: number, y: number, angle: number, R: number): void {
	s.hero.setRadius(R);
	s.hero.update(dt, {
		x,
		y,
		angle,
		moving: true,
		power: false,
		ending: false,
		season: s.season
	});
}

// --------------------------------------------------------------------------------- helpers

function label(
	text: string,
	x: number,
	y: number,
	size = 12,
	align: CanvasTextAlign = 'left',
	color = 'rgba(216,226,234,.8)'
): void {
	ctx.font = `600 ${size}px "Courier New", monospace`;
	ctx.textAlign = align;
	ctx.fillStyle = color;
	ctx.fillText(text, x, y);
}

function panel(x: number, y: number, w: number, h: number, fill = '#11161a'): void {
	ctx.fillStyle = fill;
	ctx.beginPath();
	ctx.roundRect(x, y, w, h, 8);
	ctx.fill();
}

const KIND_COLOR: Record<Look['kind'], string> = {
	now: 'rgba(216,226,234,.8)',
	insect: '#ffb066',
	drone: '#9fdcff'
};

// -------------------------------------------------------------------------------- gallery

const STATES: readonly StateId[] = ['stalk', 'windup', 'lunge', 'flee'];

function drawGallery(t: number, vw: number, vh: number): void {
	ctx.fillStyle = '#07090a';
	ctx.fillRect(0, 0, vw, vh);
	const pad = 16;
	const leftW = Math.min(vw * 0.52, 880);
	const labW = 190;
	const cw = (leftW - labW) / STATES.length;
	const top = 34;
	const rh = (vh - top - pad) / LOOKS.length;
	STATES.forEach((s, i) => label(s, labW + pad + i * cw + cw / 2, 22, 13, 'center'));
	const S = Math.min(cw * 0.5, rh * 0.56);
	LOOKS.forEach((look, r) => {
		const y0 = top + r * rh;
		panel(pad, y0 + 2, leftW, rh - 4);
		label(look.name, pad + 10, y0 + rh / 2 - 2, 13, 'left', KIND_COLOR[look.kind]);
		label(look.note, pad + 10, y0 + rh / 2 + 14, 10, 'left', 'rgba(216,226,234,.5)');
		STATES.forEach((state, c) => {
			const h = fakeHound(r * 4 + c + 1, state, 0.75 + 0.25 * Math.sin(t * 2.1));
			const cx = pad + labW + c * cw + cw / 2;
			const cy = y0 + rh / 2;
			look.draw(ctx, h, cx, cy, 0, t * h.speed * 2.2, S, t);
		});
	});
	// the heroes
	const rx = pad + leftW + 16;
	const rw = vw - rx - pad;
	const heroH = (vh - top - pad) * 0.5;
	const hc = rw / VARIANTS.length;
	const hr = (heroH - 22) / 2;
	VARIANTS.forEach((v, i) => label(v.name, rx + i * hc + hc / 2, 22, 11, 'center'));
	[0, 1].forEach((row) => {
		VARIANTS.forEach((_, i) => {
			const x0 = rx + i * hc;
			const y0 = top + row * hr;
			panel(x0 + 2, y0 + 2, hc - 4, hr - 4);
			ctx.save();
			ctx.beginPath();
			ctx.roundRect(x0 + 2, y0 + 2, hc - 4, hr - 4, 8);
			ctx.clip();
			big[row][i].hero.draw(ctx);
			ctx.restore();
		});
	});
	// the game-scale strip: one tile as the real maze draws it
	const S1 = Math.round((vh * 0.82) / 27);
	const sy = top + heroH + 18;
	const sh = vh - sy - pad;
	label(`game scale (tile ${S1}px): stalk / lunge, then the heroes`, rx, sy - 6, 11);
	panel(rx, sy, rw, sh, '#0d1317');
	const gap = Math.min(S1 * 2.4, (rw - 24) / (LOOKS.length + 0.5));
	(['stalk', 'lunge'] as const).forEach((state, row) => {
		LOOKS.forEach((look, i) => {
			const h = fakeHound(i + 50, state);
			look.draw(ctx, h, rx + 24 + i * gap, sy + S1 * (1.2 + row * 2), 0, t * h.speed * 2.2, S1, t);
			if (row === 0) label(look.id, rx + 24 + i * gap, sy + S1 * 0.4, 9, 'center', KIND_COLOR[look.kind]);
		});
	});
	for (const row of small) for (const s of row) s.hero.draw(ctx);
}

function stepGallery(t: number, dt: number, vw: number, vh: number): void {
	const pad = 16;
	const leftW = Math.min(vw * 0.52, 880);
	const rx = pad + leftW + 16;
	const rw = vw - rx - pad;
	const top = 34;
	const heroH = (vh - top - pad) * 0.5;
	const hc = rw / VARIANTS.length;
	const hr = (heroH - 22) / 2;
	const wob = Math.sin(t * 1.1);
	const dir = Math.cos(t * 1.1) >= 0 ? 0 : Math.PI;
	[0, 1].forEach((row) => {
		VARIANTS.forEach((__, i) => {
			const cx = rx + i * hc + hc / 2;
			const cy = top + row * hr + hr / 2;
			const R = Math.min(hc, hr) * 0.26;
			runHero(big[row][i], dt, cx + wob * hc * 0.2, cy, dir, R);
		});
	});
	const S1 = Math.round((vh * 0.82) / 27);
	const sy = top + heroH + 18;
	const gap = Math.min(S1 * 2.4, (rw - 24) / (LOOKS.length + 0.5));
	[0, 1].forEach((row) => {
		VARIANTS.forEach((__, i) => {
			const x = rx + 24 + (1 + i * 2) * S1 * 1.6;
			const y = sy + S1 * (5.4 + row * 1.6);
			runHero(small[row][i], dt, x, y, 0, S1 * 0.33);
		});
	});
}

// ----------------------------------------------------------------------------------- maze

const grid = GRID_STATION;
const world = new StationWorld(grid);
world.setQuality('medium');
const W = grid[0].length;
const H = grid.length;
const FOOD = new Set(['DT', 'EU', 'FT', 'PM']);
const open = (x: number, y: number): boolean => FOOD.has(grid[y]?.[x] ?? '');

interface Run {
	row: number;
	a: number;
	b: number;
}
/** The long straight corridors, one per row, longest first, kept two rows apart. */
function runs(): Run[] {
	const all: Run[] = [];
	for (let y = 2; y < H - 2; y += 1) {
		let best: Run | null = null;
		let x = 0;
		while (x < W) {
			if (!open(x, y)) {
				x += 1;
				continue;
			}
			let e = x;
			while (open(e + 1, y)) e += 1;
			if (!best || e - x > best.b - best.a) best = { row: y, a: x, b: e };
			x = e + 1;
		}
		if (best && best.b - best.a >= 5) all.push(best);
	}
	all.sort((p, q) => q.b - q.a - (p.b - p.a));
	const out: Run[] = [];
	for (const r of all) if (out.every((o) => Math.abs(o.row - r.row) >= 2)) out.push(r);
	return out;
}
const RUNS = runs();

interface Agent {
	look: Look;
	run: Run;
	x: number;
	dir: 1 | -1;
	stride: number;
	offset: number;
	id: number;
}
const agents: Agent[] = LOOKS.map((look, i) => {
	const run = RUNS[(i + 1) % RUNS.length];
	return {
		look,
		run,
		x: run.a + 1 + ((i * 3) % Math.max(1, run.b - run.a - 2)),
		dir: i % 2 ? -1 : 1,
		stride: 0,
		offset: i * 0.9,
		id: i + 1
	};
});

const CYCLE = 5.2;
function cycle(k: number): { mode: StateId; w: number; speed: number } {
	const p = (((k % CYCLE) + CYCLE) % CYCLE);
	if (p < 2.4) return { mode: 'stalk', w: 0, speed: 1.1 };
	if (p < 3.2) return { mode: 'windup', w: Math.min(1, (p - 2.4) / 0.5), speed: 0 };
	if (p < 4.4) return { mode: 'lunge', w: 0, speed: 6.5 };
	return { mode: 'stalk', w: 0, speed: 1.1 };
}

interface Walker {
	slotIndex: number;
	ms: boolean;
	run: Run;
	x: number;
	dir: 1 | -1;
}
const heroRun = RUNS[0];
const walkers: Walker[] = [
	{ slotIndex: 0, ms: false, run: heroRun, x: heroRun.a + 3, dir: 1 },
	{ slotIndex: 1, ms: true, run: RUNS[RUNS.length - 1], x: RUNS[RUNS.length - 1].b - 2, dir: -1 }
];

function stepMaze(t: number, dt: number): void {
	for (const a of agents) {
		const c = cycle(t + a.offset);
		a.x += a.dir * c.speed * dt;
		if (a.x > a.run.b - 0.5) a.dir = -1;
		if (a.x < a.run.a + 0.5) a.dir = 1;
		a.stride += c.speed * dt * 2.2;
	}
	const S = world.layout.tileSize || 30;
	const variant = HERO_LOOK === 'now' ? 0 : HERO_LOOK === 'a' ? 1 : 2;
	for (const w of walkers) {
		w.x += w.dir * 3.2 * dt;
		if (w.x > w.run.b - 0.5) w.dir = -1;
		if (w.x < w.run.a + 0.5) w.dir = 1;
		const L = world.layout;
		runHero(
			small[w.ms ? 1 : 0][variant],
			dt,
			L.offsetX + (w.x + 0.5) * S,
			L.offsetY + (w.run.row + 0.5) * S,
			w.dir > 0 ? 0 : Math.PI,
			S * 0.33
		);
	}
}

function drawMaze(t: number, vw: number, vh: number): void {
	world.resize(vw, vh, D);
	const L = world.layout;
	const S = L.tileSize;
	const variant = HERO_LOOK === 'now' ? 0 : HERO_LOOK === 'a' ? 1 : 2;
	world.drawWorld(ctx, 2);
	const flares = walkers.map((w) => ({ x: w.x + 0.5, y: w.run.row + 0.5, r: 4.1 }));
	world.drawDark(ctx, {
		phase: 2,
		time: t,
		hero: null,
		flares,
		beam: [],
		solid: (x, y) => {
			const tk = grid[y]?.[x];
			return tk === undefined || tk === 'WL' || tk === 'ES';
		}
	});
	world.drawGlow(ctx, 2, t);
	for (let y = 0; y < H; y += 1) {
		for (let x = 0; x < W; x += 1) {
			if (grid[y][x] === 'DT') drawSpore(ctx, L.offsetX + (x + 0.5) * S, L.offsetY + (y + 0.5) * S, S, t, ((x * 31 + y * 17) % 13) / 13);
		}
	}
	for (const a of agents) {
		const c = cycle(t + a.offset);
		const h = fakeHound(a.id, c.mode, c.w);
		const px = L.offsetX + (a.x + 0.5) * S;
		const py = L.offsetY + (a.run.row + 0.5) * S;
		a.look.draw(ctx, h, px, py, a.dir > 0 ? 0 : Math.PI, a.stride, S, t);
		label(a.look.id, px, py - S * 0.75, 11, 'center', KIND_COLOR[a.look.kind]);
	}
	for (const w of walkers) {
		small[w.ms ? 1 : 0][variant].hero.draw(ctx);
		drawFlare(ctx, L.offsetX + (w.x + 0.5 + 0.35 * (w.dir > 0 ? 1 : -1)) * S, L.offsetY + (w.run.row + 0.2) * S, S * 0.8, t, true);
	}
	world.drawGrain(ctx, t);
}

// ------------------------------------------------------------------------------------ loop

function size(): { vw: number; vh: number } {
	const vw = window.innerWidth;
	const vh = window.innerHeight;
	if (view.width !== Math.round(vw * D) || view.height !== Math.round(vh * D)) {
		view.width = Math.round(vw * D);
		view.height = Math.round(vh * D);
	}
	return { vw, vh };
}

function advance(t: number, dt: number, vw: number, vh: number): void {
	if (V === 'maze') {
		world.resize(vw, vh, D);
		stepMaze(t, dt);
	} else {
		stepGallery(t, dt, vw, vh);
	}
}

let simulated = 0;
let last = -1;
function frame(now: number): void {
	const { vw, vh } = size();
	ctx.setTransform(D, 0, 0, D, 0, 0);
	let t: number;
	if (FROZEN !== null) {
		// simulate up to the frozen time once, then only draw
		while (simulated < FROZEN) {
			simulated += STEP;
			advance(simulated, STEP, vw, vh);
		}
		t = FROZEN;
	} else {
		const dt = last < 0 ? STEP : Math.min(0.05, (now - last) / 1000);
		last = now;
		simulated += dt;
		t = simulated;
		advance(t, dt, vw, vh);
	}
	if (V === 'maze') drawMaze(t, vw, vh);
	else drawGallery(t, vw, vh);
	requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
