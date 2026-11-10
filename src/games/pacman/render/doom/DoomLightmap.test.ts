import { describe, expect, it } from 'vitest';
import { pathDistances } from './DoomLightmap';

/** A corridor along a row with a side branch: 9 × 5 tiles, 1 is open. */
const COLS = 9;
const ROWS = 5;
const OPEN = new Uint8Array(COLS * ROWS);
for (let x = 0; x < COLS; x += 1) {
	OPEN[2 * COLS + x] = 1;
}
for (let y = 0; y < ROWS; y += 1) {
	OPEN[y * COLS + 4] = 1;
}

function distances(px: number, py: number, reach = 6): Float32Array {
	const dist = new Float32Array(COLS * ROWS);
	pathDistances(
		OPEN,
		COLS,
		ROWS,
		px,
		py,
		reach,
		dist,
		new Int32Array(COLS * ROWS + 1),
		new Uint8Array(COLS * ROWS)
	);
	return dist;
}

describe('the light map distances', () => {
	it('change smoothly as the source moves: no jump when it crosses into the next tile', () => {
		const step = 0.02;
		let before = distances(1.1, 2.5);
		for (let x = 1.1 + step; x < 7.9; x += step) {
			const now = distances(x, 2.5);
			for (let i = 0; i < now.length; i += 1) {
				if (Number.isFinite(now[i]) && Number.isFinite(before[i])) {
					expect(Math.abs(now[i] - before[i])).toBeLessThanOrEqual(step * 1.05);
				}
			}
			before = now;
		}
	});

	it('are the distance along the corridor to each tile centre, one tile per step', () => {
		const d = distances(2.3, 2.5);
		expect(d[2 * COLS + 2]).toBeCloseTo(0.2, 5);
		expect(d[2 * COLS + 3]).toBeCloseTo(1.2, 5);
		expect(d[2 * COLS + 1]).toBeCloseTo(0.8, 5);
		expect(d[2 * COLS + 4]).toBeCloseTo(2.2, 5);
		expect(d[2 * COLS + 5]).toBeCloseTo(3.2, 5);
	});

	it('follow corridors and stop at the reach and at walls', () => {
		const d = distances(4.5, 2.5, 3);
		expect(Number.isFinite(d[0 * COLS + 4])).toBe(true);
		expect(Number.isFinite(d[0 * COLS + 3])).toBe(false);
		expect(Number.isFinite(d[2 * COLS + 8])).toBe(false);
	});
});
