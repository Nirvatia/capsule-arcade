// Prototype `nightwood`: the boss world "light against the dark" (the owner's pick of the ideas,
// 2026-11-27: a night forest after the manner of Alan Wake). This module bakes the forest once per
// size: a mossy floor with packed-earth trails soft at their edges, needles, pebbles and tufts,
// the maze's walls as pine thickets seen from above (shadowed, moon-lit boughs), boulders and
// fences here and there, the scorched clearing of the lair, and the lamp posts. All of it is
// drawn in code. Lighting, fog and the actors are `nightArt.ts`.
import type { GridMatrix } from '../../../src/games/pacman/config/gridConfig';

export type Kind = 'wall' | 'void' | 'open' | 'lair';
const LAIR = new Set(['LE', 'LT', 'BY', 'IY', 'PY', 'CE']);
export const kindOf = (t: string | undefined): Kind =>
	t === undefined || t === 'ES' ? 'void' : t === 'WL' ? 'wall' : LAIR.has(t) ? 'lair' : 'open';

export const TAU = Math.PI * 2;
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const clamp = (v: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));
export const smoothstep = (e0: number, e1: number, x: number) => {
	const t = clamp((x - e0) / (e1 - e0));
	return t * t * (3 - 2 * t);
};

/** A small seeded generator, 0..1. */
export function rng(seed: number): () => number {
	let a = seed >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = a;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

const lattice = (x: number, y: number, s: number) => {
	const v = Math.sin(x * 127.1 + y * 311.7 + s * 74.7) * 43758.5453;
	return v - Math.floor(v);
};

/** Value noise; with `period` the lattice wraps, so the texture tiles. */
export function vnoise(x: number, y: number, s = 0, period = 0): number {
	const ix = Math.floor(x);
	const iy = Math.floor(y);
	const fx = x - ix;
	const fy = y - iy;
	const w = (i: number) => (period ? ((i % period) + period) % period : i);
	const a = lattice(w(ix), w(iy), s);
	const b = lattice(w(ix + 1), w(iy), s);
	const c = lattice(w(ix), w(iy + 1), s);
	const d = lattice(w(ix + 1), w(iy + 1), s);
	const u = fx * fx * (3 - 2 * fx);
	const v = fy * fy * (3 - 2 * fy);
	return lerp(lerp(a, b, u), lerp(c, d, u), v);
}

export function fbm(x: number, y: number, s = 0, octaves = 3): number {
	let sum = 0;
	let amp = 0.5;
	let f = 1;
	let norm = 0;
	for (let o = 0; o < octaves; o++) {
		sum += amp * vnoise(x * f, y * f, s + o * 5);
		norm += amp;
		amp *= 0.5;
		f *= 2;
	}
	return sum / norm;
}

type Ctx = CanvasRenderingContext2D;
export type RGB = readonly [number, number, number];

const canvasOf = (w: number, h: number): HTMLCanvasElement => {
	const c = document.createElement('canvas');
	c.width = Math.max(1, Math.round(w));
	c.height = Math.max(1, Math.round(h));
	return c;
};

/** Fills the (css-unit) rectangle by a colour function sampled every `cell` units, upscaled smooth. */
function noiseFill(c: Ctx, W: number, H: number, cell: number, fn: (x: number, y: number) => RGB): void {
	const w = Math.ceil(W / cell);
	const h = Math.ceil(H / cell);
	const small = canvasOf(w, h);
	const sc = small.getContext('2d') as Ctx;
	const img = sc.createImageData(w, h);
	for (let y = 0; y < h; y++)
		for (let x = 0; x < w; x++) {
			const [r, g, b] = fn(x * cell, y * cell);
			const i = (y * w + x) * 4;
			img.data[i] = r;
			img.data[i + 1] = g;
			img.data[i + 2] = b;
			img.data[i + 3] = 255;
		}
	sc.putImageData(img, 0, 0);
	c.save();
	c.imageSmoothingEnabled = true;
	c.imageSmoothingQuality = 'high';
	c.drawImage(small, 0, 0, W, H);
	c.restore();
}

export interface Lamp {
	/** The light's origin in tiles (a tile centre) and the post's place beside it, in tiles. */
	readonly x: number;
	readonly y: number;
	readonly postX: number;
	readonly postY: number;
	/** How far it reaches, tiles. */
	readonly r: number;
}

export interface Forest {
	readonly canvas: HTMLCanvasElement;
	readonly cols: number;
	readonly rows: number;
	readonly S: number;
	readonly D: number;
	readonly lamps: Lamp[];
	/** The lair clearing's centre, tiles. */
	readonly lair: { readonly x: number; readonly y: number };
}

// ------------------------------------------------------------------------------------- trees

interface Tree {
	readonly x: number;
	readonly y: number;
	readonly R: number;
	readonly seed: number;
	readonly deep: boolean;
}

/** A pine from above: a soft shadow is painted apart; this is the crown, three layers of boughs,
 *  the moon-side tips pale. */
function pine(c: Ctx, t: Tree): void {
	const rnd = rng(t.seed);
	const { x, y, R } = t;
	const base = c.createRadialGradient(x - R * 0.25, y - R * 0.3, R * 0.05, x, y, R);
	base.addColorStop(0, t.deep ? '#0b1a14' : '#14291f');
	base.addColorStop(1, '#050d09');
	c.fillStyle = base;
	c.beginPath();
	c.arc(x, y, R * 0.92, 0, TAU);
	c.fill();
	const layers: Array<[string, string, number, number]> = t.deep
		? [['#07130d', '#0d2218', 11, 1]]
		: [
				['#0a1a12', '#10281c', 13, 1],
				['#0f241a', '#183829', 14, 0.78],
				['#15301f', '#244a38', 15, 0.55]
			];
	layers.forEach(([dark, light, n, len], li) => {
		for (let i = 0; i < n; i++) {
			const a = (i / n) * TAU + rnd() * 0.45 + li * 0.35;
			const r1 = R * len * (0.82 + rnd() * 0.28);
			const bend = (rnd() - 0.5) * 0.5;
			const tx = x + Math.cos(a + bend) * r1;
			const ty = y + Math.sin(a + bend) * r1;
			const mx = x + Math.cos(a - bend * 0.6) * r1 * 0.55;
			const my = y + Math.sin(a - bend * 0.6) * r1 * 0.55;
			c.lineCap = 'round';
			c.strokeStyle = dark;
			c.lineWidth = R * (0.2 - li * 0.035);
			c.beginPath();
			c.moveTo(x + Math.cos(a) * R * 0.1, y + Math.sin(a) * R * 0.1);
			c.quadraticCurveTo(mx, my, tx, ty);
			c.stroke();
			// needles: the moon-side boughs carry a paler, cooler tip
			const facing = -Math.cos(a) * 0.55 - Math.sin(a) * 0.83;
			if (facing > 0.1) {
				c.strokeStyle = light;
				c.globalAlpha = 0.35 + 0.65 * facing;
				c.lineWidth = R * (0.12 - li * 0.02);
				c.beginPath();
				c.moveTo(mx, my);
				c.quadraticCurveTo((mx + tx) / 2 + 0.5, (my + ty) / 2, tx, ty);
				c.stroke();
				c.globalAlpha = 1;
			}
		}
	});
	c.fillStyle = '#04100a';
	c.beginPath();
	c.arc(x, y, R * 0.12, 0, TAU);
	c.fill();
}

function boulder(c: Ctx, x: number, y: number, r: number, rnd: () => number): void {
	const a = rnd() * TAU;
	c.save();
	c.translate(x, y);
	c.rotate(a);
	const sh = c.createRadialGradient(0.2 * r, 0.3 * r, 0, 0.2 * r, 0.3 * r, r * 1.25);
	sh.addColorStop(0, 'rgba(0,0,0,0.5)');
	sh.addColorStop(1, 'rgba(0,0,0,0)');
	c.fillStyle = sh;
	c.beginPath();
	c.ellipse(0.2 * r, 0.3 * r, r * 1.25, r * 1.0, 0, 0, TAU);
	c.fill();
	c.rotate(-a);
	const g = c.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r * 1.1);
	g.addColorStop(0, '#5a6a74');
	g.addColorStop(0.55, '#2a343c');
	g.addColorStop(1, '#10161b');
	c.fillStyle = g;
	c.beginPath();
	c.ellipse(0, 0, r * 1.05, r * 0.82, a, 0, TAU);
	c.fill();
	c.strokeStyle = 'rgba(160,190,205,0.35)';
	c.lineWidth = Math.max(1, r * 0.08);
	c.beginPath();
	c.ellipse(0, 0, r * 0.98, r * 0.76, a, Math.PI * 1.05, Math.PI * 1.55);
	c.stroke();
	c.fillStyle = 'rgba(52,86,52,0.55)';
	c.beginPath();
	c.ellipse(r * 0.3, r * 0.25, r * 0.4, r * 0.22, a, 0, TAU);
	c.fill();
	c.restore();
}

// -------------------------------------------------------------------------------------- bake

export function bakeForest(grid: GridMatrix, S: number, D: number, seed = 11): Forest {
	const rows = grid.length;
	const cols = grid[0]?.length ?? 0;
	const W = cols * S;
	const H = rows * S;
	const canvas = canvasOf(W * D, H * D);
	const c = canvas.getContext('2d') as Ctx;
	c.scale(D, D);
	const rnd = rng(seed);
	const kind = (x: number, y: number) => kindOf(grid[y]?.[x]);
	const near = (x: number, y: number, k: Kind) =>
		[
			[1, 0],
			[-1, 0],
			[0, 1],
			[0, -1]
		].some(([dx, dy]) => kind(x + dx, y + dy) === k);

	// the floor: moss and needle litter in broad soft patches
	noiseFill(c, W, H, 3, (x, y) => {
		const n1 = fbm(x / 110, y / 110, 1, 3);
		const n2 = fbm(x / 26, y / 26, 2, 3);
		let r = lerp(13, 27, n1);
		let g = lerp(23, 41, n1);
		let b = lerp(18, 28, n1);
		const dry = smoothstep(0.55, 0.8, n2) * 0.7;
		r = lerp(r, 46, dry);
		g = lerp(g, 38, dry);
		b = lerp(b, 22, dry);
		return [r, g, b];
	});

	// the trails: packed earth, its edges soft
	const mask = canvasOf(W * D, H * D);
	const mc = mask.getContext('2d') as Ctx;
	mc.fillStyle = '#fff';
	const trail = canvasOf(W * D, H * D);
	const tc = trail.getContext('2d') as Ctx;
	tc.scale(D, D);
	grid.forEach((row, y) =>
		row.forEach((_, x) => {
			if (kind(x, y) === 'open') mc.fillRect(x * S * D - 1, y * S * D - 1, S * D + 2, S * D + 2);
		})
	);
	noiseFill(tc, W, H, 2, (x, y) => {
		const n = fbm(x / 34, y / 34, 3, 3);
		const f = fbm(x / 7, y / 7, 4, 2);
		return [lerp(50, 78, n) + f * 12, lerp(43, 65, n) + f * 10, lerp(32, 46, n) + f * 7];
	});
	tc.setTransform(1, 0, 0, 1, 0, 0);
	tc.globalCompositeOperation = 'destination-in';
	tc.filter = `blur(${S * D * 0.11}px)`;
	tc.drawImage(mask, 0, 0);
	tc.filter = 'none';
	c.drawImage(trail, 0, 0, W, H);

	// needles, pebbles and tufts
	c.lineCap = 'round';
	for (let i = 0; i < (W * H) / 70; i++) {
		const x = rnd() * W;
		const y = rnd() * H;
		const a = rnd() * TAU;
		const l = 2 + rnd() * 3.5;
		c.strokeStyle = rnd() < 0.6 ? 'rgba(74,58,30,0.5)' : 'rgba(30,60,36,0.55)';
		c.lineWidth = 0.8;
		c.beginPath();
		c.moveTo(x, y);
		c.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
		c.stroke();
	}
	grid.forEach((row, y) =>
		row.forEach((_, x) => {
			if (kind(x, y) !== 'open') return;
			for (let i = 0; i < 3; i++) {
				const px = (x + rnd()) * S;
				const py = (y + rnd()) * S;
				const r = 0.7 + rnd() * 1.4;
				c.fillStyle = 'rgba(0,0,0,0.35)';
				c.beginPath();
				c.ellipse(px + 0.6, py + 0.8, r, r * 0.7, 0, 0, TAU);
				c.fill();
				c.fillStyle = rnd() < 0.5 ? 'rgba(124,126,118,0.7)' : 'rgba(92,86,74,0.8)';
				c.beginPath();
				c.ellipse(px, py, r, r * 0.7, 0, 0, TAU);
				c.fill();
			}
			// grass tufts where the trail meets a thicket
			if (near(x, y, 'wall') && rnd() < 0.6) {
				const px = (x + rnd()) * S;
				const py = (y + rnd()) * S;
				c.strokeStyle = 'rgba(54,86,44,0.8)';
				c.lineWidth = 1;
				for (let k = 0; k < 4; k++) {
					c.beginPath();
					c.moveTo(px + k - 1.5, py);
					c.lineTo(px + (k - 1.5) * 1.8, py - 3 - rnd() * 3);
					c.stroke();
				}
			}
		})
	);

	// the lair's clearing: scorched ground, cracks reaching out
	let lx = 0;
	let ly = 0;
	let ln = 0;
	grid.forEach((row, y) =>
		row.forEach((_, x) => {
			if (kind(x, y) === 'lair') {
				lx += x + 0.5;
				ly += y + 0.5;
				ln++;
			}
		})
	);
	const lair = { x: ln ? lx / ln : cols / 2, y: ln ? ly / ln : rows / 2 };
	{
		const cx = lair.x * S;
		const cy = lair.y * S;
		const g = c.createRadialGradient(cx, cy, 0, cx, cy, S * 3.1);
		g.addColorStop(0, 'rgba(4,6,9,0.96)');
		g.addColorStop(0.6, 'rgba(10,13,17,0.85)');
		g.addColorStop(1, 'rgba(10,13,17,0)');
		c.fillStyle = g;
		c.beginPath();
		c.arc(cx, cy, S * 3.1, 0, TAU);
		c.fill();
		c.strokeStyle = 'rgba(0,0,0,0.65)';
		for (let i = 0; i < 14; i++) {
			const a = (i / 14) * TAU + rnd() * 0.3;
			let px = cx + Math.cos(a) * S * 0.6;
			let py = cy + Math.sin(a) * S * 0.6;
			c.lineWidth = 1.4;
			c.beginPath();
			c.moveTo(px, py);
			for (let k = 0; k < 4; k++) {
				px += Math.cos(a + (rnd() - 0.5) * 0.7) * S * 0.5;
				py += Math.sin(a + (rnd() - 0.5) * 0.7) * S * 0.5;
				c.lineTo(px, py);
			}
			c.stroke();
		}
	}

	// the thickets: shadows first, then the crowns from the back to the front
	const trees: Tree[] = [];
	let id = 0;
	grid.forEach((row, y) =>
		row.forEach((_, x) => {
			const k = kind(x, y);
			if (k !== 'wall' && k !== 'void') return;
			const edge = near(x, y, 'open') || near(x, y, 'lair');
			const deep = k === 'void';
			const n = edge ? 1 : deep ? 1 : 2;
			for (let i = 0; i < n; i++) {
				const j = edge ? 0.12 : 0.28;
				const R = S * (edge ? 0.58 + rnd() * 0.06 : deep ? 0.8 + rnd() * 0.15 : i ? 0.55 : 0.78);
				trees.push({
					x: (x + 0.5 + (rnd() - 0.5) * 2 * j) * S,
					y: (y + 0.5 + (rnd() - 0.5) * 2 * j) * S,
					R,
					seed: seed * 1000 + id++,
					deep
				});
			}
		})
	);
	trees.sort((a, b) => a.y - b.y);
	for (const t of trees) {
		const g = c.createRadialGradient(t.x + t.R * 0.2, t.y + t.R * 0.26, 0, t.x + t.R * 0.2, t.y + t.R * 0.26, t.R * 1.1);
		g.addColorStop(0, 'rgba(0,0,0,0.5)');
		g.addColorStop(1, 'rgba(0,0,0,0)');
		c.fillStyle = g;
		c.beginPath();
		c.arc(t.x + t.R * 0.2, t.y + t.R * 0.26, t.R * 1.1, 0, TAU);
		c.fill();
	}
	for (const t of trees) pine(c, t);

	// boulders among the thickets, fences along some trails
	grid.forEach((row, y) =>
		row.forEach((_, x) => {
			if (kind(x, y) !== 'wall') return;
			if (rnd() < 0.09 && !near(x, y, 'open'))
				boulder(c, (x + 0.5) * S, (y + 0.5) * S, S * (0.28 + rnd() * 0.16), rng(seed + x * 31 + y));
			const dirs: Array<[number, number]> = [
				[1, 0],
				[-1, 0],
				[0, 1],
				[0, -1]
			];
			for (const [dx, dy] of dirs) {
				if (kind(x + dx, y + dy) !== 'open' || lattice(x, y, dx * 3 + dy) > 0.16) continue;
				// the fence stands on the tile's edge toward the trail
				const ex = (x + 0.5 + dx * 0.5) * S;
				const ey = (y + 0.5 + dy * 0.5) * S;
				const ux = -dy;
				const uy = dx;
				c.strokeStyle = 'rgba(0,0,0,0.4)';
				c.lineWidth = 3.4;
				c.beginPath();
				c.moveTo(ex + ux * S * 0.5 + 1, ey + uy * S * 0.5 + 1.5);
				c.lineTo(ex - ux * S * 0.5 + 1, ey - uy * S * 0.5 + 1.5);
				c.stroke();
				c.strokeStyle = '#4a3622';
				c.lineWidth = 2.4;
				c.beginPath();
				c.moveTo(ex + ux * S * 0.5, ey + uy * S * 0.5);
				c.lineTo(ex - ux * S * 0.5, ey - uy * S * 0.5);
				c.stroke();
				c.strokeStyle = '#8a6e48';
				c.lineWidth = 0.8;
				c.stroke();
				for (const p of [-0.42, 0, 0.42]) {
					const px = ex + ux * S * p;
					const py = ey + uy * S * p;
					c.fillStyle = '#2c1f12';
					c.fillRect(px - 2.2, py - 2.2, 4.4, 4.4);
					c.fillStyle = '#7a5e3c';
					c.fillRect(px - 1.6, py - 1.8, 3, 2.2);
				}
			}
		})
	);

	// the lamps: along the trails, away from the clearing and from each other
	const cand: Array<[number, number, number, number]> = [];
	grid.forEach((row, y) =>
		row.forEach((_, x) => {
			if (kind(x, y) !== 'open') return;
			if (Math.hypot(x + 0.5 - lair.x, y + 0.5 - lair.y) < 4) return;
			const dirs: Array<[number, number]> = [
				[1, 0],
				[-1, 0],
				[0, 1],
				[0, -1]
			];
			const d = dirs.find(([dx, dy]) => kind(x + dx, y + dy) === 'wall');
			if (d) cand.push([x, y, d[0], d[1]]);
		})
	);
	cand.sort((a, b) => lattice(a[0], a[1], 9) - lattice(b[0], b[1], 9));
	const lamps: Lamp[] = [];
	for (const [x, y, dx, dy] of cand) {
		if (lamps.length >= 8) break;
		if (lamps.some((l) => Math.hypot(l.x - (x + 0.5), l.y - (y + 0.5)) < 8)) continue;
		lamps.push({ x: x + 0.5, y: y + 0.5, postX: x + 0.5 + dx * 0.4, postY: y + 0.5 + dy * 0.4, r: 4.4 });
	}
	for (const l of lamps) {
		const px = l.postX * S;
		const py = l.postY * S;
		c.fillStyle = 'rgba(0,0,0,0.45)';
		c.beginPath();
		c.ellipse(px + 1.5, py + 2.2, S * 0.17, S * 0.12, 0, 0, TAU);
		c.fill();
		c.fillStyle = '#0b0d11';
		c.beginPath();
		c.arc(px, py, S * 0.15, 0, TAU);
		c.fill();
		c.fillStyle = '#2c333b';
		c.beginPath();
		c.arc(px - S * 0.015, py - S * 0.02, S * 0.11, 0, TAU);
		c.fill();
		c.strokeStyle = 'rgba(190,210,225,0.4)';
		c.lineWidth = 1;
		c.beginPath();
		c.arc(px, py, S * 0.1, Math.PI * 1.1, Math.PI * 1.6);
		c.stroke();
	}
	return { canvas, cols, rows, S, D, lamps, lair };
}
