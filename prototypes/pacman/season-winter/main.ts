// Зимняя полировка: кандидат против текущего вида, из игровых исходников на реальном зимнем
// лабиринте (level 3, seed 0 — тот, что рисует игра). Три одинаковых региона крупно, рядом
// в каждом ряду: СЕЙЧАС | КАНДИДАТ. Стены, коридор (с едой в одних местах), убежище.
import { seasonForLevel } from '../../../src/games/pacman/logic/level/SeasonCatalog';
import type { MeadowTheme } from '../../../src/games/pacman/render/seasons/meadow/MeadowTheme';
import { bakeMeadow, LAIR, MEADOW_TILE } from '../../../src/games/pacman/render/seasons/meadow/MeadowBake';
import { winterTheme } from '../../../src/games/pacman/render/seasons/winter/winterTheme';
import {
	bauble,
	snowman,
	winterPellet
} from '../../../src/games/pacman/render/seasons/meadow/seasonFood';

const $ = <E extends HTMLElement>(id: string) => document.getElementById(id) as E;
const view = $<HTMLCanvasElement>('view');
const ctx = view.getContext('2d') as CanvasRenderingContext2D;
const D = Math.min(window.devicePixelRatio || 1, 2);

const T = MEADOW_TILE;
const { grid } = seasonForLevel(3, 0);
const R = grid.length;
const C = grid[0].length;

/** The look of today: the winter palette on the shared painters, the snowman energizer. */
const currentTheme: MeadowTheme = {
	...winterTheme,
	bake: {
		...winterTheme.bake,
		wall: { ...winterTheme.bake.wall, paint: undefined },
		floor: { ...winterTheme.bake.floor, paint: undefined },
		lair: { base: '#2f3846', tiles: ['#56637a', '#515e73', '#5b6880'] }
	},
	live: {
		...winterTheme.live,
		energizer: { ...winterTheme.live.energizer, texture: snowman }
	}
};

// The bake: the maze with a margin of meadow (the stream below, the landmark nearby).
const X0 = -2 * T;
const Y0 = -2 * T;
const W = (C + 4) * T;
const H = (R + 9) * T;
const RS = 2;
const cur = bakeMeadow(grid, currentTheme.bake, X0, Y0, W, H, RS);
const cand = bakeMeadow(grid, winterTheme.bake, X0, Y0, W, H, RS);

// Regions (world units): a wall corner with corridor below, a straight corridor run,
// the lair. Same regions for both columns, magnified — the rows compare one thing each.
function findCorner(): { r: number; c: number } {
	for (let r = 1; r < R - 1; r++) {
		for (let c = 1; c < C - 1; c++) {
			if (
				grid[r][c] === 'WL' &&
				grid[r - 1][c] !== 'WL' &&
				grid[r][c - 1] !== 'WL' &&
				grid[r + 1][c] !== 'WL' &&
				grid[r][c + 1] === 'WL'
			) {
				return { r, c };
			}
		}
	}
	return { r: 1, c: 1 };
}
function findCorridor(): { r: number; c: number } {
	for (let r = 1; r < R; r++) {
		for (let c = 2; c < C - 10; c++) {
			let ok = grid[r - 1][c] === 'WL';
			for (let i = 0; i < 10 && ok; i++) {
				const t = grid[r][c + i];
				ok = t !== 'WL' && t !== 'ES';
			}
			if (ok) {
				return { r, c };
			}
		}
	}
	return { r: 1, c: 2 };
}
const corner = findCorner();
const corridor = findCorridor();

interface Region {
	readonly name: string;
	readonly rx: number;
	readonly ry: number;
	readonly rw: number;
	readonly rh: number;
	readonly food?: boolean;
}
const lairBox = { r0: R, c0: C, r1: 0, c1: 0 };
for (let r = 0; r < R; r++) {
	for (let c = 0; c < C; c++) {
		if (LAIR.has(grid[r][c])) {
			lairBox.r0 = Math.min(lairBox.r0, r);
			lairBox.c0 = Math.min(lairBox.c0, c);
			lairBox.r1 = Math.max(lairBox.r1, r);
			lairBox.c1 = Math.max(lairBox.c1, c);
		}
	}
}
const regions: Region[] = [
	{ name: 'СТЕНЫ', rx: (corner.c - 3) * T, ry: (corner.r - 2) * T, rw: 10 * T, rh: 7 * T },
	{
		name: 'КОРИДОР + ЕДА',
		rx: (corridor.c - 1) * T,
		ry: (corridor.r - 1.4) * T,
		rw: 11 * T,
		rh: 3.4 * T,
		food: true
	},
	{
		name: 'УБЕЖИЩЕ',
		rx: (lairBox.c0 - 2) * T,
		ry: (lairBox.r0 - 1.6) * T,
		rw: (lairBox.c1 - lairBox.c0 + 5) * T,
		rh: (lairBox.r1 - lairBox.r0 + 4.2) * T
	}
];

const boards = [
	{ cv: cur, name: 'СЕЙЧАС', en: snowman, enSize: 26 },
	{ cv: cand, name: 'КАНДИДАТ', en: bauble, enSize: winterTheme.live.energizer.size }
];

let vw = 0;
let vh = 0;
function layout(): void {
	vw = window.innerWidth;
	vh = window.innerHeight;
	view.width = Math.round(vw * D);
	view.height = Math.round(vh * D);
	view.style.width = `${vw}px`;
	view.style.height = `${vh}px`;
}

function label(text: string, x: number, y: number, align: CanvasTextAlign = 'center'): void {
	ctx.fillStyle = 'rgba(220,232,248,.85)';
	ctx.font = '700 12px "Courier New", monospace';
	ctx.textAlign = align;
	ctx.fillText(text, x, y);
}

/** A row of pellets with one energizer across the corridor region, same cells both columns. */
function drawRegionFood(
	rg: Region,
	ix: number,
	iy: number,
	z: number,
	en: () => HTMLCanvasElement,
	enSize: number
): void {
	const pellet = winterPellet();
	const enIm = en();
	ctx.imageSmoothingEnabled = false;
	for (let i = 0; i < 9; i++) {
		const cc = corridor.c + i;
		if (grid[corridor.r][cc] === 'WL' || grid[corridor.r][cc] === 'ES') {
			continue;
		}
		const wx = (cc + 0.5) * T;
		const wy = (corridor.r + 0.5) * T;
		const sx = ix + (wx - rg.rx) * z;
		const sy = iy + (wy - rg.ry) * z;
		if (i === 4) {
			const s = enSize * z;
			ctx.drawImage(enIm, sx - s / 2, sy - s / 2, s, s);
		} else {
			const s = 10 * z;
			ctx.drawImage(pellet, sx - s / 2, sy - s / 2, s, s);
		}
	}
}

function frame(): void {
	ctx.setTransform(D, 0, 0, D, 0, 0);
	ctx.globalAlpha = 1;
	ctx.globalCompositeOperation = 'source-over';
	ctx.fillStyle = '#0b0e14';
	ctx.fillRect(0, 0, vw, vh);

	const titleH = 24;
	const headH = 20;
	const foodH = 92;
	const rowH = (vh - titleH - headH - foodH - 8) / regions.length;
	const colW = (vw - 48) / 2;

	label('ЗИМА · ПОЛИРОВКА: снег на кромках и шапках · мягкая тень · цельный пол с боем · убежище в тон · энерджайзер-шар', vw / 2, 16);

	boards.forEach((bd, j) => {
		label(bd.name, 16 + j * (colW + 16) + (colW - 16) / 2, titleH + headH - 4);
	});

	regions.forEach((rg, i) => {
		const y0 = titleH + headH + i * rowH;
		label(rg.name, 12, y0 + 14, 'left');
		boards.forEach((bd, j) => {
			const x = 16 + j * (colW + 16);
			const z = Math.min((colW - 16) / rg.rw, (rowH - 26) / rg.rh);
			const iw = rg.rw * z;
			const ih = rg.rh * z;
			const ix = x + (colW - 16 - iw) / 2;
			const iy = y0 + 20 + (rowH - 26 - ih) / 2;
			ctx.imageSmoothingEnabled = false;
			ctx.drawImage(bd.cv, (rg.rx - X0) * RS, (rg.ry - Y0) * RS, rg.rw * RS, rg.rh * RS, ix, iy, iw, ih);
			ctx.strokeStyle = 'rgba(140,170,210,.4)';
			ctx.lineWidth = 1;
			ctx.strokeRect(ix - 0.5, iy - 0.5, iw + 1, ih + 1);
			if (rg.food) {
				drawRegionFood(rg, ix, iy, z, bd.en, bd.enSize);
			}
		});
	});

	// food strip: pellet / snowman / bauble at game scale and enlarged, on the floor colour
	const ref = Math.min(colW - 16, 11 * T) / (11 * T);
	const stripY = vh - foodH + 26;
	label('ЕДА: КАПЛЯ · СНЕГОВИК (сейчас) · ШАР (кандидат) — слева масштаб игры, справа ×3', vw / 2, stripY - 16);
	const items: Array<{ im: () => HTMLCanvasElement; u: number; name: string }> = [
		{ im: winterPellet, u: 10, name: 'капля' },
		{ im: snowman, u: 26, name: 'снеговик' },
		{ im: bauble, u: winterTheme.live.energizer.size, name: 'шар' }
	];
	const cellW = Math.min(140, (vw - 80) / 6);
	items.forEach((it, i) => {
		for (const [j, mul] of [1, 3].entries()) {
			const x = vw / 2 + (i - 1) * cellW * 2 + (j ? cellW * 0.6 : -cellW * 0.4);
			const s = (it.u / T) * ref * mul;
			ctx.fillStyle = '#525d6e';
			ctx.fillRect(x - cellW * 0.32, stripY - 22, cellW * 0.64, 44);
			ctx.imageSmoothingEnabled = mul === 1;
			ctx.drawImage(it.im(), x - s / 2, stripY - s / 2, s, s);
			if (mul === 3) {
				label(it.name, x, stripY + 32);
			}
		}
	});
	ctx.imageSmoothingEnabled = true;
	requestAnimationFrame(frame);
}

window.addEventListener('resize', layout);
layout();
requestAnimationFrame(frame);
