// Prototype: the demolition yard's master assets (`yardArt.ts`, candidates for DESIGN.md §13) on the
// real maze `grid_01` at game scale, the hero beside them for scale; on the right the same assets
// at x2.5 on two small pieces of maze (a corner with crates, food and a bomb; a blast cross that
// breaks a crate and splashes on a wall). Bombs run a loop: fuse, blast, soot.
// ?night=1 the night; ?view=detail a x3 crop of the maze; ?t=<s> freezes time.
import { GRID_01 } from '../../../src/games/pacman/config/mazes';
import type { GridMatrix, TileType } from '../../../src/games/pacman/config/gridConfig';
import { PacmanHero } from '../../../src/games/pacman/render/actors/hero/PacmanHero';
import type { Arm, Frame, Light } from './yardArt';
import {
	BLAST_TIME,
	YardMap,
	bakeYard,
	blastArms,
	chooseCrates,
	drawBlast,
	drawBolt,
	drawBomb,
	drawCrate,
	drawDayGrade,
	drawDebris,
	drawNight,
	drawScorch
} from './yardArt';

const view = document.getElementById('view') as HTMLCanvasElement;
const ctx = view.getContext('2d') as CanvasRenderingContext2D;
const q = new URLSearchParams(location.search);
const D = Math.min(window.devicePixelRatio || 1, 2);
const night = q.get('night') === '1';
const detail = q.get('view') === 'detail';
const frozen = q.has('t') ? Number(q.get('t')) : null;

const FUSE = 2.2;
const CYCLE = 3.4;

/** A frame placed on the page at (x, y). */
type View = Frame & { readonly x: number; readonly y: number };

interface Bomb {
	readonly c: number;
	readonly r: number;
	/** Where in the loop it is at t = 0, s. */
	readonly off: number;
	readonly range: number;
}

interface Scene {
	readonly map: YardMap;
	readonly crates: Set<string>;
	readonly bombs: readonly Bomb[];
	readonly scorch: ReadonlyArray<[number, number]>;
	readonly f: View;
	readonly bake: HTMLCanvasElement;
	readonly arms: Map<Bomb, Arm[]>;
	readonly hero?: { c: number; r: number; hero: PacmanHero };
	readonly masts: ReadonlyArray<[number, number]>;
}

function matrix(rows: string[]): GridMatrix {
	return rows.map((row) => row.trim().split(/\s+/) as TileType[]);
}

function scene(
	m: GridMatrix,
	f: View,
	crates: Set<string>,
	bombs: Bomb[],
	scorch: Array<[number, number]>,
	masts: Array<[number, number]>,
	hero?: [number, number]
): Scene {
	const map = new YardMap(m);
	const bake = bakeYard(map, { W: f.W * D, H: f.H * D, ox: f.ox * D, oy: f.oy * D, s: f.s * D }, 5);
	const arms = new Map<Bomb, Arm[]>();
	for (const b of bombs) arms.set(b, blastArms(map, b.c, b.r, b.range, crates));
	let h: Scene['hero'];
	if (hero) {
		const p = new PacmanHero();
		p.setRadius(f.s * 0.39);
		h = { c: hero[0], r: hero[1], hero: p };
	}
	return { map, crates, bombs, scorch, f, bake, arms, hero: h, masts };
}

/** The bomb's state at time t: its fuse (1..0) or the blast's age (0..1), or soot after. */
function phase(b: Bomb, t: number): { fuse: number; age: number } {
	const local = (((t + b.off) % CYCLE) + CYCLE) % CYCLE;
	if (local < FUSE) return { fuse: 1 - local / FUSE, age: -1 };
	return { fuse: -1, age: (local - FUSE) / BLAST_TIME };
}

function draw(sc: Scene, t: number, dt: number): void {
	const { f, map } = sc;
	const { s, ox, oy } = f;
	const at = (c: number, r: number): [number, number] => [ox + (c + 0.5) * s, oy + (r + 0.5) * s];
	ctx.save();
	ctx.beginPath();
	ctx.rect(f.x, f.y, f.W, f.H);
	ctx.clip();
	ctx.translate(f.x, f.y);
	ctx.drawImage(sc.bake, 0, 0, f.W, f.H);
	// old soot
	for (const [c, r] of sc.scorch) {
		const [x, y] = at(c, r);
		drawScorch(ctx, x, y, s, blastArms(map, c, r, 2, new Set()), c * 31 + r, 0.85);
	}
	// soot under a live bomb's blast, once it has gone off
	const broken = new Map<string, { age: number; from: [number, number] }>();
	for (const b of sc.bombs) {
		const p = phase(b, t);
		const arms = sc.arms.get(b)!;
		if (p.age >= 0) {
			const [x, y] = at(b.c, b.r);
			drawScorch(ctx, x, y, s, arms, b.c * 7 + b.r, Math.min(1, p.age * 3));
			for (const a of arms) {
				if (!a.crate) continue;
				const key = `${b.c + a.dx * a.len},${b.r + a.dy * a.len}`;
				const reach = (a.len / (a.len + 0.3)) * 0.12;
				broken.set(key, { age: (p.age - reach) * BLAST_TIME, from: [x, y] });
			}
		}
	}
	// food (no bolt under a crate or a bomb)
	const busy = new Set(sc.bombs.map((b) => `${b.c},${b.r}`));
	for (let r = 0; r < map.R; r += 1) {
		for (let c = 0; c < map.C; c += 1) {
			const tk = map.at(c, r);
			if ((tk !== 'DT' && tk !== 'FT') || sc.crates.has(`${c},${r}`) || busy.has(`${c},${r}`)) continue;
			const [x, y] = at(c, r);
			drawBolt(ctx, x, y, s, (c * 0.37 + r * 0.61) % 1);
		}
	}
	// crates, or their planks
	let i = 0;
	for (const key of sc.crates) {
		const [c, r] = key.split(',').map(Number);
		const [x, y] = at(c, r);
		const b = broken.get(key);
		if (b && b.age >= 0) drawDebris(ctx, x, y, s, b.from[0], b.from[1], b.age, c * 13 + r);
		else drawCrate(ctx, x, y, s, (c * 7 + r * 3) % 3, i % 5);
		i += 1;
	}
	// the hero, resting, for scale
	if (sc.hero) {
		const [x, y] = at(sc.hero.c, sc.hero.r);
		sc.hero.hero.update(dt, { x, y, angle: Math.PI, moving: false, power: false, ending: false, season: 'summer' });
		sc.hero.hero.draw(ctx);
	}
	// bombs and blasts
	const lights: Light[] = sc.masts.map(([mx, my]) => ({
		x: ox + mx * s,
		y: oy + my * s,
		r: s * (sc.map.C > 10 ? 6.5 : 4),
		k: 0.9,
		tint: 'rgba(255,196,120,0.13)'
	}));
	const blasts: Array<() => void> = [];
	for (const b of sc.bombs) {
		const p = phase(b, t);
		const [x, y] = at(b.c, b.r);
		if (p.fuse >= 0) {
			drawBomb(ctx, x, y, s, t + b.off, p.fuse);
			lights.push({ x: x + s * 0.3, y: y - s * 0.4, r: s * 2.2, k: 0.7, tint: 'rgba(255,150,60,0.3)' });
		} else if (p.age <= 1) {
			blasts.push(() => drawBlast(ctx, x, y, s, sc.arms.get(b)!, p.age, b.c * 5 + b.r));
			const heat = Math.max(0, 1 - p.age * 1.2);
			const len = Math.max(...sc.arms.get(b)!.map((a) => a.len));
			lights.push({ x, y, r: s * (3 + len * 1.6), k: 0.98 * heat, tint: `rgba(255,140,50,${0.45 * heat})` });
		}
	}
	// the fire is its own light: over the night
	if (night) drawNight(ctx, f.W, f.H, lights);
	for (const blast of blasts) blast();
	if (!night) drawDayGrade(ctx, f.W, f.H);
	ctx.restore();
}

// ---------------------------------------------------------------- the scenes

const vw = window.innerWidth;
const vh = window.innerHeight;
view.width = Math.round(vw * D);
view.height = Math.round(vh * D);

const grid = new YardMap(GRID_01);
const crates = new Set(chooseCrates(grid, 11).map(([c, r]) => `${c},${r}`));
for (const k of ['6,8', '5,8', '6,7', '6,6', '6,9', '6,10', '12,4', '7,22', '8,24', '7,24', '9,24', '14,16', '19,22'])
	crates.delete(k);
crates.add('4,8');
const BOMBS: Bomb[] = [
	{ c: 6, r: 8, off: FUSE + 0.3 * BLAST_TIME, range: 2 },
	{ c: 12, r: 4, off: 0.35, range: 2 },
	{ c: 7, r: 22, off: 1.88, range: 2 }
];
const SCORCH: Array<[number, number]> = [
	[14, 16],
	[19, 22]
];
const MASTS: Array<[number, number]> = [
	[0.5, 0.5],
	[grid.C - 0.5, grid.R - 0.5],
	[grid.C - 0.5, 6],
	[0.5, grid.R - 7],
	[grid.C / 2, grid.R / 2 - 2]
];

const scenes: Scene[] = [];
if (detail) {
	const s = Math.floor(Math.min(vh / 9.5, vw / 16));
	const W = vw;
	const H = vh;
	scenes.push(
		scene(GRID_01, { x: 0, y: 0, W, H, ox: W / 2 - 6 * s, oy: H / 2 - 8.6 * s, s }, crates, BOMBS, SCORCH, MASTS)
	);
} else {
	const s = Math.floor(Math.min((vh - 8) / grid.R, (vw * 0.5) / grid.C));
	const mazeW = Math.min(vw * 0.52, s * (grid.C + 2));
	scenes.push(
		scene(
			GRID_01,
			{ x: 0, y: 0, W: mazeW, H: vh, ox: (mazeW - grid.C * s) / 2, oy: (vh - grid.R * s) / 2, s },
			crates,
			BOMBS,
			SCORCH,
			MASTS,
			[8, 24]
		)
	);
	// the same assets x2.5 on two pieces of maze
	const S = Math.round(s * 2.5);
	const px = mazeW + 8;
	const pw = vw - px;
	const ph = (vh - 8) / 2;
	const corner = matrix([
		'WL WL WL WL WL WL WL WL',
		'WL DT DT DT DT DT DT WL',
		'WL DT WL WL DT WL DT WL',
		'WL DT DT WL DT DT DT WL',
		'WL WL WL WL WL WL WL WL'
	]);
	scenes.push(
		scene(
			corner,
			{ x: px, y: 0, W: pw, H: ph, ox: (pw - 8 * S) / 2, oy: (ph - 5 * S) / 2, s: S },
			new Set(['1,1', '1,3', '6,2']),
			[{ c: 4, r: 3, off: 1.2, range: 2 }],
			[],
			[[0.5, 0.5]]
		)
	);
	const cross = matrix([
		'WL WL WL WL DT WL WL WL',
		'WL WL WL WL DT WL WL WL',
		'DT DT DT DT DT DT DT WL',
		'WL WL WL WL DT WL WL WL',
		'WL WL WL WL DT WL WL WL'
	]);
	scenes.push(
		scene(
			cross,
			{ x: px, y: ph + 8, W: pw, H: ph, ox: (pw - 8 * S) / 2, oy: (ph - 5 * S) / 2, s: S },
			new Set(['2,2']),
			[{ c: 4, r: 2, off: FUSE + 0.28 * BLAST_TIME, range: 3 }],
			[],
			[]
		)
	);
}

let last = -1;
function frame(now: number): void {
	const t = frozen ?? now / 1000;
	const dt = last < 0 ? 1 / 60 : Math.min(0.1, now / 1000 - last);
	last = now / 1000;
	ctx.setTransform(D, 0, 0, D, 0, 0);
	ctx.fillStyle = '#2a2118';
	ctx.fillRect(0, 0, vw, vh);
	for (const sc of scenes) {
		const f = sc.f;
		ctx.save();
		draw({ ...sc, f } as Scene, t, dt);
		ctx.restore();
	}
	if (frozen === null) requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
// a frozen frame still needs the hero settled
if (frozen !== null) for (let i = 0; i < 3; i += 1) requestAnimationFrame(frame);
