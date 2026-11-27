// Prototype `pretender?rage`: the stepper's rage, three candidates against the current look on one
// frozen sheet (the owner: the faces read badly). Why they read badly: the body, the socket's glow,
// the grin's inside and the teeth are all the same pale lime, the sockets are 2-3 px slits at game
// scale. The candidates split the face from the body by value and give the eyes a size:
//   A  red: a hot red body, white eyes with black pupils, black brows, a black maw (the classic
//      angry face; the kind's colour stays on the feet and the crest);
//   B  lime, a mask: the body as now, but a dark plate across the eyes with big lit slit eyes in it;
//   C  charcoal: a burnt body with lime cracks and a face that is all light (a jack-o'-lantern).
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
const TAU = Math.PI * 2;
const INK = '#1b0f15';

// ------------------------------------------------------------------------------------- shared

/** A jaw that splits the body: the path of the maw, its dark inside, the teeth, the lit tongue. */
function maw(
	c: Ctx,
	f: FaceArgs,
	look: {
		inside: [string, string, string];
		tooth: string;
		toothShade: string;
		teeth: number;
		len: number;
		glow?: boolean;
	}
): void {
	const { x, open, px, kind } = f;
	const W = 0.25;
	const cy = f.y + 0.06;
	const mid = cy + 0.03;
	const bot = cy + 0.1 + open * 0.1;
	const low = bot * 2 - mid;
	const path = () => {
		c.beginPath();
		c.moveTo(x - W, cy);
		c.quadraticCurveTo(x, mid - 0.03, x + W, cy);
		c.quadraticCurveTo(x, low, x - W, cy);
		c.closePath();
	};
	path();
	const g = c.createLinearGradient(0, cy, 0, bot);
	g.addColorStop(0, look.inside[0]);
	g.addColorStop(0.55, look.inside[1]);
	g.addColorStop(1, look.inside[2]);
	c.fillStyle = g;
	c.fill();
	c.save();
	path();
	c.clip();
	const seed = ['BLINKY', 'PINKY', 'INKY', 'CLYDE'].indexOf(kind);
	for (const dir of [1, -1]) {
		for (let k = 0; k < look.teeth; k++) {
			const t = (k + 0.5) / look.teeth;
			const lx = x + W * 0.94 * (2 * t - 1);
			const edge =
				dir === 1
					? (1 - t) ** 2 * cy + 2 * t * (1 - t) * (mid - 0.03) + t * t * cy
					: (1 - t) ** 2 * cy + 2 * t * (1 - t) * low + t * t * cy;
			const wob = 0.8 + 0.4 * Math.abs(Math.sin(k * 2.7 + seed + dir));
			const len = look.len * wob * (0.55 + 0.7 * Math.sin(Math.PI * t));
			const half = (W / look.teeth) * 0.9;
			c.beginPath();
			c.moveTo(lx - half, edge);
			c.lineTo(lx, edge + dir * len);
			c.lineTo(lx + half, edge);
			c.closePath();
			c.fillStyle = look.tooth;
			c.fill();
			c.beginPath();
			c.moveTo(lx + half * 0.1, edge);
			c.lineTo(lx, edge + dir * len);
			c.lineTo(lx + half, edge);
			c.closePath();
			c.fillStyle = look.toothShade;
			c.fill();
			c.strokeStyle = INK;
			c.lineWidth = Math.max(px, 0.014);
			c.lineJoin = 'round';
			c.beginPath();
			c.moveTo(lx - half, edge);
			c.lineTo(lx, edge + dir * len);
			c.lineTo(lx + half, edge);
			c.stroke();
		}
	}
	c.restore();
	path();
	c.strokeStyle = INK;
	c.lineWidth = Math.max(px * 2, 0.046);
	c.lineJoin = 'round';
	c.stroke();
	for (const side of [-1, 1]) {
		c.beginPath();
		c.moveTo(x + side * (W + 0.004), cy - 0.008);
		c.lineTo(x + side * (W + 0.03), cy - 0.04);
		c.stroke();
	}
}

/** The brow: a heavy black wedge, thick at the nose, its lower edge straight and the eye's lid. */
function brow(c: Ctx, px: number, inner: number, outer: number): void {
	c.beginPath();
	c.moveTo(-0.15, 0);
	c.lineTo(0.15, 0);
	c.lineTo(0.16, -outer);
	c.quadraticCurveTo(0, -inner * 1.1, -0.155, -inner);
	c.closePath();
	c.fillStyle = INK;
	c.fill();
	c.lineJoin = 'round';
	c.strokeStyle = INK;
	c.lineWidth = Math.max(px, 0.014);
	c.stroke();
}

/** Runs `paint` in an eye's own frame: +x outward, tilted so the nose end drops by `slant`. */
function inEye(
	c: Ctx,
	f: FaceArgs,
	i: number,
	dx: number,
	dy: number,
	paint: (c: Ctx, size: number) => void
): void {
	const side = i ? 1 : -1;
	c.save();
	c.translate(f.x + side * dx, f.y + dy);
	c.scale(side, 1);
	c.rotate(-f.slant[i] * 0.85);
	paint(c, f.size[i]);
	c.restore();
}

// ---------------------------------------------------------------------------------- A: red

const RED: StepperHeat = {
	shade: [92, 14, 16],
	base: [222, 58, 28],
	light: [255, 150, 64],
	core: [255, 236, 170],
	soot: [60, 6, 8],
	crack: [58, 6, 8],
	ember: [255, 168, 60]
};
const faceRed: Face = (c, f) => {
	c.save();
	c.globalAlpha *= f.alpha;
	for (const i of [0, 1]) {
		inEye(c, f, i, 0.14, -0.04, (cc, size) => {
			const rx = 0.112 * size;
			const ry = 0.098 * size;
			// the white ball, cut flat by the lid
			cc.save();
			cc.beginPath();
			cc.rect(-0.2, -0.026, 0.4, 0.3);
			cc.clip();
			const g = cc.createRadialGradient(-rx * 0.2, -ry * 0.2, rx * 0.1, 0, 0, rx * 1.1);
			g.addColorStop(0, '#ffffff');
			g.addColorStop(0.7, '#fff1c8');
			g.addColorStop(1, '#f0b878');
			cc.beginPath();
			cc.ellipse(0, 0.012, rx, ry, 0, 0, TAU);
			cc.fillStyle = g;
			cc.fill();
			// the pupil: black, glaring along the heading, the lid cutting its top
			const pxg = f.faceX * rx * 0.34;
			const pyg = 0.026 + f.faceY * ry * 0.18;
			cc.beginPath();
			cc.arc(pxg, pyg, 0.05 * size, 0, TAU);
			cc.fillStyle = INK;
			cc.fill();
			cc.beginPath();
			cc.arc(pxg - 0.016, pyg - 0.006, 0.013, 0, TAU);
			cc.fillStyle = '#ffffff';
			cc.fill();
			cc.restore();
			cc.beginPath();
			cc.ellipse(0, 0.012, rx, ry, 0, 0.05, Math.PI - 0.05);
			cc.strokeStyle = INK;
			cc.lineWidth = Math.max(f.px * 1.8, 0.03);
			cc.lineCap = 'round';
			cc.stroke();
			cc.translate(0, -0.026);
			brow(cc, f.px, 0.09 * size, 0.056 * size);
		});
	}
	maw(c, f, {
		inside: ['#7a1410', '#c4351c', '#ff8a3c'],
		tooth: '#fff4d0',
		toothShade: '#e0c690',
		teeth: 5,
		len: 0.07
	});
	c.restore();
};

// ------------------------------------------------------------------------------ B: lime, a mask

const faceMask: Face = (c, f) => {
	c.save();
	c.globalAlpha *= f.alpha;
	// the plate: a dark band across the eyes, a notch at the nose, the lower edge lit
	const w = 0.285;
	c.beginPath();
	c.moveTo(f.x - w, f.y - 0.07);
	c.quadraticCurveTo(f.x - w * 0.6, f.y - 0.125, f.x - 0.02, f.y - 0.085);
	c.lineTo(f.x, f.y - 0.06);
	c.lineTo(f.x + 0.02, f.y - 0.085);
	c.quadraticCurveTo(f.x + w * 0.6, f.y - 0.125, f.x + w, f.y - 0.07);
	c.quadraticCurveTo(f.x + w * 1.02, f.y + 0.03, f.x + w * 0.5, f.y + 0.045);
	c.quadraticCurveTo(f.x, f.y + 0.02, f.x - w * 0.5, f.y + 0.045);
	c.quadraticCurveTo(f.x - w * 1.02, f.y + 0.03, f.x - w, f.y - 0.07);
	c.closePath();
	c.fillStyle = '#14100f';
	c.fill();
	c.strokeStyle = INK;
	c.lineWidth = Math.max(f.px * 1.8, 0.036);
	c.lineJoin = 'round';
	c.stroke();
	for (const i of [0, 1]) {
		inEye(c, f, i, 0.135, -0.022, (cc, size) => {
			const w2 = 0.105 * size;
			const h2 = 0.052 * size;
			// the glow, then the slit eye: a slanted lens, white-hot at the middle
			const gl = cc.createRadialGradient(0, 0, 0, 0, 0, w2 * 1.5);
			gl.addColorStop(0, 'rgba(230, 255, 120, 0.55)');
			gl.addColorStop(1, 'rgba(230, 255, 120, 0)');
			cc.fillStyle = gl;
			cc.fillRect(-w2 * 1.6, -w2 * 1.6, w2 * 3.2, w2 * 3.2);
			cc.beginPath();
			cc.moveTo(-w2, -h2 * 0.35);
			cc.quadraticCurveTo(-w2 * 0.1, -h2 * 1.5, w2, -h2 * 1.1);
			cc.quadraticCurveTo(w2 * 0.2, h2 * 1.2, -w2, -h2 * 0.35);
			cc.closePath();
			const eg = cc.createLinearGradient(0, -h2, 0, h2);
			eg.addColorStop(0, '#ffffe6');
			eg.addColorStop(1, '#c6f23a');
			cc.fillStyle = eg;
			cc.fill();
			// the pupil: a dark upright slit that follows the heading
			cc.beginPath();
			cc.ellipse(f.faceX * w2 * 0.28 + 0.01, 0.002 + f.faceY * 0.01, 0.017, h2 * 0.95, 0, 0, TAU);
			cc.fillStyle = INK;
			cc.fill();
		});
	}
	maw(c, f, {
		inside: ['#1a0d08', '#2a1608', '#6e8a1a'],
		tooth: '#f4f0cc',
		toothShade: '#c4be8c',
		teeth: 6,
		len: 0.075
	});
	c.restore();
};

// --------------------------------------------------------------------------------- C: charcoal

const CHAR: StepperHeat = {
	shade: [8, 11, 6],
	base: [34, 44, 24],
	light: [84, 112, 40],
	core: [84, 130, 30],
	soot: [0, 0, 0],
	crack: [196, 255, 64],
	ember: [210, 255, 80]
};
const faceChar: Face = (c, f) => {
	c.save();
	c.globalAlpha *= f.alpha;
	for (const i of [0, 1]) {
		inEye(c, f, i, 0.135, -0.04, (cc, size) => {
			const w2 = 0.105 * size;
			const h2 = 0.074 * size;
			const gl = cc.createRadialGradient(0, 0, 0, 0, 0, w2 * 1.7);
			gl.addColorStop(0, 'rgba(214, 255, 90, 0.6)');
			gl.addColorStop(1, 'rgba(214, 255, 90, 0)');
			cc.fillStyle = gl;
			cc.fillRect(-w2 * 1.8, -w2 * 1.8, w2 * 3.6, w2 * 3.6);
			// a lit eye cut flat on top by the lid, a hard dark pupil inside
			cc.beginPath();
			cc.moveTo(-w2, -0.01);
			cc.lineTo(w2, -0.03);
			cc.quadraticCurveTo(w2 * 0.9, h2 * 1.2, -w2 * 0.1, h2 * 1.15);
			cc.quadraticCurveTo(-w2 * 0.95, h2 * 0.9, -w2, -0.01);
			cc.closePath();
			const eg = cc.createRadialGradient(0, 0.01, 0.005, 0, 0.01, w2);
			eg.addColorStop(0, '#fffff0');
			eg.addColorStop(0.6, '#ecff7c');
			eg.addColorStop(1, '#9fe02a');
			cc.fillStyle = eg;
			cc.fill();
			cc.strokeStyle = INK;
			cc.lineWidth = Math.max(f.px * 1.4, 0.026);
			cc.lineJoin = 'round';
			cc.stroke();
			cc.beginPath();
			cc.arc(f.faceX * w2 * 0.3, 0.02 + f.faceY * 0.01, 0.034 * size, 0, TAU);
			cc.fillStyle = INK;
			cc.fill();
		});
	}
	// the jack-o'-lantern mouth: a lit grin cut by dark teeth
	maw(c, f, {
		inside: ['#fffff0', '#e4ff6c', '#a6e32a'],
		tooth: '#14100f',
		toothShade: '#000000',
		teeth: 5,
		len: 0.062
	});
	c.restore();
};

// ------------------------------------------------------------------------------------- the sheet

const KINDS: readonly GhostKind[] = ['BLINKY', 'PINKY', 'INKY', 'CLYDE'];
const ROWS: readonly { label: string; note: string; rage?: StepperRage }[] = [
	{ label: 'сейчас', note: 'лайм, узкие глазницы, одно пятно света' },
	{
		label: 'A · красная',
		note: 'красное тело, белые глаза, чёрные брови и пасть',
		rage: { hot: RED, face: faceRed }
	},
	{
		label: 'B · лайм, маска',
		note: 'тело как сейчас, тёмная маска, горящие глаза в ней',
		rage: { hot: {
			shade: [27, 63, 10], base: [114, 184, 28], light: [201, 251, 72], core: [251, 255, 210],
			soot: [10, 30, 5], crack: [22, 52, 8], ember: [190, 255, 80]
		}, face: faceMask }
	},
	{
		label: 'C · уголь',
		note: 'обгорелое тело, лаймовые трещины, лицо из света',
		rage: { hot: CHAR, face: faceChar }
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
	ctx.fillText('ШАГАТЕЛЬ В ЯРОСТИ: три лица против нынешнего', 14, head / 2);
	const cols = 6;
	const cw = vw / cols;
	const ch = (vh - head) / ROWS.length;
	const S = Math.min(cw, ch) * 0.78;
	ROWS.forEach((row, r) => {
		const y0 = head + r * ch;
		for (let i = 0; i < cols; i++) {
			const x0 = i * cw;
			ctx.fillStyle = (r + i) % 2 ? '#1b2022' : '#1e2426';
			ctx.fillRect(x0 + 2, y0 + 2, cw - 4, ch - 4);
		}
		ctx.fillStyle = '#d9d3c4';
		ctx.font = '600 13px ui-sans-serif, system-ui, sans-serif';
		ctx.fillText(row.label, 12, y0 + 14);
		ctx.fillStyle = '#8b9590';
		ctx.font = '11px ui-sans-serif, system-ui, sans-serif';
		ctx.fillText(row.note, 12, y0 + ch - 11);
		KINDS.forEach((kind, i) => one(ctx, i * cw + cw / 2, y0 + ch / 2 + 2, S, kind, [1, 0], row.rage));
		// the game's scale: four kinds on the four headings, 34 px and 24 px
		[34, 24].forEach((px, j) => {
			const cx = (4 + j) * cw + cw / 2;
			KINDS.forEach((kind, i) => {
				const dir = ([[1, 0], [0, 1], [-1, 0], [0, -1]] as const)[i];
				one(ctx, cx + (i % 2 ? 1 : -1) * px * 0.8, y0 + ch / 2 + (i < 2 ? -1 : 1) * px * 0.7, px, kind, dir, row.rage);
			});
			ctx.fillStyle = '#8b9590';
			ctx.font = '11px ui-sans-serif, system-ui, sans-serif';
			ctx.fillText(`${px} px`, (4 + j) * cw + 10, y0 + 14);
		});
	});
}
