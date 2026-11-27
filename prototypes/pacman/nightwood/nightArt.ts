// Prototype `nightwood`, the light and the dark: rays cast over the maze's grid (a light's shadows
// stop at the thickets, so a torch cone is cut by the trees), the fog and the Presence's wisps as
// tileable textures, the Taken (a figure under a shroud of black smoke that burns away in light), the
// whirl of the Dark Presence with its flying wreckage, and the small emissive things: fireflies for
// food, red flares for the energizers, lamp heads, moths. All drawn in code.
import type { GridMatrix } from '../../../src/games/pacman/config/gridConfig';
import type { GhostKind } from '../../../src/games/pacman/logic/actors/GhostModel';
import { TAU, clamp, kindOf, lerp, rng, smoothstep, vnoise } from './forest';
import type { RGB } from './forest';

type Ctx = CanvasRenderingContext2D;

// ------------------------------------------------------------------------------------- rays

export class LightGrid {
	constructor(private readonly g: GridMatrix) {}
	/** Does a tile stop the light? The lair's own light may enter the lair. */
	solid(x: number, y: number, lairOpen: boolean): boolean {
		const k = kindOf(this.g[y]?.[x]);
		return k === 'wall' || k === 'void' || (k === 'lair' && !lairOpen);
	}
}

/** How far a ray from (ox, oy) in tile units goes before a solid tile, up to `maxR`. */
export function castRay(grid: LightGrid, ox: number, oy: number, ang: number, maxR: number, lairOpen: boolean): number {
	const dx = Math.cos(ang);
	const dy = Math.sin(ang);
	let mx = Math.floor(ox);
	let my = Math.floor(oy);
	const ddx = dx === 0 ? Infinity : Math.abs(1 / dx);
	const ddy = dy === 0 ? Infinity : Math.abs(1 / dy);
	const sx = dx < 0 ? -1 : 1;
	const sy = dy < 0 ? -1 : 1;
	let tx = dx === 0 ? Infinity : (dx < 0 ? ox - mx : mx + 1 - ox) * ddx;
	let ty = dy === 0 ? Infinity : (dy < 0 ? oy - my : my + 1 - oy) * ddy;
	let d = 0;
	while (d < maxR) {
		if (tx < ty) {
			d = tx;
			tx += ddx;
			mx += sx;
		} else {
			d = ty;
			ty += ddy;
			my += sy;
		}
		if (grid.solid(mx, my, lairOpen)) return Math.min(d, maxR);
	}
	return maxR;
}

/** The lit polygon of a light: rays from a0 to a1, as flat tile coordinates, the origin first. */
export function visibility(
	grid: LightGrid,
	ox: number,
	oy: number,
	a0: number,
	a1: number,
	n: number,
	maxR: number,
	lairOpen = false,
	into = 0.62
): number[] {
	const pts: number[] = [ox, oy];
	for (let i = 0; i <= n; i++) {
		const a = lerp(a0, a1, i / n);
		let d = castRay(grid, ox, oy, a, maxR, lairOpen);
		// the light reaches a little into the thicket it strikes: its near boughs catch it
		if (d < maxR) d = Math.min(maxR, d + into);
		pts.push(ox + Math.cos(a) * d, oy + Math.sin(a) * d);
	}
	return pts;
}

/** Can a point see another along the grid? */
export function sees(grid: LightGrid, ax: number, ay: number, bx: number, by: number): boolean {
	const d = Math.hypot(bx - ax, by - ay);
	if (d < 0.01) return true;
	return castRay(grid, ax, ay, Math.atan2(by - ay, bx - ax), d + 0.05, false) >= d - 0.02;
}

/** Fills a light's polygon with a radial falloff of `stops` ([0..1, css colour]). */
export function paintLight(
	c: Ctx,
	S: number,
	poly: readonly number[],
	R: number,
	stops: ReadonlyArray<readonly [number, string]>
): void {
	const ox = poly[0] * S;
	const oy = poly[1] * S;
	const g = c.createRadialGradient(ox, oy, 0, ox, oy, R * S);
	for (const [t, col] of stops) g.addColorStop(t, col);
	c.fillStyle = g;
	c.beginPath();
	c.moveTo(ox, oy);
	for (let i = 2; i < poly.length; i += 2) c.lineTo(poly[i] * S, poly[i + 1] * S);
	c.closePath();
	c.fill();
}

// ---------------------------------------------------------------------------------- textures

const make = (w: number, h: number): [HTMLCanvasElement, Ctx] => {
	const cv = document.createElement('canvas');
	cv.width = w;
	cv.height = h;
	return [cv, cv.getContext('2d') as Ctx];
};

/** A tileable cloud texture: `tint` the colour, `gain` how much of it is opaque. */
export function makeCloud(size: number, tint: RGB, seed: number, cells = 4, lo = 0.38, hi = 0.85, gain = 1): HTMLCanvasElement {
	const [cv, c] = make(size, size);
	const img = c.createImageData(size, size);
	for (let y = 0; y < size; y++)
		for (let x = 0; x < size; x++) {
			let n = 0;
			let a = 0.5;
			let norm = 0;
			for (let o = 0; o < 4; o++) {
				const f = cells * 2 ** o;
				n += a * vnoise((x / size) * f, (y / size) * f, seed + o * 3, f);
				norm += a;
				a *= 0.5;
			}
			const v = smoothstep(lo, hi, n / norm) * gain;
			const i = (y * size + x) * 4;
			img.data[i] = tint[0];
			img.data[i + 1] = tint[1];
			img.data[i + 2] = tint[2];
			img.data[i + 3] = Math.round(v * 255);
		}
	c.putImageData(img, 0, 0);
	return cv;
}

export function makeGrain(size = 192): HTMLCanvasElement {
	const [cv, c] = make(size, size);
	const img = c.createImageData(size, size);
	const r = rng(5);
	for (let i = 0; i < size * size; i++) {
		const v = Math.round(128 + (r() - 0.5) * 150);
		img.data[i * 4] = v;
		img.data[i * 4 + 1] = v;
		img.data[i * 4 + 2] = v;
		img.data[i * 4 + 3] = 255;
	}
	c.putImageData(img, 0, 0);
	return cv;
}

/** A soft round glow of one colour, white-hot at the middle. */
export function glowSprite(rgb: RGB, size = 96): HTMLCanvasElement {
	const [cv, c] = make(size, size);
	const g = c.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
	g.addColorStop(0, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},1)`);
	g.addColorStop(0.25, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.55)`);
	g.addColorStop(0.6, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.14)`);
	g.addColorStop(1, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0)`);
	c.fillStyle = g;
	c.fillRect(0, 0, size, size);
	return cv;
}

/** A soft black puff for smoke. */
export function puffSprite(size = 64): HTMLCanvasElement {
	const [cv, c] = make(size, size);
	const g = c.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
	g.addColorStop(0, 'rgba(1,2,4,0.95)');
	g.addColorStop(0.5, 'rgba(1,2,4,0.6)');
	g.addColorStop(1, 'rgba(1,2,4,0)');
	c.fillStyle = g;
	c.fillRect(0, 0, size, size);
	return cv;
}

const GLOW_WARM = glowSprite([255, 190, 100]);
const GLOW_RED = glowSprite([255, 70, 40]);
const GLOW_FLY = glowSprite([210, 255, 140], 48);
const GLOW_EYE = glowSprite([170, 235, 255], 48);
const PUFF = puffSprite();

// ------------------------------------------------------------------------------ small lights

/** A lamp's head: a hot core, a halo, a soft streak, moths round it. */
export function drawLampHead(c: Ctx, x: number, y: number, S: number, time: number, seed: number): void {
	const flick = 0.9 + 0.1 * Math.sin(time * 13 + seed) * Math.sin(time * 3.1 + seed * 2);
	c.save();
	c.globalCompositeOperation = 'lighter';
	c.globalAlpha = 0.85 * flick;
	c.drawImage(GLOW_WARM, x - S * 0.7, y - S * 0.7, S * 1.4, S * 1.4);
	c.globalAlpha = 0.35 * flick;
	c.drawImage(GLOW_WARM, x - S * 0.45, y - 2, S * 0.9, 4);
	c.restore();
	c.fillStyle = '#fff4d4';
	c.beginPath();
	c.arc(x, y, S * 0.075, 0, TAU);
	c.fill();
	c.fillStyle = 'rgba(205,190,170,0.85)';
	for (let i = 0; i < 4; i++) {
		const a = time * (1.6 + i * 0.5) * (i % 2 ? 1 : -1) + seed * 3 + i * 1.7;
		const r = S * (0.22 + 0.12 * Math.sin(time * 2 + i + seed));
		c.beginPath();
		c.arc(x + Math.cos(a) * r, y + Math.sin(a * 1.3) * r * 0.7, 1, 0, TAU);
		c.fill();
	}
}

export function drawFirefly(c: Ctx, x: number, y: number, S: number, time: number, seed: number): void {
	const blink = 0.35 + 0.65 * Math.max(0, Math.sin(time * 1.7 + seed * 6.1));
	const fx = x + Math.sin(time * 0.8 + seed * 9) * S * 0.08;
	const fy = y + Math.cos(time * 0.6 + seed * 7) * S * 0.08;
	c.save();
	c.globalCompositeOperation = 'lighter';
	c.globalAlpha = 0.8 * blink;
	c.drawImage(GLOW_FLY, fx - S * 0.2, fy - S * 0.2, S * 0.4, S * 0.4);
	c.restore();
	c.fillStyle = `rgba(245,255,200,${0.5 + 0.5 * blink})`;
	c.beginPath();
	c.arc(fx, fy, Math.max(0.9, S * 0.03), 0, TAU);
	c.fill();
}

/** The energizer: a burning red flare on the ground, sparks rising off it. */
export function drawFlare(c: Ctx, x: number, y: number, S: number, time: number, seed: number): void {
	const flick = 0.82 + 0.18 * Math.sin(time * 17 + seed) * Math.sin(time * 5.3 + seed);
	c.save();
	c.globalCompositeOperation = 'lighter';
	c.globalAlpha = 0.75 * flick;
	c.drawImage(GLOW_RED, x - S * 1.15, y - S * 1.15, S * 2.3, S * 2.3);
	c.globalAlpha = 0.9;
	c.drawImage(GLOW_WARM, x - S * 0.3, y - S * 0.3, S * 0.6, S * 0.6);
	c.restore();
	c.fillStyle = '#4a0e0a';
	c.fillRect(x - S * 0.2, y + S * 0.02, S * 0.28, S * 0.07);
	c.fillStyle = '#fff0d6';
	c.beginPath();
	c.arc(x + S * 0.1, y + S * 0.04, S * 0.075 * flick, 0, TAU);
	c.fill();
	c.fillStyle = '#ff9a5a';
	for (let i = 0; i < 7; i++) {
		const ph = (time * 0.9 + i * 0.37 + seed) % 1;
		const sx = x + S * 0.1 + Math.sin(i * 12.9 + seed + time * 2) * S * 0.14 * ph;
		const sy = y + S * 0.04 - ph * S * 0.5;
		c.globalAlpha = (1 - ph) * 0.9;
		c.fillRect(sx, sy, 1.4, 1.4);
	}
	c.globalAlpha = 1;
}

// ----------------------------------------------------------------------------------- the Taken

const COAT: Record<GhostKind, RGB> = {
	BLINKY: [170, 42, 46],
	PINKY: [198, 92, 170],
	INKY: [50, 152, 192],
	CLYDE: [216, 140, 50]
};
const mix = (a: RGB, b: RGB, t: number): string =>
	`rgb(${Math.round(lerp(a[0], b[0], t))},${Math.round(lerp(a[1], b[1], t))},${Math.round(lerp(a[2], b[2], t))})`;

export interface TakenLook {
	readonly time: number;
	readonly dx: number;
	readonly dy: number;
	readonly step: number;
	/** The shroud of black smoke: 1 whole, 0 burnt away (the figure stands bare and can be hurt). */
	readonly shield: number;
	/** The light eating the shroud, 0..1: sparks and a white glow. */
	readonly burn: number;
}

/** A figure under a shroud, seen from above; the smoke is drawn over it. */
export function drawTaken(c: Ctx, x: number, y: number, S: number, kind: GhostKind, o: TakenLook): void {
	const sh = clamp(o.shield);
	const bare = 1 - sh;
	const a = Math.atan2(o.dy, o.dx);
	const cs = Math.cos(a);
	const sn = Math.sin(a);
	const px = -sn;
	const py = cs;
	const coat = COAT[kind];
	const dark: RGB = [12, 14, 19];
	const body = mix(dark, coat, 0.12 + 0.88 * bare);
	const bodyHi = mix([30, 36, 46], coat.map((v) => Math.min(255, v + 50)) as unknown as RGB, 0.15 + 0.85 * bare);
	const skin = mix([20, 20, 25], [226, 206, 190], bare);
	const swing = Math.sin(o.step);
	c.save();
	c.translate(x, y);
	// the ground shadow
	c.fillStyle = 'rgba(0,0,0,0.38)';
	c.beginPath();
	c.ellipse(S * 0.04, S * 0.12, S * 0.36, S * 0.22, 0, 0, TAU);
	c.fill();
	// the arms, swinging with the step
	c.lineCap = 'round';
	for (const side of [-1, 1]) {
		const sx = px * side * S * 0.25;
		const sy = py * side * S * 0.25;
		const ex = sx + cs * S * 0.22 * swing * side;
		const ey = sy + sn * S * 0.22 * swing * side;
		c.strokeStyle = body;
		c.lineWidth = S * 0.11;
		c.beginPath();
		c.moveTo(sx, sy);
		c.lineTo(ex, ey);
		c.stroke();
		c.fillStyle = skin;
		c.beginPath();
		c.arc(ex, ey, S * 0.055, 0, TAU);
		c.fill();
	}
	// the shoulders: lit from the upper left
	const g = c.createRadialGradient(-S * 0.1, -S * 0.12, S * 0.02, 0, 0, S * 0.34);
	g.addColorStop(0, bodyHi);
	g.addColorStop(1, body);
	c.fillStyle = g;
	c.beginPath();
	c.ellipse(0, 0, S * 0.19, S * 0.31, a, 0, TAU);
	c.fill();
	// the head: hair behind, the face forward
	const hx = cs * S * 0.06;
	const hy = sn * S * 0.06;
	c.fillStyle = mix([8, 9, 12], [70, 50, 40], bare * 0.7);
	c.beginPath();
	c.arc(hx - cs * S * 0.035, hy - sn * S * 0.035, S * 0.15, 0, TAU);
	c.fill();
	c.fillStyle = skin;
	c.beginPath();
	c.arc(hx + cs * S * 0.03, hy + sn * S * 0.03, S * 0.115, 0, TAU);
	c.fill();
	if (bare > 0.3) {
		// a bare figure is rimmed pale blue: it can be hurt now
		c.strokeStyle = `rgba(159,216,255,${0.7 * bare})`;
		c.lineWidth = 1.4;
		c.beginPath();
		c.arc(0, 0, S * 0.4, 0, TAU);
		c.stroke();
	}
	// the shroud: a dense black core, puffs orbiting, wisps trailing off
	if (sh > 0.02) {
		const core = c.createRadialGradient(0, 0, 0, 0, 0, S * 0.5 * (0.6 + 0.4 * sh));
		core.addColorStop(0, `rgba(1,2,4,${0.94 * sh})`);
		core.addColorStop(0.6, `rgba(1,2,4,${0.72 * sh})`);
		core.addColorStop(1, 'rgba(1,2,4,0)');
		c.fillStyle = core;
		c.beginPath();
		c.arc(0, 0, S * 0.5, 0, TAU);
		c.fill();
		for (let i = 0; i < 11; i++) {
			const ang = (i / 11) * TAU + o.time * (i % 2 ? 0.9 : -0.7);
			const rr = S * (0.22 + 0.09 * Math.sin(o.time * 2 + i * 1.7)) * (0.55 + 0.45 * sh);
			const pr = S * (0.2 + 0.06 * Math.sin(o.time * 3 + i)) * Math.sqrt(sh);
			c.globalAlpha = 0.85;
			c.drawImage(PUFF, Math.cos(ang) * rr - pr, Math.sin(ang) * rr - pr, pr * 2, pr * 2);
		}
		c.globalAlpha = 1;
		c.lineCap = 'round';
		for (let i = 0; i < 8; i++) {
			const ang = (i / 8) * TAU + o.time * 0.6 + Math.sin(o.time * 1.3 + i) * 0.3;
			const len = S * (0.52 + 0.22 * Math.sin(o.time * 2.2 + i * 2.1)) * (0.5 + 0.5 * sh);
			const bend = Math.sin(o.time * 2 + i) * 0.5;
			c.strokeStyle = `rgba(2,3,6,${0.8 * sh})`;
			c.lineWidth = S * 0.075;
			c.beginPath();
			c.moveTo(Math.cos(ang) * S * 0.2, Math.sin(ang) * S * 0.2);
			c.quadraticCurveTo(
				Math.cos(ang + bend) * len * 0.65,
				Math.sin(ang + bend) * len * 0.65,
				Math.cos(ang + bend * 1.6) * len,
				Math.sin(ang + bend * 1.6) * len
			);
			c.stroke();
			c.strokeStyle = `rgba(90,130,160,${0.22 * sh})`;
			c.lineWidth = 1;
			c.stroke();
		}
	}
	// the light eats the shroud: a white glow through it, sparks flying off its edge
	if (o.burn > 0.02) {
		c.save();
		c.globalCompositeOperation = 'lighter';
		const gl = c.createRadialGradient(0, 0, 0, 0, 0, S * 0.55);
		gl.addColorStop(0, `rgba(255,236,200,${0.42 * o.burn})`);
		gl.addColorStop(1, 'rgba(255,200,140,0)');
		c.fillStyle = gl;
		c.beginPath();
		c.arc(0, 0, S * 0.55, 0, TAU);
		c.fill();
		c.lineWidth = 1.2;
		for (let i = 0; i < 12; i++) {
			const cyc = o.time * 1.7 + i * 0.31;
			const ph = cyc % 1;
			const ang = i * 2.1 + Math.floor(cyc) * 1.3;
			const r0 = S * (0.3 + 0.5 * ph);
			c.strokeStyle = `rgba(255,214,160,${(1 - ph) * o.burn})`;
			c.beginPath();
			c.moveTo(Math.cos(ang) * r0, Math.sin(ang) * r0);
			c.lineTo(Math.cos(ang) * (r0 + S * 0.07), Math.sin(ang) * (r0 + S * 0.07));
			c.stroke();
		}
		c.restore();
	}
	c.restore();
}

/** The Taken's eyes, cold and lit, over the dark: drawn after the darkness. */
export function drawTakenEyes(c: Ctx, x: number, y: number, S: number, o: TakenLook): void {
	const vis = smoothstep(0.2, 0.7, o.shield);
	if (vis <= 0.01) return;
	const a = Math.atan2(o.dy, o.dx);
	const cs = Math.cos(a);
	const sn = Math.sin(a);
	c.save();
	c.globalCompositeOperation = 'lighter';
	for (const side of [-1, 1]) {
		const ex = x + cs * S * 0.12 - sn * side * S * 0.055;
		const ey = y + sn * S * 0.12 + cs * side * S * 0.055;
		c.globalAlpha = vis * (0.75 + 0.25 * Math.sin(o.time * 9 + side));
		c.drawImage(GLOW_EYE, ex - S * 0.12, ey - S * 0.12, S * 0.24, S * 0.24);
		c.fillStyle = '#e8fbff';
		c.fillRect(ex - 1, ey - 1, 2, 2);
	}
	c.restore();
}

// ---------------------------------------------------------------------------- the Presence

const lightningCache = new Map<number, number[]>();

/** The whirl of the Dark Presence: black arms in a spiral, smoke, wreckage flying round it, now
 *  and then a bolt. `rage` 0..1 makes it wider, faster and more violent. */
export function drawVortex(c: Ctx, cx: number, cy: number, S: number, time: number, rage: number): void {
	const R = S * 2.05 * (1 + 0.16 * rage);
	const spin = 0.7 + 1.0 * rage;
	c.save();
	c.translate(cx, cy);
	// the pool under it
	const pool = c.createRadialGradient(0, 0, 0, 0, 0, R * 1.15);
	pool.addColorStop(0, 'rgba(0,1,3,0.97)');
	pool.addColorStop(0.55, 'rgba(1,3,6,0.82)');
	pool.addColorStop(1, 'rgba(1,3,6,0)');
	c.fillStyle = pool;
	c.beginPath();
	c.arc(0, 0, R * 1.15, 0, TAU);
	c.fill();
	// the wreckage behind the whirl
	const debris = 11 + Math.round(8 * rage);
	const piece = (i: number, behind: boolean) => {
		const r1 = rng(i * 17 + 3);
		const orbit = R * (0.38 + 0.62 * r1());
		const w = (0.55 + r1() * 0.9) * spin * (i % 2 ? 1 : 0.8);
		const ph = r1() * TAU + time * w;
		const depth = Math.sin(ph);
		if (depth > 0 === behind) return;
		const x = Math.cos(ph) * orbit;
		const y = Math.sin(ph) * orbit * 0.62 - S * 0.2 * (0.5 + 0.5 * Math.sin(time * 1.3 + i));
		const scale = 0.8 + 0.3 * depth;
		const rot = r1() * TAU + time * (0.8 + r1() * 1.6);
		const type = i % 3;
		c.save();
		c.translate(x, y);
		c.scale(scale, scale);
		c.fillStyle = 'rgba(0,0,0,0.35)';
		c.beginPath();
		c.ellipse(S * 0.1, S * 0.5, S * 0.3, S * 0.1, 0, 0, TAU);
		c.fill();
		c.rotate(rot);
		if (type === 0) {
			// a plank
			c.fillStyle = '#3c2c1c';
			c.fillRect(-S * 0.3, -S * 0.065, S * 0.6, S * 0.13);
			c.fillStyle = '#7c6240';
			c.fillRect(-S * 0.3, -S * 0.065, S * 0.6, S * 0.04);
			c.fillStyle = '#17110a';
			c.fillRect(-S * 0.3, S * 0.035, S * 0.6, S * 0.03);
		} else if (type === 1) {
			// a rock
			c.fillStyle = '#2a343c';
			c.beginPath();
			c.moveTo(-S * 0.18, S * 0.04);
			c.lineTo(-S * 0.06, -S * 0.15);
			c.lineTo(S * 0.15, -S * 0.1);
			c.lineTo(S * 0.17, S * 0.09);
			c.lineTo(-S * 0.04, S * 0.16);
			c.closePath();
			c.fill();
			c.fillStyle = '#6b7c88';
			c.beginPath();
			c.moveTo(-S * 0.06, -S * 0.15);
			c.lineTo(S * 0.15, -S * 0.1);
			c.lineTo(S * 0.02, -S * 0.04);
			c.closePath();
			c.fill();
		} else {
			// a log with its cut end
			c.fillStyle = '#2e2216';
			c.fillRect(-S * 0.26, -S * 0.08, S * 0.52, S * 0.16);
			c.fillStyle = '#5a4630';
			c.fillRect(-S * 0.26, -S * 0.08, S * 0.52, S * 0.04);
			c.fillStyle = '#a58a60';
			c.beginPath();
			c.ellipse(S * 0.26, 0, S * 0.035, S * 0.08, 0, 0, TAU);
			c.fill();
			c.strokeStyle = '#6a5236';
			c.lineWidth = 0.8;
			c.beginPath();
			c.ellipse(S * 0.26, 0, S * 0.018, S * 0.045, 0, 0, TAU);
			c.stroke();
		}
		c.restore();
	};
	for (let i = 0; i < debris; i++) piece(i, true);
	// the arms of the whirl, with a cold rim on their lit side
	const arms = 7;
	for (let k = 0; k < arms; k++) {
		let px = 0;
		let py = 0;
		for (let j = 0; j <= 26; j++) {
			const u = j / 26;
			const r = R * (0.06 + 0.94 * u ** 0.9);
			const ang = (k / arms) * TAU + time * spin * (1.25 - u * 0.55) + u * 3.4;
			const x = Math.cos(ang) * r;
			const y = Math.sin(ang) * r * 0.82;
			if (j) {
				const w = S * (0.36 * (1 - u) + 0.04);
				c.strokeStyle = 'rgba(46,78,102,0.38)';
				c.lineWidth = 1.2;
				c.beginPath();
				c.moveTo(px - 0.8, py - 1);
				c.lineTo(x - 0.8, y - 1);
				c.stroke();
				c.strokeStyle = 'rgba(0,1,3,0.94)';
				c.lineCap = 'round';
				c.lineWidth = w;
				c.beginPath();
				c.moveTo(px, py);
				c.lineTo(x, y);
				c.stroke();
			}
			px = x;
			py = y;
		}
	}
	// smoke
	for (let i = 0; i < 34; i++) {
		const r1 = rng(i * 7 + 1);
		const orbit = R * (0.1 + 0.9 * r1());
		const ph = r1() * TAU + time * spin * (0.9 - orbit / R * 0.4);
		const pr = S * (0.22 + 0.34 * r1());
		c.globalAlpha = 0.8;
		c.drawImage(PUFF, Math.cos(ph) * orbit - pr, Math.sin(ph) * orbit * 0.82 - pr, pr * 2, pr * 2);
	}
	c.globalAlpha = 1;
	for (let i = 0; i < debris; i++) piece(i, false);
	// a bolt now and then
	const period = 2.4 - 1.4 * rage;
	const n = Math.floor(time / period);
	const ph = time - n * period;
	if (ph < 0.16) {
		let pts = lightningCache.get(n);
		if (!pts) {
			const r = rng(n * 13 + 5);
			const ang = r() * TAU;
			pts = [0, 0];
			for (let i = 1; i <= 8; i++) {
				const d = (i / 8) * R * 1.05;
				const jit = (r() - 0.5) * S * 0.5;
				pts.push(Math.cos(ang) * d - Math.sin(ang) * jit, Math.sin(ang) * d + Math.cos(ang) * jit);
			}
			lightningCache.set(n, pts);
			if (lightningCache.size > 8) lightningCache.delete(lightningCache.keys().next().value as number);
		}
		c.globalCompositeOperation = 'lighter';
		for (const [w, al] of [
			[7, 0.12],
			[3.2, 0.3],
			[1.3, 0.95]
		] as const) {
			c.strokeStyle = `rgba(190,225,255,${al * (1 - ph / 0.16)})`;
			c.lineWidth = w;
			c.lineJoin = 'round';
			c.beginPath();
			c.moveTo(pts[0], pts[1]);
			for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]);
			c.stroke();
		}
		c.globalCompositeOperation = 'source-over';
	}
	c.restore();
}

/** Black tendrils crawl out of the lair along the corridors: three strands to a path, twisting
 *  about one another, thinning to hair at their ends. */
export function drawTendrils(
	c: Ctx,
	S: number,
	ox: number,
	oy: number,
	time: number,
	rage: number,
	paths: ReadonlyArray<ReadonlyArray<readonly [number, number]>>
): void {
	const reach = 0.3 + 0.7 * rage;
	paths.forEach((path, pi) => {
		const pts = path.map(([x, y]) => [ox + x * S, oy + y * S] as const);
		const seg: number[] = [];
		let total = 0;
		for (let i = 1; i < pts.length; i++) {
			const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
			seg.push(d);
			total += d;
		}
		const at = (len: number): [number, number, number, number] => {
			let acc = 0;
			for (let i = 0; i < seg.length; i++) {
				if (acc + seg[i] >= len || i === seg.length - 1) {
					const t = clamp((len - acc) / seg[i]);
					return [
						lerp(pts[i][0], pts[i + 1][0], t),
						lerp(pts[i][1], pts[i + 1][1], t),
						(pts[i + 1][1] - pts[i][1]) / seg[i],
						(pts[i + 1][0] - pts[i][0]) / seg[i]
					];
				}
				acc += seg[i];
			}
			return [pts[0][0], pts[0][1], 0, 0];
		};
		c.lineCap = 'round';
		for (let k = 0; k < 3; k++) {
			const want = total * reach * (0.75 + 0.25 * Math.sin(time * 0.9 + pi + k));
			const amp = S * (0.2 + 0.09 * k);
			const phase = k * 2.1 + pi;
			let lx = pts[0][0];
			let ly = pts[0][1];
			for (let l = 3; l <= want; l += 3) {
				const u = l / want;
				const [x, y, nx, ny] = at(l);
				const wob = (Math.sin(l * 0.07 - time * (2.2 + k * 0.7) + phase) + 0.5 * Math.sin(l * 0.19 + time * 1.6 + phase * 2)) * amp * (0.25 + u);
				const xx = x - nx * wob;
				const yy = y + ny * wob;
				const w = S * (0.13 * (1 - u) ** 1.2 + 0.018) * (k ? 0.7 : 1);
				c.strokeStyle = 'rgba(52,86,112,0.3)';
				c.lineWidth = Math.max(1, w * 0.5);
				c.beginPath();
				c.moveTo(lx - 1, ly - 1);
				c.lineTo(xx - 1, yy - 1);
				c.stroke();
				c.strokeStyle = 'rgba(1,2,4,0.95)';
				c.lineWidth = w;
				c.beginPath();
				c.moveTo(lx, ly);
				c.lineTo(xx, yy);
				c.stroke();
				lx = xx;
				ly = yy;
			}
		}
	});
}
