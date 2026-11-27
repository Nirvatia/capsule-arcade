// The Net's world, baked once: a server seen from above. Dark blocks (the maze's walls) edged by a neon
// rim, one colour to a building; the corridors are lit data roads a shade lighter than the ground with a
// faint tile grid (a sense of speed); the blocks sit on the road (a shadow down and right); the core's
// plaza. Few details, bold shapes, everything self-lit so the whole maze reads at once. Like the hell's
// scene it is painted in scene units (a tile is 32); everything that moves is drawn by `NetView`.
import type { GridMatrix } from '../../config/gridConfig';
import {
	blur,
	context,
	fbm,
	makeCanvas,
	moved,
	threshold,
	tint,
	without
} from '../doom/fleshNoise';

export const NET_TILE = 32;
/** Tiles of ground round the maze. */
export const NET_MARGIN = 12;

const T = NET_TILE;
const M = NET_MARGIN;

/** The neon of the blocks, one to a building. */
export const NEON = ['#2fe0ff', '#ff3fd8', '#9b6bff', '#42ffa8'] as const;
const FLOOR = '#161c3b';
const BLOCK = '#0a0d21';

type Cv = HTMLCanvasElement;
type Ctx = CanvasRenderingContext2D;

export interface NetBake {
	/** The whole scene, `(cols + 2 margin) x (rows + 2 margin)` tiles. */
	readonly scene: Cv;
	readonly cols: number;
	readonly rows: number;
}

const isWall = (S: GridMatrix, c: number, r: number): boolean => S[r]?.[c] === 'WL';
const isOutside = (S: GridMatrix, c: number, r: number): boolean => {
	const t = S[r]?.[c];
	return t === undefined || t === 'ES';
};
const isLair = (S: GridMatrix, c: number, r: number): boolean =>
	['LT', 'LE', 'BY', 'PY', 'IY', 'CE'].includes(S[r]?.[c] ?? '');

export function bakeNet(S: GridMatrix): NetBake {
	const rows = S.length;
	const cols = S[0].length;
	const W = (cols + 2 * M) * T;
	const H = (rows + 2 * M) * T;
	const scene = makeCanvas(W, H);
	const g = context(scene);
	const x0 = (c: number): number => (c + M) * T;
	const y0 = (r: number): number => (r + M) * T;

	const wallM = makeCanvas(W, H);
	{
		const m = context(wallM);
		m.fillStyle = '#fff';
		for (let r = 0; r < rows; r += 1) {
			for (let c = 0; c < cols; c += 1) {
				if (isWall(S, c, r)) {
					m.fillRect(x0(c), y0(r), T, T);
				}
			}
		}
	}
	paintGround(g, W, H);
	paintRoads(g, S, x0, y0, cols, rows);
	// the blocks' shadow on the road: long down and right, a tight crease at the foot
	const wallSoft = threshold(blur(makeCopy(wallM), 3, true), 5);
	for (const [dx, dy, steps, alpha] of [
		[6, 8, 3, 0.6],
		[0, 0, 2, 0.5]
	] as const) {
		g.globalAlpha = alpha;
		g.drawImage(
			without(blur(moved(tint(wallSoft, '#02030a'), dx, dy), steps, true), wallSoft),
			0,
			0
		);
		g.globalAlpha = 1;
	}
	paintBlocks(g, S, x0, y0, cols, rows);
	return { scene, cols, rows };
}

function makeCopy(c: Cv): Cv {
	const d = makeCanvas(c.width, c.height);
	context(d).drawImage(c, 0, 0);
	return d;
}

/** The ground of the whole scene: deep blue-violet with a faint city grid. */
function paintGround(g: Ctx, W: number, H: number): void {
	for (let y = 0; y < H; y += 16) {
		for (let x = 0; x < W; x += 16) {
			const n = fbm(x / 160, y / 160);
			g.fillStyle = `rgb(${Math.round(6 + n * 10)},${Math.round(8 + n * 10)},${Math.round(22 + n * 22)})`;
			g.fillRect(x, y, 16, 16);
		}
	}
	g.strokeStyle = 'rgba(70,110,255,.07)';
	g.lineWidth = 1;
	g.beginPath();
	for (let x = 0; x <= W; x += 64) {
		g.moveTo(x + 0.5, 0);
		g.lineTo(x + 0.5, H);
	}
	for (let y = 0; y <= H; y += 64) {
		g.moveTo(0, y + 0.5);
		g.lineTo(W, y + 0.5);
	}
	g.stroke();
}

/** The data roads: a lit floor, a faint tile grid, a darker plaza for the core, a portal bar at a tunnel. */
function paintRoads(
	g: Ctx,
	S: GridMatrix,
	x0: (c: number) => number,
	y0: (r: number) => number,
	cols: number,
	rows: number
): void {
	for (let r = 0; r < rows; r += 1) {
		for (let c = 0; c < cols; c += 1) {
			if (isWall(S, c, r) || isOutside(S, c, r)) {
				continue;
			}
			const X = x0(c);
			const Y = y0(r);
			g.fillStyle = isLair(S, c, r) ? '#0f1431' : FLOOR;
			g.fillRect(X, Y, T, T);
			g.strokeStyle = 'rgba(90,130,255,.1)';
			g.lineWidth = 1;
			g.strokeRect(X + 0.5, Y + 0.5, T - 1, T - 1);
			if (S[r][c].startsWith('0')) {
				g.fillStyle = '#2fe0ff';
				g.fillRect(c < cols / 2 ? X : X + T - 4, Y + 2, 4, T - 4);
			}
		}
	}
}

/** The blocks: a dark body, a neon rim on every open side (glowing), a faint inner line. One neon to a building. */
function paintBlocks(
	g: Ctx,
	S: GridMatrix,
	x0: (c: number) => number,
	y0: (r: number) => number,
	cols: number,
	rows: number
): void {
	const island = new Map<string, number>();
	let count = 0;
	for (let r = 0; r < rows; r += 1) {
		for (let c = 0; c < cols; c += 1) {
			if (!isWall(S, c, r) || island.has(`${c},${r}`)) {
				continue;
			}
			const q: Array<[number, number]> = [[c, r]];
			island.set(`${c},${r}`, count);
			for (let i = 0; i < q.length; i += 1) {
				for (const [dc, dr] of [
					[1, 0],
					[-1, 0],
					[0, 1],
					[0, -1]
				]) {
					const nc = q[i][0] + dc;
					const nr = q[i][1] + dr;
					if (isWall(S, nc, nr) && !island.has(`${nc},${nr}`)) {
						island.set(`${nc},${nr}`, count);
						q.push([nc, nr]);
					}
				}
			}
			count += 1;
		}
	}
	for (let r = 0; r < rows; r += 1) {
		for (let c = 0; c < cols; c += 1) {
			if (isWall(S, c, r)) {
				g.fillStyle = BLOCK;
				g.fillRect(x0(c) - 0.5, y0(r) - 0.5, T + 1, T + 1);
			}
		}
	}
	const sides: ReadonlyArray<readonly [number, number, number, number, number, number]> = [
		[0, -1, 0, 0, T, 0],
		[1, 0, T, 0, T, T],
		[0, 1, 0, T, T, T],
		[-1, 0, 0, 0, 0, T]
	];
	g.lineCap = 'square';
	for (const pass of [0, 1, 2] as const) {
		for (let r = 0; r < rows; r += 1) {
			for (let c = 0; c < cols; c += 1) {
				if (!isWall(S, c, r)) {
					continue;
				}
				const col = NEON[(island.get(`${c},${r}`) ?? 0) % NEON.length];
				for (const [dc, dr, ax, ay, bx, by] of sides) {
					if (isWall(S, c + dc, r + dr)) {
						continue;
					}
					const X = x0(c);
					const Y = y0(r);
					// pull the line 2 px into the block (the corridor keeps its width)
					const ix = -dc * 2;
					const iy = -dr * 2;
					g.beginPath();
					g.moveTo(X + ax + ix, Y + ay + iy);
					g.lineTo(X + bx + ix, Y + by + iy);
					if (pass === 0) {
						g.shadowColor = col;
						g.shadowBlur = 14;
						g.strokeStyle = col;
						g.globalAlpha = 0.55;
						g.lineWidth = 4;
					} else if (pass === 1) {
						g.shadowBlur = 0;
						g.globalAlpha = 1;
						g.strokeStyle = col;
						g.lineWidth = 2.6;
					} else {
						g.globalAlpha = 0.9;
						g.strokeStyle = '#ffffff';
						g.lineWidth = 0.9;
					}
					g.stroke();
				}
			}
		}
	}
	g.shadowBlur = 0;
	g.globalAlpha = 1;
	// a faint inner outline of each block: depth, not decoration
	g.strokeStyle = 'rgba(120,150,255,.12)';
	g.lineWidth = 1;
	for (let r = 0; r < rows; r += 1) {
		for (let c = 0; c < cols; c += 1) {
			if (!isWall(S, c, r)) {
				continue;
			}
			for (const [dc, dr, ax, ay, bx, by] of sides) {
				if (isWall(S, c + dc, r + dr)) {
					continue;
				}
				g.beginPath();
				g.moveTo(x0(c) + ax - dc * 8, y0(r) + ay - dr * 8);
				g.lineTo(x0(c) + bx - dc * 8, y0(r) + by - dr * 8);
				g.stroke();
			}
		}
	}
}
