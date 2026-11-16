// The `powers` prototype's candidates, all in code, in the heroes' ink-outlined cel style:
// the ability icons (the token on the board and the HUD slot), the hero's ghost form for the
// mask (the season's ghost painter, `cuteGhost`, in the hero's colours), the turn into it and
// back, and the shock in two looks. Pure drawing; the page (`main.ts`) lays it out.
import { drawCuteGhost } from '../../../src/games/pacman/render/actors/cuteGhost';
import type { CuteShape, Palette } from '../../../src/games/pacman/render/actors/cuteGhost';
import type { GhostKind } from '../../../src/games/pacman/logic/actors/GhostModel';
import {
	BOW_SPAN,
	PINK_TINT,
	paintedBow
} from '../../../src/games/pacman/render/actors/hero/MsPacmanHero';
import type { HeroSeason } from '../../../src/games/pacman/render/actors/hero/heroSeasons';

type Ctx = CanvasRenderingContext2D;
const TAU = Math.PI * 2;
const INK = '#241418';

/** A repeatable random number in 0..1 for (a, b). */
export function hash(a: number, b = 0): number {
	let h = Math.imul(a | 0, 0x27d4eb2d) ^ Math.imul((b | 0) + 0x9e3779b9, 0x85ebca6b);
	h ^= h >>> 15;
	h = Math.imul(h, 0x2c1b3c6d);
	h ^= h >>> 12;
	return ((h >>> 0) % 100000) / 100000;
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const easeOut = (v: number) => 1 - (1 - v) * (1 - v);
const easeIn = (v: number) => v * v;
function backOut(v: number): number {
	const s = 2.2;
	const u = v - 1;
	return 1 + u * u * ((s + 1) * u + s);
}

// ── a sprite canvas, for whitening and glows ────────────────────────────────

const sprites = new Map<number, HTMLCanvasElement>();

/** Draws `paint` (centred at 0, 0) into a scratch canvas of `size` px and returns it. */
function sprite(size: number, paint: (c: Ctx) => void, key = 0): HTMLCanvasElement {
	const side = Math.max(8, Math.ceil(size));
	const id = side * 10 + key;
	let canvas = sprites.get(id);
	if (!canvas) {
		canvas = document.createElement('canvas');
		canvas.width = canvas.height = side;
		sprites.set(id, canvas);
	}
	const c = canvas.getContext('2d') as Ctx;
	c.setTransform(1, 0, 0, 1, 0, 0);
	c.globalCompositeOperation = 'source-over';
	c.globalAlpha = 1;
	c.clearRect(0, 0, side, side);
	c.translate(side / 2, side / 2);
	paint(c);
	return canvas;
}

/** Tints what is on the sprite toward `color` by `k` (0..1), keeping its shape. */
function tint(canvas: HTMLCanvasElement, color: string, k: number): HTMLCanvasElement {
	if (k <= 0) return canvas;
	const c = canvas.getContext('2d') as Ctx;
	c.setTransform(1, 0, 0, 1, 0, 0);
	c.globalCompositeOperation = 'source-atop';
	c.globalAlpha = clamp01(k);
	c.fillStyle = color;
	c.fillRect(0, 0, canvas.width, canvas.height);
	c.globalCompositeOperation = 'source-over';
	c.globalAlpha = 1;
	return canvas;
}

function blit(c: Ctx, canvas: HTMLCanvasElement, x: number, y: number): void {
	c.drawImage(canvas, x - canvas.width / 2, y - canvas.height / 2);
}

// ── the token's frame: a breathing halo and ring, as the echo's ────────────

function halo(c: Ctx, x: number, y: number, S: number, rgb: string, t: number, a = 1): void {
	const pulse = 0.5 + 0.5 * Math.sin(t * 4);
	const r = S * (0.62 + 0.06 * pulse);
	const g = c.createRadialGradient(x, y, 0, x, y, r);
	g.addColorStop(0, `rgba(${rgb},${0.38 * a})`);
	g.addColorStop(0.55, `rgba(${rgb},${0.14 * a})`);
	g.addColorStop(1, `rgba(${rgb},0)`);
	c.save();
	c.globalCompositeOperation = 'lighter';
	c.fillStyle = g;
	c.beginPath();
	c.arc(x, y, r, 0, TAU);
	c.fill();
	c.restore();
	c.save();
	c.strokeStyle = `rgba(${rgb},${(0.55 + 0.35 * pulse) * a})`;
	c.lineWidth = Math.max(1, S * 0.045);
	c.beginPath();
	c.arc(x, y, S * (0.41 + 0.04 * pulse), 0, TAU);
	c.stroke();
	c.restore();
}

/** A four-point sparkle. */
function sparkle(c: Ctx, x: number, y: number, r: number, color: string): void {
	c.beginPath();
	c.moveTo(x, y - r);
	c.quadraticCurveTo(x, y, x + r, y);
	c.quadraticCurveTo(x, y, x, y + r);
	c.quadraticCurveTo(x, y, x - r, y);
	c.quadraticCurveTo(x, y, x, y - r);
	c.fillStyle = color;
	c.fill();
}

// ── the icons ────────────────────────────────────────────────────────────────

export type IconId = 'm1' | 'm2' | 'm3' | 's1' | 's2' | 's3';

export const ICON_NAMES: Record<IconId, string> = {
	m1: 'M1 · простыня',
	m2: 'M2 · карнавальная маска',
	m3: 'M3 · пополам',
	s1: 'S1 · молния',
	s2: 'S2 · плазменный шар',
	s3: 'S3 · искра'
};

/** An ability icon centred at (x, y) on a tile of `S` px; `blinking`: its last seconds. */
export function drawIcon(c: Ctx, id: IconId, x: number, y: number, S: number, t: number): void {
	c.save();
	c.lineJoin = 'round';
	c.lineCap = 'round';
	const bob = Math.sin(t * 3) * S * 0.025;
	switch (id) {
		case 'm1':
			halo(c, x, y, S, '255,206,84', t);
			iconSheet(c, x, y + bob, S);
			break;
		case 'm2':
			halo(c, x, y, S, '255,206,84', t);
			iconDomino(c, x, y + bob, S, t);
			break;
		case 'm3':
			halo(c, x, y, S, '255,206,84', t);
			iconSplit(c, x, y + bob, S);
			break;
		case 's1':
			halo(c, x, y, S, '120,210,255', t);
			crackleRing(c, x, y, S * 0.43, S, t, 3);
			iconBolt(c, x, y + bob, S);
			break;
		case 's2':
			halo(c, x, y, S, '150,170,255', t);
			iconOrb(c, x, y + bob, S, t);
			break;
		case 's3':
			halo(c, x, y, S, '120,210,255', t);
			iconSpark(c, x, y + bob, S, t);
			break;
	}
	c.restore();
}

/** M1: a little gold ghost sheet with two eye holes. */
function iconSheet(c: Ctx, x: number, y: number, S: number): void {
	const r = S * 0.22;
	const top = y - r * 0.25;
	c.beginPath();
	c.arc(x, top, r, Math.PI, 0);
	c.lineTo(x + r, y + r * 0.95);
	const n = 3;
	for (let i = 0; i < n; i++) {
		const a = x + r - (i * 2 * r) / n;
		const b = x + r - ((i + 1) * 2 * r) / n;
		c.quadraticCurveTo((a + b) / 2, y + r * 0.5, b, y + r * 0.95);
	}
	c.closePath();
	const g = c.createLinearGradient(x, top - r, x, y + r);
	g.addColorStop(0, '#fff2a8');
	g.addColorStop(0.55, '#ffd23f');
	g.addColorStop(1, '#e99a1c');
	c.fillStyle = g;
	c.fill();
	c.strokeStyle = INK;
	c.lineWidth = Math.max(1, S * 0.05);
	c.stroke();
	for (const side of [-1, 1]) {
		c.beginPath();
		c.ellipse(x + side * r * 0.38, top + r * 0.05, r * 0.17, r * 0.26, 0, 0, TAU);
		c.fillStyle = INK;
		c.fill();
	}
	c.beginPath();
	c.ellipse(x - r * 0.55, top - r * 0.55, r * 0.18, r * 0.1, -0.6, 0, TAU);
	c.fillStyle = 'rgba(255,255,255,.85)';
	c.fill();
}

/** M2: a carnival domino mask, gold, with red ribbon tails. */
function iconDomino(c: Ctx, x: number, y: number, S: number, t: number): void {
	const w = S * 0.3;
	const h = S * 0.15;
	// ribbon tails behind
	c.strokeStyle = INK;
	c.lineWidth = Math.max(1, S * 0.04);
	for (const side of [-1, 1]) {
		const sway = Math.sin(t * 2.4 + side) * S * 0.02;
		c.beginPath();
		c.moveTo(x + side * w * 0.95, y - h * 0.2);
		c.quadraticCurveTo(x + side * w * 1.25, y + h * 0.4, x + side * w * 1.1 + sway, y + h * 1.5);
		c.lineTo(x + side * w * 0.9 + sway, y + h * 1.35);
		c.quadraticCurveTo(x + side * w * 1.05, y + h * 0.4, x + side * w * 0.8, y + h * 0.1);
		c.closePath();
		c.fillStyle = '#e2364a';
		c.fill();
		c.stroke();
	}
	c.beginPath();
	c.moveTo(x, y - h * 0.55);
	c.bezierCurveTo(x + w * 0.45, y - h * 1.25, x + w * 1.05, y - h * 1.0, x + w, y - h * 0.05);
	c.bezierCurveTo(x + w * 0.95, y + h * 0.95, x + w * 0.35, y + h * 1.05, x + w * 0.12, y + h * 0.55);
	c.quadraticCurveTo(x, y + h * 0.25, x - w * 0.12, y + h * 0.55);
	c.bezierCurveTo(x - w * 0.35, y + h * 1.05, x - w * 0.95, y + h * 0.95, x - w, y - h * 0.05);
	c.bezierCurveTo(x - w * 1.05, y - h * 1.0, x - w * 0.45, y - h * 1.25, x, y - h * 0.55);
	c.closePath();
	const g = c.createLinearGradient(x, y - h, x, y + h);
	g.addColorStop(0, '#fff2a8');
	g.addColorStop(0.5, '#ffcf3a');
	g.addColorStop(1, '#d98a14');
	c.fillStyle = g;
	c.fill();
	c.lineWidth = Math.max(1, S * 0.05);
	c.stroke();
	for (const side of [-1, 1]) {
		c.beginPath();
		c.ellipse(x + side * w * 0.5, y, w * 0.26, h * 0.42, side * 0.18, 0, TAU);
		c.fillStyle = INK;
		c.fill();
	}
	// a gem on the brow and a sweep of shine
	sparkle(c, x, y - h * 0.62, S * 0.05, '#ffffff');
	c.strokeStyle = 'rgba(255,255,255,.75)';
	c.lineWidth = Math.max(1, S * 0.025);
	c.beginPath();
	c.moveTo(x - w * 0.85, y - h * 0.45);
	c.quadraticCurveTo(x - w * 0.6, y - h * 0.95, x - w * 0.25, y - h * 0.8);
	c.stroke();
}

/** M3: half the hero, half a ghost, sewn together down the middle. */
function iconSplit(c: Ctx, x: number, y: number, S: number): void {
	const r = S * 0.25;
	c.save();
	// the hero's half: yellow with the mouth's wedge
	c.beginPath();
	c.moveTo(x, y - r);
	c.arc(x, y, r, -Math.PI / 2, Math.PI / 2, true);
	c.closePath();
	const g = c.createRadialGradient(x - r * 0.4, y - r * 0.4, r * 0.1, x, y, r);
	g.addColorStop(0, '#fff3a0');
	g.addColorStop(0.6, '#ecd53a');
	g.addColorStop(1, '#e6a022');
	c.fillStyle = g;
	c.fill();
	c.beginPath();
	c.moveTo(x - r * 0.05, y + r * 0.05);
	c.lineTo(x - r * 1.05, y - r * 0.25);
	c.lineTo(x - r * 1.05, y + r * 0.35);
	c.closePath();
	c.globalCompositeOperation = 'destination-out';
	c.fill();
	c.globalCompositeOperation = 'source-over';
	// the ghost's half: a pale sheet with a scalloped hem and one eye
	c.beginPath();
	c.moveTo(x, y - r);
	c.arc(x, y - r * 0.15, r * 0.85, -Math.PI / 2, 0);
	c.lineTo(x + r * 0.85, y + r);
	c.quadraticCurveTo(x + r * 0.64, y + r * 0.7, x + r * 0.42, y + r);
	c.quadraticCurveTo(x + r * 0.21, y + r * 0.7, x, y + r);
	c.closePath();
	c.fillStyle = '#f6f2ff';
	c.fill();
	c.restore();
	// the ink: the hero's half, the sheet, the seam
	c.strokeStyle = INK;
	c.lineWidth = Math.max(1, S * 0.05);
	c.beginPath();
	const mouth = Math.atan2(0.3, 1);
	c.arc(x, y, r, -Math.PI / 2, Math.PI - mouth, true);
	c.lineTo(x - r * 0.05, y + r * 0.05);
	c.arc(x, y, r, Math.PI + mouth * 0.9, Math.PI / 2, true);
	c.stroke();
	c.beginPath();
	c.moveTo(x, y - r);
	c.arc(x, y - r * 0.15, r * 0.85, -Math.PI / 2, 0);
	c.lineTo(x + r * 0.85, y + r);
	c.quadraticCurveTo(x + r * 0.64, y + r * 0.7, x + r * 0.42, y + r);
	c.quadraticCurveTo(x + r * 0.21, y + r * 0.7, x, y + r);
	c.stroke();
	c.lineWidth = Math.max(1, S * 0.03);
	c.beginPath();
	for (let i = 0; i <= 6; i++) {
		const yy = y - r + (i * 2 * r) / 6;
		const xx = x + (i % 2 === 0 ? -1 : 1) * r * 0.06;
		if (i === 0) c.moveTo(xx, yy);
		else c.lineTo(xx, yy);
	}
	c.stroke();
	c.beginPath();
	c.ellipse(x + r * 0.42, y - r * 0.25, r * 0.15, r * 0.24, 0, 0, TAU);
	c.fillStyle = INK;
	c.fill();
	c.beginPath();
	c.ellipse(x - r * 0.35, y - r * 0.5, r * 0.1, r * 0.13, 0, 0, TAU);
	c.fill();
}

/** S1: a chunky bolt, white-hot to ice blue, ink outlined. */
function iconBolt(c: Ctx, x: number, y: number, S: number): void {
	const h = S * 0.27;
	const pts: Array<[number, number]> = [
		[0.32, -1],
		[-0.5, 0.12],
		[-0.02, 0.12],
		[-0.3, 1],
		[0.52, -0.16],
		[0.04, -0.16],
		[0.3, -1]
	];
	c.beginPath();
	pts.forEach(([px, py], i) => {
		if (i === 0) c.moveTo(x + px * h, y + py * h);
		else c.lineTo(x + px * h, y + py * h);
	});
	c.closePath();
	const g = c.createLinearGradient(x, y - h, x, y + h);
	g.addColorStop(0, '#ffffff');
	g.addColorStop(0.45, '#c9f1ff');
	g.addColorStop(1, '#5cc6ff');
	c.fillStyle = g;
	c.fill();
	c.strokeStyle = INK;
	c.lineWidth = Math.max(1, S * 0.05);
	c.stroke();
	c.strokeStyle = 'rgba(255,255,255,.9)';
	c.lineWidth = Math.max(1, S * 0.022);
	c.beginPath();
	c.moveTo(x + 0.22 * h, y - 0.8 * h);
	c.lineTo(x - 0.28 * h, y - 0.02 * h);
	c.stroke();
}

/** S2: a plasma ball: dark glass, arcs from the core to the rim, a bright core. */
function iconOrb(c: Ctx, x: number, y: number, S: number, t: number): void {
	const r = S * 0.25;
	const g = c.createRadialGradient(x, y, r * 0.1, x, y, r);
	g.addColorStop(0, '#3b3f9e');
	g.addColorStop(0.7, '#1c1f5a');
	g.addColorStop(1, '#10123a');
	c.beginPath();
	c.arc(x, y, r, 0, TAU);
	c.fillStyle = g;
	c.fill();
	c.save();
	c.clip();
	c.globalCompositeOperation = 'lighter';
	const frame = Math.floor(t * 14);
	for (let i = 0; i < 4; i++) {
		const a = hash(frame, i) * TAU;
		const pts = boltPoints(x, y, x + Math.cos(a) * r, y + Math.sin(a) * r, frame * 7 + i, 3, 0.35);
		strokePath(c, pts, 'rgba(160,140,255,.55)', S * 0.07);
		strokePath(c, pts, 'rgba(235,230,255,.95)', S * 0.022);
	}
	const core = c.createRadialGradient(x, y, 0, x, y, r * 0.45);
	core.addColorStop(0, 'rgba(255,255,255,1)');
	core.addColorStop(0.4, 'rgba(200,190,255,.7)');
	core.addColorStop(1, 'rgba(120,110,255,0)');
	c.fillStyle = core;
	c.fillRect(x - r, y - r, r * 2, r * 2);
	c.restore();
	c.beginPath();
	c.arc(x, y, r, 0, TAU);
	c.strokeStyle = INK;
	c.lineWidth = Math.max(1, S * 0.05);
	c.stroke();
	c.beginPath();
	c.arc(x, y, r * 0.78, Math.PI * 1.1, Math.PI * 1.45);
	c.strokeStyle = 'rgba(255,255,255,.75)';
	c.lineWidth = Math.max(1, S * 0.03);
	c.stroke();
}

/** S3: a four-point spark with two electrons circling it. */
function iconSpark(c: Ctx, x: number, y: number, S: number, t: number): void {
	const r = S * 0.27;
	for (let i = 0; i < 2; i++) {
		const a = t * (3 + i) + i * 2;
		c.save();
		c.translate(x, y);
		c.rotate(i ? 0.7 : -0.7);
		c.strokeStyle = 'rgba(150,220,255,.35)';
		c.lineWidth = Math.max(1, S * 0.02);
		c.beginPath();
		c.ellipse(0, 0, r * 1.1, r * 0.42, 0, 0, TAU);
		c.stroke();
		const ex = Math.cos(a) * r * 1.1;
		const ey = Math.sin(a) * r * 0.42;
		c.beginPath();
		c.arc(ex, ey, S * 0.035, 0, TAU);
		c.fillStyle = '#ffffff';
		c.fill();
		c.restore();
	}
	c.beginPath();
	const k = 0.28;
	c.moveTo(x, y - r);
	c.quadraticCurveTo(x + r * k, y - r * k, x + r, y);
	c.quadraticCurveTo(x + r * k, y + r * k, x, y + r);
	c.quadraticCurveTo(x - r * k, y + r * k, x - r, y);
	c.quadraticCurveTo(x - r * k, y - r * k, x, y - r);
	const g = c.createRadialGradient(x, y, 0, x, y, r);
	g.addColorStop(0, '#ffffff');
	g.addColorStop(0.35, '#d8f5ff');
	g.addColorStop(1, '#46b8ff');
	c.fillStyle = g;
	c.fill();
	c.strokeStyle = INK;
	c.lineWidth = Math.max(1, S * 0.045);
	c.stroke();
}

/** Short jagged arcs that run round a ring. */
function crackleRing(c: Ctx, x: number, y: number, r: number, S: number, t: number, n: number): void {
	const frame = Math.floor(t * 12);
	c.save();
	c.globalCompositeOperation = 'lighter';
	for (let i = 0; i < n; i++) {
		const a0 = hash(frame, i) * TAU;
		const a1 = a0 + 0.5 + hash(frame, i + 9) * 0.5;
		const pts = boltPoints(
			x + Math.cos(a0) * r,
			y + Math.sin(a0) * r,
			x + Math.cos(a1) * r,
			y + Math.sin(a1) * r,
			frame * 11 + i,
			3,
			0.4
		);
		strokePath(c, pts, 'rgba(120,200,255,.5)', S * 0.06);
		strokePath(c, pts, 'rgba(240,250,255,.95)', S * 0.018);
	}
	c.restore();
}

// ── lightning geometry ─────────────────────────────────────────────────────────

/** A jagged line from (x0, y0) to (x1, y1) by midpoint displacement, `depth` levels deep. */
export function boltPoints(
	x0: number,
	y0: number,
	x1: number,
	y1: number,
	seed: number,
	depth = 5,
	rough = 0.22
): Array<[number, number]> {
	let pts: Array<[number, number]> = [
		[x0, y0],
		[x1, y1]
	];
	let amp = Math.hypot(x1 - x0, y1 - y0) * rough;
	for (let d = 0; d < depth; d++) {
		const next: Array<[number, number]> = [pts[0]!];
		for (let i = 0; i < pts.length - 1; i++) {
			const [ax, ay] = pts[i]!;
			const [bx, by] = pts[i + 1]!;
			const len = Math.hypot(bx - ax, by - ay) || 1;
			const off = (hash(seed, d * 97 + i) - 0.5) * 2 * amp;
			next.push([(ax + bx) / 2 + (-(by - ay) / len) * off, (ay + by) / 2 + ((bx - ax) / len) * off]);
			next.push([bx, by]);
		}
		pts = next;
		amp *= 0.55;
	}
	return pts;
}

function strokePath(c: Ctx, pts: Array<[number, number]>, color: string, width: number): void {
	c.beginPath();
	pts.forEach(([px, py], i) => (i === 0 ? c.moveTo(px, py) : c.lineTo(px, py)));
	c.strokeStyle = color;
	c.lineWidth = Math.max(0.6, width);
	c.stroke();
}

// ── the hero's ghost form (the mask) ──────────────────────────────────────────

export type MaskLook = 'a' | 'b' | 'c';

export const MASK_NAMES: Record<MaskLook, string> = {
	a: 'A · свой цвет',
	b: 'B · прозрачный, кайма',
	c: 'C · свой цвет + ореол'
};

/** The heroes' own colours: his gold, her magenta (deeper than Pinky's pink), pale and glow. */
const OWN: Record<'pac' | 'ms', { body: Palette; pale: Palette; glow: string }> = {
	pac: { body: { b: '#ffd84a', s: '#e8a020' }, pale: { b: '#fff4c8', s: '#ead48e' }, glow: '255,206,64' },
	ms: { body: { b: '#e95aa8', s: '#ae266e' }, pale: { b: '#ffe4f2', s: '#efb0d2' }, glow: '255,110,190' }
};

export interface GhostForm {
	readonly look: MaskLook;
	readonly ms: boolean;
	readonly shape: CuteShape;
	readonly season: HeroSeason;
	readonly lookX: number;
	readonly lookY: number;
	readonly time: number;
	readonly step: number;
	readonly dpr: number;
}

/** The ghost form's sprite (body, Ms. Pac-Man's bow), unlit, for a tile of `S` px. */
function formSprite(f: GhostForm, S: number, key: number): HTMLCanvasElement {
	return sprite(
		S * 2 * f.dpr,
		(c) => {
			c.scale(f.dpr, f.dpr);
			drawCuteGhost(c, 0, 0, (S / 25) * 0.78, {
				shape: f.shape,
				kind: 'BLINKY',
				state: 'normal',
				lookX: f.lookX,
				lookY: f.lookY,
				time: f.time,
				step: f.step,
				palette: f.look === 'b' ? OWN[f.ms ? 'ms' : 'pac'].pale : OWN[f.ms ? 'ms' : 'pac'].body
			});
			if (f.ms) {
				// her bow on the ghost's head, tipped the way she wears it
				const R = S * 0.39;
				const half = R * BOW_SPAN * 0.85;
				c.save();
				c.translate(-S * 0.2, -S * 0.36);
				c.rotate(-0.45);
				c.drawImage(paintedBow(R * f.dpr, f.season, PINK_TINT), -half, -half, half * 2, half * 2);
				c.restore();
			}
		},
		key
	);
}

/**
 * The hero as a ghost at (x, y); `whiten` 0..1 (a flash), `alpha` for the blink. The look:
 * A his own gold, B a pale see-through body in a gold glow, C his gold in a gold halo.
 */
export function drawGhostForm(
	c: Ctx,
	f: GhostForm,
	x: number,
	y: number,
	S: number,
	whiten = 0,
	alpha = 1
): void {
	const sp = tint(formSprite(f, S, 1), '#ffffff', whiten);
	const w = sp.width / f.dpr;
	c.save();
	c.globalAlpha *= alpha;
	const glow = OWN[f.ms ? 'ms' : 'pac'].glow;
	if (f.look === 'c') {
		ringOfGold(c, x, y + S * 0.05, S, f.time, glow);
	}
	if (f.look === 'b') {
		c.save();
		c.shadowColor = `rgba(${glow},.95)`;
		c.shadowBlur = S * 0.35 * f.dpr;
		c.globalAlpha *= 0.62;
		c.drawImage(sp, x - w / 2, y - w / 2, w, w);
		c.restore();
		// the rim: a thin gold outline traced by the glow alone
		c.save();
		c.globalCompositeOperation = 'lighter';
		c.globalAlpha *= 0.35;
		c.drawImage(sp, x - w / 2, y - w / 2, w, w);
		c.restore();
	} else {
		c.drawImage(sp, x - w / 2, y - w / 2, w, w);
	}
	c.restore();
}

/** C's halo: a slow dashed ring in the hero's colour and three motes circling it. */
function ringOfGold(c: Ctx, x: number, y: number, S: number, t: number, rgb: string): void {
	c.save();
	c.globalCompositeOperation = 'lighter';
	const g = c.createRadialGradient(x, y, S * 0.2, x, y, S * 0.7);
	g.addColorStop(0, `rgba(${rgb},0)`);
	g.addColorStop(0.7, `rgba(${rgb},.18)`);
	g.addColorStop(1, `rgba(${rgb},0)`);
	c.fillStyle = g;
	c.beginPath();
	c.arc(x, y, S * 0.7, 0, TAU);
	c.fill();
	c.restore();
	c.save();
	c.strokeStyle = `rgba(${rgb},.85)`;
	c.lineWidth = Math.max(1, S * 0.04);
	c.setLineDash([S * 0.16, S * 0.1]);
	c.lineDashOffset = -t * S * 0.6;
	c.beginPath();
	c.arc(x, y, S * 0.6, 0, TAU);
	c.stroke();
	c.setLineDash([]);
	for (let i = 0; i < 3; i++) {
		const a = t * 2.2 + (i * TAU) / 3;
		sparkle(c, x + Math.cos(a) * S * 0.6, y + Math.sin(a) * S * 0.6, S * 0.07, '#fff6e6');
	}
	c.restore();
}

/**
 * The turn into the ghost form (`k` 0..1 over about 0.45 s), or back out of it (`out`). The
 * old body squashes, spins and goes white; a puff of smoke and gold sparkles bursts; the new
 * body pops out of the puff white and settles into its colours with a little overshoot.
 */
export function drawMorph(
	c: Ctx,
	k: number,
	out: boolean,
	x: number,
	y: number,
	S: number,
	hero: (c: Ctx, x: number, y: number) => void,
	f: GhostForm
): void {
	const from = out ? 'ghost' : 'hero';
	// the old body
	const a = clamp01(k / 0.5);
	if (a < 1) {
		const s = 1 - easeIn(a) * 0.9;
		const sp = sprite(
			S * 2 * f.dpr,
			(cc) => {
				cc.scale(f.dpr, f.dpr);
				if (from === 'hero') hero(cc, 0, 0);
				else drawGhostForm(cc, { ...f, dpr: 1 }, 0, 0, S);
			},
			2
		);
		tint(sp, '#ffffff', clamp01(a / 0.6));
		const w = sp.width / f.dpr;
		c.save();
		c.translate(x, y);
		c.rotate(a * 1.4);
		c.scale(s * (1 + 0.3 * Math.sin(Math.PI * a)), s * (1 - 0.15 * Math.sin(Math.PI * a)));
		c.drawImage(sp, -w / 2, -w / 2, w, w);
		c.restore();
	}
	// the flash
	const fl = clamp01((k - 0.2) / 0.4);
	if (fl > 0 && fl < 1) {
		const r = S * (0.3 + fl * 0.75);
		const g = c.createRadialGradient(x, y, 0, x, y, r);
		const al = Math.sin(Math.PI * fl);
		g.addColorStop(0, `rgba(255,255,240,${0.9 * al})`);
		g.addColorStop(0.5, `rgba(255,220,120,${0.35 * al})`);
		g.addColorStop(1, 'rgba(255,220,120,0)');
		c.save();
		c.globalCompositeOperation = 'lighter';
		c.fillStyle = g;
		c.beginPath();
		c.arc(x, y, r, 0, TAU);
		c.fill();
		c.restore();
	}
	// the puff: cartoon smoke balls with an ink rim, and sparkles
	const e = clamp01((k - 0.15) / 0.75);
	if (e > 0 && e < 1) {
		const d = easeOut(e);
		c.save();
		for (let i = 0; i < 9; i++) {
			const ang = (i / 9) * TAU + 0.35;
			const dist = S * (0.18 + 0.5 * d) * (0.85 + 0.3 * hash(i, 3));
			const rr = S * (0.13 + 0.07 * hash(i, 5)) * (1 - 0.55 * d);
			const px = x + Math.cos(ang) * dist;
			const py = y + Math.sin(ang) * dist * 0.85 - d * S * 0.08;
			c.globalAlpha = (1 - easeIn(e)) * 0.95;
			c.beginPath();
			c.arc(px, py, rr, 0, TAU);
			c.fillStyle = '#fff8ea';
			c.fill();
			c.strokeStyle = 'rgba(36,20,24,.55)';
			c.lineWidth = Math.max(1, S * 0.03);
			c.stroke();
		}
		c.globalAlpha = 1 - e;
		for (let i = 0; i < 6; i++) {
			const ang = (i / 6) * TAU + 1;
			const dist = S * (0.3 + 0.55 * d);
			sparkle(c, x + Math.cos(ang) * dist, y + Math.sin(ang) * dist, S * 0.08 * (1 - 0.5 * e), '#ffe27a');
		}
		c.restore();
	}
	// the new body
	const u = clamp01((k - 0.38) / 0.62);
	if (u > 0) {
		const s = Math.max(0.05, backOut(u));
		c.save();
		c.translate(x, y);
		c.scale(s * (1 + 0.08 * Math.sin(u * 9) * (1 - u)), s * (1 - 0.08 * Math.sin(u * 9) * (1 - u)));
		if (out) {
			const sp = sprite(S * 2 * f.dpr, (cc) => {
				cc.scale(f.dpr, f.dpr);
				hero(cc, 0, 0);
			}, 3);
			tint(sp, '#ffffff', 1 - clamp01(u / 0.5));
			const w = sp.width / f.dpr;
			c.drawImage(sp, -w / 2, -w / 2, w, w);
		} else {
			drawGhostForm(c, f, 0, 0, S, 1 - clamp01(u / 0.5));
		}
		c.restore();
	}
}

// ── the shock ──────────────────────────────────────────────────────────────────

export type ShockLook = 'bolt' | 'plasma';

export const SHOCK_NAMES: Record<ShockLook, string> = {
	bolt: 'V1 · ветвистая молния',
	plasma: 'V2 · плазменные нити и клетка'
};

/** One ghost on the chain: where it is and where its discharge came from. */
export interface ShockTarget {
	readonly kind: GhostKind;
	readonly x: number;
	readonly y: number;
	readonly fromX: number;
	readonly fromY: number;
	/** Seconds after the press the discharge reaches it (the chain's hop). */
	readonly delay: number;
}

/** The held time and its shaking tail (as `config/abilityConfig`). */
export const SHOCK_SECONDS = 3;
const SHAKE = 0.5;

/** The discharge's arcs and impacts, over the ghosts; `t` seconds since the press. */
export function drawShockArcs(
	c: Ctx,
	look: ShockLook,
	targets: readonly ShockTarget[],
	hx: number,
	hy: number,
	S: number,
	t: number
): void {
	c.save();
	c.lineCap = 'round';
	c.lineJoin = 'round';
	// the hero lets go: a ring and a few sparks
	if (t < 0.3) {
		const k = t / 0.3;
		c.save();
		c.globalCompositeOperation = 'lighter';
		c.strokeStyle = look === 'bolt' ? `rgba(150,220,255,${1 - k})` : `rgba(190,150,255,${1 - k})`;
		c.lineWidth = Math.max(1, S * 0.08 * (1 - k));
		c.beginPath();
		c.arc(hx, hy, S * (0.4 + 0.9 * easeOut(k)), 0, TAU);
		c.stroke();
		c.restore();
	}
	for (let i = 0; i < targets.length; i++) {
		const tg = targets[i]!;
		const local = t - tg.delay;
		if (local < 0) continue;
		if (look === 'bolt') boltLink(c, tg, S, local, i);
		else plasmaLink(c, tg, S, local, i);
	}
	c.restore();
}

function boltLink(c: Ctx, tg: ShockTarget, S: number, t: number, i: number): void {
	const life = 0.24;
	if (t < life) {
		const frame = Math.floor(t * 30);
		// it flickers: a frame or two dark
		const on = hash(frame, i + 40) > 0.18 || t < 0.04;
		if (on) {
			const fade = 1 - t / life;
			const seed = frame * 31 + i * 7;
			const pts = boltPoints(tg.fromX, tg.fromY, tg.x, tg.y, seed, 5, 0.2);
			c.save();
			c.globalCompositeOperation = 'lighter';
			strokePath(c, pts, `rgba(70,150,255,${0.22 * fade})`, S * 0.36);
			strokePath(c, pts, `rgba(130,210,255,${0.6 * fade})`, S * 0.13);
			strokePath(c, pts, `rgba(255,255,255,${0.95 * fade})`, S * 0.045);
			// two forks off the main line
			for (let b = 0; b < 2; b++) {
				const at = pts[Math.floor(pts.length * (0.3 + 0.35 * b))]!;
				const ang =
					Math.atan2(tg.y - tg.fromY, tg.x - tg.fromX) + (hash(seed, b) > 0.5 ? 0.7 : -0.7);
				const len = Math.hypot(tg.x - tg.fromX, tg.y - tg.fromY) * (0.18 + 0.15 * hash(seed, b + 3));
				const fork = boltPoints(at[0], at[1], at[0] + Math.cos(ang) * len, at[1] + Math.sin(ang) * len, seed + b * 13, 3, 0.3);
				strokePath(c, fork, `rgba(130,210,255,${0.45 * fade})`, S * 0.07);
				strokePath(c, fork, `rgba(255,255,255,${0.8 * fade})`, S * 0.025);
			}
			c.restore();
		}
	}
	// the impact: a white flash and sparks flying off
	if (t < 0.22) {
		const k = t / 0.22;
		c.save();
		c.globalCompositeOperation = 'lighter';
		const r = S * (0.4 + 0.75 * easeOut(k));
		const g = c.createRadialGradient(tg.x, tg.y, 0, tg.x, tg.y, r);
		g.addColorStop(0, `rgba(255,255,255,${0.6 * (1 - k)})`);
		g.addColorStop(0.4, `rgba(140,215,255,${0.4 * (1 - k)})`);
		g.addColorStop(1, 'rgba(140,215,255,0)');
		c.fillStyle = g;
		c.beginPath();
		c.arc(tg.x, tg.y, r, 0, TAU);
		c.fill();
		c.strokeStyle = `rgba(220,245,255,${1 - k})`;
		c.lineWidth = Math.max(1, S * 0.035);
		for (let s = 0; s < 9; s++) {
			const ang = hash(i, s) * TAU;
			const d0 = S * (0.3 + 0.9 * easeOut(k));
			const d1 = d0 + S * 0.18 * (1 - k);
			c.beginPath();
			c.moveTo(tg.x + Math.cos(ang) * d0, tg.y + Math.sin(ang) * d0);
			c.lineTo(tg.x + Math.cos(ang) * d1, tg.y + Math.sin(ang) * d1);
			c.stroke();
		}
		c.restore();
	}
}

function plasmaLink(c: Ctx, tg: ShockTarget, S: number, t: number, i: number): void {
	const life = 0.38;
	const dx = tg.x - tg.fromX;
	const dy = tg.y - tg.fromY;
	const len = Math.hypot(dx, dy) || 1;
	const nx = -dy / len;
	const ny = dx / len;
	if (t < life) {
		const grow = clamp01(t / 0.08);
		const fade = t < 0.08 ? 1 : 1 - (t - 0.08) / (life - 0.08);
		c.save();
		c.globalCompositeOperation = 'lighter';
		const strands: Array<[string, number, number, number]> = [
			['rgba(170,120,255,', 0.2, 0.22, 1.7],
			['rgba(120,210,255,', 0.13, 0.16, 2.6],
			['rgba(255,240,255,', 0.04, 0.1, 3.4]
		];
		for (const [col, w, amp, freq] of strands) {
			for (const pass of [0, 1]) {
				c.beginPath();
				const n = 28;
				for (let s = 0; s <= n; s++) {
					const u = (s / n) * grow;
					const wave =
						Math.sin(Math.PI * u) *
						Math.sin(u * freq * TAU - t * 38 + i + pass * 2.1) *
						S *
						amp *
						(pass ? 0.7 : 1);
					const px = tg.fromX + dx * u + nx * wave;
					const py = tg.fromY + dy * u + ny * wave;
					if (s === 0) c.moveTo(px, py);
					else c.lineTo(px, py);
				}
				c.strokeStyle = `${col}${(pass ? 0.5 : 0.85) * fade})`;
				c.lineWidth = Math.max(0.8, S * w * (pass ? 0.6 : 1));
				c.stroke();
			}
		}
		// beads of light running down the strands
		for (let b = 0; b < 4; b++) {
			const u = ((t * 3.2 + b / 4) % 1) * grow;
			const px = tg.fromX + dx * u;
			const py = tg.fromY + dy * u;
			const g = c.createRadialGradient(px, py, 0, px, py, S * 0.16);
			g.addColorStop(0, `rgba(255,255,255,${0.95 * fade})`);
			g.addColorStop(1, 'rgba(180,140,255,0)');
			c.fillStyle = g;
			c.beginPath();
			c.arc(px, py, S * 0.16, 0, TAU);
			c.fill();
		}
		c.restore();
	}
	// the impact: two rings going out and a ring of crackle
	if (t < 0.32) {
		const k = t / 0.32;
		c.save();
		c.globalCompositeOperation = 'lighter';
		for (const [d, col] of [
			[0, '200,160,255'],
			[0.08, '130,215,255']
		] as const) {
			const kk = clamp01((t - d) / 0.24);
			if (kk <= 0 || kk >= 1) continue;
			c.strokeStyle = `rgba(${col},${1 - kk})`;
			c.lineWidth = Math.max(1, S * 0.07 * (1 - kk));
			c.beginPath();
			c.arc(tg.x, tg.y, S * (0.35 + 0.9 * easeOut(kk)), 0, TAU);
			c.stroke();
		}
		crackleRing(c, tg.x, tg.y, S * (0.5 + 0.3 * k), S, t + i, 4);
		c.restore();
	}
}

/**
 * How a struck ghost looks `t` seconds after its strike (null when the shock no longer shows
 * on it): a cold tint, a shake in its last half second, and what to draw round it.
 */
export function heldGhost(
	look: ShockLook,
	t: number
): { tint: string; tintK: number; shake: number; xray: boolean } | null {
	if (t < 0 || t > SHOCK_SECONDS + 0.35) return null;
	const xray = t < 0.26 && Math.floor(t * 24) % 2 === 0;
	const release = t > SHOCK_SECONDS ? 1 - (t - SHOCK_SECONDS) / 0.35 : 1;
	const shaking = t > SHOCK_SECONDS - SHAKE && t < SHOCK_SECONDS;
	return {
		tint: look === 'bolt' ? '#8fd4ff' : '#b79bff',
		tintK: (look === 'bolt' ? 0.38 : 0.34) * release,
		shake: shaking ? 1 : 0,
		xray
	};
}

/** What surrounds a held ghost: crawling arcs (V1) or an electric cage (V2), and the release. */
export function drawHeldAura(
	c: Ctx,
	look: ShockLook,
	x: number,
	y: number,
	S: number,
	t: number,
	i: number
): void {
	if (t < 0.1 || t > SHOCK_SECONDS + 0.45) return;
	c.save();
	c.lineCap = 'round';
	c.lineJoin = 'round';
	const shaking = t > SHOCK_SECONDS - SHAKE;
	if (t > SHOCK_SECONDS) {
		// the release: smoke puffs (V1) or the cage's nodes flying off (V2)
		const k = clamp01((t - SHOCK_SECONDS) / 0.45);
		if (look === 'bolt') {
			for (let p = 0; p < 4; p++) {
				const px = x + (hash(i, p) - 0.5) * S * 0.6;
				const py = y - S * 0.2 - k * S * 0.5 - p * S * 0.08;
				c.globalAlpha = (1 - k) * 0.6;
				c.beginPath();
				c.arc(px, py, S * (0.1 + 0.12 * k), 0, TAU);
				c.fillStyle = '#c9cfd8';
				c.fill();
			}
		} else {
			c.globalCompositeOperation = 'lighter';
			for (let n = 0; n < 8; n++) {
				const a = (n / 8) * TAU + SHOCK_SECONDS * 1.4;
				const d = S * (0.55 + 0.7 * easeOut(k));
				sparkle(c, x + Math.cos(a) * d, y + Math.sin(a) * d, S * 0.07 * (1 - k), `rgba(220,200,255,${1 - k})`);
			}
		}
		c.restore();
		return;
	}
	c.globalCompositeOperation = 'lighter';
	if (look === 'bolt') {
		const rate = shaking ? 24 : 12;
		const frame = Math.floor(t * rate);
		const n = shaking ? 4 : 2;
		for (let a = 0; a < n; a++) {
			const a0 = hash(frame, a + i * 5) * TAU;
			const a1 = a0 + 0.9 + hash(frame, a + 20) * 0.9;
			const r0 = S * (0.38 + 0.08 * hash(frame, a + 30));
			const pts = boltPoints(
				x + Math.cos(a0) * r0,
				y + Math.sin(a0) * r0,
				x + Math.cos(a1) * r0,
				y + Math.sin(a1) * r0,
				frame * 17 + a + i * 3,
				3,
				0.45
			);
			strokePath(c, pts, 'rgba(110,190,255,.45)', S * 0.08);
			strokePath(c, pts, 'rgba(245,252,255,.95)', S * 0.025);
		}
		// a spark now and then
		if (hash(frame, i + 70) > 0.6) {
			const a = hash(frame, i + 80) * TAU;
			sparkle(c, x + Math.cos(a) * S * 0.48, y + Math.sin(a) * S * 0.48, S * 0.07, '#e6f7ff');
		}
	} else {
		const spin = t * 1.4;
		const r = S * (0.58 + (shaking ? 0.04 * Math.sin(t * 50) : 0));
		const nodes: Array<[number, number]> = [];
		for (let n = 0; n < 8; n++) {
			const a = (n / 8) * TAU + spin;
			nodes.push([x + Math.cos(a) * r, y + Math.sin(a) * r * 0.9]);
		}
		c.strokeStyle = 'rgba(170,130,255,.28)';
		c.lineWidth = Math.max(1, S * 0.05);
		c.beginPath();
		c.ellipse(x, y, r, r * 0.9, 0, 0, TAU);
		c.stroke();
		const frame = Math.floor(t * (shaking ? 26 : 14));
		for (let n = 0; n < 8; n++) {
			if (hash(frame, n + i * 9) < (shaking ? 0.3 : 0.5)) continue;
			const [ax, ay] = nodes[n]!;
			const [bx, by] = nodes[(n + 1) % 8]!;
			const pts = boltPoints(ax, ay, bx, by, frame * 13 + n, 2, 0.35);
			strokePath(c, pts, 'rgba(180,140,255,.5)', S * 0.06);
			strokePath(c, pts, 'rgba(250,245,255,.95)', S * 0.02);
		}
		for (const [nx, ny] of nodes) {
			const g = c.createRadialGradient(nx, ny, 0, nx, ny, S * 0.09);
			g.addColorStop(0, 'rgba(255,255,255,.95)');
			g.addColorStop(1, 'rgba(170,130,255,0)');
			c.fillStyle = g;
			c.beginPath();
			c.arc(nx, ny, S * 0.09, 0, TAU);
			c.fill();
		}
	}
	c.restore();
}

/** Draws a ghost sprite with the shock's tint and its x-ray flash. */
export function drawHeldGhost(
	c: Ctx,
	paint: (cc: Ctx) => void,
	x: number,
	y: number,
	S: number,
	dpr: number,
	held: { tint: string; tintK: number; shake: number; xray: boolean },
	t: number,
	key: number
): void {
	const sp = sprite(
		S * 2 * dpr,
		(cc) => {
			cc.scale(dpr, dpr);
			paint(cc);
		},
		10 + key
	);
	if (held.xray) tint(sp, '#eaf8ff', 0.85);
	else tint(sp, held.tint, held.tintK);
	const w = sp.width / dpr;
	const jx = held.shake ? Math.sin(t * 70 + key) * S * 0.05 : 0;
	c.drawImage(sp, x - w / 2 + jx, y - w / 2, w, w);
}

export { blit };
