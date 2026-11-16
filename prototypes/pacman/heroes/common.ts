// What the three hero directions share: the pose they are drawn in, the heroes' colours (calm and
// in rage), the orientation (the mouth leads, the eyes stay up), the eye, the mouth-cut body, the
// rage burst. Everything centred at (0, 0) in the hero's own frame: +x is ahead, -y is up.
import {
	BOW_SPAN,
	PINK_TINT,
	paintedBow
} from '../../../src/games/pacman/render/actors/hero/MsPacmanHero';
import type { HeroSeason } from '../../../src/games/pacman/render/actors/hero/heroSeasons';

export type Ctx = CanvasRenderingContext2D;
export const TAU = Math.PI * 2;

/** How a hero stands this frame (the page fills it from a runner or a frame of the sheet). */
export interface HeroPose {
	readonly ms: boolean;
	/** 0 the nimble form, 1 the rage form (energizer / overdrive); between: the turn. */
	readonly rage: number;
	/** Heading, radians (0 = right). */
	readonly angle: number;
	/** 0 standing .. 1 running. */
	readonly speed: number;
	/** 0 shut .. 1 wide open. */
	readonly chomp: number;
	/** A turn's kick, -1 (left) .. 1 (right), decaying. */
	readonly turn: number;
	readonly time: number;
	/** 0..1 the burst of the turn into rage (0 and 1: none). */
	readonly burst: number;
	readonly season: HeroSeason;
	readonly dpr: number;
}

export type HeroPainter = (c: Ctx, x: number, y: number, S: number, p: HeroPose) => void;

export interface HeroColors {
	readonly body: string;
	readonly shade: string;
	readonly light: string;
	readonly ink: string;
	/** The rage glow, `r,g,b`. */
	readonly glow: string;
}

export const PAC: HeroColors = {
	body: '#ffd23a',
	shade: '#e8961c',
	light: '#fff3a6',
	ink: '#2a1208',
	glow: '255,150,40'
};
export const PAC_RAGE: HeroColors = {
	body: '#ff9e22',
	shade: '#d6401a',
	light: '#ffe58a',
	ink: '#2a0a04',
	glow: '255,110,30'
};
export const MS: HeroColors = {
	body: '#f06ab4',
	shade: '#c23c86',
	light: '#ffc8e6',
	ink: '#2e061a',
	glow: '255,120,210'
};
export const MS_RAGE: HeroColors = {
	body: '#ff86d6',
	shade: '#b02e96',
	light: '#ffe6f7',
	ink: '#2e061a',
	glow: '190,120,255'
};

export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const smooth = (t: number) => {
	const u = clamp01(t);
	return u * u * (3 - 2 * u);
};

function hexRgb(hex: string): [number, number, number] {
	return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];
}

/** A colour between two hex colours. */
export function mix(a: string, b: string, t: number): string {
	const A = hexRgb(a);
	const B = hexRgb(b);
	const k = clamp01(t);
	return `rgb(${A.map((v, i) => Math.round(v + ((B[i] as number) - v) * k)).join(',')})`;
}

export function colorsOf(p: HeroPose): HeroColors & { mix: (key: 'body' | 'shade' | 'light') => string } {
	const calm = p.ms ? MS : PAC;
	const rage = p.ms ? MS_RAGE : PAC_RAGE;
	return {
		...calm,
		glow: rage.glow,
		mix: (key) => mix(calm[key], rage[key], p.rage)
	};
}

/** A repeatable random number in 0..1 for (a, b). */
export function hash(a: number, b = 0): number {
	let h = Math.imul(a | 0, 0x27d4eb2d) ^ Math.imul((b | 0) + 0x9e3779b9, 0x85ebca6b);
	h ^= h >>> 15;
	h = Math.imul(h, 0x2c1b3c6d);
	h ^= h >>> 12;
	return ((h >>> 0) % 100000) / 100000;
}

/**
 * Turns the context to the hero's frame at (x, y): the mouth leads, and the head's top stays
 * up (left is a mirror, not a half turn; up and down turn a quarter).
 */
export function orient(c: Ctx, x: number, y: number, angle: number): void {
	c.translate(x, y);
	const cx = Math.cos(angle);
	const sy = Math.sin(angle);
	if (Math.abs(cx) >= Math.abs(sy)) {
		if (cx < 0) c.scale(-1, 1);
	} else if (sy < 0) {
		c.rotate(-Math.PI / 2);
	} else {
		c.scale(-1, 1);
		c.rotate(-Math.PI / 2);
	}
}

/** The mouth's half angle for a chomp (and a wider one in rage). */
export function mouthOf(p: HeroPose): number {
	return lerp(0.06, lerp(0.72, 0.95, p.rage), clamp01(p.chomp));
}

/** A round body with the mouth's wedge cut out, hinged a little behind the centre. */
export function mouthBody(c: Ctx, rx: number, ry: number, mouth: number): void {
	c.beginPath();
	c.moveTo(-rx * 0.12, 0);
	c.ellipse(0, 0, rx, ry, 0, mouth, TAU - mouth);
	c.closePath();
}

/**
 * Cel shading inside the current path: the shade, a lit part offset up and back, a highlight;
 * then the ink outline.
 */
export function celFill(
	c: Ctx,
	R: number,
	body: string,
	shade: string,
	light: string,
	ink: string,
	inkW: number
): void {
	c.save();
	c.fillStyle = shade;
	c.fill();
	c.clip();
	c.beginPath();
	c.arc(-R * 0.1, -R * 0.12, R * 0.9, 0, TAU);
	c.fillStyle = body;
	c.fill();
	c.beginPath();
	c.ellipse(-R * 0.42, -R * 0.48, R * 0.2, R * 0.12, -0.6, 0, TAU);
	c.fillStyle = light;
	c.fill();
	c.restore();
	c.strokeStyle = ink;
	c.lineWidth = inkW;
	c.lineJoin = 'round';
	c.stroke();
}

export type EyeMood = 'calm' | 'fierce' | 'spiral';

/** One eye at (x, y) of radius r: calm (round, a sparkle), fierce (a narrow glowing slit), spiral. */
export function eye(c: Ctx, x: number, y: number, r: number, mood: EyeMood, ink: string, t: number, glow = '255,200,80'): void {
	c.save();
	c.lineJoin = 'round';
	c.lineCap = 'round';
	if (mood === 'fierce') {
		c.save();
		c.globalCompositeOperation = 'lighter';
		const g = c.createRadialGradient(x, y, 0, x, y, r * 2.2);
		g.addColorStop(0, `rgba(${glow},.75)`);
		g.addColorStop(1, `rgba(${glow},0)`);
		c.fillStyle = g;
		c.beginPath();
		c.arc(x, y, r * 2.2, 0, TAU);
		c.fill();
		c.restore();
		c.beginPath();
		c.moveTo(x - r * 1.05, y + r * 0.1);
		c.quadraticCurveTo(x, y - r * 0.75, x + r * 1.1, y - r * 0.35);
		c.quadraticCurveTo(x + r * 0.2, y + r * 0.55, x - r * 1.05, y + r * 0.1);
		c.fillStyle = '#fffbe8';
		c.fill();
		c.strokeStyle = ink;
		c.lineWidth = r * 0.32;
		c.stroke();
		// the heavy brow
		c.beginPath();
		c.moveTo(x - r * 1.2, y - r * 0.55);
		c.lineTo(x + r * 1.15, y - r * 1.05);
		c.lineWidth = r * 0.5;
		c.stroke();
	} else if (mood === 'spiral') {
		c.beginPath();
		c.arc(x, y, r, 0, TAU);
		c.fillStyle = '#ffffff';
		c.fill();
		c.strokeStyle = ink;
		c.lineWidth = r * 0.28;
		c.stroke();
		c.beginPath();
		for (let i = 0; i <= 40; i++) {
			const a = (i / 40) * TAU * 2.2 + t * 6;
			const rr = (i / 40) * r * 0.85;
			const px = x + Math.cos(a) * rr;
			const py = y + Math.sin(a) * rr;
			if (i === 0) c.moveTo(px, py);
			else c.lineTo(px, py);
		}
		c.strokeStyle = '#b02e96';
		c.lineWidth = r * 0.22;
		c.stroke();
	} else {
		c.beginPath();
		c.ellipse(x, y, r * 0.82, r, 0, 0, TAU);
		c.fillStyle = '#ffffff';
		c.fill();
		c.strokeStyle = ink;
		c.lineWidth = r * 0.3;
		c.stroke();
		c.beginPath();
		c.ellipse(x + r * 0.28, y + r * 0.08, r * 0.46, r * 0.58, 0, 0, TAU);
		c.fillStyle = ink;
		c.fill();
		c.beginPath();
		c.arc(x + r * 0.12, y - r * 0.22, r * 0.2, 0, TAU);
		c.fillStyle = '#ffffff';
		c.fill();
		// a short brow, set forward: keen, not sleepy
		c.beginPath();
		c.moveTo(x - r * 0.7, y - r * 1.3);
		c.quadraticCurveTo(x + r * 0.1, y - r * 1.55, x + r * 0.95, y - r * 1.2);
		c.strokeStyle = ink;
		c.lineWidth = r * 0.34;
		c.stroke();
	}
	c.restore();
}

/** Ms. Pac-Man's bow (the game's own painter), its knot at (x, y), tipped by `tilt`. */
export function bow(c: Ctx, x: number, y: number, R: number, tilt: number, season: HeroSeason, dpr: number, scale = 0.8): void {
	const half = R * BOW_SPAN * scale;
	c.save();
	c.translate(x, y);
	c.rotate(tilt);
	c.drawImage(paintedBow(R * dpr * scale, season, PINK_TINT), -half, -half, half * 2, half * 2);
	c.restore();
}

/** Two fangs on the mouth's edges (in rage), pointing into the mouth. */
export function fangs(c: Ctx, R: number, mouth: number, size: number, ink: string): void {
	for (const side of [-1, 1]) {
		const a = side * mouth;
		const ex = Math.cos(a) * R * 0.86;
		const ey = Math.sin(a) * R * 0.86;
		// along the edge toward the hinge, and across it into the mouth
		const ux = -Math.cos(a);
		const uy = -Math.sin(a);
		const nx = -side * Math.sin(a) * -1;
		const ny = side * Math.cos(a) * -1;
		c.beginPath();
		c.moveTo(ex, ey);
		c.lineTo(ex + ux * size * 0.9, ey + uy * size * 0.9);
		c.lineTo(ex + ux * size * 0.45 + nx * size, ey + uy * size * 0.45 + ny * size);
		c.closePath();
		c.fillStyle = '#fffaf0';
		c.fill();
		c.strokeStyle = ink;
		c.lineWidth = size * 0.22;
		c.lineJoin = 'round';
		c.stroke();
	}
}

/** The turn into rage (`k` 0..1): a ring going out, sparks, a flash. Drawn in screen space. */
export function rageBurst(c: Ctx, x: number, y: number, R: number, k: number, glow: string): void {
	if (k <= 0 || k >= 1) return;
	c.save();
	c.globalCompositeOperation = 'lighter';
	const f = Math.sin(Math.PI * k);
	const g = c.createRadialGradient(x, y, 0, x, y, R * 2.4);
	g.addColorStop(0, `rgba(255,250,230,${0.8 * f})`);
	g.addColorStop(0.45, `rgba(${glow},${0.45 * f})`);
	g.addColorStop(1, `rgba(${glow},0)`);
	c.fillStyle = g;
	c.beginPath();
	c.arc(x, y, R * 2.4, 0, TAU);
	c.fill();
	c.strokeStyle = `rgba(${glow},${1 - k})`;
	c.lineWidth = R * 0.18 * (1 - k);
	c.beginPath();
	c.arc(x, y, R * (1.1 + 2.2 * k), 0, TAU);
	c.stroke();
	c.lineCap = 'round';
	c.lineWidth = R * 0.1;
	for (let i = 0; i < 10; i++) {
		const a = (i / 10) * TAU + 0.3;
		const d0 = R * (1 + 1.6 * k);
		const d1 = d0 + R * 0.5 * (1 - k);
		c.strokeStyle = `rgba(255,240,200,${1 - k})`;
		c.beginPath();
		c.moveTo(x + Math.cos(a) * d0, y + Math.sin(a) * d0);
		c.lineTo(x + Math.cos(a) * d1, y + Math.sin(a) * d1);
		c.stroke();
	}
	c.restore();
}

/** A ribbon from (x0, y0) streaming back (-x) `len` long, waving; `w0` → 0 wide. */
export function ribbon(
	c: Ctx,
	x0: number,
	y0: number,
	len: number,
	w0: number,
	wave: (u: number) => number,
	fill: string | CanvasGradient,
	ink: string,
	inkW: number
): void {
	const n = 14;
	const top: Array<[number, number]> = [];
	const bot: Array<[number, number]> = [];
	for (let i = 0; i <= n; i++) {
		const u = i / n;
		const x = x0 - len * u;
		const y = y0 + wave(u);
		const w = w0 * (1 - u * 0.75) * 0.5;
		top.push([x, y - w]);
		bot.push([x, y + w]);
	}
	c.beginPath();
	top.forEach(([x, y], i) => (i === 0 ? c.moveTo(x, y) : c.lineTo(x, y)));
	for (let i = bot.length - 1; i >= 0; i--) c.lineTo(bot[i]![0], bot[i]![1]);
	c.closePath();
	c.fillStyle = fill;
	c.fill();
	c.strokeStyle = ink;
	c.lineWidth = inkW;
	c.lineJoin = 'round';
	c.stroke();
}
