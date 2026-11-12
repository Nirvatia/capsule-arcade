// Throwaway comparison page for the boss's attacks (part II, step 1): every attack redone in one
// visual language, on the real maze at game scale, each as its warning and its blow, plus the
// block (void cells, locked seals), the tar (the slowing tiles) and the chain (the pull), then
// everything at once. Deleted once the owner has chosen.
import { GRID_DOOM } from '../../../src/games/pacman/config/mazes';
import { DoomWorld } from '../../../src/games/pacman/render/doom/DoomWorld';
import { block, eruption, lane, sealLocked, sealWarn, tar } from './draw';
import type { Tile } from './draw';

const W = 1280;
const H = 720;
const D = 2;
const rows = GRID_DOOM.length;
const cols = GRID_DOOM[0].length;
const floor = (c: number, r: number): boolean => GRID_DOOM[r]?.[c] === 'FL';
const nb = (c: number, r: number): number =>
	[floor(c - 1, r), floor(c + 1, r), floor(c, r - 1), floor(c, r + 1)].filter(Boolean).length;
const dist = (a: Tile, b: Tile): number => Math.hypot(a.c - b.c, a.r - b.r);

// ---- geometry taken from the real maze ----
let run: Tile[] = [];
for (let r = 3; r < rows - 3; r += 1) {
	let cur: Tile[] = [];
	for (let c = 0; c <= cols; c += 1) {
		if (floor(c, r)) {
			cur.push({ c, r });
		} else {
			if (cur.length > run.length) run = cur;
			cur = [];
		}
	}
}
run = run.slice(4, 12);
const centre: Tile = { c: Math.floor(cols / 2), r: Math.floor(rows / 2) };
const junctions: Tile[] = [];
for (let r = 2; r < rows - 2; r += 1) {
	for (let c = 2; c < cols - 2; c += 1) {
		if (floor(c, r) && nb(c, r) >= 3) junctions.push({ c, r });
	}
}
const crossAt =
	junctions.filter((j) => nb(j.c, j.r) === 4).sort((a, b) => dist(a, centre) - dist(b, centre))[0] ??
	centre;
const eruptAt =
	junctions
		.filter((j) => nb(j.c, j.r) === 4)
		.sort((a, b) => dist(b, crossAt) - dist(a, crossAt))[0] ?? crossAt;
const arm = (dc: number, dr: number, max = 5): Tile[] => {
	const out: Tile[] = [];
	for (let i = 1; i <= max; i += 1) {
		const c = crossAt.c + dc * i;
		const r = crossAt.r + dr * i;
		if (!floor(c, r)) break;
		out.push({ c, r });
	}
	return out;
};
const crossTiles = [...arm(1, 0), ...arm(-1, 0), ...arm(0, 1), ...arm(0, -1)];
const discTiles: Tile[] = [];
for (let dr = -2; dr <= 2; dr += 1) {
	for (let dc = -2; dc <= 2; dc += 1) {
		if (Math.abs(dc) + Math.abs(dr) <= 2 && floor(eruptAt.c + dc, eruptAt.r + dr)) {
			discTiles.push({ c: eruptAt.c + dc, r: eruptAt.r + dr });
		}
	}
}
const sealTiles = junctions
	.sort((a, b) => dist(a, crossAt) - dist(b, crossAt))
	.filter((j) => dist(j, crossAt) > 1.5)
	.slice(0, 3);
const blockTiles: Tile[] = run.slice(3, 5);
const tarTiles: Tile[] = [];
for (let r = 1; r <= 3; r += 1) {
	for (let c = 2; c <= 10; c += 1) {
		const h = Math.sin(c * 12.9 + r * 78.2) * 43758.5;
		if (floor(c, r) && h - Math.floor(h) < 0.8) tarTiles.push({ c, r });
	}
}

// ---- the real world as the backdrop ----
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
const ox = layout.offsetX;
const oy = layout.offsetY;
const px = (t: Tile) => ({ x: ox + (t.c + 0.5) * s, y: oy + (t.r + 0.5) * s });

function hero(ctx: CanvasRenderingContext2D, t: Tile): void {
	const q = px(t);
	ctx.fillStyle = '#ffd23a';
	ctx.strokeStyle = '#2a1204';
	ctx.lineWidth = s * 0.09;
	ctx.beginPath();
	ctx.moveTo(q.x, q.y);
	ctx.arc(q.x, q.y, s * 0.42, 0.5, Math.PI * 2 - 0.5);
	ctx.closePath();
	ctx.fill();
	ctx.stroke();
}
function bossDot(ctx: CanvasRenderingContext2D, t: Tile): void {
	const q = px(t);
	const R = s * 0.34;
	ctx.fillStyle = '#d0261f';
	ctx.strokeStyle = '#1a0406';
	ctx.lineWidth = s * 0.09;
	ctx.beginPath();
	ctx.arc(q.x, q.y - R * 0.1, R, Math.PI, 0);
	ctx.lineTo(q.x + R, q.y + R * 0.9);
	ctx.lineTo(q.x - R, q.y + R * 0.9);
	ctx.closePath();
	ctx.fill();
	ctx.stroke();
	ctx.fillStyle = '#ffe27a';
	ctx.fillRect(q.x - R * 0.55, q.y - R * 0.3, R * 0.35, R * 0.4);
	ctx.fillRect(q.x + R * 0.2, q.y - R * 0.3, R * 0.35, R * 0.4);
}

type Paint = (ctx: CanvasRenderingContext2D, t: number) => void;
const warnP = (t: number) => 0.45 + 0.5 * (0.5 + 0.5 * Math.sin(t * 1.6));
const liveK = (t: number) => 0.75 + 0.25 * Math.sin(t * 6);

interface Panel {
	readonly title: string;
	readonly note: string;
	readonly at: Tile;
	readonly tiles: number;
	readonly paint: Paint;
}
const mid = (a: readonly Tile[]): Tile => ({
	c: a.reduce((m, t) => m + t.c, 0) / a.length,
	r: a.reduce((m, t) => m + t.r, 0) / a.length
});
const PANELS: readonly Panel[] = [
	{
		title: 'Разлом: предупреждение',
		note: 'Янтарная штриховка бежит по тайлам и пунктир по краю; без свечения и заливки.',
		at: mid(run),
		tiles: 9,
		paint: (c, t) => {
			lane(c, run, ox, oy, s, false, warnP(t), t);
			hero(c, run[1]);
		}
	},
	{
		title: 'Разлом: удар',
		note: 'Белое ядро, оранжевый край, тёмная обводка по тайлу.',
		at: mid(run),
		tiles: 9,
		paint: (c, t) => {
			lane(c, run, ox, oy, s, true, liveK(t), t);
			hero(c, run[1]);
		}
	},
	{
		title: 'Крест: предупреждение',
		note: 'Четыре луча, как разлом.',
		at: crossAt,
		tiles: 9,
		paint: (c, t) => {
			lane(c, crossTiles, ox, oy, s, false, warnP(t), t);
			bossDot(c, crossAt);
		}
	},
	{
		title: 'Крест: удар',
		note: 'Те же лучи, раскалены.',
		at: crossAt,
		tiles: 9,
		paint: (c, t) => {
			lane(c, crossTiles, ox, oy, s, true, liveK(t), t);
			bossDot(c, crossAt);
		}
	},
	{
		title: 'Извержение: предупреждение',
		note: 'Диск тайлов и кольцо, которое сжимается к центру.',
		at: eruptAt,
		tiles: 8,
		paint: (c, t) => {
			eruption(c, discTiles, eruptAt, ox, oy, s, false, warnP(t), t);
			bossDot(c, eruptAt);
		}
	},
	{
		title: 'Извержение: удар',
		note: 'Диск раскалён, по нему расходится ударная волна.',
		at: eruptAt,
		tiles: 8,
		paint: (c, t) => {
			eruption(c, discTiles, eruptAt, ox, oy, s, true, 0.35 + 0.65 * (1 - ((t * 1.5) % 1)), t);
			bossDot(c, eruptAt);
		}
	},
	{
		title: 'Печать: перекрёстки горят',
		note: 'Знакомая печать: кольцо замыкается, пентаграмма дорисовывается штрих за штрихом; с обводкой и светлыми линиями. Стоять на этих перекрёстках нельзя.',
		at: mid(sealTiles),
		tiles: 8,
		paint: (c, t) => {
			for (const q of sealTiles) sealWarn(c, ox + q.c * s, oy + q.r * s, s, warnP(t), t);
			hero(c, centre);
		}
	},
	{
		title: 'Печать: заперта',
		note: 'Тёмная плита и целая печать, светлые линии и красное кольцо. Временная стена, вреда не наносит.',
		at: mid(sealTiles),
		tiles: 8,
		paint: (c, t) => {
			for (const q of sealTiles) sealLocked(c, ox + q.c * s, oy + q.r * s, s, t);
			hero(c, centre);
		}
	},
	{
		title: 'Пустота: клетка заперта',
		note: 'Железный затвор, чтобы не путать с печатью: оставленная боссом клетка.',
		at: mid(blockTiles),
		tiles: 8,
		paint: (c, t) => {
			for (const q of blockTiles) block(c, ox + q.c * s, oy + q.r * s, s, t);
			hero(c, run[1]);
		}
	},
	{
		title: 'Смола: замедление',
		note: 'Чёрная глянцевая смола с лопающимися пузырями. Ничего не горит: это не урон.',
		at: mid(tarTiles),
		tiles: 9,
		paint: (c, t) => {
			tar(c, tarTiles, ox, oy, s, t);
			hero(c, tarTiles[2] ?? run[0]);
		}
	}
];

const state = { gray: false, zoom: true };
const $ = <E extends HTMLElement>(id: string) => document.getElementById(id) as E;
const grid = $('grid');
const cells: Array<{ cv: HTMLCanvasElement; panel: Panel }> = [];
for (const panel of PANELS) {
	const fig = document.createElement('figure');
	const cv = document.createElement('canvas');
	cv.width = 360;
	cv.height = 270;
	const cap = document.createElement('figcaption');
	const b = document.createElement('b');
	b.textContent = panel.title;
	const span = document.createElement('span');
	span.textContent = panel.note;
	cap.append(b, span);
	fig.append(cv, cap);
	grid.append(fig);
	cells.push({ cv, panel });
}
const overview = $<HTMLCanvasElement>('overview');
overview.width = W * D;
overview.height = H * D;

function paintCell(cell: (typeof cells)[number], t: number): void {
	const q = px(cell.panel.at);
	const w = (state.zoom ? cell.panel.tiles : cell.panel.tiles * 1.7) * s;
	const h = (w * 270) / 360;
	const ctx = cell.cv.getContext('2d') as CanvasRenderingContext2D;
	const k = cell.cv.width / (w * D);
	ctx.setTransform(k * D, 0, 0, k * D, -(q.x - w / 2) * k * D, -(q.y - h / 2) * k * D);
	ctx.drawImage(base, 0, 0, W, H);
	cell.panel.paint(ctx, t);
}

function paintOverview(t: number): void {
	const ctx = overview.getContext('2d') as CanvasRenderingContext2D;
	ctx.setTransform(D, 0, 0, D, 0, 0);
	ctx.drawImage(base, 0, 0, W, H);
	lane(ctx, run, ox, oy, s, false, warnP(t), t);
	lane(ctx, crossTiles, ox, oy, s, true, liveK(t), t);
	eruption(ctx, discTiles, eruptAt, ox, oy, s, false, warnP(t), t);
	for (const q of sealTiles.slice(0, 2)) sealWarn(ctx, ox + q.c * s, oy + q.r * s, s, warnP(t), t);
	for (const q of sealTiles.slice(2)) sealLocked(ctx, ox + q.c * s, oy + q.r * s, s, t);
	for (const q of blockTiles) block(ctx, ox + q.c * s, oy + q.r * s, s, t);
	tar(ctx, tarTiles, ox, oy, s, t);
	bossDot(ctx, crossAt);
	hero(ctx, centre);
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
	for (const c of cells) paintCell(c, t);
	paintOverview(t);
	requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
