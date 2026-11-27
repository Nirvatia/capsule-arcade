// The station's squad creature (DESIGN.md §7a): since 2026-11-27 the stepper (`./stepper`, the
// owner's pick of the candidates), after the amoeba (a drifting jelly with no expression) and the
// Pretender in its mask before it. This file is its game side: the state the game's ghost is in
// to the look (`pretenderStateFor`), how it moves on the rails (`RailGait`: drawn at its real
// point, its heading turned at once for the eyes and eased for the body, the stride counted from
// the distance, the rage coming on in a moment), the mimicry (it shrinks into the level's spore),
// the lurker's eye over the spore, and the hero's glow. The name stays: it pretends.
import type { GhostKind } from '../../logic/actors/GhostModel';
import { drawStepper, drawStepperEyes } from './stepper';

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
const TAU = Math.PI * 2;
const INK = '#241418';

/** The creature's frame, of the tile: its crest and feet stay inside the tile. */
const SIZE = 0.9;
/** The glow round it in its state's colour, so it reads in the dark maze. */
const HALO_R = 0.82;
const KIND_RGB: Readonly<Record<GhostKind, string>> = {
	BLINKY: '255, 96, 80',
	PINKY: '255, 130, 225',
	INKY: '90, 230, 255',
	CLYDE: '255, 176, 70'
};
const RAGE_RGB = '170, 255, 70';
const SCARED_RGB = '96, 120, 255';
const TELL_RGB = '255, 200, 71';

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (e0: number, e1: number, x: number) => {
	const k = clamp((x - e0) / (e1 - e0), 0, 1);
	return k * k * (3 - 2 * k);
};

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
	const S = tile * SIZE;
	const base = {
		lookX: o.lookX,
		lookY: o.lookY,
		faceX: o.faceX,
		faceY: o.faceY,
		time: o.time,
		step: o.step
	};
	if (st === 'mimic') {
		// it shrinks and fades as the spore comes up in its place
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
		drawStepper(c, 0, 0, S, kind, { ...base, heat: 0 });
		c.restore();
		return;
	}
	if (st === 'eyes') {
		// eaten: its gold eyes run home
		halo(c, x, y, tile, TELL_RGB, 0.16);
		drawStepperEyes(c, x, y, S, base);
		return;
	}
	// the rage comes on in a moment: the tell's gold first, then the boil
	const reveal = clamp(o.reveal ?? 1, 0, 1);
	const heat = st === 'rage' ? reveal : 0;
	const tell = st === 'tell' ? 1 : st === 'rage' ? clamp(1 - reveal * 2.2, 0, 1) : 0;
	const fright = st === 'fright' ? 1 : 0;
	const rgb =
		st === 'rage' ? RAGE_RGB : st === 'fright' ? SCARED_RGB : tell > 0 ? TELL_RGB : KIND_RGB[kind];
	halo(c, x, y, tile, rgb, st === 'rage' ? 0.3 : 0.28, st === 'rage' ? 0.9 : 1);
	drawStepper(c, x, y, S, kind, {
		...base,
		heat,
		tell,
		fright,
		white: st === 'fright' && !!o.white
	});
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
