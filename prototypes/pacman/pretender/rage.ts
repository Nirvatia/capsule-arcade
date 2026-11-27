// Prototype `pretender?rage`, round three: the stepper's rage, three candidates against the current
// look on one frozen sheet. Round one was sloppy (everything laid over everything), round two was
// clean but dull (no anger, no teeth). This round keeps the clean drawing and brings the face back:
//   - EYES: big, cut by a lid at a hard slant, a heavy straight-edged brow thick at the nose (the
//     two brows make a V), a pupil that touches the lid and glares along the heading;
//   - MOUTH: wide, a grin with corners up, two interlocking rows of even pointed teeth, the two
//     fangs a little longer;
//   - one line weight, flat fills, both sides mirrored; the body keeps only its cel bands (`clean`).
//   A  red: a hot red body, white eyes with round black pupils, a dark red mouth, cream teeth;
//   B  lime: the body as now, yellow eyes with slit pupils, a dark green mouth, cream teeth;
//   C  charcoal: a dark body, lit pale eyes, a black mouth with pale teeth only (the grin shows).
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

// ------------------------------------------------------------------------------------- the face

interface Style {
	readonly sclera: string;
	readonly pupil: 'disc' | 'slit';
	readonly mouth: string;
	readonly tooth: string;
	readonly toothShade: string;
	/** Draw the ink outline of the mouth and the teeth (off where the body is dark). */
	readonly outline: boolean;
}

function makeFace(st: Style): Face {
	return (c, f) => {
		const lw = Math.max(f.px * 1.6, 0.03);
		c.save();
		c.globalAlpha *= f.alpha;
		c.lineCap = 'round';
		c.lineJoin = 'round';
		// the eyes: one frame per side, +x outward, tilted so the nose end drops
		const lid = -0.015;
		for (const side of [-1, 1]) {
			c.save();
			c.translate(f.x + side * 0.145, f.y - 0.075);
			c.scale(side, 1);
			c.rotate(-0.5);
			c.save();
			c.beginPath();
			c.rect(-0.2, lid, 0.4, 0.3);
			c.clip();
			c.beginPath();
			c.ellipse(0, 0.018, 0.105, 0.092, 0, 0, TAU);
			c.fillStyle = st.sclera;
			c.fill();
			const gx = f.faceX * side * 0.03;
			const gy = f.faceY * 0.02;
			c.fillStyle = INK;
			c.beginPath();
			if (st.pupil === 'disc') c.arc(gx, lid + 0.044 + gy, 0.048, 0, TAU);
			else c.ellipse(gx, lid + 0.06 + gy, 0.022, 0.075, 0, 0, TAU);
			c.fill();
			if (st.pupil === 'disc') {
				c.beginPath();
				c.arc(gx - 0.014, lid + 0.03 + gy, 0.014, 0, TAU);
				c.fillStyle = '#ffffff';
				c.fill();
			}
			c.beginPath();
			c.ellipse(0, 0.018, 0.105, 0.092, 0, 0, TAU);
			c.strokeStyle = INK;
			c.lineWidth = lw;
			c.stroke();
			c.restore();
			// the brow: a wedge with straight edges, thick at the nose
			c.beginPath();
			c.moveTo(-0.135, lid);
			c.lineTo(0.15, lid);
			c.lineTo(0.15, lid - 0.045);
			c.lineTo(-0.135, lid - 0.1);
			c.closePath();
			c.fillStyle = INK;
			c.fill();
			c.strokeStyle = INK;
			c.lineWidth = lw;
			c.stroke();
			c.restore();
		}
		// the mouth: a grin, corners up, two rows of even teeth that interlock
		const W = 0.27;
		const ya = f.y + 0.05;
		const yt = ya + 0.03;
		const yb = ya + 0.115 + 0.04 * f.open;
		const ct = 2 * yt - ya;
		const cb = 2 * yb - ya;
		const path = () => {
			c.beginPath();
			c.moveTo(f.x - W, ya);
			c.quadraticCurveTo(f.x, ct, f.x + W, ya);
			c.quadraticCurveTo(f.x, cb, f.x - W, ya);
			c.closePath();
		};
		path();
		c.fillStyle = st.mouth;
		c.fill();
		c.save();
		path();
		c.clip();
		const N = 5;
		const edge = (t: number, ctl: number) => (1 - t) ** 2 * ya + 2 * t * (1 - t) * ctl + t * t * ya;
		const tooth = (x: number, y: number, hw: number, len: number, dir: number) => {
			c.beginPath();
			c.moveTo(x - hw, y);
			c.lineTo(x, y + dir * len);
			c.lineTo(x + hw, y);
			c.closePath();
			c.fillStyle = st.tooth;
			c.fill();
			c.beginPath();
			c.moveTo(x + hw * 0.15, y);
			c.lineTo(x, y + dir * len);
			c.lineTo(x + hw, y);
			c.closePath();
			c.fillStyle = st.toothShade;
			c.fill();
			if (st.outline) {
				c.beginPath();
				c.moveTo(x - hw, y);
				c.lineTo(x, y + dir * len);
				c.lineTo(x + hw, y);
				c.strokeStyle = INK;
				c.lineWidth = lw * 0.8;
				c.stroke();
			}
		};
		const hw = (W / N) * 0.95;
		for (let k = 0; k < N; k++) {
			const t = (k + 0.5) / N;
			const fang = k === 1 || k === N - 2;
			tooth(f.x - W + 2 * W * t, edge(t, ct), hw, fang ? 0.115 : 0.075, 1);
		}
		for (let k = 1; k < N; k++) {
			const t = k / N;
			tooth(f.x - W + 2 * W * t, edge(t, cb), hw, 0.07, -1);
		}
		c.restore();
		if (st.outline) {
			path();
			c.strokeStyle = INK;
			c.lineWidth = lw;
			c.stroke();
		}
		c.restore();
	};
}

const flat = (shade: StepperHeat['shade'], base: StepperHeat['base'], light: StepperHeat['light'], ember: StepperHeat['ember']): StepperHeat => ({
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

const faceRed = makeFace({
	sclera: '#fff4dc',
	pupil: 'disc',
	mouth: '#4a0a0c',
	tooth: '#fff4dc',
	toothShade: '#e6cf9c',
	outline: true
});
const faceLime = makeFace({
	sclera: '#ffe24a',
	pupil: 'slit',
	mouth: '#13200a',
	tooth: '#f6f2d4',
	toothShade: '#cfc99a',
	outline: true
});
const faceChar = makeFace({
	sclera: '#eaff86',
	pupil: 'disc',
	mouth: '#05070a',
	tooth: '#eaff86',
	toothShade: '#b7d84a',
	outline: false
});

// ------------------------------------------------------------------------------------- the sheet

const KINDS: readonly GhostKind[] = ['BLINKY', 'PINKY', 'INKY', 'CLYDE'];
const ROWS: readonly { label: string; note: string; rage?: StepperRage }[] = [
	{ label: 'сейчас', note: 'лайм, трещины, пузыри, свет в глазницах' },
	{
		label: 'A · красная',
		note: 'белые глаза, тяжёлая бровь, пасть с клыками',
		rage: { hot: RED, face: faceRed, clean: true }
	},
	{
		label: 'B · лайм',
		note: 'тело то же, жёлтые глаза со щелью, пасть с клыками',
		rage: { hot: LIME, face: faceLime, clean: true }
	},
	{
		label: 'C · уголь',
		note: 'тёмное тело, горят глаза и зубы, пасть чёрная',
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
	ctx.fillText('ШАГАТЕЛЬ В ЯРОСТИ, третий круг: злые глаза, зубастая пасть, чистая линия', 14, head / 2);
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
