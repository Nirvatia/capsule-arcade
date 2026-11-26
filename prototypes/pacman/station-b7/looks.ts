// Candidates for the station's squad, round three (throwaway, the owner picks one; 2026-11-26):
// the tanks' content let out. The owner on round two: they stopped looking like specimens (the
// shadow read cyberpunk, the crew Among Us, the core a cyclops). What the tanks show: a dark,
// shapeless thing with curling limbs, seen through murky green liquid, alive but slow. So each is a
// dark specimen inside its murk: no face on the surface, its two small glowing eyes on the thing
// inside (looking the way it goes), the kind told by the colour of those eyes, a hue mixed into
// the murk (no toy colours) and the specimen's shape (tentacles, a tangle, spines, a curled
// embryo). No feet. Three shells:
//   a the drop    a round drop of murk, its bottom sagging and dripping
//   b the ghost   the classic ghost's silhouette in murk, a wavy hem running and dripping
//   c the film    hardly a shell: the specimen in a thin film of murk, a smear trailing behind
// The rage stays the acid overheat.
import type { GhostKind } from '../../../src/games/pacman/logic/actors/GhostModel';
import {
	INK,
	PHASE,
	SCALE,
	drawPretender,
	ellipse,
	glow,
	type PretenderOpts
} from '../../../src/games/pacman/render/station/pretender';

type Ctx = CanvasRenderingContext2D;
export type Look = 'a' | 'b' | 'c';
export type CandState = 'hunt' | 'tell' | 'fright' | 'eyes' | 'mimic';
type Pal = readonly [string, string, string];

const TAU = Math.PI * 2;
const CALM = 1.075;
/** The murk with its kind's hue mixed in: light, mid, dark. */
const MURK: Record<GhostKind, Pal> = {
	BLINKY: ['#c9937a', '#6f3a2a', '#24120d'],
	PINKY: ['#c4a2c6', '#64486c', '#221826'],
	INKY: ['#93d8c6', '#2c6a60', '#0c2421'],
	CLYDE: ['#d4b47c', '#6f5428', '#261c0b']
};
const SCARED: Pal = ['#9aa8ff', '#3a4fd0', '#141c60'];
const WHITE: Pal = ['#ffffff', '#d8e0f6', '#9aa8c8'];
/** The eyes' light per kind. */
const EYE: Record<GhostKind, string> = {
	BLINKY: '255, 104, 84',
	PINKY: '255, 140, 228',
	INKY: '100, 240, 255',
	CLYDE: '255, 186, 80'
};
const GOLD = '255, 200, 71';
const FRIGHT_RGB = '96, 120, 255';
const SPECIMEN = '#050a07';
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (e0: number, e1: number, x: number) => {
	const k = clamp((x - e0) / (e1 - e0), 0, 1);
	return k * k * (3 - 2 * k);
};

function stroke(c: Ctx, color: string, w: number): void {
	c.strokeStyle = color;
	c.lineWidth = w;
	c.lineCap = 'round';
	c.lineJoin = 'round';
	c.stroke();
}

// ------------------------------------------------------------------------------ the specimen

/**
 * The dark thing inside, centred at the origin, about 12 units across, and its two small eyes on
 * its head, toward the way it goes. `agit` 0 calm .. 1 thrashing (the tell), `curl` 0 .. 1 drawn
 * in tight (the fright).
 */
function specimen(
	c: Ctx,
	kind: GhostKind,
	o: PretenderOpts,
	agit: number,
	curl: number,
	eyeRgb: string,
	scaredEyes: boolean
): void {
	const ph = PHASE[kind];
	const t = o.time;
	const sp = 1 + agit * 3;
	c.save();
	c.scale(1 - curl * 0.3, 1 - curl * 0.3);
	c.rotate(Math.sin(t * 0.5 + ph) * 0.2 + agit * Math.sin(t * 23) * 0.08);
	c.fillStyle = SPECIMEN;
	c.strokeStyle = SPECIMEN;
	c.lineCap = 'round';
	if (kind === 'BLINKY') {
		// long tentacles, as in the tank
		for (let i = 0; i < 5; i++) {
			const a = i * 1.26 + ph + Math.sin(t * 1.1 * sp + i) * (0.12 + agit * 0.2);
			c.lineWidth = 2.6 - i * 0.25;
			c.beginPath();
			c.moveTo(Math.cos(a) * 1.6, Math.sin(a) * 1.6);
			c.quadraticCurveTo(
				Math.cos(a + 0.7) * 4.8,
				Math.sin(a + 0.7) * 4.8,
				Math.cos(a + 1.3) * 6.4,
				Math.sin(a + 1.3) * 6.4
			);
			c.stroke();
		}
		ellipse(c, 0, 0, 3.6, 2.8, SPECIMEN);
	} else if (kind === 'PINKY') {
		// a tangle of loops
		c.lineWidth = 1.7;
		for (let i = 0; i < 4; i++) {
			const a = i * 1.57 + t * 0.4 * sp + ph;
			c.beginPath();
			c.ellipse(Math.cos(a) * 1.8, Math.sin(a) * 1.4, 3.6, 1.8, a, 0, TAU);
			c.stroke();
		}
		ellipse(c, 0, 0, 3.2, 2.9, SPECIMEN);
	} else if (kind === 'INKY') {
		// spiny
		ellipse(c, 0, 0, 3.8, 3.4, SPECIMEN);
		for (let i = 0; i < 8; i++) {
			const a = (i / 8) * TAU + t * 0.25 * sp + ph;
			const len = 5.6 + Math.sin(t * 2 * sp + i * 1.7) * 0.5;
			c.beginPath();
			c.moveTo(Math.cos(a - 0.22) * 3.2, Math.sin(a - 0.22) * 3.0);
			c.lineTo(Math.cos(a) * len, Math.sin(a) * len);
			c.lineTo(Math.cos(a + 0.22) * 3.2, Math.sin(a + 0.22) * 3.0);
			c.closePath();
			c.fill();
		}
	} else {
		// curled like an embryo, a big head
		c.lineWidth = 3.0;
		c.beginPath();
		c.arc(0.4, 0.8, 3.4, -0.6, Math.PI * 1.35);
		c.stroke();
		ellipse(c, 3.0, -1.4, 3.0, 2.7, SPECIMEN);
		c.lineWidth = 0.9;
		for (let i = 0; i < 3; i++) {
			const w = Math.sin(t * 2 * sp + i * 1.4 + ph) * 0.8;
			c.beginPath();
			c.moveTo(-2.2 + i * 0.6, 3.4);
			c.quadraticCurveTo(-3.6 + i, 5.6 + w, -2.4 + i * 1.2 + w, 6.8);
			c.stroke();
		}
	}
	c.restore();
	// the eyes: two small lights on its head, the way it goes (not a face)
	const hx = (kind === 'CLYDE' ? 2.2 : 0) + o.lookX * 2.4;
	const hy = (kind === 'CLYDE' ? -1.4 : -0.6) + o.lookY * 2.0;
	const vertical = Math.abs(o.lookY) > Math.abs(o.lookX);
	for (const side of [-1, 1]) {
		const ex = hx + (vertical ? side * 1.5 : side * 1.25);
		const ey = hy + (vertical ? 0 : -0.4);
		const r = agit > 0 ? 0.95 : 0.7;
		if (scaredEyes) {
			ellipse(c, ex, ey, 1.0, 1.0, '#ffffff');
			ellipse(c, ex, ey, 0.4, 0.4, INK);
			continue;
		}
		glow(c, ex, ey, 2.6, `rgba(${eyeRgb}, 0.95)`, `rgba(${eyeRgb}, 0.35)`);
		ellipse(c, ex, ey, r, r, '#fffbe8');
	}
}

// ---------------------------------------------------------------------------------- the shells

/** a: a drop, wobbling, its bottom sagging. */
function traceDrop(c: Ctx, t: number, ph: number): void {
	c.beginPath();
	for (let i = 0; i <= 32; i++) {
		const a = (i / 32) * TAU;
		const sag = Math.max(0, Math.sin(a)) ** 4 * 1.8;
		const r = 9.2 + Math.sin(a * 3 + t * 2 + ph) * 0.35 + sag;
		const x = Math.cos(a) * r;
		const y = Math.sin(a) * r + 0.6;
		if (i === 0) c.moveTo(x, y);
		else c.lineTo(x, y);
	}
	c.closePath();
}

/** b: the classic ghost's silhouette, its hem's waves running. */
function traceGhost(c: Ctx, t: number, ph: number): void {
	c.beginPath();
	c.moveTo(-9.6, 7.6);
	c.lineTo(-9.6, 0);
	c.arc(0, 0, 9.6, Math.PI, TAU);
	c.lineTo(9.6, 7.6);
	for (let i = 0; i < 4; i++) {
		const x0 = 9.6 - i * 4.8;
		const x1 = x0 - 4.8;
		const w = Math.sin(t * 7 + ph + i * 1.6);
		c.quadraticCurveTo(
			x0 - 2.4,
			11.4 + w * 1.3,
			x1,
			7.6 + Math.sin(t * 7 + ph + i * 1.6 + 0.8) * 0.6
		);
	}
	c.closePath();
}

/** The murk in a shell: lit from the upper left, swirls, bubbles, the specimen inside, glass. */
function murkShell(
	c: Ctx,
	trace: (c: Ctx) => void,
	pal: Pal,
	kind: GhostKind,
	st: CandState,
	o: PretenderOpts,
	scared: boolean,
	white: boolean
): void {
	const ph = PHASE[kind];
	const tell = st === 'tell';
	trace(c);
	stroke(c, INK, 2.6);
	const g = c.createRadialGradient(-3.2, -3.6, 0.6, 0, 1.2, 12);
	g.addColorStop(0, pal[0]);
	g.addColorStop(0.5, pal[1]);
	g.addColorStop(1, pal[2]);
	trace(c);
	c.fillStyle = g;
	c.fill();
	c.save();
	trace(c);
	c.clip();
	// swirls in the murk
	c.globalAlpha *= 0.3;
	ellipse(c, 3.6 + Math.sin(o.time * 0.6 + ph) * 1.4, 4.4, 5, 2.6, pal[2]);
	ellipse(c, -4.4, -3 + Math.cos(o.time * 0.5 + ph) * 1.2, 3, 1.8, pal[0]);
	c.globalAlpha /= 0.3;
	// the thing inside, a little veiled by the murk in front of it
	c.save();
	c.translate(Math.sin(o.time * 0.45 + ph) * 0.8, 1.2 + Math.cos(o.time * 0.38 + ph) * 0.6);
	specimen(c, kind, o, tell ? 1 : 0, scared ? 1 : 0, tell ? GOLD : EYE[kind], scared);
	c.restore();
	trace(c);
	c.fillStyle = scared ? 'rgba(40, 60, 200, 0.12)' : `rgba(40, 80, 60, ${tell ? 0.22 : 0.12})`;
	c.fill();
	for (let i = 0; i < 4; i++) {
		const u = (o.time * ((tell ? 0.8 : 0.3) + i * 0.05) + i / 4 + ph) % 1;
		c.beginPath();
		c.arc(-6 + i * 4 + Math.sin(u * 6 + i) * 0.8, 9 - u * 17, 0.5 + (i % 2) * 0.35, 0, TAU);
		stroke(c, `rgba(220, 255, 230, ${0.65 * Math.sin(u * Math.PI)})`, 0.45);
	}
	c.restore();
	// the glass of it
	c.beginPath();
	c.arc(0, 0.4, 8.0, Math.PI * 1.1, Math.PI * 1.45);
	stroke(c, 'rgba(230, 255, 240, 0.55)', 1.1);
	ellipse(c, -5.3, -5.2, 0.95, 0.65, 'rgba(240, 255, 248, 0.8)');
	if (scared && !white) {
		// the fright's drop of sweat on the outside
		c.beginPath();
		c.moveTo(7.2, -6.6);
		c.bezierCurveTo(9.2, -4, 9, -2.6, 7.2, -2.4);
		c.bezierCurveTo(5.4, -2.6, 5.2, -4, 7.2, -6.6);
		c.fillStyle = '#bfe9ff';
		c.fill();
		stroke(c, INK, 0.6);
	}
}

/** c: the specimen in a thin film, a smear of murk trailing behind it. */
function film(c: Ctx, pal: Pal, kind: GhostKind, st: CandState, o: PretenderOpts, scared: boolean): void {
	const ph = PHASE[kind];
	const tell = st === 'tell';
	const d = Math.hypot(o.lookX, o.lookY) || 1;
	const bx = -o.lookX / d;
	const by = -o.lookY / d;
	// the smear behind
	for (let i = 4; i >= 1; i--) {
		c.save();
		c.globalAlpha *= 0.34 - i * 0.06;
		ellipse(c, bx * i * 3.2, by * i * 3.2 + 1, 7.4 - i * 0.9, 6.6 - i * 0.9, pal[1]);
		c.restore();
	}
	// the film: a soft blob of murk with a glossy edge
	const wob = (a: number) => 8.2 + Math.sin(a * 4 + o.time * 2.4 + ph) * 0.5;
	const trace = () => {
		c.beginPath();
		for (let i = 0; i <= 28; i++) {
			const a = (i / 28) * TAU;
			const x = Math.cos(a) * wob(a);
			const y = Math.sin(a) * wob(a) * 0.92 + 0.8;
			if (i === 0) c.moveTo(x, y);
			else c.lineTo(x, y);
		}
		c.closePath();
	};
	const g = c.createRadialGradient(-2.5, -2.5, 0.5, 0, 0.8, 9.5);
	g.addColorStop(0, pal[0]);
	g.addColorStop(0.6, pal[1]);
	g.addColorStop(1, pal[2]);
	trace();
	c.save();
	c.globalAlpha *= 0.82;
	c.fillStyle = g;
	c.fill();
	c.restore();
	trace();
	stroke(c, 'rgba(5, 10, 7, 0.7)', 1.6);
	c.save();
	c.translate(0, 0.8);
	c.scale(1.25, 1.25);
	specimen(c, kind, o, tell ? 1 : 0, scared ? 1 : 0, tell ? GOLD : EYE[kind], scared);
	c.restore();
	c.beginPath();
	c.arc(0, 0.8, 7.2, Math.PI * 1.12, Math.PI * 1.48);
	stroke(c, 'rgba(230, 255, 240, 0.6)', 1.0);
}

/** Drips off the bottom (the drop and the ghost). */
function drips(c: Ctx, color: string, o: PretenderOpts, ph: number, y0: number, spread: number): void {
	for (let i = 0; i < 3; i++) {
		const u = (o.time * 0.85 + i / 3 + ph) % 1;
		c.save();
		c.globalAlpha *= 1 - u;
		ellipse(
			c,
			(i - 1) * spread + Math.sin(i * 2.3 + ph) * 1.0 - o.lookX * u * 3,
			y0 + u * 5,
			0.9 * (1 - u * 0.4),
			1.1 * (1 - u * 0.4),
			color
		);
		c.restore();
	}
}

// ---------------------------------------------------------------------------------- the walker

function walker(c: Ctx, kind: GhostKind, v: Look, st: CandState, o: PretenderOpts, unit: number, k: number): void {
	const ph = PHASE[kind];
	c.scale(unit * SCALE * CALM, unit * SCALE * CALM);
	const scared = st === 'fright';
	const white = scared && Boolean(o.white);
	if (scared && !o.flashing) c.translate(Math.sin(o.time * 38 + ph) * 0.4, 0);
	// no feet, no rocking: a slow hover and a soft breath
	c.translate(0, Math.sin(o.time * 2.4 + ph) * 0.45 * (1 - k) - 0.6);
	const breath = Math.sin(o.time * 2 + ph);
	c.scale(1 + 0.025 * breath, 1 - 0.025 * breath);
	const pal = scared ? (white ? WHITE : SCARED) : MURK[kind];
	if (v === 'a') {
		drips(c, pal[1], o, ph, 11.2, 2.2);
		murkShell(c, (cc) => traceDrop(cc, o.time, ph), pal, kind, st, o, scared, white);
	} else if (v === 'b') {
		drips(c, pal[1], o, ph, 10.6, 4.8);
		murkShell(c, (cc) => traceGhost(cc, o.time, ph), pal, kind, st, o, scared, white);
	} else film(c, pal, kind, st, o, scared);
}

function halo(c: Ctx, x: number, y: number, tile: number, rgb: string, a: number): void {
	if (a <= 0.01) return;
	const r = tile * 0.8;
	const g = c.createRadialGradient(x, y, 0, x, y, r);
	g.addColorStop(0, `rgba(${rgb}, ${a})`);
	g.addColorStop(0.55, `rgba(${rgb}, ${a * 0.4})`);
	g.addColorStop(1, `rgba(${rgb}, 0)`);
	c.save();
	c.globalCompositeOperation = 'lighter';
	c.fillStyle = g;
	c.beginPath();
	c.arc(x, y, r, 0, TAU);
	c.fill();
	c.restore();
}

/** A candidate at (x, y), `tile` the tile's size in px; `o.fold` the mimicry (0 creature .. 1 food). */
export function drawCandidate(
	c: Ctx,
	x: number,
	y: number,
	tile: number,
	kind: GhostKind,
	v: Look,
	st: CandState,
	o: PretenderOpts
): void {
	if (st === 'eyes') {
		drawPretender(c, x, y, tile, kind, 'eyes', o);
		return;
	}
	const unit = (tile / 25) * 0.78;
	if (st === 'mimic') {
		const k = clamp(o.fold ?? 0, 0, 1);
		halo(c, x, y, tile, EYE[kind], 0.22 * (1 - k));
		if (k > 0.55 && o.spore) {
			c.save();
			c.translate(x, y);
			o.spore(c, smooth(0.6, 0.95, k), lerp(0.8, 1, k));
			c.restore();
		}
		if (k > 0.97) return;
		c.save();
		c.globalAlpha *= 1 - smooth(0.72, 0.97, k);
		c.translate(x, y + k * tile * 0.06);
		c.scale(lerp(1, 0.4, k), lerp(1, 0.4, k));
		walker(c, kind, v, 'hunt', o, unit, k);
		c.restore();
		return;
	}
	halo(c, x, y, tile, st === 'fright' ? FRIGHT_RGB : EYE[kind], 0.24);
	halo(c, x, y, tile, '143, 214, 160', 0.12);
	c.save();
	c.translate(x, y);
	walker(c, kind, v, st, o, unit, 0);
	c.restore();
}
