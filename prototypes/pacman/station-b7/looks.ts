// Candidates for the station's squad, round two (throwaway, the owner picks one; 2026-11-26). The
// owner on round one: the specimen looked like a meme engine face and blended with the palette,
// the hatchling creepy the wrong way, the jar unreadable; the feet rocked too much. So: no cartoon
// face (no mouth, no pair of human eyes), each kind told by the colour of its body and a silhouette
// of its own, and no feet: the body holds still over a hem of murk whose waves run along it and
// drip, like the classic ghosts' skirt (a 180 reads at once). The rage stays the acid overheat.
//   1 the core    a clot of murk in its kind's colour, one big glowing nucleus with a slit for an
//                 eye; on top crystal spikes, two lobes, three cilia or a lumpy growth
//   2 the crew    the same clot wearing a dead crewman's gear: a gas mask, lab goggles, a glass
//                 helmet, a hard hat with a lamp; the eyes glow behind it
//   3 the shadow  the tanks' near-black silhouette, a rim light and two slit eyes in its colour, a
//                 crown of tendrils trailing back against its heading, a smoky hem
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

const TAU = Math.PI * 2;
const CALM = 1.075;
/** Light, mid, dark of each kind's murk. */
const MURK: Record<GhostKind, readonly [string, string, string]> = {
	BLINKY: ['#ff9a8a', '#d9473f', '#6e1418'],
	PINKY: ['#ffc2ea', '#d870b8', '#6a2458'],
	INKY: ['#a8f2ff', '#3fb4cc', '#11505e'],
	CLYDE: ['#ffd49a', '#e08a2e', '#6e3a0c']
};
const SCARED: readonly [string, string, string] = ['#a9b6ff', '#4f68ff', '#1d2a8a'];
const WHITE: readonly [string, string, string] = ['#ffffff', '#e8eeff', '#aebde0'];
const SHADOW: readonly [string, string, string] = ['#2a3a32', '#121c17', '#060b08'];
const KIND_RGB: Record<GhostKind, string> = {
	BLINKY: '255, 120, 104',
	PINKY: '255, 160, 226',
	INKY: '120, 230, 250',
	CLYDE: '255, 186, 100'
};
const FRIGHT_RGB = '96, 120, 255';
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

// --------------------------------------------------------------------------- the shared body

/** The body: a dome over straight sides, the hem's four scallops waving, the wave running along. */
function traceHem(c: Ctx, t: number, ph: number): void {
	c.beginPath();
	c.moveTo(-9.6, 7.6);
	c.lineTo(-9.6, 0);
	c.arc(0, 0, 9.6, Math.PI, TAU);
	c.lineTo(9.6, 7.6);
	for (let i = 0; i < 4; i++) {
		const x0 = 9.6 - i * 4.8;
		const x1 = x0 - 4.8;
		const wave = Math.sin(t * 7 + ph + i * 1.6);
		c.quadraticCurveTo(x0 - 2.4, 11.4 + wave * 1.3, x1, 7.6 + Math.sin(t * 7 + ph + i * 1.6 + 0.8) * 0.6);
	}
	c.closePath();
}

/** The murk's fill: lit from the upper left, darker inside, a glassy rim, bubbles rising. */
function paintMurk(c: Ctx, pal: readonly [string, string, string], o: PretenderOpts, ph: number, bubbles: boolean): void {
	traceHem(c, o.time, ph);
	stroke(c, INK, 3.0);
	const g = c.createRadialGradient(-3, -3.5, 0.6, 0, 1.5, 12);
	g.addColorStop(0, pal[0]);
	g.addColorStop(0.5, pal[1]);
	g.addColorStop(1, pal[2]);
	traceHem(c, o.time, ph);
	c.fillStyle = g;
	c.fill();
	c.save();
	traceHem(c, o.time, ph);
	c.clip();
	// darker swirls of murk inside
	c.globalAlpha = 0.28;
	ellipse(c, 3.4 + Math.sin(o.time * 0.7 + ph) * 1.2, 5, 4.6, 2.6, pal[2]);
	ellipse(c, -4.2, 2.6 + Math.cos(o.time * 0.6 + ph) * 1.0, 2.8, 1.8, pal[2]);
	c.globalAlpha = 1;
	if (bubbles) {
		for (let i = 0; i < 4; i++) {
			const u = (o.time * (0.32 + i * 0.05) + i / 4 + ph) % 1;
			c.beginPath();
			c.arc(-6 + i * 4 + Math.sin(u * 6 + i) * 0.8, 10 - u * 18, 0.55 + (i % 2) * 0.35, 0, TAU);
			stroke(c, `rgba(255, 255, 255, ${0.6 * Math.sin(u * Math.PI)})`, 0.45);
		}
	}
	c.restore();
	c.beginPath();
	c.arc(0, 0, 8.2, Math.PI * 1.1, Math.PI * 1.45);
	stroke(c, 'rgba(255, 255, 255, 0.55)', 1.1);
	ellipse(c, -5.4, -5.6, 1.0, 0.7, 'rgba(255, 255, 255, 0.75)');
}

/** Drips off the hem (the shadow trails smoke instead). */
function drips(c: Ctx, color: string, o: PretenderOpts, ph: number, smoke: boolean): void {
	for (let i = 0; i < 3; i++) {
		const u = (o.time * (smoke ? 0.7 : 0.9) + i / 3 + ph) % 1;
		const x = (i - 1) * 4.8 + Math.sin(i * 2.3 + ph) * 1.2 - o.lookX * u * 3;
		const y = 10.6 + u * (smoke ? 3 : 5);
		if (smoke) ellipse(c, x, y, 1.2 + u * 2, 0.9 + u * 1.4, `rgba(40, 56, 48, ${0.5 * (1 - u)})`);
		else {
			c.save();
			c.globalAlpha *= 1 - u;
			ellipse(c, x, y, 0.9 * (1 - u * 0.4), 1.1 * (1 - u * 0.4), color);
			c.restore();
		}
	}
}

/** The fright's cue on any of them: hollow ring eyes with tiny pupils, a drop of sweat. */
function frightEyes(c: Ctx, o: PretenderOpts, white: boolean, y: number): void {
	const tremble = Math.sin(o.time * 40) * 0.25;
	for (const side of [-1, 1]) {
		ellipse(c, side * 3.4 + tremble, y, 2.3, 2.3, '#ffffff', 1.0);
		ellipse(c, side * 3.4 + tremble + o.lookX * 0.7, y + o.lookY * 0.7, 0.9, 0.9, white ? '#ff6a3a' : INK);
	}
	if (!white) {
		c.beginPath();
		c.moveTo(7.2, -6.4);
		c.bezierCurveTo(9.2, -3.8, 9, -2.4, 7.2, -2.2);
		c.bezierCurveTo(5.4, -2.4, 5.2, -3.8, 7.2, -6.4);
		c.fillStyle = '#bfe9ff';
		c.fill();
		stroke(c, INK, 0.6);
	}
}

// ---------------------------------------------------------------------------------- 1 the core

/** Its kind's top, as paths: crystal spikes, two lobes, three cilia, a lumpy growth. */
function topShapes(kind: GhostKind, o: PretenderOpts, tell: boolean): Array<(c: Ctx) => void> {
	if (kind === 'BLINKY') {
		return [
			[-5.0, 4.6, -0.42],
			[0, 7.2, 0],
			[5.0, 4.6, 0.42]
		].map(([x, h, a]) => (c: Ctx) => {
			const bx = x;
			const by = -7.4 + Math.abs(x) * 0.3;
			const tip = h + (tell ? 1.2 : 0);
			c.beginPath();
			c.moveTo(bx + Math.cos(a) * -2.4, by + Math.sin(a) * -2.4 + 1.6);
			c.lineTo(bx + Math.sin(a) * tip, by - Math.cos(a) * tip);
			c.lineTo(bx + Math.cos(a) * 2.4, by + Math.sin(a) * 2.4 + 1.6);
			c.closePath();
		});
	}
	if (kind === 'PINKY') {
		return [-1, 1].map((side) => (c: Ctx) => {
			c.beginPath();
			c.arc(side * 4.6, -7.0, 4.5, 0, TAU);
		});
	}
	if (kind === 'CLYDE') {
		return [
			[4.4, -8.4, 3.6],
			[7.6, -5.0, 2.8],
			[0.2, -10.0, 2.6]
		].map(([x, y, r]) => (c: Ctx) => {
			c.beginPath();
			c.arc(x, y, r, 0, TAU);
		});
	}
	return [];
}

/** INKY's cilia, waving, over the body. */
function cilia(c: Ctx, pal: readonly [string, string, string], o: PretenderOpts, tell: boolean): void {
	for (const [x, h] of [
		[-3.4, 5],
		[0, 6.4],
		[3.4, 5]
	] as const) {
		const w = Math.sin(o.time * (tell ? 9 : 3) + x) * 1.4;
		c.beginPath();
		c.moveTo(x, -8.4);
		c.quadraticCurveTo(x + w, -8.4 - h * 0.6, x - w * 0.6, -8.4 - h);
		stroke(c, INK, 2.2);
		stroke(c, pal[0], 1.0);
		ellipse(c, x - w * 0.6, -8.4 - h, 1.0, 1.0, pal[0], 0.7);
	}
}

function bodyCore(c: Ctx, kind: GhostKind, st: CandState, o: PretenderOpts, pal: readonly [string, string, string], scared: boolean, white: boolean): void {
	const ph = PHASE[kind];
	const tell = st === 'tell';
	const tops = scared ? [] : topShapes(kind, o, tell);
	// the top's outline behind the body, the body, then the top's fill over the body's outline
	for (const shape of tops) {
		shape(c);
		stroke(c, INK, kind === 'BLINKY' ? 2.4 : 3.0);
	}
	paintMurk(c, pal, o, ph, true);
	for (const shape of tops) {
		const g = c.createLinearGradient(0, -16, 0, -5);
		g.addColorStop(0, pal[0]);
		g.addColorStop(1, pal[1]);
		shape(c);
		c.fillStyle = g;
		c.fill();
		if (kind === 'BLINKY') stroke(c, 'rgba(255, 255, 255, 0.35)', 0.5);
	}
	if (!scared && kind === 'INKY') cilia(c, pal, o, tell);
	if (scared) {
		frightEyes(c, o, white, -1.2);
		return;
	}
	const rgb = tell ? '255, 200, 71' : KIND_RGB[kind];
	const cores = tell ? [-2.6, 2.6] : [0];
	for (const dx of cores) {
		const cx = dx + o.lookX * 2.2;
		const cy = -0.4 + o.lookY * 1.8;
		const r = tell ? 3.2 + Math.sin((o.time / 1.3) * TAU) * 0.3 : 4.4;
		glow(c, cx, cy, r * 2.2, `rgba(${rgb}, 0.85)`, `rgba(${rgb}, 0.3)`);
		const g = c.createRadialGradient(cx - r * 0.3, cy - r * 0.3, 0.2, cx, cy, r);
		g.addColorStop(0, '#fffbe8');
		g.addColorStop(0.55, `rgb(${rgb})`);
		g.addColorStop(1, tell ? '#b8781a' : pal[1]);
		c.beginPath();
		c.arc(cx, cy, r, 0, TAU);
		c.fillStyle = g;
		c.fill();
		stroke(c, INK, 0.9);
		// the slit, toward the way it goes
		const sx = cx + o.lookX * r * 0.35;
		const sy = cy + o.lookY * r * 0.35;
		c.save();
		c.translate(sx, sy);
		if (Math.abs(o.lookY) > Math.abs(o.lookX)) c.rotate(Math.PI / 2);
		ellipse(c, 0, 0, r * 0.18, r * 0.7, '#0a0a0a');
		c.restore();
	}
}

// ----------------------------------------------------------------------------------- 2 the crew

function glowEyes(c: Ctx, o: PretenderOpts, y: number, gap: number, rgb: string, r: number): void {
	for (const side of [-1, 1]) {
		const ex = side * gap + o.lookX * 1.6;
		const ey = y + o.lookY * 1.3;
		glow(c, ex, ey, r * 2.4, `rgba(${rgb}, 0.9)`, `rgba(${rgb}, 0.3)`);
		ellipse(c, ex, ey, r, r * 1.1, `rgb(${rgb})`);
		ellipse(c, ex + o.lookX * r * 0.4, ey + o.lookY * r * 0.4, r * 0.35, r * 0.55, 'rgba(10, 10, 10, 0.8)');
	}
}

function bodyCrew(c: Ctx, kind: GhostKind, st: CandState, o: PretenderOpts, pal: readonly [string, string, string], scared: boolean, white: boolean): void {
	const ph = PHASE[kind];
	const tell = st === 'tell';
	const rattle = tell ? Math.sin(o.time * 34) * 0.4 : 0;
	const eyeRgb = tell ? '255, 200, 71' : '235, 255, 240';
	const lx = o.lookX * 1.6 + rattle;
	const ly = o.lookY * 1.2;
	paintMurk(c, pal, o, ph, kind !== 'BLINKY');
	if (kind === 'BLINKY') {
		// a gas mask: rubber, two round lenses, a filter canister
		if (scared) frightEyes(c, o, white, -1.4);
		else
			for (const side of [-1, 1]) {
				glow(c, side * 2.8 + lx, -1.2 + ly, 4, `rgba(${eyeRgb}, 0.6)`, `rgba(${eyeRgb}, 0.2)`);
			}
		c.save();
		c.translate(lx, ly);
		c.beginPath();
		c.moveTo(-6.4, -4.2);
		c.quadraticCurveTo(0, -6.6, 6.4, -4.2);
		c.quadraticCurveTo(7.4, 2.2, 3.2, 5.2);
		c.lineTo(-3.2, 5.2);
		c.quadraticCurveTo(-7.4, 2.2, -6.4, -4.2);
		c.closePath();
		c.fillStyle = scared ? '#4a5470' : '#2c3432';
		c.fill();
		stroke(c, INK, 1.4);
		for (const side of [-1, 1]) {
			ellipse(c, side * 2.8, -1.3, 2.3, 2.3, scared ? 'rgba(200, 210, 255, 0.5)' : `rgba(${eyeRgb}, ${tell ? 0.95 : 0.75})`);
			c.beginPath();
			c.arc(side * 2.8, -1.3, 2.3, 0, TAU);
			stroke(c, '#9aa6a2', 1.1);
			ellipse(c, side * 2.8 - 0.8, -2.1, 0.6, 0.4, 'rgba(255, 255, 255, 0.85)');
		}
		ellipse(c, 0, 5.0, 2.7, 2.2, '#6b7774', 1.2);
		for (const yy of [4.2, 5.2]) {
			c.beginPath();
			c.moveTo(-2.2, yy);
			c.lineTo(2.2, yy);
			stroke(c, '#3a4442', 0.5);
		}
		c.restore();
		c.beginPath();
		c.moveTo(-9.3, -2.6);
		c.lineTo(-6.2 + lx, -2.4 + ly);
		c.moveTo(9.3, -2.6);
		c.lineTo(6.2 + lx, -2.4 + ly);
		stroke(c, '#2c3432', 1.2);
	} else if (kind === 'PINKY') {
		// lab goggles on a strap
		c.save();
		c.beginPath();
		c.moveTo(-9.6, -2.6);
		c.lineTo(9.6, -2.6);
		stroke(c, '#3a4442', 1.8);
		c.restore();
		if (scared) frightEyes(c, o, white, -2.4);
		else glowEyes(c, o, -2.4, 3.3, eyeRgb, 1.5);
		for (const side of [-1, 1]) {
			const gx = side * 3.4 + lx;
			const gy = -2.4 + ly;
			c.beginPath();
			c.arc(gx, gy, 2.9, 0, TAU);
			c.fillStyle = 'rgba(210, 236, 255, 0.28)';
			c.fill();
			stroke(c, INK, 2.2);
			stroke(c, '#d6dde0', 1.1);
			ellipse(c, gx - 1.1, gy - 1.2, 0.8, 0.5, 'rgba(255, 255, 255, 0.85)');
		}
		c.beginPath();
		c.moveTo(-0.6 + lx, -2.6 + ly);
		c.lineTo(0.6 + lx, -2.6 + ly);
		stroke(c, '#d6dde0', 1.0);
	} else if (kind === 'INKY') {
		// a glass helmet over the head, a collar ring, a little antenna
		if (scared) frightEyes(c, o, white, -1.6);
		else glowEyes(c, o, -1.6, 3.4, eyeRgb, 1.6);
		c.beginPath();
		c.arc(0, -0.6, 9.0, Math.PI * 0.92, Math.PI * 2.08);
		c.fillStyle = 'rgba(200, 240, 255, 0.12)';
		c.fill();
		stroke(c, INK, 2.0);
		stroke(c, '#cfe8f0', 0.9);
		c.beginPath();
		c.arc(0, -0.6, 7.4, Math.PI * 1.12, Math.PI * 1.42);
		stroke(c, 'rgba(255, 255, 255, 0.8)', 1.4);
		c.beginPath();
		c.moveTo(-9.4, 3.4);
		c.quadraticCurveTo(0, 5.4, 9.4, 3.4);
		stroke(c, INK, 3.4);
		stroke(c, '#8d9a96', 2.0);
		c.beginPath();
		c.moveTo(5.6, -7.6);
		c.lineTo(7.4, -11.2);
		stroke(c, INK, 1.2);
		ellipse(c, 7.4, -11.2, 0.9, 0.9, Math.floor(o.time * 1.5) % 2 ? '#ff5a4a' : '#5a1a14', 0.6);
	} else {
		// a hard hat with a lamp that looks the way it goes
		if (scared) frightEyes(c, o, white, 0.2);
		else glowEyes(c, o, 0.4, 3.3, eyeRgb, 1.5);
		const hx = rattle;
		if (!scared) {
			const ax = o.lookX;
			const ay = o.lookY || 0.0001;
			const g = c.createRadialGradient(hx + ax * 9, -6 + ay * 9, 0.5, hx + ax * 9, -6 + ay * 9, 7);
			g.addColorStop(0, 'rgba(255, 240, 190, 0.45)');
			g.addColorStop(1, 'rgba(255, 240, 190, 0)');
			c.fillStyle = g;
			c.beginPath();
			c.arc(hx + ax * 9, -6 + ay * 9, 7, 0, TAU);
			c.fill();
		}
		c.beginPath();
		c.arc(hx, -4.6, 7.6, Math.PI, TAU);
		c.closePath();
		c.fillStyle = scared ? '#c9b47a' : '#f3b23a';
		c.fill();
		stroke(c, INK, 1.5);
		c.beginPath();
		c.ellipse(hx, -4.4, 10.2, 1.6, 0, 0, TAU);
		c.fillStyle = scared ? '#b39f6a' : '#e09a28';
		c.fill();
		stroke(c, INK, 1.3);
		c.beginPath();
		c.moveTo(hx, -12);
		c.lineTo(hx, -5);
		stroke(c, '#ffd27a', 0.9);
		ellipse(c, hx + o.lookX * 3, -8.4, 1.6, 1.4, '#fff6d8', 1.0);
	}
}

// --------------------------------------------------------------------------------- 3 the shadow

function crown(c: Ctx, kind: GhostKind, o: PretenderOpts, rgb: string, st: CandState): void {
	const tell = st === 'tell';
	const scared = st === 'fright';
	const shape: Record<GhostKind, { len: number; curl: number; w: number }> = {
		BLINKY: { len: 7.5, curl: 0.4, w: 2.4 },
		PINKY: { len: 6.5, curl: 1.6, w: 2.2 },
		INKY: { len: 9.5, curl: 0.8, w: 1.7 },
		CLYDE: { len: 5.5, curl: 0.6, w: 3.0 }
	};
	const s = shape[kind];
	// they trail back against the heading; they bristle up in the tell, droop in the fright
	const back = tell ? 0 : -o.lookX * 4.5;
	const lift = tell ? 1.3 : scared ? 0.45 : 1;
	for (let i = 0; i < 5; i++) {
		const a = Math.PI * (1.18 + i * 0.16);
		const bx = Math.cos(a) * 8.6;
		const by = Math.sin(a) * 8.6;
		const w = Math.sin(o.time * (tell ? 10 : 3.2) + i * 1.3 + PHASE[kind]) * 1.2;
		const ex = bx * 1.2 + back + w;
		const ey = by - s.len * lift + (scared ? 5 : 0);
		c.beginPath();
		c.moveTo(bx, by);
		c.bezierCurveTo(bx, by - s.len * 0.5 * lift, ex + s.curl * 3, ey + s.curl * 2, ex, ey);
		stroke(c, INK, s.w + 1.2);
		stroke(c, scared ? '#3346d0' : '#101a15', s.w);
		if (!scared) ellipse(c, ex, ey, 0.7, 0.7, `rgba(${rgb}, 0.9)`);
	}
}

function bodyShadow(c: Ctx, kind: GhostKind, st: CandState, o: PretenderOpts, scared: boolean, white: boolean): void {
	const ph = PHASE[kind];
	const tell = st === 'tell';
	const rgb = tell ? '255, 200, 71' : KIND_RGB[kind];
	crown(c, kind, o, rgb, st);
	paintMurk(c, scared ? (white ? WHITE : SCARED) : SHADOW, o, ph, false);
	if (!scared) {
		// the rim light in its colour
		c.beginPath();
		c.arc(0, 0, 9.1, Math.PI * 1.0, Math.PI * 2.0);
		stroke(c, `rgba(${rgb}, 0.95)`, 1.3);
		c.beginPath();
		c.moveTo(-9.1, 0);
		c.lineTo(-9.1, 7);
		c.moveTo(9.1, 0);
		c.lineTo(9.1, 7);
		stroke(c, `rgba(${rgb}, 0.55)`, 1.0);
	}
	if (scared) {
		frightEyes(c, o, white, -0.8);
		return;
	}
	for (const side of [-1, 1]) {
		const ex = side * 3.6 + o.lookX * 2.0;
		const ey = -0.8 + o.lookY * 1.6;
		glow(c, ex, ey, 4.6, `rgba(${rgb}, 0.9)`, `rgba(${rgb}, 0.3)`);
		c.save();
		c.translate(ex, ey);
		c.rotate(side * -0.32);
		ellipse(c, 0, 0, tell ? 2.8 : 2.6, tell ? 1.4 : 0.75, `rgb(${rgb})`);
		ellipse(c, o.lookX * 0.8, o.lookY * 0.3, 0.55, tell ? 1.2 : 0.6, '#fffbe8');
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
	c.translate(0, Math.sin(o.time * 2.6 + ph) * 0.45 * (1 - k) - 1);
	const breath = Math.sin(o.time * 2.2 + ph);
	c.scale(1 + 0.02 * breath, 1 - 0.02 * breath);
	const pal = scared ? (white ? WHITE : SCARED) : MURK[kind];
	if (v !== 'c' || scared) drips(c, pal[1], o, ph, false);
	else drips(c, '', o, ph, true);
	if (v === 'a') bodyCore(c, kind, st, o, pal, scared, white);
	else if (v === 'b') bodyCrew(c, kind, st, o, pal, scared, white);
	else bodyShadow(c, kind, st, o, scared, white);
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
export function drawCandidate(c: Ctx, x: number, y: number, tile: number, kind: GhostKind, v: Look, st: CandState, o: PretenderOpts): void {
	if (st === 'eyes') {
		drawPretender(c, x, y, tile, kind, 'eyes', o);
		return;
	}
	const unit = (tile / 25) * 0.78;
	if (st === 'mimic') {
		const k = clamp(o.fold ?? 0, 0, 1);
		halo(c, x, y, tile, KIND_RGB[kind], 0.3 * (1 - k));
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
	halo(c, x, y, tile, st === 'fright' ? FRIGHT_RGB : KIND_RGB[kind], v === 'c' ? 0.44 : 0.32);
	c.save();
	c.translate(x, y);
	walker(c, kind, v, st, o, unit, 0);
	c.restore();
}
