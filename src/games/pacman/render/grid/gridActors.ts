// The grid world's riders and programs, drawn twice: their dark bodies into the frame, their
// light into the emissive layer (`GridGlow`). Lines only, sharp joints; the circle is the
// heroes' (and the identity disc's) shape, the enemy is straight lines.
//   - the hero: a dark disc with a light rim along the edge and the mouth's cut, a circuit arc
//     inside, an eye of light; Ms. Pac-Man adds a bow of two light triangles;
//   - the boss's cycle from above: two wheels (narrow lit slabs), a narrow body, a rider, a hot
//     headlight;
//   - a program (ghost): its own silhouette, a dome and three points, drawn in light;
//   - a bit: a small square; the overclock: the identity disc, two rings, segments turning.
import { ENEMY, HERO } from './gridPalette';

type Ctx = CanvasRenderingContext2D;

/** Rotates `(u, v)` (heading +u) into the screen at `(x, y)`, angle `a`. */
const at =
	(x: number, y: number, a: number) =>
	(u: number, v: number): [number, number] => [
		x + Math.cos(a) * u - Math.sin(a) * v,
		y + Math.sin(a) * u + Math.cos(a) * v
	];

export function drawHero(
	dark: Ctx,
	light: Ctx,
	x: number,
	y: number,
	T: number,
	angle: number,
	open: number,
	bow: boolean
): void {
	const R = T * 0.42;
	const m = 0.12 + 0.5 * open;
	const body = (c: Ctx) => {
		c.beginPath();
		c.moveTo(x, y);
		c.arc(x, y, R, angle + m, angle + Math.PI * 2 - m);
		c.closePath();
	};
	dark.fillStyle = '#00040a';
	body(dark);
	dark.fill();
	light.lineJoin = 'miter';
	light.lineCap = 'butt';
	light.strokeStyle = HERO.mid;
	light.lineWidth = Math.max(1.2, T * 0.1);
	body(light);
	light.stroke();
	light.strokeStyle = HERO.core;
	light.lineWidth = Math.max(1, T * 0.035);
	light.stroke();
	// the circuit: an inner arc and one trace to the back
	const p = at(x, y, angle);
	light.globalAlpha = 0.55;
	light.strokeStyle = HERO.mid;
	light.lineWidth = Math.max(1, T * 0.03);
	light.beginPath();
	light.arc(x, y, R * 0.55, angle + m + 0.5, angle + Math.PI * 2 - m - 0.5);
	const [ax, ay] = p(-R * 0.55, 0);
	const [bx, by] = p(-R * 0.85, 0);
	light.moveTo(ax, ay);
	light.lineTo(bx, by);
	light.stroke();
	light.globalAlpha = 1;
	const [ex, ey] = p(R * 0.18, -R * 0.48);
	light.fillStyle = HERO.core;
	light.beginPath();
	light.arc(ex, ey, Math.max(1.2, T * 0.05), 0, Math.PI * 2);
	light.fill();
	if (bow) {
		const s = R * 0.42;
		const [kx, ky] = p(-R * 0.35, -R * 0.92);
		const q = at(kx, ky, angle);
		light.strokeStyle = HERO.core;
		light.lineWidth = Math.max(1, T * 0.05);
		light.beginPath();
		for (const side of [-1, 1]) {
			const [ax2, ay2] = q(side * s, -s * 0.55);
			const [bx2, by2] = q(side * s, s * 0.55);
			light.moveTo(kx, ky);
			light.lineTo(ax2, ay2);
			light.lineTo(bx2, by2);
			light.closePath();
		}
		light.stroke();
	}
}

/** The boss's light cycle from above, heading `angle`. */
export function drawCycle(
	dark: Ctx,
	light: Ctx,
	x: number,
	y: number,
	T: number,
	angle: number
): void {
	const p = at(x, y, angle);
	const L = T * 0.6;
	const rect = (c: Ctx, u0: number, u1: number, w: number) => {
		const pts = [p(u0, -w), p(u1, -w), p(u1, w), p(u0, w)];
		c.beginPath();
		c.moveTo(pts[0][0], pts[0][1]);
		for (const q of pts.slice(1)) c.lineTo(q[0], q[1]);
		c.closePath();
	};
	const parts: Array<[number, number, number]> = [
		[-L, -L * 0.55, T * 0.14], // the rear wheel
		[L * 0.55, L, T * 0.14], // the front wheel
		[-L * 0.55, L * 0.55, T * 0.08], // the body
		[-L * 0.2, L * 0.15, T * 0.17] // the rider
	];
	dark.fillStyle = '#060100';
	for (const [u0, u1, w] of parts) {
		rect(dark, u0, u1, w);
		dark.fill();
	}
	light.lineJoin = 'miter';
	light.strokeStyle = ENEMY.mid;
	light.lineWidth = Math.max(1, T * 0.05);
	for (const [u0, u1, w] of parts) {
		rect(light, u0, u1, w);
		light.stroke();
	}
	// the wheels' treads burn hottest
	light.strokeStyle = ENEMY.core;
	light.lineWidth = Math.max(1, T * 0.03);
	for (const [u0, u1] of [
		[-L, -L * 0.55],
		[L * 0.55, L]
	]) {
		const [a0, b0] = p(u0, 0);
		const [a1, b1] = p(u1, 0);
		light.beginPath();
		light.moveTo(a0, b0);
		light.lineTo(a1, b1);
		light.stroke();
	}
	const [hx, hy] = p(L + T * 0.04, 0);
	light.fillStyle = '#ffffff';
	light.fillRect(hx - T * 0.05, hy - T * 0.05, T * 0.1, T * 0.1);
}

/** A program: the ghost's own silhouette, a dome and three points, in light; two eyes. */
export function drawProgram(
	dark: Ctx,
	light: Ctx,
	x: number,
	y: number,
	T: number,
	time: number
): void {
	const R = T * 0.36;
	const shape = (c: Ctx) => {
		c.beginPath();
		c.moveTo(x - R, y + R);
		c.lineTo(x - R, y);
		c.arc(x, y, R, Math.PI, 0);
		c.lineTo(x + R, y + R);
		const w = (R * 2) / 3;
		const step = Math.floor(time * 6) % 2 === 0 ? 0.55 : 0.35;
		for (let i = 0; i < 3; i++) {
			const x1 = x + R - w * i;
			c.lineTo(x1 - w / 2, y + R * step);
			c.lineTo(x1 - w, y + R);
		}
		c.closePath();
	};
	dark.fillStyle = '#060100';
	shape(dark);
	dark.fill();
	light.lineJoin = 'miter';
	light.strokeStyle = ENEMY.mid;
	light.lineWidth = Math.max(1, T * 0.06);
	shape(light);
	light.stroke();
	light.fillStyle = ENEMY.core;
	const e = Math.max(1.4, T * 0.07);
	light.fillRect(x - R * 0.45 - e / 2, y - R * 0.15 - e / 2, e, e);
	light.fillRect(x + R * 0.45 - e / 2, y - R * 0.15 - e / 2, e, e);
}

export function drawBit(light: Ctx, x: number, y: number, T: number): void {
	const s = Math.max(1.5, T * 0.08);
	light.fillRect(x - s / 2, y - s / 2, s, s);
}

/** The overclock: an identity disc, an outer ring of four turning segments and an inner ring. */
export function drawOverclock(light: Ctx, x: number, y: number, T: number, time: number): void {
	const R = T * 0.3;
	light.strokeStyle = HERO.mid;
	light.lineWidth = Math.max(1, T * 0.05);
	light.lineCap = 'butt';
	for (let i = 0; i < 4; i++) {
		const a = time * 1.5 + (i * Math.PI) / 2;
		light.beginPath();
		light.arc(x, y, R, a + 0.18, a + Math.PI / 2 - 0.18);
		light.stroke();
	}
	light.strokeStyle = HERO.core;
	light.lineWidth = Math.max(1, T * 0.03);
	light.beginPath();
	light.arc(x, y, R * 0.45, 0, Math.PI * 2);
	light.stroke();
}
