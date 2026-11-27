// Prototype `pretender?rage`, the second round: the stepper's rage, three candidates against the
// current look on one frozen sheet. The owner rejected the first three as sloppy: too many things
// laid over one another (cracks, soot, bubbles, a glow at the heart, gradients and a different
// stroke on every part, teeth of every size). This round has one rule: **clean, exact, minimal**.
//   - one line weight everywhere (the face's ink is 0.03 of a tile, round caps and joins);
//   - flat fills on the face, no gradients, no glints but the one dot;
//   - plain geometry: a half-disc, a bar, a bowl, equal square teeth; both sides mirror each other
//     (one slant for all four kinds: the kind is told by the crest and the feet);
//   - the body keeps its cel bands and nothing else (`clean`: no heart glow, soot, cracks, bubbles,
//     embers).
//   A  red: a hot red body, white eyes under a straight black brow, a bowl of square teeth;
//   B  lime: the body as now, two black half-disc eyes with one dot each, a zigzag line for a mouth;
//   C  charcoal: a dark body, the face is the only light: pale half-disc eyes, a lit grille mouth.
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
const LINE = (f: FaceArgs) => Math.max(f.px * 1.6, 0.03);

// ------------------------------------------------------------------------------------- shared

/** Runs `paint` in one eye's frame: +x outward, tilted so the end by the nose drops. Both eyes
 *  use the same slant, mirrored. */
function eye(c: Ctx, f: FaceArgs, side: number, dx: number, dy: number, paint: () => void): void {
	const slant = Math.max(0.32, (f.slant[0] + f.slant[1]) / 2);
	c.save();
	c.translate(f.x + side * dx, f.y + dy);
	c.scale(side, 1);
	c.rotate(-slant);
	paint();
	c.restore();
}

/** A half-disc with its flat side up: the lid is the straight edge. */
function halfDisc(c: Ctx, r: number): void {
	c.beginPath();
	c.arc(0, 0, r, 0, Math.PI);
	c.closePath();
}

/** A bowl: flat across the top, round below. */
function bowl(c: Ctx, x: number, y: number, half: number, depth: number): void {
	c.beginPath();
	c.moveTo(x - half, y);
	c.lineTo(x + half, y);
	c.bezierCurveTo(x + half, y + depth * 1.3, x - half, y + depth * 1.3, x - half, y);
	c.closePath();
}

// ---------------------------------------------------------------------------------- A: red

const RED: StepperHeat = {
	shade: [122, 20, 18],
	base: [216, 52, 31],
	light: [255, 122, 58],
	core: [255, 236, 170],
	soot: [0, 0, 0],
	crack: [0, 0, 0],
	ember: [255, 168, 60]
};
const faceRed: Face = (c, f) => {
	const lw = LINE(f);
	c.save();
	c.globalAlpha *= f.alpha;
	c.lineCap = 'round';
	c.lineJoin = 'round';
	for (const side of [-1, 1]) {
		eye(c, f, side, 0.13, -0.035, () => {
			c.beginPath();
			c.ellipse(0, 0.01, 0.1, 0.09, 0, 0, Math.PI * 2);
			c.fillStyle = '#fff4dc';
			c.fill();
			c.strokeStyle = INK;
			c.lineWidth = lw;
			c.stroke();
			c.beginPath();
			c.arc(f.faceX * 0.03, 0.024, 0.04, 0, Math.PI * 2);
			c.fillStyle = INK;
			c.fill();
			// the brow: one straight bar across the top of the eye
			c.beginPath();
			c.moveTo(-0.135, -0.045);
			c.lineTo(0.135, -0.045);
			c.lineWidth = 0.055;
			c.stroke();
		});
	}
	const half = 0.2;
	const top = f.y + 0.085;
	const depth = 0.07 + 0.05 * f.open;
	bowl(c, f.x, top, half, depth);
	c.fillStyle = '#4a0a0c';
	c.fill();
	c.save();
	bowl(c, f.x, top, half, depth);
	c.clip();
	const tw = (half * 2) / 4;
	for (let k = 0; k < 4; k++) {
		c.beginPath();
		c.rect(f.x - half + k * tw + 0.006, top - 0.02, tw - 0.012, 0.07);
		c.fillStyle = '#fff4dc';
		c.fill();
	}
	c.restore();
	bowl(c, f.x, top, half, depth);
	c.strokeStyle = INK;
	c.lineWidth = lw;
	c.stroke();
	c.restore();
};

// ---------------------------------------------------------------------------- B: lime, dark eyes

const LIME: StepperHeat = {
	shade: [27, 63, 10],
	base: [114, 184, 28],
	light: [201, 251, 72],
	core: [251, 255, 210],
	soot: [0, 0, 0],
	crack: [0, 0, 0],
	ember: [190, 255, 80]
};
const faceLime: Face = (c, f) => {
	const lw = LINE(f);
	c.save();
	c.globalAlpha *= f.alpha;
	c.lineCap = 'round';
	c.lineJoin = 'round';
	for (const side of [-1, 1]) {
		eye(c, f, side, 0.13, -0.045, () => {
			halfDisc(c, 0.09);
			c.fillStyle = INK;
			c.fill();
			c.beginPath();
			c.arc(0.03 + f.faceX * 0.01, 0.036, 0.017, 0, Math.PI * 2);
			c.fillStyle = '#ffffff';
			c.fill();
		});
	}
	// the mouth: one zigzag line, even teeth
	const n = 6;
	const half = 0.2;
	const top = f.y + 0.1;
	const drop = 0.06 + 0.03 * f.open;
	c.beginPath();
	for (let k = 0; k <= n; k++) {
		const px = f.x - half + (k * half * 2) / n;
		const py = top + (k % 2 ? drop : 0);
		if (k) c.lineTo(px, py);
		else c.moveTo(px, py);
	}
	c.strokeStyle = INK;
	c.lineWidth = lw * 1.4;
	c.stroke();
	c.restore();
};

// --------------------------------------------------------------------------------- C: charcoal

const CHAR: StepperHeat = {
	shade: [10, 14, 8],
	base: [38, 50, 26],
	light: [92, 122, 44],
	core: [92, 122, 44],
	soot: [0, 0, 0],
	crack: [0, 0, 0],
	ember: [210, 255, 80]
};
const PALE = '#eaff86';
const faceChar: Face = (c, f) => {
	c.save();
	c.globalAlpha *= f.alpha;
	for (const side of [-1, 1]) {
		eye(c, f, side, 0.13, -0.045, () => {
			halfDisc(c, 0.088);
			c.fillStyle = PALE;
			c.fill();
		});
	}
	// the mouth: a lit bowl cut by three dark bars
	const half = 0.2;
	const top = f.y + 0.085;
	const depth = 0.07 + 0.05 * f.open;
	bowl(c, f.x, top, half, depth);
	c.fillStyle = PALE;
	c.fill();
	c.save();
	bowl(c, f.x, top, half, depth);
	c.clip();
	c.fillStyle = INK;
	for (const k of [-1, 0, 1]) c.fillRect(f.x + k * half * 0.5 - 0.012, top - 0.02, 0.024, 0.2);
	c.restore();
	c.restore();
};

// ------------------------------------------------------------------------------------- the sheet

const KINDS: readonly GhostKind[] = ['BLINKY', 'PINKY', 'INKY', 'CLYDE'];
const ROWS: readonly { label: string; note: string; rage?: StepperRage }[] = [
	{ label: 'сейчас', note: 'лайм, трещины, пузыри, свет в глазницах' },
	{
		label: 'A · красная',
		note: 'белые глаза, прямая чёрная бровь, чаша с квадратными зубами',
		rage: { hot: RED, face: faceRed, clean: true }
	},
	{
		label: 'B · лайм',
		note: 'тело то же, два чёрных полудиска с точкой, рот зигзагом',
		rage: { hot: LIME, face: faceLime, clean: true }
	},
	{
		label: 'C · уголь',
		note: 'тёмное тело, светом только лицо: полудиски и решётка',
		rage: { hot: CHAR, face: faceChar, clean: true }
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
	ctx.fillText('ШАГАТЕЛЬ В ЯРОСТИ, второй круг: чисто, точно, минимум линий', 14, head / 2);
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
