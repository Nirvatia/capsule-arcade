// What the element heroes share: a repeatable hash, the world's light and up in a hero's frame.
// Frame space: the hero faces +x, the top is -y, mirrored by his flip.

export const TAU = Math.PI * 2;

/** A repeatable random number in 0..1 for (a, b). */
export function hash(a: number, b = 0): number {
	let h = Math.imul(a | 0, 0x27d4eb2d) ^ Math.imul((b | 0) + 0x9e3779b9, 0x85ebca6b);
	h ^= h >>> 15;
	h = Math.imul(h, 0x2c1b3c6d);
	h ^= h >>> 12;
	return ((h >>> 0) % 100000) / 100000;
}

/** The key light (from the upper left, as the heroes' own), a unit vector in the world. */
const LIGHT = (() => {
	const n = Math.hypot(-0.55, -0.83);
	return { x: -0.55 / n, y: -0.83 / n };
})();

export interface Vec {
	readonly x: number;
	readonly y: number;
}

/** The key light in the frame of a hero heading `angle` with `flip`. */
export function frameLight(angle: number, flip: number): Vec {
	const ca = Math.cos(angle);
	const sa = Math.sin(angle);
	return { x: LIGHT.x * ca + LIGHT.y * sa, y: (-LIGHT.x * sa + LIGHT.y * ca) * flip };
}

/** The world's up in the frame of a hero heading `angle` with `flip`. */
export function frameUp(angle: number, flip: number): Vec {
	return { x: -Math.sin(angle), y: -Math.cos(angle) * flip };
}

/** A unit vector along (x, y). */
export function unit(x: number, y: number): Vec {
	const n = Math.hypot(x, y) || 1;
	return { x: x / n, y: y / n };
}

/** Clip `c` to everything outside the circle of radius `r` round the frame's centre. */
export function clipOutside(c: CanvasRenderingContext2D, r: number): void {
	c.beginPath();
	c.rect(-r * 8, -r * 8, r * 16, r * 16);
	c.arc(0, 0, r, 0, TAU, true);
	c.clip('evenodd');
}
