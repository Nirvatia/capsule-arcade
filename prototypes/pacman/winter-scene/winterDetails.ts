import { seasonForLevel } from '../../../src/games/pacman/logic/level/SeasonCatalog';
import { bakeMeadow, LAIR, T } from '../../../src/games/pacman/render/seasons/meadow/MeadowBake';
import { tunnelRowOf, worldDecor } from '../../../src/games/pacman/render/common/worldDecor';
import { bauble, winterPellet } from '../../../src/games/pacman/render/seasons/meadow/seasonFood';
import { drawWinterFestiveLights, WINTER_LANDMARK_EX } from './winterDecor';
import { winterTheme } from '../../../src/games/pacman/render/seasons/winter/winterTheme';
import { winterSceneBauble } from './winterFood';
import { winterSceneTheme } from './winterSceneTheme';

const { grid } = seasonForLevel(3, 0);
const R = grid.length;
const C = grid[0].length;
const X0 = -2 * T;
const Y0 = -2 * T;
const W = (C + 4) * T;
const H = (R + 9) * T;
const RS = 2;

interface Region {
	readonly name: string;
	readonly rx: number;
	readonly ry: number;
	readonly rw: number;
	readonly rh: number;
	readonly food?: boolean;
}

function findCorner(): { r: number; c: number } {
	for (let r = 1; r < R - 1; r++) {
		for (let c = 1; c < C - 1; c++) {
			if (grid[r][c] === 'WL' && grid[r - 1][c] !== 'WL' && grid[r][c - 1] !== 'WL' && grid[r + 1][c] !== 'WL' && grid[r][c + 1] === 'WL') {
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
			if (ok) return { r, c };
		}
	}
	return { r: 1, c: 2 };
}

const corner = findCorner();
const corridor = findCorridor();
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
	{ name: 'СТЕНЫ · НЕПРЕРЫВНЫЙ СНЕГ', rx: (corner.c - 3) * T, ry: (corner.r - 2) * T, rw: 10 * T, rh: 7 * T },
	{ name: 'КОРИДОР · ЕДА · ЭНЕРДЖАЙЗЕР', rx: (corridor.c - 1) * T, ry: (corridor.r - 1.4) * T, rw: 11 * T, rh: 3.4 * T, food: true },
	{
		name: 'УБЕЖИЩЕ · ПЛАВНЫЙ ПЕРЕХОД',
		rx: (lairBox.c0 - 2) * T,
		ry: (lairBox.r0 - 1.6) * T,
		rw: (lairBox.c1 - lairBox.c0 + 5) * T,
		rh: (lairBox.r1 - lairBox.r0 + 4.2) * T
	}
];

let current: HTMLCanvasElement | null = null;
let candidate: HTMLCanvasElement | null = null;

function ensureBakes(): void {
	current ??= bakeMeadow(grid, winterTheme.bake, X0, Y0, W, H, RS);
	candidate ??= bakeMeadow(grid, winterSceneTheme.bake, X0, Y0, W, H, RS);
}

export function resetWinterDetails(): void {
	current = null;
	candidate = null;
	environmentCurrent = null;
	environmentCandidate = null;
}

function label(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, align: CanvasTextAlign = 'center', size = 11): void {
	ctx.fillStyle = 'rgba(220,232,248,.88)';
	ctx.font = `700 ${size}px "Courier New", monospace`;
	ctx.textAlign = align;
	ctx.fillText(text, x, y);
}

function drawFood(ctx: CanvasRenderingContext2D, rg: Region, ix: number, iy: number, z: number, energizer: () => HTMLCanvasElement): void {
	const pellet = winterPellet();
	const en = energizer();
	ctx.imageSmoothingEnabled = false;
	for (let i = 0; i < 9; i++) {
		const cc = corridor.c + i;
		if (grid[corridor.r][cc] === 'WL' || grid[corridor.r][cc] === 'ES') continue;
		const wx = (cc + 0.5) * T;
		const wy = (corridor.r + 0.5) * T;
		const sx = ix + (wx - rg.rx) * z;
		const sy = iy + (wy - rg.ry) * z;
		const size = (i === 4 ? 19.5 : 10) * z;
		ctx.drawImage(i === 4 ? en : pellet, sx - size / 2, sy - size / 2, size, size);
	}
}

export function drawWinterDetails(ctx: CanvasRenderingContext2D, vw: number, vh: number): void {
	ensureBakes();
	const boards = [
		{ cv: current!, name: 'ТЕКУЩАЯ ЗИМА', en: bauble },
		{ cv: candidate!, name: 'КАНДИДАТ', en: winterSceneBauble }
	];
	ctx.fillStyle = '#0b0e14';
	ctx.fillRect(0, 0, vw, vh);
	const top = 112;
	const foodH = 84;
	const rowH = (vh - top - foodH - 12) / regions.length;
	const colW = (vw - 48) / 2;
	boards.forEach((board, j) => label(ctx, board.name, 16 + j * (colW + 16) + (colW - 16) / 2, top - 10));
	regions.forEach((rg, i) => {
		const y0 = top + i * rowH;
		label(ctx, rg.name, 12, y0 + 12, 'left', 10);
		boards.forEach((board, j) => {
			const x = 16 + j * (colW + 16);
			const z = Math.min((colW - 16) / rg.rw, (rowH - 24) / rg.rh);
			const iw = rg.rw * z;
			const ih = rg.rh * z;
			const ix = x + (colW - 16 - iw) / 2;
			const iy = y0 + 18 + (rowH - 24 - ih) / 2;
			ctx.imageSmoothingEnabled = false;
			ctx.drawImage(board.cv, (rg.rx - X0) * RS, (rg.ry - Y0) * RS, rg.rw * RS, rg.rh * RS, ix, iy, iw, ih);
			ctx.strokeStyle = 'rgba(140,170,210,.32)';
			ctx.lineWidth = 1;
			ctx.strokeRect(ix - 0.5, iy - 0.5, iw + 1, ih + 1);
			if (rg.food) drawFood(ctx, rg, ix, iy, z, board.en);
		});
	});
	const stripY = vh - foodH + 25;
	label(ctx, 'ЕДА: ЛЕДЯНАЯ КАПЛЯ · ТЕКУЩИЙ ШАР · КАНДИДАТ — ×1 И ×3', vw / 2, stripY - 13, 'center', 10);
	const items = [
		{ im: winterPellet, size: 10, name: 'капля' },
		{ im: bauble, size: 19.5, name: 'текущий' },
		{ im: winterSceneBauble, size: 19.5, name: 'кандидат' }
	];
	const cellW = Math.min(132, (vw - 64) / 6);
	items.forEach((item, i) => {
		for (const [j, mul] of [1, 3].entries()) {
			const x = vw / 2 + (i - 1) * cellW * 2 + (j ? cellW * 0.58 : -cellW * 0.42);
			const size = item.size * mul;
			ctx.fillStyle = '#525d6e';
			ctx.fillRect(x - cellW * 0.31, stripY - 20, cellW * 0.62, 42);
			ctx.imageSmoothingEnabled = mul === 1;
			ctx.drawImage(item.im(), x - size / 2, stripY - size / 2, size, size);
			if (mul === 3) label(ctx, item.name, x, stripY + 31, 'center', 9);
		}
	});
	ctx.imageSmoothingEnabled = true;
}

export function winterReadabilityArt(): { canvas: HTMLCanvasElement; lair: Region; corridor: Region } {
	ensureBakes();
	return {
		canvas: candidate!,
		lair: {
			name: '',
			rx: lairBox.c0 * T,
			ry: lairBox.r0 * T,
			rw: (lairBox.c1 - lairBox.c0 + 1) * T,
			rh: (lairBox.r1 - lairBox.r0 + 1) * T
		},
		corridor: {
			name: '',
			rx: corridor.c * T,
			ry: (corridor.r - 0.2) * T,
			rw: 4 * T,
			rh: 1.4 * T
		}
	};
}

export function cropWinterArt(
	ctx: CanvasRenderingContext2D,
	region: Region,
	dx: number,
	dy: number,
	dw: number,
	dh: number
): void {
	const { canvas } = winterReadabilityArt();
	ctx.drawImage(canvas, (region.rx - X0) * RS, (region.ry - Y0) * RS, region.rw * RS, region.rh * RS, dx, dy, dw, dh);
}


const EX0 = -11 * T;
const EY0 = -8 * T;
const EW = (C + 22) * T;
const EH = (R + 22) * T;
let environmentCurrent: HTMLCanvasElement | null = null;
let environmentCandidate: HTMLCanvasElement | null = null;

function environmentRegions(): Region[] {
	const decor = worldDecor(R, C, WINTER_LANDMARK_EX, tunnelRowOf(grid));
	const landmark = decor.find((o) => o.k === 'landmark' && o.x < 0)!;
	const cabin = decor.find((o) => o.k === 'cabin')!;
	const bridge = decor.find((o) => o.k === 'bridge')!;
	return [
		{ name: 'ЁЛКА · СНЕГОВИК', rx: landmark.x - 3.4 * T, ry: landmark.y - 3.1 * T, rw: 5.8 * T, rh: 5.4 * T },
		{ name: 'ДОМИК · ОКНА · ГИРЛЯНДА', rx: cabin.x - 4.3 * T, ry: cabin.y - 3.3 * T, rw: 8.6 * T, rh: 6.6 * T },
		{ name: 'МОСТИК · ГИРЛЯНДА', rx: bridge.x - 3 * T, ry: bridge.y - 3 * T, rw: 6 * T, rh: 6 * T }
	];
}

function ensureEnvironmentBakes(): void {
	environmentCurrent ??= bakeMeadow(grid, winterTheme.bake, EX0, EY0, EW, EH, RS);
	environmentCandidate ??= bakeMeadow(grid, winterSceneTheme.bake, EX0, EY0, EW, EH, RS);
}

export function drawWinterEnvironmentDetails(
	ctx: CanvasRenderingContext2D,
	vw: number,
	vh: number,
	time: number,
	night: number
): void {
	ensureEnvironmentBakes();
	const boards = [
		{ cv: environmentCurrent!, name: 'ТЕКУЩАЯ ЗИМА', candidate: false },
		{ cv: environmentCandidate!, name: 'КАНДИДАТ', candidate: true }
	];
	ctx.fillStyle = '#0b0e14';
	ctx.fillRect(0, 0, vw, vh);
	const top = 112;
	const rowH = (vh - top - 18) / 3;
	const colW = (vw - 48) / 2;
	boards.forEach((board, j) => label(ctx, board.name, 16 + j * (colW + 16) + (colW - 16) / 2, top - 10));
	environmentRegions().forEach((rg, i) => {
		const y0 = top + i * rowH;
		label(ctx, rg.name, 12, y0 + 12, 'left', 10);
		boards.forEach((board, j) => {
			const x = 16 + j * (colW + 16);
			const z = Math.min((colW - 16) / rg.rw, (rowH - 24) / rg.rh);
			const iw = rg.rw * z;
			const ih = rg.rh * z;
			const ix = x + (colW - 16 - iw) / 2;
			const iy = y0 + 18 + (rowH - 24 - ih) / 2;
			ctx.save();
			ctx.beginPath();
			ctx.rect(ix, iy, iw, ih);
			ctx.clip();
			ctx.imageSmoothingEnabled = false;
			ctx.drawImage(board.cv, (rg.rx - EX0) * RS, (rg.ry - EY0) * RS, rg.rw * RS, rg.rh * RS, ix, iy, iw, ih);
			if (night > 0) {
				ctx.fillStyle = `rgba(54,70,116,${night * 0.32})`;
				ctx.fillRect(ix, iy, iw, ih);
			}
			if (board.candidate) {
				ctx.imageSmoothingEnabled = true;
				drawWinterFestiveLights(ctx, grid, {
					tileSize: T * z,
					offsetX: ix - rg.rx * z,
					offsetY: iy - rg.ry * z
				}, time, night, 1);
			}
			ctx.restore();
			ctx.strokeStyle = 'rgba(140,170,210,.32)';
			ctx.lineWidth = 1;
			ctx.strokeRect(ix - 0.5, iy - 0.5, iw + 1, ih + 1);
		});
	});
	ctx.imageSmoothingEnabled = true;
}
