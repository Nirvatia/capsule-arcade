// The night forest's painters over the bake (`DESIGN.md` §7b): the textures of the fog and the
// dark's wisps, the small lights (lamp heads, fireflies for food, flares for the energizers), the
// Taken (a cloaked figure under a shroud of black smoke that burns away in light) and the whirl of
// the Dark Presence in the clearing. Everything stays inside its own tile or, for the Presence,
// inside the clearing: nothing reaches out past the tile it stands on. All drawn in code.
import type { GhostKind } from '../../logic/actors/GhostModel';
import { TAU, clamp, lerp, rng, smoothstep, vnoise } from './noise';

type Ctx = CanvasRenderingContext2D;
export type RGB = readonly [number, number, number];

const make = (w: number, h: number): [HTMLCanvasElement, Ctx] => {
	const cv = document.createElement('canvas');
	cv.width = w;
	cv.height = h;
	return [cv, cv.getContext('2d') as Ctx];
};

// ---------------------------------------------------------------------------------- textures

/** A tileable cloud texture: `tint` the colour, `gain` how much of it is opaque. */
export function makeCloud(
	size: number,
	tint: RGB,
	seed: number,
	cells = 4,
	lo = 0.38,
	hi = 0.85,
	gain = 1
): HTMLCanvasElement {
	const [cv, c] = make(size, size);
	const img = c.createImageData(size, size);
	for (let y = 0; y < size; y += 1) {
		for (let x = 0; x < size; x += 1) {
			let n = 0;
			let a = 0.5;
			let norm = 0;
			for (let o = 0; o < 4; o += 1) {
				const f = cells * 2 ** o;
				n += a * vnoise((x / size) * f, (y / size) * f, seed + o * 3, f);
				norm += a;
				a *= 0.5;
			}
			const i = (y * size + x) * 4;
			img.data[i] = tint[0];
			img.data[i + 1] = tint[1];
			img.data[i + 2] = tint[2];
			img.data[i + 3] = Math.round(smoothstep(lo, hi, n / norm) * gain * 255);
		}
	}
	c.putImageData(img, 0, 0);
	return cv;
}

export function makeGrain(size = 160): HTMLCanvasElement {
	const [cv, c] = make(size, size);
	const img = c.createImageData(size, size);
	const r = rng(5);
	for (let i = 0; i < size * size; i += 1) {
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

/** Textures and sprites are made once, on first use (a level that never needs them never pays). */
let sprites: {
	warm: HTMLCanvasElement;
	red: HTMLCanvasElement;
	fly: HTMLCanvasElement;
	eye: HTMLCanvasElement;
	puff: HTMLCanvasElement;
} | null = null;
function kit() {
	sprites ??= {
		warm: glowSprite([255, 190, 100]),
		red: glowSprite([255, 70, 40]),
		fly: glowSprite([210, 255, 140], 48),
		eye: glowSprite([170, 235, 255], 48),
		puff: puffSprite()
	};
	return sprites;
}

// ----------------------------------------------------------------------------- small lights

/**
 * A lamp's head: a hot core, a halo, a soft streak, moths round it. `state` 'out' is a dark post
 * with a faint cold ring that pulses where the hero must step to light it again; 'tell' flickers.
 */
export function drawLampHead(
	c: Ctx,
	x: number,
	y: number,
	S: number,
	time: number,
	seed: number,
	state: 'on' | 'tell' | 'out'
): void {
	const k = kit();
	if (state === 'out') {
		c.fillStyle = '#1d242c';
		c.beginPath();
		c.arc(x, y, S * 0.07, 0, TAU);
		c.fill();
		return;
	}
	const flick =
		state === 'tell'
			? 0.25 + 0.75 * Math.max(0, Math.sin(time * 31 + seed) * Math.sin(time * 17))
			: 0.9 + 0.1 * Math.sin(time * 13 + seed) * Math.sin(time * 3.1 + seed * 2);
	c.save();
	c.globalCompositeOperation = 'lighter';
	c.globalAlpha = 0.85 * flick;
	c.drawImage(k.warm, x - S * 0.7, y - S * 0.7, S * 1.4, S * 1.4);
	c.globalAlpha = 0.35 * flick;
	c.drawImage(k.warm, x - S * 0.45, y - 2, S * 0.9, 4);
	c.restore();
	c.fillStyle = '#fff4d4';
	c.globalAlpha = Math.min(1, 0.4 + flick);
	c.beginPath();
	c.arc(x, y, S * 0.075, 0, TAU);
	c.fill();
	c.globalAlpha = 1;
	c.fillStyle = 'rgba(205,190,170,0.85)';
	for (let i = 0; i < 3; i += 1) {
		const a = time * (1.6 + i * 0.5) * (i % 2 ? 1 : -1) + seed * 3 + i * 1.7;
		const r = S * (0.2 + 0.1 * Math.sin(time * 2 + i + seed));
		c.beginPath();
		c.arc(x + Math.cos(a) * r, y + Math.sin(a * 1.3) * r * 0.7, 1, 0, TAU);
		c.fill();
	}
}

/** The spot where a lamp that went out is lit again: a pale ring breathing on the tile. */
export function drawRelightMark(
	c: Ctx,
	x: number,
	y: number,
	S: number,
	time: number,
	held: number
): void {
	c.save();
	c.strokeStyle = `rgba(255,214,150,${0.35 + 0.25 * Math.sin(time * 4)})`;
	c.lineWidth = 1.5;
	c.setLineDash([S * 0.12, S * 0.1]);
	c.beginPath();
	c.arc(x, y, S * 0.34, -Math.PI / 2, -Math.PI / 2 + TAU * Math.max(0.12, held));
	c.stroke();
	c.restore();
}

export function drawFirefly(
	c: Ctx,
	x: number,
	y: number,
	S: number,
	time: number,
	seed: number
): void {
	const blink = 0.35 + 0.65 * Math.max(0, Math.sin(time * 1.7 + seed * 6.1));
	const fx = x + Math.sin(time * 0.8 + seed * 9) * S * 0.07;
	const fy = y + Math.cos(time * 0.6 + seed * 7) * S * 0.07;
	c.save();
	c.globalCompositeOperation = 'lighter';
	c.globalAlpha = 0.8 * blink;
	c.drawImage(kit().fly, fx - S * 0.2, fy - S * 0.2, S * 0.4, S * 0.4);
	c.restore();
	c.fillStyle = `rgba(245,255,200,${0.5 + 0.5 * blink})`;
	c.beginPath();
	c.arc(fx, fy, Math.max(0.9, S * 0.03), 0, TAU);
	c.fill();
}

/** A flare: lying unlit it is a dull red stub, burning it is the hot core and sparks. */
export function drawFlare(
	c: Ctx,
	x: number,
	y: number,
	S: number,
	time: number,
	seed: number,
	burn: number
): void {
	const k = kit();
	const flick = 0.82 + 0.18 * Math.sin(time * 17 + seed) * Math.sin(time * 5.3 + seed);
	c.save();
	c.globalCompositeOperation = 'lighter';
	c.globalAlpha = (0.35 + 0.4 * burn) * flick;
	c.drawImage(k.red, x - S * 0.9, y - S * 0.9, S * 1.8, S * 1.8);
	c.globalAlpha = 0.5 + 0.4 * burn;
	c.drawImage(k.warm, x - S * 0.26, y - S * 0.26, S * 0.52, S * 0.52);
	c.restore();
	c.fillStyle = '#4a0e0a';
	c.fillRect(x - S * 0.2, y + S * 0.02, S * 0.28, S * 0.07);
	c.fillStyle = '#fff0d6';
	c.beginPath();
	c.arc(x + S * 0.1, y + S * 0.04, S * 0.07 * flick, 0, TAU);
	c.fill();
	c.fillStyle = '#ff9a5a';
	for (let i = 0; i < 6; i += 1) {
		const ph = (time * 0.9 + i * 0.37 + seed) % 1;
		c.globalAlpha = (1 - ph) * 0.9;
		c.fillRect(
			x + S * 0.1 + Math.sin(i * 12.9 + seed + time * 2) * S * 0.12 * ph,
			y + S * 0.04 - ph * S * 0.42,
			1.4,
			1.4
		);
	}
	c.globalAlpha = 1;
}

// --------------------------------------------------------------------------------- the Taken

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
	/** The shroud of black smoke: 1 whole, 0 burnt away (the figure stands bare and can be hurt). */
	readonly shield: number;
	/** The light eating the shroud, 0..1: sparks and a white glow. */
	readonly burn: number;
	/** The classic fright's last seconds: the rim blinks white. */
	readonly blink: boolean;
}

/** A cloaked figure seen from above, in a box of `size` px: its smoke stays inside. */
export function drawTaken(
	c: Ctx,
	x: number,
	y: number,
	size: number,
	kind: GhostKind,
	o: TakenLook
): void {
	const R = size * 0.5;
	const sh = clamp(o.shield);
	const bare = 1 - sh;
	const a = Math.atan2(o.dy, o.dx);
	const cs = Math.cos(a);
	const sn = Math.sin(a);
	const coat = COAT[kind];
	const cloak = mix([10, 12, 17], coat, 0.1 + 0.9 * bare);
	const cloakHi = mix(
		[28, 34, 44],
		[coat[0] + 50, coat[1] + 50, coat[2] + 50] as unknown as RGB,
		0.15 + 0.85 * bare
	);
	c.save();
	c.translate(x, y);
	c.fillStyle = 'rgba(0,0,0,0.36)';
	c.beginPath();
	c.ellipse(R * 0.08, R * 0.3, R * 0.7, R * 0.42, 0, 0, TAU);
	c.fill();
	// the cloak: an oval along the heading with a rippling hem behind, a hood in front
	c.save();
	c.rotate(a);
	const g = c.createRadialGradient(-R * 0.15, -R * 0.2, R * 0.05, 0, 0, R * 0.6);
	g.addColorStop(0, cloakHi);
	g.addColorStop(1, cloak);
	c.fillStyle = g;
	c.beginPath();
	c.ellipse(-R * 0.06, 0, R * 0.56, R * 0.5, 0, 0, TAU);
	c.fill();
	for (let i = -2; i <= 2; i += 1) {
		const sway = Math.sin(o.time * 5 + i * 1.3) * R * 0.04;
		c.beginPath();
		c.arc(-R * 0.54 + sway, i * R * 0.17, R * 0.12, 0, TAU);
		c.fill();
	}
	c.fillStyle = mix([6, 7, 10], coat, 0.06 + 0.5 * bare);
	c.beginPath();
	c.arc(R * 0.3, 0, R * 0.3, 0, TAU);
	c.fill();
	if (bare > 0.3) {
		// the face under the hood, once the shroud is gone
		c.fillStyle = mix([22, 22, 26], [226, 206, 190], bare);
		c.beginPath();
		c.arc(R * 0.4, 0, R * 0.19, 0, TAU);
		c.fill();
		c.fillStyle = '#1b0f15';
		for (const s of [-1, 1]) {
			c.beginPath();
			c.arc(R * 0.46, s * R * 0.07, R * 0.03, 0, TAU);
			c.fill();
		}
	}
	c.restore();
	c.strokeStyle = `rgba(110,150,180,${0.2 + 0.25 * sh})`;
	c.lineWidth = 1;
	c.beginPath();
	c.arc(0, 0, R * 0.52, Math.PI * 1.05, Math.PI * 1.6);
	c.stroke();
	if (bare > 0.3) {
		c.strokeStyle = o.blink ? `rgba(255,255,255,${0.9 * bare})` : `rgba(159,216,255,${0.8 * bare})`;
		c.lineWidth = 1.6;
		c.beginPath();
		c.arc(0, 0, R * 0.92, 0, TAU);
		c.stroke();
	}
	// the shroud: a dense core, puffs orbiting close, never past the box
	if (sh > 0.02) {
		const core = c.createRadialGradient(0, 0, 0, 0, 0, R * 0.78);
		core.addColorStop(0, `rgba(1,2,4,${0.94 * sh})`);
		core.addColorStop(0.65, `rgba(1,2,4,${0.7 * sh})`);
		core.addColorStop(1, 'rgba(1,2,4,0)');
		c.fillStyle = core;
		c.beginPath();
		c.arc(0, 0, R * 0.8, 0, TAU);
		c.fill();
		for (let i = 0; i < 9; i += 1) {
			const ang = (i / 9) * TAU + o.time * (i % 2 ? 0.9 : -0.7);
			const rr = R * (0.28 + 0.08 * Math.sin(o.time * 2 + i * 1.7)) * (0.5 + 0.5 * sh);
			const pr = R * (0.3 + 0.05 * Math.sin(o.time * 3 + i)) * Math.sqrt(sh);
			c.globalAlpha = 0.85;
			c.drawImage(kit().puff, Math.cos(ang) * rr - pr, Math.sin(ang) * rr - pr, pr * 2, pr * 2);
		}
		c.globalAlpha = 1;
	}
	if (o.burn > 0.02) {
		c.save();
		c.globalCompositeOperation = 'lighter';
		const gl = c.createRadialGradient(0, 0, 0, 0, 0, R * 0.95);
		gl.addColorStop(0, `rgba(255,236,200,${0.42 * o.burn})`);
		gl.addColorStop(1, 'rgba(255,200,140,0)');
		c.fillStyle = gl;
		c.beginPath();
		c.arc(0, 0, R * 0.95, 0, TAU);
		c.fill();
		c.lineWidth = 1.2;
		for (let i = 0; i < 10; i += 1) {
			const cyc = o.time * 1.7 + i * 0.31;
			const ph = cyc % 1;
			const ang = i * 2.1 + Math.floor(cyc) * 1.3;
			const r0 = R * (0.4 + 0.4 * ph);
			c.strokeStyle = `rgba(255,214,160,${(1 - ph) * o.burn})`;
			c.beginPath();
			c.moveTo(Math.cos(ang) * r0, Math.sin(ang) * r0);
			c.lineTo(Math.cos(ang) * (r0 + R * 0.14), Math.sin(ang) * (r0 + R * 0.14));
			c.stroke();
		}
		c.restore();
	}
	c.restore();
	void cs;
	void sn;
}

/** The Taken's eyes, cold and lit, over the dark: drawn after the darkness. */
export function drawTakenEyes(c: Ctx, x: number, y: number, size: number, o: TakenLook): void {
	const vis = smoothstep(0.2, 0.7, o.shield);
	if (vis <= 0.01) {
		return;
	}
	const R = size * 0.5;
	const a = Math.atan2(o.dy, o.dx);
	const cs = Math.cos(a);
	const sn = Math.sin(a);
	c.save();
	c.globalCompositeOperation = 'lighter';
	for (const side of [-1, 1]) {
		const ex = x + cs * R * 0.42 - sn * side * R * 0.1;
		const ey = y + sn * R * 0.42 + cs * side * R * 0.1;
		c.globalAlpha = vis * (0.75 + 0.25 * Math.sin(o.time * 9 + side));
		c.drawImage(kit().eye, ex - R * 0.22, ey - R * 0.22, R * 0.44, R * 0.44);
		c.fillStyle = '#e8fbff';
		c.fillRect(ex - 1, ey - 1, 2, 2);
	}
	c.restore();
}

/** An eaten Taken running home: only its eyes, pale and small. */
export function drawBanishedEyes(c: Ctx, x: number, y: number, S: number, time: number): void {
	c.save();
	c.globalCompositeOperation = 'lighter';
	for (const side of [-1, 1]) {
		c.globalAlpha = 0.8 + 0.2 * Math.sin(time * 12 + side);
		c.drawImage(kit().eye, x + side * S * 0.12 - S * 0.12, y - S * 0.12, S * 0.24, S * 0.24);
	}
	c.restore();
}

// ---------------------------------------------------------------------------- the Presence

/**
 * The whirl of the Dark Presence in the clearing, within `R` px of its centre: black arms in a
 * spiral, smoke, wreckage flying round it, now and then a bolt. `rage` 0..1 (it rises as the
 * Presence is hurt) widens and quickens it; `alpha` fades it out at the dawn.
 */
export function drawVortex(
	c: Ctx,
	cx: number,
	cy: number,
	R: number,
	time: number,
	rage: number,
	alpha: number
): void {
	if (alpha <= 0.01) {
		return;
	}
	const spin = 0.7 + 1.0 * rage;
	const S = R / 2;
	c.save();
	c.globalAlpha *= alpha;
	c.translate(cx, cy);
	const pool = c.createRadialGradient(0, 0, 0, 0, 0, R * 1.05);
	pool.addColorStop(0, 'rgba(0,1,3,0.97)');
	pool.addColorStop(0.55, 'rgba(1,3,6,0.82)');
	pool.addColorStop(1, 'rgba(1,3,6,0)');
	c.fillStyle = pool;
	c.beginPath();
	c.arc(0, 0, R * 1.05, 0, TAU);
	c.fill();
	const debris = 9 + Math.round(6 * rage);
	const piece = (i: number, behind: boolean) => {
		const r1 = rng(i * 17 + 3);
		const orbit = R * (0.4 + 0.55 * r1());
		const w = (0.55 + r1() * 0.9) * spin * (i % 2 ? 1 : 0.8);
		const ph = r1() * TAU + time * w;
		const depth = Math.sin(ph);
		if (depth > 0 === behind) {
			return;
		}
		const x = Math.cos(ph) * orbit;
		const y = Math.sin(ph) * orbit * 0.62 - S * 0.15 * (0.5 + 0.5 * Math.sin(time * 1.3 + i));
		const scale = 0.7 + 0.25 * depth;
		c.save();
		c.translate(x, y);
		c.scale(scale, scale);
		c.fillStyle = 'rgba(0,0,0,0.35)';
		c.beginPath();
		c.ellipse(S * 0.08, S * 0.4, S * 0.24, S * 0.08, 0, 0, TAU);
		c.fill();
		c.rotate(r1() * TAU + time * (0.8 + r1() * 1.6));
		const type = i % 3;
		if (type === 0) {
			c.fillStyle = '#3c2c1c';
			c.fillRect(-S * 0.24, -S * 0.05, S * 0.48, S * 0.1);
			c.fillStyle = '#7c6240';
			c.fillRect(-S * 0.24, -S * 0.05, S * 0.48, S * 0.032);
		} else if (type === 1) {
			c.fillStyle = '#2a343c';
			c.beginPath();
			c.moveTo(-S * 0.14, S * 0.03);
			c.lineTo(-S * 0.05, -S * 0.12);
			c.lineTo(S * 0.12, -S * 0.08);
			c.lineTo(S * 0.14, S * 0.07);
			c.lineTo(-S * 0.03, S * 0.13);
			c.closePath();
			c.fill();
			c.fillStyle = '#6b7c88';
			c.beginPath();
			c.moveTo(-S * 0.05, -S * 0.12);
			c.lineTo(S * 0.12, -S * 0.08);
			c.lineTo(S * 0.02, -S * 0.03);
			c.closePath();
			c.fill();
		} else {
			c.fillStyle = '#2e2216';
			c.fillRect(-S * 0.2, -S * 0.065, S * 0.4, S * 0.13);
			c.fillStyle = '#5a4630';
			c.fillRect(-S * 0.2, -S * 0.065, S * 0.4, S * 0.032);
			c.fillStyle = '#a58a60';
			c.beginPath();
			c.ellipse(S * 0.2, 0, S * 0.03, S * 0.065, 0, 0, TAU);
			c.fill();
		}
		c.restore();
	};
	for (let i = 0; i < debris; i += 1) {
		piece(i, true);
	}
	const arms = 7;
	c.lineCap = 'round';
	for (let k = 0; k < arms; k += 1) {
		let px = 0;
		let py = 0;
		for (let j = 0; j <= 24; j += 1) {
			const u = j / 24;
			const r = R * (0.06 + 0.9 * u ** 0.9);
			const ang = (k / arms) * TAU + time * spin * (1.25 - u * 0.55) + u * 3.4;
			const x = Math.cos(ang) * r;
			const y = Math.sin(ang) * r * 0.82;
			if (j) {
				c.strokeStyle = 'rgba(46,78,102,0.38)';
				c.lineWidth = 1.2;
				c.beginPath();
				c.moveTo(px - 0.8, py - 1);
				c.lineTo(x - 0.8, y - 1);
				c.stroke();
				c.strokeStyle = 'rgba(0,1,3,0.94)';
				c.lineWidth = S * (0.3 * (1 - u) + 0.04);
				c.beginPath();
				c.moveTo(px, py);
				c.lineTo(x, y);
				c.stroke();
			}
			px = x;
			py = y;
		}
	}
	for (let i = 0; i < 28; i += 1) {
		const r1 = rng(i * 7 + 1);
		const orbit = R * (0.1 + 0.8 * r1());
		const ph = r1() * TAU + time * spin * (0.9 - (orbit / R) * 0.4);
		const pr = S * (0.2 + 0.28 * r1());
		c.globalAlpha = 0.8 * alpha;
		c.drawImage(
			kit().puff,
			Math.cos(ph) * orbit - pr,
			Math.sin(ph) * orbit * 0.82 - pr,
			pr * 2,
			pr * 2
		);
	}
	c.globalAlpha = alpha;
	for (let i = 0; i < debris; i += 1) {
		piece(i, false);
	}
	const period = 2.4 - 1.4 * rage;
	const n = Math.floor(time / period);
	const ph = time - n * period;
	if (ph < 0.16) {
		const r = rng(n * 13 + 5);
		const ang = r() * TAU;
		c.globalCompositeOperation = 'lighter';
		for (const [w, al] of [
			[6, 0.12],
			[2.8, 0.3],
			[1.2, 0.95]
		] as const) {
			c.strokeStyle = `rgba(190,225,255,${al * (1 - ph / 0.16)})`;
			c.lineWidth = w;
			c.lineJoin = 'round';
			c.beginPath();
			c.moveTo(0, 0);
			const rr = rng(n * 13 + 5);
			rr();
			for (let i = 1; i <= 7; i += 1) {
				const d = (i / 7) * R * 0.95;
				const jit = (rr() - 0.5) * S * 0.45;
				c.lineTo(Math.cos(ang) * d - Math.sin(ang) * jit, Math.sin(ang) * d + Math.cos(ang) * jit);
			}
			c.stroke();
		}
		c.globalCompositeOperation = 'source-over';
	}
	c.restore();
}
