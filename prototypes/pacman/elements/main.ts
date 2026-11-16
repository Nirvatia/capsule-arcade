// Prototype `elements`: the heroes as elements, the everyday (nimble) form first (roadmap I.4):
// Pac-Man fire, Ms. Pac-Man a nebula, on the heroes' own machinery, beside today's heroes.
// Scenes:
//   sheet    frame by frame: standing, running right / left / up / down, a bite, beside a ghost;
//   seasons  each new hero running on all four seasons' floors, beside the season's ghost;
//   maze     today's and the new heroes running the real maze at game scale.
// Query: ?scene=sheet&season=autumn&capture (capture: window.__advance(seconds)).
import { EventBus } from '../../../src/games/pacman/engine/EventBus';
import type { PacmanEventMap } from '../../../src/games/pacman/core/Events';
import { buildLevelSession } from '../../../src/games/pacman/logic/level/LevelSession';
import type { LevelSession } from '../../../src/games/pacman/logic/level/LevelSession';
import { seasonForLevel } from '../../../src/games/pacman/logic/level/SeasonCatalog';
import type { GhostKind } from '../../../src/games/pacman/logic/actors/GhostModel';
import { MeadowWorld } from '../../../src/games/pacman/render/seasons/meadow/MeadowWorld';
import { meadowThemeFor } from '../../../src/games/pacman/render/seasons/meadow/meadowThemes';
import type { MeadowTheme } from '../../../src/games/pacman/render/seasons/meadow/MeadowTheme';
import { SEASON_GHOST, drawCuteGhost } from '../../../src/games/pacman/render/actors/cuteGhost';
import { GAME_FEEL } from '../../../src/games/pacman/render/actors/HeroView';
import type { Hero } from '../../../src/games/pacman/render/actors/hero/Hero';
import { PacmanHero } from '../../../src/games/pacman/render/actors/hero/PacmanHero';
import { MsPacmanHero } from '../../../src/games/pacman/render/actors/hero/MsPacmanHero';
import type { GridLayout } from '../../../src/games/pacman/render/maze/GridView';
import { EmberPacman, NebulaMs } from './forms';

const SEASONS = ['summer', 'autumn', 'winter', 'spring'] as const;
type Season = (typeof SEASONS)[number];
const SCENES = ['sheet', 'seasons', 'maze'] as const;
type Scene = (typeof SCENES)[number];
const KINDS: readonly GhostKind[] = ['BLINKY', 'PINKY', 'INKY', 'CLYDE'];

const HEROES: ReadonlyArray<{ name: string; radius: number; fresh: boolean; make: () => Hero }> = [
	{ name: 'Pac-Man сейчас', radius: 0.39, fresh: false, make: () => new PacmanHero() },
	{ name: 'Pac-Man · огонь', radius: 0.33, fresh: true, make: () => new EmberPacman() },
	{ name: 'Ms. сейчас', radius: 0.39, fresh: false, make: () => new MsPacmanHero() },
	{ name: 'Ms. · туманность', radius: 0.33, fresh: true, make: () => new NebulaMs() }
];

const $ = <E extends HTMLElement>(id: string) => document.getElementById(id) as E;
const view = $<HTMLCanvasElement>('view');
const ctx = view.getContext('2d') as CanvasRenderingContext2D;
const D = Math.min(window.devicePixelRatio || 1, 2);
const q = new URLSearchParams(location.search);
const pick = <T extends string>(list: readonly T[], v: string | null, f: T): T =>
	list.includes(v as T) ? (v as T) : f;

let season: Season = pick(SEASONS, q.get('season'), 'summer');
let scene: Scene = pick(SCENES, q.get('scene'), 'sheet');
let slow = false;
let vw = 0;
let vh = 0;
let time = 0;
let world: MeadowWorld;
const bigs = new Map<Season, { canvas: HTMLCanvasElement; layout: GridLayout; session: LevelSession }>();
let session: LevelSession;
let still: HTMLCanvasElement | null = null;
if (q.has('capture')) document.body.classList.add('capture');

function drawGhost(c: CanvasRenderingContext2D, kind: GhostKind, x: number, y: number, S: number, look = -1, s: Season = season): void {
	drawCuteGhost(c, x, y, (S / 25) * 0.78, {
		shape: SEASON_GHOST[s] ?? 'drop',
		kind,
		state: 'normal',
		lookX: look,
		lookY: 0,
		time,
		step: time * 9 + kind.length,
		chasing: true
	});
}

function settle(w: MeadowWorld): void {
	w.setMood(0, 0);
	for (let i = 0; i < 40; i++) w.update(0.1);
}

function newSession(s: Season): LevelSession {
	const level = SEASONS.indexOf(s) + 1;
	return buildLevelSession({
		events: new EventBus<PacmanEventMap>(),
		level,
		profile: 'pacman',
		season: seasonForLevel(level),
		hell: false,
		secret: false,
		godMode: true
	});
}

/** The season's world drawn big once, for the magnified cells. */
function bigWorld(s: Season) {
	let b = bigs.get(s);
	if (!b) {
		const level = SEASONS.indexOf(s) + 1;
		const w = new MeadowWorld(seasonForLevel(level).grid, meadowThemeFor(s) as MeadowTheme);
		w.resize(1800, 1650, 1);
		settle(w);
		const canvas = document.createElement('canvas');
		canvas.width = 1800;
		canvas.height = 1650;
		const bc = canvas.getContext('2d') as CanvasRenderingContext2D;
		w.drawWorld(bc);
		w.drawMood(bc);
		w.drawFood(bc, () => false);
		b = { canvas, layout: w.layout, session: newSession(s) };
		bigs.set(s, b);
	}
	return b;
}

function build(): void {
	const level = SEASONS.indexOf(season) + 1;
	world = new MeadowWorld(seasonForLevel(level).grid, meadowThemeFor(season) as MeadowTheme);
	world.resize(vw, vh, D);
	settle(world);
	session = newSession(season);
	runners = makeRunners();
	still = null;
	for (const b of document.querySelectorAll<HTMLButtonElement>('[data-season]')) {
		b.setAttribute('aria-pressed', String(b.dataset.season === season));
	}
	for (const b of document.querySelectorAll<HTMLButtonElement>('[data-scene]')) {
		b.setAttribute('aria-pressed', String(b.dataset.scene === scene));
	}
}

function layout(): void {
	vw = window.innerWidth;
	vh = window.innerHeight;
	view.width = Math.round(vw * D);
	view.height = Math.round(vh * D);
	view.style.width = `${vw}px`;
	view.style.height = `${vh}px`;
	build();
}

for (const b of document.querySelectorAll<HTMLButtonElement>('[data-season]')) {
	b.addEventListener('click', () => {
		season = b.dataset.season as Season;
		build();
	});
}
for (const b of document.querySelectorAll<HTMLButtonElement>('[data-scene]')) {
	b.addEventListener('click', () => {
		scene = b.dataset.scene as Scene;
		build();
	});
}
$('slow').addEventListener('click', () => {
	slow = !slow;
	$('slow').setAttribute('aria-pressed', String(slow));
});

const px = (L: GridLayout, tx: number) => L.offsetX + tx * L.tileSize;
const py = (L: GridLayout, ty: number) => L.offsetY + ty * L.tileSize;

function longestRow(sess: LevelSession, minY = 0): { y: number; x0: number; x1: number } {
	const g = sess.grid;
	let best = { y: 0, x0: 0, x1: 0 };
	for (let y = minY; y < g.height; y++) {
		let start = -1;
		for (let x = 0; x <= g.width; x++) {
			const ok = x < g.width && g.isPlayerWalkable(x, y) && !g.isTeleport(x, y);
			if (ok && start < 0) start = x;
			if (!ok && start >= 0) {
				if (x - 1 - start > best.x1 - best.x0) best = { y, x0: start, x1: x - 1 };
				start = -1;
			}
		}
	}
	return best;
}

function label(c: CanvasRenderingContext2D, text: string, x: number, y: number, size = 13, align: CanvasTextAlign = 'center'): void {
	c.save();
	c.font = `700 ${size}px "Trebuchet MS","Segoe UI",system-ui,sans-serif`;
	c.textAlign = align;
	c.textBaseline = 'middle';
	c.lineJoin = 'round';
	c.strokeStyle = 'rgba(20,12,16,.9)';
	c.lineWidth = Math.max(3, size * 0.32);
	c.strokeText(text, x, y);
	c.fillStyle = '#fff6dc';
	c.fillText(text, x, y);
	c.restore();
}

/** A magnified cell of season `s`'s world, `cw` px square, a tile `Z` px; returns its centre. */
function cell(c: CanvasRenderingContext2D, s: Season, x: number, y: number, cw: number, Z: number): [number, number] {
	const b = bigWorld(s);
	const row = longestRow(b.session, Math.floor(b.session.grid.height * 0.55));
	const tx = Math.floor((row.x0 + row.x1) / 2) + 0.5;
	const ty = row.y + 0.5;
	const L = b.layout;
	const k = L.tileSize / Z;
	c.drawImage(b.canvas, px(L, tx) - (cw / 2) * k, py(L, ty) - (cw / 2) * k, cw * k, cw * k, x, y, cw, cw);
	return [x + cw / 2, y + cw / 2];
}

/** A hero run for `T` seconds (moving along `angle` when `moving`) to end at (x, y). */
function shoot(make: () => Hero, radius: number, x: number, y: number, Z: number, s: Season, opts: { moving: boolean; angle?: number; bite?: boolean; T?: number }): Hero {
	const hero = make();
	hero.setFeel(GAME_FEEL);
	hero.setRadius(Z * radius);
	const T = opts.T ?? 1.6;
	const dt = 1 / 60;
	const n = Math.round(T / dt);
	const a = opts.angle ?? 0;
	const v = 6 * Z;
	for (let i = 0; i <= n; i++) {
		const left = T - i * dt;
		if (opts.bite && Math.abs(left - 0.1) < dt / 2) hero.eat();
		const d = opts.moving ? v * left : 0;
		hero.update(i === 0 ? 0 : dt, { x: x - Math.cos(a) * d, y: y - Math.sin(a) * d, angle: a, moving: opts.moving, power: false, ending: false, season: s, look: null });
	}
	return hero;
}

function frameCell(c: CanvasRenderingContext2D, x: number, y: number, cw: number, draw: () => void): void {
	c.save();
	c.beginPath();
	c.roundRect(x, y, cw, cw, 10);
	c.clip();
	draw();
	c.restore();
	c.strokeStyle = 'rgba(255,230,170,.45)';
	c.lineWidth = 1.5;
	c.beginPath();
	c.roundRect(x, y, cw, cw, 10);
	c.stroke();
}

// ── scenes: the sheet and the seasons (static, painted once) ────────────────────────────

const SHOTS: ReadonlyArray<{ name: string; moving: boolean; angle?: number; bite?: boolean; ghost?: boolean }> = [
	{ name: 'стоит', moving: false },
	{ name: 'бег →', moving: true },
	{ name: 'бег ←', moving: true, angle: Math.PI },
	{ name: 'вверх', moving: true, angle: -Math.PI / 2 },
	{ name: 'вниз', moving: true, angle: Math.PI / 2 },
	{ name: 'укус', moving: true, bite: true },
	{ name: 'с призраком', moving: true, ghost: true }
];

function paintStill(draw: (g: CanvasRenderingContext2D) => void): void {
	if (!still) {
		still = document.createElement('canvas');
		still.width = Math.round(vw * D);
		still.height = Math.round(vh * D);
		const g = still.getContext('2d') as CanvasRenderingContext2D;
		g.setTransform(D, 0, 0, D, 0, 0);
		g.fillStyle = '#0d0b12';
		g.fillRect(0, 0, vw, vh);
		draw(g);
	}
	ctx.drawImage(still, 0, 0, vw, vh);
}

function sceneSheet(g: CanvasRenderingContext2D): void {
	const labelW = 160;
	const gap = 8;
	const cw = Math.floor(Math.min(170, (vw - labelW - 30 - gap * SHOTS.length) / SHOTS.length, (vh - 110) / HEROES.length - 12));
	const rowH = cw + 12;
	const y0 = Math.max(56, (vh - HEROES.length * rowH) / 2 + 10);
	label(g, `Обычная форма: огонь и туманность (${season}), рядом сегодняшние герои`, vw / 2, y0 - 34, 16);
	HEROES.forEach((h, r) => {
		const y = y0 + r * rowH;
		label(g, h.name, 14, y + cw / 2, 13, 'left');
		SHOTS.forEach((shot, i) => {
			const x = 14 + labelW + i * (cw + gap);
			const Z = cw / 2.2;
			frameCell(g, x, y, cw, () => {
				const [cx, cy] = cell(g, season, x, y, cw, Z);
				const hx = cx - (shot.ghost ? Z * 0.55 : 0);
				if (shot.ghost) drawGhost(g, 'BLINKY', cx + Z * 0.6, cy, Z, -1);
				shoot(h.make, h.radius, hx, cy, Z, season, shot).draw(g);
			});
			if (r === 0) label(g, shot.name, x + cw / 2, y - 11, 11);
		});
	});
}

function sceneSeasons(g: CanvasRenderingContext2D): void {
	const rows = HEROES.filter((h) => h.fresh);
	const labelW = 160;
	const gap = 10;
	const cw = Math.floor(Math.min(230, (vw - labelW - 30 - gap * 4) / 4, (vh - 120) / rows.length - 14));
	const rowH = cw + 16;
	const y0 = Math.max(56, (vh - rows.length * rowH) / 2 + 10);
	label(g, 'Новые герои на полах всех сезонов, рядом призрак сезона', vw / 2, y0 - 34, 16);
	rows.forEach((h, r) => {
		const y = y0 + r * rowH;
		label(g, h.name, 14, y + cw / 2, 13, 'left');
		SEASONS.forEach((s, i) => {
			const x = 14 + labelW + i * (cw + gap);
			const Z = cw / 2.6;
			frameCell(g, x, y, cw, () => {
				const [cx, cy] = cell(g, s, x, y, cw, Z);
				drawGhost(g, KINDS[i]!, cx + Z * 0.62, cy, Z, -1, s);
				shoot(h.make, h.radius, cx - Z * 0.55, cy, Z, s, { moving: true }).draw(g);
			});
			if (r === 0) label(g, s, x + cw / 2, y - 11, 12);
		});
	});
}

// ── scene: the maze ─────────────────────────────────────────────────────────────────

const DIRS: ReadonlyArray<[number, number]> = [
	[1, 0],
	[0, -1],
	[-1, 0],
	[0, 1]
];

interface Runner {
	who: number;
	hero: Hero | null;
	ghost: GhostKind | null;
	tile: { x: number; y: number };
	dir: number;
	progress: number;
	seed: number;
}
let runners: Runner[] = [];

const walkable = (x: number, y: number) => session.grid.isPlayerWalkable(x, y) && !session.grid.isTeleport(x, y);
const hashN = (n: number) => {
	const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
	return s - Math.floor(s);
};

function makeRunners(): Runner[] {
	const g = session.grid;
	const free: Array<{ x: number; y: number }> = [];
	for (let y = 0; y < g.height; y++) for (let x = 0; x < g.width; x++) if (g.tileAt(x, y) === 'DT') free.push({ x, y });
	const list: Runner[] = [];
	HEROES.forEach((h, i) => {
		const hero = h.make();
		hero.setFeel(GAME_FEEL);
		list.push({ who: i, hero, ghost: null, tile: { ...free[Math.floor(hashN(i + 3) * free.length)]! }, dir: 0, progress: 0, seed: i });
	});
	KINDS.forEach((kind, i) => {
		list.push({ who: -1, hero: null, ghost: kind, tile: { ...free[Math.floor(hashN(i + 17) * free.length)]! }, dir: 2, progress: 0, seed: 10 + i });
	});
	return list;
}

function step(r: Runner, dt: number, speed: number): void {
	let left = speed * dt;
	let guard = 0;
	while (left > 1e-6 && guard++ < 8) {
		const need = 1 - r.progress;
		if (left < need) {
			r.progress += left;
			return;
		}
		left -= need;
		const [dx, dy] = DIRS[r.dir]!;
		r.tile = { x: r.tile.x + dx, y: r.tile.y + dy };
		r.progress = 0;
		const ways = [0, 1, 2, 3].filter((d) => d !== (r.dir + 2) % 4 && walkable(r.tile.x + DIRS[d]![0], r.tile.y + DIRS[d]![1]));
		r.dir = ways.length ? ways[Math.floor(hashN(r.tile.x * 31 + r.tile.y * 17 + Math.floor(time * 3) + r.seed) * ways.length)]! : (r.dir + 2) % 4;
	}
	const [dx, dy] = DIRS[r.dir]!;
	if (!walkable(r.tile.x + dx, r.tile.y + dy) && r.progress === 0) {
		const ways = [0, 1, 2, 3].filter((d) => walkable(r.tile.x + DIRS[d]![0], r.tile.y + DIRS[d]![1]));
		if (ways.length) r.dir = ways[0]!;
	}
}

function sceneMaze(dt: number): void {
	const L = world.layout;
	const S = L.tileSize;
	for (const r of runners) {
		step(r, dt, r.ghost ? 5.4 : 6);
		const [dx, dy] = DIRS[r.dir]!;
		const x = px(L, r.tile.x + 0.5 + dx * r.progress);
		const y = py(L, r.tile.y + 0.5 + dy * r.progress);
		if (r.ghost) {
			drawGhost(ctx, r.ghost, x, y, S, dx || 0);
			continue;
		}
		const h = HEROES[r.who]!;
		r.hero!.setRadius(S * h.radius);
		r.hero!.update(dt, { x, y, angle: Math.atan2(dy, dx), moving: true, power: false, ending: false, season, look: null });
		r.hero!.draw(ctx);
		label(ctx, h.name, x, y - S * 0.85, 10);
	}
}

// ── the loop ───────────────────────────────────────────────────────────────────────

function frame(realDt: number): void {
	const dt = realDt * (slow ? 0.25 : 1);
	time += dt;
	world.update(dt);
	ctx.setTransform(D, 0, 0, D, 0, 0);
	ctx.globalAlpha = 1;
	ctx.globalCompositeOperation = 'source-over';
	if (scene === 'sheet') return paintStill(sceneSheet);
	if (scene === 'seasons') return paintStill(sceneSeasons);
	world.drawWorld(ctx);
	world.drawMood(ctx);
	world.drawFood(ctx, () => false);
	sceneMaze(dt);
	world.drawOverlay(ctx);
}

window.addEventListener('resize', layout);
layout();
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
