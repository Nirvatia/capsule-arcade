// Placeholder art for the split's core, until its own mock-up (ROADMAP Part II). The rest of the
// redesign's art is the «Плоть» kit (`fleshKit`). (x, y) is a tile's centre in px, S the tile in px.
import { INK } from './hellGhost';

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
