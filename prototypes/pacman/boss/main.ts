// Throwaway comparison page for the boss's three phases (part II, step 1): the current Blinky,
// drawn by the game's own view, against three simpler directions, on the real maze at game scale
// and magnified. Deleted once the owner has chosen.
import { GRID_DOOM } from '../../../src/games/pacman/config/mazes';
import { DoomWorld } from '../../../src/games/pacman/render/doom/DoomWorld';
import { HellBlinkyView } from '../../../src/games/pacman/render/doom/HellBlinkyView';
import type { BossSnapshot } from '../../../src/games/pacman/render/doom/HellBlinkyView';
import { drawBoss } from './bossNew';
import type { Direction } from './bossNew';

type Row = 'now' | Direction;
const ROWS: ReadonlyArray<{ id: Row; name: string; note: string }> = [
	{ id: 'now', name: 'Сейчас', note: 'Фаза 3: вторая пара рогов, трещины, рана с рёбрами, свечение, огонь по подолу, светлое тело.' },
	{ id: 'horns', name: 'A · Рога растут', note: 'Тело одно, красное. Меняются только рога (пеньки, дуги, длинные) и накал глаз.' },
	{ id: 'colour', name: 'B · Цвет раскаляется', note: 'Силуэт один. Красный, потом чёрный с горячим контуром, потом белый.' },
	{ id: 'iron', name: 'C · Железо', note: 'Красное тело и железо плит: ничего, налобная полоса, шлем с железными рогами.' }
];
const W = 1280;
const H = 720;
const D = 2;
const TILE = { x: 12, y: 1 };

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
const cx = layout.offsetX + (TILE.x + 0.5) * s;
const cy = layout.offsetY + (TILE.y + 0.5) * s;
const CROP = { x: cx - 1.4 * s, y: cy - 1.05 * s, w: 2.8 * s, h: 2.1 * s };

const view = new HellBlinkyView();
function snap(phase: number): BossSnapshot {
	return {
		x: TILE.x + 0.5,
		y: TILE.y + 0.5,
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
		cv.height = Math.round((360 * CROP.h) / CROP.w);
		const cap = document.createElement('figcaption');
		cap.textContent = `Фаза ${['I', 'II', 'III'][phase - 1]}`;
		fig.append(cv, cap);
		line.append(fig);
		cells.push({ cv, row: row.id, phase });
	}
	const wrap = document.createElement('section');
	wrap.append(h, p, line);
	grid.append(wrap);
}

function paint(cv: HTMLCanvasElement, row: Row, phase: 1 | 2 | 3, t: number): void {
	const ctx = cv.getContext('2d') as CanvasRenderingContext2D;
	const crop = state.zoom
		? CROP
		: { x: cx - 4.2 * s, y: cy - 3.15 * s, w: 8.4 * s, h: 6.3 * s };
	const k = cv.width / (crop.w * D);
	ctx.setTransform(k * D, 0, 0, k * D, -crop.x * k * D, -crop.y * k * D);
	ctx.drawImage(base, 0, 0, W, H);
	if (row === 'now') {
		view.draw(ctx, snap(phase), layout, t);
	} else {
		drawBoss(ctx, cx, cy, s, phase, row, t);
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
	for (const c of cells) paint(c.cv, c.row, c.phase, t);
	requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
