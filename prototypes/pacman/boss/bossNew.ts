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

/** `silhouette`: horns, then a ragged hem. `iron`: a helm, then iron horns. `face`: a snarl, a roar. */
export type Direction = 'silhouette' | 'iron' | 'face';

interface Look {
	readonly horn: HornStyle;
	readonly torn: number;
	readonly helm: boolean;
	readonly mouth: 'scowl' | 'snarl' | 'roar';
}

const BONE: readonly [string, string] = ['#f1e4cc', '#9c8a72'];
const IRON: readonly [string, string] = ['#8a7f84', '#2b2427'];
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

const LOOKS: Record<Direction, readonly Look[]> = {
	silhouette: [
		{ horn: horn(0.3, 0), torn: 0, helm: false, mouth: 'scowl' },
		{ horn: horn(0.95, 0.4), torn: 0, helm: false, mouth: 'scowl' },
		{ horn: horn(0.95, 0.4), torn: 1, helm: false, mouth: 'scowl' }
	],
	iron: [
		{ horn: horn(0.4, 0), torn: 0, helm: false, mouth: 'scowl' },
		{ horn: horn(0.5, 0.15), torn: 0, helm: true, mouth: 'scowl' },
		{ horn: horn(0.85, 0.4, IRON), torn: 0, helm: true, mouth: 'scowl' }
	],
	face: [
		{ horn: horn(0.45, 0.05), torn: 0, helm: false, mouth: 'scowl' },
		{ horn: horn(0.55, 0.15), torn: 0, helm: false, mouth: 'snarl' },
		{ horn: horn(0.7, 0.3), torn: 0, helm: false, mouth: 'roar' }
	]
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

function mouth(
	ctx: CanvasRenderingContext2D,
	shape: GhostShape,
	faceY: number,
	kind: Look['mouth']
): void {
	const { w } = shape;
	const my = faceY + w * 0.42;
	if (kind === 'scowl') {
		ctx.fillStyle = '#120000';
		ctx.beginPath();
		ctx.moveTo(-w * 0.36, my - w * 0.04);
		ctx.quadraticCurveTo(0, my + w * 0.08, w * 0.36, my - w * 0.04);
		ctx.quadraticCurveTo(0, my + w * 0.02, -w * 0.36, my - w * 0.04);
		ctx.fill();
		return;
	}
	const open = kind === 'roar' ? 0.34 : 0.17;
	const mw = w * (kind === 'roar' ? 0.5 : 0.44);
	ctx.fillStyle = '#120000';
	ctx.beginPath();
	ctx.moveTo(-mw, my - w * 0.06);
	ctx.quadraticCurveTo(0, my + w * (open + 0.12), mw, my - w * 0.06);
	ctx.quadraticCurveTo(0, my - w * 0.02, -mw, my - w * 0.06);
	ctx.fill();
	ctx.fillStyle = '#f4ead8';
	const fangs = kind === 'roar' ? 5 : 4;
	for (let i = 0; i < fangs; i += 1) {
		const fx = -mw * 0.75 + (i / (fangs - 1)) * mw * 1.5;
		ctx.beginPath();
		ctx.moveTo(fx - w * 0.06, my - w * 0.05);
		ctx.lineTo(fx, my + w * (kind === 'roar' ? 0.17 : 0.1));
		ctx.lineTo(fx + w * 0.06, my - w * 0.05);
		ctx.fill();
	}
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
		torn: look.torn,
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
	ctx.restore();
	celOutline(ctx, shape, time, BODY.rim);
	const faceY = domeY + w * 0.35;
	drawEyes(ctx, 0, faceY, w, 0, { sclera: '#ffe27a', glow: null }, 1, false, time);
	mouth(ctx, shape, faceY, look.mouth);
	ctx.restore();
}
