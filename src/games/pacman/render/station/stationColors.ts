// The station's shared colours and a soft glow (style B).
import type { GhostKind } from '../../logic/actors/GhostModel';

/** Each ghost keeps a trace of its colour through the metamorphosis. */
export const GHOST_TINT: Readonly<Record<GhostKind, string>> = {
	BLINKY: '#ff4b42',
	PINKY: '#ff8fd6',
	INKY: '#46e1ff',
	CLYDE: '#ffad42'
};

export function rgba(hex: string, a: number): string {
	const n = parseInt(hex.slice(1), 16);
	return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

/** A soft radial glow of `color`, strongest at the centre. */
export function stationGlow(
	c: CanvasRenderingContext2D,
	x: number,
	y: number,
	r: number,
	color: string,
	a: number
): void {
	const g = c.createRadialGradient(x, y, 0, x, y, r);
	g.addColorStop(0, rgba(color, a));
	g.addColorStop(0.35, rgba(color, a * 0.3));
	g.addColorStop(1, rgba(color, 0));
	c.fillStyle = g;
	c.fillRect(x - r, y - r, r * 2, r * 2);
}
