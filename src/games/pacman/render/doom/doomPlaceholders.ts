// Placeholder art for the hell fight's redesign (DESIGN §7 "The fight, redesigned"), as the
// `hell-phase` prototype drew it: the food (the fang, the owner's lead), the Sting, the split's core
// and its four ghosts. ROADMAP Part II step (c) replaces it with approved
// art; keep it plain until then. (x, y) is a tile's centre in px, S the tile in px.
import type { DoomDirection } from '../../logic/doom/DoomGraph';
import { drawImp } from './HellImpView';
import { INK } from './hellGhost';

const IVORY = '#f6ead0';
const SHADE = '#a8946f';

let foodCache: { size: number; canvas: HTMLCanvasElement } | null = null;

/** One piece of food (the fang on its small shadow), drawn once per tile size. */
export function foodSprite(S: number): HTMLCanvasElement {
	const size = Math.max(4, Math.round(S));
	if (foodCache?.size === size) {
		return foodCache.canvas;
	}
	const canvas = document.createElement('canvas');
	canvas.width = size;
	canvas.height = size;
	const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
	const x = size / 2;
	const y = size / 2;
	ctx.lineJoin = 'round';
	ctx.lineCap = 'round';
	ctx.fillStyle = 'rgba(8,1,3,.42)';
	ctx.beginPath();
	ctx.ellipse(x + size * 0.03, y + size * 0.06, size * 0.17, size * 0.1, 0, 0, 7);
	ctx.fill();
	const w = size * 0.085;
	const h = size * 0.2;
	const path = (): void => {
		ctx.beginPath();
		ctx.moveTo(x - w, y - h * 0.5);
		ctx.quadraticCurveTo(x - w * 0.95, y + h * 0.1, x, y + h * 0.58);
		ctx.quadraticCurveTo(x + w * 0.95, y + h * 0.1, x + w, y - h * 0.5);
		ctx.quadraticCurveTo(x, y - h * 0.68, x - w, y - h * 0.5);
		ctx.closePath();
	};
	path();
	const g = ctx.createLinearGradient(x - w, 0, x + w, 0);
	g.addColorStop(0, IVORY);
	g.addColorStop(1, SHADE);
	ctx.fillStyle = g;
	ctx.fill();
	path();
	ctx.lineWidth = Math.max(1.6, size * 0.042);
	ctx.strokeStyle = INK;
	ctx.stroke();
	ctx.fillStyle = 'rgba(255,255,255,.65)';
	ctx.fillRect(x - w * 0.55, y - h * 0.38, size * 0.014, h * 0.4);
	foodCache = { size, canvas };
	return canvas;
}

/** The split's energizer: a pale bead (the seasons' own is not drawn in the hell). */
export function drawEnergizer(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	S: number,
	time: number
): void {
	const k = 1 + 0.1 * Math.sin(time * 5 + x);
	ctx.beginPath();
	ctx.arc(x, y, S * 0.27 * k, 0, 7);
	ctx.fillStyle = '#ffe9a8';
	ctx.fill();
	ctx.lineWidth = Math.max(1.8, S * 0.05);
	ctx.strokeStyle = INK;
	ctx.stroke();
}

/** The Sting's pickup icon (placeholder) in the -50..50 box of `doomItems`. */
export function paintPlasmaIcon(ctx: CanvasRenderingContext2D): void {
	ctx.lineWidth = 6;
	ctx.strokeStyle = INK;
	ctx.fillStyle = '#26324a';
	ctx.beginPath();
	ctx.roundRect(-38, -16, 62, 32, 8);
	ctx.fill();
	ctx.stroke();
	ctx.fillStyle = '#7fd8ff';
	ctx.beginPath();
	ctx.arc(30, 0, 15, 0, 7);
	ctx.fill();
	ctx.stroke();
	ctx.fillStyle = '#bff0ff';
	ctx.fillRect(-30, -5, 42, 10);
}

/** The plasma's bolt: a blue spark (additive). */
export function drawBolt(ctx: CanvasRenderingContext2D, x: number, y: number, S: number): void {
	const g = ctx.createRadialGradient(x, y, 0, x, y, S * 0.34);
	g.addColorStop(0, 'rgba(220,250,255,.95)');
	g.addColorStop(0.4, 'rgba(80,180,255,.7)');
	g.addColorStop(1, 'rgba(40,90,255,0)');
	ctx.fillStyle = g;
	ctx.fillRect(x - S * 0.4, y - S * 0.4, S * 0.8, S * 0.8);
}

/** The core the boss burst from: it beats on its tile all through the split. */
export function drawCore(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	S: number,
	time: number
): void {
	const beat = 1 + 0.12 * Math.max(0, Math.sin(time * 5));
	const g = ctx.createRadialGradient(x, y, 0, x, y, S * 0.9);
	g.addColorStop(0, 'rgba(255,90,50,.55)');
	g.addColorStop(1, 'rgba(255,60,30,0)');
	ctx.fillStyle = g;
	ctx.fillRect(x - S, y - S, S * 2, S * 2);
	ctx.beginPath();
	ctx.arc(x, y, S * 0.26 * beat, 0, 7);
	ctx.fillStyle = '#8a1418';
	ctx.fill();
	ctx.lineWidth = Math.max(1.6, S * 0.05);
	ctx.strokeStyle = INK;
	ctx.stroke();
	ctx.beginPath();
	ctx.arc(x - S * 0.07, y - S * 0.07, S * 0.09 * beat, 0, 7);
	ctx.fillStyle = '#ff7a4a';
	ctx.fill();
}

const GHOST_PAINT = ['clyde', 'pinky', 'inky', 'clyde'] as const;

/**
 * One of the split's four ghosts (0 Blinky, 1 Pinky, 2 Inky, 3 Clyde): the brood's painter, the red
 * one is Clyde's turned red; frightened, a blue (flashing white) disc over it.
 */
export function drawSplitGhost(
	ctx: CanvasRenderingContext2D,
	index: number,
	x: number,
	y: number,
	S: number,
	facing: DoomDirection,
	time: number,
	fright: number,
	scale = 1
): void {
	ctx.save();
	if (index === 0) {
		ctx.filter = 'hue-rotate(-28deg) saturate(1.5)';
	}
	drawImp(ctx, GHOST_PAINT[index] ?? 'clyde', x, y, S * 1.5 * scale, facing, time, 1);
	ctx.restore();
	if (fright > 0) {
		const white = fright < 2 && Math.floor(time * 8) % 2 === 0;
		ctx.fillStyle = white ? 'rgba(255,255,255,.72)' : 'rgba(50,80,230,.62)';
		ctx.beginPath();
		ctx.arc(x, y, S * 0.44, 0, 7);
		ctx.fill();
	}
}
