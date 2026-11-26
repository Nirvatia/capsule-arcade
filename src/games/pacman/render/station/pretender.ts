// The station's squad creature, the Pretender (the owner's mock-up STATION_MIMIC.html, its
// `smileMimic`, refined for B-7 in the `pretender` prototype and approved 2026-11-26; DESIGN.md
// §7a). It keeps the season ghosts' grammar (`render/actors/cuteGhost`): upright and never turned,
// two bean feet stepping with the distance, a bob, a lean to the heading; on the maze's rails a
// gliding body read clumsy, worst on a 180. A pale cute mask (the spore's ivory, button eyes, a
// stitched smile) is strapped over a creature in the squad's colour; the mask hangs back and slips
// away from the heading, so the real gold eye peeks on the heading's side; the tell slips it
// further; the rage pushes it up onto the head and shows the true face (gold slit eyes, a mouth of
// bone teeth); it folds into the level's spore for the disguise.
import type { GhostKind } from '../../logic/actors/GhostModel';
import { footLift } from '../actors/cuteGhost';

export type PretenderState = 'hunt' | 'tell' | 'rage' | 'fright' | 'eyes' | 'mimic';

export interface PretenderOpts {
	/** The heading as a unit vector, instant (the eyes). */
	readonly lookX: number;
	readonly lookY: number;
	/** The heading eased (the mask): a 180 swings it across the face. */
	readonly faceX: number;
	readonly faceY: number;
	readonly time: number;
	/** Distance travelled as a stride phase (radians). */
	readonly step: number;
	/** The mimicry: 0 the creature .. 1 the spore. */
	readonly fold?: number;
	/** The rage: 0 the mask still on .. 1 pushed up onto the head. */
	readonly reveal?: number;
	/** The fright about to end, and the white half of its blink. */
	readonly flashing?: boolean;
	readonly white?: boolean;
	/** Paints the level's spore at the origin with this alpha and scale (the disguise). */
	readonly spore?: (c: CanvasRenderingContext2D, alpha: number, scale: number) => void;
}

type Ctx = CanvasRenderingContext2D;
type Pal = { readonly b: string; readonly s: string };

const TAU = Math.PI * 2;
const INK = '#241418';
/** The squad's hues a little cooler and deeper than the seasons': bred in a lab, cold lamps. */
const BODY: Readonly<Record<GhostKind, Pal>> = {
	BLINKY: { b: '#ee6b60', s: '#b03c40' },
	PINKY: { b: '#ec95d2', s: '#b0609e' },
	INKY: { b: '#62d8ea', s: '#2c90a8' },
	CLYDE: { b: '#f3ab55', s: '#b8732a' }
};
const SCARED: Pal = { b: '#4f68ff', s: '#3346d0' };
const WHITE: Pal = { b: '#f4f7ff', s: '#c3cfea' };
const RAGE: Pal = { b: '#ff4a4a', s: '#a81622' };
const PHASE: Readonly<Record<GhostKind, number>> = { BLINKY: 0, PINKY: 0.8, INKY: 1.6, CLYDE: 2.4 };
const IVORY = '#f1e7cf';
const SCALE = 0.96;

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (e0: number, e1: number, x: number) => {
	const k = clamp((x - e0) / (e1 - e0), 0, 1);
	return k * k * (3 - 2 * k);
};

/** The game's ghost state to the Pretender's look. */
export function pretenderStateFor(input: {
	readonly state: string;
	readonly escaping: boolean;
	readonly tell: boolean;
}): PretenderState {
	if (input.state === 'eyes') return 'eyes';
	if (input.state === 'frightened') return 'fright';
	if (input.escaping || input.state === 'enraged') return 'rage';
	return input.tell ? 'tell' : 'hunt';
}

export const GAIT_TUNE = {
	/** The mask's turn toward the heading, per second (exponential). */
	face: 12,
	/** The stride, radians of the step's phase per tile travelled. */
	stride: 2.4,
	/** The mask's way up in the rage (and back down), seconds. */
	reveal: 0.22,
	/** A step longer than this is a jump (a tunnel, back to the lair), tiles. */
	jump: 1.5
} as const;

/** How a Pretender walks the rails: drawn at its real point (no glide), its heading turned at once
 *  for the eyes, eased for the mask, its stride counted from the distance, the mask's reveal. */
export class RailGait {
	faceX = 1;
	faceY = 0;
	step = 0;
	reveal = 0;
	private started = false;
	private lastX = 0;
	private lastY = 0;

	update(dt: number, x: number, y: number, dirX: number, dirY: number, raging: boolean): void {
		const moved = Math.hypot(x - this.lastX, y - this.lastY);
		if (!this.started || moved > GAIT_TUNE.jump) {
			this.started = true;
			this.faceX = dirX;
			this.faceY = dirY;
			this.reveal = raging ? 1 : 0;
		} else {
			this.step += moved * GAIT_TUNE.stride;
			const k = 1 - Math.exp(-dt * GAIT_TUNE.face);
			this.faceX += (dirX - this.faceX) * k;
			this.faceY += (dirY - this.faceY) * k;
			const r = dt / GAIT_TUNE.reveal;
			this.reveal = clamp(this.reveal + (raging ? r : -r), 0, 1);
		}
		this.lastX = x;
		this.lastY = y;
	}
}

function ellipse(
	c: Ctx,
	x: number,
	y: number,
	rx: number,
	ry: number,
	fill: string,
	ink = 0
): void {
	c.beginPath();
	c.ellipse(x, y, Math.max(0.05, rx), Math.max(0.05, ry), 0, 0, TAU);
	c.fillStyle = fill;
	c.fill();
	if (ink > 0) {
		c.strokeStyle = INK;
		c.lineWidth = ink;
		c.stroke();
	}
}

function line(
	c: Ctx,
	x1: number,
	y1: number,
	x2: number,
	y2: number,
	color: string,
	width: number
): void {
	c.beginPath();
	c.moveTo(x1, y1);
	c.lineTo(x2, y2);
	c.strokeStyle = color;
	c.lineWidth = width;
	c.lineCap = 'round';
	c.stroke();
}

function glow(c: Ctx, x: number, y: number, r: number, inner: string, mid: string): void {
	const g = c.createRadialGradient(x, y, 0.2, x, y, r);
	g.addColorStop(0, inner);
	g.addColorStop(0.5, mid);
	g.addColorStop(1, 'rgba(255, 60, 40, 0)');
	c.fillStyle = g;
	c.beginPath();
	c.arc(x, y, r, 0, TAU);
	c.fill();
}

const traceBody = (c: Ctx) => {
	c.beginPath();
	c.ellipse(0, 1.6, 10.0, 9.2, 0, 0, TAU);
};

const traceMask = (c: Ctx) => {
	c.beginPath();
	c.moveTo(0, -5.6);
	c.bezierCurveTo(6.4, -5.8, 8.2, -1.0, 7.6, 4.4);
	c.bezierCurveTo(6.8, 8.2, 3.4, 9.2, 0, 9.0);
	c.bezierCurveTo(-3.6, 9.2, -7.0, 8.0, -7.8, 4.0);
	c.bezierCurveTo(-8.4, -1.2, -6.2, -5.4, 0, -5.6);
	c.closePath();
};

/** The mask in its own frame: the cute face, its crack on the heading's side, the smile. */
function paintMask(c: Ctx, st: PretenderState, white: boolean, o: PretenderOpts): void {
	const scared = st === 'fright';
	const cracked = st === 'hunt' || st === 'tell' || st === 'rage';
	traceMask(c);
	c.fillStyle = scared ? (white ? '#ffffff' : '#dce6ff') : IVORY;
	c.fill();
	c.save();
	traceMask(c);
	c.clip();
	ellipse(c, 2.2, 9.6, 8.6, 3.8, scared ? 'rgba(79,104,255,0.2)' : '#d9c194');
	if (cracked) {
		const cs = o.faceX < 0 ? -1 : 1;
		c.strokeStyle = INK;
		c.lineWidth = st === 'rage' ? 1.15 : 0.9;
		c.lineCap = 'round';
		c.beginPath();
		c.moveTo(cs * 7.4, -1.4);
		c.lineTo(cs * 4.2, -0.2);
		c.lineTo(cs * 2.6, 2.2);
		c.moveTo(cs * 4.2, -0.2);
		c.lineTo(cs * 2.8, -2.6);
		c.stroke();
	}
	c.restore();
	traceMask(c);
	c.strokeStyle = INK;
	c.lineWidth = 1.7;
	c.lineJoin = 'round';
	c.stroke();
	// the painted button eyes look nowhere; in the fright they are hollow rings with tiny pupils
	for (const be of [
		{ x: -3.6, y: 0.7, r: 2.35 },
		{ x: 3.7, y: 1.6, r: 1.95 }
	]) {
		if (scared) {
			ellipse(c, be.x, be.y, be.r + 0.3, be.r + 0.3, '#ffffff', 1.1);
			ellipse(c, be.x + o.lookX * 0.7, be.y + o.lookY * 0.7, 0.95, 0.95, white ? '#ff6a3a' : INK);
		} else {
			ellipse(c, be.x, be.y, be.r, be.r * 1.05, INK);
			c.fillStyle = '#ffffff';
			c.beginPath();
			c.arc(be.x - be.r * 0.32, be.y - be.r * 0.3, 0.58, 0, TAU);
			c.arc(be.x + be.r * 0.25, be.y + be.r * 0.22, 0.32, 0, TAU);
			c.fill();
		}
	}
	c.fillStyle = scared ? 'rgba(120,150,255,0.4)' : 'rgba(226,112,104,0.36)';
	c.beginPath();
	c.ellipse(-5.4, 3.6, 1.5, 0.95, 0, 0, TAU);
	c.ellipse(5.5, 4.2, 1.4, 0.9, 0, 0, TAU);
	c.fill();
	if (scared) {
		// a zigzag mouth and a drop of sweat
		c.beginPath();
		c.moveTo(-3.4, 6.8);
		for (let i = 1; i <= 6; i++) c.lineTo(-3.4 + i * 1.13, 5.4 + (i % 2 ? 0 : 1.4));
		c.strokeStyle = white ? '#ff4d4d' : INK;
		c.lineWidth = 0.95;
		c.lineJoin = 'round';
		c.stroke();
		if (!white) {
			c.beginPath();
			c.moveTo(7.4, -4.8);
			c.bezierCurveTo(9.4, -2.2, 9.2, -0.8, 7.4, -0.6);
			c.bezierCurveTo(5.6, -0.8, 5.4, -2.2, 7.4, -4.8);
			c.fillStyle = '#bfe9ff';
			c.fill();
			c.strokeStyle = INK;
			c.lineWidth = 0.6;
			c.stroke();
		}
		return;
	}
	const wide = st === 'tell' || st === 'rage';
	const w = wide ? 5.0 : 4.0;
	const dip = wide ? 8.2 : 6.9;
	c.beginPath();
	c.moveTo(-w, 4.4);
	c.quadraticCurveTo(0, dip, w, 4.9);
	c.strokeStyle = INK;
	c.lineWidth = 1.05;
	c.lineCap = 'round';
	c.stroke();
	for (const sx of [-2.4, 0, 2.5]) {
		const sy = 5.4 + (1 - (sx * sx) / (w * w)) * (dip - 5.2) * 0.55;
		line(c, sx, sy - 0.85, sx + 0.15, sy + 0.85, INK, 0.72);
	}
}

/** Under the mask (the rage): gold slit eyes under angry lids, a mouth across the face with the
 *  mask's bone for teeth, a coral glow in the throat. */
function paintTrueFace(c: Ctx, pal: Pal, o: PretenderOpts): void {
	const p = 0.8 + 0.2 * Math.sin(o.time * 9);
	c.save();
	c.translate(o.faceX * 1.6, o.faceY * 1.3);
	// where the mask sat, the skin is raw
	ellipse(c, 0, 2.2, 8.0, 7.4, 'rgba(110, 8, 20, 0.32)');
	const ey = -0.6;
	for (const side of [-1, 1]) {
		const ex = side * 4.1;
		glow(c, ex, ey, 5.4, `rgba(255, 214, 110, ${0.55 * p})`, `rgba(255, 70, 40, ${0.35 * p})`);
		ellipse(c, ex, ey, 3.0, 2.6, '#ffd04a', 1.1);
		ellipse(c, ex + o.lookX * 0.9, ey + o.lookY * 0.8, 0.62, 2.0, INK);
		c.fillStyle = '#ffffff';
		c.beginPath();
		c.arc(ex - 1.1, ey - 0.9, 0.55, 0, TAU);
		c.fill();
		c.beginPath();
		c.moveTo(side * 7.6, ey - 3.0);
		c.lineTo(side * 0.7, ey - 0.1);
		c.lineTo(side * 0.7, ey - 4.4);
		c.lineTo(side * 7.6, ey - 4.4);
		c.closePath();
		c.fillStyle = pal.b;
		c.fill();
		line(c, side * 7.6, ey - 3.0, side * 0.7, ey - 0.1, INK, 1.5);
	}
	// the mouth, chomping
	const chomp = 0.5 + 0.5 * Math.sin(o.time * 9);
	const top = (x: number) => 3.6 - (1 - (x / 7) ** 2) * 0.5;
	const bottom = (x: number) => 3.6 + (1 - (x / 7) ** 2) * (2.6 + 1.0 * chomp);
	const traceMouth = () => {
		c.beginPath();
		c.moveTo(-7, 3.6);
		c.quadraticCurveTo(0, 2.6, 7, 3.6);
		c.quadraticCurveTo(0, 8.8 + 2 * chomp, -7, 3.6);
		c.closePath();
	};
	traceMouth();
	c.fillStyle = '#12060b';
	c.fill();
	c.save();
	c.clip();
	glow(c, 0, 6.6, 5.5, 'rgba(255, 140, 80, 0.75)', 'rgba(255, 70, 50, 0.4)');
	c.fillStyle = IVORY;
	c.strokeStyle = INK;
	c.lineWidth = 0.5;
	for (let x = -5.6; x <= 5.7; x += 1.87) {
		c.beginPath();
		c.moveTo(x - 0.85, top(x) - 0.2);
		c.lineTo(x, top(x) + 1.9);
		c.lineTo(x + 0.85, top(x) - 0.2);
		c.fill();
		c.stroke();
	}
	for (let x = -4.6; x <= 4.7; x += 2.3) {
		c.beginPath();
		c.moveTo(x - 0.8, bottom(x) + 0.2);
		c.lineTo(x, bottom(x) - 1.6);
		c.lineTo(x + 0.8, bottom(x) + 0.2);
		c.fill();
		c.stroke();
	}
	c.restore();
	traceMouth();
	c.strokeStyle = INK;
	c.lineWidth = 1.3;
	c.lineJoin = 'round';
	c.stroke();
	c.restore();
}

/** The body, the void behind the mask with the real eye, the mask (or the true face). */
function paintBody(c: Ctx, pal: Pal, st: PretenderState, white: boolean, o: PretenderOpts): void {
	const lx = o.faceX;
	const ly = o.faceY;
	const k = o.fold ?? 0;
	const rage = st === 'rage';
	const tell = st === 'tell';
	const hunting = st === 'hunt' || tell;

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
	c.restore();
	c.fillStyle = 'rgba(255,255,255,0.6)';
	c.beginPath();
	c.ellipse(-5.0, -3.2, 2.5, 1.5, -0.6, 0, TAU);
	c.fill();
	if (!white) {
		// the station's cold lamp along the upper-left rim
		c.beginPath();
		c.ellipse(0, 1.6, 8.9, 8.1, 0, Math.PI * 1.05, Math.PI * 1.55);
		c.strokeStyle = 'rgba(206, 236, 255, 0.55)';
		c.lineWidth = 1.0;
		c.lineCap = 'round';
		c.stroke();
	}

	if (rage) {
		paintTrueFace(c, pal, o);
		// the mask goes up from the hunt's slip onto the top of its head, seen from below
		const r = o.reveal ?? 1;
		c.save();
		c.translate(lerp(lx * 1.4, 0, r), lerp(ly * 1.1, 0, r));
		c.translate(
			lerp(-lx * 3.1, -lx * 1.6, r),
			lerp(-ly * 2.66, -8.6 + Math.sin(o.step + 0.9) * 0.35, r)
		);
		c.rotate(lerp(-0.085 * (1 - Math.abs(lx)) - lx * 0.12, -0.16 - lx * 0.14, r));
		c.scale(1, lerp(1, 0.5, r));
		paintMask(c, st, white, o);
		c.restore();
		return;
	}

	// the strap that holds the mask on
	c.save();
	traceBody(c);
	c.clip();
	c.fillStyle = 'rgba(36, 20, 24, 0.5)';
	c.fillRect(-11, 1.3, 22, 1.5);
	c.restore();

	c.save();
	c.translate(lx * 1.4, ly * 1.1);
	// the mask hangs back from the face's lean and slips away from the heading
	const amt = (tell ? 2.9 : st === 'hunt' ? 2.1 : 0) * (1 - k);
	const mdx = -lx * (amt + 1.0);
	const mdy = -ly * (amt + 0.7) * 0.95;
	const mrot =
		-0.085 * (1 - Math.abs(lx)) -
		lx * (tell ? 0.22 : st === 'hunt' ? 0.12 : 0) +
		(st === 'fright' ? Math.sin(o.time * 36) * 0.05 : 0);

	if (hunting && k < 0.999) {
		// the void behind the mask and the gold eye on the heading's side, over it or under it
		c.save();
		c.beginPath();
		c.ellipse(-lx * 1.4, 1.6 - ly * 1.1, 9.5, 8.7, 0, 0, TAU);
		c.clip();
		const ay = Math.abs(ly);
		c.beginPath();
		c.ellipse(
			lx * 4.2,
			1.0 + ly * (ly < 0 ? 4.6 : 5.8),
			lerp(4.4, 6.4, ay),
			lerp(6.6, 3.8, ay),
			0,
			0,
			TAU
		);
		c.fillStyle = '#12060b';
		c.fill();
		c.strokeStyle = INK;
		c.lineWidth = 1.2;
		c.stroke();
		const ex = lx * 6.6;
		const ey = 0.6 + ly * (ly < 0 ? 5.1 : 7.0);
		const pulse = tell ? 0.75 + 0.25 * Math.sin((o.time / 1.3) * TAU) : 0.6;
		const r = tell ? 2.7 : 2.3;
		glow(
			c,
			ex,
			ey,
			r * 1.9,
			`rgba(255, 214, 120, ${0.95 * pulse})`,
			`rgba(255, 120, 60, ${0.5 * pulse})`
		);
		ellipse(c, ex, ey, r, r * 0.86, '#ffc847', 0.7);
		ellipse(c, ex + o.lookX * 0.55, ey + o.lookY * 0.45, tell ? 0.45 : 0.6, r * 0.62, INK);
		c.restore();
	}
	c.save();
	c.translate(mdx, mdy);
	c.rotate(mrot);
	paintMask(c, st, white, o);
	c.restore();
	c.restore();
}

/** One walking Pretender in `unit` space (the cute ghosts' frame), `k` its fold. */
function paintWalker(
	c: Ctx,
	kind: GhostKind,
	st: PretenderState,
	o: PretenderOpts,
	unit: number,
	k: number
): void {
	const phase = PHASE[kind];
	c.scale(unit * SCALE, unit * SCALE);
	if (st === 'eyes') {
		// eaten: its gold eyes run home
		c.translate(0, Math.sin(o.time * 4 + phase) * 0.6 - 1);
		for (const side of [-1, 1]) {
			const ex = side * 4.6;
			const px = ex + o.lookX * 1.6;
			const py = o.lookY * 1.7;
			ellipse(c, ex, 0, 3.7, 4.2, '#ffffff', 1.2);
			ellipse(c, px, py, 2.2, 2.2, '#ffc847');
			ellipse(c, px, py, 0.7, 1.6, INK);
			c.fillStyle = '#ffffff';
			c.beginPath();
			c.arc(px - 0.8, py - 0.9, 0.7, 0, TAU);
			c.fill();
		}
		return;
	}
	const fright = st === 'fright';
	const white = fright && Boolean(o.white);
	if (fright && !o.flashing) c.translate(Math.sin(o.time * 38 + phase) * 0.45, 0);
	// no ring in the rage: it shakes and throbs
	if (st === 'rage') c.translate(Math.sin(o.time * 47 + phase) * 0.3, 0);
	const step = o.step * (1 - k);
	const lift = footLift(step);
	c.translate(0, -Math.abs(Math.sin(step)) * 0.7 * (1 - k));
	c.translate(0, 10);
	c.rotate((Math.sin(step) * 0.08 + o.lookX * 0.1) * (1 - k));
	c.translate(0, -10);
	let pal = BODY[kind];
	if (fright) pal = white ? WHITE : SCARED;
	else if (st === 'rage') pal = RAGE;
	// two bean feet; they tuck in as it folds
	for (const [side, up] of [
		[-1, lift.left],
		[1, lift.right]
	] as const) {
		c.beginPath();
		c.ellipse(side * 4.2 * (1 - 0.3 * k), 11 - up - 3.4 * k, 3.3, 2.5 * (1 - 0.5 * k), 0, 0, TAU);
		c.fillStyle = pal.s;
		c.fill();
		c.strokeStyle = INK;
		c.lineWidth = 1.5;
		c.stroke();
	}
	const squash = Math.sin(o.time * 5 + phase);
	c.translate(0, 10);
	c.scale(1 - 0.04 * squash, 1 + 0.05 * squash);
	if (st === 'rage') {
		const throb = Math.max(0, Math.sin(o.time * 9 + phase));
		c.scale(1 + 0.035 * throb, 1 + 0.035 * throb);
	}
	c.translate(0, -10);
	paintBody(c, pal, st, white, { ...o, fold: k });
}

/** One Pretender centred at (x, y), `tile` the tile's size in px. */
export function drawPretender(
	c: Ctx,
	x: number,
	y: number,
	tile: number,
	kind: GhostKind,
	st: PretenderState,
	o: PretenderOpts
): void {
	const unit = (tile / 25) * 0.78;
	if (st === 'mimic') {
		// the mask slips home, the feet tuck in, it sinks to the spore's size, then the spore
		const k = clamp(o.fold ?? 0, 0, 1);
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
		paintWalker(c, kind, 'hunt', o, unit, k);
		c.restore();
		return;
	}
	c.save();
	c.translate(x, y);
	paintWalker(c, kind, st, o, unit, 0);
	c.restore();
}
