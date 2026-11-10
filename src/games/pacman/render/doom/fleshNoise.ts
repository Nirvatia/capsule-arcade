// Painting helpers of the flesh hell (the owner's accepted scene,
// `prototypes/pacman/art/hell-flesh-scene.html`): a seeded generator, value noise for the flow
// of the muscle fibres, canvas masks (tint, edge, blur, threshold, clip) and the two organic
// strokes the whole world is made of: a fibre and a vein. Everything is written in the scene's
// own units (a tile is 32); `fleshBake` scales them to the game's world.

export type Rng = () => number;

export type Rgb = readonly [number, number, number];

export function rng(seed: number): Rng {
	let a = seed >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

export function makeCanvas(w: number, h: number): HTMLCanvasElement {
	const c = document.createElement('canvas');
	c.width = Math.max(1, Math.ceil(w));
	c.height = Math.max(1, Math.ceil(h));
	return c;
}

export function context(c: HTMLCanvasElement): CanvasRenderingContext2D {
	const x = c.getContext('2d');
	if (!x) {
		throw new Error('fleshNoise: 2d context unavailable');
	}
	return x;
}

export const mixN = (a: number, b: number, t: number): number => a + (b - a) * t;

function hash2(x: number, y: number): number {
	const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
	return s - Math.floor(s);
}

function valueNoise(x: number, y: number): number {
	const xi = Math.floor(x);
	const yi = Math.floor(y);
	let xf = x - xi;
	let yf = y - yi;
	xf = xf * xf * (3 - 2 * xf);
	yf = yf * yf * (3 - 2 * yf);
	return mixN(
		mixN(hash2(xi, yi), hash2(xi + 1, yi), xf),
		mixN(hash2(xi, yi + 1), hash2(xi + 1, yi + 1), xf),
		yf
	);
}

/** Smooth noise, 0..1: the flow of the fibres, the mottling of the skin. */
export function fbm(x: number, y: number): number {
	return (
		0.5 * valueNoise(x, y) +
		0.25 * valueNoise(x * 2, y * 2) +
		0.125 * valueNoise(x * 4, y * 4) +
		0.0625 * valueNoise(x * 8, y * 8)
	);
}

export function hexRgb(h: string): Rgb {
	const n = parseInt(h.slice(1), 16);
	return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function mixHex(a: string, b: string, t: number): string {
	const x = hexRgb(a);
	const y = hexRgb(b);
	return `rgb(${Math.round(mixN(x[0], y[0], t))},${Math.round(mixN(x[1], y[1], t))},${Math.round(mixN(x[2], y[2], t))})`;
}

export function rgbaOf(h: string, a: number): string {
	const x = hexRgb(h);
	return `rgba(${x[0]},${x[1]},${x[2]},${a})`;
}

/** A copy of `src` painted all in `color`, keeping its shape. */
export function tint(src: HTMLCanvasElement, color: string): HTMLCanvasElement {
	const c = makeCanvas(src.width, src.height);
	const x = context(c);
	x.drawImage(src, 0, 0);
	x.globalCompositeOperation = 'source-in';
	x.fillStyle = color;
	x.fillRect(0, 0, c.width, c.height);
	return c;
}

/** The part of `src` that is not covered when `src` is moved by (dx, dy): a one-sided edge. */
export function edgeOf(src: HTMLCanvasElement, dx: number, dy: number): HTMLCanvasElement {
	const c = makeCanvas(src.width, src.height);
	const x = context(c);
	x.drawImage(src, 0, 0);
	x.globalCompositeOperation = 'destination-out';
	x.drawImage(src, dx, dy);
	return c;
}

/** A cheap blur: down by halves and back up (twice when `up`). */
export function blur(src: HTMLCanvasElement, steps: number, up: boolean): HTMLCanvasElement {
	let cur = src;
	let w = src.width;
	let h = src.height;
	for (let i = 0; i < steps; i += 1) {
		w = Math.max(1, w >> 1);
		h = Math.max(1, h >> 1);
		const s = makeCanvas(w, h);
		const sx = context(s);
		sx.imageSmoothingEnabled = true;
		sx.drawImage(cur, 0, 0, w, h);
		cur = s;
	}
	const d = makeCanvas(src.width, src.height);
	const dx = context(d);
	dx.imageSmoothingEnabled = true;
	dx.imageSmoothingQuality = 'high';
	dx.drawImage(cur, 0, 0, d.width, d.height);
	return up ? blur(d, steps, false) : d;
}

/** Pushes the alpha of a blurred mask towards 0 or 1: a soft shape becomes a rounded one. */
export function threshold(c: HTMLCanvasElement, k: number): HTMLCanvasElement {
	const x = context(c);
	const im = x.getImageData(0, 0, c.width, c.height);
	const d = im.data;
	for (let i = 3; i < d.length; i += 4) {
		const a = Math.min(1, Math.max(0, (d[i] / 255 - 0.5) * k + 0.5));
		d[i] = a * 255;
		d[i - 3] = 255;
		d[i - 2] = 255;
		d[i - 1] = 255;
	}
	x.putImageData(im, 0, 0);
	return c;
}

/** `tex` kept only where `mask` is opaque. */
export function clipTo(tex: HTMLCanvasElement, mask: HTMLCanvasElement): HTMLCanvasElement {
	const c = makeCanvas(tex.width, tex.height);
	const x = context(c);
	x.drawImage(tex, 0, 0);
	x.globalCompositeOperation = 'destination-in';
	x.drawImage(mask, 0, 0);
	return c;
}

/**
 * Muscle fibres: short curved strokes that follow the flow field (`dir` undefined) or a given
 * direction, dark and light, scattered over a rectangle.
 */
export function fibres(
	x: CanvasRenderingContext2D,
	count: number,
	r: Rng,
	x0: number,
	y0: number,
	w: number,
	h: number,
	dark: string,
	light: string,
	dir?: number
): void {
	for (let i = 0; i < count; i += 1) {
		const px = x0 + r() * w;
		const py = y0 + r() * h;
		const len = 10 + r() * 30;
		const a = dir === undefined ? fbm(px / 240, py / 240) * 9.4 : dir + (r() - 0.5) * 0.5;
		const mx = px + Math.cos(a) * len * 0.5;
		const my = py + Math.sin(a) * len * 0.5;
		const b = a + (r() - 0.5) * 0.6;
		const ex = mx + Math.cos(b) * len * 0.5;
		const ey = my + Math.sin(b) * len * 0.5;
		x.strokeStyle = r() < 0.55 ? dark : light;
		x.lineWidth = 0.8 + r() * 2.2;
		x.beginPath();
		x.moveTo(px, py);
		x.quadraticCurveTo(mx, my, ex, ey);
		x.stroke();
	}
}

/** A vein: a polyline with its running length and width, and the phase of its blood. */
export interface Vein {
	readonly pts: ReadonlyArray<readonly [number, number]>;
	readonly cum: readonly number[];
	readonly len: number;
	readonly w: number;
	readonly ph: number;
}

/** Grows a vein from (x, y) heading `a`, branching now and then; pushes every branch to `out`. */
export function growVein(
	x: number,
	y: number,
	a: number,
	w: number,
	steps: number,
	depth: number,
	r: Rng,
	out: Vein[],
	box: { readonly w: number; readonly h: number }
): void {
	const pts: Array<[number, number]> = [[x, y]];
	for (let i = 0; i < steps; i += 1) {
		a += (r() - 0.5) * 0.4 + (fbm(x / 180, y / 180) - 0.5) * 0.25;
		x += Math.cos(a) * 9;
		y += Math.sin(a) * 9;
		pts.push([x, y]);
		if (x < -40 || x > box.w + 40 || y < -40 || y > box.h + 40) {
			break;
		}
		if (depth < 3 && r() < 0.045 && out.length < 60) {
			growVein(
				x,
				y,
				a + (r() < 0.5 ? -1 : 1) * (0.5 + r() * 0.7),
				w * 0.62,
				Math.floor((steps - i) * 0.7),
				depth + 1,
				r,
				out,
				box
			);
		}
	}
	const cum = [0];
	for (let k = 1; k < pts.length; k += 1) {
		cum.push(cum[k - 1] + Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]));
	}
	if (pts.length > 3) {
		out.push({ pts, cum, len: cum[cum.length - 1], w, ph: r() });
	}
}

/** A point `d` along a vein. */
export function veinAt(v: Vein, d: number): readonly [number, number] {
	let k = 1;
	while (k < v.cum.length - 1 && v.cum[k] < d) {
		k += 1;
	}
	const u = (d - v.cum[k - 1]) / Math.max(1e-6, v.cum[k] - v.cum[k - 1]);
	return [mixN(v.pts[k - 1][0], v.pts[k][0], u), mixN(v.pts[k - 1][1], v.pts[k][1], u)];
}
