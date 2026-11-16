// Prototype `rage`: the heroes' new forms on their own machinery (roadmap I.4), against today's.
// Rows: today's hero (0.39 of a tile), direction 1 (shonen × magical girl) and direction 2
// (elements), both in the nimble form (0.33) and the rage form (0.40). Scenes:
//   sheet  frame by frame, both heroes: standing, running, the energizer's wind-up, burst and
//          settling, rage running, biting, standing, cooling down; a season ghost alongside;
//   maze   all six running the real maze at game speed, the energizer coming and going.
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
import { CrystalMs, MagicalMs, MoltenPacman, SuperPacman } from './forms';

const SEASONS = ['summer', 'autumn', 'winter', 'spring'] as const;
type Season = (typeof SEASONS)[number];
const SCENES = ['sheet', 'maze'] as const;
type Scene = (typeof SCENES)[number];
const KINDS: readonly GhostKind[] = ['BLINKY', 'PINKY', 'INKY', 'CLYDE'];

/** The forms: today's hero, and the two directions. */
const FORMS: ReadonlyArray<{
	name: string;
	radius: number;
	make: (ms: boolean) => Hero;
}> = [
	{ name: 'сейчас', radius: 0.39, make: (ms) => (ms ? new MsPacmanHero() : new PacmanHero()) },
	{ name: '1 · сёнэн / волшебница', radius: 0.33, make: (ms) => (ms ? new MagicalMs() : new SuperPacman()) },
	{ name: '2 · стихии', radius: 0.33, make: (ms) => (ms ? new CrystalMs() : new MoltenPacman()) }
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
let big: MeadowWorld;
let bigCanvas: HTMLCanvasElement;
let session: LevelSession;
let sheetCanvas: HTMLCanvasElement | null = null;
if (q.has('capture')) document.body.classList.add('capture');

function drawGhost(c: CanvasRenderingContext2D, kind: GhostKind, x: number, y: number, S: number, look = -1): void {
	drawCuteGhost(c, x, y, (S / 25) * 0.78, {
		shape: SEASON_GHOST[season] ?? 'drop',
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
	sheetCanvas = null;
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

function longestRow(minY = 0): { y: number; x0: number; x1: number } {
	const g = session.grid;
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

// ── scene: the sheet ──────────────────────────────────────────────────────────────

interface Shot {
	readonly name: string;
	/** Seconds simulated; the energizer comes at `power` (seconds before the end), ends at `off`. */
	readonly T: number;
	readonly moving: boolean;
	readonly power?: number;
	readonly off?: number;
	readonly bite?: number;
	readonly ghost?: boolean;
}

const SHOTS: readonly Shot[] = [
	{ name: 'стоит', T: 1.6, moving: false },
	{ name: 'бег', T: 1.6, moving: true },
	{ name: 'энерджайзер: замах', T: 1.6, moving: true, power: 0.1 },
	{ name: 'вспышка', T: 1.6, moving: true, power: 0.22 },
	{ name: '+0.4 с', T: 1.6, moving: true, power: 0.4 },
	{ name: 'ярость: бег', T: 2.4, moving: true, power: 1.6 },
	{ name: 'ярость: укус', T: 2.4, moving: true, power: 1.6, bite: 0.1 },
	{ name: 'ярость стоит', T: 2.4, moving: false, power: 1.6 },
	{ name: 'остывает', T: 3, moving: true, power: 2.4, off: 0.35 },
	{ name: 'с призраком', T: 1.6, moving: true, ghost: true },
	{ name: 'ярость с призраком', T: 2.4, moving: true, power: 1.6, ghost: true }
];

/** A hero run through a shot: it ends at (x, y), on a tile of `Z` px. */
function shoot(make: () => Hero, radius: number, shot: Shot, x: number, y: number, Z: number): Hero {
	const hero = make();
	hero.setFeel(GAME_FEEL);
	hero.setRadius(Z * radius);
	const dt = 1 / 60;
	const n = Math.round(shot.T / dt);
	const v = 6 * Z;
	for (let i = 0; i <= n; i++) {
		const t = i * dt;
		const left = shot.T - t;
		const power = shot.power !== undefined && left <= shot.power && !(shot.off !== undefined && left <= shot.off);
		if (shot.bite !== undefined && Math.abs(left - shot.bite) < dt / 2) hero.eat();
		hero.update(i === 0 ? 0 : dt, {
			x: shot.moving ? x - v * left : x,
			y,
			angle: 0,
			moving: shot.moving,
			power,
			ending: false,
			season,
			look: null
		});
	}
	return hero;
}

function sceneSheet(): void {
	if (sheetCanvas) {
		ctx.drawImage(sheetCanvas, 0, 0, vw, vh);
		return;
	}
	const c = document.createElement('canvas');
	c.width = Math.round(vw * D);
	c.height = Math.round(vh * D);
	const g = c.getContext('2d') as CanvasRenderingContext2D;
	g.setTransform(D, 0, 0, D, 0, 0);
	g.fillStyle = '#0d0b12';
	g.fillRect(0, 0, vw, vh);
	const row = longestRow(Math.floor(session.grid.height * 0.55));
	const tx = Math.floor((row.x0 + row.x1) / 2) + 0.5;
	const ty = row.y + 0.5;
	const labelW = 150;
	const gap = 6;
	const rows: Array<[number, boolean]> = [];
	for (const m of [false, true]) for (let f = 0; f < FORMS.length; f++) rows.push([f, m]);
	const cw = Math.floor(Math.min(120, (vw - labelW - 30 - gap * SHOTS.length) / SHOTS.length, (vh - 90) / rows.length - 8));
	const rowH = cw + 8;
	const y0 = Math.max(48, (vh - rows.length * rowH) / 2 + 10);
	label(g, `Герои на своём материале (${season}): сейчас · направление 1 · направление 2`, vw / 2, y0 - 30, 16);
	const L = big.layout;
	rows.forEach(([f, m], r) => {
		const form = FORMS[f]!;
		const y = y0 + r * rowH;
		label(g, form.name, 14, y + cw / 2 - 9, 12, 'left');
		label(g, m ? 'Ms. Pac-Man' : 'Pac-Man', 14, y + cw / 2 + 9, 12, 'left');
		SHOTS.forEach((shot, i) => {
			const x = 14 + labelW + i * (cw + gap);
			// the tile is drawn 2.3 cells wide: the hero against a real corridor
			const Z = cw / 2.3;
			const k = L.tileSize / Z;
			g.save();
			g.beginPath();
			g.roundRect(x, y, cw, cw, 10);
			g.clip();
			g.drawImage(bigCanvas, px(L, tx) - (cw / 2) * k, py(L, ty) - (cw / 2) * k, cw * k, cw * k, x, y, cw, cw);
			const cx = x + cw / 2 - (shot.ghost ? Z * 0.55 : 0);
			const cy = y + cw / 2;
			if (shot.ghost) drawGhost(g, 'BLINKY', x + cw / 2 + Z * 0.6, cy, Z, -1);
			const hero = shoot(() => form.make(m), form.radius, shot, cx, cy, Z);
			hero.draw(g);
			g.restore();
			g.strokeStyle = 'rgba(255,230,170,.45)';
			g.lineWidth = 1.5;
			g.beginPath();
			g.roundRect(x, y, cw, cw, 10);
			g.stroke();
			if (r === 0) label(g, shot.name, x + cw / 2, y - 10, 10);
		});
	});
	sheetCanvas = c;
	ctx.drawImage(c, 0, 0, vw, vh);
}

// ── scene: the maze ─────────────────────────────────────────────────────────────────

const DIRS: ReadonlyArray<[number, number]> = [
	[1, 0],
	[0, -1],
	[-1, 0],
	[0, 1]
];

interface Runner {
	form: number;
	ms: boolean;
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
	let i = 0;
	for (let f = 0; f < FORMS.length; f++) {
		for (const m of [false, true]) {
			const hero = FORMS[f]!.make(m);
			hero.setFeel(GAME_FEEL);
			list.push({ form: f, ms: m, hero, ghost: null, tile: { ...free[Math.floor(hashN(i + 1) * free.length)]! }, dir: 0, progress: 0, seed: i });
			i++;
		}
	}
	for (const kind of KINDS) {
		list.push({ form: -1, ms: false, hero: null, ghost: kind, tile: { ...free[Math.floor(hashN(i + 11) * free.length)]! }, dir: 2, progress: 0, seed: i });
		i++;
	}
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
		// the energizer: 4.5 s on, 3.5 s off, each on a clock of its own
		const phase = (time + r.seed * 1.1) % 8;
		const power = phase > 3.5;
		const ending = phase > 6.6;
		step(r, dt, r.ghost ? 5.4 : power ? 7 : 6);
		const [dx, dy] = DIRS[r.dir]!;
		const x = px(L, r.tile.x + 0.5 + dx * r.progress);
		const y = py(L, r.tile.y + 0.5 + dy * r.progress);
		if (r.ghost) {
			drawGhost(ctx, r.ghost, x, y, S, dx || 0);
			continue;
		}
		const hero = r.hero!;
		hero.setRadius(S * FORMS[r.form]!.radius);
		hero.update(dt, { x, y, angle: Math.atan2(dy, dx), moving: true, power, ending, season, look: null });
		hero.draw(ctx);
		label(ctx, `${r.form === 0 ? 'сейчас' : r.form}${r.ms ? ' Ms' : ''}`, x, y - S * 0.85, 10);
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
	if (scene === 'sheet') {
		sceneSheet();
		return;
	}
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
