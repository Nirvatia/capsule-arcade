// The hell's drawing language for the «Плоть» kit (`fleshKit`), carried over from the owner's pick in
// the `hell-kit` prototype: the same tools the game's demons and pickups
// use (`hellGhost`: the ghost outline, cel bands, horns, scowling eyes; `doomItems`: a part filled and
// inked, linear tones, an additive bloom), plus a generic cel fill for any path: the mid tone, a lit
// patch toward the light (upper left), a shade crescent away from it, a heavy ink line, a rim light.

export { INK, ghostPath, celBands, drawHorns, drawEyes, lightGlow } from './hellGhost';
export type { GhostShape } from './hellGhost';
import { INK } from './hellGhost';

export type Ctx = CanvasRenderingContext2D;
export type Dir = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
export const TAU = Math.PI * 2;
export const VEC: Record<Dir, readonly [number, number]> = {
	UP: [0, -1],
	DOWN: [0, 1],
	LEFT: [-1, 0],
	RIGHT: [1, 0]
};
export const ANGLE: Record<Dir, number> = {
	UP: -Math.PI / 2,
	DOWN: Math.PI / 2,
	LEFT: Math.PI,
	RIGHT: 0
};

export interface Tones {
	readonly light: string;
	readonly mid: string;
	readonly shade: string;
}

export function linear(
	c: Ctx,
	x0: number,
	y0: number,
	x1: number,
	y1: number,
	stops: readonly string[]
): CanvasGradient {
	const g = c.createLinearGradient(x0, y0, x1, y1);
	stops.forEach((s, i) => g.addColorStop(i / (stops.length - 1), s));
	return g;
}

export function radial(
	c: Ctx,
	x: number,
	y: number,
	r0: number,
	r1: number,
	stops: readonly string[]
): CanvasGradient {
	const g = c.createRadialGradient(x, y, r0, x, y, r1);
	stops.forEach((s, i) => g.addColorStop(i / (stops.length - 1), s));
	return g;
}

/** The ink line at a thickness relative to `S` (never thinner than a pixel and a half). */
export function ink(c: Ctx, S: number, k = 1): void {
	c.lineWidth = Math.max(1.3, S * 0.05 * k);
	c.strokeStyle = INK;
	c.lineJoin = 'round';
	c.lineCap = 'round';
	c.stroke();
}

/** A part: its fill, then the ink line round it. */
export function part(
	c: Ctx,
	path: () => void,
	fill: string | CanvasGradient,
	S: number,
	k = 1
): void {
	path();
	c.fillStyle = fill;
	c.fill();
	path();
	ink(c, S, k);
}

/**
 * A cel-shaded part: the mid tone, then (clipped to it) a lit patch toward the upper left and a shade
 * crescent toward the lower right, then the ink line and a short rim light on the lit edge.
 * (cx, cy, r) is the part's centre and rough radius, which place the bands.
 */
export function cel(
	c: Ctx,
	path: () => void,
	t: Tones,
	cx: number,
	cy: number,
	r: number,
	S: number,
	k = 1
): void {
	path();
	c.fillStyle = t.mid;
	c.fill();
	c.save();
	path();
	c.clip();
	c.fillStyle = t.light;
	c.beginPath();
	c.ellipse(cx - r * 0.3, cy - r * 0.35, r * 0.85, r * 0.6, -0.5, 0, TAU);
	c.fill();
	c.fillStyle = t.shade;
	c.beginPath();
	c.rect(cx - r * 3, cy - r * 3, r * 6, r * 6);
	c.ellipse(cx - r * 0.2, cy - r * 0.2, r * 1.15, r * 1.15, 0, 0, TAU);
	c.fill('evenodd');
	c.restore();
	path();
	ink(c, S, k);
}

/** A rim light: a short pale arc on the upper left of a round part. */
export function rim(
	c: Ctx,
	cx: number,
	cy: number,
	r: number,
	S: number,
	color = 'rgba(255,240,220,.75)'
): void {
	c.save();
	c.strokeStyle = color;
	c.lineWidth = Math.max(1, S * 0.03);
	c.lineCap = 'round';
	c.beginPath();
	c.arc(cx, cy, r * 0.82, Math.PI * 1.08, Math.PI * 1.6);
	c.stroke();
	c.restore();
}

/** A small hard gloss, the heroes' highlight. */
export function gloss(
	c: Ctx,
	x: number,
	y: number,
	w: number,
	h: number,
	a = 0.8,
	rot = -0.5
): void {
	c.fillStyle = `rgba(255,255,255,${a})`;
	c.beginPath();
	c.ellipse(x, y, w, h, rot, 0, TAU);
	c.fill();
}

/** The soft dark contact shadow of a thing lying on the floor, down and right. */
export function shadow(c: Ctx, x: number, y: number, rx: number, ry: number, a = 0.45): void {
	c.fillStyle = `rgba(8,1,3,${a})`;
	c.beginPath();
	c.ellipse(x + rx * 0.16, y + ry * 0.6, rx, ry, 0, 0, TAU);
	c.fill();
}

/** An additive bloom (only for what burns: the energizer, the plasma, a hot seam). */
export function bloom(c: Ctx, x: number, y: number, r: number, rgb: string, a: number): void {
	if (r <= 0 || a <= 0) return;
	const g = c.createRadialGradient(x, y, 0, x, y, r);
	g.addColorStop(0, `rgba(${rgb},${a})`);
	g.addColorStop(0.4, `rgba(${rgb},${a * 0.4})`);
	g.addColorStop(1, `rgba(${rgb},0)`);
	c.save();
	c.globalCompositeOperation = 'lighter';
	c.fillStyle = g;
	c.fillRect(x - r, y - r, r * 2, r * 2);
	c.restore();
}

/** A rivet: a lit dome with an ink ring. */
export function rivet(
	c: Ctx,
	x: number,
	y: number,
	r: number,
	S: number,
	lit = '#e8eef2',
	dark = '#4a525c'
): void {
	c.beginPath();
	c.arc(x, y, r, 0, TAU);
	c.fillStyle = radial(c, x - r * 0.35, y - r * 0.35, 0, r * 1.2, [lit, dark]);
	c.fill();
	c.lineWidth = Math.max(0.8, S * 0.02);
	c.strokeStyle = INK;
	c.stroke();
}

/** A fang, point toward `a` (radians), from its root at (x, y). */
export function fang(
	c: Ctx,
	x: number,
	y: number,
	len: number,
	wid: number,
	a: number,
	t: Tones,
	S: number,
	k = 0.7
): void {
	const dx = Math.cos(a);
	const dy = Math.sin(a);
	const nx = -dy;
	const ny = dx;
	const path = (): void => {
		c.beginPath();
		c.moveTo(x + nx * wid, y + ny * wid);
		c.quadraticCurveTo(
			x + dx * len * 0.55 + nx * wid * 0.8,
			y + dy * len * 0.55 + ny * wid * 0.8,
			x + dx * len,
			y + dy * len
		);
		c.quadraticCurveTo(
			x + dx * len * 0.5 - nx * wid * 0.5,
			y + dy * len * 0.5 - ny * wid * 0.5,
			x - nx * wid,
			y - ny * wid
		);
		c.closePath();
	};
	cel(c, path, t, x + dx * len * 0.4, y + dy * len * 0.4, Math.max(len, wid) * 0.6, S, k);
}

/** Rotates the canvas so that `dir` is +x, round (x, y). Call inside save/restore. */
export function face(c: Ctx, x: number, y: number, dir: Dir): void {
	c.translate(x, y);
	c.rotate(ANGLE[dir]);
}
