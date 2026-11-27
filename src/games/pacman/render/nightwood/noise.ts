// Small seeded helpers of the night forest's painters: a generator, lattice value noise (tileable
// when given a period) and a few maths. Pure.
export const TAU = Math.PI * 2;
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
export const clamp = (v: number, lo = 0, hi = 1): number => Math.max(lo, Math.min(hi, v));
export const smoothstep = (e0: number, e1: number, x: number): number => {
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

const lattice = (x: number, y: number, s: number): number => {
	const v = Math.sin(x * 127.1 + y * 311.7 + s * 74.7) * 43758.5453;
	return v - Math.floor(v);
};

/** A number 0..1 from two coordinates. */
export const hash2 = (a: number, b: number): number => lattice(a, b, 0);

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
	for (let o = 0; o < octaves; o += 1) {
		sum += amp * vnoise(x * f, y * f, s + o * 5);
		norm += amp;
		amp *= 0.5;
		f *= 2;
	}
	return sum / norm;
}
