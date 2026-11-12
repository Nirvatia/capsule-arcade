// Throwaway comparison page for the boss's phase II colour (part II, step 1): the owner picked
// direction B (the colour heats) but black sinks into the floor, so three brighter phase II
// colours are shown on the real maze, in a corridor and at a junction, between phases I and III.
// Deleted once the owner has chosen.
import { GRID_DOOM } from '../../../src/games/pacman/config/mazes';
import { DoomWorld } from '../../../src/games/pacman/render/doom/DoomWorld';
import { drawBoss } from './bossNew';
import type { Phase2 } from './bossNew';

interface Col {
	readonly name: string;
	readonly phase: 1 | 2 | 3;
	readonly p2?: Phase2;
}
const COLS: readonly Col[] = [
	{ name: 'Фаза I', phase: 1 },
	{ name: 'II · чёрный (отклонён)', phase: 2, p2: 'black' },
	{ name: 'II · оранжевый', phase: 2, p2: 'orange' },
	{ name: 'II · маджента', phase: 2, p2: 'magenta' },
	{ name: 'II · голубой', phase: 2, p2: 'blue' },
	{ name: 'Фаза III', phase: 3 }
];
const W = 1280;
const H = 720;
const D = 2;

const at = (c: number, r: number) => GRID_DOOM[r]?.[c];
const floor = (c: number, r: number) => at(c, r) === 'FL';
const wall = (c: number, r: number) => at(c, r) === 'WL';
let corridor = { x: 12, y: 10 };
let junction = { x: 12, y: 10 };
for (let r = 3; r < GRID_DOOM.length - 3; r += 1) {
	for (let c = 3; c < GRID_DOOM[0].length - 3; c += 1) {
		if (floor(c, r) && floor(c - 1, r) && floor(c + 1, r) && wall(c, r - 1) && wall(c, r + 1)) {
			corridor = { x: c, y: r };
		}
		if (floor(c, r) && floor(c - 1, r) && floor(c + 1, r) && floor(c, r - 1) && floor(c, r + 1)) {
			junction = { x: c, y: r };
		}
	}
}

const world = new DoomWorld(GRID_DOOM, []);
world.resize(W, H, D);
world.setMood(false, false);
world.update(0.016);
const base = document.createElement('canvas');
base.width = W * D;
base.height = H * D;
const bctx = base.getContext('2d') as CanvasRenderingContext2D;
bctx.setTransform(D, 0, 0, D, 0, 0);
world.drawWorld(bctx);
world.drawMood(bctx, []);
const layout = world.layout;
const s = layout.tileSize;

const state = { gray: false, zoom: true };
const $ = <E extends HTMLElement>(id: string) => document.getElementById(id) as E;
const grid = $('grid');
const cells: Array<{ cv: HTMLCanvasElement; col: Col; tile: { x: number; y: number } }> = [];
for (const [title, tile] of [
	['В коридоре', corridor],
	['На перекрёстке', junction]
] as const) {
	const sec = document.createElement('section');
	const h = document.createElement('h3');
	h.textContent = title;
	const line = document.createElement('div');
	line.className = 'line';
	for (const col of COLS) {
		const fig = document.createElement('figure');
		const cv = document.createElement('canvas');
		cv.width = 300;
		cv.height = 225;
		const cap = document.createElement('figcaption');
		cap.textContent = col.name;
		fig.append(cv, cap);
		line.append(fig);
		cells.push({ cv, col, tile });
	}
	sec.append(h, line);
	grid.append(sec);
}

function paint(c: (typeof cells)[number], t: number): void {
	const cx = layout.offsetX + (c.tile.x + 0.5) * s;
	const cy = layout.offsetY + (c.tile.y + 0.5) * s;
	const w = (state.zoom ? 2.6 : 6) * s;
	const h = (w * 225) / 300;
	const ctx = c.cv.getContext('2d') as CanvasRenderingContext2D;
	const k = c.cv.width / (w * D);
	ctx.setTransform(k * D, 0, 0, k * D, -(cx - w / 2) * k * D, -(cy - h / 2) * k * D);
	ctx.drawImage(base, 0, 0, W, H);
	drawBoss(ctx, cx, cy, s, c.col.phase, 'colour', t, c.col.p2);
}

function sync(): void {
	document.body.classList.toggle('gray', state.gray);
	$('gray').setAttribute('aria-pressed', String(state.gray));
	$('zoom').setAttribute('aria-pressed', String(state.zoom));
}
$('gray').addEventListener('click', () => {
	state.gray = !state.gray;
	sync();
});
$('zoom').addEventListener('click', () => {
	state.zoom = !state.zoom;
	sync();
});
sync();

const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
function frame(now: number): void {
	const t = reduce ? 1.2 : now / 1000;
	for (const c of cells) paint(c, t);
	requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
