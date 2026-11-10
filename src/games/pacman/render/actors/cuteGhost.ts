// The season ghosts: one cel-style painter (ink outline, a belly shade, a highlight, bean feet
// that step with the ground covered, a face that slides toward the heading) and a body shape
// per season: a water drop in summer, a hedgehog in autumn, a bunny in winter, a tulip bud in spring, a turtle in summer (the drop is kept). No tentacles and no wavy skirt.
// Pure drawing: the caller picks the state (`cuteStateFor`), the shape and the colour.
import type { GhostKind, GhostState } from '../../logic/actors/GhostModel';
import type { HypnosisMode } from '../../logic/rules/HypnosisService';

type Ctx = CanvasRenderingContext2D;
type Palette = { b: string; s: string };

export type CuteShape = 'drop' | 'hedgehog' | 'bunny' | 'tulip' | 'turtle';
export type CuteState = 'normal' | 'scared' | 'overdrive' | 'eyes' | 'rage' | 'feeder' | 'hunter';

export interface CuteOptions {
	readonly shape: CuteShape;
	readonly kind: GhostKind;
	readonly state: CuteState;
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

const BODY: Record<GhostKind, Palette> = {
	BLINKY: { b: '#ff5a5a', s: '#d93445' },
	PINKY: { b: '#ff9de2', s: '#e676c4' },
	INKY: { b: '#59f0ff', s: '#2ec3d6' },
	CLYDE: { b: '#ffb14d', s: '#e8861f' }
};
const SCARED: Palette = { b: '#4f68ff', s: '#3346d0' };
const WHITE: Palette = { b: '#f4f7ff', s: '#c3cfea' };
const OVERDRIVE: Palette = { b: '#59f0ff', s: '#2ec3d6' };
const HYPNO: Palette = { b: '#83ff74', s: '#42d33d' };
const RAGE: Palette = { b: '#ff4a4a', s: '#a81622' };
const PHASE: Record<GhostKind, number> = { BLINKY: 0, PINKY: 0.8, INKY: 1.6, CLYDE: 2.4 };

const FOOT_LIFT = 2.6;

/** What differs between the shapes: the outline, the extras and where the face sits. */
export interface GhostShape {
	/** Sub-paths of the body, drawn as one union (the same winding). */
	readonly paths: ReadonlyArray<(c: Ctx) => void>;
	/** Painted under the body (the hedgehog's quills). */
	readonly back?: (c: Ctx, pal: Palette) => void;
	/** Painted over the body, under the face (the hedgehog's muzzle). */
	readonly over?: (c: Ctx, pal: Palette) => void;
	/** The colour a lowered brow is filled with, to match what is behind it. */
	readonly lid: (pal: Palette) => string;
	/** The colour of the feet, where it is not the belly's shade. */
	readonly foot?: (pal: Palette) => string;
	readonly dy: number;
	readonly scale: number;
	readonly highlight: readonly [number, number];
	readonly ring: number;
	/** Eye height and spread, eye radii, mouth height (all relative to the body's centre). */
	readonly ey: number;
	readonly ex: number;
	readonly rx: number;
	readonly ry: number;
	readonly my: number;
	readonly nose: boolean;
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

/** A hex colour blended toward white by `k` (0..1). */
function lighten(hex: string, k: number): string {
	const channel = (i: number): number => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16);
	const mix = (i: number): number => Math.round(channel(i) + (255 - channel(i)) * k);
	return `rgb(${mix(0)},${mix(1)},${mix(2)})`;
}

/** The summer drop: a pointed crown, a round belly. */
const DROP: GhostShape = {
	paths: [
		(c) => {
			c.beginPath();
			c.moveTo(0, -11.8);
			c.bezierCurveTo(2.2, -7, 9.6, -2.4, 9.6, 3.4);
			c.bezierCurveTo(9.6, 8.2, 5.4, 11, 0, 11);
			c.bezierCurveTo(-5.4, 11, -9.6, 8.2, -9.6, 3.4);
			c.bezierCurveTo(-9.6, -2.4, -2.2, -7, 0, -11.8);
			c.closePath();
		}
	],
	lid: (pal) => pal.b,
	dy: 0,
	scale: 1,
	highlight: [-4.6, 0.8],
	ring: 14.2,
	ey: 2.4,
	ex: 4,
	rx: 3.2,
	ry: 3.6,
	my: 4.8,
	nose: false
};

/** The autumn hedgehog: a round body, quills along the back, a pale muzzle with a nose. */
const HEDGEHOG: GhostShape = {
	paths: [
		(c) => {
			c.beginPath();
			c.ellipse(0, 1, 10.2, 10, 0, 0, TAU);
		}
	],
	back: (c, pal) => {
		c.beginPath();
		for (let i = 0; i <= 12; i++) {
			const a = Math.PI * (1.06 + (0.88 * i) / 12);
			const r = i % 2 ? 8 : 14.2;
			const x = Math.cos(a) * r;
			const y = 1 + Math.sin(a) * r;
			if (i) c.lineTo(x, y);
			else c.moveTo(x, y);
		}
		c.lineTo(6, 4);
		c.lineTo(-6, 4);
		c.closePath();
		c.lineJoin = 'round';
		c.lineWidth = 3;
		c.strokeStyle = INK;
		c.stroke();
		c.fillStyle = pal.s;
		c.fill();
	},
	over: (c, pal) => {
		ellipse(c, 0, 4.2, 7.6, 6.6, lighten(pal.b, 0.6));
	},
	lid: (pal) => lighten(pal.b, 0.6),
	dy: 1.6,
	scale: 0.97,
	highlight: [-5.6, -2.6],
	ring: 15.4,
	ey: 3.2,
	ex: 3.9,
	rx: 3,
	ry: 3.4,
	my: 5.2,
	nose: true
};

/** The winter bunny: a round body and two long ears with a pink inside. */
const BUNNY: GhostShape = {
	paths: [
		(c) => {
			c.beginPath();
			c.ellipse(0, 2, 10.2, 9.2, 0, 0, TAU);
		},
		(c) => {
			c.beginPath();
			c.ellipse(-4.8, -9.6, 2.9, 6, -0.16, 0, TAU);
		},
		(c) => {
			c.beginPath();
			c.ellipse(4.8, -9.6, 2.9, 6, 0.16, 0, TAU);
		}
	],
	over: (c) => {
		for (const side of [-1, 1]) {
			c.beginPath();
			c.ellipse(side * 4.8, -9.2, 1.4, 4.2, side * 0.16, 0, TAU);
			c.fillStyle = 'rgba(255,190,215,.92)';
			c.fill();
		}
	},
	lid: (pal) => pal.b,
	dy: 2.6,
	scale: 0.86,
	highlight: [-5, -0.4],
	ring: 15.4,
	ey: 3,
	ex: 3.9,
	rx: 3,
	ry: 3.4,
	my: 5,
	nose: true
};

function polygon(c: Ctx, points: ReadonlyArray<readonly [number, number]>): void {
	c.beginPath();
	points.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
	c.closePath();
}

/** The spring tulip bud: a round cup under three pointed petals, with green stalk-feet. */
const TULIP: GhostShape = {
	paths: [
		(c) => {
			c.beginPath();
			c.ellipse(0, 3.2, 9.8, 7.8, 0, 0, TAU);
		},
		(c) =>
			polygon(c, [
				[-9.2, 0],
				[-8.6, -10.6],
				[-2.6, -3.4]
			]),
		(c) =>
			polygon(c, [
				[-4.2, -3],
				[0, -13],
				[4.2, -3]
			]),
		(c) =>
			polygon(c, [
				[9.2, 0],
				[8.6, -10.6],
				[2.6, -3.4]
			])
	],
	over: (c) => {
		line(c, -6.6, -7.4, -5.6, -2, 'rgba(60,10,30,.35)', 0.8);
		line(c, 0, -9.6, 0, -4.4, 'rgba(60,10,30,.35)', 0.8);
		line(c, 6.6, -7.4, 5.6, -2, 'rgba(60,10,30,.35)', 0.8);
	},
	lid: (pal) => pal.b,
	foot: () => '#4fae3a',
	dy: 2,
	scale: 0.94,
	highlight: [-5, 0],
	ring: 15.4,
	ey: 2.4,
	ex: 4.1,
	rx: 3.1,
	ry: 3.5,
	my: 5,
	nose: false
};

/** The summer turtle: a round face in front of a green shell that shows all around. */
const TURTLE: GhostShape = {
	paths: [
		(c) => {
			c.beginPath();
			c.ellipse(0, 3.6, 9.2, 8.2, 0, 0, TAU);
		}
	],
	back: (c) => {
		c.beginPath();
		c.ellipse(0, 0.2, 12.4, 10.4, 0, 0, TAU);
		c.fillStyle = '#5fb85a';
		c.fill();
		c.strokeStyle = INK;
		c.lineWidth = 2;
		c.stroke();
		c.save();
		c.beginPath();
		c.ellipse(0, 0.2, 12.2, 10.2, 0, 0, TAU);
		c.clip();
		polygon(c, [
			[-3.4, -8.4],
			[3.4, -8.4],
			[5.6, -4.2],
			[3.4, -0.4],
			[-3.4, -0.4],
			[-5.6, -4.2]
		]);
		c.strokeStyle = '#2f7a3a';
		c.lineWidth = 0.9;
		c.lineJoin = 'round';
		c.stroke();
		line(c, -5.6, -4.2, -11, -3.2, '#2f7a3a', 0.9);
		line(c, 5.6, -4.2, 11, -3.2, '#2f7a3a', 0.9);
		line(c, -3.4, -8.4, -6.2, -12, '#2f7a3a', 0.9);
		line(c, 3.4, -8.4, 6.2, -12, '#2f7a3a', 0.9);
		ellipse(c, 0, -4.2, 14, 3, 'rgba(255,255,255,.12)');
		c.restore();
	},
	over: (c, pal) => {
		ellipse(c, 0, 8.2, 5.4, 2.6, lighten(pal.b, 0.5));
	},
	lid: (pal) => pal.b,
	foot: () => '#6bc35f',
	dy: 1.6,
	scale: 0.96,
	highlight: [-5, -0.4],
	ring: 15.4,
	ey: 3,
	ex: 4.1,
	rx: 3.3,
	ry: 3.7,
	my: 4.8,
	nose: false
};

export const GHOST_SHAPES: Record<CuteShape, GhostShape> = {
	drop: DROP,
	hedgehog: HEDGEHOG,
	bunny: BUNNY,
	tulip: TULIP,
	turtle: TURTLE
};

/** Which look a ghost in this game state takes (the lair's translucency is the caller's). */
export function cuteStateFor(input: {
	state: GhostState;
	hypnosis: HypnosisMode | null;
	overdrive: boolean;
}): CuteState {
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

function paintBody(c: Ctx, shape: GhostShape, pal: Palette): void {
	shape.back?.(c, pal);
	for (const path of shape.paths) {
		path(c);
		c.lineJoin = 'round';
		c.lineWidth = 3.2;
		c.strokeStyle = INK;
		c.stroke();
	}
	for (const path of shape.paths) {
		path(c);
		c.fillStyle = pal.b;
		c.fill();
	}
	for (const path of shape.paths) {
		c.save();
		path(c);
		c.clip();
		ellipse(c, 3.4, 12.4, 14, 7.4, pal.s);
		c.restore();
	}
	c.fillStyle = 'rgba(255,255,255,.6)';
	c.beginPath();
	c.ellipse(shape.highlight[0], shape.highlight[1], 2.5, 1.5, -0.6, 0, TAU);
	c.fill();
	shape.over?.(c, pal);
}

interface EyeOptions {
	readonly pupil?: string;
	readonly pr?: number;
	readonly dr?: number;
	readonly blank?: boolean;
	readonly spiral?: boolean;
}

/** `grow` widens the eyes (scared), a negative one narrows them (rage). */
function paintEyes(
	c: Ctx,
	shape: GhostShape,
	lookX: number,
	lookY: number,
	o: EyeOptions,
	grow = 0
): void {
	const rx = shape.rx + grow;
	const ry = shape.ry + grow * 3;
	for (const side of [-1, 1]) {
		const x = side * shape.ex;
		ellipse(c, x, shape.ey, rx, ry, '#ffffff', 1.1);
		if (o.blank) {
			continue;
		}
		const px = x + lookX * 1.3;
		const py = shape.ey + lookY * 1.5;
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

function zigzag(c: Ctx, shape: GhostShape, color: string, width: number): void {
	const base = shape.ey + shape.my;
	c.beginPath();
	c.moveTo(-3.4, base + 1.4);
	for (let i = 1; i <= 6; i++) {
		c.lineTo(-3.4 + i * 1.13, base + (i % 2 ? 0 : 1.4));
	}
	c.strokeStyle = color;
	c.lineWidth = width;
	c.lineJoin = 'round';
	c.stroke();
}

function paintNose(c: Ctx, shape: GhostShape): void {
	ellipse(c, 0, shape.ey + 2.4, 1.6, 1.15, INK);
	c.fillStyle = 'rgba(255,255,255,.7)';
	c.beginPath();
	c.arc(-0.5, shape.ey + 2, 0.4, 0, TAU);
	c.fill();
}

function paintFace(
	c: Ctx,
	shape: GhostShape,
	pal: Palette,
	state: CuteState,
	flashing: boolean,
	chasing: boolean,
	lookX: number,
	lookY: number
): void {
	const { ey, ex, rx, ry } = shape;
	const my = ey + shape.my;
	c.save();
	c.translate(lookX * 1.4, lookY * 0.9);
	if (state === 'scared' || state === 'overdrive') {
		if (flashing) {
			paintEyes(c, shape, lookX, lookY, { pupil: '#ff6a3a', pr: 1.3 }, 0.1);
			zigzag(c, shape, '#ff4d4d', 1.1);
		} else {
			paintEyes(c, shape, lookX, lookY, { pr: 1.2 }, 0.1);
			line(c, -ex - rx + 0.6, ey - ry - 1.8, -ex + rx - 1, ey - ry - 3.2, INK, 0.9);
			line(c, ex + rx - 0.6, ey - ry - 1.8, ex - rx + 1, ey - ry - 3.2, INK, 0.9);
			zigzag(c, shape, INK, 0.95);
			c.beginPath();
			c.moveTo(ex + 3.6, ey - 5.6);
			c.bezierCurveTo(ex + 5.6, ey - 3, ex + 5.4, ey - 1.6, ex + 3.6, ey - 1.4);
			c.bezierCurveTo(ex + 1.8, ey - 1.6, ex + 1.6, ey - 3, ex + 3.6, ey - 5.6);
			c.fillStyle = '#bfe9ff';
			c.fill();
			c.strokeStyle = INK;
			c.lineWidth = 0.6;
			c.stroke();
		}
	} else if (state === 'rage') {
		paintEyes(c, shape, lookX, lookY, { blank: true }, -0.1);
		line(c, -ex - rx - 0.2, ey - ry - 2, -ex + rx - 0.4, ey - ry + 0.2, INK, 1.5);
		line(c, ex + rx + 0.2, ey - ry - 2, ex - rx + 0.4, ey - ry + 0.2, INK, 1.5);
		c.beginPath();
		c.moveTo(-3, my + 1.6);
		c.quadraticCurveTo(0, my - 1, 3, my + 1.6);
		c.strokeStyle = INK;
		c.lineWidth = 1.1;
		c.lineCap = 'round';
		c.stroke();
	} else if (state === 'feeder' || state === 'hunter') {
		paintEyes(c, shape, lookX, lookY, {
			pupil: state === 'hunter' ? '#ff1f1f' : '#14b81c',
			spiral: true
		});
		c.beginPath();
		c.arc(0, my + 0.4, 1.6, 0, TAU);
		c.fillStyle = '#7a2a3a';
		c.fill();
		c.strokeStyle = INK;
		c.lineWidth = 0.8;
		c.stroke();
	} else if (chasing) {
		paintEyes(c, shape, lookX, lookY, { pr: 1.7 });
		const lid = shape.lid(pal);
		for (const side of [-1, 1]) {
			c.beginPath();
			c.moveTo(side * (ex + rx + 0.7), ey - ry - 1.8);
			c.lineTo(side * (ex - rx - 0.5), ey - 0.6);
			c.lineTo(side * (ex - rx - 0.5), ey - ry - 3);
			c.lineTo(side * (ex + rx + 0.7), ey - ry - 3);
			c.closePath();
			c.fillStyle = lid;
			c.fill();
			line(c, side * (ex + rx + 0.7), ey - ry - 1.8, side * (ex - rx - 0.5), ey - 0.6, INK, 1.4);
		}
		if (shape.nose) {
			paintNose(c, shape);
		}
		c.fillStyle = 'rgba(255,80,120,.5)';
		for (const side of [-1, 1]) {
			c.beginPath();
			c.ellipse(side * (ex + 3), my - 0.4, 1.8, 1, 0, 0, TAU);
			c.fill();
		}
		c.beginPath();
		c.moveTo(-3.2, my);
		c.quadraticCurveTo(0, my + 3.8, 3.2, my);
		c.closePath();
		c.fillStyle = '#7a2a3a';
		c.fill();
		c.strokeStyle = INK;
		c.lineWidth = 0.9;
		c.lineJoin = 'round';
		c.stroke();
		for (const side of [-1, 1]) {
			c.beginPath();
			c.moveTo(side * 2.9, my + 0.1);
			c.lineTo(side * 1.3, my + 0.1);
			c.lineTo(side * 2.1, my + 1.7);
			c.closePath();
			c.fillStyle = '#ffffff';
			c.fill();
			c.strokeStyle = INK;
			c.lineWidth = 0.45;
			c.stroke();
		}
	} else {
		paintEyes(c, shape, lookX, lookY, {});
		if (shape.nose) {
			paintNose(c, shape);
		}
		c.fillStyle = 'rgba(255,80,120,.55)';
		for (const side of [-1, 1]) {
			c.beginPath();
			c.ellipse(side * (ex + 2.8), my - 0.7, 1.9, 1.1, 0, 0, TAU);
			c.fill();
		}
		c.beginPath();
		c.moveTo(-1.7, my + 0.2);
		c.quadraticCurveTo(-0.85, my + 1.5, 0, my + 0.2);
		c.quadraticCurveTo(0.85, my + 1.5, 1.7, my + 0.2);
		c.strokeStyle = INK;
		c.lineWidth = 0.95;
		c.lineCap = 'round';
		c.stroke();
	}
	c.restore();
}

/** Draws one ghost centred at (x, y); `unit` is pixels per world unit (a tile is ~25 units). */
export function drawCuteGhost(c: Ctx, x: number, y: number, unit: number, o: CuteOptions): void {
	const shape = GHOST_SHAPES[o.shape];
	const phase = PHASE[o.kind];
	c.save();
	c.translate(x, y);
	c.scale(unit * shape.scale, unit * shape.scale);
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
	// the whole ghost sits a little high (the feet hang below), bobs on each step, sways with
	// the stride and leans toward the heading
	c.translate(0, shape.dy - 1.2 - Math.abs(Math.sin(o.step)) * 0.7);
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
		c.arc(0, 0.5, shape.ring, 0, TAU);
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
		c.fillStyle = shape.foot ? shape.foot(pal) : pal.s;
		c.fill();
		c.strokeStyle = INK;
		c.lineWidth = 1.5;
		c.stroke();
	}
	const squash = Math.sin(o.time * 5 + phase);
	c.translate(0, 10);
	c.scale(1 - 0.04 * squash, 1 + 0.05 * squash);
	c.translate(0, -10);
	paintBody(c, shape, pal);
	paintFace(
		c,
		shape,
		pal,
		o.state,
		Boolean(o.flashing),
		Boolean(o.chasing) && o.state === 'normal',
		o.lookX,
		o.lookY
	);
	c.restore();
}
