// Candidates for the station (throwaway, the owner picks; then the pick moves into the game):
// - the quarantine ring's warning: the whole contour shown at once while the fencers walk, the
//   real filament then growing along it (`drawRingGuide`, under the game's `drawRing`);
// - three looks of the enraged Pretender (A the snap, B the hive's, C the overheat);
// - three lures (A a green signal flare, B a burst pheromone capsule, C the hero's hologram).
import type { GhostKind } from '../../../src/games/pacman/logic/actors/GhostModel';
import type { QuarantineRing } from '../../../src/games/pacman/logic/station/StationSquad';
import { footLift } from '../../../src/games/pacman/render/actors/cuteGhost';
import {
	INK,
	IVORY,
	PHASE,
	SCALE,
	ellipse,
	glow,
	line,
	paintMask,
	paintTrueFace,
	traceBody,
	type Pal,
	type PretenderOpts
} from '../../../src/games/pacman/render/station/pretender';

type Ctx = CanvasRenderingContext2D;
export type Variant = 'a' | 'b' | 'c';

const TAU = Math.PI * 2;
const hash = (a: number, b: number) => {
	const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
	return s - Math.floor(s);
};
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

// ------------------------------------------------------------------ the ring's warning contour

/** The game's filament radius (`quarantineRing`'s rimAt), so the filament lands on the guide. */
const rimAt = (R: number, S: number, a: number, t: number) =>
	R + Math.sin(a * 9 + t * 0.8) * S * 0.07 + Math.sin(a * 23 - t * 1.3) * S * 0.035;

/**
 * The warning: the whole contour of the coming ring (a dashed amber line on a soft glow, the zone
 * faintly tinted inside, a slow pulse), dashed bars where its seals will grow. `k` its strength,
 * `charge` the projectors' charge (the guide fades as the real filament grows along it).
 */
export function drawRingGuide(
	c: Ctx,
	L: { tileSize: number; offsetX: number; offsetY: number },
	ring: QuarantineRing,
	k: number,
	charge: number,
	t: number
): void {
	if (k <= 0) return;
	const S = L.tileSize;
	const cx = L.offsetX + ring.cx * S;
	const cy = L.offsetY + ring.cy * S;
	const R = ring.r * S;
	const pulse = 0.5 + 0.5 * Math.sin(t * TAU * 0.9);
	const fade = k * (1 - 0.7 * charge);
	c.save();
	// the zone: a faint sick tint toward the rim
	const g = c.createRadialGradient(cx, cy, R * 0.5, cx, cy, R);
	g.addColorStop(0, 'rgba(118, 30, 44, 0)');
	g.addColorStop(1, `rgba(150, 40, 50, ${(0.1 + 0.06 * pulse) * fade})`);
	c.fillStyle = g;
	c.beginPath();
	c.arc(cx, cy, R, 0, TAU);
	c.fill();
	// the contour along the filament's own line
	const n = Math.ceil((TAU * R) / (S * 0.2));
	c.beginPath();
	for (let i = 0; i <= n; i++) {
		const a = (i / n) * TAU;
		const r = rimAt(R, S, a, t);
		if (i === 0) c.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
		else c.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
	}
	c.lineJoin = 'round';
	c.strokeStyle = `rgba(255, 150, 80, ${(0.1 + 0.1 * pulse) * fade})`;
	c.lineWidth = S * 0.34;
	c.stroke();
	c.setLineDash([S * 0.34, S * 0.22]);
	c.lineDashOffset = -t * S * 0.5;
	c.strokeStyle = `rgba(255, 214, 160, ${(0.5 + 0.35 * pulse) * fade})`;
	c.lineWidth = Math.max(1.5, S * 0.07);
	c.stroke();
	c.setLineDash([]);
	// the seals to come: a dashed bar across each corridor's throat
	for (const s of ring.seals) {
		c.save();
		c.translate(L.offsetX + (s.x + 0.5) * S, L.offsetY + (s.y + 0.5) * S);
		c.rotate(Math.atan2(s.dy, s.dx) - Math.PI / 2);
		const a = (0.35 + 0.45 * pulse) * k * (1 - charge);
		c.fillStyle = `rgba(255, 120, 90, ${a * 0.35})`;
		c.fillRect(-S * 0.5, -S * 0.12, S, S * 0.24);
		c.setLineDash([S * 0.12, S * 0.08]);
		c.strokeStyle = `rgba(255, 214, 160, ${a})`;
		c.lineWidth = Math.max(1, S * 0.045);
		c.strokeRect(-S * 0.5, -S * 0.12, S, S * 0.24);
		c.restore();
	}
	c.restore();
}

// ------------------------------------------------------------------------------ the rage looks

const PAL: Record<Variant, Pal> = {
	a: { b: '#e8453f', s: '#8e1220' },
	b: { b: '#7d2238', s: '#3d0b1a' },
	c: { b: '#ff5a3a', s: '#9c1420' }
};
const HALO: Record<Variant, string> = {
	a: '255, 84, 60',
	b: '255, 130, 90',
	c: '255, 170, 80'
};

function halo(c: Ctx, x: number, y: number, tile: number, rgb: string, a: number): void {
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

/** Where "behind" is: against the heading. */
function back(o: PretenderOpts): [number, number] {
	const d = Math.hypot(o.lookX, o.lookY);
	return d > 0.01 ? [-o.lookX / d, -o.lookY / d] : [0, 1];
}

/** A: the snap. The mask torn off and hanging by one strap at its side, glowing coral cracks
 *  through the skin, steam out of the head. */
function bodyA(c: Ctx, pal: Pal, o: PretenderOpts, throb: number): void {
	const lx = o.faceX;
	traceBody(c);
	c.lineJoin = 'round';
	c.lineWidth = 3.2;
	c.strokeStyle = INK;
	c.stroke();
	c.fillStyle = pal.b;
	c.fill();
	c.save();
	traceBody(c);
	c.clip();
	ellipse(c, 3.4, 12.4, 14, 7.4, pal.s);
	// the cracks, glowing with the throb
	const cracks: ReadonlyArray<ReadonlyArray<[number, number]>> = [
		[
			[-9, -2],
			[-6, -1],
			[-5, 2],
			[-7.5, 5]
		],
		[
			[2, -7.6],
			[1, -5],
			[3, -3.6]
		],
		[
			[9.6, 4],
			[6.6, 5.2],
			[6, 8],
			[4, 9.6]
		],
		[
			[-3, 10.6],
			[-2.4, 8.4],
			[-4.2, 7.4]
		]
	];
	const p = 0.55 + 0.45 * throb;
	for (const cr of cracks) {
		c.beginPath();
		cr.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
		c.lineCap = 'round';
		c.lineJoin = 'round';
		c.strokeStyle = `rgba(255, 110, 50, ${0.55 * p})`;
		c.lineWidth = 2.6;
		c.stroke();
		c.strokeStyle = `rgba(255, 226, 160, ${0.95 * p})`;
		c.lineWidth = 0.8;
		c.stroke();
	}
	c.restore();
	paintTrueFace(c, pal, o);
	// the mask hangs off the side away from the heading, swinging on one strap
	const s = lx > 0.1 ? -1 : 1;
	const swing = Math.sin(o.time * 5.5) * 0.28;
	const mx = s * 10.2;
	const my = 6.8;
	line(c, s * 6.5, -5.2, mx - s * 0.6, my - 3.2, 'rgba(36, 20, 24, 0.85)', 1.1);
	c.save();
	c.translate(mx, my);
	c.rotate(s * 0.95 + swing);
	c.scale(0.55, 0.55);
	paintMask(c, 'rage', false, o);
	c.restore();
	// steam out of the head
	for (let i = 0; i < 3; i++) {
		const u = (o.time * 0.9 + i / 3) % 1;
		const x = (i - 1) * 4 + Math.sin(u * 6 + i) * 1.5;
		const y = -8 - u * 9;
		ellipse(c, x, y, 1.4 + u * 2.6, 1.2 + u * 2.2, `rgba(236, 226, 220, ${0.42 * (1 - u)})`);
	}
}

/** The hive's maw: a heartbeat pulse (two thumps). */
const beat = (t: number) => {
	const u = t % 1.2;
	return Math.exp(-u * u * 120) + 0.6 * Math.exp(-(u - 0.24) * (u - 0.24) * 120);
};

/** B: the hive took it. Dark wine flesh, amber veins beating, four gold eyes, strands in the maw,
 *  the mask half grown over on its head, tendrils trailing. */
function tendrilsB(c: Ctx, o: PretenderOpts): void {
	const [bx, by] = back(o);
	const px = -by;
	const py = bx;
	for (let i = 0; i < 3; i++) {
		const off = (i - 1) * 3.4;
		const w = Math.sin(o.time * 6 + i * 2.1);
		const x0 = bx * 7 + px * off;
		const y0 = 3 + by * 7 + py * off;
		const x1 = x0 + bx * 6 + px * w * 2.5;
		const y1 = y0 + by * 6 + py * w * 2.5;
		const x2 = x0 + bx * 12 + px * (off * 0.4 - w * 2);
		const y2 = y0 + by * 12 + py * (off * 0.4 - w * 2);
		c.beginPath();
		c.moveTo(x0, y0);
		c.quadraticCurveTo(x1, y1, x2, y2);
		c.lineCap = 'round';
		c.strokeStyle = INK;
		c.lineWidth = 3.6 - Math.abs(i - 1) * 0.6;
		c.stroke();
		c.strokeStyle = '#5a1428';
		c.lineWidth = 2.2 - Math.abs(i - 1) * 0.5;
		c.stroke();
		ellipse(c, x2, y2, 0.9, 0.9, 'rgba(255, 190, 110, 0.95)');
	}
}

function bodyB(c: Ctx, pal: Pal, o: PretenderOpts): void {
	const b = beat(o.time);
	traceBody(c);
	c.lineJoin = 'round';
	c.lineWidth = 3.2;
	c.strokeStyle = INK;
	c.stroke();
	c.fillStyle = pal.b;
	c.fill();
	c.save();
	traceBody(c);
	c.clip();
	ellipse(c, 3.4, 12.4, 14, 7.4, pal.s);
	// the flesh's blotches and the veins, beating
	ellipse(c, -5, 6, 3.2, 2.2, 'rgba(40, 6, 16, 0.35)');
	ellipse(c, 6.5, -3, 2.4, 1.8, 'rgba(40, 6, 16, 0.3)');
	const veins: ReadonlyArray<ReadonlyArray<[number, number]>> = [
		[
			[-10, 0],
			[-7, -1.5],
			[-5.5, -4.5],
			[-3, -6.5]
		],
		[
			[-7, -1.5],
			[-6.4, 2],
			[-8, 5]
		],
		[
			[10, 2],
			[7.4, 1],
			[6.8, -3],
			[4, -6.8]
		],
		[
			[7.4, 1],
			[7.6, 5.4],
			[5, 9]
		],
		[
			[-2, 11],
			[-1, 8.8],
			[1.5, 9.4]
		]
	];
	for (const v of veins) {
		c.beginPath();
		v.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
		c.lineCap = 'round';
		c.lineJoin = 'round';
		c.strokeStyle = `rgba(255, 150, 70, ${0.3 + 0.5 * b})`;
		c.lineWidth = 2.0;
		c.stroke();
		c.strokeStyle = `rgba(255, 214, 150, ${0.35 + 0.55 * b})`;
		c.lineWidth = 0.7;
		c.stroke();
	}
	c.restore();
	// the mask, half grown over, high on the head
	c.save();
	c.translate(-o.faceX * 2.4, -7.6);
	c.rotate(-0.2 - o.faceX * 0.15);
	c.scale(0.5, 0.4);
	paintMask(c, 'rage', false, o);
	c.restore();
	c.save();
	c.translate(-o.faceX * 2.4, -7.6);
	ellipse(c, 2.2, -0.4, 2.6, 1.8, 'rgba(110, 28, 50, 0.85)');
	line(c, -3, -1.6, 2, 1.2, `rgba(255, 170, 90, ${0.5 + 0.4 * b})`, 0.6);
	line(c, 3.6, -1.8, 0.6, 1.6, `rgba(255, 170, 90, ${0.5 + 0.4 * b})`, 0.6);
	c.restore();
	paintTrueFace(c, pal, o);
	// strands of flesh across the maw and two more eyes, blinking out of step
	c.save();
	c.translate(o.faceX * 1.6, o.faceY * 1.3);
	for (const x of [-3.4, 1.2, 4.4]) line(c, x, 3.4, x + 0.4, 7.4, 'rgba(240, 190, 180, 0.75)', 0.45);
	for (const [ex, ey, r, ph] of [
		[-7.2, -5.2, 1.45, 0.3],
		[6.6, -6.2, 1.2, 1.7]
	] as const) {
		const open = clamp(Math.sin(o.time * 1.7 + ph) * 3 + 2.4, 0, 1);
		glow(c, ex, ey, r * 2.6, `rgba(255, 214, 110, ${0.6 * open})`, `rgba(255, 70, 40, ${0.3 * open})`);
		ellipse(c, ex, ey, r * 1.15, r * open + 0.1, '#ffd04a', 0.8);
		ellipse(c, ex + o.lookX * 0.4, ey + o.lookY * 0.3, 0.35, r * 0.75 * open + 0.05, INK);
	}
	c.restore();
}

/** C: the overheat. White-hot inside, the mask shattered into shards circling the head, hollow
 *  glowing sockets, a jagged grin across the whole body, afterimages behind it. */
function shardsC(c: Ctx, o: PretenderOpts, front: boolean): void {
	for (let i = 0; i < 5; i++) {
		const a = o.time * 1.6 + (i * TAU) / 5;
		if (Math.sin(a) >= 0 !== front) continue;
		const r = 12.5 + Math.sin(o.time * 3 + i) * 1.2;
		const x = Math.cos(a) * r;
		const y = -3 + Math.sin(a) * r * 0.45;
		c.save();
		c.translate(x, y);
		c.rotate(o.time * 3 + i * 1.3);
		const z = 1.8 + hash(i, 1) * 1.2;
		c.beginPath();
		c.moveTo(-z, -z * 0.6);
		c.lineTo(z * 0.9, -z * 0.8);
		c.lineTo(z * 0.3, z);
		c.closePath();
		c.fillStyle = IVORY;
		c.fill();
		c.strokeStyle = INK;
		c.lineWidth = 0.7;
		c.stroke();
		c.restore();
	}
}

function bodyC(c: Ctx, o: PretenderOpts, throb: number): void {
	traceBody(c);
	c.lineJoin = 'round';
	c.lineWidth = 3.2;
	c.strokeStyle = INK;
	c.stroke();
	const g = c.createRadialGradient(0, 2.4, 0.5, 0, 1.6, 10.5);
	g.addColorStop(0, `rgba(255, 242, 200, 1)`);
	g.addColorStop(0.35 + 0.1 * throb, '#ff9a3c');
	g.addColorStop(1, '#c41a26');
	c.fillStyle = g;
	c.fill();
	c.save();
	c.translate(o.faceX * 1.4, o.faceY * 1.2);
	// the hollow sockets, white-hot, slanted
	for (const side of [-1, 1]) {
		c.save();
		c.translate(o.lookX * 0.9, o.lookY * 0.8);
		glow(c, side * 4.2, -1.6, 5.2, 'rgba(255, 250, 220, 0.85)', 'rgba(255, 150, 60, 0.45)');
		c.beginPath();
		c.moveTo(side * 1.2, -1.2);
		c.lineTo(side * 7.4, -4.6);
		c.lineTo(side * 6.6, 0.2);
		c.lineTo(side * 1.8, 0.6);
		c.closePath();
		c.fillStyle = '#fffbe8';
		c.fill();
		c.strokeStyle = INK;
		c.lineWidth = 1.2;
		c.stroke();
		ellipse(c, side * 4.4 + o.lookX * 1.2, -1.2 + o.lookY * 0.6, 0.5, 1.4, '#7a0c14');
		c.restore();
	}
	c.restore();
	// the grin, across the whole body
	const chomp = 0.5 + 0.5 * Math.sin(o.time * 10);
	c.save();
	traceBody(c);
	c.clip();
	c.translate(o.faceX * 1.2, o.faceY * 1.0);
	const trace = () => {
		c.beginPath();
		c.moveTo(-11, 2.6);
		c.quadraticCurveTo(0, 4.6, 11, 2.6);
		c.quadraticCurveTo(0, 10 + 2.2 * chomp, -11, 2.6);
		c.closePath();
	};
	trace();
	c.fillStyle = '#2a0508';
	c.fill();
	c.save();
	trace();
	c.clip();
	glow(c, 0, 7, 6.5, 'rgba(255, 200, 90, 0.9)', 'rgba(255, 90, 40, 0.5)');
	c.fillStyle = IVORY;
	c.strokeStyle = INK;
	c.lineWidth = 0.5;
	for (let x = -9.5; x <= 9.6; x += 1.9) {
		const y = 2.6 + (1 - (x / 11) ** 2) * 1.9;
		c.beginPath();
		c.moveTo(x - 0.95, y - 0.4);
		c.lineTo(x + 0.1, y + 2.1 + hash(x, 3) * 0.8);
		c.lineTo(x + 0.95, y - 0.4);
		c.fill();
		c.stroke();
	}
	c.restore();
	trace();
	c.strokeStyle = INK;
	c.lineWidth = 1.3;
	c.stroke();
	c.restore();
	// embers off the top
	for (let i = 0; i < 3; i++) {
		const u = (o.time * 1.3 + i / 3) % 1;
		ellipse(
			c,
			(hash(i, 7) - 0.5) * 12 + Math.sin(u * 5 + i) * 1.2,
			-7 - u * 9,
			0.7 * (1 - u) + 0.2,
			0.7 * (1 - u) + 0.2,
			`rgba(255, ${190 - u * 90}, 80, ${1 - u})`
		);
	}
}

/** One enraged Pretender of variant `v` centred at (x, y), `tile` the tile's size in px. */
export function drawRageCandidate(
	c: Ctx,
	x: number,
	y: number,
	tile: number,
	kind: GhostKind,
	v: Variant,
	o: PretenderOpts
): void {
	const unit = (tile / 25) * 0.78;
	const phase = PHASE[kind];
	const pal = PAL[v];
	const throb = Math.max(0, Math.sin(o.time * 9 + phase));
	halo(c, x, y, tile, HALO[v], v === 'c' ? 0.42 : 0.36);
	c.save();
	c.translate(x, y);
	c.scale(unit * SCALE, unit * SCALE);
	if (v === 'c') {
		// afterimages along the way it came
		const [bx, by] = back(o);
		for (let i = 3; i >= 1; i--) {
			c.save();
			c.translate(bx * i * 5.5, by * i * 5.5);
			c.globalAlpha *= 0.32 - i * 0.08;
			traceBody(c);
			c.fillStyle = '#ff6a3a';
			c.fill();
			c.restore();
		}
	}
	c.translate(Math.sin(o.time * 47 + phase) * 0.3, 0);
	const step = o.step;
	const lift = footLift(step);
	c.translate(0, -Math.abs(Math.sin(step)) * 0.7);
	c.translate(0, 10);
	c.rotate(Math.sin(step) * 0.08 + o.lookX * 0.1);
	c.translate(0, -10);
	if (v === 'b') tendrilsB(c, o);
	if (v === 'c') shardsC(c, o, false);
	for (const [side, up] of [
		[-1, lift.left],
		[1, lift.right]
	] as const) {
		c.beginPath();
		c.ellipse(side * 4.2, 11 - up, 3.3, 2.5, 0, 0, TAU);
		c.fillStyle = pal.s;
		c.fill();
		c.strokeStyle = INK;
		c.lineWidth = 1.5;
		c.stroke();
	}
	const squash = Math.sin(o.time * 5 + phase);
	c.translate(0, 10);
	c.scale(1 - 0.04 * squash + 0.035 * throb, 1 + 0.05 * squash + 0.035 * throb);
	c.translate(0, -10);
	if (v === 'a') bodyA(c, pal, o, throb);
	else if (v === 'b') bodyB(c, pal, o);
	else bodyC(c, o, throb);
	if (v === 'c') shardsC(c, o, true);
	c.restore();
}

// ------------------------------------------------------------------------------------ the lures

export const LURE_LIGHT: Record<Variant | 'now', string> = {
	now: '150, 230, 255',
	a: '120, 255, 150',
	b: '255, 110, 210',
	c: '120, 230, 255'
};

/** The game's lure as it is (`StationLevelRenderer.drawLure`), for the comparison. */
function lureNow(c: Ctx, x: number, y: number, S: number, t: number): void {
	const rgb = LURE_LIGHT.now;
	c.save();
	c.globalCompositeOperation = 'lighter';
	const g = c.createRadialGradient(x, y, 0, x, y, S * 0.9);
	g.addColorStop(0, `rgba(${rgb},0.9)`);
	g.addColorStop(1, `rgba(${rgb},0)`);
	c.fillStyle = g;
	c.fillRect(x - S, y - S, S * 2, S * 2);
	const k = (t * 0.8) % 1;
	c.strokeStyle = `rgba(${rgb},${0.7 * (1 - k)})`;
	c.lineWidth = Math.max(1.5, S * 0.08);
	c.beginPath();
	c.arc(x, y, S * (0.3 + 1.2 * k), 0, TAU);
	c.stroke();
	c.fillStyle = 'rgba(240,252,255,1)';
	c.beginPath();
	c.arc(x, y, S * 0.14, 0, TAU);
	c.fill();
	c.restore();
}

/** A: a green signal flare thrown on the deck: the stick, a green fire, sparks, smoke. */
function lureA(c: Ctx, x: number, y: number, S: number, t: number): void {
	const flick = 0.86 + 0.08 * Math.sin(t * 17) + 0.06 * Math.sin(t * 29 + 1);
	c.save();
	c.translate(x, y);
	// smoke drifting off
	for (let i = 0; i < 5; i++) {
		const u = (t * 0.45 + i / 5) % 1;
		c.fillStyle = `rgba(170, 205, 180, ${0.22 * (1 - u)})`;
		c.beginPath();
		c.arc(S * 0.14 + Math.sin(u * 3 + i) * S * 0.25 + u * S * 0.3, -u * S * 1.1, S * (0.12 + 0.32 * u), 0, TAU);
		c.fill();
	}
	// the stick
	c.save();
	c.rotate(-0.45);
	c.fillStyle = '#2b302d';
	c.fillRect(-S * 0.34, -S * 0.065, S * 0.44, S * 0.13);
	c.fillStyle = '#d8dcd2';
	c.fillRect(-S * 0.2, -S * 0.065, S * 0.06, S * 0.13);
	c.strokeStyle = '#0e100f';
	c.lineWidth = 1;
	c.strokeRect(-S * 0.34, -S * 0.065, S * 0.44, S * 0.13);
	c.restore();
	const tx = Math.cos(-0.45) * S * 0.12;
	const ty = Math.sin(-0.45) * S * 0.12;
	c.globalCompositeOperation = 'lighter';
	const g = c.createRadialGradient(tx, ty, 0, tx, ty, S * 1.1);
	g.addColorStop(0, `rgba(170, 255, 180, ${0.85 * flick})`);
	g.addColorStop(0.3, `rgba(80, 240, 120, ${0.45 * flick})`);
	g.addColorStop(1, 'rgba(40, 200, 90, 0)');
	c.fillStyle = g;
	c.beginPath();
	c.arc(tx, ty, S * 1.1, 0, TAU);
	c.fill();
	ellipse(c, tx, ty, S * 0.13 * flick, S * 0.11 * flick, 'rgba(240, 255, 235, 1)');
	// sparks
	for (let i = 0; i < 14; i++) {
		const u = (t * 1.5 + hash(i, 1)) % 1;
		const a = -Math.PI / 2 + (hash(i, 2) - 0.5) * 2.4;
		const sp = S * (0.8 + 0.7 * hash(i, 3));
		const px = tx + Math.cos(a) * sp * u;
		const py = ty + Math.sin(a) * sp * u + S * 1.1 * u * u;
		c.fillStyle = `rgba(220, 255, 200, ${1 - u})`;
		c.beginPath();
		c.arc(px, py, Math.max(0.8, S * 0.04 * (1 - u)), 0, TAU);
		c.fill();
	}
	c.restore();
}

/** B: a burst pheromone capsule: its two halves, a magenta pool, scent rings wavering out, vapour. */
function lureB(c: Ctx, x: number, y: number, S: number, t: number): void {
	c.save();
	c.translate(x, y);
	// the pool
	c.beginPath();
	for (let i = 0; i <= 24; i++) {
		const a = (i / 24) * TAU;
		const r = S * (0.34 + 0.05 * Math.sin(a * 3 + 1) + 0.03 * Math.sin(a * 5 + t * 1.5));
		if (i === 0) c.moveTo(Math.cos(a) * r, Math.sin(a) * r * 0.8);
		else c.lineTo(Math.cos(a) * r, Math.sin(a) * r * 0.8);
	}
	c.closePath();
	c.fillStyle = 'rgba(220, 60, 170, 0.75)';
	c.fill();
	c.strokeStyle = 'rgba(60, 8, 44, 0.9)';
	c.lineWidth = 1.2;
	c.stroke();
	ellipse(c, -S * 0.1, -S * 0.08, S * 0.1, S * 0.04, 'rgba(255, 220, 245, 0.7)');
	// the capsule's halves, cracked open
	for (const [sx, rot] of [
		[-1, -0.6],
		[1, 0.4]
	] as const) {
		c.save();
		c.translate(sx * S * 0.3, sx * S * 0.12);
		c.rotate(rot);
		c.beginPath();
		c.moveTo(0, -S * 0.09);
		c.lineTo(sx * S * 0.12, -S * 0.09);
		c.arc(sx * S * 0.12, 0, S * 0.09, -Math.PI / 2, Math.PI / 2, sx < 0);
		c.lineTo(0, S * 0.09);
		c.lineTo(sx * -S * 0.02, S * 0.03);
		c.lineTo(sx * S * 0.02, -S * 0.02);
		c.closePath();
		c.fillStyle = '#c9d3d6';
		c.fill();
		c.strokeStyle = '#1a1f21';
		c.lineWidth = 1;
		c.stroke();
		c.restore();
	}
	c.globalCompositeOperation = 'lighter';
	const g = c.createRadialGradient(0, 0, 0, 0, 0, S * 0.9);
	g.addColorStop(0, 'rgba(255, 120, 220, 0.55)');
	g.addColorStop(1, 'rgba(255, 80, 200, 0)');
	c.fillStyle = g;
	c.beginPath();
	c.arc(0, 0, S * 0.9, 0, TAU);
	c.fill();
	// scent rings, slow and wavering
	for (let k = 0; k < 3; k++) {
		const u = (t * 0.42 + k / 3) % 1;
		c.beginPath();
		for (let i = 0; i <= 40; i++) {
			const a = (i / 40) * TAU;
			const r = S * (0.35 + 1.7 * u) + Math.sin(a * 7 + t * 2 + k) * S * 0.06;
			if (i === 0) c.moveTo(Math.cos(a) * r, Math.sin(a) * r);
			else c.lineTo(Math.cos(a) * r, Math.sin(a) * r);
		}
		c.strokeStyle = `rgba(255, 140, 225, ${0.55 * (1 - u)})`;
		c.lineWidth = Math.max(1.2, S * 0.05);
		c.stroke();
	}
	// vapour curling up
	for (let i = 0; i < 3; i++) {
		const u = (t * 0.5 + i / 3) % 1;
		c.beginPath();
		const x0 = (i - 1) * S * 0.18;
		c.moveTo(x0, -S * 0.05);
		c.bezierCurveTo(
			x0 + S * 0.25 * Math.sin(t + i),
			-S * 0.35,
			x0 - S * 0.25 * Math.sin(t * 1.3 + i),
			-S * 0.6,
			x0 + S * 0.1,
			-S * (0.7 + 0.3 * u)
		);
		c.strokeStyle = `rgba(255, 170, 235, ${0.35 * (1 - u * 0.6)})`;
		c.lineWidth = Math.max(1, S * 0.04);
		c.stroke();
	}
	c.restore();
}

/** C: the hero's hologram over a small projector: a cyan ghost of him chomping, scan lines, a
 *  slip of the picture now and then. */
function lureC(c: Ctx, x: number, y: number, S: number, t: number): void {
	c.save();
	c.translate(x, y);
	// the projector
	ellipse(c, 0, S * 0.3, S * 0.24, S * 0.09, '#20292c');
	c.strokeStyle = 'rgba(120, 230, 255, 0.9)';
	c.lineWidth = 1.2;
	c.beginPath();
	c.ellipse(0, S * 0.3, S * 0.24, S * 0.09, 0, 0, TAU);
	c.stroke();
	c.globalCompositeOperation = 'lighter';
	// the light cone up to the picture
	const cone = c.createLinearGradient(0, S * 0.3, 0, -S * 0.3);
	cone.addColorStop(0, 'rgba(120, 230, 255, 0.35)');
	cone.addColorStop(1, 'rgba(120, 230, 255, 0)');
	c.fillStyle = cone;
	c.beginPath();
	c.moveTo(-S * 0.14, S * 0.3);
	c.lineTo(S * 0.14, S * 0.3);
	c.lineTo(S * 0.42, -S * 0.3);
	c.lineTo(-S * 0.42, -S * 0.3);
	c.closePath();
	c.fill();
	// the picture slips sideways for a moment about once a second
	const slip = (t * 1.1) % 1 < 0.07 ? S * 0.07 * (hash(Math.floor(t * 1.1), 4) - 0.5) * 2 : 0;
	const a = 0.82 + 0.06 * Math.sin(t * 11);
	const mouth = 0.18 + 0.5 * Math.abs(Math.sin(t * 6));
	const hx = slip;
	const hy = -S * 0.1;
	const R = S * 0.33;
	const body = () => {
		c.beginPath();
		c.moveTo(hx, hy);
		c.arc(hx, hy, R, mouth * 0.9, TAU - mouth * 0.9);
		c.closePath();
	};
	const g = c.createRadialGradient(hx, hy, 0, hx, hy, S * 0.9);
	g.addColorStop(0, `rgba(120, 230, 255, ${0.35 * a})`);
	g.addColorStop(1, 'rgba(120, 230, 255, 0)');
	c.fillStyle = g;
	c.beginPath();
	c.arc(hx, hy, S * 0.9, 0, TAU);
	c.fill();
	body();
	c.fillStyle = `rgba(110, 225, 255, ${0.32 * a})`;
	c.fill();
	c.save();
	body();
	c.clip();
	const off = (t * S * 0.4) % (S * 0.07);
	c.fillStyle = `rgba(200, 248, 255, ${0.4 * a})`;
	for (let yy = hy - R + off; yy < hy + R; yy += S * 0.07) c.fillRect(hx - R, yy, R * 2, Math.max(1, S * 0.02));
	c.restore();
	body();
	c.strokeStyle = `rgba(190, 245, 255, ${0.95 * a})`;
	c.lineWidth = Math.max(1.2, S * 0.045);
	c.stroke();
	ellipse(c, hx + R * 0.15, hy - R * 0.5, S * 0.05, S * 0.05, `rgba(230, 252, 255, ${a})`);
	c.restore();
}

export function drawLureCandidate(c: Ctx, x: number, y: number, S: number, t: number, v: Variant | 'now'): void {
	if (v === 'now') lureNow(c, x, y, S, t);
	else if (v === 'a') lureA(c, x, y, S, t);
	else if (v === 'b') lureB(c, x, y, S, t);
	else lureC(c, x, y, S, t);
}
