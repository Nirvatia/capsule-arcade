// The stepper, the station's squad creature (DESIGN.md §7a): since 2026-11-27 the owner's pick of
// the candidates, in place of the amoeba (a drifting jelly with no expression). A gel blob on four
// stubby feet with a face and a crest of its kind. Drawn the game's way (DESIGN.md §12): cel-shaded,
// hard tone bands, an ink line that leans heavier to the lower right, a rim light, the key light
// upper left, a contact shadow on the floor. One painter, a few values, so every look is a morph:
//   heat 0..1: the overheat, comic and a little frightening: lit lime from inside, a deep rim,
//     hairline cracks, narrow glowing sockets under a heavy brow, a grin that splits the body and
//     chomps, embers, the floor lit; the feet and the crest keep the kind's colour so the four stay
//     four;
//   tell 0..1: the gaze turns gold, a crouch and a shiver, the glow amber;
//   fright 0..1: the classic blue (white in the blink), wide eyes with pinprick pupils, a wavy
//     mouth, a sweat drop, the feet flailing, a tremble.
// BLINKY the hunter, PINKY the sly, INKY the nervous, CLYDE the dozy: in the lids, the crest, the
// mouth and the gait, and in the rage in how the brows and the sockets sit.
import type { GhostKind } from '../../logic/actors/GhostModel';

export interface StepperOpts {
	readonly lookX: number;
	readonly lookY: number;
	readonly faceX: number;
	readonly faceY: number;
	readonly time: number;
	/** Distance travelled as a stride phase (radians). */
	readonly step: number;
	/** 0 calm .. 1 overheated. */
	readonly heat: number;
	/** The tell's gold, 0..1. */
	readonly tell?: number;
	/** The fright, 0..1; `white` is the blink's white half. */
	readonly fright?: number;
	readonly white?: boolean;
}

type Ctx = CanvasRenderingContext2D;
type Shape = (c: Ctx, ox: number, oy: number, k: number) => void;
const TAU = Math.PI * 2;
const INK = '#1b0f15';
const ORDER: readonly GhostKind[] = ['BLINKY', 'PINKY', 'INKY', 'CLYDE'];

// ----------------------------------------------------------------------------------- colour

type RGB = readonly [number, number, number];
const rgbOf = (hex: string): RGB => [
	parseInt(hex.slice(1, 3), 16),
	parseInt(hex.slice(3, 5), 16),
	parseInt(hex.slice(5, 7), 16)
];
const rgba = (a: RGB, alpha: number): string => `rgba(${a[0]}, ${a[1]}, ${a[2]}, ${alpha})`;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const smooth = (e0: number, e1: number, x: number) => {
	const k = clamp((x - e0) / (e1 - e0), 0, 1);
	return k * k * (3 - 2 * k);
};

interface Kind {
	readonly shade: RGB;
	readonly base: RGB;
	readonly light: RGB;
	readonly rim: RGB;
}
const KIND: Readonly<Record<GhostKind, Kind>> = {
	BLINKY: {
		shade: rgbOf('#8a1c2a'),
		base: rgbOf('#d83a3e'),
		light: rgbOf('#ff7c68'),
		rim: rgbOf('#ffb0a0')
	},
	PINKY: {
		shade: rgbOf('#7a2878'),
		base: rgbOf('#c8479f'),
		light: rgbOf('#ff90dc'),
		rim: rgbOf('#ffc0f0')
	},
	INKY: {
		shade: rgbOf('#135f78'),
		base: rgbOf('#26a0c6'),
		light: rgbOf('#80f0ff'),
		rim: rgbOf('#b4f8ff')
	},
	CLYDE: {
		shade: rgbOf('#8a4812'),
		base: rgbOf('#e08a22'),
		light: rgbOf('#ffc660'),
		rim: rgbOf('#ffdca0')
	}
};
/** The overheat: lit lime inside, a deep green rim. */
const HOT = {
	shade: rgbOf('#1b3f0a'),
	base: rgbOf('#72b81c'),
	light: rgbOf('#c9fb48'),
	core: rgbOf('#fbffd2')
};

const FRIGHT = {
	shade: rgbOf('#1c2a98'),
	base: rgbOf('#3b52d8'),
	light: rgbOf('#84a0ff'),
	rim: rgbOf('#c8d4ff')
};
const WHITE = {
	shade: rgbOf('#9ca6cf'),
	base: rgbOf('#dde2f8'),
	light: rgbOf('#ffffff'),
	rim: rgbOf('#ffffff')
};
const GOLD: RGB = [255, 200, 71];

interface Pal {
	readonly shade: string;
	readonly base: string;
	readonly light: string;
	/** The rim light's colour and the lit edge's. */
	readonly rim: RGB;
	readonly edge: RGB;
	readonly glow: RGB;
}
const lerpRGB = (a: RGB, b: RGB, t: number): RGB => [
	Math.round(a[0] + (b[0] - a[0]) * t),
	Math.round(a[1] + (b[1] - a[1]) * t),
	Math.round(a[2] + (b[2] - a[2]) * t)
];

/** The kind's palette taken toward the overheat's by `heat`, or toward the fright's blue (white in
 *  the blink) by `fright`; the rim stays the kind's while it is only hot. */
function palette(kind: GhostKind, heat: number, fright = 0, white = false): Pal {
	const k = KIND[kind];
	const h = smooth(0, 1, heat);
	const scared = white ? WHITE : FRIGHT;
	const f = clamp(fright, 0, 1);
	const shade = lerpRGB(lerpRGB(k.shade, HOT.shade, h), scared.shade, f);
	const base = lerpRGB(lerpRGB(k.base, HOT.base, h), scared.base, f);
	const light = lerpRGB(lerpRGB(k.light, HOT.light, h), scared.light, f);
	return {
		shade: rgba(shade, 1),
		base: rgba(base, 1),
		light: rgba(light, 1),
		rim: lerpRGB(k.rim, scared.rim, f),
		edge: lerpRGB(k.light, scared.light, f),
		glow: light
	};
}

// -------------------------------------------------------------------------------- the toolkit

const ell =
	(cx: number, cy: number, rx: number, ry: number, rot = 0): Shape =>
	(c, ox, oy, k) => {
		c.moveTo(cx + ox + Math.cos(rot) * rx * k, cy + oy + Math.sin(rot) * rx * k);
		c.ellipse(cx + ox, cy + oy, Math.max(0.001, rx * k), Math.max(0.001, ry * k), rot, 0, TAU);
	};

/** A shape in cel bands: the base, the shade crescent at the lower right, a light band at the
 *  upper left, then the ink, heavier toward the lower right. */
function cel(
	c: Ctx,
	shape: Shape,
	p: { shade: string; base: string; light: string },
	px: number,
	o: { ink?: number; sh?: number; lightK?: number; lightOff?: number } = {}
): void {
	const ink = Math.max(o.ink ?? 0.045, px * 1.6);
	const sh = o.sh ?? 0.05;
	const lo = o.lightOff ?? 0.05;
	c.save();
	c.beginPath();
	shape(c, 0, 0, 1);
	c.fillStyle = p.base;
	c.fill();
	c.clip();
	c.beginPath();
	shape(c, 0, 0, 1);
	shape(c, -sh, -sh * 1.05, 1);
	c.fillStyle = p.shade;
	c.fill('evenodd');
	c.beginPath();
	shape(c, -lo, -lo * 1.1, o.lightK ?? 0.62);
	c.fillStyle = p.light;
	c.fill();
	c.restore();
	c.lineJoin = 'round';
	c.lineCap = 'round';
	// the line leans heavier to the lower right: a wider pass nudged that way under the plain one
	c.beginPath();
	shape(c, ink * 0.06, ink * 0.08, 1);
	c.strokeStyle = INK;
	c.lineWidth = ink * 1.14;
	c.stroke();
	c.beginPath();
	shape(c, 0, 0, 1);
	c.lineWidth = ink;
	c.stroke();
}

function disc(c: Ctx, x: number, y: number, r: number, fill: string): void {
	c.beginPath();
	c.arc(x, y, Math.max(0.001, r), 0, TAU);
	c.fillStyle = fill;
	c.fill();
}

/** The body: a pear, heavier at the base, a flat floor under it; `hunch` squashes it wide. */
function bodyShape(sx: number, sy: number): Shape {
	return (c, ox, oy, k) => {
		c.save();
		c.translate(ox, oy);
		c.scale(k, k);
		const a = 0.355 * sx;
		const t = -0.305 * sy;
		const b = 0.27 * sy;
		c.moveTo(0, t);
		c.bezierCurveTo(a * 0.62, t, a, t * 0.5, a, 0.0);
		c.bezierCurveTo(a, b * 0.62, a * 0.66, b, 0, b);
		c.bezierCurveTo(-a * 0.66, b, -a, b * 0.62, -a, 0.0);
		c.bezierCurveTo(-a, t * 0.5, -a * 0.62, t, 0, t);
		c.closePath();
		c.restore();
	};
}

// ------------------------------------------------------------------------------------- face

/** The kinds' characters: the calm lids (cover, slant), the stride's speed, the lean, the sway. */
const SOUL: Readonly<
	Record<GhostKind, { cover: number; slant: number; speed: number; lean: number; sway: number }>
> = {
	BLINKY: { cover: 0.36, slant: 0.5, speed: 1.15, lean: 0.07, sway: 0 },
	PINKY: { cover: 0.42, slant: -0.08, speed: 1, lean: 0.03, sway: 0.05 },
	INKY: { cover: 0, slant: 0, speed: 1.3, lean: 0, sway: 0.02 },
	CLYDE: { cover: 0.5, slant: -0.4, speed: 0.75, lean: 0.01, sway: 0.03 }
};
/** The rage's sockets per kind: the slant of the left and the right (inner end down), a size. */
const FURY: Readonly<Record<GhostKind, { slant: [number, number]; size: [number, number] }>> = {
	BLINKY: { slant: [0.55, 0.55], size: [1, 1] },
	PINKY: { slant: [0.12, 0.46], size: [1, 1.04] },
	INKY: { slant: [0.3, 0.18], size: [1, 1.3] },
	CLYDE: { slant: [0.5, 0.1], size: [0.82, 1.06] }
};
const hashOf = (i: number, k: number) => {
	const s = Math.sin(i * 127.1 + k * 311.7) * 43758.5453;
	return s - Math.floor(s);
};

/** A calm eye: a glossy ball, a big pupil on the gaze, two glints, a lid by the kind's mood. */
function eyeCalm(
	c: Ctx,
	p: Pal,
	kind: GhostKind,
	x: number,
	y: number,
	er: number,
	side: number,
	o: StepperOpts,
	px: number,
	alpha: number,
	fx: { gold?: number; scared?: number; plain?: boolean } = {}
): void {
	if (alpha <= 0.01) return;
	const soul = SOUL[kind];
	const scared = fx.scared ?? 0;
	const gold = fx.gold ?? 0;
	const cover = fx.plain ? 0 : soul.cover * (1 - scared);
	c.save();
	c.globalAlpha *= alpha;
	const sclera = c.createRadialGradient(x - er * 0.25, y - er * 0.3, er * 0.1, x, y, er * 1.05);
	sclera.addColorStop(0, '#ffffff');
	sclera.addColorStop(0.7, '#f2ecdc');
	sclera.addColorStop(1, '#cfc4ad');
	c.beginPath();
	c.arc(x, y, er, 0, TAU);
	c.fillStyle = sclera;
	c.fill();
	c.save();
	c.clip();
	const nervous = kind === 'INKY' && !fx.plain ? 1 : 0;
	const jx =
		nervous * Math.sin(o.time * 7.3 + side) * er * 0.2 +
		scared * Math.sin(o.time * 38 + side) * er * 0.14;
	const jy = nervous * Math.cos(o.time * 9.1 + side) * er * 0.16;
	const pxg = x + o.faceX * er * 0.38 + jx;
	const pyg = y + o.faceY * er * 0.38 + jy;
	if (gold > 0.01) {
		const gg = c.createRadialGradient(pxg, pyg, 0, pxg, pyg, er * 1.0);
		gg.addColorStop(0, rgba(GOLD, 0.95 * gold));
		gg.addColorStop(0.7, rgba(GOLD, 0.55 * gold));
		gg.addColorStop(1, rgba(GOLD, 0));
		c.fillStyle = gg;
		c.fillRect(x - er, y - er, er * 2, er * 2);
	}
	disc(c, pxg, pyg, er * (0.62 - 0.26 * scared - 0.1 * gold), '#160b11');
	disc(c, pxg - er * 0.2, pyg - er * 0.24, er * 0.24, '#ffffff');
	disc(c, pxg + er * 0.22, pyg + er * 0.2, er * 0.1, 'rgba(255, 255, 255, 0.65)');
	// the shade the lid and the brow throw on the ball
	const top = c.createLinearGradient(0, y - er, 0, y);
	top.addColorStop(0, 'rgba(60, 30, 40, 0.34)');
	top.addColorStop(1, 'rgba(60, 30, 40, 0)');
	c.fillStyle = top;
	c.fillRect(x - er, y - er, er * 2, er);
	if (cover > 0.01) {
		c.translate(x, y);
		c.rotate(-side * soul.slant);
		const edge = -er + 2 * er * cover;
		c.fillStyle = p.base;
		c.fillRect(-er * 2, -er * 2, er * 4, er * 2 + edge);
		c.fillStyle = p.light;
		c.fillRect(-er * 2, -er * 2, er * 4, er * 0.85 + edge * 0.5);
		c.fillStyle = p.shade;
		c.fillRect(-er * 2, edge - er * 0.22, er * 4, er * 0.22);
		c.beginPath();
		c.moveTo(-er * 2, edge);
		c.lineTo(er * 2, edge);
		c.strokeStyle = INK;
		c.lineWidth = Math.max(px * 1.4, er * 0.2);
		c.stroke();
	}
	c.restore();
	c.beginPath();
	c.arc(x, y, er, 0, TAU);
	c.strokeStyle = INK;
	c.lineWidth = Math.max(px * 1.4, er * 0.2);
	c.stroke();
	c.restore();
}

/** A narrow socket and the heavy brow over it; the pupil glows toward the gaze. */
function socket(
	c: Ctx,
	p: Pal,
	x: number,
	y: number,
	size: number,
	slant: number,
	side: number,
	o: StepperOpts,
	px: number,
	alpha: number
): void {
	if (alpha <= 0.01) return;
	c.save();
	c.globalAlpha *= alpha;
	c.translate(x, y);
	c.rotate(-side * slant);
	const w = 0.1 * size;
	const h = 0.04 * size;
	c.beginPath();
	c.moveTo(-w, 0.1 * h);
	c.quadraticCurveTo(-w * 0.1, -h * 1.9, w, -h * 0.8);
	c.quadraticCurveTo(w * 0.15, h * 1.5, -w, 0.1 * h);
	c.closePath();
	c.fillStyle = INK;
	c.fill();
	c.save();
	c.clip();
	const gx = o.faceX * w * 0.38;
	const gy = o.faceY * h * 0.4;
	const g = c.createRadialGradient(gx, gy, 0, gx, gy, w * 0.95);
	g.addColorStop(0, 'rgba(253, 255, 214, 1)');
	g.addColorStop(0.3, 'rgba(236, 255, 140, 0.96)');
	g.addColorStop(0.75, 'rgba(163, 224, 44, 0.35)');
	g.addColorStop(1, 'rgba(163, 224, 44, 0)');
	c.fillStyle = g;
	c.fillRect(-w * 1.2, -h * 1.4, w * 2.4, h * 2.8);
	c.restore();
	c.lineJoin = 'round';
	c.strokeStyle = INK;
	c.lineWidth = Math.max(px * 1.6, 0.034);
	c.stroke();
	// the brow ridge: a wedge, thick at the nose and tapering out, its lower edge lit
	const bw = 0.128 * size;
	c.beginPath();
	c.moveTo(-bw, -h * 0.75);
	c.lineTo(-bw * 1.02, -h * 1.75);
	c.quadraticCurveTo(0, -h * 2.0, bw * 1.08, -h * 2.45);
	c.quadraticCurveTo(bw * 0.4, -h * 1.5, bw * 0.15, -h * 1.1);
	c.closePath();
	c.fillStyle = INK;
	c.fill();
	c.beginPath();
	c.moveTo(-bw * 0.9, -h * 0.8);
	c.quadraticCurveTo(0, -h * 1.15, bw * 0.55, -h * 1.5);
	c.strokeStyle = rgba(p.rim, 0.5);
	c.lineWidth = Math.max(px, 0.011);
	c.stroke();
	c.restore();
}

/** A small calm mouth by kind. */
function mouthCalm(
	c: Ctx,
	p: Pal,
	kind: GhostKind,
	x: number,
	y: number,
	px: number,
	alpha: number
): void {
	if (alpha <= 0.01) return;
	c.save();
	c.globalAlpha *= alpha;
	c.translate(x, y);
	c.lineCap = 'round';
	c.lineJoin = 'round';
	const w = Math.max(px * 1.8, 0.034);
	if (kind === 'BLINKY') {
		// a tight grim line, one fang over it
		c.beginPath();
		c.moveTo(-0.07, 0.005);
		c.quadraticCurveTo(0, -0.012, 0.07, 0.01);
		c.strokeStyle = INK;
		c.lineWidth = w;
		c.stroke();
		c.beginPath();
		c.moveTo(0.02, 0);
		c.lineTo(0.037, 0.045);
		c.lineTo(0.052, 0.004);
		c.closePath();
		c.fillStyle = '#f6f0dc';
		c.fill();
		c.lineWidth = Math.max(px, 0.02);
		c.stroke();
	} else if (kind === 'PINKY') {
		// a smirk that climbs on one side, a dimple
		c.beginPath();
		c.moveTo(-0.07, 0.012);
		c.quadraticCurveTo(0.01, 0.05, 0.085, -0.025);
		c.strokeStyle = INK;
		c.lineWidth = w;
		c.stroke();
		c.beginPath();
		c.moveTo(0.1, -0.02);
		c.lineTo(0.112, -0.045);
		c.lineWidth = Math.max(px, 0.02);
		c.stroke();
	} else if (kind === 'INKY') {
		// a small worried o
		c.beginPath();
		c.ellipse(0, 0.012, 0.032, 0.04, 0, 0, TAU);
		c.fillStyle = '#2a0c18';
		c.fill();
		c.strokeStyle = INK;
		c.lineWidth = w;
		c.stroke();
	} else {
		// a lopsided mouth, the tongue out
		c.beginPath();
		c.moveTo(-0.075, 0);
		c.quadraticCurveTo(0, 0.06, 0.08, 0.006);
		c.strokeStyle = INK;
		c.lineWidth = w;
		c.stroke();
		cel(
			c,
			ell(0.035, 0.05, 0.034, 0.05, 0.2),
			{ shade: '#c44a68', base: '#ff7a96', light: '#ffb0c0' },
			px,
			{ ink: 0.026, sh: 0.014, lightK: 0.55, lightOff: 0.01 }
		);
	}
	void p;
	c.restore();
}

/** A wavy mouth, the fright's. */
function mouthScared(c: Ctx, x: number, y: number, px: number, alpha: number, t: number): void {
	if (alpha <= 0.01) return;
	c.save();
	c.globalAlpha *= alpha;
	c.translate(x, y);
	c.beginPath();
	for (let i = 0; i <= 6; i++) {
		const px2 = -0.085 + i * 0.0283;
		const py2 = (i % 2 ? -0.022 : 0.022) + Math.sin(t * 30 + i) * 0.004;
		if (i) c.lineTo(px2, py2);
		else c.moveTo(px2, py2);
	}
	c.strokeStyle = INK;
	c.lineWidth = Math.max(px * 1.8, 0.034);
	c.lineJoin = 'round';
	c.lineCap = 'round';
	c.stroke();
	c.restore();
}

/** A sweat drop sliding down the head. */
function sweat(c: Ctx, x: number, y: number, px: number, alpha: number): void {
	if (alpha <= 0.01) return;
	c.save();
	c.globalAlpha *= alpha;
	c.beginPath();
	c.moveTo(x, y - 0.06);
	c.quadraticCurveTo(x + 0.05, y + 0.01, x, y + 0.045);
	c.quadraticCurveTo(x - 0.05, y + 0.01, x, y - 0.06);
	c.fillStyle = '#c4e6ff';
	c.fill();
	c.strokeStyle = INK;
	c.lineWidth = Math.max(px * 1.4, 0.024);
	c.lineJoin = 'round';
	c.stroke();
	disc(c, x - 0.012, y, 0.01, '#ffffff');
	c.restore();
}

/** The grin that splits the hot body: teeth in cream and shade, a lit gum, the chomp. */
function grin(
	c: Ctx,
	kind: GhostKind,
	x: number,
	y: number,
	open: number,
	px: number,
	alpha: number
): void {
	if (alpha <= 0.01) return;
	c.save();
	c.globalAlpha *= alpha;
	const W = 0.262;
	const cy = y - 0.05;
	const mid = y - 0.025;
	const bot = y + 0.075 + open * 0.115;
	const lowCtl = bot * 2 - mid;
	const path = () => {
		c.beginPath();
		c.moveTo(x - W, cy);
		c.quadraticCurveTo(x, mid - 0.02, x + W, cy);
		c.quadraticCurveTo(x, lowCtl, x - W, cy);
		c.closePath();
	};
	path();
	const inner = c.createLinearGradient(0, mid - 0.04, 0, bot);
	inner.addColorStop(0, '#ffffe8');
	inner.addColorStop(0.45, '#ecff8c');
	inner.addColorStop(1, '#9bd62a');
	c.fillStyle = inner;
	c.fill();
	c.save();
	path();
	c.clip();
	const idx = ORDER.indexOf(kind);
	const N = 7;
	for (const dir of [1, -1]) {
		for (let k = 0; k < N; k++) {
			const t = (k + 0.5) / N;
			const lx = x + W * (2 * t - 1);
			const edge =
				dir === 1
					? (1 - t) ** 2 * cy + 2 * t * (1 - t) * (mid - 0.02) + t * t * cy
					: (1 - t) ** 2 * cy + 2 * t * (1 - t) * lowCtl + t * t * cy;
			const len = (0.065 + 0.05 * hashOf(k + dir * 9, idx)) * (0.55 + 0.8 * Math.sin(Math.PI * t));
			const tipx = lx + (hashOf(k, idx + dir) - 0.5) * 0.018;
			const tipy = edge + dir * len;
			c.beginPath();
			c.moveTo(lx - 0.034, edge);
			c.lineTo(tipx, tipy);
			c.lineTo(lx + 0.034, edge);
			c.closePath();
			c.fillStyle = '#f4efd2';
			c.fill();
			// the shade side of the tooth
			c.beginPath();
			c.moveTo(lx + 0.004, edge);
			c.lineTo(tipx, tipy);
			c.lineTo(lx + 0.034, edge);
			c.closePath();
			c.fillStyle = '#c9c294';
			c.fill();
			c.strokeStyle = INK;
			c.lineWidth = Math.max(px, 0.012);
			c.lineJoin = 'round';
			c.beginPath();
			c.moveTo(lx - 0.034, edge);
			c.lineTo(tipx, tipy);
			c.lineTo(lx + 0.034, edge);
			c.stroke();
		}
	}
	c.restore();
	path();
	c.strokeStyle = INK;
	c.lineWidth = Math.max(px * 1.9, 0.044);
	c.lineJoin = 'round';
	c.stroke();
	// the creases at the corners of the grin
	for (const side of [-1, 1]) {
		c.beginPath();
		c.moveTo(x + side * (W + 0.004), cy - 0.008);
		c.lineTo(x + side * (W + 0.026), cy - 0.034);
		c.stroke();
	}
	c.restore();
}

// ----------------------------------------------------------------------------------- crests

/** What sets a kind apart on top of its head, in its own cel bands; hot, the tips glow. */
function crest(
	c: Ctx,
	p: Pal,
	kind: GhostKind,
	o: StepperOpts,
	x: number,
	y: number,
	lean: number,
	px: number
): void {
	c.save();
	c.translate(x, y);
	const hot = smooth(0, 1, o.heat);
	if (kind === 'BLINKY') {
		for (const [k, h] of [
			[-1, 0.2],
			[0, 0.27],
			[1, 0.2]
		] as const) {
			const bx = k * 0.1;
			const tip = bx + lean * (1 + k * 0.25) + k * 0.03;
			const shape: Shape = (cc, ox, oy, kk) => {
				cc.save();
				cc.translate(ox, oy);
				cc.scale(kk, kk);
				cc.moveTo(bx - 0.075, 0.06);
				cc.quadraticCurveTo(bx - 0.04, -h * 0.5, tip, -h);
				cc.quadraticCurveTo(bx + 0.04, -h * 0.4, bx + 0.075, 0.06);
				cc.closePath();
				cc.restore();
			};
			cel(c, shape, p, px, { ink: 0.028, sh: 0.025, lightK: 0.55, lightOff: 0.02 });
			if (hot > 0.05) disc(c, tip, -h + 0.02, 0.028, rgba(HOT.core, 0.9 * hot));
		}
	} else if (kind === 'PINKY') {
		// a bulb on a short stalk
		const tx = 0.07 + lean * 1.6;
		c.beginPath();
		c.moveTo(0.02, 0.07);
		c.quadraticCurveTo(0.03 + lean, -0.04, tx, -0.1);
		c.strokeStyle = INK;
		c.lineWidth = Math.max(px * 3.4, 0.07);
		c.lineCap = 'round';
		c.stroke();
		c.strokeStyle = p.base;
		c.lineWidth = Math.max(px * 2, 0.04);
		c.stroke();
		cel(c, ell(tx, -0.125, 0.062, 0.062), p, px, {
			ink: 0.036,
			sh: 0.02,
			lightK: 0.55,
			lightOff: 0.016
		});
		disc(c, tx - 0.02, -0.14, 0.014, 'rgba(255, 255, 255, 0.85)');
	} else if (kind === 'INKY') {
		// an antenna that bobs, its lamp pointing the way
		const bob = Math.sin(o.time * 4) * 0.025;
		const tx = lean * 1.6 + bob;
		c.beginPath();
		c.moveTo(0, 0.08);
		c.quadraticCurveTo(lean * 0.6, -0.1, tx, -0.2);
		c.strokeStyle = INK;
		c.lineWidth = Math.max(px * 2.6, 0.05);
		c.lineCap = 'round';
		c.stroke();
		const g = c.createRadialGradient(tx, -0.2, 0.004, tx, -0.2, 0.14);
		g.addColorStop(0, rgba(KIND.INKY.rim, 0.95));
		g.addColorStop(0.35, rgba(KIND.INKY.light, 0.5));
		g.addColorStop(1, rgba(KIND.INKY.light, 0));
		c.fillStyle = g;
		c.beginPath();
		c.arc(tx, -0.2, 0.14, 0, TAU);
		c.fill();
		disc(c, tx, -0.2, 0.034, '#ffffff');
		c.beginPath();
		c.arc(tx, -0.2, 0.034, 0, TAU);
		c.strokeStyle = INK;
		c.lineWidth = Math.max(px, 0.02);
		c.stroke();
	} else {
		// a droopy lobe hanging to one side
		cel(c, ell(-0.15, 0.04, 0.115, 0.075, -0.45), p, px, {
			ink: 0.04,
			sh: 0.025,
			lightK: 0.55,
			lightOff: 0.018
		});
	}
	c.restore();
}

// ----------------------------------------------------------------------------------- the body

/** One foot on the ground plane: `u` along the way, `v` across it. */
interface Foot {
	readonly u: number;
	readonly v: number;
	readonly fp: number;
}
const FEET: readonly Foot[] = [
	{ u: 0.16, v: -0.17, fp: 0 },
	{ u: 0.16, v: 0.17, fp: Math.PI },
	{ u: -0.16, v: -0.17, fp: Math.PI },
	{ u: -0.16, v: 0.17, fp: 0 }
];

export function drawStepper(
	c: Ctx,
	x: number,
	y: number,
	S: number,
	kind: GhostKind,
	o: StepperOpts
): void {
	const heat = clamp(o.heat, 0, 1);
	const tl = clamp(o.tell ?? 0, 0, 1);
	const fr = clamp(o.fright ?? 0, 0, 1);
	const p = palette(kind, heat, fr, o.white);
	const soul = SOUL[kind];
	const fury = FURY[kind];
	const dx = o.lookX || o.lookY ? o.lookX : 0;
	const dy = o.lookX || o.lookY ? o.lookY : 1;
	const sx = -dy;
	const sy = dx;
	const px = 1 / S;
	const t = o.time;
	const ph = o.step * soul.speed * (1 + 0.75 * heat + 0.9 * fr);
	const stomp = Math.abs(Math.sin(ph));
	const hop = stomp * (0.032 + 0.02 * heat);
	const open = (0.5 + 0.5 * Math.sin(t * 8 + ph * 0.3)) * heat;
	c.save();
	c.translate(x, y);
	c.scale(S, S);
	// the floor: a contact shadow, and the heat lighting it
	const sh = c.createRadialGradient(0.02, 0.29, 0.02, 0.02, 0.29, 0.42);
	sh.addColorStop(0, 'rgba(0, 0, 0, 0.42)');
	sh.addColorStop(1, 'rgba(0, 0, 0, 0)');
	c.save();
	c.translate(0, 0.29);
	c.scale(1, 0.3);
	c.translate(0, -0.29);
	c.fillStyle = sh;
	c.beginPath();
	c.arc(0.02, 0.29, 0.42, 0, TAU);
	c.fill();
	c.restore();
	// the glow of its colour, within the tile; hotter and greener as it overheats
	const halo = c.createRadialGradient(0, 0, 0.05, 0, 0, 0.78);
	const haloRGB = lerpRGB(p.glow, GOLD, tl);
	halo.addColorStop(0, rgba(haloRGB, 0.2 + 0.12 * heat + 0.1 * tl));
	halo.addColorStop(1, rgba(haloRGB, 0));
	c.fillStyle = halo;
	c.beginPath();
	c.arc(0, 0, 0.78, 0, TAU);
	c.fill();
	// the feet, far ones before the body and near ones after
	const feet = FEET.map((f) => {
		const sw = Math.sin(ph + f.fp);
		const lift = Math.max(0, sw);
		const u = f.u + (0.08 + 0.03 * heat) * sw;
		const gx = dx * u + sx * f.v;
		const gy = (dy * u + sy * f.v) * 0.42 + 0.2;
		return { gx, gy, lift };
	});
	// the feet and the crest keep the kind's own colour, so the four stay four when the body goes lime
	const kindPal = palette(kind, 0.12 * heat, fr, o.white);
	const footPal = kindPal;
	const paintFoot = (f: { gx: number; gy: number; lift: number }) => {
		c.save();
		c.translate(f.gx, f.gy);
		disc(c, 0.01, 0.045, 0.07 * (1 - 0.3 * f.lift), `rgba(0, 0, 0, ${0.3 * (1 - f.lift * 0.6)})`);
		cel(c, ell(0, -f.lift * (0.07 + 0.03 * heat), 0.108, 0.076), footPal, px, {
			ink: 0.03,
			sh: 0.024,
			lightK: 0.58,
			lightOff: 0.018
		});
		c.restore();
	};
	for (const f of feet) if (f.gy < 0.2) paintFoot(f);
	// the body: hunched and wide as it heats, squashing as the jaws open; a small shake
	const wob = Math.sin(ph) * soul.sway;
	const shake = 0.009 * heat + 0.007 * tl + (o.white ? 0 : 0.012 * fr);
	const bx = dx * (soul.lean + 0.035 * heat) + sx * wob + Math.sin(t * 41 + ph) * shake;
	const by =
		dy * (soul.lean + 0.035 * heat) + sy * wob + 0.03 * heat - hop + Math.cos(t * 37) * shake;
	const throb = 1 + 0.025 * heat * Math.sin(t * 13);
	const bsx = (1 + 0.04 * heat + 0.05 * open + 0.03 * Math.cos(ph * 2)) * throb;
	const bsy = (1 - 0.06 * heat - 0.06 * open - 0.03 * Math.cos(ph * 2) - 0.05 * tl) * (2 - throb);
	const shear = -(soul.lean * 0.45 + 0.03 * heat) * dx;
	c.save();
	c.translate(bx, by - 0.02);
	c.transform(1, 0, shear, 1, 0, 0);
	// the crest behind the head, so the body closes over its roots
	crest(c, kindPal, kind, o, 0, -0.275 * bsy, dx * 0.08 * (1 + heat), px);
	const body = bodyShape(bsx, bsy);
	cel(c, body, p, px, { ink: 0.042, sh: 0.062, lightK: 0.66, lightOff: 0.058 });
	c.save();
	c.beginPath();
	body(c, 0, 0, 1);
	c.clip();
	// the gel is lit from inside: a soft glow at its heart, a bright rim at the lower right
	const heart = c.createRadialGradient(0.01, 0.03, 0.01, 0.01, 0.03, 0.32);
	heart.addColorStop(0, rgba(heat > 0.01 ? HOT.core : p.rim, 0.28 + 0.52 * heat));
	heart.addColorStop(1, rgba(p.glow, 0));
	c.globalCompositeOperation = 'lighter';
	c.fillStyle = heart;
	c.fillRect(-0.4, -0.4, 0.8, 0.8);
	c.globalCompositeOperation = 'source-over';
	c.beginPath();
	body(c, 0, 0, 1);
	c.strokeStyle = rgba(p.edge, 0.8);
	c.lineWidth = Math.max(px * 1.6, 0.026);
	// only the lower-right edge keeps the rim: the rest is covered by the upper-left shift
	c.save();
	c.beginPath();
	body(c, -0.05, -0.058, 1);
	body(c, 0, 0, 3);
	c.clip('evenodd');
	c.beginPath();
	body(c, 0, 0, 0.965);
	c.stroke();
	c.restore();
	// the gloss, as a curved streak and a dot, fading as it heats
	const gloss = 1 - 0.85 * heat;
	if (gloss > 0.02) {
		c.beginPath();
		c.arc(-0.02, -0.02, 0.27, Math.PI * 1.08, Math.PI * 1.38);
		c.strokeStyle = `rgba(255, 255, 255, ${0.62 * gloss})`;
		c.lineWidth = Math.max(px * 2.2, 0.034);
		c.lineCap = 'round';
		c.stroke();
		disc(c, -0.205, -0.075, 0.017, `rgba(255, 255, 255, ${0.7 * gloss})`);
	}
	// the heat's marks: a dark vignette at the rim, hairline cracks, bubbles climbing inside
	if (heat > 0.02) {
		const soot = c.createRadialGradient(0, -0.02, 0.18, 0, -0.02, 0.4);
		soot.addColorStop(0, 'rgba(10, 30, 5, 0)');
		soot.addColorStop(1, `rgba(10, 30, 5, ${0.5 * heat})`);
		c.fillStyle = soot;
		c.fillRect(-0.4, -0.4, 0.8, 0.8);
		const idx = ORDER.indexOf(kind);
		c.strokeStyle = `rgba(22, 52, 8, ${0.75 * heat})`;
		c.lineWidth = Math.max(px, 0.014);
		c.lineCap = 'round';
		c.lineJoin = 'round';
		const cox = dx * 0.09;
		const coy = -0.02 + dy * 0.07 + 0.045 * heat - 0.06;
		for (const side of [-1, 1]) {
			for (let k = 0; k < 3; k++) {
				let ax = cox + side * (0.17 + 0.03 * k);
				let ay = coy - 0.02 - 0.02 * k;
				const a0 = -Math.PI / 2 + side * (0.55 + 0.55 * k);
				c.beginPath();
				c.moveTo(ax, ay);
				for (let q = 0; q < 3; q++) {
					ax += Math.cos(a0 + (hashOf(k + q + side * 5, idx + 3) - 0.5) * 1.1) * 0.05;
					ay += Math.sin(a0 + (hashOf(k + q + side * 5, idx + 5) - 0.5) * 1.1) * 0.05;
					c.lineTo(ax, ay);
				}
				c.stroke();
			}
		}
		for (let k = 0; k < 3; k++) {
			const kk = (t * 0.55 + k / 3) % 1;
			const bxx = -0.15 + k * 0.15 + Math.sin(t * 2 + k) * 0.015;
			disc(
				c,
				bxx,
				0.2 - kk * 0.36,
				0.012 + 0.014 * kk,
				`rgba(251, 255, 210, ${0.6 * (1 - kk) * heat})`
			);
		}
		// the grin's light spilling over the cheeks
		const spill = c.createRadialGradient(0.0, 0.1, 0.02, 0.0, 0.1, 0.26);
		spill.addColorStop(0, `rgba(251, 255, 210, ${0.5 * heat})`);
		spill.addColorStop(1, 'rgba(251, 255, 210, 0)');
		c.fillStyle = spill;
		c.fillRect(-0.4, -0.2, 0.8, 0.6);
	} else {
		// a calm gel's bubbles
		disc(c, 0.12, 0.1, 0.022, 'rgba(255, 255, 255, 0.22)');
		disc(c, 0.17, 0.045, 0.012, 'rgba(255, 255, 255, 0.2)');
	}
	c.restore();
	// the face, lowered on the hunched body: calm eyes and mouth fade out as the sockets and grin come in
	const calm = 1 - smooth(0.2, 0.48, heat);
	const fury2 = smooth(0.46, 0.74, heat);
	const fx = dx * 0.09;
	const fy = -0.02 + dy * 0.07 + 0.045 * heat;
	for (const [i, side] of [-1, 1].entries()) {
		eyeCalm(c, p, kind, fx + side * 0.145, fy - 0.025, 0.105 + 0.012 * fr, side, o, px, calm, {
			gold: tl,
			scared: fr
		});
		socket(c, p, fx + side * 0.148, fy - 0.04, fury.size[i], fury.slant[i], side, o, px, fury2);
	}
	mouthCalm(c, p, kind, fx, fy + 0.15, px, calm * (1 - fr));
	mouthScared(c, fx, fy + 0.155, px, calm * fr, t);
	sweat(c, fx + 0.27, fy - 0.2 + ((t * 1.1) % 1) * 0.14, px, fr * (1 - ((t * 1.1) % 1) * 0.7));
	grin(c, kind, fx, fy + 0.095, open, px, fury2);
	c.restore();
	for (const f of feet) if (f.gy >= 0.2) paintFoot(f);
	// embers off the head
	if (heat > 0.05) {
		for (let i = 0; i < 3; i++) {
			const k = (t * 0.7 + i * 0.36) % 1;
			const ex = (i - 1) * 0.12 + Math.sin(t * 3 + i) * 0.03;
			const ey = -0.36 - k * 0.2;
			disc(c, ex, ey, 0.03, `rgba(190, 255, 80, ${0.2 * (1 - k) * heat})`);
			disc(c, ex, ey, 0.013, `rgba(251, 255, 210, ${0.95 * (1 - k) * heat})`);
		}
	}
	c.restore();
}

/** An eaten one: only its eyes, gold, running home. */
export function drawStepperEyes(
	c: Ctx,
	x: number,
	y: number,
	S: number,
	o: Pick<StepperOpts, 'lookX' | 'lookY' | 'faceX' | 'faceY' | 'time'>
): void {
	c.save();
	c.translate(x, y + Math.sin(o.time * 4) * 0.03 * S);
	c.scale(S, S);
	const p = palette('BLINKY', 0);
	const so: StepperOpts = { ...o, step: 0, heat: 0 };
	for (const side of [-1, 1])
		eyeCalm(c, p, 'BLINKY', side * 0.15, 0, 0.12, side, so, 1 / S, 1, { gold: 1, plain: true });
	c.restore();
}
