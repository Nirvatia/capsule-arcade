// Blinky keeps one body colour (the arcade red: the other colours belong to the imps) and the
// phases are told apart by other things, one added element per phase, none of the belly wound,
// cracks, second horns, skirt of flames or glow that pile up in the current phase 3. Built on the
// game's own ghost helpers (`hellGhost`).
import type { CelTones, GhostShape, HornStyle } from '../../../src/games/pacman/render/doom/hellGhost';
import {
	INK,
	celBands,
	celOutline,
	drawEyes,
	drawHorns,
	ghostPath
} from '../../../src/games/pacman/render/doom/hellGhost';

/**
 * `iron`: a helm with a nose guard, then cheek plates and iron horns. `chains`: shackled, one
 * chain broken, free. `crown`: none, a low crown, a tall crown. `eye`: none, a third eye shut, open.
 */
export type Direction = 'iron' | 'chains' | 'crown' | 'eye';

interface Look {
	readonly horn: HornStyle;
	readonly helm: boolean;
	readonly nose: boolean;
	readonly cheeks: boolean;
	readonly chains: 'none' | 'both' | 'one' | 'cuffs';
	readonly crown: 0 | 1 | 2;
	readonly eye3: 0 | 1 | 2;
}

const BONE: readonly [string, string] = ['#f1e4cc', '#9c8a72'];
const IRON: readonly [string, string] = ['#9a8f94', '#2b2427'];
const BODY: CelTones & { rim: string } = {
	light: '#f4604e',
	mid: '#d0261f',
	shade: '#7a0c14',
	rim: '#ffc9a8'
};
const horn = (length: number, curl: number, bone = BONE): HornStyle => ({
	length,
	curl,
	bone,
	ember: null
});
const NONE: Look = {
	horn: horn(0.5, 0.15),
	helm: false,
	nose: false,
	cheeks: false,
	chains: 'none',
	crown: 0,
	eye3: 0
};

const LOOKS: Record<Direction, readonly Look[]> = {
	iron: [
		{ ...NONE, horn: horn(0.4, 0) },
		{ ...NONE, helm: true, nose: true },
		{ ...NONE, helm: true, nose: true, cheeks: true, horn: horn(0.85, 0.4, IRON) }
	],
	chains: [
		{ ...NONE, chains: 'both' },
		{ ...NONE, chains: 'one' },
		{ ...NONE, chains: 'cuffs' }
	],
	crown: [NONE, { ...NONE, crown: 1 }, { ...NONE, crown: 2 }],
	eye: [NONE, { ...NONE, eye3: 1 }, { ...NONE, eye3: 2 }]
};

/** A bold iron helm over the top of the dome, with a ridge and a row of rivets. */
function helm(ctx: CanvasRenderingContext2D, shape: GhostShape): void {
	const { w, domeY } = shape;
	const yb = domeY - w * 0.04;
	const top = domeY - w * 1.3;
	const g = ctx.createLinearGradient(0, top, 0, yb);
	g.addColorStop(0, '#9a8f94');
	g.addColorStop(1, '#4a4044');
	ctx.fillStyle = g;
	ctx.fillRect(-w * 1.2, top, w * 2.4, yb - top);
	ctx.fillStyle = 'rgba(255,240,225,.3)';
	ctx.fillRect(-w * 0.1, top, w * 0.2, yb - top);
	ctx.strokeStyle = INK;
	ctx.lineWidth = Math.max(1.6, w * 0.13);
	ctx.beginPath();
	ctx.moveTo(-w * 1.3, yb);
	ctx.lineTo(w * 1.3, yb);
	ctx.stroke();
	for (const x of [-0.7, -0.35, 0.35, 0.7]) {
		ctx.fillStyle = INK;
		ctx.beginPath();
		ctx.arc(x * w + 0.5, yb - w * 0.14 + 0.6, w * 0.07, 0, 6.3);
		ctx.fill();
		ctx.fillStyle = 'rgba(255,235,215,.75)';
		ctx.beginPath();
		ctx.arc(x * w - 0.4, yb - w * 0.14 - 0.4, w * 0.035, 0, 6.3);
		ctx.fill();
	}
}

/** The nose guard: an iron bar from the helm down between the eyes. */
function nose(ctx: CanvasRenderingContext2D, shape: GhostShape): void {
	const { w, domeY } = shape;
	const top = domeY - w * 0.05;
	const bot = domeY + w * 0.5;
	const g = ctx.createLinearGradient(-w * 0.09, 0, w * 0.09, 0);
	g.addColorStop(0, '#6a5f64');
	g.addColorStop(0.5, '#b0a5aa');
	g.addColorStop(1, '#5a4f54');
	ctx.fillStyle = g;
	ctx.strokeStyle = INK;
	ctx.lineWidth = Math.max(1.4, w * 0.1);
	ctx.beginPath();
	ctx.moveTo(-w * 0.1, top);
	ctx.lineTo(w * 0.1, top);
	ctx.lineTo(w * 0.07, bot);
	ctx.lineTo(0, bot + w * 0.08);
	ctx.lineTo(-w * 0.07, bot);
	ctx.closePath();
	ctx.fill();
	ctx.stroke();
}

/** Cheek plates: iron on both sides of the face, clipped to the body. */
function cheeks(ctx: CanvasRenderingContext2D, shape: GhostShape): void {
	const { w, domeY } = shape;
	for (const side of [-1, 1]) {
		const g = ctx.createLinearGradient(side * w * 0.6, 0, side * w * 1.1, 0);
		g.addColorStop(0, '#5a4f54');
		g.addColorStop(1, '#a89da2');
		ctx.fillStyle = g;
		ctx.strokeStyle = INK;
		ctx.lineWidth = Math.max(1.4, w * 0.1);
		ctx.beginPath();
		ctx.moveTo(side * w * 0.74, domeY + w * 0.1);
		ctx.lineTo(side * w * 1.3, domeY + w * 0.1);
		ctx.lineTo(side * w * 1.3, domeY + w * 1.05);
		ctx.lineTo(side * w * 0.9, domeY + w * 0.95);
		ctx.closePath();
		ctx.fill();
		ctx.stroke();
		ctx.fillStyle = INK;
		ctx.beginPath();
		ctx.arc(side * w * 0.98, domeY + w * 0.42, w * 0.06, 0, 6.3);
		ctx.fill();
	}
}

/** Shackles on the body's sides: a cuff and, hanging from it, a chain of three links. */
function chains(ctx: CanvasRenderingContext2D, shape: GhostShape, kind: Look['chains']): void {
	const { w, domeY } = shape;
	for (const side of [-1, 1]) {
		const cy = domeY + w * 0.62;
		ctx.fillStyle = '#8a7f84';
		ctx.strokeStyle = INK;
		ctx.lineWidth = Math.max(1.4, w * 0.1);
		ctx.beginPath();
		ctx.roundRect(side * w - w * 0.17, cy - w * 0.26, w * 0.34, w * 0.52, w * 0.08);
		ctx.fill();
		ctx.stroke();
		const link = side === -1 ? kind === 'both' || kind === 'one' : kind === 'both';
		if (!link) continue;
		for (let i = 0; i < 3; i += 1) {
			const lx = side * (w * 1.1 + i * w * 0.1);
			const ly = cy + w * 0.34 + i * w * 0.3;
			ctx.fillStyle = '#6a5f64';
			ctx.beginPath();
			ctx.ellipse(lx, ly, w * 0.13, w * 0.19, side * 0.4 * (i % 2 ? -1 : 1), 0, 6.3);
			ctx.fill();
			ctx.lineWidth = Math.max(1.2, w * 0.08);
			ctx.stroke();
			ctx.fillStyle = '#a89da2';
			ctx.beginPath();
			ctx.ellipse(lx - w * 0.03, ly - w * 0.05, w * 0.04, w * 0.07, 0, 0, 6.3);
			ctx.fill();
		}
	}
}

/** An iron crown between the horns: a low one, or a tall one with five points. */
function crown(ctx: CanvasRenderingContext2D, shape: GhostShape, size: 1 | 2): void {
	const { w, domeY } = shape;
	const base = domeY - w * 0.95;
	const pts = size === 1 ? 3 : 5;
	const h = w * (size === 1 ? 0.34 : 0.55);
	const hw = w * (size === 1 ? 0.42 : 0.52);
	const g = ctx.createLinearGradient(0, base - h, 0, base + w * 0.12);
	g.addColorStop(0, '#d0c6ca');
	g.addColorStop(1, '#6a5f64');
	ctx.fillStyle = g;
	ctx.strokeStyle = INK;
	ctx.lineWidth = Math.max(1.4, w * 0.1);
	ctx.beginPath();
	ctx.moveTo(-hw, base + w * 0.12);
	ctx.lineTo(-hw, base);
	for (let i = 0; i < pts; i += 1) {
		const x0 = -hw + (i / pts) * hw * 2;
		const x1 = -hw + ((i + 1) / pts) * hw * 2;
		ctx.lineTo((x0 + x1) / 2, base - h);
		ctx.lineTo(x1, base);
	}
	ctx.lineTo(hw, base + w * 0.12);
	ctx.closePath();
	ctx.fill();
	ctx.stroke();
	ctx.fillStyle = '#ff6a3a';
	ctx.beginPath();
	ctx.arc(0, base + w * 0.03, w * 0.05, 0, 6.3);
	ctx.fill();
}

/** A third eye in the forehead: a shut slit, or open. */
function thirdEye(ctx: CanvasRenderingContext2D, shape: GhostShape, open: boolean): void {
	const { w, domeY } = shape;
	const y = domeY - w * 0.5;
	ctx.strokeStyle = INK;
	ctx.lineWidth = Math.max(1.4, w * 0.1);
	ctx.beginPath();
	ctx.moveTo(0, y - w * 0.22);
	ctx.quadraticCurveTo(w * 0.2, y, 0, y + w * 0.22);
	ctx.quadraticCurveTo(-w * 0.2, y, 0, y - w * 0.22);
	ctx.closePath();
	if (!open) {
		ctx.fillStyle = INK;
		ctx.fill();
		ctx.stroke();
		return;
	}
	ctx.fillStyle = '#fffbe0';
	ctx.fill();
	ctx.stroke();
	ctx.fillStyle = '#c8180c';
	ctx.beginPath();
	ctx.ellipse(0, y, w * 0.07, w * 0.14, 0, 0, 6.3);
	ctx.fill();
}

function scowl(ctx: CanvasRenderingContext2D, shape: GhostShape, faceY: number): void {
	const { w } = shape;
	const my = faceY + w * 0.42;
	ctx.fillStyle = '#120000';
	ctx.beginPath();
	ctx.moveTo(-w * 0.36, my - w * 0.04);
	ctx.quadraticCurveTo(0, my + w * 0.08, w * 0.36, my - w * 0.04);
	ctx.quadraticCurveTo(0, my + w * 0.02, -w * 0.36, my - w * 0.04);
	ctx.fill();
}

export function drawBoss(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	S: number,
	phase: 1 | 2 | 3,
	dir: Direction,
	time: number
): void {
	const look = LOOKS[dir][phase - 1];
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
	const pool = ctx.createRadialGradient(0, R * 0.2, R * 0.2, 0, R * 0.2, R);
	pool.addColorStop(0, 'rgba(0,0,0,0.5)');
	pool.addColorStop(1, 'rgba(0,0,0,0)');
	ctx.fillStyle = pool;
	ctx.fillRect(-R, -R * 0.8, R * 2, R * 2);
	drawHorns(ctx, 0, 0, shape, 0.55, look.horn, 0.5);
	ghostPath(ctx, 0, 0, shape, time);
	ctx.fillStyle = BODY.mid;
	ctx.fill();
	ctx.save();
	ghostPath(ctx, 0, 0, shape, time);
	ctx.clip();
	celBands(ctx, shape, BODY);
	if (look.helm) helm(ctx, shape);
	if (look.nose) nose(ctx, shape);
	ctx.restore();
	celOutline(ctx, shape, time, BODY.rim);
	if (look.cheeks) {
		ctx.save();
		ghostPath(ctx, 0, 0, shape, time);
		ctx.clip();
		cheeks(ctx, shape);
		ctx.restore();
	}
	if (look.chains !== 'none') chains(ctx, shape, look.chains);
	if (look.crown) crown(ctx, shape, look.crown);
	const faceY = domeY + w * 0.35;
	drawEyes(ctx, 0, faceY, w, 0, { sclera: '#ffe27a', glow: null }, 1, false, time);
	scowl(ctx, shape, faceY);
	if (look.eye3) thirdEye(ctx, shape, look.eye3 === 2);
	ctx.restore();
}
