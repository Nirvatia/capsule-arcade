// The tunnel pad: a soft translucent lens that ripples like water after a drop, with a white
// rim, two glints on it and a bright heart, in the season's colour. Light only, no ink.
import { hexChannels } from '../../common/textures';

type Ctx = CanvasRenderingContext2D;

/** The pad's radius in world units (a tile is ~25). */
export const PAD_RADIUS = 10.8;

const TAU = Math.PI * 2;

function rgba(color: number, alpha: number): string {
	const [r, g, b] = hexChannels(color);
	return `rgba(${r},${g},${b},${alpha})`;
}

function glowDisc(c: Ctx, color: number, radius: number, alpha: number): void {
	const g = c.createRadialGradient(0, 0, 0, 0, 0, radius);
	g.addColorStop(0, rgba(color, alpha));
	g.addColorStop(0.45, rgba(color, alpha * 0.35));
	g.addColorStop(1, rgba(color, 0));
	c.beginPath();
	c.arc(0, 0, radius, 0, TAU);
	c.fillStyle = g;
	c.fill();
}

/** Draws one pad centred at (x, y) at time `t`; `phase` offsets the ripples between pads. */
export function drawRipplePad(
	c: Ctx,
	x: number,
	y: number,
	t: number,
	phase: number,
	glow: number,
	deep: number
): void {
	const r = PAD_RADIUS;
	c.save();
	c.translate(x, y);
	c.globalAlpha = 1;
	c.globalCompositeOperation = 'lighter';
	glowDisc(c, glow, r * 1.7, 0.4 + 0.12 * Math.sin(t * 1.8 + phase));
	c.globalCompositeOperation = 'source-over';
	const lens = c.createRadialGradient(0, r * 0.1, 0, 0, 0, r);
	lens.addColorStop(0, rgba(deep, 0.75));
	lens.addColorStop(0.7, rgba(glow, 0.28));
	lens.addColorStop(1, rgba(glow, 0.5));
	c.beginPath();
	c.arc(0, 0, r * 0.98, 0, TAU);
	c.fillStyle = lens;
	c.fill();
	// the ripples: rings born at the heart that widen and fade
	c.save();
	c.beginPath();
	c.arc(0, 0, r * 0.96, 0, TAU);
	c.clip();
	c.globalCompositeOperation = 'lighter';
	c.lineWidth = r * 0.07;
	for (let k = 0; k < 4; k++) {
		const u = (t * 0.45 + k / 4 + phase * 0.37) % 1;
		c.strokeStyle = `rgba(255,255,255,${((1 - u) * 0.85).toFixed(2)})`;
		c.beginPath();
		c.arc(0, 0, r * (0.06 + u * 0.95), 0, TAU);
		c.stroke();
	}
	c.restore();
	// the rim and its glints
	c.globalCompositeOperation = 'lighter';
	c.beginPath();
	c.arc(0, 0, r * 0.99, 0, TAU);
	c.strokeStyle = 'rgba(255,255,255,.75)';
	c.lineWidth = r * 0.07;
	c.stroke();
	c.lineCap = 'round';
	c.strokeStyle = 'rgba(255,255,255,.95)';
	c.lineWidth = r * 0.09;
	c.beginPath();
	c.arc(0, 0, r * 0.82, Math.PI * 1.12, Math.PI * 1.45);
	c.stroke();
	c.globalAlpha = 0.6;
	c.beginPath();
	c.arc(0, 0, r * 0.82, Math.PI * 0.12, Math.PI * 0.3);
	c.stroke();
	c.globalAlpha = 1;
	glowDisc(c, 0xffffff, r * 0.26 * (1 + 0.15 * Math.sin(t * 3 + phase)), 0.85);
	c.restore();
}
