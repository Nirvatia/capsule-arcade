// Throwaway comparison page for the boss's phases (part II, step 1): the body colour is one (the
// other colours are the imps'), so the phases differ by something else. The current Blinky and
// three directions (a silhouette, iron, a face) on the real floor of a corridor.
// Deleted once the owner has chosen.
import { GRID_DOOM } from '../../../src/games/pacman/config/mazes';
import { DoomWorld } from '../../../src/games/pacman/render/doom/DoomWorld';
import { HellBlinkyView } from '../../../src/games/pacman/render/doom/HellBlinkyView';
import type { BossSnapshot } from '../../../src/games/pacman/render/doom/HellBlinkyView';
import { drawBoss } from './bossNew';
import type { Direction } from './bossNew';

type Row = 'now' | Direction;
const ROWS: ReadonlyArray<{ id: Row; name: string; note: string }> = [
	{
		id: 'now',
		name: 'Сейчас',
		note: 'Фаза 3 набирает слои: вторая пара рогов, трещины, рана, свечение, огонь по подолу, светлое тело.'
	},
	{
		id: 'iron',
		name: '1 · Железо (доработанное)',
		note: 'Красное тело. Крупный шлем с носовой гардой; потом ещё щёки из плит и железные рога.'
	},
	{
		id: 'chains',
		name: '2 · Оковы',
		note: 'Красное тело. В I скован двумя цепями; во II одна цепь порвана; в III оковы пустые: он свободен.'
	},
	{
		id: 'crown',
		name: '3 · Корона',
		note: 'Красное тело. Ничего; низкая железная корона между рогами; высокая корона с пятью зубцами.'
	},
	{
		id: 'eye',
		name: '4 · Третий глаз',
		note: 'Красное тело. Ничего; на лбу закрытый глаз-щель; глаз открыт.'
	}
];
const W = 1280;
const H = 720;
const D = 2;

const at = (c: number, r: number) => GRID_DOOM[r]?.[c];
const floor = (c: number, r: number) => at(c, r) === 'FL';
const wall = (c: number, r: number) => at(c, r) === 'WL';
let corridor = { x: 12, y: 10 };
for (let r = 3; r < GRID_DOOM.length - 3; r += 1) {
	for (let c = 3; c < GRID_DOOM[0].length - 3; c += 1) {
		if (floor(c, r) && floor(c - 1, r) && floor(c + 1, r) && wall(c, r - 1) && wall(c, r + 1)) {
			corridor = { x: c, y: r };
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

const view = new HellBlinkyView();
function snap(phase: number): BossSnapshot {
	return {
		x: corridor.x + 0.5,
		y: corridor.y + 0.5,
		phase,
		state: 'CHASE' as BossSnapshot['state'],
		shape: 'none' as BossSnapshot['shape'],
		dir: 'RIGHT',
		progress: 0,
		alpha: 1,
		intro: 1,
		look: 0,
		hit: 0,
		echo: false
	};
}

const state = { gray: false, zoom: true };
const $ = <E extends HTMLElement>(id: string) => document.getElementById(id) as E;
const grid = $('grid');
const cells: Array<{ cv: HTMLCanvasElement; row: Row; phase: 1 | 2 | 3 }> = [];
for (const row of ROWS) {
	const sec = document.createElement('section');
	const h = document.createElement('h3');
	h.textContent = row.name;
	const p = document.createElement('p');
	p.textContent = row.note;
	const line = document.createElement('div');
	line.className = 'line';
	for (const phase of [1, 2, 3] as const) {
		const fig = document.createElement('figure');
		const cv = document.createElement('canvas');
		cv.width = 360;
		cv.height = 270;
		const cap = document.createElement('figcaption');
		cap.textContent = `Фаза ${['I', 'II', 'III'][phase - 1]}`;
		fig.append(cv, cap);
		line.append(fig);
		cells.push({ cv, row: row.id, phase });
	}
	sec.append(h, p, line);
	grid.append(sec);
}

function paint(c: (typeof cells)[number], t: number): void {
	const cx = layout.offsetX + (corridor.x + 0.5) * s;
	const cy = layout.offsetY + (corridor.y + 0.5) * s;
	const w = (state.zoom ? 2.8 : 6.4) * s;
	const h = (w * 270) / 360;
	const ctx = c.cv.getContext('2d') as CanvasRenderingContext2D;
	const k = c.cv.width / (w * D);
	ctx.setTransform(k * D, 0, 0, k * D, -(cx - w / 2) * k * D, -(cy - h / 2) * k * D);
	ctx.drawImage(base, 0, 0, W, H);
	if (c.row === 'now') {
		view.draw(ctx, snap(c.phase), layout, t);
	} else {
		drawBoss(ctx, cx, cy, s, c.phase, c.row, t);
	}
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
