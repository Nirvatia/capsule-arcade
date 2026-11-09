// The summer ghost: a water drop (a pointed crown, a round belly, no feet or tentacles), drawn
// in the heroes' cel style: ink outline, a flat shade on the belly, one highlight. The face
// slides toward the heading and the eyes look that way. Pure drawing: the caller picks the
// state (`dropStateFor`) and the colour.
import type { GhostKind, GhostState } from '../../logic/actors/GhostModel';
import type { HypnosisMode } from '../../logic/rules/HypnosisService';

type Ctx = CanvasRenderingContext2D;

export type DropState = 'normal' | 'scared' | 'overdrive' | 'eyes' | 'rage' | 'feeder' | 'hunter';

export interface DropOptions {
	readonly kind: GhostKind;
	readonly state: DropState;
	/** Scared and about to end: the flashing face, and `white` is the white half of the blink. */
	readonly flashing?: boolean;
	readonly white?: boolean;
	/** The heading as a unit vector (0, 0 = none). */
	readonly lookX: number;
	readonly lookY: number;
	readonly time: number;
	/** Distance travelled as a stride phase (radians): the feet step with it. */
	readonly step: number;
	/** The ghosts are hunting (not scattering): a normal ghost looks menacing. */
	readonly chasing?: boolean;
}

const TAU = Math.PI * 2;
const INK = '#241418';

const BODY: Record<GhostKind, { b: string; s: string }> = {
	BLINKY: { b: '#ff5a5a', s: '#d93445' },
	PINKY: { b: '#ff9de2', s: '#e676c4' },
	INKY: { b: '#59f0ff', s: '#2ec3d6' },
	CLYDE: { b: '#ffb14d', s: '#e8861f' }
};
const SCARED = { b: '#4f68ff', s: '#3346d0' };
const WHITE = { b: '#f4f7ff', s: '#c3cfea' };
const OVERDRIVE = { b: '#59f0ff', s: '#2ec3d6' };
const HYPNO = { b: '#83ff74', s: '#42d33d' };
const RAGE = { b: '#ff4a4a', s: '#a81622' };
const PHASE: Record<GhostKind, number> = { BLINKY: 0, PINKY: 0.8, INKY: 1.6, CLYDE: 2.4 };

const FOOT_LIFT = 2.6;
const EY = 2.4;
const EX = 4;

/** Which look a ghost in this game state takes (the lair's translucency is the caller's). */
export function dropStateFor(input: {
	state: GhostState;
	hypnosis: HypnosisMode | null;
	overdrive: boolean;
}): DropState {
	switch (input.state) {
		case 'eyes':
			return 'eyes';
		case 'enraged':
			return 'rage';
		case 'hypnotized':
			return input.hypnosis === 'hunter' ? 'hunter' : 'feeder';
		case 'frightened':
			return input.overdrive ? 'overdrive' : 'scared';
		default:
			return 'normal';
	}
}

/** How far each foot is lifted (world units, never both at once) at a stride phase. */
export function footLift(step: number): { left: number; right: number } {
	const wave = Math.sin(step);
	return { left: Math.max(0, wave) * FOOT_LIFT, right: Math.max(0, -wave) * FOOT_LIFT };
}

function bodyPath(c: Ctx): void {
	c.beginPath();
	c.moveTo(0, -11.8);
	c.bezierCurveTo(2.2, -7, 9.6, -2.4, 9.6, 3.4);
	c.bezierCurveTo(9.6, 8.2, 5.4, 11, 0, 11);
	c.bezierCurveTo(-5.4, 11, -9.6, 8.2, -9.6, 3.4);
	c.bezierCurveTo(-9.6, -2.4, -2.2, -7, 0, -11.8);
	c.closePath();
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
	c.ellipse(x, y, rx, ry, 0, 0, TAU);
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

function paintBody(c: Ctx, pal: { b: string; s: string }): void {
	bodyPath(c);
	c.lineJoin = 'round';
	c.lineWidth = 3.2;
	c.strokeStyle = INK;
	c.stroke();
	c.fillStyle = pal.b;
	c.fill();
	c.save();
	bodyPath(c);
	c.clip();
	ellipse(c, 3.4, 12.4, 14, 7.4, pal.s);
	c.fillStyle = 'rgba(255,255,255,.6)';
	c.beginPath();
	c.ellipse(-4.6, 0.8, 2.5, 1.5, -0.6, 0, TAU);
	c.fill();
	c.restore();
}

interface EyeOptions {
	readonly pupil?: string;
	readonly pr?: number;
	readonly rx?: number;
	readonly ry?: number;
	readonly blank?: boolean;
	readonly spiral?: boolean;
}

function paintEyes(c: Ctx, lookX: number, lookY: number, o: EyeOptions): void {
	const rx = o.rx ?? 3.2;
	const ry = o.ry ?? 3.6;
	for (const side of [-1, 1]) {
		const x = side * EX;
		ellipse(c, x, EY, rx, ry, '#ffffff', 1.1);
		if (o.blank) {
			continue;
		}
		const px = x + lookX * 1.3;
		const py = EY + lookY * 1.5;
		if (o.spiral) {
			ellipse(c, px, py, 2.3, 2.3, o.pupil ?? INK, 0.6);
			c.beginPath();
			c.arc(px, py, 1.1, 0, 4.6);
			c.strokeStyle = '#ffffff';
			c.lineWidth = 0.55;
			c.stroke();
		} else {
			const r = o.pr ?? 2;
			ellipse(c, px, py, r, r, o.pupil ?? INK);
			c.fillStyle = '#ffffff';
			c.beginPath();
			c.arc(px - 0.7, py - 0.8, 0.62, 0, TAU);
			c.fill();
		}
	}
}

function zigzag(c: Ctx, color: string, width: number): void {
	c.beginPath();
	c.moveTo(-3.4, EY + 6.2);
	for (let i = 1; i <= 6; i++) {
		c.lineTo(-3.4 + i * 1.13, EY + (i % 2 ? 4.8 : 6.2));
	}
	c.strokeStyle = color;
	c.lineWidth = width;
	c.lineJoin = 'round';
	c.stroke();
}

function paintFace(
	c: Ctx,
	state: DropState,
	flashing: boolean,
	chasing: boolean,
	bodyColor: string,
	lookX: number,
	lookY: number
): void {
	c.save();
	c.translate(lookX * 1.4, lookY * 0.9);
	if (state === 'scared' || state === 'overdrive') {
		if (flashing) {
			paintEyes(c, lookX, lookY, { pupil: '#ff6a3a', pr: 1.3, rx: 3.3, ry: 3.9 });
			zigzag(c, '#ff4d4d', 1.1);
		} else {
			paintEyes(c, lookX, lookY, { pr: 1.2, rx: 3.3, ry: 3.9 });
			line(c, -EX - 2.6, EY - 5.4, -EX + 2.2, EY - 6.8, INK, 0.9);
			line(c, EX + 2.6, EY - 5.4, EX - 2.2, EY - 6.8, INK, 0.9);
			zigzag(c, INK, 0.95);
			c.beginPath();
			c.moveTo(EX + 3.6, EY - 5.6);
			c.bezierCurveTo(EX + 5.6, EY - 3, EX + 5.4, EY - 1.6, EX + 3.6, EY - 1.4);
			c.bezierCurveTo(EX + 1.8, EY - 1.6, EX + 1.6, EY - 3, EX + 3.6, EY - 5.6);
			c.fillStyle = '#bfe9ff';
			c.fill();
			c.strokeStyle = INK;
			c.lineWidth = 0.6;
			c.stroke();
		}
	} else if (state === 'rage') {
		paintEyes(c, lookX, lookY, { blank: true, rx: 3.1, ry: 3.2 });
		line(c, -EX - 3.4, EY - 5.6, -EX + 2.8, EY - 3.4, INK, 1.5);
		line(c, EX + 3.4, EY - 5.6, EX - 2.8, EY - 3.4, INK, 1.5);
		c.beginPath();
		c.moveTo(-3, EY + 6.4);
		c.quadraticCurveTo(0, EY + 3.8, 3, EY + 6.4);
		c.strokeStyle = INK;
		c.lineWidth = 1.1;
		c.lineCap = 'round';
		c.stroke();
	} else if (state === 'feeder' || state === 'hunter') {
		paintEyes(c, lookX, lookY, { pupil: state === 'hunter' ? '#ff1f1f' : '#14b81c', spiral: true });
		c.beginPath();
		c.arc(0, EY + 5.2, 1.6, 0, TAU);
		c.fillStyle = '#7a2a3a';
		c.fill();
		c.strokeStyle = INK;
		c.lineWidth = 0.8;
		c.stroke();
	} else if (chasing) {
		paintEyes(c, lookX, lookY, { pr: 1.7 });
		for (const side of [-1, 1]) {
			c.beginPath();
			c.moveTo(side * (EX + 3.9), EY - 5.4);
			c.lineTo(side * (EX - 3.7), EY - 0.6);
			c.lineTo(side * (EX - 3.7), EY - 6.6);
			c.lineTo(side * (EX + 3.9), EY - 6.6);
			c.closePath();
			c.fillStyle = bodyColor;
			c.fill();
			line(c, side * (EX + 3.9), EY - 5.4, side * (EX - 3.7), EY - 0.6, INK, 1.4);
		}
		c.fillStyle = 'rgba(255,80,120,.5)';
		for (const side of [-1, 1]) {
			c.beginPath();
			c.ellipse(side * (EX + 3), EY + 4.4, 1.8, 1, 0, 0, TAU);
			c.fill();
		}
		c.beginPath();
		c.moveTo(-3.2, EY + 4.8);
		c.quadraticCurveTo(0, EY + 8.6, 3.2, EY + 4.8);
		c.closePath();
		c.fillStyle = '#7a2a3a';
		c.fill();
		c.strokeStyle = INK;
		c.lineWidth = 0.9;
		c.lineJoin = 'round';
		c.stroke();
		for (const side of [-1, 1]) {
			c.beginPath();
			c.moveTo(side * 2.9, EY + 4.9);
			c.lineTo(side * 1.3, EY + 4.9);
			c.lineTo(side * 2.1, EY + 6.5);
			c.closePath();
			c.fillStyle = '#ffffff';
			c.fill();
			c.strokeStyle = INK;
			c.lineWidth = 0.45;
			c.stroke();
		}
	} else {
		paintEyes(c, lookX, lookY, {});
		c.fillStyle = 'rgba(255,80,120,.55)';
		for (const side of [-1, 1]) {
			c.beginPath();
			c.ellipse(side * (EX + 2.8), EY + 4.1, 1.9, 1.1, 0, 0, TAU);
			c.fill();
		}
		c.beginPath();
		c.moveTo(-1.7, EY + 5);
		c.quadraticCurveTo(-0.85, EY + 6.3, 0, EY + 5);
		c.quadraticCurveTo(0.85, EY + 6.3, 1.7, EY + 5);
		c.strokeStyle = INK;
		c.lineWidth = 0.95;
		c.lineCap = 'round';
		c.stroke();
	}
	c.restore();
}

/** Draws one drop centred at (x, y); `unit` is pixels per world unit (a tile is ~25 units). */
export function drawDropGhost(c: Ctx, x: number, y: number, unit: number, o: DropOptions): void {
	const phase = PHASE[o.kind];
	c.save();
	c.translate(x, y);
	c.scale(unit, unit);
	if (o.state === 'eyes') {
		c.translate(0, Math.sin(o.time * 4 + phase) * 0.6 - 1);
		for (const side of [-1, 1]) {
			const ex = side * 4.6;
			ellipse(c, ex, 0, 3.7, 4.2, '#ffffff', 1.2);
			ellipse(c, ex + o.lookX * 1.6, o.lookY * 1.7, 2.2, 2.2, INK);
			c.fillStyle = '#ffffff';
			c.beginPath();
			c.arc(ex + o.lookX * 1.6 - 0.8, o.lookY * 1.7 - 0.9, 0.7, 0, TAU);
			c.fill();
		}
		c.restore();
		return;
	}
	const scared = o.state === 'scared' || o.state === 'overdrive';
	if (scared && !o.flashing) {
		c.translate(Math.sin(o.time * 38 + phase) * 0.45, 0);
	}
	const lift = footLift(o.step);
	// the whole drop sits a little high (the feet hang below), bobs on each step, sways with
	// the stride and leans toward the heading
	c.translate(0, -1.2 - Math.abs(Math.sin(o.step)) * 0.7);
	c.translate(0, 10);
	c.rotate(Math.sin(o.step) * 0.08 + o.lookX * 0.1);
	c.translate(0, -10);
	let pal = BODY[o.kind];
	if (scared) {
		pal = o.white ? WHITE : o.state === 'overdrive' ? OVERDRIVE : SCARED;
	} else if (o.state === 'feeder' || o.state === 'hunter') {
		pal = HYPNO;
	} else if (o.state === 'rage') {
		pal = RAGE;
	}
	if (o.state === 'feeder' || o.state === 'hunter' || o.state === 'rage') {
		c.beginPath();
		c.arc(0, 0.5, 14.2, 0, TAU);
		c.strokeStyle = o.state === 'rage' ? 'rgba(255,77,77,.75)' : 'rgba(121,255,111,.7)';
		c.lineWidth = 1.3;
		c.stroke();
	}
	// two bean feet, behind the belly; they step with the distance travelled
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
	c.scale(1 - 0.04 * squash, 1 + 0.05 * squash);
	c.translate(0, -10);
	paintBody(c, pal);
	paintFace(
		c,
		o.state,
		Boolean(o.flashing),
		Boolean(o.chasing) && o.state === 'normal',
		pal.b,
		o.lookX,
		o.lookY
	);
	c.restore();
}
