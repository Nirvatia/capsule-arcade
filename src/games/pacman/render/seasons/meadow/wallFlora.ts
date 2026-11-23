// Plants on the walls and at their feet (the owner's answers, 2026-11-23): creepers that grow
// over the stone from the top (spring's bindweed with small flowers and young moss, summer's ivy),
// unevenly (some walls almost covered, some with a shoot or two), and a green band along the walls'
// feet instead of grass blades. The creepers run inside the walls' silhouette (the scene's wall
// dress) and stay off the outer corners' curve; the band reaches under 2 units into the corridor.
import type { MeadowFrame } from './MeadowBake';
import { TAU, hash, nearCorner, rng, wallClip } from './seasonScene';
import { WORLD_TILE } from '../../common/worldDecor';

const T = WORLD_TILE;
type C2 = CanvasRenderingContext2D;

export interface CreeperStyle {
	/** Seed of the growth map: which walls are overgrown. */
	readonly seed: number;
	/** Share of the walls the plant reaches, 0..1 (the growth map is shifted by it). */
	readonly cover: number;
	readonly stem: string;
	/** Leaf tones, dark to light. */
	readonly leaves: readonly string[];
	/** Leaf size in world units. */
	readonly leaf: number;
	/** `ivy`: three-lobed leaves; `heart`: bindweed's heart-shaped ones. */
	readonly shape: 'ivy' | 'heart';
	/** Flowers on the stems (bindweed's trumpets), and how many per overgrown tile. */
	readonly flowers?: {
		readonly petals: readonly string[];
		readonly heart: string;
		readonly rate: number;
	};
	/** Soft moss on the stone's edges, under the creepers. */
	readonly moss?: readonly [string, string];
}

/** A smooth growth map over the walls, 0..1: value noise on a 4-tile lattice. */
function growth(seed: number, r: number, c: number): number {
	const g = 4;
	const gr = r / g;
	const gc = c / g;
	const r0 = Math.floor(gr);
	const c0 = Math.floor(gc);
	const fr = gr - r0;
	const fc = gc - c0;
	const v = (a: number, b: number) => hash(a * 157 + b * 31, seed);
	const sm = (t: number) => t * t * (3 - 2 * t);
	const top = v(r0, c0) + (v(r0, c0 + 1) - v(r0, c0)) * sm(fc);
	const bot = v(r0 + 1, c0) + (v(r0 + 1, c0 + 1) - v(r0 + 1, c0)) * sm(fc);
	return top + (bot - top) * sm(fr);
}

function leafAt(
	b: C2,
	x: number,
	y: number,
	s: number,
	rot: number,
	col: string,
	shape: CreeperStyle['shape']
): void {
	b.save();
	b.translate(x, y);
	b.rotate(rot);
	b.fillStyle = col;
	b.beginPath();
	if (shape === 'ivy') {
		// three lobes round a point: the ivy leaf from above
		for (const a of [-0.9, 0, 0.9]) {
			b.moveTo(Math.sin(a) * s * 0.55 + s * 0.42, -Math.cos(a) * s * 0.55);
			b.arc(Math.sin(a) * s * 0.55, -Math.cos(a) * s * 0.55, s * 0.42, 0, TAU);
		}
		b.moveTo(s * 0.5, 0);
		b.arc(0, 0, s * 0.5, 0, TAU);
	} else {
		// a heart, its point away from the stem
		b.moveTo(0, s * 0.8);
		b.bezierCurveTo(-s * 0.9, s * 0.1, -s * 0.6, -s * 0.8, 0, -s * 0.35);
		b.bezierCurveTo(s * 0.6, -s * 0.8, s * 0.9, s * 0.1, 0, s * 0.8);
	}
	b.fill();
	b.strokeStyle = 'rgba(20,40,10,.35)';
	b.lineWidth = 0.35;
	b.beginPath();
	b.moveTo(0, s * 0.5);
	b.lineTo(0, -s * 0.5);
	b.stroke();
	b.restore();
}

function flowerAt(b: C2, x: number, y: number, s: number, petal: string, heart: string): void {
	b.fillStyle = 'rgba(30,40,20,.25)';
	b.beginPath();
	b.arc(x + 0.4, y + 0.5, s * 1.05, 0, TAU);
	b.fill();
	b.fillStyle = petal;
	b.beginPath();
	for (let i = 0; i < 5; i += 1) {
		const a = (i / 5) * TAU;
		b.moveTo(x + Math.cos(a) * s * 0.55 + s * 0.48, y + Math.sin(a) * s * 0.55);
		b.arc(x + Math.cos(a) * s * 0.55, y + Math.sin(a) * s * 0.55, s * 0.48, 0, TAU);
	}
	b.fill();
	b.fillStyle = heart;
	b.beginPath();
	b.arc(x, y, s * 0.3, 0, TAU);
	b.fill();
}

/**
 * Creepers over the walls (call inside the scene's wall dress): the growth map picks how
 * overgrown each wall tile is; overgrown tiles join their overgrown neighbours with a wavy stem
 * and carry leaves (many where the map is high, a few where it is low) and the style's flowers.
 */
export function creepers(f: MeadowFrame, style: CreeperStyle): void {
	const { b } = f;
	const dens = (r: number, c: number) =>
		f.isW(r, c)
			? Math.max(0, Math.min(1, (growth(style.seed, r, c) - (1 - style.cover) + 0.15) * 2.2))
			: 0;
	const centre = (r: number, c: number, k: () => number): [number, number] => [
		c * T + T / 2 + (k() - 0.5) * 6,
		r * T + T / 2 + (k() - 0.5) * 6
	];
	// moss first, on the open edges of the overgrown tiles
	if (style.moss) {
		for (let r = 0; r < f.R; r += 1) {
			for (let c = 0; c < f.C; c += 1) {
				const d = dens(r, c);
				if (d <= 0.05) continue;
				const k = rng(hash(r * 13 + c * 59, style.seed + 1) * 1e6);
				const edges: Array<[number, number, boolean]> = [];
				if (!f.isW(r - 1, c)) edges.push([c * T + T / 2, r * T + 2.2, true]);
				if (!f.isW(r + 1, c)) edges.push([c * T + T / 2, (r + 1) * T - 2.2, true]);
				if (!f.isW(r, c - 1)) edges.push([c * T + 2.2, r * T + T / 2, false]);
				if (!f.isW(r, c + 1)) edges.push([(c + 1) * T - 2.2, r * T + T / 2, false]);
				for (const [ex, ey, hz] of edges) {
					for (let i = 0; i < 3; i += 1) {
						const mx = ex + (hz ? (k() - 0.5) * (T - 8) : (k() - 0.5) * 2);
						const my = ey + (hz ? (k() - 0.5) * 2 : (k() - 0.5) * (T - 8));
						if (nearCorner(f, mx, my, 10)) continue;
						b.fillStyle = style.moss[i % 2];
						b.beginPath();
						b.ellipse(mx, my, hz ? 2.6 + k() * 1.6 : 1.5, hz ? 1.5 : 2.6 + k() * 1.6, 0, 0, TAU);
						b.fill();
					}
				}
			}
		}
	}
	for (let r = 0; r < f.R; r += 1) {
		for (let c = 0; c < f.C; c += 1) {
			const d = dens(r, c);
			if (d <= 0.05) continue;
			const k = rng(hash(r * 71 + c * 19, style.seed) * 1e6);
			const [x, y] = centre(r, c, rng(hash(r * 7 + c * 3, style.seed + 2) * 1e6));
			// stems to the right and down neighbours that grow too (each joint drawn once)
			b.strokeStyle = style.stem;
			b.lineWidth = 0.7;
			b.lineCap = 'round';
			const pts: Array<[number, number]> = [[x, y]];
			for (const [dr, dc] of [
				[0, 1],
				[1, 0]
			] as const) {
				if (dens(r + dr, c + dc) <= 0.05) continue;
				const [nx, ny] = centre(
					r + dr,
					c + dc,
					rng(hash((r + dr) * 7 + (c + dc) * 3, style.seed + 2) * 1e6)
				);
				const wob = (k() - 0.5) * 8;
				const qx = (x + nx) / 2 + (dr ? wob : 0);
				const qy = (y + ny) / 2 + (dc ? wob : 0);
				b.beginPath();
				b.moveTo(x, y);
				b.quadraticCurveTo(qx, qy, nx, ny);
				b.stroke();
				for (let i = 1; i < 4; i += 1) {
					const t = i / 4;
					pts.push([
						(1 - t) * (1 - t) * x + 2 * (1 - t) * t * qx + t * t * nx,
						(1 - t) * (1 - t) * y + 2 * (1 - t) * t * qy + t * t * ny
					]);
				}
			}
			// a curl of its own where the tile grows alone
			if (pts.length === 1) {
				const a = k() * TAU;
				b.beginPath();
				b.moveTo(x, y);
				b.quadraticCurveTo(
					x + Math.cos(a) * 6,
					y + Math.sin(a) * 2,
					x + Math.cos(a + 1) * 7,
					y + Math.sin(a + 1) * 7
				);
				b.stroke();
				pts.push([x + Math.cos(a + 1) * 5, y + Math.sin(a + 1) * 5]);
			}
			// leaves in clusters: a dense mat where the map is high, a few where it is low
			const n = Math.round(2 + d * 20);
			for (let i = 0; i < n; i += 1) {
				const [px, py] = pts[(k() * pts.length) | 0];
				const lx = px + (k() - 0.5) * (6 + d * 8);
				const ly = py + (k() - 0.5) * (6 + d * 8);
				if (nearCorner(f, lx, ly, 10)) continue;
				const s = style.leaf * (0.8 + k() * 0.45);
				// a soft shadow under the leaf lifts it off the stone
				b.fillStyle = 'rgba(20,30,10,.22)';
				b.beginPath();
				b.arc(lx + 0.6, ly + 0.8, s * 0.7, 0, TAU);
				b.fill();
				leafAt(b, lx, ly, s, k() * TAU, style.leaves[(k() * style.leaves.length) | 0], style.shape);
			}
			const fl = style.flowers;
			if (fl && k() < fl.rate * d) {
				const [px, py] = pts[(k() * pts.length) | 0];
				if (!nearCorner(f, px, py, 10))
					flowerAt(b, px + 1, py - 1, 2.3, fl.petals[(k() * fl.petals.length) | 0], fl.heart);
			}
		}
	}
}

/**
 * A green band at the walls' feet (`paintWalls`'s `foot`, under the stones): a damp shade round the
 * silhouette and soft tufts along it, in the season's tones.
 */
export function greenFoot(
	f: MeadowFrame,
	band: string,
	tufts: readonly string[],
	seed: number
): void {
	const { b } = f;
	const r = rng(seed);
	b.save();
	b.lineJoin = 'round';
	b.strokeStyle = band;
	b.lineWidth = 4;
	b.stroke(wallClip(f, 0.6));
	for (let rr = 0; rr < f.R; rr += 1) {
		for (let c = 0; c < f.C; c += 1) {
			if (!f.isW(rr, c)) continue;
			const x = c * T;
			const y = rr * T;
			for (let s = 2.5; s < T; s += 4.5) {
				const tuft = (tx: number, ty: number, hz: boolean) => {
					b.fillStyle = tufts[(r() * tufts.length) | 0];
					b.beginPath();
					b.ellipse(
						tx,
						ty,
						hz ? 1.9 + r() : 1 + r() * 0.5,
						hz ? 1 + r() * 0.5 : 1.9 + r(),
						0,
						0,
						TAU
					);
					b.fill();
				};
				const o = 0.5 + r() * 0.8;
				if (!f.isW(rr - 1, c)) tuft(x + s, y - o, true);
				if (!f.isW(rr + 1, c)) tuft(x + s, y + T + o, true);
				if (!f.isW(rr, c - 1)) tuft(x - o, y + s, false);
				if (!f.isW(rr, c + 1)) tuft(x + T + o, y + s, false);
			}
		}
	}
	b.restore();
}
