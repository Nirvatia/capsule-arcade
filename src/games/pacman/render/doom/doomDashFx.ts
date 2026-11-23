// The boss's dash as a transformation (the owner's pick of the `hell-dash` prototype, B1 "lava
// ball"): over the telegraph's last 0.25 s the body shrinks into a red-hot ball with a net of
// glowing cracks; the ball rolls down the line (its cracks roll with it) and lays a lava track
// that cools white, orange, red, a dark crust breaking into plates, and is gone; at the stop it
// turns back into the body over 0.28 s and pants steam that spreads flat over the floor (seen
// from above, nothing rises). The crouch before it lights the floor under him and cracks it.
// The phases' iron stays on the ball: its axle studs are bone horns (long iron ones in phase 3),
// and from phase 2 an iron hoop runs round it like a tyre. The echo (phase 3) is the same in
// violet. Every track is `ribbon` (common/trailRibbon): width and alpha go to 0 at both ends in
// every frame, and after the stop it fades by itself. Nothing flashes, the effects stay inside
// the corridor's width (measured in the prototype: 0.48 of a tile at most across the line).
import type { RibbonPoint, Sample, TrailSpec } from '../common/trailRibbon';
import { hash, motes, ribbon, smoothstep } from '../common/trailRibbon';
import { INK, drawEyes, lightGlow } from './hellGhost';

const TAU = Math.PI * 2;
/** The turn into the ball, s before the dash; the return into the body, s after the stop. */
export const MORPH_IN = 0.25;
export const MORPH_OUT = 0.28;
/** The ball's radius, tiles. */
const BALL = 0.32;
type RGB = readonly [number, number, number];

/** The colours of the ball and its track: the boss's lava, or the echo's violet. */
interface LavaLook {
	readonly ramp: ReadonlyArray<readonly [number, RGB]>;
	readonly glow: RGB;
	readonly crust: readonly [string, string, string];
	readonly cracks: readonly [string, string, string];
	readonly seam: RGB;
	readonly embers: ReadonlyArray<readonly [number, RGB]>;
}

// white only at the very head, orange within a tile or two, then a long red and the dark crust
const LAVA: LavaLook = {
	ramp: [
		[0, [255, 236, 180]],
		[0.05, [246, 150, 56]],
		[0.16, [214, 76, 22]],
		[0.55, [140, 32, 14]],
		[1.0, [86, 26, 16]],
		[1.6, [46, 20, 16]],
		[3, [36, 16, 14]]
	],
	glow: [255, 100, 30],
	crust: ['#8a2a10', '#4a160c', '#260806'],
	cracks: ['rgba(255,90,24,0.55)', 'rgba(255,176,70,0.95)', 'rgba(255,240,200,0.95)'],
	seam: [255, 140, 46],
	embers: [
		[0, [255, 214, 120]],
		[0.3, [240, 90, 30]],
		[0.6, [90, 26, 16]],
		[1, [40, 16, 14]]
	]
};
const ECHO: LavaLook = {
	ramp: [
		[0, [244, 236, 255]],
		[0.05, [200, 168, 255]],
		[0.16, [150, 110, 240]],
		[0.55, [96, 64, 180]],
		[1.0, [60, 40, 110]],
		[1.6, [36, 26, 60]],
		[3, [30, 22, 48]]
	],
	glow: [170, 120, 255],
	crust: ['#5a3a9a', '#2e1e56', '#160c2c'],
	cracks: ['rgba(170,120,255,0.55)', 'rgba(210,180,255,0.95)', 'rgba(246,240,255,0.95)'],
	seam: [190, 150, 255],
	embers: [
		[0, [230, 210, 255]],
		[0.3, [160, 110, 250]],
		[0.6, [70, 44, 120]],
		[1, [34, 24, 52]]
	]
};

const LAVA_TRACK: TrailSpec = {
	life: 2.7,
	width: 0.22,
	capHead: 0.35,
	capTail: 0.9,
	ageBias: 0.45
};

const rgba = (c: RGB, a: number): string =>
	`rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${Math.max(0, Math.min(1, a)).toFixed(3)})`;

function ramp(stops: ReadonlyArray<readonly [number, RGB]>, k: number): RGB {
	if (k <= stops[0][0]) {
		return stops[0][1];
	}
	for (let i = 1; i < stops.length; i += 1) {
		const [k1, c1] = stops[i];
		const [k0, c0] = stops[i - 1];
		if (k <= k1) {
			const f = (k - k0) / (k1 - k0);
			return [
				c0[0] + (c1[0] - c0[0]) * f,
				c0[1] + (c1[1] - c0[1]) * f,
				c0[2] + (c1[2] - c0[2]) * f
			];
		}
	}
	return stops[stops.length - 1][1];
}

/**
 * How far into the ball the body has turned during the telegraph, 0..1: the last `MORPH_IN` s of
 * it, eased. The telegraph's length is read from how fast its progress has run (`elapsed` s for
 * `progress`), so any attack that telegraphs as a dash (the dash, the split) gets it. Pure.
 */
export function telegraphMorph(progress: number, elapsed: number): number {
	if (progress <= 0.05 || elapsed <= 0) {
		return 0;
	}
	const left = (elapsed / progress) * (1 - Math.min(1, progress));
	return 1 - smoothstep(0, MORPH_IN, left);
}

/** The return into the body after the stop, from the turn's amount `from`, `since` s ago. Pure. */
export function stopMorph(from: number, since: number): number {
	return from * (1 - smoothstep(0, MORPH_OUT, since));
}

/** A molten edge: the width wobbles with the place on the floor, not with time. */
const melt = (p: RibbonPoint): number =>
	1 + 0.12 * Math.sin(p.x * 0.29 + p.y * 0.29) + 0.07 * Math.sin(p.x * 0.71 + p.y * 0.53 + 1.3);

/**
 * Fills a ribbon: the outline at ±w, the colour from `color` laid along it as a gradient (the
 * dash is a straight line, so a linear gradient follows it exactly).
 */
function fillRibbon(
	c: CanvasRenderingContext2D,
	pts: readonly RibbonPoint[],
	color: (p: RibbonPoint) => string,
	wk = 1,
	wob?: (p: RibbonPoint) => number
): void {
	if (pts.length < 2) {
		return;
	}
	const a = pts[0];
	const b = pts[pts.length - 1];
	if (Math.hypot(b.x - a.x, b.y - a.y) < 0.5) {
		return;
	}
	const w = (p: RibbonPoint) => p.w * wk * (wob ? wob(p) : 1);
	c.beginPath();
	c.moveTo(a.x + a.nx * w(a), a.y + a.ny * w(a));
	for (const p of pts) {
		c.lineTo(p.x + p.nx * w(p), p.y + p.ny * w(p));
	}
	for (let i = pts.length - 1; i >= 0; i -= 1) {
		const p = pts[i];
		c.lineTo(p.x - p.nx * w(p), p.y - p.ny * w(p));
	}
	c.closePath();
	const g = c.createLinearGradient(a.x, a.y, b.x, b.y);
	const step = Math.max(1, Math.floor(pts.length / 40));
	let last = -1;
	for (let i = 0; i < pts.length; i += step) {
		if (pts[i].u > last) {
			g.addColorStop(pts[i].u, color(pts[i]));
			last = pts[i].u;
		}
	}
	g.addColorStop(1, color(b));
	c.fillStyle = g;
	c.fill();
}

/** The crack net on the ball: points on a sphere, each tied to its two nearest, arcs of 6 steps. */
function crackNet(n: number, seed: number): Array<Array<[number, number, number]>> {
	const pts: Array<[number, number, number]> = [];
	for (let i = 0; i < n; i += 1) {
		const z = 1 - (2 * (i + 0.5)) / n;
		const r = Math.sqrt(1 - z * z);
		const a = i * 2.39996 + hash(i, seed) * 0.9;
		pts.push([Math.cos(a) * r, Math.sin(a) * r, z]);
	}
	const seen = new Set<string>();
	const arcs: Array<Array<[number, number, number]>> = [];
	pts.forEach((p, i) => {
		const near = pts
			.map((q, j) => ({ j, d: (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2 + (p[2] - q[2]) ** 2 }))
			.filter((e) => e.j !== i)
			.sort((a, b) => a.d - b.d)
			.slice(0, 2);
		for (const { j } of near) {
			const key = i < j ? `${i}-${j}` : `${j}-${i}`;
			if (seen.has(key)) {
				continue;
			}
			seen.add(key);
			const q = pts[j];
			const arc: Array<[number, number, number]> = [];
			for (let s = 0; s <= 6; s += 1) {
				const f = s / 6;
				const jag = (hash(i * 31 + j, s) - 0.5) * 0.12 * Math.sin(Math.PI * f);
				const x = p[0] + (q[0] - p[0]) * f + jag;
				const y = p[1] + (q[1] - p[1]) * f - jag;
				const z2 = p[2] + (q[2] - p[2]) * f + jag * 0.5;
				const l = Math.hypot(x, y, z2);
				arc.push([x / l, y / l, z2 / l]);
			}
			arcs.push(arc);
		}
	});
	return arcs;
}
const NET = crackNet(30, 1);

/** Rolls a point of the ball about the ground axis across the heading by `roll` radians. */
function rollPt(
	p: readonly [number, number, number],
	heading: number,
	roll: number
): [number, number, number] {
	const kx = -Math.sin(heading);
	const ky = Math.cos(heading);
	const cs = Math.cos(roll);
	const sn = Math.sin(roll);
	const [x, y, z] = p;
	const kd = kx * x + ky * y;
	return [
		x * cs + ky * z * sn + kx * kd * (1 - cs),
		y * cs - kx * z * sn + ky * kd * (1 - cs),
		z * cs + (kx * y - ky * x) * sn
	];
}

/** The bone (phases 1-2) and the iron (phase 3) of the axle studs, lit. */
const STUD = ['#f1e4cc', '#f1e4cc', '#9a8f94'];

/**
 * One body's dash: where the turn into the ball is, the track it lays, the ball's roll. Call
 * `update` every frame with the body's centre in px, then draw its parts in order: the floor
 * (`drawFloor`, `drawCrouch`), the body or the ball, the air (`drawAir`, `drawSteam`).
 */
export class LavaDash {
	private samples: Sample[] = [];
	private teleT0 = -1;
	private dashing = false;
	private stopT = -1;
	private stopFrom = 0;
	private rollV = 0;
	private lastX = Number.NaN;
	private lastY = Number.NaN;
	/** 0 the body .. 1 the ball. */
	morph = 0;
	/** 0..1 while crouching (before the turn). */
	crouch = 0;

	/** `tele`: a dash's telegraph is on (its `progress`); `dash`: the dash runs. */
	update(
		x: number,
		y: number,
		tele: boolean,
		dash: boolean,
		progress: number,
		time: number,
		S: number
	): void {
		if (tele) {
			if (this.teleT0 < 0 || this.dashing) {
				this.teleT0 = time;
			}
			this.morph = telegraphMorph(progress, time - this.teleT0);
			this.crouch = progress;
			this.stopT = -1;
		} else if (dash) {
			this.morph = 1;
			this.crouch = 0;
			this.stopT = -1;
		} else {
			if (this.stopT < 0 && (this.dashing || this.teleT0 >= 0)) {
				this.stopT = time;
				this.stopFrom = this.morph;
			}
			this.teleT0 = -1;
			this.crouch = 0;
			this.morph = this.stopT >= 0 ? stopMorph(this.stopFrom, time - this.stopT) : 0;
		}
		this.dashing = dash;
		if (dash && !Number.isNaN(this.lastX)) {
			this.rollV += Math.hypot(x - this.lastX, y - this.lastY) / (S * BALL);
		}
		this.lastX = x;
		this.lastY = y;
		this.samples.push({ x, y, t: time, emit: this.morph });
		const old = time - 3.2;
		let cut = 0;
		while (cut < this.samples.length && this.samples[cut].t < old) {
			cut += 1;
		}
		if (cut > 0) {
			this.samples.splice(0, cut);
		}
	}

	/** The roll, radians (the turn's last moment winds it up a little before it rolls). */
	get roll(): number {
		return this.rollV + this.morph * 0.6;
	}

	/** The lava track on the floor: cooling colours, a soft glow while hot, crust seams. */
	drawFloor(c: CanvasRenderingContext2D, S: number, time: number, echo: boolean): void {
		const look = echo ? ECHO : LAVA;
		const spec = {
			...LAVA_TRACK,
			width: LAVA_TRACK.width * S,
			capHead: LAVA_TRACK.capHead * S,
			capTail: LAVA_TRACK.capTail * S
		};
		const lava = ribbon(this.samples, time, spec);
		if (lava.length < 2) {
			return;
		}
		c.save();
		fillRibbon(
			c,
			lava,
			(p) => rgba(ramp(look.ramp, p.age), p.a),
			1,
			(p) => melt(p) * (0.85 + 0.25 * smoothstep(0, 1.2, p.age))
		);
		c.globalCompositeOperation = 'lighter';
		fillRibbon(
			c,
			lava,
			(p) => rgba(look.glow, 0.2 * p.a * (1 - smoothstep(0.05, 0.6, p.age))),
			1.6
		);
		c.globalCompositeOperation = 'source-over';
		crustSeams(c, lava, S, look);
		c.restore();
	}

	/** Embers thrown off the track and the smoke the cooling lava gives off, flat. */
	drawAir(c: CanvasRenderingContext2D, S: number, time: number, echo: boolean): void {
		const look = echo ? ECHO : LAVA;
		const step = 1 / 60;
		c.save();
		for (const m of motes(this.samples, time, {
			life: 0.95,
			per: 1,
			speed: S * 1.6,
			drag: 2.2,
			spread: 0.95,
			seed: 13,
			step,
			every: 2,
			back: S * 0.3,
			across: S * 0.42
		})) {
			c.fillStyle = rgba(ramp(look.embers, m.k), m.a * 0.9);
			c.beginPath();
			c.arc(m.x, m.y, S * (0.0275 - 0.0125 * m.k), 0, TAU);
			c.fill();
		}
		for (const m of motes(this.samples, time, {
			life: 1.6,
			per: 1,
			speed: S * 0.5,
			drag: 1.5,
			spread: 1.4,
			seed: 23,
			step,
			every: 4,
			back: S * 0.35,
			across: S * 0.3
		})) {
			const r = S * (0.1 + 0.2 * m.k);
			const g = c.createRadialGradient(m.x, m.y, 0, m.x, m.y, r);
			g.addColorStop(0, `rgba(58,48,46,${(0.22 * m.a).toFixed(3)})`);
			g.addColorStop(1, 'rgba(58,48,46,0)');
			c.fillStyle = g;
			c.fillRect(m.x - r, m.y - r, r * 2, r * 2);
		}
		c.restore();
	}

	/** The crouch: the floor under him glows and cracks as the heat gathers. */
	drawCrouch(c: CanvasRenderingContext2D, x: number, y: number, S: number, echo: boolean): void {
		const k = this.crouch * (1 - this.morph);
		if (k <= 0.01) {
			return;
		}
		const look = echo ? ECHO : LAVA;
		lightGlow(c, x, y, S * 0.55, look.glow.join(','), 0.28 * k);
		c.save();
		c.lineCap = 'round';
		c.strokeStyle = rgba(look.seam, 0.75 * k);
		c.lineWidth = Math.max(0.8, S * 0.03);
		for (let i = 0; i < 5; i += 1) {
			const a = hash(i, 5) * TAU;
			const len = S * (0.22 + 0.22 * hash(i, 6)) * smoothstep(0, 0.8, k);
			c.beginPath();
			c.moveTo(x + Math.cos(a) * S * 0.15, y + Math.sin(a) * S * 0.15);
			c.lineTo(
				x + Math.cos(a + 0.2) * (S * 0.15 + len * 0.6),
				y + Math.sin(a + 0.2) * (S * 0.15 + len * 0.6)
			);
			c.lineTo(
				x + Math.cos(a - 0.05) * (S * 0.15 + len),
				y + Math.sin(a - 0.05) * (S * 0.15 + len)
			);
			c.stroke();
		}
		c.restore();
	}

	/**
	 * The ball at (x, y): dark crust warmer on its front, the crack net rolling with it (the near
	 * half only, fading at the limb), the phase's iron, a thick ink line, his eyes on its front.
	 */
	drawBall(
		c: CanvasRenderingContext2D,
		x: number,
		y: number,
		S: number,
		heading: number,
		phase: number,
		time: number,
		echo: boolean,
		hit: number
	): void {
		const m = this.morph;
		if (m <= 0.001) {
			return;
		}
		const look = echo ? ECHO : LAVA;
		const r = S * BALL * (0.6 + 0.4 * m);
		const hx = Math.cos(heading);
		const hy = Math.sin(heading);
		const roll = this.roll;
		c.save();
		c.globalAlpha *= smoothstep(0, 0.55, m);
		const g = c.createRadialGradient(x + hx * r * 0.35, y + hy * r * 0.35, r * 0.1, x, y, r);
		g.addColorStop(0, look.crust[0]);
		g.addColorStop(0.6, look.crust[1]);
		g.addColorStop(1, look.crust[2]);
		c.fillStyle = g;
		c.beginPath();
		c.arc(x, y, r, 0, TAU);
		c.fill();
		c.save();
		c.beginPath();
		c.arc(x, y, r * 0.98, 0, TAU);
		c.clip();
		c.lineCap = 'round';
		const base = c.globalAlpha;
		const widths = [0.1, 0.045, 0.018];
		look.cracks.forEach((col, wi) => {
			c.strokeStyle = col;
			c.lineWidth = Math.max(0.8, S * widths[wi] * (0.5 + 0.5 * m));
			for (const arc of NET) {
				for (let s = 1; s < arc.length; s += 1) {
					const p = rollPt(arc[s - 1], heading, roll);
					const q = rollPt(arc[s], heading, roll);
					const z = (p[2] + q[2]) / 2;
					if (z <= 0) {
						continue;
					}
					const front =
						0.65 + 0.35 * Math.max(0, ((p[0] + q[0]) / 2) * hx + ((p[1] + q[1]) / 2) * hy);
					c.globalAlpha = base * smoothstep(0, 0.35, z) * front;
					c.beginPath();
					c.moveTo(x + p[0] * r, y + p[1] * r);
					c.lineTo(x + q[0] * r, y + q[1] * r);
					c.stroke();
				}
			}
		});
		c.globalAlpha = base;
		// from phase 2 an iron hoop runs round the ball along its roll, its rivets rolling on it
		if (phase >= 2 && !echo) {
			c.save();
			c.translate(x, y);
			c.rotate(heading);
			const hw = r * 0.2;
			const ig = c.createLinearGradient(0, -hw, 0, hw);
			ig.addColorStop(0, '#9a8f94');
			ig.addColorStop(1, '#3a3236');
			c.fillStyle = ig;
			c.fillRect(-r, -hw, r * 2, hw * 2);
			c.strokeStyle = INK;
			c.lineWidth = Math.max(1, S * 0.03);
			c.strokeRect(-r * 1.2, -hw, r * 2.4, hw * 2);
			for (let k = 0; k < 6; k += 1) {
				const a = roll + (k / 6) * TAU;
				const z = Math.cos(a);
				if (z <= 0.05) {
					continue;
				}
				c.globalAlpha = base * smoothstep(0.05, 0.4, z);
				c.fillStyle = INK;
				c.beginPath();
				c.arc(Math.sin(a) * r, 0, S * 0.03, 0, TAU);
				c.fill();
			}
			c.restore();
			c.globalAlpha = base;
		}
		if (hit > 0) {
			c.fillStyle = `rgba(255,255,255,${0.85 * hit})`;
			c.fillRect(x - r, y - r, r * 2, r * 2);
		}
		c.restore();
		// the outline, thick and dark: the ball must part from the red floor
		c.strokeStyle = INK;
		c.lineWidth = Math.max(1.6, S * 0.06);
		c.beginPath();
		c.arc(x, y, r, 0, TAU);
		c.stroke();
		// the axle studs at the ends of the roll's axis: bone horns, long iron ones in phase 3
		for (const side of [-1, 1]) {
			const ax = -Math.sin(heading) * side;
			const ay = Math.cos(heading) * side;
			const len = S * [0.1, 0.12, 0.17][Math.min(3, Math.max(1, phase)) - 1];
			const bx = x + ax * r * 0.92;
			const by = y + ay * r * 0.92;
			const tx = bx + ax * len - hx * len * 0.5;
			const ty = by + ay * len - hy * len * 0.5;
			const th = S * (phase >= 3 ? 0.06 : 0.05);
			c.beginPath();
			c.moveTo(bx - hx * th, by - hy * th);
			c.quadraticCurveTo(
				bx + ax * len * 0.6 + hx * th * 0.3,
				by + ay * len * 0.6 + hy * th * 0.3,
				tx,
				ty
			);
			c.quadraticCurveTo(
				bx + ax * len * 0.4 - hx * th * 0.6,
				by + ay * len * 0.4 - hy * th * 0.6,
				bx + hx * th,
				by + hy * th
			);
			c.closePath();
			c.fillStyle = echo ? '#e8dcff' : STUD[Math.min(3, Math.max(1, phase)) - 1];
			c.fill();
			c.lineWidth = Math.max(1, S * 0.03);
			c.strokeStyle = INK;
			c.stroke();
		}
		// his eyes on the ball's front, upright, looking where it rolls
		drawEyes(
			c,
			x + hx * r * 0.18,
			y + hy * r * 0.18 - r * 0.02,
			r * 0.78,
			heading,
			{ sclera: echo ? '#f4eeff' : '#fff4d8', glow: look.glow.join(',') },
			0.9,
			false,
			time
		);
		c.restore();
	}

	/** Steam the spent body pants out after the stop, spreading flat round him and thinning. */
	drawSteam(
		c: CanvasRenderingContext2D,
		x: number,
		y: number,
		S: number,
		time: number,
		recover: number
	): void {
		if (this.stopT < 0) {
			return;
		}
		const since = time - this.stopT;
		c.save();
		const N = 16;
		for (let i = 0; i < N; i += 1) {
			const born = (i / N) * recover * 0.9;
			const age = since - born;
			const life = 0.9 + 0.3 * hash(i, 2);
			if (age < 0 || age > life) {
				continue;
			}
			const k = age / life;
			const ang = hash(i, 1) * TAU;
			const d = S * (0.18 + 0.28 * Math.sqrt(k));
			const px = x + Math.cos(ang) * d + S * 0.12 * k;
			const py = y + Math.sin(ang) * d - S * 0.06 * k;
			const r = S * (0.08 + 0.16 * k);
			const a = smoothstep(0, 0.15, k) * (1 - smoothstep(0.4, 1, k)) * 0.5;
			const g = c.createRadialGradient(px, py, 0, px, py, r);
			g.addColorStop(0, `rgba(236,226,216,${a.toFixed(3)})`);
			g.addColorStop(1, 'rgba(236,226,216,0)');
			c.fillStyle = g;
			c.fillRect(px - r, py - r, r * 2, r * 2);
		}
		c.restore();
	}
}

/**
 * Seams in the setting crust: an irregular net of plates (never even strokes: hatching is the
 * language of the boss's warnings). Knots sit at seeded places on the floor, two across the
 * track per step along it, tied to their neighbours and now and then to the rim. They glow
 * while the crust is young, then go dark; their reach follows the track's width.
 */
function crustSeams(
	c: CanvasRenderingContext2D,
	pts: readonly RibbonPoint[],
	S: number,
	look: LavaLook
): void {
	if (pts.length < 3) {
		return;
	}
	const n0 = pts[0];
	const along = (p: { x: number; y: number }) => -n0.ny * p.x + n0.nx * p.y;
	const sv = pts.map(along);
	const lo = Math.min(...sv);
	const hi = Math.max(...sv);
	const at = (s: number) => {
		for (let i = 1; i < pts.length; i += 1) {
			const a = sv[i - 1];
			const b = sv[i];
			if ((s - a) * (s - b) > 0) {
				continue;
			}
			const f = b === a ? 0 : (s - a) / (b - a);
			const p = pts[i - 1];
			const q = pts[i];
			const m = (u: number, v: number) => u + (v - u) * f;
			return {
				x: m(p.x, q.x),
				y: m(p.y, q.y),
				w: m(p.w, q.w),
				a: m(p.a, q.a),
				age: m(p.age, q.age),
				nx: q.nx,
				ny: q.ny
			};
		}
		return null;
	};
	const gap = S * 0.26;
	const knot = (k: number, j: number) => {
		const s = (k + 0.5 + (hash(k * 2 + j, 1) - 0.5) * 0.8) * gap;
		const t = at(s);
		if (!t) {
			return null;
		}
		const off = (j ? 1 : -1) * (0.15 + 0.4 * hash(k * 2 + j, 2));
		return { ...t, x: t.x + t.nx * off * t.w, y: t.y + t.ny * off * t.w, off };
	};
	c.save();
	c.lineCap = 'round';
	type Knot = NonNullable<ReturnType<typeof knot>>;
	const seam = (p: Knot, qx: number, qy: number, qa: number, qage: number) => {
		const age = (p.age + qage) / 2;
		const a = Math.min(p.a, qa) * smoothstep(0.35, 0.8, age);
		if (a < 0.02) {
			return;
		}
		const glow = 1 - smoothstep(0.7, 1.7, age);
		const col: RGB =
			glow > 0.02
				? ramp(
						[
							[0, look.seam],
							[1, [26, 8, 8]]
						],
						1 - glow
					)
				: [20, 8, 8];
		c.strokeStyle = rgba(col, a * (0.55 + 0.45 * glow));
		c.lineWidth = Math.max(0.7, S * (0.018 + 0.012 * glow));
		c.beginPath();
		c.moveTo(p.x, p.y);
		c.lineTo(qx, qy);
		c.stroke();
	};
	for (let k = Math.floor(lo / gap) - 1; k <= Math.ceil(hi / gap); k += 1) {
		const A = knot(k, 0);
		const B = knot(k, 1);
		const A2 = knot(k + 1, 0);
		const B2 = knot(k + 1, 1);
		if (A && B) {
			seam(A, B.x, B.y, B.a, B.age);
		}
		if (A && A2 && hash(k, 3) < 0.65) {
			seam(A, A2.x, A2.y, A2.a, A2.age);
		}
		if (B && B2 && hash(k, 4) < 0.65) {
			seam(B, B2.x, B2.y, B2.a, B2.age);
		}
		if (A && B2 && hash(k, 5) < 0.3) {
			seam(A, B2.x, B2.y, B2.a, B2.age);
		}
		for (const [P, j] of [
			[A, 0],
			[B, 1]
		] as const) {
			if (!P || hash(k * 2 + j, 6) > 0.5) {
				continue;
			}
			const sgn = P.off < 0 ? -1 : 1;
			seam(P, P.x + P.nx * sgn * P.w * 0.55, P.y + P.ny * sgn * P.w * 0.55, P.a, P.age);
		}
	}
	c.restore();
}
