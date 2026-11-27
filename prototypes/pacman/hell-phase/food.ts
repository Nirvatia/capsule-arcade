// Candidates for the hell's food (the dots), in the hell's cel language: an ink line, two tones, still,
// no glow (the first round: the souls' glow hurt the eyes, the bones were noisy, the eyes too faint).
// Now every piece sits on a small dark shadow that parts it from the flesh pattern, lies along its
// corridor and is the same on every tile. (x, y) is the tile's centre, S the tile in px.
import { INK } from '../../../src/games/pacman/render/doom/hellGhost';

export type FoodKind = 'bone' | 'fang' | 'eye';

/** A food item; `look` is the way an eye turns (towards the hero), `axis` the corridor's (0 or PI/2). */
export function drawFood(ctx: CanvasRenderingContext2D, kind: FoodKind, x: number, y: number, S: number, look: number, axis: number): void {
	ctx.save();
	ctx.lineJoin = 'round';
	ctx.lineCap = 'round';
	ctx.fillStyle = 'rgba(8,1,3,.42)';
	ctx.beginPath();
	ctx.ellipse(x + S * 0.03, y + S * 0.06, S * 0.17, S * 0.1, 0, 0, 7);
	ctx.fill();
	if (kind === 'bone') {
		bone(ctx, x, y, S, axis);
	} else if (kind === 'fang') {
		fang(ctx, x, y, S);
	} else {
		eye(ctx, x, y, S, look);
	}
	ctx.restore();
}

const IVORY = '#ecdcbc';
const SHADE = '#a8946f';

function outline(ctx: CanvasRenderingContext2D, S: number): void {
	ctx.lineWidth = Math.max(1.6, S * 0.042);
	ctx.strokeStyle = INK;
	ctx.stroke();
}

/** A short bone, lying along its corridor. */
function bone(ctx: CanvasRenderingContext2D, x: number, y: number, S: number, a: number): void {
	ctx.translate(x, y);
	ctx.rotate(a);
	const L = S * 0.13;
	const k = S * 0.052;
	const path = (): void => {
		ctx.beginPath();
		ctx.arc(-L, -k * 0.75, k, Math.PI * 0.5, Math.PI * 1.85);
		ctx.lineTo(-L * 0.3, -k * 0.7);
		ctx.lineTo(L * 0.3, -k * 0.7);
		ctx.arc(L, -k * 0.75, k, Math.PI * 1.15, Math.PI * 0.5);
		ctx.arc(L, k * 0.75, k, Math.PI * 1.5, Math.PI * 0.85);
		ctx.lineTo(L * 0.3, k * 0.7);
		ctx.lineTo(-L * 0.3, k * 0.7);
		ctx.arc(-L, k * 0.75, k, Math.PI * 0.15, Math.PI * 1.5);
		ctx.closePath();
	};
	path();
	ctx.fillStyle = IVORY;
	ctx.fill();
	ctx.save();
	path();
	ctx.clip();
	ctx.fillStyle = SHADE;
	ctx.fillRect(-S, k * 0.2, S * 2, S);
	ctx.restore();
	path();
	outline(ctx, S);
}

/** A fang: a small curved tooth, the point down. */
function fang(ctx: CanvasRenderingContext2D, x: number, y: number, S: number): void {
	const w = S * 0.085;
	const h = S * 0.2;
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
	g.addColorStop(0, '#f6ead0');
	g.addColorStop(1, SHADE);
	ctx.fillStyle = g;
	ctx.fill();
	path();
	outline(ctx, S);
	ctx.fillStyle = 'rgba(255,255,255,.65)';
	ctx.fillRect(x - w * 0.55, y - h * 0.38, S * 0.014, h * 0.4);
}

/** An eyeball, bigger and plainer than before: a white ball, a red iris turned to the hero. */
function eye(ctx: CanvasRenderingContext2D, x: number, y: number, S: number, look: number): void {
	const R = S * 0.17;
	ctx.beginPath();
	ctx.arc(x, y, R, 0, 7);
	ctx.fillStyle = '#fff8ec';
	ctx.fill();
	ctx.save();
	ctx.clip();
	ctx.fillStyle = 'rgba(170,150,120,.5)';
	ctx.fillRect(x - R, y + R * 0.25, R * 2, R);
	ctx.restore();
	ctx.beginPath();
	ctx.arc(x, y, R, 0, 7);
	outline(ctx, S);
	const ix = x + Math.cos(look) * R * 0.42;
	const iy = y + Math.sin(look) * R * 0.42;
	ctx.fillStyle = '#c4202a';
	ctx.beginPath();
	ctx.arc(ix, iy, R * 0.62, 0, 7);
	ctx.fill();
	ctx.fillStyle = INK;
	ctx.beginPath();
	ctx.arc(ix, iy, R * 0.32, 0, 7);
	ctx.fill();
	ctx.fillStyle = 'rgba(255,255,255,.9)';
	ctx.beginPath();
	ctx.arc(ix - R * 0.18, iy - R * 0.2, R * 0.13, 0, 7);
	ctx.fill();
}
