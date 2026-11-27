// Candidates for the hell's food (the dots): drawn in the hell's cel language, an ink line and two
// tones, small and still so nothing jumps forward. (x, y) is the tile's centre, S the tile in px.
import { INK } from '../../../src/games/pacman/render/doom/hellGhost';

export type FoodKind = 'soul' | 'bone' | 'eye';

const hash = (a: number, b: number): number => {
	const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
	return s - Math.floor(s);
};

/** A food item on tile (c, r); `look` is the way the eye turns (towards the hero). */
export function drawFood(
	ctx: CanvasRenderingContext2D,
	kind: FoodKind,
	c: number,
	r: number,
	x: number,
	y: number,
	S: number,
	t: number,
	look: number,
	axis: number
): void {
	ctx.save();
	ctx.lineJoin = 'round';
	ctx.lineCap = 'round';
	if (kind === 'soul') {
		soul(ctx, x, y, S, t + hash(c, r) * 6);
	} else if (kind === 'bone') {
		bone(ctx, x, y, S, axis + (hash(c, r) - 0.5) * 0.35);
	} else {
		eye(ctx, x, y, S, look);
	}
	ctx.restore();
}

/** A soul: a pale flame with two dark pits for eyes, a faint lilac halo. */
function soul(ctx: CanvasRenderingContext2D, x: number, y: number, S: number, t: number): void {
	const sway = Math.sin(t * 3) * S * 0.015;
	const h = ctx.createRadialGradient(x, y, 0, x, y, S * 0.3);
	h.addColorStop(0, 'rgba(238,226,255,.38)');
	h.addColorStop(1, 'rgba(238,226,255,0)');
	ctx.fillStyle = h;
	ctx.fillRect(x - S * 0.3, y - S * 0.3, S * 0.6, S * 0.6);
	ctx.beginPath();
	ctx.moveTo(x + sway * 2, y - S * 0.2);
	ctx.bezierCurveTo(x + S * 0.04 + sway, y - S * 0.09, x + S * 0.12, y - S * 0.02, x + S * 0.1, y + S * 0.06);
	ctx.bezierCurveTo(x + S * 0.09, y + S * 0.12, x - S * 0.09, y + S * 0.12, x - S * 0.1, y + S * 0.06);
	ctx.bezierCurveTo(x - S * 0.12, y - S * 0.03, x - S * 0.03 + sway, y - S * 0.1, x + sway * 2, y - S * 0.2);
	ctx.closePath();
	const g = ctx.createLinearGradient(0, y - S * 0.2, 0, y + S * 0.12);
	g.addColorStop(0, '#ffffff');
	g.addColorStop(1, '#c9b6ec');
	ctx.fillStyle = g;
	ctx.fill();
	ctx.lineWidth = Math.max(1.4, S * 0.034);
	ctx.strokeStyle = INK;
	ctx.stroke();
	ctx.fillStyle = INK;
	for (const dx of [-0.035, 0.035]) {
		ctx.beginPath();
		ctx.ellipse(x + S * dx, y + S * 0.03, S * 0.014, S * 0.022, 0, 0, 7);
		ctx.fill();
	}
}

/** A knuckle bone: a short shaft, a knob at each end, ivory with a shaded underside. */
function bone(ctx: CanvasRenderingContext2D, x: number, y: number, S: number, a: number): void {
	ctx.translate(x, y);
	ctx.rotate(a);
	const L = S * 0.2;
	const path = (): void => {
		ctx.beginPath();
		ctx.moveTo(-L, -S * 0.03);
		ctx.arc(-L, -S * 0.05, S * 0.05, Math.PI * 0.5, Math.PI * 1.9);
		ctx.lineTo(-L * 0.4, -S * 0.04);
		ctx.lineTo(L * 0.4, -S * 0.04);
		ctx.arc(L, -S * 0.05, S * 0.05, Math.PI * 1.1, Math.PI * 0.5);
		ctx.arc(L, S * 0.05, S * 0.05, Math.PI * 1.5, Math.PI * 0.9);
		ctx.lineTo(L * 0.4, S * 0.04);
		ctx.lineTo(-L * 0.4, S * 0.04);
		ctx.arc(-L, S * 0.05, S * 0.05, Math.PI * 0.1, Math.PI * 1.5);
		ctx.closePath();
	};
	path();
	ctx.fillStyle = '#f0e2c8';
	ctx.fill();
	ctx.save();
	path();
	ctx.clip();
	ctx.fillStyle = '#a8957a';
	ctx.fillRect(-S, S * 0.012, S * 2, S);
	ctx.restore();
	path();
	ctx.lineWidth = Math.max(1.4, S * 0.034);
	ctx.strokeStyle = INK;
	ctx.stroke();
	ctx.fillStyle = 'rgba(255,255,255,.7)';
	ctx.fillRect(-L * 0.5, -S * 0.03, L, S * 0.012);
}

/** An eyeball: ivory, red veins, a dark red iris turned to the hero, a glint. */
function eye(ctx: CanvasRenderingContext2D, x: number, y: number, S: number, look: number): void {
	const R = S * 0.13;
	const g = ctx.createRadialGradient(x - R * 0.35, y - R * 0.4, R * 0.1, x, y, R);
	g.addColorStop(0, '#fff6e6');
	g.addColorStop(1, '#d8c2a6');
	ctx.beginPath();
	ctx.arc(x, y, R, 0, 7);
	ctx.fillStyle = g;
	ctx.fill();
	ctx.strokeStyle = 'rgba(170,30,40,.75)';
	ctx.lineWidth = Math.max(1, S * 0.014);
	for (const a of [0.5, 2.3, 4.0]) {
		ctx.beginPath();
		ctx.moveTo(x + Math.cos(a) * R * 0.95, y + Math.sin(a) * R * 0.95);
		ctx.lineTo(x + Math.cos(a + 0.2) * R * 0.5, y + Math.sin(a + 0.2) * R * 0.5);
		ctx.stroke();
	}
	ctx.lineWidth = Math.max(1.4, S * 0.034);
	ctx.strokeStyle = INK;
	ctx.beginPath();
	ctx.arc(x, y, R, 0, 7);
	ctx.stroke();
	const ix = x + Math.cos(look) * R * 0.38;
	const iy = y + Math.sin(look) * R * 0.38;
	ctx.fillStyle = '#8a1218';
	ctx.beginPath();
	ctx.arc(ix, iy, R * 0.5, 0, 7);
	ctx.fill();
	ctx.fillStyle = INK;
	ctx.beginPath();
	ctx.arc(ix, iy, R * 0.26, 0, 7);
	ctx.fill();
	ctx.fillStyle = 'rgba(255,255,255,.85)';
	ctx.beginPath();
	ctx.arc(ix - R * 0.16, iy - R * 0.18, R * 0.1, 0, 7);
	ctx.fill();
}
