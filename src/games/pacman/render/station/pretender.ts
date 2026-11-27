// The station's squad creature (DESIGN.md §7a): since 2026-11-26 the amoeba (the owner's pick of
// the `station-b7` page's jelly candidates, after the Pretender in its mask and the parasites:
// at a tile's size only a silhouette, a bright patch of colour and motion read). A gel lit from
// inside, brightest at its membrane (a jellyfish against the light, not a sweet), in its kind's
// colour on the black hive; its eyes two dark nuclei drifting toward its heading (no face); its
// form flows, a pseudopod shooting out ahead and drawing back (the threat); the kind told by its
// colour and the character of its form: spiky lunges, many small lobes, long thin threads, heavy
// lumps. No feet, no rocking: it wobbles. The tell turns the nuclei gold; the fright is the classic
// blue and white; the rage boils it lime, the hive's life (no afterimages, the owner); eaten, its
// eyes run home; it sinks into the level's spore for the disguise. The name stays: it pretends.
import type { GhostKind } from '../../logic/actors/GhostModel';

export type PretenderState = 'hunt' | 'tell' | 'rage' | 'fright' | 'eyes' | 'mimic';

export interface PretenderOpts {
	/** The heading as a unit vector, instant (the eyes). */
	readonly lookX: number;
	readonly lookY: number;
	/** The heading eased. */
	readonly faceX: number;
	readonly faceY: number;
	readonly time: number;
	/** Distance travelled as a stride phase (radians). */
	readonly step: number;
	/** The mimicry: 0 the creature .. 1 the spore. */
	readonly fold?: number;
	/** The rage coming on: 0 calm .. 1 boiling. */
	readonly reveal?: number;
	/** The fright about to end, and the white half of its blink. */
	readonly flashing?: boolean;
	readonly white?: boolean;
	/** Paints the level's spore at the origin with this alpha and scale (the disguise). */
	readonly spore?: (c: CanvasRenderingContext2D, alpha: number, scale: number) => void;
}

type Ctx = CanvasRenderingContext2D;
/** Edge (bright), mid, core (dark) of a gel; its glow's rgb. */
type Gel = {
	readonly edge: string;
	readonly mid: string;
	readonly core: string;
	readonly rgb: string;
};

const TAU = Math.PI * 2;
export const INK = '#241418';
const GEL: Readonly<Record<GhostKind, Gel>> = {
	BLINKY: {
		edge: '#ff7a68',
		mid: 'rgba(214, 54, 54, 0.9)',
		core: 'rgba(52, 6, 10, 0.92)',
		rgb: '255, 96, 80'
	},
	PINKY: {
		edge: '#ff9ae6',
		mid: 'rgba(196, 70, 160, 0.9)',
		core: 'rgba(48, 10, 40, 0.92)',
		rgb: '255, 130, 225'
	},
	INKY: {
		edge: '#7df4ff',
		mid: 'rgba(34, 156, 190, 0.9)',
		core: 'rgba(6, 36, 48, 0.92)',
		rgb: '90, 230, 255'
	},
	CLYDE: {
		edge: '#ffbe62',
		mid: 'rgba(206, 116, 30, 0.9)',
		core: 'rgba(52, 26, 6, 0.92)',
		rgb: '255, 176, 70'
	}
};
const SCARED: Gel = {
	edge: '#a9b8ff',
	mid: 'rgba(58, 80, 214, 0.9)',
	core: 'rgba(14, 20, 80, 0.92)',
	rgb: '96, 120, 255'
};
const WHITE: Gel = {
	edge: '#ffffff',
	mid: 'rgba(214, 222, 246, 0.92)',
	core: 'rgba(150, 160, 196, 0.92)',
	rgb: '230, 236, 255'
};
/** The rage: boiling in the hive's lime. */
const RAGE: Gel = {
	edge: '#e4ff8a',
	mid: 'rgba(120, 210, 40, 0.92)',
	core: 'rgba(22, 48, 8, 0.94)',
	rgb: '170, 255, 70'
};
export const PHASE: Readonly<Record<GhostKind, number>> = {
	BLINKY: 0,
	PINKY: 0.8,
	INKY: 1.6,
	CLYDE: 2.4
};
/** The body's size in the cute ghosts' frame: a little larger than theirs (the owner, twice). */
const SCALE = 1.08 * 1.075;
/** The glow round it; the rage's 10% smaller (the owner). */
const HALO_R = 0.82;
const RAGE_HALO = 0.9;

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (e0: number, e1: number, x: number) => {
	const k = clamp((x - e0) / (e1 - e0), 0, 1);
	return k * k * (3 - 2 * k);
};
/** The angle between two headings, -PI..PI. */
const diff = (a: number, b: number) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

/** The game's ghost state to the creature's look. */
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
	/** The heading eased, per second (exponential). */
	face: 12,
	/** The stride, radians of the step's phase per tile travelled. */
	stride: 5.7,
	/** The rage coming on (and going), seconds. */
	reveal: 0.22,
	/** A step longer than this is a jump (a tunnel, back to the lair), tiles. */
	jump: 1.5
} as const;

/** How it moves on the rails: drawn at its real point (no glide), its heading turned at once for
 *  the eyes, eased for the body, its stride counted from the distance, the rage coming on. */
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

function stroke(c: Ctx, color: string, w: number): void {
	c.strokeStyle = color;
	c.lineWidth = w;
	c.lineCap = 'round';
	c.lineJoin = 'round';
	c.stroke();
}

/** The way it goes as an angle (down when it does not say). */
const heading = (o: PretenderOpts) =>
	o.lookX || o.lookY ? Math.atan2(o.lookY, o.lookX) : Math.PI / 2;

/** Its outline: a radius per angle; the lunge ahead, its kind's character, the rage's boil. */
function amoebaR(
	kind: GhostKind,
	o: PretenderOpts,
	st: PretenderState,
	ph: number
): (a: number) => number {
	const t = o.time;
	const rage = st === 'rage';
	const tell = st === 'tell';
	const h = heading(o);
	// the lunge: a pseudopod shooting out ahead and drawing back
	const lunge = 0.35 + 0.65 * Math.max(0, Math.sin(t * (rage ? 6 : 2.4) + ph)) ** 2;
	const ahead = (st === 'fright' ? 0.6 : 3.2) * lunge * (tell ? 1.3 : 1);
	const rot = t * (kind === 'CLYDE' ? 0.25 : 0.6) + ph;
	return (a: number) => {
		let r = 8.2;
		if (kind === 'BLINKY') r += Math.max(0, Math.cos(5 * (a - rot))) ** 6 * 3.2;
		else if (kind === 'PINKY') r += (0.5 + 0.5 * Math.cos(8 * (a - rot))) ** 1.5 * 1.5;
		else if (kind === 'INKY') r += Math.max(0, Math.cos(3 * (a - rot))) ** 18 * 5.4;
		else r += (0.5 + 0.5 * Math.cos(3 * (a - rot))) ** 2 * 2.4;
		r += Math.exp(-((diff(a, h) / 0.38) ** 2)) * ahead;
		if (rage)
			r += Math.sin(a * 7 + t * 12) * 0.9 + Math.max(0, Math.cos(4 * (a + t * 2))) ** 8 * 2.5;
		r += Math.sin(a * 3 + t * 2.2 + ph) * 0.35;
		return r * (st === 'fright' ? 0.92 : 1);
	};
}

function polar(c: Ctx, r: (a: number) => number, n = 72): void {
	c.beginPath();
	for (let i = 0; i <= n; i++) {
		const a = (i / n) * TAU;
		const rr = r(a);
		if (i === 0) c.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
		else c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
	}
	c.closePath();
}

/** The gel: dark inside, bright at the membrane, outlined to part it from the floor; bubbles
 *  rising in it, a glint at the upper left. */
function paintGel(
	c: Ctx,
	trace: () => void,
	g: Gel,
	o: PretenderOpts,
	ph: number,
	boil: boolean
): void {
	trace();
	stroke(c, INK, 2.2);
	const f = c.createRadialGradient(0, 0, 1, 0, 0, 11);
	f.addColorStop(0, g.core);
	f.addColorStop(0.55, g.mid);
	f.addColorStop(0.9, g.edge);
	f.addColorStop(1, g.edge);
	trace();
	c.fillStyle = f;
	c.fill();
	trace();
	stroke(c, g.edge, 0.9);
	c.save();
	trace();
	c.clip();
	const n = boil ? 7 : 3;
	for (let i = 0; i < n; i++) {
		const u = (o.time * ((boil ? 1.4 : 0.35) + i * 0.07) + i / n + ph) % 1;
		c.beginPath();
		c.arc(
			-6 + ((i * 3.7) % 12) + Math.sin(u * 6 + i) * 0.8,
			8 - u * 16,
			(boil ? 0.9 : 0.6) + (i % 2) * 0.4,
			0,
			TAU
		);
		stroke(c, `rgba(255, 255, 255, ${(boil ? 0.75 : 0.5) * Math.sin(u * Math.PI)})`, 0.5);
	}
	c.restore();
	ellipse(c, -4.6, -5.0, 2.0, 1.1, 'rgba(255, 255, 255, 0.65)');
	ellipse(c, -2.2, -6.6, 0.7, 0.45, 'rgba(255, 255, 255, 0.6)');
}

/** The eyes: two dark nuclei drifting toward the heading, a glint in each; gold in the tell,
 *  white rings in the fright, lime-hot in the rage. */
function paintNuclei(c: Ctx, o: PretenderOpts, st: PretenderState): void {
	const vertical = Math.abs(o.lookY) > Math.abs(o.lookX);
	const cx = o.lookX * 2.6;
	const cy = -0.4 + o.lookY * 2.2;
	for (const side of [-1, 1]) {
		const ex = cx + side * (vertical ? 2.5 : 2.4);
		const ey = cy + (vertical ? 0 : side * 0.3);
		if (st === 'fright') {
			const tr = Math.sin(o.time * 40) * 0.25;
			ellipse(c, ex + tr, ey, 1.9, 1.9, '#ffffff', 0.9);
			ellipse(c, ex + tr + o.lookX * 0.6, ey + o.lookY * 0.6, 0.7, 0.7, INK);
			continue;
		}
		const rage = st === 'rage';
		if (st === 'tell' || rage) {
			const rgb = rage ? '226, 255, 160' : '255, 200, 71';
			glow(c, ex, ey, 4.2, `rgba(${rgb}, 0.9)`, `rgba(${rgb}, 0.35)`);
		}
		ellipse(
			c,
			ex,
			ey,
			rage ? 2.0 : 2.3,
			rage ? 1.4 : 2.6,
			rage ? '#f4ffd8' : 'rgba(8, 4, 8, 0.92)'
		);
		if (rage) ellipse(c, ex + o.lookX * 0.6, ey + o.lookY * 0.5, 0.5, 1.1, '#1f4a0a');
		else {
			const r = st === 'tell' ? 1.1 : 0.75;
			ellipse(
				c,
				ex + o.lookX * 0.8,
				ey + o.lookY * 0.8,
				r,
				r,
				st === 'tell' ? '#ffc847' : 'rgba(255, 255, 255, 0.85)'
			);
		}
	}
}

/** One amoeba in `unit` space (the cute ghosts' frame), `k` its fold. */
function paintAmoeba(
	c: Ctx,
	kind: GhostKind,
	st: PretenderState,
	o: PretenderOpts,
	unit: number,
	k: number
): void {
	const ph = PHASE[kind];
	c.scale(unit * SCALE, unit * SCALE);
	if (st === 'eyes') {
		// eaten: its gold eyes run home
		c.translate(0, Math.sin(o.time * 4 + ph) * 0.6 - 1);
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
	const scared = st === 'fright';
	if (scared && !o.flashing) c.translate(Math.sin(o.time * 38 + ph) * 0.4, 0);
	if (st === 'rage') c.translate(Math.sin(o.time * 47 + ph) * 0.3, 0);
	// jelly: it wobbles, no feet, no rocking
	const w = Math.sin(o.time * 3.1 + ph) * (1 - k);
	c.translate(0, Math.sin(o.time * 2.4 + ph) * 0.4 * (1 - k));
	c.scale(1 + 0.04 * w, 1 - 0.04 * w);
	const g = st === 'rage' ? RAGE : scared ? (o.white ? WHITE : SCARED) : GEL[kind];
	const r = amoebaR(kind, o, st, ph);
	paintGel(c, () => polar(c, r), g, o, ph, st === 'rage');
	paintNuclei(c, o, st);
}

/** A soft glow round it in its state's colour, so it reads in the dark maze. */
function halo(c: Ctx, x: number, y: number, tile: number, rgb: string, a: number, scale = 1): void {
	if (a <= 0.01) return;
	const r = tile * HALO_R * scale;
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

/** One squad creature centred at (x, y), `tile` the tile's size in px. */
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
		// it shrinks and fades as the spore comes up in its place
		const k = clamp(o.fold ?? 0, 0, 1);
		halo(c, x, y, tile, GEL[kind].rgb, 0.36 * (1 - k));
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
		paintAmoeba(c, kind, 'hunt', o, unit, k);
		c.restore();
		return;
	}
	// the rage comes on in a moment: the tell's gold, then the boil
	const shown = st === 'rage' && (o.reveal ?? 1) < 0.5 ? 'tell' : st;
	if (shown !== 'eyes') {
		const rgb = shown === 'rage' ? RAGE.rgb : shown === 'fright' ? SCARED.rgb : GEL[kind].rgb;
		halo(c, x, y, tile, rgb, shown === 'rage' ? 0.44 : 0.38, shown === 'rage' ? RAGE_HALO : 1);
	} else halo(c, x, y, tile, '255, 214, 140', 0.18);
	c.save();
	c.translate(x, y);
	paintAmoeba(c, kind, shown, o, unit, 0);
	c.restore();
}

/** A lurker's tell over its spore (stage space, a 34 px tile): its eye opens for a moment beside
 *  the pearl, turned toward the hero. `open` 0 shut .. 1 open. */
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
