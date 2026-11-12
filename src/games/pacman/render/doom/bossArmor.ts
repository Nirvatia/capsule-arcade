// Blinky's armour, the same iron as the maze's plates (the owner's pick: one body colour, the red
// of the arcade ghost, because the other colours belong to the imps; the phases differ by iron).
// Phase 2: an iron helm over the dome. Phase 3: the helm, cheek plates and iron horns.
import type { GhostShape } from './hellGhost';
import { INK } from './hellGhost';

/** The iron of the horns in phase 3 (lit, shaded). */
export const IRON_HORN: readonly [string, string] = ['#9a8f94', '#2b2427'];

/** A bold iron helm over the top of the dome, with a ridge and a row of rivets. Clipped by the caller. */
export function drawHelm(ctx: CanvasRenderingContext2D, shape: GhostShape): void {
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
	ctx.lineJoin = 'round';
	ctx.beginPath();
	ctx.moveTo(-w * 1.3, yb);
	ctx.lineTo(w * 1.3, yb);
	ctx.stroke();
	for (const x of [-0.7, -0.35, 0.35, 0.7]) {
		ctx.fillStyle = INK;
		ctx.beginPath();
		ctx.arc(x * w + 0.5, yb - w * 0.14 + 0.6, w * 0.07, 0, Math.PI * 2);
		ctx.fill();
		ctx.fillStyle = 'rgba(255,235,215,.75)';
		ctx.beginPath();
		ctx.arc(x * w - 0.4, yb - w * 0.14 - 0.4, w * 0.035, 0, Math.PI * 2);
		ctx.fill();
	}
}

/** Cheek plates on both sides of the face, lighter than the helm so they read on the red. */
export function drawCheeks(ctx: CanvasRenderingContext2D, shape: GhostShape): void {
	const { w, domeY } = shape;
	for (const side of [-1, 1]) {
		const g = ctx.createLinearGradient(side * w * 0.55, 0, side * w * 1.1, 0);
		g.addColorStop(0, '#7a6f74');
		g.addColorStop(1, '#cfc4c9');
		ctx.fillStyle = g;
		ctx.strokeStyle = INK;
		ctx.lineWidth = Math.max(1.6, w * 0.12);
		ctx.lineJoin = 'round';
		ctx.beginPath();
		ctx.moveTo(side * w * 0.62, domeY + w * 0.06);
		ctx.lineTo(side * w * 1.3, domeY + w * 0.06);
		ctx.lineTo(side * w * 1.3, domeY + w * 1.1);
		ctx.lineTo(side * w * 0.8, domeY + w * 1.0);
		ctx.closePath();
		ctx.fill();
		ctx.stroke();
		ctx.fillStyle = INK;
		ctx.beginPath();
		ctx.arc(side * w * 1.0, domeY + w * 0.42, w * 0.07, 0, Math.PI * 2);
		ctx.fill();
		ctx.fillStyle = 'rgba(255,240,225,.7)';
		ctx.beginPath();
		ctx.arc(side * w * 1.0 - 0.4, domeY + w * 0.42 - 0.4, w * 0.035, 0, Math.PI * 2);
		ctx.fill();
	}
}
