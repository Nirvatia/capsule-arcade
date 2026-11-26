// The station's squad creature, the Pretender (the owner's mock-up STATION_MIMIC.html, its
// `smileMimic`, refined for B-7 in the `pretender` prototype and approved 2026-11-26; DESIGN.md
// §7a). It keeps the season ghosts' grammar (`render/actors/cuteGhost`): upright and never turned,
// two bean feet stepping with the distance, a bob, a lean to the heading; on the maze's rails a
// gliding body read clumsy, worst on a 180. A pale cute mask (the spore's ivory, button eyes, a
// stitched smile) is strapped over a creature in the squad's colour; the mask hangs back and slips
// away from the heading, so the real gold eye peeks on the heading's side; the tell slips it
// further; in the rage the mask bursts into shards and it overheats (the owner's pick of the
// `station-b7` page, 2026-11-26, in acid: red was lost in the infected maze): lime-hot inside,
// the shards circling its head, hollow glowing sockets, a jagged grin across the whole body,
// afterimages behind it; it folds into the level's spore for the disguise.
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
export const INK = '#241418';
/** The squad's hues a little cooler and deeper than the seasons': bred in a lab, cold lamps. */
const BODY: Readonly<Record<GhostKind, Pal>> = {
	BLINKY: { b: '#ee6b60', s: '#b03c40' },
	PINKY: { b: '#ec95d2', s: '#b0609e' },
	INKY: { b: '#62d8ea', s: '#2c90a8' },
	CLYDE: { b: '#f3ab55', s: '#b8732a' }
};
const SCARED: Pal = { b: '#4f68ff', s: '#3346d0' };
const WHITE: Pal = { b: '#f4f7ff', s: '#c3cfea' };
/** The overheat (the rage): lime-hot inside to a deep green rim. */
const HEAT = {
	core: '#fbffe0',
	mid: '#c6ff4a',
	rim: '#3f9a18',
	feet: '#2e7414',
	after: '#b8ff50',
	halo: '190, 255, 90',
	socket: '#fffbe8',
	pupil: '#1f4a0a',
	throat: '220, 255, 120'
} as const;
export const PHASE: Readonly<Record<GhostKind, number>> = {
	BLINKY: 0,
	PINKY: 0.8,
	INKY: 1.6,
	CLYDE: 2.4
};
export const IVORY = '#f1e7cf';
/** The body's size in the cute ghosts' frame: a little larger than theirs (the owner). */
export const SCALE = 1.08;
/** Out of the rage, larger still by this. */
const CALM_SCALE = 1.075;
/** In the rage, smaller by this (the owner, 2026-11-26). */
const RAGE_SCALE = 0.9;

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
	/** The stride, radians of the step's phase per tile travelled: the season ghosts' (a longer
	 *  one read as a faster glide). */
	stride: 5.7,
	/** The rage's reveal (the mask bursting, the overheat) and back, seconds. */
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

export function ellipse(
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

export function glow(c: Ctx, x: number, y: number, r: number, inner: string, mid: string): void {
	const g = c.createRadialGradient(x, y, 0.2, x, y, r);
	g.addColorStop(0, inner);
	g.addColorStop(0.5, mid);
	g.addColorStop(1, 'rgba(255, 60, 40, 0)');
	c.fillStyle = g;
	c.beginPath();
	c.arc(x, y, r, 0, TAU);
	c.fill();
}

export const traceBody = (c: Ctx) => {
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
export function paintMask(c: Ctx, st: PretenderState, white: boolean, o: PretenderOpts): void {
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

/** The body, the void behind the mask with the real eye, the mask. */
function paintBody(c: Ctx, pal: Pal, st: PretenderState, white: boolean, o: PretenderOpts): void {
	const lx = o.faceX;
	const ly = o.faceY;
	const k = o.fold ?? 0;
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
	// a little larger out of the rage (the owner, 2026-11-26); the rage's body is large already
	c.scale(unit * SCALE * CALM_SCALE, unit * SCALE * CALM_SCALE);
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
	const step = o.step * (1 - k);
	const lift = footLift(step);
	c.translate(0, -Math.abs(Math.sin(step)) * 0.7 * (1 - k));
	c.translate(0, 10);
	c.rotate((Math.sin(step) * 0.08 + o.lookX * 0.1) * (1 - k));
	c.translate(0, -10);
	let pal = BODY[kind];
	if (fright) pal = white ? WHITE : SCARED;
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
	c.translate(0, -10);
	paintBody(c, pal, st, white, { ...o, fold: k });
}

/** Where "behind" is: against the heading. */
function behind(o: PretenderOpts): [number, number] {
	const d = Math.hypot(o.lookX, o.lookY);
	return d > 0.01 ? [-o.lookX / d, -o.lookY / d] : [0, 1];
}

/** The mask's shards circling the head, behind it or before it; `burst` 0 at the face .. 1 out. */
function paintShards(c: Ctx, o: PretenderOpts, front: boolean, burst: number): void {
	for (let i = 0; i < 5; i++) {
		const a = o.time * 1.6 + (i * TAU) / 5;
		if (Math.sin(a) >= 0 !== front) continue;
		const r = lerp(4, 12.5 + Math.sin(o.time * 3 + i) * 1.2, burst);
		c.save();
		c.translate(Math.cos(a) * r, lerp(2, -3, burst) + Math.sin(a) * r * 0.45);
		c.rotate(o.time * 3 + i * 1.3);
		const z = 1.8 + ((i * 0.37) % 1) * 1.2;
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

/** The overheated body: lime-hot inside, hollow glowing sockets, a grin across it all, embers. */
function paintHeatBody(c: Ctx, o: PretenderOpts, throb: number): void {
	traceBody(c);
	c.lineJoin = 'round';
	c.lineWidth = 3.2;
	c.strokeStyle = INK;
	c.stroke();
	const g = c.createRadialGradient(0, 2.4, 0.5, 0, 1.6, 10.5);
	g.addColorStop(0, HEAT.core);
	g.addColorStop(0.35 + 0.1 * throb, HEAT.mid);
	g.addColorStop(1, HEAT.rim);
	c.fillStyle = g;
	c.fill();
	c.save();
	c.translate(o.faceX * 1.4, o.faceY * 1.2);
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
		c.fillStyle = HEAT.socket;
		c.fill();
		c.strokeStyle = INK;
		c.lineWidth = 1.2;
		c.stroke();
		ellipse(c, side * 4.4 + o.lookX * 1.2, -1.2 + o.lookY * 0.6, 0.5, 1.4, HEAT.pupil);
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
	c.fillStyle = '#0d1a05';
	c.fill();
	c.save();
	trace();
	c.clip();
	glow(c, 0, 7, 6.5, `rgba(${HEAT.throat}, 0.9)`, `rgba(${HEAT.throat}, 0.45)`);
	c.fillStyle = IVORY;
	c.strokeStyle = INK;
	c.lineWidth = 0.5;
	for (let i = 0, x = -9.5; x <= 9.6; i += 1, x += 1.9) {
		const y = 2.6 + (1 - (x / 11) ** 2) * 1.9;
		c.beginPath();
		c.moveTo(x - 0.95, y - 0.4);
		c.lineTo(x + 0.1, y + 2.1 + ((i * 0.618) % 1) * 0.8);
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
			(i - 1) * 4.5 + Math.sin(u * 5 + i) * 1.2,
			-7 - u * 9,
			0.7 * (1 - u) + 0.2,
			0.7 * (1 - u) + 0.2,
			`rgba(210, 255, ${120 - u * 60}, ${1 - u})`
		);
	}
}

/** The rage, the overheat, in `unit` space: afterimages along its way, the shards, it shakes and
 *  throbs; `burst` 0..1 the mask's shards flying out (the reveal's second half). */
function paintOverheat(
	c: Ctx,
	kind: GhostKind,
	o: PretenderOpts,
	unit: number,
	burst: number
): void {
	const phase = PHASE[kind];
	const throb = Math.max(0, Math.sin(o.time * 9 + phase));
	// the rage's body a little smaller than the base: with its shards and afterimages it read big
	c.scale(unit * SCALE * RAGE_SCALE, unit * SCALE * RAGE_SCALE);
	const [bx, by] = behind(o);
	for (let i = 3; i >= 1; i--) {
		c.save();
		c.translate(bx * i * 5.5, by * i * 5.5);
		c.globalAlpha *= (0.32 - i * 0.08) * burst;
		traceBody(c);
		c.fillStyle = HEAT.after;
		c.fill();
		c.restore();
	}
	c.translate(Math.sin(o.time * 47 + phase) * 0.3, 0);
	const lift = footLift(o.step);
	c.translate(0, -Math.abs(Math.sin(o.step)) * 0.7);
	c.translate(0, 10);
	c.rotate(Math.sin(o.step) * 0.08 + o.lookX * 0.1);
	c.translate(0, -10);
	paintShards(c, o, false, burst);
	for (const [side, up] of [
		[-1, lift.left],
		[1, lift.right]
	] as const) {
		c.beginPath();
		c.ellipse(side * 4.2, 11 - up, 3.3, 2.5, 0, 0, TAU);
		c.fillStyle = HEAT.feet;
		c.fill();
		c.strokeStyle = INK;
		c.lineWidth = 1.5;
		c.stroke();
	}
	const squash = Math.sin(o.time * 5 + phase);
	c.translate(0, 10);
	c.scale(1 - 0.04 * squash + 0.035 * throb, 1 + 0.05 * squash + 0.035 * throb);
	c.translate(0, -10);
	paintHeatBody(c, o, throb);
	paintShards(c, o, true, burst);
}

/** A soft glow round a Pretender in its state's colour, so it reads in the dark maze. */
function halo(
	c: Ctx,
	x: number,
	y: number,
	tile: number,
	kind: GhostKind,
	st: PretenderState,
	k: number
): void {
	const rgb =
		st === 'rage'
			? HEAT.halo
			: st === 'fright'
				? '96, 120, 255'
				: st === 'eyes'
					? '255, 214, 140'
					: (BODY[kind].b.match(/[0-9a-f]{2}/gi) ?? ['ff', 'ff', 'ff'])
							.map((h) => parseInt(h, 16))
							.join(', ');
	const a = (st === 'eyes' ? 0.18 : st === 'rage' ? 0.42 : 0.34) * (1 - k);
	if (a <= 0.01) return;
	const r = tile * 0.78;
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

/** A soft warm glow under the hero on the station, so he reads in the dark maze too. */
export function drawHeroGlow(c: Ctx, x: number, y: number, tile: number): void {
	const r = tile * 0.9;
	const g = c.createRadialGradient(x, y, 0, x, y, r);
	g.addColorStop(0, 'rgba(255, 236, 200, 0.3)');
	g.addColorStop(0.5, 'rgba(255, 220, 170, 0.12)');
	g.addColorStop(1, 'rgba(255, 220, 170, 0)');
	c.save();
	c.globalCompositeOperation = 'lighter';
	c.fillStyle = g;
	c.beginPath();
	c.arc(x, y, r, 0, TAU);
	c.fill();
	c.restore();
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
		halo(c, x, y, tile, kind, 'hunt', k);
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
	// the rage: the mask's first half is the hunt's, then it bursts and it overheats
	const reveal = st === 'rage' ? (o.reveal ?? 1) : 0;
	const heat = st === 'rage' && reveal >= 0.5;
	halo(c, x, y, tile, kind, heat ? 'rage' : st === 'rage' ? 'hunt' : st, 0);
	c.save();
	c.translate(x, y);
	if (heat) paintOverheat(c, kind, o, unit, smooth(0.5, 1, reveal));
	else paintWalker(c, kind, st === 'rage' ? 'tell' : st, o, unit, 0);
	c.restore();
}

/** A lurker's tell over its spore (stage space, a 34 px tile): the Pretender's gold eye opens
 *  for a moment beside the pearl, its slit turned toward the hero. `open` 0 shut .. 1 open. */
export function drawLurkerEye(
	c: Ctx,
	x: number,
	y: number,
	open: number,
	toX: number,
	toY: number
): void {
	if (open <= 0.02) return;
	const ex = x + 4.0;
	const ey = y - 3.9;
	const d = Math.hypot(toX, toY) || 1;
	c.save();
	c.globalAlpha *= Math.min(1, open * 1.4);
	glow(c, ex, ey, 7.5, `rgba(255, 214, 120, ${0.8 * open})`, `rgba(255, 120, 60, ${0.4 * open})`);
	ellipse(c, ex, ey, 3.4, 2.8 * open + 0.2, '#ffc847', 1.0);
	ellipse(c, ex + (toX / d) * 1.0, ey + (toY / d) * 0.5 * open, 0.75, 2.2 * open + 0.1, INK);
	c.restore();
}
