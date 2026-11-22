// Shared pieces of the season-dress prototype. The walls are never repainted: the game's own
// `paintWalls` (stone, seams, the 8-unit rounded outer corners) runs untouched, with only its
// drop-shadow parameters changed (the winter walls already take them), and whatever a season adds
// to the walls is clipped to that painter's own silhouette, so nothing can leave the rounded
// shape (no white corners, no stripes across the face). Floor, depth and water are the rest.
import type { GridMatrix } from '../../../src/games/pacman/config/gridConfig';
import type { MeadowFrame } from '../../../src/games/pacman/render/seasons/meadow/MeadowBake';
import { T } from '../../../src/games/pacman/render/seasons/meadow/MeadowBake';
import type { MeadowPathCell } from '../../../src/games/pacman/render/seasons/meadow/MeadowTheme';
import { tunnelRowOf } from '../../../src/games/pacman/render/common/worldDecor';

export { T };
export const TAU = Math.PI * 2;

export function rng(seed: number): () => number {
	let a = seed >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

/**
 * The wall faces' silhouette as one clip path: every wall tile inset by `inset` on the sides that
 * open to a path, 8 units round on the outer corners: the same shape `paintWalls` fills.
 */
export function wallClip(f: MeadowFrame, inset = 0.6): Path2D {
	const path = new Path2D();
	for (let r = 0; r < f.R; r += 1) {
		for (let c = 0; c < f.C; c += 1) {
			if (!f.isW(r, c)) continue;
			const oL = !f.isW(r, c - 1);
			const oU = !f.isW(r - 1, c);
			const oR = !f.isW(r, c + 1);
			const oD = !f.isW(r + 1, c);
			const L = oL ? inset : -0.4;
			const U = oU ? inset : -0.4;
			const Rr = oR ? inset : -0.4;
			const Dd = oD ? inset : -0.4;
			path.roundRect(c * T + L, r * T + U, T - L - Rr, T - U - Dd, [oU && oL ? 8 : 0, oU && oR ? 8 : 0, oD && oR ? 8 : 0, oD && oL ? 8 : 0]);
		}
	}
	return path;
}

/** Runs `paint` with the context clipped to the walls' silhouette. */
export function onWalls(f: MeadowFrame, paint: (r: () => number) => void, seed = 5): void {
	f.b.save();
	f.b.clip(wallClip(f));
	paint(rng(seed));
	f.b.restore();
}

// -------------------------------------------------------------------------------- the floor

export interface FloorTone {
	/** One flat opaque colour for the whole corridor. */
	readonly base: string;
	/** Two grain colours (light, dark), laid at a low alpha. */
	readonly grain: readonly [string, string];
	/** How dark the contact shadow at the walls' feet is, 0..1. */
	readonly ao: number;
}

/**
 * One corridor tile: opaque, one tone, a faint grain, and the contact shadow where a wall stands
 * (a soft dark band on the floor along the wall's foot, deeper on the sides the light leaves).
 */
export function floorCell(f: MeadowFrame, cell: MeadowPathCell, tone: FloorTone): void {
	const { b, isW } = f;
	const { x, y, r, c, k } = cell;
	b.fillStyle = tone.base;
	b.fillRect(x - 0.5, y - 0.5, T + 1, T + 1);
	for (let i = 0; i < 7; i += 1) {
		b.fillStyle = tone.grain[i % 2];
		b.globalAlpha = 0.1 + k() * 0.1;
		b.beginPath();
		b.ellipse(x + k() * T, y + k() * T, 0.5 + k() * 1.3, 0.4 + k() * 0.8, k() * 3, 0, TAU);
		b.fill();
	}
	b.globalAlpha = 1;
	// the light comes from the upper left, so the walls' shadow lies on the floor to their right and
	// below them: stronger on a tile's left and top edge (it touches a wall's right/bottom foot)
	const strip = (x0: number, y0: number, x1: number, y1: number, rx: number, ry: number, rw: number, rh: number, depth: number) => {
		const g = b.createLinearGradient(x0, y0, x1, y1);
		g.addColorStop(0, `rgba(0,0,0,${tone.ao * depth})`);
		g.addColorStop(1, 'rgba(0,0,0,0)');
		b.fillStyle = g;
		b.fillRect(rx, ry, rw, rh);
	};
	if (isW(r, c - 1)) strip(x, y, x + 9, y, x, y, 9, T, 1);
	if (isW(r - 1, c)) strip(x, y, x, y + 9, x, y, T, 9, 1);
	// right and bottom feet: a thin contact line only
	if (isW(r, c + 1)) {
		const g = b.createLinearGradient(x + T, y, x + T - 4, y);
		g.addColorStop(0, `rgba(0,0,0,${tone.ao * 0.5})`);
		g.addColorStop(1, 'rgba(0,0,0,0)');
		b.fillStyle = g;
		b.fillRect(x + T - 4, y, 4, T);
	}
	if (isW(r + 1, c)) {
		const g = b.createLinearGradient(x, y + T, x, y + T - 4);
		g.addColorStop(0, `rgba(0,0,0,${tone.ao * 0.5})`);
		g.addColorStop(1, 'rgba(0,0,0,0)');
		b.fillStyle = g;
		b.fillRect(x, y + T - 4, T, 4);
	}
}

// --------------------------------------------------------------------------------- water

export interface WaterTone {
	readonly bank: string;
	readonly water: readonly [string, string];
	readonly shine: string;
}

/** A river down the left margin (where the portal path crosses it, a bridge) and a pond right. */
export function paintWaters(f: MeadowFrame, tone: WaterTone, extras?: (f: MeadowFrame, pond: { x: number; y: number; rx: number; ry: number }) => void): void {
	const { b, R, C } = f;
	const row = tunnelRowOf(f.S) ?? Math.floor(R / 2);
	const r = rng(42);
	const cx = (y: number) => -2.7 * T + Math.sin(y / (5 * T)) * 0.7 * T;
	const half = (y: number) => 0.95 * T + Math.sin(y / (3 * T) + 1) * 0.22 * T;
	const y0 = -8 * T;
	const y1 = (R + 8) * T;
	const side = (grow: number, sign: number) => {
		for (let y = y0; y <= y1; y += 6) {
			const x = cx(y) + sign * (half(y) + grow);
			if (y === y0) b.moveTo(x, y);
			else b.lineTo(x, y);
		}
	};
	const river = (grow: number, fill: string | CanvasGradient) => {
		b.beginPath();
		side(grow, -1);
		for (let y = y1; y >= y0; y -= 6) b.lineTo(cx(y) + (half(y) + grow), y);
		b.closePath();
		b.fillStyle = fill;
		b.fill();
	};
	river(0.5 * T, tone.bank);
	const wg = b.createLinearGradient(-5 * T, 0, -2 * T, 0);
	wg.addColorStop(0, tone.water[0]);
	wg.addColorStop(1, tone.water[1]);
	river(0, wg);
	// flow lines and light on the water
	b.strokeStyle = tone.shine;
	b.lineCap = 'round';
	for (let i = 0; i < 90; i += 1) {
		const y = y0 + r() * (y1 - y0);
		const x = cx(y) + (r() - 0.5) * 1.5 * half(y);
		b.globalAlpha = 0.18 + r() * 0.3;
		b.lineWidth = 0.7 + r() * 0.8;
		b.beginPath();
		b.moveTo(x, y);
		b.lineTo(x + (r() - 0.5) * 3, y + 6 + r() * 10);
		b.stroke();
	}
	b.globalAlpha = 1;
	// the bridge where the portal path crosses: planks, rails, a shadow on the water
	const by = row * T + T / 2;
	const bw = half(by) * 2 + 1.1 * T;
	const bx = cx(by) - bw / 2;
	b.fillStyle = 'rgba(0,0,0,.28)';
	b.fillRect(bx + 2, by - T * 0.62 + 4, bw, T * 1.24);
	b.fillStyle = '#7a5a3a';
	b.fillRect(bx, by - T * 0.6, bw, T * 1.2);
	b.strokeStyle = 'rgba(30,16,8,.55)';
	b.lineWidth = 0.9;
	for (let x = bx + 4; x < bx + bw; x += 4.6) {
		b.beginPath();
		b.moveTo(x, by - T * 0.6);
		b.lineTo(x, by + T * 0.6);
		b.stroke();
	}
	b.fillStyle = '#4e3822';
	b.fillRect(bx, by - T * 0.6, bw, 2.2);
	b.fillRect(bx, by + T * 0.6 - 2.2, bw, 2.2);
	// the pond, to the right of the maze, off the portal path
	const pond = { x: (C + 2.9) * T, y: (row + 2.3) * T, rx: 2.4 * T, ry: 1.45 * T };
	const blobPath = (grow: number) => {
		b.beginPath();
		for (let j = 0; j <= 48; j += 1) {
			const a = (j / 48) * TAU;
			const w = 1 + 0.06 * Math.sin(a * 3 + 1) + 0.04 * Math.sin(a * 5);
			const x = pond.x + Math.cos(a) * (pond.rx + grow) * w;
			const y = pond.y + Math.sin(a) * (pond.ry + grow) * w;
			if (j === 0) b.moveTo(x, y);
			else b.lineTo(x, y);
		}
		b.closePath();
	};
	blobPath(0.4 * T);
	b.fillStyle = tone.bank;
	b.fill();
	blobPath(0);
	const pg = b.createLinearGradient(pond.x, pond.y - pond.ry, pond.x, pond.y + pond.ry);
	pg.addColorStop(0, tone.water[0]);
	pg.addColorStop(1, tone.water[1]);
	b.fillStyle = pg;
	b.fill();
	b.strokeStyle = tone.shine;
	b.globalAlpha = 0.5;
	b.lineWidth = 1.2;
	b.beginPath();
	b.ellipse(pond.x - pond.rx * 0.25, pond.y - pond.ry * 0.35, pond.rx * 0.45, pond.ry * 0.2, -0.15, 3.3, 5.6);
	b.stroke();
	b.globalAlpha = 1;
	extras?.(f, pond);
}

/** The cells a puddle can sit on: path tiles, kept apart, seeded. In tile units. */
export function puddleSpots(grid: GridMatrix, n: number, seed: number): Array<{ c: number; r: number; ox: number; oy: number; rx: number; ry: number; s: number }> {
	const r = rng(seed);
	const out: Array<{ c: number; r: number; ox: number; oy: number; rx: number; ry: number; s: number }> = [];
	const free: Array<[number, number]> = [];
	grid.forEach((row, y) => row.forEach((t, x) => (t === 'DT' ? free.push([x, y]) : undefined)));
	for (let tries = 0; tries < 800 && out.length < n; tries += 1) {
		const [x, y] = free[Math.floor(r() * free.length)];
		if (out.every((p) => Math.hypot(p.c - x, p.r - y) >= 3.2)) {
			out.push({ c: x, r: y, ox: 0.3 + r() * 0.4, oy: 0.3 + r() * 0.4, rx: 0.42 + r() * 0.14, ry: 0.22 + r() * 0.08, s: r() });
		}
	}
	return out;
}
