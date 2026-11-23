// The abilities' art, picked by the owner in the `powers` prototype, all in code in the heroes'
// ink-outlined cel style:
// - the tokens (the board and the HUD slot): the mask a little gold ghost sheet (M1), the shock an
//   electric ball with a bold bolt and three contacts; the echo keeps its wisp (`EchoCloneView`);
// - the mask: the hero as the season's ghost in his own colour (his gold, her magenta, her bow),
//   in a halo of his colour that stays inside the tile (C); the turn into it and back (a
//   squash, a white flash, a puff of smoke and sparkles, a pop with an overshoot);
// - the shock (V1): branching lightning hop by hop, a white impact with sparks, the held ghost
//   cold blue with arcs crawling round it, a shake at the end and a puff of smoke on release.
import type { AbilityKind } from '../../config/abilityConfig';
import { medallion } from './abilityIcons';
import { drawCuteGhost } from './cuteGhost';
import type { CuteShape, Palette } from './cuteGhost';
import { drawIceBow } from './hero/MsPacmanHero';
import type { HeroSeason } from './hero/heroSeasons';

type Ctx = CanvasRenderingContext2D;
const TAU = Math.PI * 2;

/** Seconds the turn into the ghost form (and back out of it) takes. */
export const MORPH_SECONDS = 0.45;

/** A repeatable random number in 0..1 for (a, b): the lightning's shapes per frame. */
function hash(a: number, b = 0): number {
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

// ── scratch sprites (whitening, tinting) ──────────────────────────────────────

const sprites = new Map<number, HTMLCanvasElement>();

/** Paints into a reused scratch canvas `size` px square, (0, 0) at its centre. */
function sprite(size: number, paint: (c: Ctx) => void, key: number): HTMLCanvasElement {
	const side = Math.max(8, Math.ceil(size));
	const id = side * 16 + key;
	let canvas = sprites.get(id);
	if (!canvas) {
		if (sprites.size > 48) sprites.clear();
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

/** Tints what the sprite holds toward `color` by `k`, keeping its shape. */
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

/** The device pixels per css pixel of the context's current transform. */
function scaleOf(c: Ctx): number {
	const m = c.getTransform();
	return Math.max(1, Math.hypot(m.a, m.b));
}

/** Draws a scratch sprite (made at `dpr`) centred at (x, y). */
function blit(c: Ctx, canvas: HTMLCanvasElement, x: number, y: number, dpr: number): void {
	const w = canvas.width / dpr;
	c.drawImage(canvas, x - w / 2, y - w / 2, w, w);
}

// ── small pieces ─────────────────────────────────────────────────────────────────

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

/** A jagged line from (x0, y0) to (x1, y1) by midpoint displacement. */
function boltPoints(
	x0: number,
	y0: number,
	x1: number,
	y1: number,
	seed: number,
	depth: number,
	rough: number
): Array<[number, number]> {
	let pts: Array<[number, number]> = [
		[x0, y0],
		[x1, y1]
	];
	let amp = Math.hypot(x1 - x0, y1 - y0) * rough;
	for (let d = 0; d < depth; d++) {
		const next: Array<[number, number]> = [pts[0] as [number, number]];
		for (let i = 0; i < pts.length - 1; i++) {
			const [ax, ay] = pts[i] as [number, number];
			const [bx, by] = pts[i + 1] as [number, number];
			const len = Math.hypot(bx - ax, by - ay) || 1;
			const off = (hash(seed, d * 97 + i) - 0.5) * 2 * amp;
			next.push([(ax + bx) / 2 - ((by - ay) / len) * off, (ay + by) / 2 + ((bx - ax) / len) * off]);
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

/** The token's breathing halo and ring (the echo token's language). */
function tokenHalo(c: Ctx, x: number, y: number, S: number, rgb: string, t: number): void {
	const pulse = 0.5 + 0.5 * Math.sin(t * 4);
	const r = S * (0.62 + 0.06 * pulse);
	const g = c.createRadialGradient(x, y, 0, x, y, r);
	g.addColorStop(0, `rgba(${rgb},0.38)`);
	g.addColorStop(0.55, `rgba(${rgb},0.14)`);
	g.addColorStop(1, `rgba(${rgb},0)`);
	c.save();
	c.globalCompositeOperation = 'lighter';
	c.fillStyle = g;
	c.beginPath();
	c.arc(x, y, r, 0, TAU);
	c.fill();
	c.restore();
	c.strokeStyle = `rgba(${rgb},${0.55 + 0.35 * pulse})`;
	c.lineWidth = Math.max(1, S * 0.045);
	c.beginPath();
	c.arc(x, y, S * (0.41 + 0.04 * pulse), 0, TAU);
	c.stroke();
}

// ── the tokens ─────────────────────────────────────────────────────────────────

/** Each ability's halo colour, from its medallion's enamel. */
const HALO: Record<AbilityKind, string> = {
	echo: '56,214,184',
	mask: '255,206,84',
	shock: '80,150,255'
};

/**
 * An ability's token centred at (x, y) on a tile of `S` px (also the HUD slot's icon): its
 * medallion (`abilityIcons`, one family for all three) in its breathing halo. It bobs with `t`.
 */
export function drawAbilityIcon(
	c: Ctx,
	kind: AbilityKind,
	x: number,
	y: number,
	S: number,
	t: number
): void {
	c.save();
	c.lineJoin = 'round';
	c.lineCap = 'round';
	const bob = Math.sin(t * 3) * S * 0.025;
	tokenHalo(c, x, y, S, HALO[kind], t);
	medallion(c, kind, x, y + bob, S);
	c.restore();
}

// ── the mask: the hero's ghost form ─────────────────────────────────────────────

/** The heroes' own colours: his gold, her magenta (deeper than Pinky's pink), and the halo's. */
const OWN: Record<'pac' | 'ms', { body: Palette; halo: string }> = {
	pac: { body: { b: '#ffc23a', s: '#e8781e' }, halo: '255,190,64' },
	ms: { body: { b: '#7a4ad8', s: '#3c1e8a' }, halo: '200,120,255' }
};

export interface GhostForm {
	readonly ms: boolean;
	readonly shape: CuteShape;
	readonly season: HeroSeason;
	/** The heading as a unit vector. */
	readonly lookX: number;
	readonly lookY: number;
	readonly time: number;
	/** The stride phase (radians): the feet step with it. */
	readonly step: number;
}

function paintForm(c: Ctx, f: GhostForm, S: number): void {
	drawCuteGhost(c, 0, 0, (S / 25) * 0.78, {
		shape: f.shape,
		kind: 'BLINKY',
		state: 'normal',
		lookX: f.lookX,
		lookY: f.lookY,
		time: f.time,
		step: f.step,
		palette: OWN[f.ms ? 'ms' : 'pac'].body
	});
	if (f.ms) {
		// her ice bow on the ghost's head, tipped the way she wears it
		c.save();
		c.translate(-S * 0.2, -S * 0.36);
		c.rotate(-0.45);
		drawIceBow(c, S * 0.39, 0);
		c.restore();
	}
}

/**
 * The hero as the season's ghost at (x, y) on a tile of `S` px, in a halo of his colour: a soft
 * glow, a slow dashed ring and three motes, all within the tile. `whiten` 0..1 is the turn's
 * flash, `alpha` the end's blink.
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
	const dpr = scaleOf(c);
	c.save();
	c.globalAlpha *= alpha;
	halo(c, x, y + S * 0.03, S, f.time, OWN[f.ms ? 'ms' : 'pac'].halo);
	if (whiten > 0) {
		const sp = sprite(
			S * 1.6 * dpr,
			(cc) => {
				cc.scale(dpr, dpr);
				paintForm(cc, f, S);
			},
			1
		);
		blit(c, tint(sp, '#ffffff', whiten), x, y, dpr);
	} else {
		c.translate(x, y);
		paintForm(c, f, S);
	}
	c.restore();
}

/** The mask's halo: kept inside the tile (the owner: the first one spilled over it). */
function halo(c: Ctx, x: number, y: number, S: number, t: number, rgb: string): void {
	const R = S * 0.46;
	c.save();
	c.globalCompositeOperation = 'lighter';
	const g = c.createRadialGradient(x, y, S * 0.18, x, y, S * 0.5);
	g.addColorStop(0, `rgba(${rgb},0)`);
	g.addColorStop(0.75, `rgba(${rgb},.2)`);
	g.addColorStop(1, `rgba(${rgb},0)`);
	c.fillStyle = g;
	c.beginPath();
	c.arc(x, y, S * 0.5, 0, TAU);
	c.fill();
	c.restore();
	c.save();
	c.strokeStyle = `rgba(${rgb},.85)`;
	c.lineWidth = Math.max(1, S * 0.035);
	c.setLineDash([S * 0.12, S * 0.08]);
	c.lineDashOffset = -t * S * 0.5;
	c.beginPath();
	c.arc(x, y, R, 0, TAU);
	c.stroke();
	c.setLineDash([]);
	for (let i = 0; i < 3; i++) {
		const a = t * 2.2 + (i * TAU) / 3;
		sparkle(c, x + Math.cos(a) * R, y + Math.sin(a) * R, S * 0.055, '#fff6e6');
	}
	c.restore();
}

/**
 * The turn into the ghost form (`k` 0..1 over `MORPH_SECONDS`), or back out of it (`out`).
 * `hero(c)` paints the hero centred at (0, 0) of `c`.
 */
export function drawMorph(
	c: Ctx,
	k: number,
	out: boolean,
	x: number,
	y: number,
	S: number,
	hero: (c: Ctx) => void,
	f: GhostForm
): void {
	const dpr = scaleOf(c);
	const size = S * 2 * dpr;
	// the old body: squashes, spins and goes white
	const a = clamp01(k / 0.5);
	if (a < 1) {
		const sp = sprite(
			size,
			(cc) => {
				cc.scale(dpr, dpr);
				if (out) {
					halo(cc, 0, S * 0.03, S, f.time, OWN[f.ms ? 'ms' : 'pac'].halo);
					paintForm(cc, f, S);
				} else {
					hero(cc);
				}
			},
			2
		);
		tint(sp, '#ffffff', clamp01(a / 0.6));
		const s = 1 - easeIn(a) * 0.9;
		const w = sp.width / dpr;
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
		const r = S * (0.3 + fl * 0.6);
		const al = Math.sin(Math.PI * fl);
		const g = c.createRadialGradient(x, y, 0, x, y, r);
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
		c.lineWidth = Math.max(1, S * 0.03);
		c.strokeStyle = 'rgba(36,20,24,.55)';
		c.fillStyle = '#fff8ea';
		c.globalAlpha *= (1 - easeIn(e)) * 0.95;
		for (let i = 0; i < 9; i++) {
			const ang = (i / 9) * TAU + 0.35;
			const dist = S * (0.18 + 0.5 * d) * (0.85 + 0.3 * hash(i, 3));
			const rr = S * (0.13 + 0.07 * hash(i, 5)) * (1 - 0.55 * d);
			c.beginPath();
			c.arc(x + Math.cos(ang) * dist, y + Math.sin(ang) * dist * 0.85 - d * S * 0.08, rr, 0, TAU);
			c.fill();
			c.stroke();
		}
		c.restore();
		c.save();
		c.globalAlpha *= 1 - e;
		for (let i = 0; i < 6; i++) {
			const ang = (i / 6) * TAU + 1;
			const dist = S * (0.3 + 0.55 * d);
			sparkle(
				c,
				x + Math.cos(ang) * dist,
				y + Math.sin(ang) * dist,
				S * 0.08 * (1 - 0.5 * e),
				'#ffe27a'
			);
		}
		c.restore();
	}
	// the new body: pops out of the puff white and settles into its colours
	const u = clamp01((k - 0.38) / 0.62);
	if (u > 0) {
		const s = Math.max(0.05, backOut(u));
		const wob = 0.08 * Math.sin(u * 9) * (1 - u);
		c.save();
		c.translate(x, y);
		c.scale(s * (1 + wob), s * (1 - wob));
		if (out) {
			const sp = sprite(
				size,
				(cc) => {
					cc.scale(dpr, dpr);
					hero(cc);
				},
				3
			);
			tint(sp, '#ffffff', 1 - clamp01(u / 0.5));
			const w = sp.width / dpr;
			c.drawImage(sp, -w / 2, -w / 2, w, w);
		} else {
			drawGhostForm(c, f, 0, 0, S, 1 - clamp01(u / 0.5));
		}
		c.restore();
	}
}

// ── the shock (V1) ──────────────────────────────────────────────────────────────

/** One hop of the discharge, in px: from its source to the ghost, `delay` s after the press. */
export interface ShockHop {
	readonly x0: number;
	readonly y0: number;
	readonly x1: number;
	readonly y1: number;
	readonly delay: number;
}

/** Seconds between two hops of the chain, as drawn (the logic strikes them all at once). */
export const SHOCK_HOP = 0.05;

/** The discharge, `t` seconds after the press: the hero's ring, then each hop's bolt and impact. */
export function drawShockArcs(
	c: Ctx,
	hops: readonly ShockHop[],
	hx: number,
	hy: number,
	S: number,
	t: number
): void {
	if (t > 0.6) return;
	c.save();
	c.lineCap = 'round';
	c.lineJoin = 'round';
	c.globalCompositeOperation = 'lighter';
	if (t < 0.3) {
		const k = t / 0.3;
		c.strokeStyle = `rgba(150,220,255,${1 - k})`;
		c.lineWidth = Math.max(1, S * 0.08 * (1 - k));
		c.beginPath();
		c.arc(hx, hy, S * (0.4 + 0.9 * easeOut(k)), 0, TAU);
		c.stroke();
	}
	hops.forEach((hop, i) => {
		const local = t - hop.delay;
		if (local >= 0) boltHop(c, hop, S, local, i);
	});
	c.restore();
}

function boltHop(c: Ctx, hop: ShockHop, S: number, t: number, i: number): void {
	const life = 0.24;
	if (t < life) {
		const frame = Math.floor(t * 30);
		// it flickers: a frame or two dark
		if (hash(frame, i + 40) > 0.18 || t < 0.04) {
			const fade = 1 - t / life;
			const seed = frame * 31 + i * 7;
			const pts = boltPoints(hop.x0, hop.y0, hop.x1, hop.y1, seed, 5, 0.2);
			strokePath(c, pts, `rgba(70,150,255,${0.22 * fade})`, S * 0.36);
			strokePath(c, pts, `rgba(130,210,255,${0.6 * fade})`, S * 0.13);
			strokePath(c, pts, `rgba(255,255,255,${0.95 * fade})`, S * 0.045);
			const along = Math.atan2(hop.y1 - hop.y0, hop.x1 - hop.x0);
			const span = Math.hypot(hop.x1 - hop.x0, hop.y1 - hop.y0);
			for (let b = 0; b < 2; b++) {
				const at = pts[Math.floor(pts.length * (0.3 + 0.35 * b))] as [number, number];
				const ang = along + (hash(seed, b) > 0.5 ? 0.7 : -0.7);
				const len = span * (0.18 + 0.15 * hash(seed, b + 3));
				const fork = boltPoints(
					at[0],
					at[1],
					at[0] + Math.cos(ang) * len,
					at[1] + Math.sin(ang) * len,
					seed + b * 13,
					3,
					0.3
				);
				strokePath(c, fork, `rgba(130,210,255,${0.45 * fade})`, S * 0.07);
				strokePath(c, fork, `rgba(255,255,255,${0.8 * fade})`, S * 0.025);
			}
		}
	}
	if (t < 0.22) {
		const k = t / 0.22;
		const r = S * (0.4 + 0.75 * easeOut(k));
		const g = c.createRadialGradient(hop.x1, hop.y1, 0, hop.x1, hop.y1, r);
		g.addColorStop(0, `rgba(255,255,255,${0.6 * (1 - k)})`);
		g.addColorStop(0.4, `rgba(140,215,255,${0.4 * (1 - k)})`);
		g.addColorStop(1, 'rgba(140,215,255,0)');
		c.fillStyle = g;
		c.beginPath();
		c.arc(hop.x1, hop.y1, r, 0, TAU);
		c.fill();
		c.strokeStyle = `rgba(220,245,255,${1 - k})`;
		c.lineWidth = Math.max(1, S * 0.035);
		for (let s = 0; s < 9; s++) {
			const ang = hash(i, s) * TAU;
			const d0 = S * (0.3 + 0.9 * easeOut(k));
			const d1 = d0 + S * 0.18 * (1 - k);
			c.beginPath();
			c.moveTo(hop.x1 + Math.cos(ang) * d0, hop.y1 + Math.sin(ang) * d0);
			c.lineTo(hop.x1 + Math.cos(ang) * d1, hop.y1 + Math.sin(ang) * d1);
			c.stroke();
		}
	}
}

/**
 * A ghost the shock holds, `t` seconds into its `seconds`: `paint(c)` paints it at (0, 0); it is
 * drawn cold blue (x-ray white in the first quarter second) and shakes in its last `shake` s.
 */
export function drawHeldGhost(
	c: Ctx,
	paint: (c: Ctx) => void,
	x: number,
	y: number,
	S: number,
	t: number,
	seconds: number,
	shake: number,
	key: number
): void {
	const dpr = scaleOf(c);
	const sp = sprite(
		S * 1.6 * dpr,
		(cc) => {
			cc.scale(dpr, dpr);
			paint(cc);
		},
		4 + (key % 4)
	);
	const xray = t < 0.26 && Math.floor(t * 24) % 2 === 0;
	if (xray) tint(sp, '#eaf8ff', 0.85);
	else tint(sp, '#8fd4ff', 0.38);
	const jx = t > seconds - shake ? Math.sin(t * 70 + key) * S * 0.05 : 0;
	blit(c, sp, x + jx, y, dpr);
}

/** The arcs crawling round a held ghost (faster and more in its last `shake` s). */
export function drawHeldArcs(
	c: Ctx,
	x: number,
	y: number,
	S: number,
	t: number,
	seconds: number,
	shake: number,
	key: number
): void {
	if (t < 0.1) return;
	const shaking = t > seconds - shake;
	const frame = Math.floor(t * (shaking ? 24 : 12));
	c.save();
	c.lineCap = 'round';
	c.lineJoin = 'round';
	c.globalCompositeOperation = 'lighter';
	for (let a = 0; a < (shaking ? 4 : 2); a++) {
		const a0 = hash(frame, a + key * 5) * TAU;
		const a1 = a0 + 0.9 + hash(frame, a + 20) * 0.9;
		const r0 = S * (0.38 + 0.08 * hash(frame, a + 30));
		const pts = boltPoints(
			x + Math.cos(a0) * r0,
			y + Math.sin(a0) * r0,
			x + Math.cos(a1) * r0,
			y + Math.sin(a1) * r0,
			frame * 17 + a + key * 3,
			3,
			0.45
		);
		strokePath(c, pts, 'rgba(110,190,255,.45)', S * 0.08);
		strokePath(c, pts, 'rgba(245,252,255,.95)', S * 0.025);
	}
	if (hash(frame, key + 70) > 0.6) {
		const a = hash(frame, key + 80) * TAU;
		sparkle(c, x + Math.cos(a) * S * 0.48, y + Math.sin(a) * S * 0.48, S * 0.07, '#e6f7ff');
	}
	c.restore();
}

/** A held ghost let go `k` (0..1) ago: a few puffs of smoke rising off it. */
export function drawRelease(c: Ctx, x: number, y: number, S: number, k: number, key: number): void {
	if (k <= 0 || k >= 1) return;
	c.save();
	c.fillStyle = '#c9cfd8';
	for (let p = 0; p < 4; p++) {
		c.globalAlpha = (1 - k) * 0.6;
		c.beginPath();
		c.arc(
			x + (hash(key, p) - 0.5) * S * 0.6,
			y - S * 0.2 - k * S * 0.5 - p * S * 0.08,
			S * (0.1 + 0.12 * k),
			0,
			TAU
		);
		c.fill();
	}
	c.restore();
}
