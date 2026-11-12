// Three simpler Blinkys, each told apart in the three phases by one change of silhouette and one
// change of colour, with none of the belly wound, cracks, second horns, skirt of flames and glow
// that pile up in the current phase 3. Built on the game's own ghost helpers (`hellGhost`).
import type { CelTones, GhostShape, HornStyle } from '../../../src/games/pacman/render/doom/hellGhost';
import {
	INK,
	celBands,
	celOutline,
	drawEyes,
	drawHorns,
	ghostPath
} from '../../../src/games/pacman/render/doom/hellGhost';

export type Direction = 'horns' | 'colour' | 'iron';
/** The colour of phase II in the 'colour' direction (black was rejected: it sinks into the floor). */
export type Phase2 = 'black' | 'orange' | 'magenta' | 'blue';

interface Look extends CelTones {
	readonly rim: string;
	readonly horn: HornStyle;
	readonly eye: string;
	readonly plate: 0 | 1 | 2;
}

const BONE: readonly [string, string] = ['#f1e4cc', '#9c8a72'];
const IRON: readonly [string, string] = ['#7d7378', '#2b2427'];

const RED = { light: '#f4604e', mid: '#d0261f', shade: '#7a0c14' };
const DEEP = { light: '#d8402e', mid: '#a01418', shade: '#4a060c' };

const PHASE2: Record<Phase2, Look> = {
	black: {
		light: '#4a2a2c',
		mid: '#2a1517',
		shade: '#120708',
		rim: '#ff8a3a',
		horn: { length: 0.5, curl: 0.1, bone: ['#8a7a68', '#3a3028'], ember: null },
		eye: '#ff9a3a',
		plate: 0
	},
	orange: {
		light: '#ffc65a',
		mid: '#f08a24',
		shade: '#b0400c',
		rim: '#fff0c0',
		horn: { length: 0.5, curl: 0.1, bone: BONE, ember: null },
		eye: '#ffffff',
		plate: 0
	},
	magenta: {
		light: '#ff7ac8',
		mid: '#d02a8a',
		shade: '#6a0c4a',
		rim: '#ffd0ec',
		horn: { length: 0.5, curl: 0.1, bone: BONE, ember: null },
		eye: '#ffe27a',
		plate: 0
	},
	blue: {
		light: '#9ad8ff',
		mid: '#3a8ae0',
		shade: '#143a80',
		rim: '#e0f4ff',
		horn: { length: 0.5, curl: 0.1, bone: BONE, ember: null },
		eye: '#ffffff',
		plate: 0
	}
};

const LOOKS: Record<Direction, readonly Look[]> = {
	// the horns grow; the eyes heat up
	horns: [
		{ ...RED, rim: '#ffc9a8', horn: { length: 0.3, curl: 0, bone: BONE, ember: null }, eye: '#ffe27a', plate: 0 },
		{ ...RED, rim: '#ffc9a8', horn: { length: 0.62, curl: 0.25, bone: BONE, ember: null }, eye: '#ffb04a', plate: 0 },
		{ ...DEEP, rim: '#ffb070', horn: { length: 0.9, curl: 0.55, bone: BONE, ember: '255,150,60' }, eye: '#ffffff', plate: 0 }
	],
	// the shape stays; the colour heats: red, charred with a hot contour, white-hot
	colour: [
		{ ...RED, rim: '#ffc9a8', horn: { length: 0.5, curl: 0.1, bone: BONE, ember: null }, eye: '#ffe27a', plate: 0 },
		PHASE2.black,
		{
			light: '#fff4c0',
			mid: '#ffa22c',
			shade: '#d8381a',
			rim: '#ffffff',
			horn: { length: 0.5, curl: 0.1, bone: ['#fff6dc', '#d0a070'], ember: null },
			eye: '#ffffff',
			plate: 0
		}
	],
	// the maze's iron: bare, a brow band, a full helm with iron horns
	iron: [
		{ ...RED, rim: '#ffc9a8', horn: { length: 0.4, curl: 0, bone: BONE, ember: null }, eye: '#ffe27a', plate: 0 },
		{ ...RED, rim: '#ffc9a8', horn: { length: 0.5, curl: 0.15, bone: BONE, ember: null }, eye: '#ffe27a', plate: 1 },
		{ ...DEEP, rim: '#ffb070', horn: { length: 0.78, curl: 0.45, bone: IRON, ember: null }, eye: '#ffe27a', plate: 2 }
	]
};

function plates(ctx: CanvasRenderingContext2D, shape: GhostShape, plate: 1 | 2): void {
	const { w, domeY } = shape;
	const grad = (y0: number, y1: number) => {
		const g = ctx.createLinearGradient(0, y0, 0, y1);
		g.addColorStop(0, '#8a7f84');
		g.addColorStop(1, '#4a4044');
		return g;
	};
	const rivet = (x: number, y: number) => {
		ctx.fillStyle = INK;
		ctx.beginPath();
		ctx.arc(x + 0.5, y + 0.6, w * 0.07, 0, 6.3);
		ctx.fill();
		ctx.fillStyle = 'rgba(255,235,215,.7)';
		ctx.beginPath();
		ctx.arc(x - 0.4, y - 0.4, w * 0.035, 0, 6.3);
		ctx.fill();
	};
	ctx.lineWidth = Math.max(1.4, w * 0.1);
	ctx.strokeStyle = INK;
	if (plate === 1) {
		const y0 = domeY - w * 0.5;
		const y1 = domeY - w * 0.22;
		ctx.fillStyle = grad(y0, y1);
		ctx.fillRect(-w * 1.2, y0, w * 2.4, y1 - y0);
		ctx.strokeRect(-w * 1.3, y0, w * 2.6, y1 - y0);
		for (const x of [-0.62, 0, 0.62]) rivet(x * w, (y0 + y1) / 2);
		return;
	}
	const yb = domeY - w * 0.04;
	const top = domeY - w * 1.3;
	ctx.fillStyle = grad(top, yb);
	ctx.fillRect(-w * 1.2, top, w * 2.4, yb - top);
	ctx.fillStyle = 'rgba(255,240,225,.28)';
	ctx.fillRect(-w * 0.1, top, w * 0.2, yb - top);
	ctx.beginPath();
	ctx.moveTo(-w * 1.3, yb);
	ctx.lineTo(w * 1.3, yb);
	ctx.stroke();
	for (const x of [-0.7, -0.35, 0.35, 0.7]) rivet(x * w, yb - w * 0.14);
}

export function drawBoss(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	S: number,
	phase: 1 | 2 | 3,
	dir: Direction,
	time: number,
	p2: Phase2 = 'black'
): void {
	const look = dir === 'colour' && phase === 2 ? PHASE2[p2] : LOOKS[dir][phase - 1];
	const R = S * 0.5;
	const bob = Math.sin(time * 3.2) * R * 0.03;
	const shape: GhostShape = {
		w: R * 0.64,
		domeY: -R * 0.02 + bob,
		hem: R * 0.78 + bob,
		feet: 4,
		torn: 0,
		seed: 7
	};
	const { w, domeY } = shape;
	ctx.save();
	ctx.translate(x, y);
	ctx.lineJoin = 'round';
	ctx.lineCap = 'round';
	// a soft dark pool keeps him on the floor
	const pool = ctx.createRadialGradient(0, R * 0.2, R * 0.2, 0, R * 0.2, R);
	pool.addColorStop(0, 'rgba(0,0,0,0.5)');
	pool.addColorStop(1, 'rgba(0,0,0,0)');
	ctx.fillStyle = pool;
	ctx.fillRect(-R, -R * 0.8, R * 2, R * 2);
	drawHorns(ctx, 0, 0, shape, 0.55, look.horn, 0.5);
	ghostPath(ctx, 0, 0, shape, time);
	ctx.fillStyle = look.mid;
	ctx.fill();
	ctx.save();
	ghostPath(ctx, 0, 0, shape, time);
	ctx.clip();
	celBands(ctx, shape, look);
	if (look.plate) plates(ctx, shape, look.plate);
	ctx.restore();
	celOutline(ctx, shape, time, look.rim);
	if (dir === 'colour' && phase === 2 && p2 === 'black') {
		// the contour glows: one hot line round the whole body
		ghostPath(ctx, 0, 0, shape, time);
		ctx.strokeStyle = 'rgba(255,140,50,.95)';
		ctx.lineWidth = Math.max(1, w * 0.07);
		ctx.stroke();
	}
	const faceY = domeY + w * 0.35;
	drawEyes(ctx, 0, faceY, w, 0, { sclera: look.eye, glow: null }, 1, false, time);
	// one fixed scowl in every phase
	const my = faceY + w * 0.42;
	ctx.fillStyle = '#120000';
	ctx.beginPath();
	ctx.moveTo(-w * 0.36, my - w * 0.04);
	ctx.quadraticCurveTo(0, my + w * 0.08, w * 0.36, my - w * 0.04);
	ctx.quadraticCurveTo(0, my + w * 0.02, -w * 0.36, my - w * 0.04);
	ctx.fill();
	ctx.restore();
}
