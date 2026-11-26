// Candidates for the station's squad (throwaway, the owner picks one; 2026-11-26): its look closer
// to the specimen tanks behind the maze, the murk that leaked out of them. All keep the season
// ghosts' grammar (upright, never turned, two bean feet stepping with the distance, a lean, eyes
// that show the way); the rage stays the game's acid overheat.
//   A the specimen    a clot of the tanks' murk, a glassy rim, bubbles; inside it the thing it
//                     swallowed, lit in its colour (a wrench, a crew badge, an eyeball, a hard hat)
//   B the hatchling   a milky membrane, the curled dark embryo inside with its colour beating as a
//                     heart, big eyes, a specimen tag on a strap; a head of its own per kind
//   C the jar runner  the specimen still in its broken jar: the jar walks on two dark feet, murk
//                     sloshing inside, the thing in it peering out with eyes in its colour,
//                     tendrils out of the popped lid, a lab label
import type { GhostKind } from '../../../src/games/pacman/logic/actors/GhostModel';
import { footLift } from '../../../src/games/pacman/render/actors/cuteGhost';
import {
	INK,
	PHASE,
	SCALE,
	drawPretender,
	ellipse,
	glow,
	traceBody,
	type PretenderOpts
} from '../../../src/games/pacman/render/station/pretender';

type Ctx = CanvasRenderingContext2D;
export type Look = 'a' | 'b' | 'c';
export type CandState = 'hunt' | 'tell' | 'fright' | 'eyes' | 'mimic';

const TAU = Math.PI * 2;
const CALM = 1.075;
const KIND_RGB: Record<GhostKind, string> = {
	BLINKY: '238, 107, 96',
	PINKY: '236, 149, 210',
	INKY: '98, 216, 234',
	CLYDE: '243, 171, 85'
};
const FRIGHT_RGB = '96, 120, 255';
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (e0: number, e1: number, x: number) => {
	const k = clamp((x - e0) / (e1 - e0), 0, 1);
	return k * k * (3 - 2 * k);
};
const beat = (t: number) => {
	const u = t % 1.3;
	return 0.35 + Math.exp(-u * u * 90) + 0.55 * Math.exp(-(u - 0.22) * (u - 0.22) * 90);
};

function stroke(c: Ctx, color: string, w: number): void {
	c.strokeStyle = color;
	c.lineWidth = w;
	c.lineCap = 'round';
	c.lineJoin = 'round';
	c.stroke();
}

function rrect(c: Ctx, x: number, y: number, w: number, h: number, r: number): void {
	c.beginPath();
	c.roundRect(x, y, w, h, r);
}

/** The classic fright's face: hollow ring eyes with tiny pupils, a zigzag mouth, a drop of sweat. */
function frightFace(c: Ctx, o: PretenderOpts, white: boolean, y: number, gap: number): void {
	for (const side of [-1, 1]) {
		const ex = side * gap;
		ellipse(c, ex, y, 2.3, 2.3, '#ffffff', 1.1);
		ellipse(c, ex + o.lookX * 0.7, y + o.lookY * 0.7, 0.95, 0.95, white ? '#ff6a3a' : INK);
	}
	c.beginPath();
	c.moveTo(-3.4, y + 6.2);
	for (let i = 1; i <= 6; i++) c.lineTo(-3.4 + i * 1.13, y + 4.8 + (i % 2 ? 0 : 1.4));
	stroke(c, white ? '#ff4d4d' : INK, 0.95);
	if (!white) {
		c.beginPath();
		c.moveTo(7.2, -5.6);
		c.bezierCurveTo(9.2, -3, 9, -1.6, 7.2, -1.4);
		c.bezierCurveTo(5.4, -1.6, 5.2, -3, 7.2, -5.6);
		c.fillStyle = '#bfe9ff';
		c.fill();
		stroke(c, INK, 0.6);
	}
}

// ---------------------------------------------------------------------------- A the specimen

/** What a specimen swallowed, in its own frame (about 6 units across). */
function swallowed(c: Ctx, kind: GhostKind, t: number): void {
	if (kind === 'BLINKY') {
		// a wrench
		c.rotate(-0.5);
		rrect(c, -3.6, -0.65, 6.2, 1.3, 0.6);
		c.fillStyle = '#a7b2ae';
		c.fill();
		stroke(c, '#2a3230', 0.5);
		ellipse(c, 3.1, 0, 1.7, 1.7, '#a7b2ae');
		c.fillStyle = '#1f4a34';
		c.fillRect(3.4, -0.55, 1.6, 1.1);
		c.beginPath();
		c.arc(-3.7, 0, 0.95, 0, TAU);
		stroke(c, '#a7b2ae', 0.6);
	} else if (kind === 'PINKY') {
		// a crew badge on its lanyard
		c.rotate(0.18);
		c.beginPath();
		c.moveTo(-1.6, -3);
		c.quadraticCurveTo(0, -7, 1.6, -3);
		stroke(c, '#ec95d2', 0.7);
		rrect(c, -2.3, -3, 4.6, 5.8, 0.6);
		c.fillStyle = '#eef2f2';
		c.fill();
		stroke(c, '#2a3230', 0.5);
		c.fillStyle = '#ec95d2';
		c.fillRect(-2.3, -3, 4.6, 1.3);
		ellipse(c, -0.9, 0.2, 0.9, 0.9, '#8fa19b');
		c.fillStyle = '#4a5552';
		c.fillRect(0.4, -0.4, 1.4, 0.35);
		c.fillRect(0.4, 0.4, 1.1, 0.35);
		c.fillRect(-1.8, 1.6, 3.4, 0.35);
	} else if (kind === 'INKY') {
		// somebody's eye, looking about on its own
		ellipse(c, 0, 0, 2.8, 2.8, '#f3efe4');
		stroke(c, '#5a4a40', 0.5);
		for (const a of [0.4, 2.3, 4.1]) {
			c.beginPath();
			c.moveTo(Math.cos(a) * 2.7, Math.sin(a) * 2.7);
			c.quadraticCurveTo(Math.cos(a + 0.3) * 1.9, Math.sin(a + 0.3) * 1.9, Math.cos(a) * 1.4, Math.sin(a) * 1.4);
			stroke(c, 'rgba(200, 50, 60, 0.75)', 0.35);
		}
		const ix = Math.cos(t * 0.7) * 1.0;
		const iy = Math.sin(t * 0.9) * 0.8;
		ellipse(c, ix, iy, 1.3, 1.3, '#3fb7d0');
		ellipse(c, ix, iy, 0.6, 0.6, INK);
		ellipse(c, ix - 0.5, iy - 0.5, 0.3, 0.3, '#ffffff');
	} else {
		// a hard hat
		c.rotate(-0.25);
		c.beginPath();
		c.arc(0, 0.7, 2.9, Math.PI, TAU);
		c.closePath();
		c.fillStyle = '#f3b23a';
		c.fill();
		stroke(c, '#5a3a10', 0.5);
		rrect(c, -4.1, 0.4, 8.2, 1.2, 0.5);
		c.fillStyle = '#e09a28';
		c.fill();
		stroke(c, '#5a3a10', 0.5);
		c.beginPath();
		c.moveTo(0, -2.1);
		c.lineTo(0, 0.4);
		stroke(c, '#ffd27a', 0.7);
	}
}

function bodyA(c: Ctx, kind: GhostKind, st: CandState, o: PretenderOpts, scared: boolean, white: boolean): void {
	const ph = PHASE[kind];
	const tell = st === 'tell';
	traceBody(c);
	stroke(c, INK, 3.2);
	const g = c.createRadialGradient(-2.5, -1.5, 0.5, 0, 1.6, 10.5);
	g.addColorStop(0, scared ? (white ? '#ffffff' : '#8d9fff') : '#7fc79a');
	g.addColorStop(0.55, scared ? (white ? '#e8eeff' : '#4f68ff') : '#3a8058');
	g.addColorStop(1, scared ? (white ? '#c3cfea' : '#2a3cb8') : '#1c4a33');
	c.fillStyle = g;
	traceBody(c);
	c.fill();
	c.save();
	traceBody(c);
	c.clip();
	if (!scared) {
		const p = tell ? 0.7 + 0.3 * Math.sin((o.time / 1.3) * TAU) : 0.8;
		glow(c, 1.2, 4.8, 7, `rgba(${KIND_RGB[kind]}, ${0.75 * p})`, `rgba(${KIND_RGB[kind]}, ${0.28 * p})`);
	}
	c.save();
	const jit = tell ? Math.sin(o.time * 31) * 0.35 : 0;
	c.translate(1.2 + Math.sin(o.time * 1.1 + ph) * 0.5 + jit, 4.9 + Math.sin(o.time * 1.7 + ph) * 0.4);
	c.rotate(Math.sin(o.time * 0.9 + ph) * 0.22);
	c.scale(0.95, 0.95);
	swallowed(c, kind, o.time);
	c.restore();
	// the murk over it: it is inside
	traceBody(c);
	c.fillStyle = scared ? 'rgba(40, 60, 200, 0.28)' : `rgba(30, 80, 55, ${tell ? 0.45 : 0.3})`;
	c.fill();
	for (let i = 0; i < 5; i++) {
		const u = (o.time * (0.3 + i * 0.04) + i / 5 + ph) % 1;
		c.beginPath();
		c.arc(-6 + i * 3 + Math.sin(u * 6 + i) * 0.8, 9.5 - u * 17, 0.55 + (i % 2) * 0.35, 0, TAU);
		stroke(c, `rgba(190, 242, 188, ${0.7 * Math.sin(u * Math.PI)})`, 0.45);
	}
	c.restore();
	// the glassy rim
	c.beginPath();
	c.ellipse(0, 1.6, 8.7, 7.9, 0, Math.PI * 1.08, Math.PI * 1.52);
	stroke(c, 'rgba(220, 244, 236, 0.6)', 1.1);
	ellipse(c, -5.6, -3.6, 1.0, 0.7, 'rgba(240, 255, 248, 0.75)');
	if (scared) {
		frightFace(c, o, white, -1.6, 3.8);
		return;
	}
	for (const side of [-1, 1]) {
		const r = side < 0 ? 2.35 : 2.0;
		const ex = side * 3.9 + o.lookX * 1.7;
		const ey = -2.4 + o.lookY * 1.5 + Math.sin(o.time * 1.3 + side + ph) * 0.25;
		glow(c, ex, ey, r * 2, tell ? 'rgba(255, 214, 120, 0.8)' : 'rgba(220, 255, 225, 0.5)', 'rgba(140, 220, 160, 0.15)');
		ellipse(c, ex, ey, r, r * 1.12, tell ? '#ffc847' : '#e6fff0', 0.9);
		ellipse(c, ex + o.lookX * 0.75, ey + o.lookY * 0.75, tell ? 0.45 : 0.8, 1.2, INK);
		ellipse(c, ex - r * 0.35, ey - r * 0.4, 0.4, 0.4, '#ffffff');
	}
	if (tell) {
		ellipse(c, o.lookX * 1.2, 2.6 + o.lookY, 1.3, 1.7, '#06120c', 0.7);
	} else {
		c.beginPath();
		c.moveTo(-1.8 + o.lookX, 2.6 + o.lookY);
		c.quadraticCurveTo(-0.6 + o.lookX, 3.4 + o.lookY, 0.4 + o.lookX, 2.7 + o.lookY);
		c.quadraticCurveTo(1.2 + o.lookX, 2.2 + o.lookY, 1.9 + o.lookX, 2.9 + o.lookY);
		stroke(c, '#06120c', 0.8);
	}
}

// --------------------------------------------------------------------------- B the hatchling

function headB(c: Ctx, kind: GhostKind, o: PretenderOpts, memb: string, behind: boolean): void {
	if (behind && kind === 'CLYDE') {
		// a frill crest
		for (let i = -2; i <= 2; i++) {
			ellipse(c, i * 2.6, -7.2 - (2 - Math.abs(i)) * 0.5, 1.8, 2.2, memb, 1.0);
		}
	}
	if (!behind && kind === 'INKY') {
		// two sprouts with glowing tips
		for (const side of [-1, 1]) {
			const sway = Math.sin(o.time * 2.2 + side) * 0.8;
			c.beginPath();
			c.moveTo(side * 3, -6.6);
			c.quadraticCurveTo(side * 3.6, -9.5, side * 4.8 + sway, -11.2);
			stroke(c, INK, 2.0);
			stroke(c, memb, 0.9);
			glow(c, side * 4.8 + sway, -11.2, 2.6, `rgba(${KIND_RGB.INKY}, 0.9)`, `rgba(${KIND_RGB.INKY}, 0.3)`);
			ellipse(c, side * 4.8 + sway, -11.2, 0.9, 0.9, '#e8fbff', 0.6);
		}
	}
}

function eyeB(c: Ctx, x: number, y: number, rx: number, ry: number, o: PretenderOpts, tell: boolean): void {
	ellipse(c, x, y, rx, ry, '#f4f8f2', 1.0);
	const px = x + o.lookX * rx * 0.42;
	const py = y + o.lookY * ry * 0.4;
	ellipse(c, px, py, rx * 0.62, ry * 0.66, tell ? '#ffc847' : '#0b0f0e');
	if (tell) ellipse(c, px, py, rx * 0.18, ry * 0.5, INK);
	ellipse(c, px - rx * 0.25, py - ry * 0.3, rx * 0.2, rx * 0.2, '#ffffff');
}

function bodyB(c: Ctx, kind: GhostKind, st: CandState, o: PretenderOpts, scared: boolean, white: boolean): void {
	const ph = PHASE[kind];
	const tell = st === 'tell';
	const memb = scared ? (white ? '#ffffff' : '#8d9fff') : '#cfe5cf';
	headB(c, kind, o, memb, true);
	traceBody(c);
	stroke(c, INK, 3.2);
	const g = c.createRadialGradient(-2, -2, 0.5, 0, 1.6, 10.5);
	g.addColorStop(0, scared ? (white ? '#ffffff' : '#b3c0ff') : '#eef8ec');
	g.addColorStop(0.6, memb);
	g.addColorStop(1, scared ? (white ? '#c3cfea' : '#4f68ff') : '#8fb59a');
	c.fillStyle = g;
	traceBody(c);
	c.fill();
	c.save();
	traceBody(c);
	c.clip();
	// its colour, beating as a heart, and the curled embryo
	const b = beat(o.time + ph) * (tell ? 1.4 : 1);
	if (!scared) glow(c, 0.6, 4.6, 6.4, `rgba(${KIND_RGB[kind]}, ${0.5 * b})`, `rgba(${KIND_RGB[kind]}, ${0.2 * b})`);
	c.save();
	c.translate(0.8, 4.6);
	c.rotate(Math.sin(o.time * 0.6 + ph) * 0.3 + (tell ? Math.sin(o.time * 24) * 0.12 : 0));
	c.beginPath();
	c.arc(0, 0, 2.4, -0.5, Math.PI * 1.45);
	c.globalAlpha *= scared ? 0.45 : 0.85;
	stroke(c, '#0b1410', 2.3);
	const hx = Math.cos(-0.5) * 2.4;
	const hy = Math.sin(-0.5) * 2.4;
	ellipse(c, hx, hy, 1.55, 1.4, '#0b1410');
	for (let i = 0; i < 3; i++) {
		c.beginPath();
		c.moveTo(hx + 0.8, hy - 0.4 + i * 0.4);
		c.quadraticCurveTo(hx + 2, hy - 1.2 + i, hx + 2.6 + Math.sin(o.time * 2 + i) * 0.4, hy - 0.4 + i * 0.9);
		stroke(c, '#0b1410', 0.45);
	}
	c.restore();
	// the membrane's cells
	for (let i = 0; i < 6; i++) {
		c.beginPath();
		c.arc(-6 + (i % 3) * 6 + (i > 2 ? 3 : 0), -3 + Math.floor(i / 3) * 9, 1.6, 0, TAU);
		stroke(c, 'rgba(255, 255, 255, 0.18)', 0.5);
	}
	// the strap of its tag
	c.beginPath();
	c.moveTo(-10, 6.2);
	c.quadraticCurveTo(0, 8.2, 10, 6.4);
	stroke(c, 'rgba(70, 52, 36, 0.85)', 0.9);
	c.restore();
	headB(c, kind, o, memb, false);
	c.beginPath();
	c.ellipse(0, 1.6, 8.7, 7.9, 0, Math.PI * 1.08, Math.PI * 1.52);
	stroke(c, 'rgba(255, 255, 255, 0.7)', 1.1);
	// the specimen tag, swinging on the side away from the heading
	const s = o.faceX > 0.1 ? -1 : 1;
	c.save();
	c.translate(s * 6.4, 7.4);
	c.rotate(Math.sin(o.time * 3 + ph) * 0.18 + s * 0.15);
	rrect(c, -1.9, 0, 3.8, 2.6, 0.4);
	c.fillStyle = '#d9c99a';
	c.fill();
	stroke(c, '#5a4a30', 0.5);
	ellipse(c, -1.0, 1.3, 0.45, 0.45, scared ? '#4f68ff' : `rgb(${KIND_RGB[kind]})`);
	c.fillStyle = '#6a5a40';
	c.fillRect(-0.3, 0.7, 1.7, 0.3);
	c.fillRect(-0.3, 1.5, 1.3, 0.3);
	c.restore();
	if (scared) {
		frightFace(c, o, white, -1.4, 3.8);
		return;
	}
	const ox = o.lookX * 1.4;
	const oy = o.lookY * 1.2;
	if (kind === 'BLINKY') eyeB(c, ox, -1.4 + oy, 3.6, 4.0, o, tell);
	else {
		eyeB(c, -3.7 + ox, -1.2 + oy, 2.6, 3.0, o, tell);
		eyeB(c, 3.7 + ox, -1.2 + oy, 2.6, 3.0, o, tell);
		if (kind === 'PINKY') eyeB(c, ox * 0.8, -5.4 + oy * 0.8, 1.4, 1.5, o, tell);
	}
	c.beginPath();
	c.moveTo(-1 + ox, 3.6 + oy);
	c.quadraticCurveTo(ox, tell ? 5 : 4.3, 1 + ox, 3.6 + oy);
	stroke(c, '#2a3a2e', 0.8);
}

// -------------------------------------------------------------------------- C the jar runner

const traceJar = (c: Ctx) => rrect(c, -8.4, -6.6, 16.8, 16.4, 4.4);

function bodyC(c: Ctx, kind: GhostKind, st: CandState, o: PretenderOpts, scared: boolean, white: boolean): void {
	const ph = PHASE[kind];
	const tell = st === 'tell';
	// tendrils out of the popped lid (behind it)
	for (let i = 0; i < 4; i++) {
		const w = Math.sin(o.time * (tell ? 7 : 2.4) + i * 1.7 + ph);
		const x0 = 1 + i * 1.2;
		c.beginPath();
		c.moveTo(x0, -8);
		c.quadraticCurveTo(x0 + 1.5 + w * 1.2, -10.5 - i * 0.4, x0 + 2.8 + w * 2.2, -11.6 - (i % 2) * 1.3);
		stroke(c, INK, 1.9 - i * 0.25);
		stroke(c, scared ? '#3346d0' : '#0b1410', 1.0 - i * 0.15);
	}
	traceJar(c);
	stroke(c, INK, 3.2);
	traceJar(c);
	c.fillStyle = '#0b1410';
	c.fill();
	c.save();
	traceJar(c);
	c.clip();
	// the murk sloshing: it tilts against the heading and with the step
	const tilt = -o.faceX * 0.14 - Math.sin(o.step) * 0.08;
	const level = -1.6 + Math.sin(o.time * 2 + ph) * 0.35;
	c.beginPath();
	c.moveTo(-9, level + tilt * -9);
	for (let x = -9; x <= 9; x += 1.5) c.lineTo(x, level + tilt * x + Math.sin(x * 0.9 + o.time * 3) * 0.3);
	c.lineTo(9, 11);
	c.lineTo(-9, 11);
	c.closePath();
	c.fillStyle = scared ? (white ? '#e8eeff' : '#3346d0') : '#1f4a34';
	c.fill();
	c.beginPath();
	for (let x = -9; x <= 9; x += 1.5) {
		const y = level + tilt * x + Math.sin(x * 0.9 + o.time * 3) * 0.3;
		if (x === -9) c.moveTo(x, y);
		else c.lineTo(x, y);
	}
	stroke(c, scared ? 'rgba(200, 210, 255, 0.8)' : 'rgba(143, 214, 160, 0.75)', 0.7);
	// the thing inside, peering out
	ellipse(c, o.faceX * 0.8, 3.4, 6.2, 5.6, scared ? '#1a2470' : '#050b08');
	for (let i = 0; i < 4; i++) {
		const u = (o.time * (tell ? 1.6 : 0.5) + i / 4 + ph) % 1;
		c.beginPath();
		c.arc(-5 + i * 3.2, 8.8 - u * 10, 0.5 + (i % 2) * 0.3, 0, TAU);
		stroke(c, `rgba(190, 242, 188, ${0.7 * Math.sin(u * Math.PI)})`, 0.45);
	}
	if (!scared) {
		for (const side of [-1, 1]) {
			const ex = side * 2.7 + o.lookX * 1.5;
			const ey = 1.6 + o.lookY * 1.2;
			const rgb = tell ? '255, 200, 71' : KIND_RGB[kind];
			glow(c, ex, ey, 3.6, `rgba(${rgb}, 0.95)`, `rgba(${rgb}, 0.35)`);
			c.save();
			c.translate(ex, ey);
			c.rotate(side * -0.35);
			ellipse(c, 0, 0, tell ? 1.9 : 1.6, tell ? 1.2 : 0.95, `rgb(${rgb})`);
			ellipse(c, o.lookX * 0.4, o.lookY * 0.3, 0.35, 0.75, INK);
			c.restore();
		}
	}
	c.restore();
	// the glass: a tint, the highlights, the crack
	traceJar(c);
	c.fillStyle = 'rgba(190, 240, 220, 0.07)';
	c.fill();
	c.beginPath();
	c.moveTo(-6.2, -3.6);
	c.lineTo(-6.2, 5.2);
	stroke(c, 'rgba(220, 244, 236, 0.6)', 1.2);
	ellipse(c, -4.6, -4.4, 0.8, 0.5, 'rgba(240, 255, 248, 0.8)');
	c.beginPath();
	c.moveTo(4.2, -6.6);
	c.lineTo(5.4, -4.2);
	c.lineTo(4.4, -2.6);
	c.lineTo(6.2, -0.8);
	stroke(c, 'rgba(230, 250, 244, 0.7)', 0.5);
	// the label
	c.save();
	c.translate(0, 5.6);
	c.rotate(-0.04);
	c.fillStyle = 'rgba(217, 212, 192, 0.92)';
	c.fillRect(-4.4, -1.6, 8.8, 3.4);
	c.fillStyle = scared ? '#4f68ff' : `rgb(${KIND_RGB[kind]})`;
	c.fillRect(-4.4, -1.6, 1.4, 3.4);
	c.fillStyle = '#4a4a3c';
	c.fillRect(-2.4, -0.9, 5.4, 0.45);
	c.fillRect(-2.4, 0.2, 3.6, 0.45);
	c.restore();
	// the lid, popped a little
	c.save();
	c.translate(6.4, -6.6);
	c.rotate(-0.12 - (tell ? Math.abs(Math.sin(o.time * 12)) * 0.12 : 0));
	c.translate(-6.4, 6.6);
	const lg = c.createLinearGradient(0, -9.6, 0, -6.6);
	lg.addColorStop(0, '#8d9a96');
	lg.addColorStop(1, '#3a4442');
	rrect(c, -6.6, -9.6, 13.2, 3.0, 0.8);
	c.fillStyle = lg;
	c.fill();
	stroke(c, INK, 1.3);
	for (const bx of [-4.6, 0, 4.6]) ellipse(c, bx, -8.1, 0.45, 0.45, '#cfd8d4');
	c.restore();
	if (scared) frightFace(c, o, white, 1.4, 2.9);
}

// ---------------------------------------------------------------------------------- the walker

function feetColor(v: Look, scared: boolean, white: boolean): string {
	if (scared) return white ? '#c3cfea' : '#3346d0';
	return v === 'a' ? '#245c3e' : v === 'b' ? '#9fbf9f' : '#0b1410';
}

function walker(c: Ctx, kind: GhostKind, v: Look, st: CandState, o: PretenderOpts, unit: number, k: number): void {
	const phase = PHASE[kind];
	c.scale(unit * SCALE * CALM, unit * SCALE * CALM);
	const scared = st === 'fright';
	const white = scared && Boolean(o.white);
	if (scared && !o.flashing) c.translate(Math.sin(o.time * 38 + phase) * 0.45, 0);
	const step = o.step * (1 - k);
	const lift = footLift(step);
	c.translate(0, -Math.abs(Math.sin(step)) * 0.7 * (1 - k));
	c.translate(0, 10);
	c.rotate((Math.sin(step) * 0.08 + o.lookX * 0.1) * (1 - k));
	c.translate(0, -10);
	for (const [side, up] of [
		[-1, lift.left],
		[1, lift.right]
	] as const) {
		c.beginPath();
		c.ellipse(side * 4.2 * (1 - 0.3 * k), 11 - up - 3.4 * k, 3.3, 2.5 * (1 - 0.5 * k), 0, 0, TAU);
		c.fillStyle = feetColor(v, scared, white);
		c.fill();
		stroke(c, INK, 1.5);
	}
	const squash = Math.sin(o.time * 5 + phase);
	c.translate(0, 10);
	c.scale(1 - 0.04 * squash, 1 + 0.05 * squash);
	c.translate(0, -10);
	if (v === 'a') bodyA(c, kind, st, o, scared, white);
	else if (v === 'b') bodyB(c, kind, st, o, scared, white);
	else bodyC(c, kind, st, o, scared, white);
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
	halo(c, x, y, tile, st === 'fright' ? FRIGHT_RGB : v === 'a' ? '143, 214, 160' : KIND_RGB[kind], v === 'a' ? 0.4 : 0.32);
	c.save();
	c.translate(x, y);
	walker(c, kind, v, st, o, unit, 0);
	c.restore();
}
