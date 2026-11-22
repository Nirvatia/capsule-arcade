// The station's motion tracker (DESIGN.md §7a): a pulse from the hero every period; what moves
// within reach blips as the front passes and fades until the next pulse.
import { rgba, stationGlow } from './stationColors';

export interface Blip {
	/** Offset from the hero, tiles. */
	readonly x: number;
	readonly y: number;
}

export const TRACKER = { period: 1.5, reach: 10 } as const;

const TAU = Math.PI * 2;

export function drawTracker(
	c: CanvasRenderingContext2D,
	hx: number,
	hy: number,
	S: number,
	t: number,
	blips: readonly Blip[]
): void {
	const u = (t % TRACKER.period) / TRACKER.period;
	const rad = u * TRACKER.reach * S;
	const color = '#9dffbf';
	c.save();
	c.globalCompositeOperation = 'lighter';
	c.strokeStyle = rgba(color, (1 - u) * 0.22);
	c.lineWidth = Math.max(1, S * 0.025);
	c.beginPath();
	c.arc(hx, hy, rad, 0, TAU);
	c.stroke();
	for (const b of blips) {
		const d = Math.hypot(b.x, b.y);
		if (d > TRACKER.reach) continue;
		const passed = u - d / TRACKER.reach;
		if (passed < 0) continue;
		const k = Math.max(0, 1 - (passed * TRACKER.period) / 1.1);
		stationGlow(c, hx + b.x * S, hy + b.y * S, S * 0.45, color, 0.45 * k);
		c.fillStyle = rgba('#efffef', k * 0.9);
		c.fillRect(hx + b.x * S - S * 0.05, hy + b.y * S - S * 0.05, S * 0.1, S * 0.1);
	}
	c.restore();
}
