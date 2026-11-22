// Shared pieces of the season-dress prototype. The walls are never repainted: the game's own
// `paintWalls` (stone, seams, the 8-unit rounded outer corners) runs untouched, with only its
// drop-shadow parameters changed (the winter walls already take them), and whatever a season adds
// to the walls is clipped to that painter's own silhouette, so nothing can leave the rounded
// shape (no white corners, no stripes across the face). The corridor floor is the rest.
import type { MeadowFrame } from '../../../src/games/pacman/render/seasons/meadow/MeadowBake';
import { T } from '../../../src/games/pacman/render/seasons/meadow/MeadowBake';
import type { MeadowPathCell } from '../../../src/games/pacman/render/seasons/meadow/MeadowTheme';

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
