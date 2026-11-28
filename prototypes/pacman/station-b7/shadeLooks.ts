// Candidates for the station's v4 creature, the shade («Морок», DESIGN.md §7a, the first block):
// a dark tattered shroud whose hem dissolves into smoke, a bright core and eyes in its kind's
// colour, a rim light, a smoke trail behind it that shows the motion; a 180 goes through smoke; the
// ambush is a black stain. Three looks for the owner's pick, on the `station-b7` page:
//   a  «Саван»: a hooded shroud, the eyes in the hood's dark, a tattered hem streaming back;
//   b  «Дым»: no hard outline, a churning column of smoke puffs rimmed in colour, a heart glowing
//      through the smoke;
//   c  «Жнец»: the shroud with two long clawed hands reaching along its way.
// Drawn at the tile `S` round (x, y); upright, the eyes show the heading.
import type { GhostKind } from '../../../src/games/pacman/logic/actors/GhostModel';

export type ShadeLook = 'a' | 'b' | 'c';
export type ShadeState = 'hunt' | 'tell' | 'rage' | 'fright' | 'eyes' | 'mimic';

export interface ShadeOpts {
	readonly lookX: number;
	readonly lookY: number;
	readonly time: number;
	/** Its past points relative to (x, y), px, newest first (the smoke trail). */
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
const TELL_RGB = '255, 205, 70';
const SCARED_RGB = '110, 140, 255';
const RAGE_RGB = '255, 64, 40';
const EYES_RGB = '255, 210, 90';

/** Each kind's character: the hood's peak (height, lean to the side, sharpness), the width, the
 *  eyes (slant: angry > 0, sad < 0; lid: the cover from above), the hem's tatters and flutter. */
const KIND_FORM: Readonly<
	Record<
		GhostKind,
		{ peak: number; side: number; sharp: number; wide: number; slant: number; lid: number; tatters: number; flutter: number; wisps: number }
	>
> = {
	BLINKY: { peak: 0.52, side: 0, sharp: 1, wide: 1, slant: 0.55, lid: 0.25, tatters: 5, flutter: 1.2, wisps: 0 },
	PINKY: { peak: 0.47, side: 0.13, sharp: 0.7, wide: 0.9, slant: -0.1, lid: 0.45, tatters: 5, flutter: 1, wisps: 0 },
	INKY: { peak: 0.48, side: -0.04, sharp: 0.6, wide: 0.95, slant: -0.3, lid: 0, tatters: 7, flutter: 1.5, wisps: 2 },
	CLYDE: { peak: 0.4, side: 0, sharp: 0.2, wide: 1.12, slant: -0.15, lid: 0.55, tatters: 4, flutter: 0.6, wisps: 0 }
};

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const smooth = (e0: number, e1: number, x: number) => {
	const k = clamp((x - e0) / (e1 - e0), 0, 1);
	return k * k * (3 - 2 * k);
};
/** A seeded 0..1 noise, stable per index. */
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

/** A dark puff of smoke, soft-edged. */
function puff(c: Ctx, x: number, y: number, r: number, a: number, dark = '10, 7, 20'): void {
	if (a <= 0 || r <= 0) return;
	const g = c.createRadialGradient(x, y, 0, x, y, r);
	g.addColorStop(0, `rgba(${dark}, ${a})`);
	g.addColorStop(0.6, `rgba(${dark}, ${a * 0.75})`);
	g.addColorStop(1, `rgba(${dark}, 0)`);
	c.fillStyle = g;
	c.beginPath();
	c.arc(x, y, r, 0, Math.PI * 2);
	c.fill();
}

interface Look {
	rim: string;
	eye: string;
	/** The shroud's fill, top and bottom. */
	top: string;
	bottom: string;
	swell: number;
	shiver: number;
	embers: number;
}

function stateLook(kind: GhostKind, st: ShadeState, o: ShadeOpts): Look {
	const k = KIND_RGB[kind];
	if (st === 'fright') {
		const w = !!o.white;
		return {
			rim: w ? '240, 244, 255' : SCARED_RGB,
			eye: '245, 248, 255',
			top: w ? '200, 206, 230' : '38, 50, 140',
			bottom: w ? '150, 158, 190' : '18, 24, 80',
			swell: 0.86,
			shiver: 0.03,
			embers: 0
		};
	}
	if (st === 'tell') return { rim: TELL_RGB, eye: TELL_RGB, top: '30, 24, 40', bottom: '8, 6, 14', swell: 1.08, shiver: 0.02, embers: 0.6 };
	if (st === 'rage') return { rim: RAGE_RGB, eye: '255, 240, 220', top: '34, 10, 12', bottom: '10, 3, 6', swell: 1.12, shiver: 0.012, embers: 1.6 };
	return { rim: k, eye: k, top: '30, 24, 46', bottom: '8, 6, 16', swell: 1, shiver: 0, embers: 0.5 };
}

/** The smoke trail along its past points, oldest first: coloured haze under dark puffs, embers. */
function drawTrail(c: Ctx, S: number, o: ShadeOpts, lk: Look, seed: number): void {
	const tr = o.trail ?? [];
	const n = tr.length;
	if (!n) return;
	c.save();
	c.globalCompositeOperation = 'lighter';
	for (let i = n - 1; i >= 0; i--) {
		const k = (i + 1) / (n + 1);
		glow(c, tr[i].x, tr[i].y, S * (0.5 - 0.22 * k), lk.rim, 0.3 * (1 - k));
	}
	// two streaks of its colour off the hem, like a flight through the air, tapering away
	for (const side of [-1, 1]) {
		for (let i = 0; i < n; i++) {
			const k0 = i / (n + 1);
			const k1 = (i + 1) / (n + 1);
			const p0 = i ? tr[i - 1] : { x: 0, y: 0 };
			const p1 = tr[i];
			const dx = p1.x - p0.x;
			const dy = p1.y - p0.y;
			const len = Math.hypot(dx, dy) || 1;
			const nx = -dy / len;
			const ny = dx / len;
			const off = (u: number) => side * S * (0.16 - 0.06 * u) + Math.sin(o.time * 7 + u * 9 + side) * S * 0.04;
			c.strokeStyle = `rgba(${lk.rim}, ${0.7 * (1 - k1)})`;
			c.lineWidth = S * 0.05 * (1 - k0);
			c.lineCap = 'round';
			c.beginPath();
			c.moveTo(p0.x + nx * off(k0), p0.y + S * 0.18 + ny * off(k0));
			c.lineTo(p1.x + nx * off(k1), p1.y + S * 0.18 + ny * off(k1));
			c.stroke();
		}
	}
	c.restore();
	for (let i = n - 1; i >= 0; i--) {
		const k = (i + 1) / (n + 1);
		const wob = Math.sin(o.time * 5 + i * 1.7 + seed) * S * 0.05;
		puff(c, tr[i].x + wob * 0.6, tr[i].y + wob, S * (0.3 - 0.18 * k), 0.5 * (1 - k));
	}
	// embers left in the smoke, rising and dying
	c.save();
	c.globalCompositeOperation = 'lighter';
	for (let i = 0; i < n; i++) {
		if (hash(i + seed * 7) > 0.45 * (1 + lk.embers)) continue;
		const k = (i + 1) / (n + 1);
		const ex = tr[i].x + (hash(i * 3 + seed) - 0.5) * S * 0.4;
		const ey = tr[i].y + (hash(i * 5 + seed) - 0.5) * S * 0.3 - k * S * 0.25;
		const a = (1 - k) * (0.6 + 0.4 * Math.sin(o.time * 11 + i));
		c.fillStyle = `rgba(${lk.rim}, ${a})`;
		c.fillRect(ex - S * 0.018, ey - S * 0.018, S * 0.036, S * 0.036);
	}
	c.restore();
}

/** The shroud's outline in local units (the tile `S`, the origin its centre), leaning with the
 *  heading, its hem's tatters streaming back. */
function shroudPath(c: Ctx, S: number, kind: GhostKind, o: ShadeOpts, hemLift: number): void {
	const f = KIND_FORM[kind];
	const t = o.time;
	const lean = o.lookX * 0.07;
	const W = 0.34 * f.wide;
	const apexX = (f.side + lean) * S;
	const apexY = -f.peak * S;
	c.beginPath();
	c.moveTo(apexX, apexY);
	// the hood's right side to the shoulder, sharp or round
	c.bezierCurveTo(
		apexX + S * lerp(0.26, 0.12, f.sharp),
		apexY + S * lerp(0.02, 0.1, f.sharp),
		S * (W * 0.95 + lean * 0.5),
		-S * 0.3,
		S * (W * 0.88 + lean * 0.3),
		-S * 0.1
	);
	c.quadraticCurveTo(S * (W * 1.08), S * 0.12, S * W * 1.04, S * 0.26);
	// the tattered hem, right to left
	const n = f.tatters;
	const back = -o.lookX * 0.2;
	for (let i = 0; i < n; i++) {
		const tx = lerp(W * 1.04, -W * 1.04, (i + 0.5) / n);
		const tipX = (tx + back * (0.5 + 0.5 * hash(i + 3))) * S + Math.sin(t * 5 * f.flutter + i * 2.1) * S * 0.03;
		const tipY = (0.44 + 0.06 * hash(i) - hemLift + 0.035 * Math.sin(t * 6 * f.flutter + i * 1.3)) * S;
		c.lineTo(tipX, tipY);
		const nx = lerp(W * 1.04, -W * 1.04, (i + 1) / n);
		if (i < n - 1) c.lineTo((nx + back * 0.3) * S, (0.31 - hemLift * 0.6) * S);
		else c.lineTo(nx * S, S * 0.26);
	}
	c.quadraticCurveTo(-S * W * 1.08, S * 0.12, -S * (W * 0.88 - lean * 0.3), -S * 0.1);
	c.bezierCurveTo(
		-S * (W * 0.95 - lean * 0.5),
		-S * 0.3,
		apexX - S * lerp(0.26, 0.12, f.sharp),
		apexY + S * lerp(0.02, 0.1, f.sharp),
		apexX,
		apexY
	);
	c.closePath();
}

/** Two eyes at the hood's centre (hx, hy), looking along the heading, slanted by the kind. */
function drawEyes(c: Ctx, S: number, kind: GhostKind, st: ShadeState, o: ShadeOpts, hx: number, hy: number, lk: Look, open = 1): void {
	const f = KIND_FORM[kind];
	const lx = o.lookX * S * 0.055;
	const ly = o.lookY * S * 0.04;
	const gap = S * (kind === 'INKY' ? 0.1 : 0.088);
	const ew = S * (st === 'fright' ? 0.026 : kind === 'INKY' ? 0.05 : 0.046);
	const eh = S * (st === 'fright' ? 0.026 : 0.034) * open * (st === 'rage' ? 0.55 : 1 - f.lid * 0.45);
	const slant = st === 'rage' ? 0.6 : st === 'fright' ? 0 : f.slant;
	c.save();
	c.globalCompositeOperation = 'lighter';
	glow(c, hx + lx, hy + ly, S * 0.2, lk.eye, 0.5 * open);
	c.restore();
	for (const side of [-1, 1]) {
		const ex = hx + lx + side * gap;
		const ey = hy + ly;
		c.save();
		c.translate(ex, ey);
		c.rotate(side * slant * 0.5);
		c.fillStyle = `rgb(${lk.eye})`;
		c.beginPath();
		c.ellipse(0, 0, ew, Math.max(0.5, eh), 0, 0, Math.PI * 2);
		c.fill();
		// a white-hot centre
		c.fillStyle = 'rgba(255, 252, 240, 0.95)';
		c.beginPath();
		c.ellipse(o.lookX * ew * 0.25, o.lookY * eh * 0.2, ew * 0.45, Math.max(0.4, eh * 0.5), 0, 0, Math.PI * 2);
		c.fill();
		c.restore();
	}
	if (st === 'fright') {
		// the classic wavy mouth
		c.strokeStyle = 'rgba(245, 248, 255, 0.9)';
		c.lineWidth = S * 0.022;
		c.beginPath();
		for (let i = 0; i <= 6; i++) {
			const x = hx - S * 0.11 + (i / 6) * S * 0.22;
			const y = hy + S * 0.1 + (i % 2 ? -1 : 1) * S * 0.02;
			if (i) c.lineTo(x, y);
			else c.moveTo(x, y);
		}
		c.stroke();
	}
	if (st === 'rage') {
		// a jagged maw glowing white-hot under the eyes
		c.save();
		c.globalCompositeOperation = 'lighter';
		glow(c, hx, hy + S * 0.11, S * 0.16, RAGE_RGB, 0.6);
		c.restore();
		c.fillStyle = 'rgba(255, 236, 210, 0.95)';
		c.beginPath();
		const mw = S * 0.13;
		const chomp = 0.5 + 0.5 * Math.sin(o.time * 14);
		c.moveTo(hx - mw, hy + S * 0.08);
		for (let i = 0; i <= 6; i++) c.lineTo(hx - mw + (i / 6) * mw * 2, hy + S * (0.08 + (i % 2 ? 0.035 : 0)));
		for (let i = 6; i >= 0; i--) c.lineTo(hx - mw + (i / 6) * mw * 2, hy + S * (0.12 + 0.03 * chomp + (i % 2 ? -0.03 : 0)));
		c.closePath();
		c.fill();
	}
}

/** Two long clawed hands reaching along its way (look c). */
function drawHands(c: Ctx, S: number, o: ShadeOpts, lk: Look, kind: GhostKind): void {
	const t = o.time;
	const dx = o.lookX;
	const dy = o.lookY;
	// along the way; up and down the hands still reach out to the sides a little
	const ax = Math.abs(dx) > 0.5 ? dx : 0.35;
	for (const side of [-1, 1]) {
		const sx = side * S * 0.28;
		const sy = -S * 0.02;
		const reach = S * (0.36 + 0.05 * Math.sin(t * 4 + side));
		const tx = sx + (Math.abs(dx) > 0.5 ? ax * reach : side * reach * 0.55);
		const ty = sy + dy * reach * 0.8 + S * 0.06 + side * S * 0.04 * Math.abs(dx);
		const mx = (sx + tx) / 2;
		const my = (sy + ty) / 2 - S * 0.06;
		c.lineCap = 'round';
		c.strokeStyle = `rgba(${lk.rim}, 0.55)`;
		c.lineWidth = S * 0.085;
		c.beginPath();
		c.moveTo(sx, sy);
		c.quadraticCurveTo(mx, my, tx, ty);
		c.stroke();
		c.strokeStyle = 'rgb(14, 10, 22)';
		c.lineWidth = S * 0.05;
		c.stroke();
		// three claws, curling as they grasp
		const ang = Math.atan2(ty - my, tx - mx);
		const curl = 0.5 + 0.5 * Math.sin(t * 6 + side * 1.3 + (kind === 'CLYDE' ? 0 : 0.4));
		for (let j = -1; j <= 1; j++) {
			const a = ang + j * 0.5;
			const l = S * (0.11 + (j === 0 ? 0.02 : 0));
			const bx = tx + Math.cos(a) * l;
			const by = ty + Math.sin(a) * l;
			const cx = bx + Math.cos(a + side * (0.6 + curl)) * l * 0.6;
			const cy = by + Math.sin(a + side * (0.6 + curl)) * l * 0.6;
			c.strokeStyle = `rgba(${lk.rim}, 0.9)`;
			c.lineWidth = S * 0.026;
			c.beginPath();
			c.moveTo(tx, ty);
			c.lineTo(bx, by);
			c.lineTo(cx, cy);
			c.stroke();
		}
	}
}

/** Look a and c: the hooded shroud. */
function drawShroud(c: Ctx, S: number, kind: GhostKind, st: ShadeState, o: ShadeOpts, lk: Look, hands: boolean): void {
	const f = KIND_FORM[kind];
	if (hands && st !== 'fright') drawHands(c, S, o, lk, kind);
	shroudPath(c, S, kind, o, hands ? 0.06 : 0);
	// the rim's soft outer light, then the body, then the crisp rim
	c.save();
	c.globalCompositeOperation = 'lighter';
	c.strokeStyle = `rgba(${lk.rim}, 0.22)`;
	c.lineWidth = S * 0.14;
	c.lineJoin = 'round';
	c.stroke();
	c.restore();
	const g = c.createLinearGradient(0, -f.peak * S, 0, S * 0.46);
	g.addColorStop(0, `rgb(${lk.top})`);
	g.addColorStop(0.7, `rgb(${lk.bottom})`);
	g.addColorStop(1, `rgba(${lk.bottom}, 0.55)`);
	c.fillStyle = g;
	c.fill();
	c.strokeStyle = `rgba(${lk.rim}, 0.92)`;
	c.lineWidth = S * 0.04;
	c.stroke();
	// a fold of the cloth down the front, lit on its edge
	c.strokeStyle = `rgba(${lk.rim}, 0.28)`;
	c.lineWidth = S * 0.02;
	c.beginPath();
	c.moveTo(S * (f.side * 0.4 + o.lookX * 0.05), -S * 0.08);
	c.quadraticCurveTo(S * (0.06 - o.lookX * 0.05), S * 0.14, S * (-0.02 - o.lookX * 0.12), S * 0.36);
	c.stroke();
	// the hood's opening: a pit of dark with its colour deep inside
	const hx = S * (f.side * 0.45 + o.lookX * 0.07);
	const hy = -S * (f.peak * 0.42 + 0.02) + o.lookY * S * 0.03;
	c.fillStyle = 'rgb(2, 1, 5)';
	c.beginPath();
	c.ellipse(hx, hy, S * 0.19 * f.wide, S * 0.15, 0, 0, Math.PI * 2);
	c.fill();
	c.save();
	c.globalCompositeOperation = 'lighter';
	glow(c, hx, hy + S * 0.04, S * 0.17, lk.rim, 0.18);
	c.restore();
	drawEyes(c, S, kind, st, o, hx, hy, lk);
}

/** Look b: a churning column of smoke puffs rimmed in colour, a heart glowing through. */
function drawSmoke(c: Ctx, S: number, kind: GhostKind, st: ShadeState, o: ShadeOpts, lk: Look): void {
	const f = KIND_FORM[kind];
	const t = o.time;
	const back = -o.lookX;
	const puffs: Array<[number, number, number]> = [];
	// the head, then the body narrowing into the smoke that streams back
	puffs.push([o.lookX * 0.06 + f.side * 0.5, -f.peak * 0.62, 0.25 * f.wide]);
	const n = 6;
	for (let i = 0; i < n; i++) {
		const u = i / (n - 1);
		const ang = t * (2.2 + hash(i) * 1.5) * f.flutter + i * 2.4;
		puffs.push([
			Math.cos(ang) * 0.07 + back * u * 0.2 + (i % 2 ? 0.12 : -0.12) * f.wide * (1 - u * 0.5),
			-0.1 + u * 0.46 + Math.sin(ang) * 0.03,
			(0.24 - u * 0.1) * f.wide
		]);
	}
	// the colour first, a little larger: under the dark it reads as a rim round the whole union
	for (const [x, y, r] of puffs) {
		const g = c.createRadialGradient(x * S, y * S, 0, x * S, y * S, r * S * 1.3);
		g.addColorStop(0, `rgba(${lk.rim}, 1)`);
		g.addColorStop(0.78, `rgba(${lk.rim}, 1)`);
		g.addColorStop(1, `rgba(${lk.rim}, 0)`);
		c.fillStyle = g;
		c.beginPath();
		c.arc(x * S, y * S, r * S * 1.3, 0, Math.PI * 2);
		c.fill();
	}
	for (const [x, y, r] of puffs) {
		const g = c.createRadialGradient(x * S - r * S * 0.3, y * S - r * S * 0.3, 0, x * S, y * S, r * S);
		g.addColorStop(0, `rgb(${lk.top})`);
		g.addColorStop(0.8, `rgb(${lk.bottom})`);
		g.addColorStop(1, `rgba(${lk.bottom}, 0.6)`);
		c.fillStyle = g;
		c.beginPath();
		c.arc(x * S, y * S, r * S, 0, Math.PI * 2);
		c.fill();
	}
	// the heart glowing through the smoke
	if (st !== 'fright') {
		const beat = 0.75 + 0.25 * Math.sin(t * 5);
		c.save();
		c.globalCompositeOperation = 'lighter';
		glow(c, back * S * 0.03, S * 0.08, S * 0.2, lk.rim, 0.55 * beat);
		c.fillStyle = `rgba(255, 245, 230, ${0.7 * beat})`;
		c.beginPath();
		c.arc(back * S * 0.03, S * 0.08, S * 0.03, 0, Math.PI * 2);
		c.fill();
		c.restore();
	}
	const [hx, hy] = puffs[0];
	c.fillStyle = 'rgba(2, 1, 5, 0.85)';
	c.beginPath();
	c.ellipse(hx * S, hy * S + S * 0.02, S * 0.15, S * 0.11, 0, 0, Math.PI * 2);
	c.fill();
	drawEyes(c, S, kind, st, o, hx * S, hy * S + S * 0.02, lk);
}

/** INKY's two little wisps orbiting it (its phantom nature). */
function drawWisps(c: Ctx, S: number, kind: GhostKind, o: ShadeOpts, lk: Look): void {
	const n = KIND_FORM[kind].wisps;
	for (let i = 0; i < n; i++) {
		const a = o.time * 2.6 + (i * Math.PI * 2) / n;
		const x = Math.cos(a) * S * 0.46;
		const y = Math.sin(a) * S * 0.2 - S * 0.05;
		c.save();
		c.globalCompositeOperation = 'lighter';
		glow(c, x, y, S * 0.12, lk.rim, 0.35);
		c.restore();
		puff(c, x, y, S * 0.07, 0.8);
		c.fillStyle = `rgba(${lk.eye}, 0.95)`;
		c.fillRect(x - S * 0.015, y - S * 0.01, S * 0.03, S * 0.02);
	}
}

/** The ambush's stain on the floor (the hive's black), its smoke wisp and its eyes. */
function drawStain(c: Ctx, S: number, kind: GhostKind, o: ShadeOpts, k: number): void {
	const t = o.time;
	const r = S * 0.36 * k;
	c.save();
	c.fillStyle = 'rgba(4, 3, 8, 0.92)';
	c.beginPath();
	const n = 11;
	for (let i = 0; i <= n; i++) {
		const a = (i / n) * Math.PI * 2;
		const rr = r * (0.82 + 0.26 * hash(i + 11)) * (1 + 0.03 * Math.sin(t * 1.6 + i));
		const x = Math.cos(a) * rr;
		const y = Math.sin(a) * rr * 0.78 + S * 0.08;
		if (i) c.lineTo(x, y);
		else c.moveTo(x, y);
	}
	c.closePath();
	c.fill();
	// a cold wet glint, as the hive's black has
	c.strokeStyle = `rgba(190, 210, 230, ${0.25 * k})`;
	c.lineWidth = S * 0.02;
	c.beginPath();
	c.ellipse(-r * 0.25, S * 0.08 - r * 0.32, r * 0.35, r * 0.12, -0.3, Math.PI * 1.1, Math.PI * 1.75);
	c.stroke();
	c.restore();
	if (k < 0.9) return;
	// a wisp of smoke rising off it, slow
	for (let i = 0; i < 3; i++) {
		const u = (t * 0.35 + i / 3) % 1;
		puff(c, Math.sin(t * 1.3 + i) * S * 0.08, S * 0.04 - u * S * 0.5, S * (0.07 + 0.08 * u), 0.5 * (1 - u));
	}
	const open = o.eyeOpen ?? 0;
	if (open > 0.02) {
		const lk = stateLook(kind, 'hunt', o);
		drawEyes(c, S, kind, 'hunt', o, 0, S * 0.06, lk, open);
	}
}

export function drawShade(c: Ctx, x: number, y: number, S: number, kind: GhostKind, st: ShadeState, look: ShadeLook, o: ShadeOpts): void {
	const lk = stateLook(kind, st, o);
	const seed = ['BLINKY', 'PINKY', 'INKY', 'CLYDE'].indexOf(kind) * 13 + 1;
	c.save();
	c.translate(x, y);
	if (st === 'eyes') {
		const elk = { ...lk, eye: EYES_RGB, rim: EYES_RGB };
		drawTrail(c, S, o, { ...elk, embers: 0 }, seed);
		drawEyes(c, S, kind, 'hunt', o, 0, -S * 0.08, elk);
		c.restore();
		return;
	}
	if (st === 'mimic') {
		const k = clamp(o.fold ?? 0, 0, 1);
		drawStain(c, S, kind, o, smooth(0.35, 0.85, k));
		if (k < 0.97) {
			// it sinks into the floor, its smoke running into the stain
			c.save();
			c.globalAlpha *= 1 - smooth(0.6, 0.97, k);
			c.translate(0, k * S * 0.3);
			c.scale(lerp(1, 1.3, k), lerp(1, 0.15, k));
			body(c, S, kind, 'hunt', look, o, stateLook(kind, 'hunt', o));
			c.restore();
		}
		c.restore();
		return;
	}
	drawTrail(c, S, o, lk, seed);
	const turn = clamp(o.turn ?? 0, 0, 1);
	if (turn > 0) {
		// a 180 through smoke: the body comes apart into a ring of puffs and forms facing back
		for (let i = 0; i < 7; i++) {
			const a = (i / 7) * Math.PI * 2 + o.time * 3;
			puff(c, Math.cos(a) * S * 0.3 * turn, Math.sin(a) * S * 0.24 * turn, S * 0.17, 0.8 * turn);
		}
	}
	c.save();
	const sh = lk.shiver ? Math.sin(o.time * 47) * S * lk.shiver : 0;
	const bob = Math.sin(o.time * 3.1 + seed) * S * 0.025;
	c.translate(sh, bob);
	c.scale(lk.swell * (1 - 0.75 * turn), lk.swell * (1 - 0.2 * turn));
	c.globalAlpha *= 1 - 0.7 * turn;
	body(c, S, kind, st, look, o, lk);
	c.restore();
	// embers coming off its edges
	if (lk.embers > 0) {
		c.save();
		c.globalCompositeOperation = 'lighter';
		const m = Math.round(4 * lk.embers);
		for (let i = 0; i < m; i++) {
			const u = (o.time * (0.7 + hash(i + seed) * 0.6) + hash(i * 7 + seed)) % 1;
			const ex = (hash(i * 3 + seed) - 0.5) * S * 0.7 - o.lookX * u * S * 0.3;
			const ey = S * 0.2 - u * S * 0.7;
			c.fillStyle = `rgba(${lk.rim}, ${(1 - u) * 0.9})`;
			c.fillRect(ex - S * 0.016, ey - S * 0.016, S * 0.032, S * 0.032);
		}
		c.restore();
	}
	c.restore();
}

function body(c: Ctx, S: number, kind: GhostKind, st: ShadeState, look: ShadeLook, o: ShadeOpts, lk: Look): void {
	if (look === 'b') drawSmoke(c, S, kind, st, o, lk);
	else drawShroud(c, S, kind, st, o, lk, look === 'c');
	if (st !== 'fright') drawWisps(c, S, kind, o, lk);
}
