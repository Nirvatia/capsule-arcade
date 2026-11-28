// Candidates for the station's v4 creature, the shade («Морок», DESIGN.md §7a, the first block),
// round 2 (the owner, 2026-11-28: round 1's shroud, smoke column and reaper were all larger than a
// tile; the smoke column the most stylish). Now compact: the body is only a head of smoke rimmed in
// its kind's colour, inside a circle of 0.8 of a tile; everything else goes into the smoke tail
// that streams behind it (the motion, allowed outside the tile). The character is in the eyes (lit
// whites, a pupil on the heading, a lid per kind) and the pose (stretched along its way), never in
// its size: the rage changes colour and face, not size. Two hoods for the owner's pick:
//   b1  a sharp hood, its tip swept back against the way;
//   b2  a round hood.
import type { GhostKind } from '../../../src/games/pacman/logic/actors/GhostModel';

export type ShadeLook = 'b1' | 'b2' | 'hood';
export type ShadeState = 'hunt' | 'tell' | 'rage' | 'fright' | 'eyes' | 'mimic';

export interface ShadeOpts {
	readonly lookX: number;
	readonly lookY: number;
	readonly time: number;
	/** Its past points relative to (x, y), px, newest first (the smoke tail). */
	readonly trail?: ReadonlyArray<{ x: number; y: number }>;
	/** A 180 in progress: 0 formed .. 1 all smoke. */
	readonly turn?: number;
	/** The ambush: 0 the shade .. 1 a stain on the floor. */
	readonly fold?: number;
	/** The stain's eyes: 0 shut .. 1 open. */
	readonly eyeOpen?: number;
	readonly flashing?: boolean;
	readonly white?: boolean;
}

type Ctx = CanvasRenderingContext2D;

const KIND_RGB: Readonly<Record<GhostKind, string>> = {
	BLINKY: '255, 84, 70',
	PINKY: '255, 120, 225',
	INKY: '80, 225, 255',
	CLYDE: '255, 170, 60'
};
const TELL_RGB = '255, 214, 60';
const SCARED_RGB = '110, 140, 255';
const RAGE_RGB = '255, 58, 36';
const EYES_RGB = '255, 214, 90';

/** The head's radius (of the tile), the rim included: the body never leaves this circle. */
const HEAD_R = 0.4;

/** Each kind's face and hood: the hood's tip (height), the head's width, the eyes (size, slant:
 *  angry > 0; lids from above, left and right; the pupil's size; a darting gaze) and a mouth. */
interface Form {
	tip: number;
	wide: number;
	eye: number;
	slant: number;
	lidL: number;
	lidR: number;
	pupil: number;
	dart: number;
	mouth: 'none' | 'smirk' | 'o';
}
const FORM: Readonly<Record<GhostKind, Form>> = {
	BLINKY: { tip: 1, wide: 1, eye: 1, slant: 0.7, lidL: 0.35, lidR: 0.35, pupil: 0.5, dart: 0, mouth: 'none' },
	PINKY: { tip: 0.8, wide: 0.95, eye: 1, slant: -0.1, lidL: 0.05, lidR: 0.55, pupil: 0.5, dart: 0, mouth: 'smirk' },
	INKY: { tip: 0.6, wide: 0.95, eye: 1.2, slant: -0.25, lidL: 0, lidR: 0, pupil: 0.32, dart: 1, mouth: 'o' },
	CLYDE: { tip: 0.4, wide: 1.06, eye: 0.95, slant: -0.2, lidL: 0.5, lidR: 0.5, pupil: 0.55, dart: 0, mouth: 'none' }
};

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const smooth = (e0: number, e1: number, x: number) => {
	const k = clamp((x - e0) / (e1 - e0), 0, 1);
	return k * k * (3 - 2 * k);
};
const hash = (i: number) => {
	const s = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
	return s - Math.floor(s);
};

function glow(c: Ctx, x: number, y: number, r: number, rgb: string, a: number): void {
	if (a <= 0 || r <= 0) return;
	const g = c.createRadialGradient(x, y, 0, x, y, r);
	g.addColorStop(0, `rgba(${rgb}, ${a})`);
	g.addColorStop(0.45, `rgba(${rgb}, ${a * 0.4})`);
	g.addColorStop(1, `rgba(${rgb}, 0)`);
	c.fillStyle = g;
	c.fillRect(x - r, y - r, r * 2, r * 2);
}

interface Look {
	rim: string;
	/** The smoke's fill: lit side and shadow. */
	top: string;
	bottom: string;
	/** The eyes' lit whites. */
	white: string;
	shiver: number;
	embers: number;
}

function stateLook(kind: GhostKind, st: ShadeState, o: ShadeOpts): Look {
	if (st === 'fright') {
		const w = !!o.white;
		return {
			rim: w ? '240, 244, 255' : SCARED_RGB,
			top: w ? '196, 202, 228' : '44, 58, 150',
			bottom: w ? '150, 158, 190' : '20, 26, 86',
			white: '245, 248, 255',
			shiver: 0.025,
			embers: 0
		};
	}
	if (st === 'tell') return { rim: TELL_RGB, top: '40, 32, 46', bottom: '9, 7, 14', white: '255, 236, 170', shiver: 0.02, embers: 0.5 };
	if (st === 'rage') return { rim: RAGE_RGB, top: '44, 12, 14', bottom: '12, 3, 6', white: '255, 236, 214', shiver: 0.01, embers: 1.5 };
	const k = KIND_RGB[kind];
	return { rim: k, top: '36, 30, 52', bottom: '9, 7, 17', white: `${mixWhite(k, 0.7)}`, shiver: 0, embers: 0.4 };
}

function mixWhite(rgb: string, k: number): string {
	return rgb
		.split(',')
		.map((v) => Math.round(Number(v) + (255 - Number(v)) * k))
		.join(', ');
}

type Puff = [x: number, y: number, r: number, alpha: number];

/** The head's puffs (the tile `S`, the origin its centre): a core and a churning edge, a tip for
 *  the sharp hood swept back against the way. All inside HEAD_R with the rim (×1.18). */
function headPuffs(S: number, kind: GhostKind, look: ShadeLook, o: ShadeOpts): Puff[] {
	const f = FORM[kind];
	const t = o.time;
	const out: Puff[] = [[0, S * 0.03, S * 0.25 * f.wide, 1]];
	const n = 6;
	for (let i = 0; i < n; i++) {
		const a = (i / n) * Math.PI * 2 + t * 0.9 + hash(i) * 0.6;
		const d = S * (0.13 + 0.015 * Math.sin(t * 3 + i * 2.1));
		out.push([Math.cos(a) * d * f.wide, S * 0.04 + Math.sin(a) * d * 0.9, S * (0.115 + 0.01 * Math.sin(t * 4 + i)), 1]);
	}
	if (look === 'b1') {
		// the hood's tip: three puffs up to a point, swept back against the heading
		const back = -o.lookX * 0.08;
		for (let j = 1; j <= 3; j++) {
			const u = j / 3;
			const sway = Math.sin(t * 3.4 - j) * 0.012;
			out.push([S * (back * u * u + sway), -S * (0.15 + u * 0.15 * f.tip), S * (0.13 - u * 0.075), 1]);
		}
	} else {
		// the round hood's dome
		for (const dx of [-0.11, 0, 0.11]) out.push([S * dx * f.wide, -S * (0.13 + (dx ? 0 : 0.03)), S * 0.13, 1]);
	}
	return out;
}

/** The tail's puffs along its past points, thinning to nothing (outside the tile: the motion). */
function tailPuffs(S: number, o: ShadeOpts): Puff[] {
	const tr = o.trail ?? [];
	const n = tr.length;
	const out: Puff[] = [];
	for (let i = 0; i < n; i++) {
		const k = (i + 1) / (n + 1);
		const p0 = i ? tr[i - 1] : { x: 0, y: 0 };
		const dx = tr[i].x - p0.x;
		const dy = tr[i].y - p0.y;
		const len = Math.hypot(dx, dy) || 1;
		// uneven puffs drifting off the line and curling, thinning and dissolving toward the end
		const side = Math.sin(o.time * 5 + i * 2.3) * S * 0.07 * k + (hash(i * 5) - 0.5) * S * 0.06 * k;
		const r = S * lerp(0.19, 0.045, k) * (0.75 + 0.5 * hash(i * 3 + Math.floor(o.time * 2)));
		out.push([tr[i].x - (dy / len) * side, tr[i].y + (dx / len) * side - S * 0.05 * k, r, Math.pow(1 - k, 1.4)]);
		// a small curl beside every other puff
		if (i % 2) out.push([tr[i].x + (dy / len) * side * 1.6, tr[i].y - (dx / len) * side * 1.6 - S * 0.08 * k, r * 0.5, 0.7 * Math.pow(1 - k, 1.6)]);
	}
	return out;
}

/** The smoke: its colour first, a little larger, then the dark over it, so the whole union
 *  (the head with its tail) wears one rim of its colour. */
function drawSmoke(c: Ctx, puffs: Puff[], lk: Look, rimA: number): void {
	for (const [x, y, r, a] of puffs) {
		const R = r * 1.18;
		const g = c.createRadialGradient(x, y, 0, x, y, R);
		g.addColorStop(0, `rgba(${lk.rim}, ${a * rimA})`);
		g.addColorStop(0.8, `rgba(${lk.rim}, ${a * rimA})`);
		g.addColorStop(1, `rgba(${lk.rim}, 0)`);
		c.fillStyle = g;
		c.beginPath();
		c.arc(x, y, R, 0, Math.PI * 2);
		c.fill();
	}
	for (const [x, y, r, a] of puffs) {
		const g = c.createRadialGradient(x - r * 0.35, y - r * 0.35, 0, x, y, r);
		g.addColorStop(0, `rgba(${lk.top}, ${a})`);
		g.addColorStop(0.8, `rgba(${lk.bottom}, ${a})`);
		g.addColorStop(1, `rgba(${lk.bottom}, ${a * 0.6})`);
		c.fillStyle = g;
		c.beginPath();
		c.arc(x, y, r, 0, Math.PI * 2);
		c.fill();
	}
}

/** The face at (0, fy): two lit eyes with a pupil on the heading and its kind's lids; a mouth. */
function drawFace(c: Ctx, S: number, kind: GhostKind, st: ShadeState, o: ShadeOpts, lk: Look, fy: number, open = 1, mouth = true): void {
	const f = FORM[kind];
	const t = o.time;
	const lx = o.lookX;
	const ly = o.lookY;
	const fx = lx * S * 0.05;
	const cy = fy + ly * S * 0.035;
	const gap = S * 0.095;
	const big = st === 'tell' ? 1.12 : st === 'fright' ? 0.6 : 1;
	const rx = S * 0.072 * f.eye * big;
	const ry = S * 0.078 * f.eye * big * open;
	const rage = st === 'rage';
	const slant = rage ? 0.85 : st === 'fright' ? 0 : f.slant;
	c.save();
	c.globalCompositeOperation = 'lighter';
	glow(c, fx, cy, S * 0.24, lk.rim, 0.45 * open);
	c.restore();
	for (const side of [-1, 1]) {
		const ex = fx + side * gap;
		c.save();
		c.translate(ex, cy);
		c.beginPath();
		c.ellipse(0, 0, rx, Math.max(0.6, ry), 0, 0, Math.PI * 2);
		c.clip();
		c.fillStyle = `rgb(${lk.white})`;
		c.fillRect(-rx, -ry, rx * 2, ry * 2);
		if (st !== 'fright') {
			// the pupil on the heading; the nervous one's darts about
			const dart = f.dart * (Math.sin(t * 7.3) > 0.6 ? 1 : 0) * Math.sin(t * 2.1 + side);
			const px = (lx * 0.42 + dart * 0.35) * rx;
			const py = ly * 0.42 * ry;
			const pr = rx * (rage ? 0.3 : st === 'tell' ? f.pupil * 0.6 : f.pupil);
			c.fillStyle = rage ? `rgb(${RAGE_RGB})` : 'rgb(10, 6, 16)';
			c.beginPath();
			c.arc(px, py, pr, 0, Math.PI * 2);
			c.fill();
		}
		// the lid: the head's dark from above, slanted (angry: lower toward the middle)
		const lid = rage ? 0.45 : st === 'fright' || st === 'tell' ? 0 : side < 0 ? f.lidL : f.lidR;
		if (lid > 0 || slant !== 0) {
			c.fillStyle = `rgb(${lk.bottom})`;
			c.beginPath();
			const yl = -ry + ry * 2 * lid;
			const tilt = side * slant * ry * 0.9;
			c.moveTo(-rx * 1.2, -ry * 1.2);
			c.lineTo(rx * 1.2, -ry * 1.2);
			c.lineTo(rx * 1.2, yl - tilt);
			c.lineTo(-rx * 1.2, yl + tilt);
			c.closePath();
			c.fill();
		}
		c.restore();
	}
	// the mouth
	const my = cy + S * 0.13;
	c.lineCap = 'round';
	if (st === 'fright') {
		c.strokeStyle = 'rgba(245, 248, 255, 0.95)';
		c.lineWidth = S * 0.025;
		c.beginPath();
		for (let i = 0; i <= 6; i++) {
			const x = fx - S * 0.1 + (i / 6) * S * 0.2;
			const y = my - S * 0.02 + (i % 2 ? -1 : 1) * S * 0.018;
			if (i) c.lineTo(x, y);
			else c.moveTo(x, y);
		}
		c.stroke();
	} else if (rage) {
		const mw = S * 0.12;
		const chomp = 0.5 + 0.5 * Math.sin(t * 14);
		c.save();
		c.globalCompositeOperation = 'lighter';
		glow(c, fx, my, S * 0.14, RAGE_RGB, 0.55);
		c.restore();
		c.fillStyle = 'rgba(255, 236, 214, 0.95)';
		c.beginPath();
		c.moveTo(fx - mw, my - S * 0.025);
		for (let i = 0; i <= 6; i++) c.lineTo(fx - mw + (i / 6) * mw * 2, my - S * 0.025 + (i % 2 ? S * 0.03 : 0));
		for (let i = 6; i >= 0; i--) c.lineTo(fx - mw + (i / 6) * mw * 2, my + S * (0.02 + 0.025 * chomp) - (i % 2 ? S * 0.025 : 0));
		c.closePath();
		c.fill();
	} else if (mouth && f.mouth === 'smirk') {
		c.strokeStyle = `rgba(${lk.rim}, 0.9)`;
		c.lineWidth = S * 0.022;
		c.beginPath();
		c.moveTo(fx - S * 0.06, my);
		c.quadraticCurveTo(fx + S * 0.02, my + S * 0.035, fx + S * 0.08, my - S * 0.03);
		c.stroke();
	} else if (mouth && f.mouth === 'o') {
		c.strokeStyle = `rgba(${lk.rim}, 0.9)`;
		c.lineWidth = S * 0.02;
		c.beginPath();
		c.ellipse(fx, my, S * 0.022, S * 0.03, 0, 0, Math.PI * 2);
		c.stroke();
	}
}

/** The ambush's stain on the floor (the hive's black), its smoke wisp and its eyes. */
function drawStain(c: Ctx, S: number, kind: GhostKind, o: ShadeOpts, k: number): void {
	const t = o.time;
	const r = S * 0.34 * k;
	c.fillStyle = 'rgba(4, 3, 8, 0.92)';
	c.beginPath();
	const n = 11;
	for (let i = 0; i <= n; i++) {
		const a = (i / n) * Math.PI * 2;
		const rr = r * (0.82 + 0.22 * hash(i + 11)) * (1 + 0.03 * Math.sin(t * 1.6 + i));
		const x = Math.cos(a) * rr;
		const y = Math.sin(a) * rr * 0.8 + S * 0.06;
		if (i) c.lineTo(x, y);
		else c.moveTo(x, y);
	}
	c.closePath();
	c.fill();
	c.strokeStyle = `rgba(190, 210, 230, ${0.25 * k})`;
	c.lineWidth = S * 0.02;
	c.beginPath();
	c.ellipse(-r * 0.25, S * 0.06 - r * 0.32, r * 0.35, r * 0.12, -0.3, Math.PI * 1.1, Math.PI * 1.75);
	c.stroke();
	if (k < 0.9) return;
	for (let i = 0; i < 3; i++) {
		const u = (t * 0.35 + i / 3) % 1;
		const lk: Look = { ...stateLook(kind, 'hunt', o), rim: '0, 0, 0' };
		drawSmoke(c, [[Math.sin(t * 1.3 + i) * S * 0.06, S * 0.02 - u * S * 0.3, S * (0.05 + 0.05 * u), 0.55 * (1 - u)]], lk, 0);
	}
	const open = o.eyeOpen ?? 0;
	if (open > 0.02) drawFace(c, S, kind, 'hunt', { ...o, lookX: 0, lookY: 0 }, stateLook(kind, 'hunt', o), S * 0.04, open);
}

export function drawShade(c: Ctx, x: number, y: number, S: number, kind: GhostKind, st: ShadeState, look: ShadeLook, o: ShadeOpts): void {
	if (look === 'hood') {
		drawHood(c, x, y, S, kind, st, o);
		return;
	}
	const seed = ['BLINKY', 'PINKY', 'INKY', 'CLYDE'].indexOf(kind) * 13 + 1;
	c.save();
	c.translate(x, y);
	if (st === 'eyes') {
		// eaten: only its eyes run home, a thin gold wisp behind
		const lk: Look = { ...stateLook(kind, 'hunt', o), rim: EYES_RGB, white: '255, 246, 214' };
		drawSmoke(c, tailPuffs(S, o).map(([px, py, r, a]) => [px, py, r * 0.35, a * 0.6] as Puff), lk, 0.7);
		drawFace(c, S, kind, 'hunt', o, lk, 0, 1, false);
		c.restore();
		return;
	}
	if (st === 'mimic') {
		const k = clamp(o.fold ?? 0, 0, 1);
		drawStain(c, S, kind, o, smooth(0.35, 0.85, k));
		if (k < 0.97) {
			c.save();
			c.globalAlpha *= 1 - smooth(0.6, 0.97, k);
			c.translate(0, k * S * 0.2);
			c.scale(lerp(1, 1.2, k), lerp(1, 0.15, k));
			const lk = stateLook(kind, 'hunt', o);
			drawSmoke(c, headPuffs(S, kind, look, o), lk, 1);
			drawFace(c, S, kind, 'hunt', o, lk, S * 0.03);
			c.restore();
		}
		c.restore();
		return;
	}
	const lk = stateLook(kind, st, o);
	const turn = clamp(o.turn ?? 0, 0, 1);
	const rimA = st === 'rage' ? 1 : 0.95;
	// the tail first (behind), then the head stretched along its way; in a 180 it comes apart
	const sh = lk.shiver ? Math.sin(o.time * 47) * S * lk.shiver : 0;
	const bob = Math.sin(o.time * 3.1 + seed) * S * 0.02;
	const moving = (o.trail?.length ?? 0) > 0 ? 1 : 0;
	const stretch = moving * 0.08 * (1 - turn);
	const head = headPuffs(S, kind, look, o).map(([px, py, r, a]) => {
		// along the heading longer, across it narrower; a turn scatters the puffs into a ring
		const al = px * o.lookX + py * o.lookY;
		const sx = px + o.lookX * al * stretch - (o.lookY ? px * stretch * 0.6 : 0);
		const sy = py + o.lookY * al * stretch - (o.lookX ? py * stretch * 0.6 : 0);
		const ang = Math.atan2(py, px) + o.time * 3;
		return [
			lerp(sx, Math.cos(ang) * S * 0.24, turn) + sh,
			lerp(sy, Math.sin(ang) * S * 0.2, turn) + bob,
			r * (1 - 0.35 * turn),
			a
		] as Puff;
	});
	drawSmoke(c, [...tailPuffs(S, o), ...head], lk, rimA);
	// embers off the tail
	if (lk.embers > 0) {
		c.save();
		c.globalCompositeOperation = 'lighter';
		const m = Math.round(4 * lk.embers);
		for (let i = 0; i < m; i++) {
			const u = (o.time * (0.8 + hash(i + seed) * 0.6) + hash(i * 7 + seed)) % 1;
			const ex = (hash(i * 3 + seed) - 0.5) * S * 0.4 - o.lookX * u * S * 0.6;
			const ey = S * 0.1 - o.lookY * u * S * 0.6 - u * S * 0.2;
			c.fillStyle = `rgba(${lk.rim}, ${(1 - u) * 0.9})`;
			c.fillRect(ex - S * 0.015, ey - S * 0.015, S * 0.03, S * 0.03);
		}
		c.restore();
	}
	if (turn < 0.85) {
		c.save();
		c.globalAlpha *= 1 - smooth(0.4, 0.85, turn);
		c.translate(sh, bob);
		drawFace(c, S, kind, st, o, lk, S * 0.03);
		c.restore();
	}
	c.restore();
}

/** For the size check: the head's extent in tiles, the rim included (no tail). */
export const SHADE_HEAD_R = HEAD_R;

// ------------------------------------------------------------------------------ the hooded shade
// Round 3 (the owner, 2026-11-28, on the lacquer maze: the dark shade got lost, the old red hero
// stands out): the shade inverted. Its robe is solid and bright in its kind's colour, drawn the
// game's way (flat cel bands, a dark ink line, the key light from the top left, a contact shadow,
// a lacquer sheen on the hood); its face is the black void under the hood (the walls' lacquer: they
// are the hive) with its kind's eyes. The motion is the hem: its tatters stream back and two or three
// short wisps tear off it, no tail. Inside 0.9 of a tile.

/** Each kind's hood: the tip's height and lean to the side, how pointed, the robe's width. */
const HOOD: Readonly<Record<GhostKind, { tip: number; side: number; sharp: number; wide: number; tatters: number }>> = {
	BLINKY: { tip: 0.39, side: 0, sharp: 1, wide: 0.95, tatters: 4 },
	PINKY: { tip: 0.36, side: 0.12, sharp: 0.55, wide: 0.92, tatters: 4 },
	INKY: { tip: 0.37, side: -0.04, sharp: 0.7, wide: 0.88, tatters: 5 },
	CLYDE: { tip: 0.35, side: 0, sharp: 0.15, wide: 1.04, tatters: 3 }
};

function rgbOf(s: string): [number, number, number] {
	const [r, g, b] = s.split(',').map((v) => Number(v));
	return [r, g, b];
}
const tint = (c: readonly number[], k: number) =>
	c.map((v) => Math.round(k >= 1 ? v + (255 - v) * (k - 1) : v * k)).join(', ');

function robePath(c: Ctx, S: number, kind: GhostKind, o: ShadeOpts): void {
	const f = HOOD[kind];
	const t = o.time;
	const lean = o.lookX * 0.06;
	const W = 0.33 * f.wide;
	const ax = (f.side + lean) * S;
	const ay = -f.tip * S;
	const back = -o.lookX * 0.11;
	c.beginPath();
	c.moveTo(ax, ay);
	c.bezierCurveTo(
		ax + S * lerp(0.24, 0.1, f.sharp),
		ay + S * lerp(0.0, 0.08, f.sharp),
		S * (W * 0.92 + lean * 0.4),
		-S * 0.28,
		S * (W * 0.86 + lean * 0.2),
		-S * 0.08
	);
	c.quadraticCurveTo(S * W * 1.06, S * 0.12, S * (W * 1.02 + back * 0.4), S * 0.3);
	const n = f.tatters;
	for (let i = 0; i < n; i++) {
		const u = (i + 0.5) / n;
		const x = lerp(W * 1.02, -W * 1.02, u) + back * (0.6 + 0.4 * u);
		const y = 0.37 + 0.02 * Math.sin(t * 7 + i * 1.9) + (i % 2 ? -0.012 : 0.012);
		c.lineTo(x * S, y * S);
		const nx = lerp(W * 1.02, -W * 1.02, (i + 1) / n) + back;
		if (i < n - 1) c.lineTo(nx * S, (0.31 + 0.02 * Math.sin(t * 5 + i)) * S);
	}
	c.lineTo(S * (-W * 1.02 + back * 0.4), S * 0.3);
	c.quadraticCurveTo(-S * W * 1.06, S * 0.12, -S * (W * 0.86 - lean * 0.2), -S * 0.08);
	c.bezierCurveTo(
		-S * (W * 0.92 - lean * 0.4),
		-S * 0.28,
		ax - S * lerp(0.24, 0.1, f.sharp),
		ay + S * lerp(0.0, 0.08, f.sharp),
		ax,
		ay
	);
	c.closePath();
}

function drawHood(c: Ctx, x: number, y: number, S: number, kind: GhostKind, st: ShadeState, o: ShadeOpts): void {
	const f = HOOD[kind];
	const t = o.time;
	const rage = st === 'rage';
	const fright = st === 'fright';
	const base: [number, number, number] = fright
		? o.white
			? [236, 240, 255]
			: [52, 84, 232]
		: rage
			? [236, 44, 30]
			: rgbOf(KIND_RGB[kind]);
	const VOID = '9, 9, 13';
	const faceLook: Look = {
		rim: st === 'tell' ? TELL_RGB : rage ? '255, 210, 120' : fright ? '245, 248, 255' : KIND_RGB[kind],
		top: VOID,
		bottom: VOID,
		white: st === 'tell' ? '255, 226, 120' : rage ? '255, 244, 220' : fright ? '245, 248, 255' : mixWhite(KIND_RGB[kind], 0.78),
		shiver: 0,
		embers: 0
	};
	c.save();
	c.translate(x, y);
	if (st === 'eyes') {
		drawFace(c, S, kind, 'hunt', o, { ...faceLook, rim: EYES_RGB, white: '255, 246, 214' }, -S * 0.05, 1, false);
		c.restore();
		return;
	}
	const fold = st === 'mimic' ? clamp(o.fold ?? 0, 0, 1) : 0;
	if (st === 'mimic') drawStain(c, S, kind, o, smooth(0.35, 0.85, fold));
	if (fold > 0.97) {
		c.restore();
		return;
	}
	// the wisps tearing off the hem along its way (short: three at most)
	const tr = o.trail ?? [];
	for (let j = 0; j < Math.min(3, tr.length); j++) {
		const k = (j + 1) / 4;
		const p = tr[Math.min(tr.length - 1, j * 2 + 1)];
		const r = S * (0.09 - 0.022 * j);
		const wob = Math.sin(t * 6 + j * 2) * S * 0.04;
		c.fillStyle = `rgba(${tint(base, 1.25)}, ${0.55 * (1 - k)})`;
		c.beginPath();
		c.arc(p.x + wob, p.y + S * (0.3 - 0.05 * j) + wob * 0.5, r, 0, Math.PI * 2);
		c.fill();
	}
	// the contact shadow and a soft glow of its colour, inside its tile
	c.fillStyle = 'rgba(0, 0, 0, 0.32)';
	c.beginPath();
	c.ellipse(0, S * 0.37, S * 0.29 * (1 - fold * 0.3), S * 0.06, 0, 0, Math.PI * 2);
	c.fill();
	glow(c, 0, 0, S * 0.5, base.join(', '), 0.16 * (1 - fold));
	c.save();
	const turn = clamp(o.turn ?? 0, 0, 1);
	const crouch = st === 'tell' ? 0.92 : 1;
	const shiver = st === 'tell' || fright ? Math.sin(t * 47) * S * 0.018 : 0;
	const bob = Math.sin(t * 3.2 + KIND_RGB[kind].length) * S * 0.018;
	c.translate(shiver, bob + fold * S * 0.25 + (1 - crouch) * S * 0.3);
	c.scale(Math.max(0.12, 1 - 1.7 * turn) * lerp(1, 1.25, fold), crouch * lerp(1, 0.15, fold));
	c.globalAlpha *= 1 - smooth(0.6, 0.97, fold);
	// the robe: flat cel bands clipped to it, the ink line, the lacquer sheen on the hood
	robePath(c, S, kind, o);
	c.fillStyle = `rgb(${base.join(', ')})`;
	c.fill();
	c.save();
	c.clip();
	c.fillStyle = `rgb(${tint(base, 0.62)})`;
	c.beginPath();
	c.ellipse(S * 0.3, S * 0.32, S * 0.42, S * 0.34, -0.5, 0, Math.PI * 2);
	c.fill();
	c.fillStyle = `rgb(${tint(base, 1.28)})`;
	c.beginPath();
	c.ellipse(-S * 0.2, -S * 0.22, S * 0.17, S * 0.24, 0.5, 0, Math.PI * 2);
	c.fill();
	c.restore();
	robePath(c, S, kind, o);
	c.strokeStyle = `rgb(${tint(base, 0.28)})`;
	c.lineWidth = S * 0.05;
	c.lineJoin = 'round';
	c.stroke();
	c.strokeStyle = 'rgba(255, 255, 255, 0.55)';
	c.lineWidth = S * 0.035;
	c.lineCap = 'round';
	c.beginPath();
	const hx0 = (f.side * 0.5 + o.lookX * 0.03) * S;
	c.arc(hx0, -S * 0.12, S * 0.24, Math.PI * 1.18, Math.PI * 1.42);
	c.stroke();
	// the face: the void under the hood, the hive's lacquer, its eyes inside
	const fx = (f.side * 0.45 + o.lookX * 0.06) * S;
	const fy = -S * 0.12 + o.lookY * S * 0.03;
	c.fillStyle = `rgb(${VOID})`;
	c.beginPath();
	c.ellipse(fx, fy, S * 0.2 * f.wide, S * (rage ? 0.19 : 0.155), 0, 0, Math.PI * 2);
	c.fill();
	c.strokeStyle = 'rgba(200, 214, 230, 0.28)';
	c.lineWidth = S * 0.02;
	c.beginPath();
	c.ellipse(fx, fy, S * 0.17 * f.wide, S * 0.12, 0, Math.PI * 1.1, Math.PI * 1.5);
	c.stroke();
	c.save();
	c.translate(fx - o.lookX * S * 0.05, 0);
	drawFace(c, S * 0.92, kind, st === 'mimic' ? 'hunt' : st, o, faceLook, fy - o.lookY * S * 0.03, 1, false);
	c.restore();
	c.restore();
	c.restore();
}
