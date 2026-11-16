// Prototype `heroes`: the heroes' redesign, three directions side by side on the real season
// worlds (roadmap I.4). Each has a nimble form and a rage form (the energizer, her overdrive).
// Scenes:
//   sheet   frame by frame, both heroes: standing, running, turning up, biting, the turn into
//           rage (with its burst), rage standing, running, biting; a season ghost in the same cell;
//   maze    all six running the real maze at game speed, going into rage and out of it;
//   lineup  one hero's six forms in a row with the season's ghosts, game scale and magnified.
// Query: ?scene=sheet&season=autumn&hero=ms&capture (capture: window.__advance(seconds)).
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
import type { GridLayout } from '../../../src/games/pacman/render/maze/GridView';
import { DESIGNS } from './designs';
import type { HeroPose } from './common';

const SEASONS = ['summer', 'autumn', 'winter', 'spring'] as const;
type Season = (typeof SEASONS)[number];
const SCENES = ['sheet', 'maze', 'lineup'] as const;
type Scene = (typeof SCENES)[number];
const KINDS: readonly GhostKind[] = ['BLINKY', 'PINKY', 'INKY', 'CLYDE'];

const $ = <E extends HTMLElement>(id: string) => document.getElementById(id) as E;
const view = $<HTMLCanvasElement>('view');
const ctx = view.getContext('2d') as CanvasRenderingContext2D;
const D = Math.min(window.devicePixelRatio || 1, 2);
const q = new URLSearchParams(location.search);
const pick = <T extends string>(list: readonly T[], v: string | null, f: T): T =>
	list.includes(v as T) ? (v as T) : f;

let season: Season = pick(SEASONS, q.get('season'), 'summer');
let scene: Scene = pick(SCENES, q.get('scene'), 'sheet');
let ms = q.get('hero') === 'ms';
let slow = false;
let vw = 0;
let vh = 0;
let time = 0;
let world: MeadowWorld;
let big: MeadowWorld;
let bigCanvas: HTMLCanvasElement;
let session: LevelSession;
if (q.has('capture')) document.body.classList.add('capture');

function pose(over: Partial<HeroPose>): HeroPose {
	return {
		ms,
		rage: 0,
		angle: 0,
		speed: 0,
		chomp: 0.5,
		turn: 0,
		time,
		burst: 0,
		season,
		dpr: D,
		...over
	};
}

function drawGhost(c: CanvasRenderingContext2D, kind: GhostKind, x: number, y: number, S: number, look = -1, scared = false): void {
	drawCuteGhost(c, x, y, (S / 25) * 0.78, {
		shape: SEASON_GHOST[season] ?? 'drop',
		kind,
		state: scared ? 'scared' : 'normal',
		lookX: look,
		lookY: 0,
		time,
		step: time * 9 + kind.length,
		chasing: true
	});
}

// ── the worlds ─────────────────────────────────────────────────────────────────

function settle(w: MeadowWorld): void {
	w.setMood(0, 0);
	for (let i = 0; i < 40; i++) w.update(0.1);
}

function build(): void {
	const level = SEASONS.indexOf(season) + 1;
	const data = seasonForLevel(level);
	const theme = meadowThemeFor(season) as MeadowTheme;
	world = new MeadowWorld(data.grid, theme);
	world.resize(vw, vh, D);
	settle(world);
	big = new MeadowWorld(data.grid, theme);
	big.resize(2400, 2200, 1);
	settle(big);
	bigCanvas = document.createElement('canvas');
	bigCanvas.width = 2400;
	bigCanvas.height = 2200;
	const bc = bigCanvas.getContext('2d') as CanvasRenderingContext2D;
	big.drawWorld(bc);
	big.drawMood(bc);
	big.drawFood(bc, () => false);
	session = buildLevelSession({
		events: new EventBus<PacmanEventMap>(),
		level,
		profile: 'pacman',
		season: data,
		hell: false,
		secret: false,
		godMode: true
	});
	runners = makeRunners();
	for (const b of document.querySelectorAll<HTMLButtonElement>('[data-season]')) {
		b.setAttribute('aria-pressed', String(b.dataset.season === season));
	}
	for (const b of document.querySelectorAll<HTMLButtonElement>('[data-scene]')) {
		b.setAttribute('aria-pressed', String(b.dataset.scene === scene));
	}
	for (const b of document.querySelectorAll<HTMLButtonElement>('[data-hero]')) {
		b.setAttribute('aria-pressed', String((b.dataset.hero === 'ms') === ms));
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
for (const b of document.querySelectorAll<HTMLButtonElement>('[data-hero]')) {
	b.addEventListener('click', () => {
		ms = b.dataset.hero === 'ms';
		build();
	});
}
$('slow').addEventListener('click', () => {
	slow = !slow;
	$('slow').setAttribute('aria-pressed', String(slow));
});

// ── helpers ────────────────────────────────────────────────────────────────────

const px = (L: GridLayout, tx: number) => L.offsetX + tx * L.tileSize;
const py = (L: GridLayout, ty: number) => L.offsetY + ty * L.tileSize;

function longestRow(minY = 0, maxY = Infinity): { y: number; x0: number; x1: number } {
	const g = session.grid;
	let best = { y: 0, x0: 0, x1: 0 };
	for (let y = minY; y < Math.min(g.height, maxY); y++) {
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

/** A magnified window onto the big world; returns tile → px for what is drawn in it. */
function cell(c: CanvasRenderingContext2D, x: number, y: number, cw: number, ch: number, tx: number, ty: number, Z: number) {
	const L = big.layout;
	const k = L.tileSize / Z;
	c.save();
	c.beginPath();
	c.roundRect(x, y, cw, ch, 10);
	c.clip();
	c.drawImage(bigCanvas, px(L, tx) - (cw / 2) * k, py(L, ty) - (ch / 2) * k, cw * k, ch * k, x, y, cw, ch);
	c.restore();
	c.save();
	c.strokeStyle = 'rgba(255,230,170,.45)';
	c.lineWidth = 1.5;
	c.beginPath();
	c.roundRect(x, y, cw, ch, 10);
	c.stroke();
	c.restore();
	return (ux: number, uy: number): [number, number] => [x + cw / 2 + (ux - tx) * Z, y + ch / 2 + (uy - ty) * Z];
}

// ── scene: the sheet ──────────────────────────────────────────────────────────────

const COLUMNS: ReadonlyArray<{ name: string; pose: Partial<HeroPose>; ghost?: boolean }> = [
	{ name: 'стоит', pose: { chomp: 0.45 } },
	{ name: 'бег', pose: { speed: 1, chomp: 0.7 } },
	{ name: 'поворот вверх', pose: { speed: 1, turn: 1, chomp: 0.3, angle: -Math.PI / 2 } },
	{ name: 'укус', pose: { chomp: 1, speed: 0.5 } },
	{ name: 'ярость 25%', pose: { rage: 0.25, burst: 0.25 } },
	{ name: '50%', pose: { rage: 0.5, burst: 0.5 } },
	{ name: '75%', pose: { rage: 0.75, burst: 0.75 } },
	{ name: 'ярость', pose: { rage: 1, chomp: 0.55 } },
	{ name: 'ярость: бег', pose: { rage: 1, speed: 1, chomp: 0.85 } },
	{ name: 'ярость: укус влево', pose: { rage: 1, chomp: 1, angle: Math.PI } },
	{ name: 'с призраком', pose: { speed: 1, chomp: 0.6 }, ghost: true }
];

function sceneSheet(): void {
	ctx.fillStyle = '#0d0b12';
	ctx.fillRect(0, 0, vw, vh);
	const row = longestRow(Math.floor(session.grid.height * 0.55));
	const tx = Math.floor((row.x0 + row.x1) / 2) + 0.5;
	const ty = row.y + 0.5;
	const labelW = 150;
	const gap = 6;
	const rows: Array<[number, boolean]> = [];
	for (let d = 0; d < DESIGNS.length; d++) for (const m of [false, true]) rows.push([d, m]);
	const cw = Math.floor(Math.min(118, (vw - labelW - 30 - gap * COLUMNS.length) / COLUMNS.length, (vh - 90) / rows.length - 8));
	const rowH = cw + 8;
	const y0 = Math.max(48, (vh - rows.length * rowH) / 2 + 10);
	label(ctx, `Герои: три направления (${season}), обычная форма → ярость`, vw / 2, y0 - 30, 16);
	const keep = ms;
	rows.forEach(([d, m], r) => {
		ms = m;
		const design = DESIGNS[d]!;
		const y = y0 + r * rowH;
		label(ctx, design.name, 14, y + cw / 2 - 9, 13, 'left');
		label(ctx, m ? 'Ms. Pac-Man' : 'Pac-Man', 14, y + cw / 2 + 9, 12, 'left');
		COLUMNS.forEach((col, i) => {
			const x = 14 + labelW + i * (cw + gap);
			const Z = cw / 2.2;
			const map = cell(ctx, x, y, cw, cw, tx, ty, Z);
			const [cx, cy] = map(tx, ty);
			ctx.save();
			ctx.beginPath();
			ctx.roundRect(x, y, cw, cw, 10);
			ctx.clip();
			if (col.ghost) {
				drawGhost(ctx, 'BLINKY', cx + Z * 0.55, cy, Z, -1);
				design.paint(ctx, cx - Z * 0.55, cy, Z, pose(col.pose));
			} else {
				design.paint(ctx, cx, cy, Z, pose(col.pose));
			}
			ctx.restore();
			if (r === 0) label(ctx, col.name, x + cw / 2, y - 10, 10);
		});
	});
	ms = keep;
}

// ── scene: the maze, all six running ────────────────────────────────────────────────

const DIRS: ReadonlyArray<[number, number]> = [
	[1, 0],
	[0, -1],
	[-1, 0],
	[0, 1]
];

interface Runner {
	design: number;
	ms: boolean;
	tile: { x: number; y: number };
	dir: number;
	progress: number;
	rage: number;
	rageOn: boolean;
	burst: number;
	turn: number;
	seed: number;
	ghost?: GhostKind;
}
let runners: Runner[] = [];

function walkable(x: number, y: number): boolean {
	const g = session.grid;
	return g.isPlayerWalkable(x, y) && !g.isTeleport(x, y);
}

function makeRunners(): Runner[] {
	const g = session.grid;
	const free: Array<{ x: number; y: number }> = [];
	for (let y = 0; y < g.height; y++) for (let x = 0; x < g.width; x++) if (g.tileAt(x, y) === 'DT') free.push({ x, y });
	const list: Runner[] = [];
	let i = 0;
	for (let d = 0; d < DESIGNS.length; d++) {
		for (const m of [false, true]) {
			const t = free[Math.floor(hashN(i + 1) * free.length)]!;
			list.push({ design: d, ms: m, tile: { ...t }, dir: 0, progress: 0, rage: 0, rageOn: false, burst: 1, turn: 0, seed: i });
			i++;
		}
	}
	for (const kind of KINDS) {
		const t = free[Math.floor(hashN(i + 11) * free.length)]!;
		list.push({ design: -1, ms: false, tile: { ...t }, dir: 2, progress: 0, rage: 0, rageOn: false, burst: 1, turn: 0, seed: i, ghost: kind });
		i++;
	}
	return list;
}

function hashN(n: number): number {
	const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
	return s - Math.floor(s);
}

function stepRunner(r: Runner, dt: number): void {
	// rage in and out on a clock of its own
	const want = Math.floor((time + r.seed * 1.3) / 4) % 2 === 1;
	if (want && !r.rageOn) r.burst = 0;
	r.rageOn = want;
	r.rage = Math.max(0, Math.min(1, r.rage + (want ? dt / 0.35 : -dt / 0.5)));
	r.burst = Math.min(1, r.burst + dt / 0.45);
	r.turn *= Math.exp(-dt * 6);
	const speed = r.ghost ? 5.4 : r.rageOn ? 7.2 : 6;
	let left = speed * dt;
	let guard = 0;
	while (left > 1e-6 && guard++ < 8) {
		const need = 1 - r.progress;
		if (left < need) {
			r.progress += left;
			left = 0;
			break;
		}
		left -= need;
		const [dx, dy] = DIRS[r.dir]!;
		r.tile = { x: r.tile.x + dx, y: r.tile.y + dy };
		r.progress = 0;
		// a junction: a way that is not back, by chance
		const ways = [0, 1, 2, 3].filter((d) => d !== (r.dir + 2) % 4 && walkable(r.tile.x + DIRS[d]![0], r.tile.y + DIRS[d]![1]));
		const next = ways.length ? ways[Math.floor(hashN(r.tile.x * 31 + r.tile.y * 17 + Math.floor(time * 3) + r.seed) * ways.length)]! : (r.dir + 2) % 4;
		if (next !== r.dir) {
			const cross = DIRS[r.dir]![0] * DIRS[next]![1] - DIRS[r.dir]![1] * DIRS[next]![0];
			r.turn = cross > 0 ? 1 : -1;
		}
		r.dir = next;
	}
	// a stuck start: pick any open way
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
		stepRunner(r, dt);
		const [dx, dy] = DIRS[r.dir]!;
		const x = px(L, r.tile.x + 0.5 + dx * r.progress);
		const y = py(L, r.tile.y + 0.5 + dy * r.progress);
		if (r.ghost) {
			drawGhost(ctx, r.ghost, x, y, S, dx || 0);
			continue;
		}
		const keep = ms;
		ms = r.ms;
		DESIGNS[r.design]!.paint(ctx, x, y, S, pose({
			rage: r.rage,
			angle: Math.atan2(dy, dx),
			speed: 1,
			chomp: 0.5 + 0.5 * Math.sin(time * (r.rageOn ? 22 : 16) + r.seed),
			turn: r.turn,
			burst: r.burst
		}));
		ms = keep;
		label(ctx, `${DESIGNS[r.design]!.id.toUpperCase()}${r.ms ? '·Ms' : ''}`, x, y - S * 0.8, 10);
	}
}

// ── scene: the lineup ──────────────────────────────────────────────────────────────

function sceneLineup(): void {
	const L = world.layout;
	const S = L.tileSize;
	// a row in the upper half: the magnified strip covers the lower one
	const row = longestRow(1, Math.floor(session.grid.height * 0.5));
	type Cast = { name: string; draw: (x: number, y: number, s: number) => void };
	const cast: Cast[] = [];
	cast.push({ name: 'Blinky', draw: (x, y, s) => drawGhost(ctx, 'BLINKY', x, y, s, 1) });
	DESIGNS.forEach((d, i) => {
		cast.push({ name: `${d.id.toUpperCase()}`, draw: (x, y, s) => d.paint(ctx, x, y, s, pose({ chomp: 0.55 })) });
		cast.push({ name: `${d.id.toUpperCase()} ярость`, draw: (x, y, s) => d.paint(ctx, x, y, s, pose({ rage: 1, chomp: 0.7 })) });
		cast.push({ name: KINDS[(i + 1) % 4]!, draw: (x, y, s) => drawGhost(ctx, KINDS[(i + 1) % 4]!, x, y, s, -1) });
	});
	const span = row.x1 - row.x0 + 1;
	const step = Math.max(1, Math.floor(span / cast.length));
	cast.forEach((a, i) => {
		const tx = row.x0 + i * step + 0.5;
		a.draw(px(L, tx), py(L, row.y + 0.5), S);
	});
	// the same row magnified at the bottom
	const Z = Math.min(64, (vw - 60) / (span + 1));
	const w = (span + 1) * Z;
	const h = Z * 2.3;
	const x0 = (vw - w) / 2;
	const y0 = vh - h - 64;
	const map = cell(ctx, x0, y0, w, h, row.x0 + span / 2, row.y + 0.5, Z);
	ctx.save();
	ctx.beginPath();
	ctx.roundRect(x0, y0, w, h, 10);
	ctx.clip();
	cast.forEach((a, i) => {
		const [cx, cy] = map(row.x0 + i * step + 0.5, row.y + 0.5);
		a.draw(cx, cy, Z);
		label(ctx, a.name, cx, cy - Z * 0.85, 11);
	});
	ctx.restore();
	label(ctx, `${ms ? 'Ms. Pac-Man' : 'Pac-Man'} — игровой масштаб (вверху) и ×${(Z / S).toFixed(1)}`, vw / 2, y0 - 14, 14);
}

// ── the loop ───────────────────────────────────────────────────────────────────────

function frame(realDt: number): void {
	const dt = realDt * (slow ? 0.25 : 1);
	time += dt;
	world.update(dt);
	ctx.setTransform(D, 0, 0, D, 0, 0);
	ctx.globalAlpha = 1;
	ctx.globalCompositeOperation = 'source-over';
	if (scene === 'sheet') {
		sceneSheet();
		return;
	}
	world.drawWorld(ctx);
	world.drawMood(ctx);
	world.drawFood(ctx, () => false);
	if (scene === 'maze') sceneMaze(dt);
	else sceneLineup();
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
