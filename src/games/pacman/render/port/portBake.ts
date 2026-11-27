// The Port's world, baked once: a container terminal at night seen from above. The maze is the yard:
// wet concrete slabs with joints, puddles, oil and painted bay lines (the corridors), long rows of
// containers (the walls: corrugated roofs, corner castings, a company stripe, rust, one colour each)
// and a control building with a helipad in the middle (the lair). Round it a whole scene like the
// seasons have: the sea with a docked ship and two gantry cranes along the quay, rails, loose stacks,
// warehouses, trucks and floodlight poles with their pools of light. One light, from the top left; the
// shadows fall down and right. Painted in scene units (a tile is 32). What moves is drawn by `PortView`.
import type { GridMatrix } from '../../config/gridConfig';
import { context, fbm, makeCanvas, mixHex, rng } from '../doom/fleshNoise';
import type { Rng } from '../doom/fleshNoise';

export const PORT_TILE = 32;
/** Tiles of scene round the maze: wide at the sides (a wide screen), deep above for the sea. */
export const PORT_MARGIN_X = 20;
export const PORT_MARGIN_Y = 12;

const T = PORT_TILE;
const MX = PORT_MARGIN_X;
const MY = PORT_MARGIN_Y;

type Cv = HTMLCanvasElement;
type Ctx = CanvasRenderingContext2D;

/** Container paint: rust red, teal, mustard, blue, orange, green, grey, white. */
const PAINT = [
	'#b8432f',
	'#2b8c8c',
	'#d3a031',
	'#3b6cb5',
	'#d9692f',
	'#4b9456',
	'#8a939a',
	'#d6dadc'
] as const;
const NEON = ['#ff3fd8', '#34e7ff', '#ffb02e'] as const;

export interface PortBake {
	/** The whole scene, `(cols + 2 margin) x (rows + 2 margin)` tiles. */
	readonly scene: Cv;
	readonly cols: number;
	readonly rows: number;
	/** The control building's rectangle, in tiles (col, row, cols, rows), for the live radar. */
	readonly building: {
		readonly c: number;
		readonly r: number;
		readonly w: number;
		readonly h: number;
	};
}

const isWall = (S: GridMatrix, c: number, r: number): boolean => S[r]?.[c] === 'WL';
const LAIR = new Set(['LT', 'LE', 'BY', 'PY', 'IY', 'CE']);

export function bakePort(S: GridMatrix): PortBake {
	const rows = S.length;
	const cols = S[0].length;
	const W = (cols + 2 * MX) * T;
	const H = (rows + 2 * MY) * T;
	const scene = makeCanvas(W, H);
	const g = context(scene);
	const rw = rng(77);
	const X = (c: number): number => (c + MX) * T;
	const Y = (r: number): number => (r + MY) * T;

	// the building: the lair's box, widened by its walls on three sides
	let c0 = cols;
	let c1 = 0;
	let r0 = rows;
	let r1 = 0;
	for (let r = 0; r < rows; r += 1) {
		for (let c = 0; c < cols; c += 1) {
			if (LAIR.has(S[r][c])) {
				c0 = Math.min(c0, c);
				c1 = Math.max(c1, c);
				r0 = Math.min(r0, r);
				r1 = Math.max(r1, r);
			}
		}
	}
	const building = { c: c0 - 1, r: r0, w: c1 - c0 + 3, h: r1 - r0 + 2 };

	paintApron(g, W, H, rw);
	paintSea(g, S, X, Y, W, cols, rw);
	paintMargins(g, X, Y, cols, rows, rw);
	paintYard(g, S, X, Y, cols, rows, rw);
	paintContainers(g, S, X, Y, cols, rows, building, rw);
	paintBuilding(g, X(building.c), Y(building.r), building.w * T, building.h * T, rw);
	paintPoles(g, X, Y, rw);
	return { scene, cols, rows, building };
}

// ---------------------------------------------------------------------------------------------
// ground, sea, margins

/** Dark blue-grey concrete over the whole scene, mottled and stained. */
function paintApron(g: Ctx, W: number, H: number, rw: Rng): void {
	for (let y = 0; y < H; y += 16) {
		for (let x = 0; x < W; x += 16) {
			const n = fbm(x / 120, y / 120);
			g.fillStyle = mixHex('#3b4350', '#58616e', Math.min(1, n * 1.1));
			g.fillRect(x, y, 16, 16);
		}
	}
	for (let i = 0; i < 160; i += 1) {
		const x = rw() * W;
		const y = rw() * H;
		g.fillStyle = `rgba(6,7,9,${0.1 + rw() * 0.12})`;
		g.beginPath();
		g.ellipse(x, y, 10 + rw() * 22, 6 + rw() * 12, rw() * 3, 0, 7);
		g.fill();
	}
}

/** The sea along the top, the quay wall with fenders, the docked ship and two gantry cranes. */
function paintSea(
	g: Ctx,
	S: GridMatrix,
	X: (c: number) => number,
	Y: (r: number) => number,
	W: number,
	cols: number,
	rw: Rng
): void {
	const quay = Y(-0.8);
	const grad = g.createLinearGradient(0, 0, 0, quay);
	grad.addColorStop(0, '#06161f');
	grad.addColorStop(1, '#13475a');
	g.fillStyle = grad;
	g.fillRect(0, 0, W, quay);
	// waves: long soft streaks
	for (let i = 0; i < 260; i += 1) {
		const x = rw() * W;
		const y = rw() * quay;
		g.strokeStyle = `rgba(150,220,235,${0.05 + rw() * 0.09})`;
		g.lineWidth = 1 + rw() * 1.6;
		g.beginPath();
		g.moveTo(x, y);
		g.bezierCurveTo(x + 14, y - 2, x + 30, y + 2, x + 40 + rw() * 40, y);
		g.stroke();
	}
	// the quay wall: a dark concrete edge, a hazard stripe, fenders, bollards, foam under it
	g.fillStyle = 'rgba(210,240,245,.22)';
	g.fillRect(0, quay - 5, W, 3);
	g.fillStyle = '#2a313b';
	g.fillRect(0, quay, W, 9);
	g.fillStyle = '#10151c';
	g.fillRect(0, quay + 9, W, 2);
	for (let x = 0; x < W; x += 24) {
		g.fillStyle = x % 48 === 0 ? '#f0c23a' : '#14181e';
		g.fillRect(x, quay + 2, 12, 4);
	}
	for (let x = 0; x < W; x += 3 * T) {
		g.fillStyle = '#0c1016';
		g.beginPath();
		g.ellipse(x + 20, quay - 2, 8, 5, 0, 0, 7);
		g.fill();
		bollard(g, x + 36, quay + 24);
	}
	paintShip(g, X(-9), Y(-5.9), (cols + 17) * T, 4.6 * T, rw);
	paintShip(g, X(cols + 12), Y(-5.4), 15 * T, 4.1 * T, rw);
	crane(g, X(-5.5), Y(-6.8), rw);
	crane(g, X(cols + 1.5), Y(-6.8), rw);
	// neon on the water: the ship's and the cranes' lights, smeared down
	for (const [x, col] of [
		[X(7), NEON[1]],
		[X(14), NEON[0]],
		[X(22), NEON[2]],
		[X(-2), NEON[1]],
		[X(27), NEON[0]]
	] as const) {
		const s = g.createLinearGradient(0, Y(-1.8), 0, quay);
		s.addColorStop(0, `${col}00`);
		s.addColorStop(1, `${col}66`);
		g.fillStyle = s;
		g.fillRect(x - 5, Y(-1.8), 10, quay - Y(-1.8));
	}
}

function bollard(g: Ctx, x: number, y: number): void {
	g.fillStyle = 'rgba(0,0,0,.4)';
	g.beginPath();
	g.ellipse(x + 2, y + 3, 7, 5, 0, 0, 7);
	g.fill();
	const r = g.createRadialGradient(x - 2, y - 2, 1, x, y, 7);
	r.addColorStop(0, '#9aa3ad');
	r.addColorStop(1, '#3b434d');
	g.fillStyle = r;
	g.beginPath();
	g.arc(x, y, 6, 0, 7);
	g.fill();
	g.strokeStyle = '#0b0e13';
	g.lineWidth = 1.4;
	g.stroke();
}

/** A cargo ship seen from above, bow to the left: hull, stacked deck cargo, the bridge and the funnel at the stern. */
function paintShip(g: Ctx, x: number, y: number, w: number, h: number, rw: Rng): void {
	g.save();
	g.shadowColor = 'rgba(0,0,0,.55)';
	g.shadowBlur = 16;
	g.shadowOffsetX = 8;
	g.shadowOffsetY = 12;
	const hull = (): void => {
		g.beginPath();
		g.moveTo(x, y + h * 0.5);
		g.bezierCurveTo(x + w * 0.05, y + h * 0.06, x + w * 0.12, y, x + w * 0.2, y);
		g.lineTo(x + w * 0.93, y);
		g.quadraticCurveTo(x + w, y, x + w, y + h * 0.3);
		g.lineTo(x + w, y + h * 0.7);
		g.quadraticCurveTo(x + w, y + h, x + w * 0.93, y + h);
		g.lineTo(x + w * 0.2, y + h);
		g.bezierCurveTo(x + w * 0.12, y + h, x + w * 0.05, y + h * 0.94, x, y + h * 0.5);
		g.closePath();
	};
	const hg = g.createLinearGradient(0, y, 0, y + h);
	hg.addColorStop(0, '#26303d');
	hg.addColorStop(0.5, '#1b232e');
	hg.addColorStop(1, '#10161e');
	g.fillStyle = hg;
	hull();
	g.fill();
	g.restore();
	g.strokeStyle = '#05080c';
	g.lineWidth = 3;
	hull();
	g.stroke();
	// the red waterline band and a rim light along the top edge
	g.strokeStyle = 'rgba(190,60,50,.7)';
	g.lineWidth = 3;
	g.beginPath();
	g.moveTo(x + w * 0.08, y + h - 4);
	g.lineTo(x + w * 0.93, y + h - 4);
	g.stroke();
	g.strokeStyle = 'rgba(190,215,235,.3)';
	g.lineWidth = 2;
	g.beginPath();
	g.moveTo(x + w * 0.18, y + 3);
	g.lineTo(x + w * 0.92, y + 3);
	g.stroke();
	// the deck cargo: stacks of containers in bays
	const deckY = y + h * 0.16;
	const deckH = h * 0.68;
	for (let bx = x + w * 0.2; bx < x + w * 0.74; bx += 62) {
		for (let by = 0; by < 3; by += 1) {
			const len = 58;
			const ch = deckH / 3 - 4;
			const col = PAINT[Math.floor(rw() * PAINT.length)];
			shipBox(g, bx, deckY + by * (ch + 4) + 2, len, ch, col);
		}
	}
	// the bow: winches and a mast with a light
	g.fillStyle = '#39424d';
	g.fillRect(x + w * 0.09, y + h * 0.36, 26, h * 0.28);
	g.fillStyle = '#c9d2da';
	g.beginPath();
	g.arc(x + w * 0.1, y + h * 0.5, 7, 0, 7);
	g.fill();
	// the stern: the bridge with its lit windows, the funnel, the radar
	const sx = x + w * 0.78;
	g.shadowColor = 'rgba(0,0,0,.5)';
	g.shadowBlur = 8;
	g.shadowOffsetX = 5;
	g.shadowOffsetY = 7;
	g.fillStyle = '#d7dde2';
	g.fillRect(sx, y + h * 0.18, w * 0.13, h * 0.64);
	g.shadowBlur = 0;
	g.shadowOffsetX = 0;
	g.shadowOffsetY = 0;
	g.strokeStyle = '#0b0f14';
	g.lineWidth = 2;
	g.strokeRect(sx, y + h * 0.18, w * 0.13, h * 0.64);
	g.fillStyle = '#9fd8e6';
	for (let i = 0; i < 7; i += 1) {
		g.fillRect(sx + 6 + i * 12, y + h * 0.2, 8, 5);
	}
	g.fillStyle = '#3c4753';
	g.fillRect(sx + w * 0.02, y + h * 0.34, w * 0.09, h * 0.32);
	g.fillStyle = '#c4392c';
	g.beginPath();
	g.arc(sx + w * 0.065, y + h * 0.5, h * 0.12, 0, 7);
	g.fill();
	g.fillStyle = '#12161b';
	g.beginPath();
	g.arc(sx + w * 0.065, y + h * 0.5, h * 0.12 * 0.62, 0, 7);
	g.fill();
	glow(g, sx + 14, y + h * 0.1, 14, '#ff3a2a', 0.5);
	glow(g, x + w * 0.1, y + h * 0.5, 16, '#7fe9ff', 0.4);
}

function shipBox(g: Ctx, x: number, y: number, w: number, h: number, col: string): void {
	g.save();
	g.shadowColor = 'rgba(0,0,0,.5)';
	g.shadowBlur = 5;
	g.shadowOffsetX = 3;
	g.shadowOffsetY = 4;
	g.fillStyle = col;
	g.fillRect(x, y, w, h);
	g.restore();
	g.strokeStyle = 'rgba(0,0,0,.7)';
	g.lineWidth = 1.4;
	g.strokeRect(x, y, w, h);
	g.strokeStyle = 'rgba(0,0,0,.25)';
	g.lineWidth = 1;
	for (let i = 4; i < w; i += 4) {
		g.beginPath();
		g.moveTo(x + i, y + 1);
		g.lineTo(x + i, y + h - 1);
		g.stroke();
	}
	g.fillStyle = 'rgba(255,255,255,.18)';
	g.fillRect(x, y, w, 2);
}

/** A gantry crane on the quay: portal legs on a rail, the boom out over the ship, a cab, warning lights. */
function crane(g: Ctx, x: number, y: number, rw: Rng): void {
	const len = 7.6 * T;
	// the rail, with sleepers, along the quay
	g.fillStyle = '#20262e';
	g.fillRect(x - T, y + 6.2 * T, 6.5 * T, 3);
	g.fillRect(x - T, y + 6.8 * T, 6.5 * T, 3);
	g.save();
	g.shadowColor = 'rgba(0,0,0,.55)';
	g.shadowBlur = 10;
	g.shadowOffsetX = 8;
	g.shadowOffsetY = 12;
	// the boom: a lattice beam out over the water
	g.fillStyle = '#e0a21e';
	g.fillRect(x + 0.6 * T, y, 2 * T, len);
	g.restore();
	g.strokeStyle = '#6a4a08';
	g.lineWidth = 1.6;
	g.strokeRect(x + 0.6 * T, y, 2 * T, len);
	g.strokeStyle = 'rgba(50,30,0,.7)';
	g.lineWidth = 1.5;
	for (let k = 0; k < len; k += 14) {
		g.beginPath();
		g.moveTo(x + 0.6 * T, y + k);
		g.lineTo(x + 2.6 * T, y + k + 14);
		g.moveTo(x + 2.6 * T, y + k);
		g.lineTo(x + 0.6 * T, y + k + 14);
		g.stroke();
	}
	g.fillStyle = 'rgba(255,240,180,.4)';
	g.fillRect(x + 0.6 * T, y, 2 * T, 3);
	g.fillStyle = 'rgba(255,255,255,.18)';
	g.fillRect(x + 0.6 * T + 2, y + 2, 3, len - 4);
	// the portal: two legs and a cross beam
	for (const lx of [x - 0.3 * T, x + 3.3 * T]) {
		g.fillStyle = '#2f3640';
		g.fillRect(lx, y + len - 1.4 * T, 0.9 * T, 2.6 * T);
		g.strokeStyle = '#05080c';
		g.lineWidth = 1.5;
		g.strokeRect(lx, y + len - 1.4 * T, 0.9 * T, 2.6 * T);
		g.fillStyle = '#e0a21e';
		g.fillRect(lx + 4, y + len - 1.2 * T, 0.9 * T - 8, 6);
	}
	g.fillStyle = '#e0a21e';
	g.fillRect(x - 0.3 * T, y + len - 0.4 * T, 4.5 * T, 0.8 * T);
	g.strokeStyle = '#6a4a08';
	g.strokeRect(x - 0.3 * T, y + len - 0.4 * T, 4.5 * T, 0.8 * T);
	// the cab on the boom, hazard stripes, red lights
	g.fillStyle = '#2b3946';
	g.fillRect(x + 0.9 * T, y + len * 0.42, 1.4 * T, 1.2 * T);
	g.strokeStyle = '#05080c';
	g.strokeRect(x + 0.9 * T, y + len * 0.42, 1.4 * T, 1.2 * T);
	g.fillStyle = '#9fd8e6';
	g.fillRect(x + 1.0 * T, y + len * 0.42 + 4, 1.2 * T, 7);
	for (let k = 0; k < 9; k += 1) {
		g.fillStyle = k % 2 ? '#14181e' : '#f0c23a';
		g.fillRect(x + 0.6 * T + k * 7.2, y + len - 8, 7.2, 8);
	}
	glow(g, x + 0.9 * T, y + 4, 12, '#ff2a2a', 0.65);
	glow(g, x + 2.4 * T, y + 4, 12, '#ff2a2a', 0.65);
	void rw;
}

/** The margins: rails, loose stacks, warehouses, trucks, the road. */
function paintMargins(
	g: Ctx,
	X: (c: number) => number,
	Y: (r: number) => number,
	cols: number,
	rows: number,
	rw: Rng
): void {
	// rail tracks down both sides
	for (const rc of [-10.5, cols + 9.5, -19.5, cols + 18.5]) {
		for (let r = -2; r < rows + 5; r += 1) {
			g.fillStyle = 'rgba(30,26,22,.8)';
			g.fillRect(X(rc) - 14, Y(r) + 2, 28, 5);
		}
		for (const o of [-9, 9]) {
			g.fillStyle = '#9ea6ae';
			g.fillRect(X(rc) + o - 1.5, Y(-2), 3, (rows + 7) * T);
			g.fillStyle = 'rgba(0,0,0,.5)';
			g.fillRect(X(rc) + o + 1.5, Y(-2), 2, (rows + 7) * T);
		}
	}
	// loose container stacks by the side rails
	for (const [c, r, n, vert] of [
		[-8, 4, 3, true],
		[-8, 15, 4, true],
		[cols + 4, 6, 4, true],
		[cols + 4, 17, 3, true],
		[-16, 6, 3, true],
		[-15, 17, 4, true],
		[cols + 12, 8, 3, true],
		[cols + 12, 18, 4, true]
	] as const) {
		for (let i = 0; i < n; i += 1) {
			const col = PAINT[Math.floor(rw() * PAINT.length)];
			container(g, X(c) + i * (T + 3), Y(r), T, 5 * T, col, rw, vert, 1);
		}
	}
	// the road along the bottom with a worn dashed line, the warehouses beyond it
	const ry = Y(rows + 0.3);
	g.fillStyle = '#262c35';
	g.fillRect(0, ry, g.canvas.width, 2.6 * T);
	g.fillStyle = 'rgba(240,200,60,.7)';
	for (let x = 0; x < g.canvas.width; x += 40) {
		g.fillRect(x, ry + 1.3 * T - 1, 22, 3);
	}
	warehouse(g, X(-10), Y(rows + 3.4), 15 * T, 5.4 * T, 0, rw);
	warehouse(g, X(8), Y(rows + 3.4), 18 * T, 5.4 * T, 1, rw);
	warehouse(g, X(cols + 0), Y(rows + 3.4), 12 * T, 5.4 * T, 2, rw);
	truck(g, X(2), ry + 0.3 * T, rw, PAINT[0], true);
	truck(g, X(14), ry + 0.3 * T, rw, PAINT[3], false);
	truck(g, X(cols + 3), ry + 0.3 * T, rw, PAINT[2], true);
	for (const [c, r] of [
		[-5, rows - 2],
		[cols + 4, 9]
	] as const) {
		forklift(g, X(c), Y(r), rw);
	}
}

/** A warehouse roof: corrugated, skylights, rooftop units, a neon sign along the street edge. */
function warehouse(g: Ctx, x: number, y: number, w: number, h: number, k: number, rw: Rng): void {
	g.save();
	g.shadowColor = 'rgba(0,0,0,.55)';
	g.shadowBlur = 12;
	g.shadowOffsetX = 9;
	g.shadowOffsetY = 12;
	const base = ['#5a6470', '#4d6a66', '#6a5a52'][k % 3];
	const gr = g.createLinearGradient(x, y, x + w * 0.3, y + h);
	gr.addColorStop(0, mixHex(base, '#ffffff', 0.12));
	gr.addColorStop(1, mixHex(base, '#000000', 0.2));
	g.fillStyle = gr;
	g.fillRect(x, y, w, h);
	g.restore();
	g.strokeStyle = '#080b10';
	g.lineWidth = 3;
	g.strokeRect(x, y, w, h);
	g.strokeStyle = 'rgba(0,0,0,.22)';
	g.lineWidth = 1;
	for (let i = 6; i < w; i += 6) {
		g.beginPath();
		g.moveTo(x + i, y + 2);
		g.lineTo(x + i, y + h - 2);
		g.stroke();
	}
	g.strokeStyle = 'rgba(255,255,255,.1)';
	for (let i = 7; i < w; i += 6) {
		g.beginPath();
		g.moveTo(x + i, y + 2);
		g.lineTo(x + i, y + h - 2);
		g.stroke();
	}
	g.fillStyle = 'rgba(255,255,255,.22)';
	g.fillRect(x, y, w, 3);
	// skylights, rooftop units
	for (let i = 0; i < w / (3 * T); i += 1) {
		const sx = x + 0.7 * T + i * 3 * T;
		g.fillStyle = 'rgba(180,230,240,.5)';
		g.fillRect(sx, y + 0.8 * T, 1.8 * T, 1.1 * T);
		g.strokeStyle = '#0a0d12';
		g.strokeRect(sx, y + 0.8 * T, 1.8 * T, 1.1 * T);
		if (rw() < 0.6) {
			g.fillStyle = '#9aa3aa';
			g.fillRect(sx + 4, y + 2.6 * T, 1.1 * T, 1.1 * T);
			g.strokeRect(sx + 4, y + 2.6 * T, 1.1 * T, 1.1 * T);
			g.fillStyle = '#2f353c';
			g.beginPath();
			g.arc(sx + 4 + 0.55 * T, y + 2.6 * T + 0.55 * T, 0.38 * T, 0, 7);
			g.fill();
		}
	}
	// the neon strip along the street edge
	const col = NEON[k % 3];
	g.shadowColor = col;
	g.shadowBlur = 16;
	g.fillStyle = col;
	g.fillRect(x + 0.5 * T, y + h - 6, w - T, 3.5);
	g.shadowBlur = 0;
}

function truck(g: Ctx, x: number, y: number, rw: Rng, paint: string, flip: boolean): void {
	const w = 5.6 * T;
	const h = 1.3 * T;
	g.save();
	if (flip) {
		g.translate(x + w, 0);
		g.scale(-1, 1);
		x = 0;
	}
	g.shadowColor = 'rgba(0,0,0,.5)';
	g.shadowBlur = 7;
	g.shadowOffsetX = 5;
	g.shadowOffsetY = 7;
	g.fillStyle = '#2a323c';
	g.fillRect(x, y + 6, w, h - 12);
	g.shadowBlur = 0;
	g.shadowOffsetX = 0;
	g.shadowOffsetY = 0;
	container(g, x + 0.2 * T, y, 4.2 * T, h, paint, rw, false, 0);
	g.fillStyle = '#d6dadc';
	g.beginPath();
	g.roundRect(x + 4.55 * T, y + 2, 1.0 * T, h - 4, 5);
	g.fill();
	g.strokeStyle = '#0b0e13';
	g.lineWidth = 2;
	g.stroke();
	g.fillStyle = '#1b2733';
	g.fillRect(x + 5.05 * T, y + 6, 0.38 * T, h - 12);
	glow(g, x + 5.6 * T, y + 7, 8, '#fff2b0', 0.8);
	glow(g, x + 5.6 * T, y + h - 7, 8, '#fff2b0', 0.8);
	g.restore();
	void rw;
}

function forklift(g: Ctx, x: number, y: number, rw: Rng): void {
	g.save();
	g.shadowColor = 'rgba(0,0,0,.5)';
	g.shadowBlur = 5;
	g.shadowOffsetX = 3;
	g.shadowOffsetY = 4;
	g.fillStyle = '#e8a623';
	g.beginPath();
	g.roundRect(x, y, 1.1 * T, 0.8 * T, 4);
	g.fill();
	g.restore();
	g.strokeStyle = '#0b0e13';
	g.lineWidth = 1.6;
	g.beginPath();
	g.roundRect(x, y, 1.1 * T, 0.8 * T, 4);
	g.stroke();
	g.fillStyle = '#3b434d';
	g.fillRect(x - 12, y + 3, 12, 4);
	g.fillRect(x - 12, y + 0.8 * T - 7, 12, 4);
	g.fillStyle = 'rgba(0,0,0,.5)';
	g.fillRect(x + 6, y + 6, 14, 0.8 * T - 12);
	void rw;
}

// ---------------------------------------------------------------------------------------------
// the yard

/** The yard's concrete: slabs, joints, puddles with a neon sheen, oil, drains. */
function paintYard(
	g: Ctx,
	S: GridMatrix,
	X: (c: number) => number,
	Y: (r: number) => number,
	cols: number,
	rows: number,
	rw: Rng
): void {
	for (let r = 0; r < rows; r += 1) {
		for (let c = 0; c < cols; c += 1) {
			const t = S[r][c];
			if (t === 'ES' || isWall(S, c, r)) {
				continue;
			}
			const x = X(c);
			const y = Y(r);
			g.fillStyle = LAIR.has(t) ? '#2e353f' : mixHex('#3c4552', '#4a5461', 0.2 + rw() * 0.6);
			g.fillRect(x, y, T, T);
		}
	}
	// the yard apron under the containers' ring: one wet concrete sheet, slab joints on top
	g.strokeStyle = 'rgba(8,10,14,.11)';
	g.lineWidth = 1;
	for (let r = 0; r < rows; r += 1) {
		for (let c = 0; c < cols; c += 1) {
			if (S[r][c] === 'ES' || isWall(S, c, r)) {
				continue;
			}
			g.strokeRect(X(c) + 0.5, Y(r) + 0.5, T - 1, T - 1);
		}
	}
	// oil stains and drains
	for (let i = 0; i < 14; i += 1) {
		const c = 1 + Math.floor(rw() * (cols - 2));
		const r = 1 + Math.floor(rw() * (rows - 2));
		if (S[r][c] === 'ES' || isWall(S, c, r) || LAIR.has(S[r][c])) {
			continue;
		}
		g.fillStyle = `rgba(6,6,5,${0.18 + rw() * 0.16})`;
		g.beginPath();
		g.ellipse(X(c) + rw() * T, Y(r) + rw() * T, 4 + rw() * 7, 3 + rw() * 5, rw() * 3, 0, 7);
		g.fill();
	}
	for (let i = 0; i < 9; i += 1) {
		const c = 2 + Math.floor(rw() * (cols - 4));
		const r = 2 + Math.floor(rw() * (rows - 4));
		if (S[r][c] === 'ES' || isWall(S, c, r) || LAIR.has(S[r][c])) {
			continue;
		}
		const x = X(c) + 8;
		const y = Y(r) + 11;
		g.fillStyle = '#12161c';
		g.fillRect(x, y, 16, 10);
		g.strokeStyle = 'rgba(160,170,180,.5)';
		g.lineWidth = 1;
		for (let k = 2; k < 16; k += 3) {
			g.beginPath();
			g.moveTo(x + k, y + 1);
			g.lineTo(x + k, y + 9);
			g.stroke();
		}
	}
	// puddles: dark water, a sky sheen and a neon smear
	for (let i = 0; i < 12; i += 1) {
		const c = 1 + Math.floor(rw() * (cols - 2));
		const r = 1 + Math.floor(rw() * (rows - 2));
		if (S[r][c] === 'ES' || isWall(S, c, r) || LAIR.has(S[r][c])) {
			continue;
		}
		const px = X(c) + 6 + rw() * (T - 12);
		const py = Y(r) + 6 + rw() * (T - 12);
		const rx = 6 + rw() * 7;
		const ry = 4 + rw() * 5;
		g.fillStyle = 'rgba(10,26,40,.6)';
		g.beginPath();
		g.ellipse(px, py, rx, ry, rw() * 0.6, 0, 7);
		g.fill();
		g.fillStyle = 'rgba(170,215,240,.2)';
		g.beginPath();
		g.ellipse(px - rx * 0.2, py - ry * 0.25, rx * 0.55, ry * 0.4, 0, 0, 7);
		g.fill();
		const col = NEON[Math.floor(rw() * 3)];
		g.fillStyle = `${col}33`;
		g.fillRect(px + rx * 0.1, py - ry * 0.7, 2.4, ry * 1.4);
	}
}

/** Long rows of containers: every wall tile, grouped into strips and painted one by one. */
function paintContainers(
	g: Ctx,
	S: GridMatrix,
	X: (c: number) => number,
	Y: (r: number) => number,
	cols: number,
	rows: number,
	building: PortBake['building'],
	rw: Rng
): void {
	const used = new Set<string>();
	const inBuilding = (c: number, r: number): boolean =>
		c >= building.c &&
		c < building.c + building.w &&
		r >= building.r &&
		r < building.r + building.h;
	const free = (c: number, r: number): boolean =>
		isWall(S, c, r) && !used.has(`${c},${r}`) && !inBuilding(c, r);
	// the bay lines first: a painted outline round every wall tile's footprint, on the ground
	g.strokeStyle = 'rgba(236,196,60,.38)';
	g.lineWidth = 1.6;
	for (let r = 0; r < rows; r += 1) {
		for (let c = 0; c < cols; c += 1) {
			if (!free(c, r)) {
				continue;
			}
			for (const [dc, dr, ax, ay, bx, by] of [
				[0, -1, 0, 0, T, 0],
				[1, 0, T, 0, T, T],
				[0, 1, 0, T, T, T],
				[-1, 0, 0, 0, 0, T]
			] as const) {
				if (
					isWall(S, c + dc, r + dr) ||
					S[r + dr]?.[c + dc] === undefined ||
					S[r + dr]?.[c + dc] === 'ES'
				) {
					continue;
				}
				g.beginPath();
				g.moveTo(X(c) + ax - dc * 3, Y(r) + ay - dr * 3);
				g.lineTo(X(c) + bx - dc * 3, Y(r) + by - dr * 3);
				g.stroke();
			}
		}
	}
	let n = 0;
	for (let r = 0; r < rows; r += 1) {
		for (let c = 0; c < cols; c += 1) {
			if (!free(c, r)) {
				continue;
			}
			let hl = 0;
			while (free(c + hl, r)) {
				hl += 1;
			}
			let vl = 0;
			while (free(c, r + vl)) {
				vl += 1;
			}
			const horiz = hl >= vl;
			let len = horiz ? hl : vl;
			// a long run is cut into containers of 3 to 6 tiles
			while (len > 0) {
				let piece = len;
				if (len > 6) {
					piece = 3 + Math.floor(rw() * 4);
					if (len - piece === 1) {
						piece -= 1;
					}
				}
				for (let i = 0; i < piece; i += 1) {
					used.add(horiz ? `${c + (hl - len) + i},${r}` : `${c},${r + (vl - len) + i}`);
				}
				const cx = horiz ? c + (hl - len) : c;
				const cy = horiz ? r : r + (vl - len);
				const col = PAINT[(n + Math.floor(rw() * 3)) % PAINT.length];
				n += 1;
				container(
					g,
					X(cx) + 1.5,
					Y(cy) + 1.5,
					(horiz ? piece : 1) * T - 3,
					(horiz ? 1 : piece) * T - 3,
					col,
					rw,
					!horiz,
					Math.floor(rw() * 3)
				);
				len -= piece;
			}
		}
	}
}

/**
 * One container seen from above: corrugated roof, frame rails, four corner castings, a company stripe
 * with a stencil, rust and scuffs, a rim light on the lit sides. `stack` (0 to 2) is its height: taller
 * ones cast longer shadows and catch more light. `vert` is the long axis down the screen.
 */
function container(
	g: Ctx,
	x: number,
	y: number,
	w: number,
	h: number,
	paint: string,
	rw: Rng,
	vert: boolean,
	stack: number
): void {
	const long = vert ? h : w;
	g.save();
	g.shadowColor = 'rgba(0,0,0,.6)';
	g.shadowBlur = 5 + stack * 3;
	g.shadowOffsetX = 4 + stack * 3;
	g.shadowOffsetY = 6 + stack * 4;
	g.fillStyle = paint;
	g.beginPath();
	g.roundRect(x, y, w, h, 3);
	g.fill();
	g.restore();
	g.save();
	g.beginPath();
	g.roundRect(x, y, w, h, 3);
	g.clip();
	// the roof: a gradient across the short axis, lighter to the top left, lighter still for a tall stack
	const gr = vert ? g.createLinearGradient(x, 0, x + w, 0) : g.createLinearGradient(0, y, 0, y + h);
	gr.addColorStop(0, mixHex(paint, '#ffffff', 0.22 + stack * 0.05));
	gr.addColorStop(0.45, paint);
	gr.addColorStop(1, mixHex(paint, '#000000', 0.32));
	g.fillStyle = gr;
	g.fillRect(x, y, w, h);
	// the corrugation: ribs across the short axis
	for (let i = 7; i < long - 7; i += 4) {
		const a = vert ? [x + 3, y + i, x + w - 3, y + i] : [x + i, y + 3, x + i, y + h - 3];
		g.strokeStyle = 'rgba(0,0,0,.26)';
		g.lineWidth = 1;
		g.beginPath();
		g.moveTo(a[0], a[1]);
		g.lineTo(a[2], a[3]);
		g.stroke();
		g.strokeStyle = 'rgba(255,255,255,.13)';
		g.beginPath();
		g.moveTo(a[0] + (vert ? 0 : 1), a[1] + (vert ? 1 : 0));
		g.lineTo(a[2] + (vert ? 0 : 1), a[3] + (vert ? 1 : 0));
		g.stroke();
	}
	// the company stripe with a stencil of dashes
	const mid = long * (0.3 + rw() * 0.4);
	g.fillStyle = 'rgba(255,255,255,.5)';
	if (vert) {
		g.fillRect(x + 2, y + mid, w - 4, 4);
	} else {
		g.fillRect(x + mid, y + 2, 4, h - 4);
	}
	g.fillStyle = 'rgba(240,244,246,.55)';
	for (let k = 0; k < 6; k += 1) {
		if (vert) {
			g.fillRect(x + 5 + k * 3.4, y + 8, 2, 3);
		} else {
			g.fillRect(x + 8, y + 5 + k * 3.4, 3, 2);
		}
	}
	// weathering: rust streaks from the edges, scuffs and a dent
	for (let k = 0; k < 4; k += 1) {
		g.fillStyle = `rgba(110,52,24,${0.16 + rw() * 0.2})`;
		const px = x + rw() * w;
		const py = y + rw() * h;
		if (vert) {
			g.fillRect(px, py, 1 + rw() * 3, 5 + rw() * 14);
		} else {
			g.fillRect(px, py, 5 + rw() * 14, 1 + rw() * 3);
		}
	}
	g.fillStyle = 'rgba(0,0,0,.1)';
	g.fillRect(x + rw() * (w - 10), y + rw() * (h - 8), 6 + rw() * 6, 4 + rw() * 4);
	// the frame rails along both long sides, and the end frames
	g.fillStyle = 'rgba(0,0,0,.3)';
	if (vert) {
		g.fillRect(x, y, 2.5, h);
		g.fillRect(x + w - 2.5, y, 2.5, h);
		g.fillRect(x, y, w, 6);
		g.fillRect(x, y + h - 6, w, 6);
	} else {
		g.fillRect(x, y, w, 2.5);
		g.fillRect(x, y + h - 2.5, w, 2.5);
		g.fillRect(x, y, 6, h);
		g.fillRect(x + w - 6, y, 6, h);
	}
	// the corner castings
	g.fillStyle = '#1b2027';
	for (const [cx, cy] of [
		[x, y],
		[x + w - 6.5, y],
		[x, y + h - 6.5],
		[x + w - 6.5, y + h - 6.5]
	]) {
		g.fillRect(cx, cy, 6.5, 6.5);
		g.fillStyle = 'rgba(255,255,255,.4)';
		g.fillRect(cx + 1, cy + 1, 2, 1.4);
		g.fillStyle = '#1b2027';
	}
	// the rim light: top and left lit, bottom and right in shade
	g.fillStyle = 'rgba(255,255,255,.34)';
	g.fillRect(x, y, w, 1.6);
	g.fillRect(x, y, 1.6, h);
	g.fillStyle = 'rgba(0,0,0,.4)';
	g.fillRect(x, y + h - 1.6, w, 1.6);
	g.fillRect(x + w - 1.6, y, 1.6, h);
	g.restore();
	g.strokeStyle = 'rgba(8,10,14,.92)';
	g.lineWidth = 1.6;
	g.beginPath();
	g.roundRect(x, y, w, h, 3);
	g.stroke();
	// a holo-ad on a few roofs: a lit panel
	if (long >= 4 * T && rw() < 0.22) {
		const col = NEON[Math.floor(rw() * 3)];
		g.shadowColor = col;
		g.shadowBlur = 12;
		g.fillStyle = col;
		g.globalAlpha = 0.85;
		if (vert) {
			g.fillRect(x + w * 0.25, y + long * 0.55, w * 0.5, 9);
		} else {
			g.fillRect(x + long * 0.55, y + h * 0.25, 9, h * 0.5);
		}
		g.globalAlpha = 1;
		g.shadowBlur = 0;
	}
}

/** The control building: a flat roof with a helipad, rooftop plant, a lit window band and a doorway at the top. */
function paintBuilding(g: Ctx, x: number, y: number, w: number, h: number, rw: Rng): void {
	g.save();
	g.shadowColor = 'rgba(0,0,0,.6)';
	g.shadowBlur = 14;
	g.shadowOffsetX = 9;
	g.shadowOffsetY = 12;
	const gr = g.createLinearGradient(x, y, x + w * 0.4, y + h);
	gr.addColorStop(0, '#586472');
	gr.addColorStop(1, '#2d3540');
	g.fillStyle = gr;
	g.fillRect(x, y, w, h);
	g.restore();
	g.strokeStyle = '#06090d';
	g.lineWidth = 3;
	g.strokeRect(x, y, w, h);
	g.strokeStyle = 'rgba(0,0,0,.22)';
	g.lineWidth = 1;
	for (let i = T; i < w; i += T) {
		g.beginPath();
		g.moveTo(x + i, y + 4);
		g.lineTo(x + i, y + h - 4);
		g.stroke();
	}
	for (let j = T; j < h; j += T) {
		g.beginPath();
		g.moveTo(x + 4, y + j);
		g.lineTo(x + w - 4, y + j);
		g.stroke();
	}
	g.fillStyle = 'rgba(255,255,255,.2)';
	g.fillRect(x, y, w, 3);
	g.fillRect(x, y, 3, h);
	// the helipad on the left half
	const hx = x + w * 0.3;
	const hy = y + h * 0.52;
	g.fillStyle = '#2a323c';
	g.beginPath();
	g.arc(hx, hy, 40, 0, 7);
	g.fill();
	g.strokeStyle = '#f0c23a';
	g.lineWidth = 3;
	g.stroke();
	g.fillStyle = '#e8ecee';
	g.font = '700 44px "Arial Narrow",system-ui,sans-serif';
	g.textAlign = 'center';
	g.textBaseline = 'middle';
	g.fillText('H', hx, hy + 2);
	// the plant on the right: units and a vent
	for (const [ux, uy, uw, uh] of [
		[w * 0.6, h * 0.2, 44, 34],
		[w * 0.76, h * 0.26, 34, 30],
		[w * 0.62, h * 0.58, 40, 28]
	]) {
		g.fillStyle = '#9aa3aa';
		g.fillRect(x + ux, y + uy, uw, uh);
		g.strokeStyle = '#0a0d12';
		g.lineWidth = 1.6;
		g.strokeRect(x + ux, y + uy, uw, uh);
		g.fillStyle = '#2f353c';
		g.beginPath();
		g.arc(x + ux + uw / 2, y + uy + uh / 2, uh * 0.32, 0, 7);
		g.fill();
	}
	// the lit window band along the south edge, a neon edge on the north
	g.fillStyle = '#a8e6f2';
	for (let i = 0; i < w / 14 - 1; i += 1) {
		g.fillRect(x + 8 + i * 14, y + h - 12, 9, 5);
	}
	g.shadowColor = NEON[0];
	g.shadowBlur = 14;
	g.fillStyle = NEON[0];
	g.fillRect(x + 6, y + 5, w - 12, 3);
	g.shadowBlur = 0;
	// the doorway: the lair's entrance, hazard stripes
	g.fillStyle = '#0d1117';
	g.fillRect(x + 2 * T, y, 3 * T, 10);
	for (let k = 0; k < 12; k += 1) {
		g.fillStyle = k % 2 ? '#14181e' : '#f0c23a';
		g.fillRect(x + 2 * T + k * 8, y + 2, 8, 6);
	}
	g.textAlign = 'start';
	g.textBaseline = 'alphabetic';
	void rw;
}

/** Floodlight poles on the stacks: a small base and a pool of warm light round each; more in the margins. */
function paintPoles(g: Ctx, X: (c: number) => number, Y: (r: number) => number, rw: Rng): void {
	const poles: ReadonlyArray<readonly [number, number, string]> = [
		[3, 3.5, '#ffd9a0'],
		[21, 3.5, '#ffd9a0'],
		[3, 22.5, '#ffd9a0'],
		[21, 22.5, '#ffd9a0'],
		[8, 13, '#bfe6ff'],
		[16, 13, '#bfe6ff'],
		[-6, 8, '#ffd9a0'],
		[-6, 22, '#ffd9a0'],
		[30, 8, '#ffd9a0'],
		[30, 22, '#ffd9a0'],
		[-14, 12, '#bfe6ff'],
		[-14, 24, '#ffd9a0'],
		[38, 12, '#bfe6ff'],
		[38, 24, '#ffd9a0'],
		[5, 31, '#ffd9a0'],
		[22, 31, '#ffd9a0']
	];
	for (const [c, r, col] of poles) {
		const x = X(c);
		const y = Y(r);
		g.save();
		g.globalCompositeOperation = 'lighter';
		const gr = g.createRadialGradient(x, y, 4, x, y, 5.5 * T);
		gr.addColorStop(0, `${col}30`);
		gr.addColorStop(0.5, `${col}14`);
		gr.addColorStop(1, `${col}00`);
		g.fillStyle = gr;
		g.fillRect(x - 6 * T, y - 6 * T, 12 * T, 12 * T);
		g.restore();
		g.fillStyle = 'rgba(0,0,0,.4)';
		g.beginPath();
		g.arc(x + 3, y + 4, 6, 0, 7);
		g.fill();
		g.fillStyle = '#2f353d';
		g.beginPath();
		g.arc(x, y, 5, 0, 7);
		g.fill();
		g.strokeStyle = '#06090d';
		g.lineWidth = 1.4;
		g.stroke();
		glow(g, x, y, 11, col, 0.9);
	}
	void rw;
}

/** A small additive glow (a lamp, a beacon). */
function glow(g: Ctx, x: number, y: number, r: number, color: string, alpha: number): void {
	g.save();
	g.globalCompositeOperation = 'lighter';
	g.globalAlpha = alpha;
	const gr = g.createRadialGradient(x, y, 0, x, y, r * 2);
	gr.addColorStop(0, color);
	gr.addColorStop(0.35, `${color}66`);
	gr.addColorStop(1, `${color}00`);
	g.fillStyle = gr;
	g.fillRect(x - r * 2, y - r * 2, r * 4, r * 4);
	g.restore();
}
