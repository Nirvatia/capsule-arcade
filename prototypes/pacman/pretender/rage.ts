// Prototype `pretender?rage`, round four: the stepper's rage as three characters, funny and
// dangerous at once (the owner rejected round three: a unibrow, brows too thick, the pupils looked
// different ways). What carries over: clean drawing (one line weight, flat fills, plain geometry)
// and the body with its cel bands only (`clean`). What is new:
//   - the pupils are drawn in the face's own frame, one gaze for all (no tilted eye frames);
//   - the brows are a thin line apart from each other, or none;
//   - each look is an idea, not a recolour:
//   A  the maniac (red): bulging eyes with tiny pupils, thin raised brows, a grin ear to ear with
//      rows of small even teeth;
//   B  the maw (lime): tiny angry eyes and a huge mouth with a tongue and four fangs;
//   C  the cyclops (charcoal): one big lit eye with a slit pupil under a slanted lid, a black mouth
//      with a gap-toothed grin, a fang up and one down.
// Drawn by the game's own `render/station/stepper` through its `rage` option; the faces live here.
import type { GhostKind } from '../../../src/games/pacman/logic/actors/GhostModel';
import {
	drawStepper,
	type StepperHeat,
	type StepperRage
} from '../../../src/games/pacman/render/station/stepper';

type Ctx = CanvasRenderingContext2D;
type Face = NonNullable<StepperRage['face']>;
type FaceArgs = Parameters<Face>[1];
const INK = '#1b0f15';
const TAU = Math.PI * 2;
/** The lowest the mouth may reach (the body's lower edge is near 0.27). */
const MOUTH_FLOOR = 0.235;

// ------------------------------------------------------------------------------------ pieces

const lineW = (f: FaceArgs) => Math.max(f.px * 1.6, 0.03);

function setup(c: Ctx, f: FaceArgs): void {
	c.save();
	c.globalAlpha *= f.alpha;
	c.lineCap = 'round';
	c.lineJoin = 'round';
}

/** A round eye: the white, the ink line, and one pupil looking along the heading. */
function ball(
	c: Ctx,
	f: FaceArgs,
	x: number,
	y: number,
	r: number,
	look: { sclera: string; pupil: number; reach: number }
): void {
	c.beginPath();
	c.arc(x, y, r, 0, TAU);
	c.fillStyle = look.sclera;
	c.fill();
	c.strokeStyle = INK;
	c.lineWidth = lineW(f);
	c.stroke();
	c.beginPath();
	c.arc(x + f.faceX * look.reach, y + f.faceY * look.reach, look.pupil, 0, TAU);
	c.fillStyle = INK;
	c.fill();
}

/** A thin brow line. */
function brow(c: Ctx, f: FaceArgs, x1: number, y1: number, x2: number, y2: number): void {
	c.beginPath();
	c.moveTo(x1, y1);
	c.lineTo(x2, y2);
	c.strokeStyle = INK;
	c.lineWidth = lineW(f) * 1.25;
	c.stroke();
}

interface Tooth {
	/** Where along the lip, 0..1. */
	readonly t: number;
	readonly len: number;
	readonly hw: number;
}
/** `n` even teeth across a lip; `between` makes the n-1 that sit in the gaps of an n-row. */
function row(n: number, len: number, hw: number, between = false): Tooth[] {
	return between
		? Array.from({ length: n - 1 }, (_, k) => ({ t: (k + 1) / n, len, hw }))
		: Array.from({ length: n }, (_, k) => ({ t: (k + 0.5) / n, len, hw }));
}

interface Mouth {
	readonly W: number;
	/** The corners' height, how far the upper lip sags in the middle, how deep the jaw is. */
	readonly ya: number;
	readonly sag: number;
	readonly depth: number;
	readonly inside: string;
	readonly tooth: string;
	readonly shade: string;
	readonly outline: boolean;
	readonly top: readonly Tooth[];
	readonly bottom: readonly Tooth[];
	readonly tongue?: string;
}

/** A grin, corners up: the dark inside, an optional tongue, the teeth of both lips, the line. */
function mouth(c: Ctx, f: FaceArgs, m: Mouth): void {
	const lw = lineW(f);
	const { W, ya } = m;
	const depth = Math.min(m.depth + 0.04 * f.open, MOUTH_FLOOR - ya);
	const ct = ya + 2 * m.sag;
	const cb = ya + 2 * depth;
	const path = () => {
		c.beginPath();
		c.moveTo(f.x - W, ya);
		c.quadraticCurveTo(f.x, ct, f.x + W, ya);
		c.quadraticCurveTo(f.x, cb, f.x - W, ya);
		c.closePath();
	};
	path();
	c.fillStyle = m.inside;
	c.fill();
	c.save();
	path();
	c.clip();
	if (m.tongue) {
		c.beginPath();
		c.ellipse(f.x, ya + depth - 0.01, W * 0.5, 0.06, 0, 0, TAU);
		c.fillStyle = m.tongue;
		c.fill();
		c.beginPath();
		c.moveTo(f.x, ya + depth - 0.055);
		c.lineTo(f.x, ya + depth - 0.02);
		c.strokeStyle = INK;
		c.lineWidth = lw * 0.7;
		c.stroke();
	}
	const edge = (t: number, ctl: number) => ya + 2 * t * (1 - t) * (ctl - ya);
	const tooth = (t: number, len: number, hw: number, dir: 1 | -1) => {
		const x = f.x - W + 2 * W * t;
		const y = edge(t, dir === 1 ? ct : cb);
		c.beginPath();
		c.moveTo(x - hw, y);
		c.lineTo(x, y + dir * len);
		c.lineTo(x + hw, y);
		c.closePath();
		c.fillStyle = m.tooth;
		c.fill();
		c.beginPath();
		c.moveTo(x + hw * 0.15, y);
		c.lineTo(x, y + dir * len);
		c.lineTo(x + hw, y);
		c.closePath();
		c.fillStyle = m.shade;
		c.fill();
		if (m.outline) {
			c.beginPath();
			c.moveTo(x - hw, y);
			c.lineTo(x, y + dir * len);
			c.lineTo(x + hw, y);
			c.strokeStyle = INK;
			c.lineWidth = lw * 0.8;
			c.stroke();
		}
	};
	for (const k of m.top) tooth(k.t, k.len, k.hw, 1);
	for (const k of m.bottom) tooth(k.t, k.len, k.hw, -1);
	c.restore();
	if (m.outline) {
		path();
		c.strokeStyle = INK;
		c.lineWidth = lw;
		c.stroke();
	}
}

// ------------------------------------------------------------------------------- A: the maniac

const flat = (
	shade: StepperHeat['shade'],
	base: StepperHeat['base'],
	light: StepperHeat['light'],
	ember: StepperHeat['ember']
): StepperHeat => ({
	shade,
	base,
	light,
	core: light,
	soot: [0, 0, 0],
	crack: [0, 0, 0],
	ember
});
const RED = flat([122, 20, 18], [216, 52, 31], [255, 122, 58], [255, 168, 60]);
const LIME = flat([27, 63, 10], [114, 184, 28], [201, 251, 72], [190, 255, 80]);
const CHAR = flat([10, 14, 8], [38, 50, 26], [92, 122, 44], [210, 255, 80]);

const faceManic: Face = (c, f) => {
	setup(c, f);
	const ey = f.y - 0.1;
	for (const side of [-1, 1]) {
		ball(c, f, f.x + side * 0.12, ey, 0.1, { sclera: '#fffbea', pupil: 0.028, reach: 0.055 });
		// the brow floats above the eye, the outer end high
		brow(c, f, f.x + side * 0.05, f.y - 0.2, f.x + side * 0.18, f.y - 0.245);
	}
	mouth(c, f, {
		W: 0.3,
		ya: f.y + 0.025,
		sag: 0.05,
		depth: 0.14,
		inside: '#4a0a0c',
		tooth: '#fff4dc',
		shade: '#e6cf9c',
		outline: true,
		top: row(6, 0.07, 0.05),
		bottom: row(6, 0.06, 0.05, true)
	});
	c.restore();
};

// --------------------------------------------------------------------------------- B: the maw

const faceMaw: Face = (c, f) => {
	setup(c, f);
	const ey = f.y - 0.135;
	for (const side of [-1, 1]) {
		ball(c, f, f.x + side * 0.105, ey, 0.062, { sclera: '#ffffff', pupil: 0.024, reach: 0.028 });
		brow(c, f, f.x + side * 0.04, ey - 0.085, f.x + side * 0.17, ey - 0.13);
	}
	mouth(c, f, {
		W: 0.31,
		ya: f.y - 0.03,
		sag: 0.03,
		depth: 0.2,
		inside: '#13200a',
		tooth: '#f6f2d4',
		shade: '#cfc99a',
		outline: true,
		tongue: '#ff6f8e',
		top: [0.14, 0.38, 0.62, 0.86].map((t) => ({ t, len: 0.11, hw: 0.05 })),
		bottom: [0.26, 0.5, 0.74].map((t) => ({ t, len: 0.09, hw: 0.05 }))
	});
	c.restore();
};

// ------------------------------------------------------------------------------- C: the cyclops

const faceCyclops: Face = (c, f) => {
	setup(c, f);
	const lw = lineW(f);
	const ex = f.x;
	const ey = f.y - 0.095;
	const R = 0.13;
	// the lid: a slanted straight cut across the top of the eye (high at the left, low at the right)
	const lid = (x: number) => ey - 0.065 + (x - ex) * 0.32;
	c.save();
	c.beginPath();
	c.moveTo(ex - R - 0.02, lid(ex - R - 0.02));
	c.lineTo(ex + R + 0.02, lid(ex + R + 0.02));
	c.lineTo(ex + R + 0.02, ey + R + 0.02);
	c.lineTo(ex - R - 0.02, ey + R + 0.02);
	c.closePath();
	c.clip();
	c.beginPath();
	c.arc(ex, ey, R, 0, TAU);
	c.fillStyle = '#fff6b8';
	c.fill();
	const ix = ex + f.faceX * 0.035;
	const iy = ey + 0.015 + f.faceY * 0.025;
	c.beginPath();
	c.arc(ix, iy, 0.075, 0, TAU);
	c.fillStyle = '#ff8a1c';
	c.fill();
	c.beginPath();
	c.ellipse(ix, iy, 0.024, 0.075, 0, 0, TAU);
	c.fillStyle = INK;
	c.fill();
	c.beginPath();
	c.arc(ex, ey, R, 0, TAU);
	c.strokeStyle = INK;
	c.lineWidth = lw;
	c.stroke();
	c.restore();
	mouth(c, f, {
		W: 0.28,
		ya: f.y + 0.045,
		sag: 0.045,
		depth: 0.15,
		inside: '#05070a',
		tooth: '#eaff86',
		shade: '#b7d84a',
		outline: false,
		top: [
			{ t: 0.13, len: 0.05, hw: 0.04 },
			{ t: 0.37, len: 0.13, hw: 0.06 },
			{ t: 0.63, len: 0.13, hw: 0.06 },
			{ t: 0.87, len: 0.05, hw: 0.04 }
		],
		bottom: [{ t: 0.5, len: 0.11, hw: 0.055 }]
	});
	c.restore();
};

// ------------------------------------------------------------------------------------- the sheet

const KINDS: readonly GhostKind[] = ['BLINKY', 'PINKY', 'INKY', 'CLYDE'];
const ROWS: readonly { label: string; note: string; rage?: StepperRage }[] = [
	{ label: 'сейчас', note: 'лайм, трещины, пузыри, свет в глазницах' },
	{
		label: 'A · маньяк',
		note: 'выпученные глаза, тонкие брови, улыбка до ушей',
		rage: { hot: RED, face: faceManic, clean: true }
	},
	{
		label: 'B · пасть',
		note: 'крошечные глазки, огромная пасть с языком и клыками',
		rage: { hot: LIME, face: faceMaw, clean: true }
	},
	{
		label: 'C · циклоп',
		note: 'один горящий глаз, пасть с клыком вверх и вниз',
		rage: { hot: CHAR, face: faceCyclops, clean: true }
	}
];

function one(
	ctx: Ctx,
	x: number,
	y: number,
	S: number,
	kind: GhostKind,
	dir: readonly [number, number],
	rage?: StepperRage
): void {
	drawStepper(ctx, x, y, S, kind, {
		lookX: dir[0],
		lookY: dir[1],
		faceX: dir[0],
		faceY: dir[1],
		time: 0.62,
		step: 0.5 + KINDS.indexOf(kind) * 0.9,
		heat: 1,
		rage
	});
}

export function drawRageSheet(ctx: Ctx, vw: number, vh: number): void {
	ctx.fillStyle = '#15191b';
	ctx.fillRect(0, 0, vw, vh);
	const head = 34;
	ctx.fillStyle = '#e8e2d4';
	ctx.font = '600 15px ui-sans-serif, system-ui, sans-serif';
	ctx.textBaseline = 'middle';
	ctx.fillText('ШАГАТЕЛЬ В ЯРОСТИ, четвёртый круг: три характера', 14, head / 2);
	const cols = 6;
	const cw = vw / cols;
	const ch = (vh - head) / ROWS.length;
	const S = Math.min(cw, ch) * 0.78;
	ROWS.forEach((row, r) => {
		const y0 = head + r * ch;
		for (let i = 0; i < cols; i++) {
			ctx.fillStyle = (r + i) % 2 ? '#1b2022' : '#1e2426';
			ctx.fillRect(i * cw + 2, y0 + 2, cw - 4, ch - 4);
		}
		ctx.fillStyle = '#d9d3c4';
		ctx.font = '600 13px ui-sans-serif, system-ui, sans-serif';
		ctx.fillText(row.label, 12, y0 + 14);
		ctx.fillStyle = '#8b9590';
		ctx.font = '11px ui-sans-serif, system-ui, sans-serif';
		ctx.fillText(row.note, 12, y0 + ch - 11);
		KINDS.forEach((kind, i) =>
			one(ctx, i * cw + cw / 2, y0 + ch / 2 + 2, S, kind, [1, 0], row.rage)
		);
		// the game's scale: four kinds on the four headings, 34 px and 24 px
		[34, 24].forEach((size, j) => {
			const cx = (4 + j) * cw + cw / 2;
			KINDS.forEach((kind, i) => {
				const dir = (
					[
						[1, 0],
						[0, 1],
						[-1, 0],
						[0, -1]
					] as const
				)[i];
				const ox = (i % 2 ? 1 : -1) * size * 0.8;
				const oy = (i < 2 ? -1 : 1) * size * 0.7;
				one(ctx, cx + ox, y0 + ch / 2 + oy, size, kind, dir, row.rage);
			});
			ctx.fillStyle = '#8b9590';
			ctx.font = '11px ui-sans-serif, system-ui, sans-serif';
			ctx.fillText(`${size} px`, (4 + j) * cw + 10, y0 + 14);
		});
	});
}
