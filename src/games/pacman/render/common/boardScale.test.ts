import { describe, expect, it } from 'vitest';
import {
	BOARD_HEIGHT_SHARE,
	BOARD_TOP_RESERVE,
	BOARD_WIDTH_SHARE,
	boardPlacement
} from './boardScale';

const T = 25;
const walls = (vh: number, vw = 4000) => boardPlacement(vw, vh, 25, 27, T);

describe('boardPlacement', () => {
	it('makes the walls take 85 % of the height where the HUD band leaves room', () => {
		for (const vh of [800, 950, 1300]) {
			expect(25 * T * walls(vh).scale).toBeCloseTo(BOARD_HEIGHT_SHARE * vh, 5);
		}
	});

	it('keeps the walls under the HUD band on a short screen', () => {
		const vh = 620;
		const p = walls(vh);
		const top = p.y + T * p.scale;
		expect(top).toBeGreaterThanOrEqual(BOARD_TOP_RESERVE);
		expect(top + 25 * T * p.scale).toBeLessThanOrEqual(vh);
	});

	it('centres the walls on the whole height when the HUD stands in the side margins', () => {
		const p = boardPlacement(1600, 900, 25, 27, T, 0);
		expect(25 * T * p.scale).toBeCloseTo(BOARD_HEIGHT_SHARE * 900, 5);
		const top = p.y + T * p.scale;
		expect(top + (25 * T * p.scale) / 2).toBeCloseTo(450, 5);
	});

	it('leaves a band at the bottom as well, and centres the walls between the two', () => {
		const p = boardPlacement(400, 800, 25, 27, T, 176, 176);
		const top = p.y + T * p.scale;
		const bottom = top + 25 * T * p.scale;
		expect(top).toBeGreaterThanOrEqual(176);
		expect(bottom).toBeLessThanOrEqual(800 - 176 + 1e-9);
		expect(top - 176).toBeCloseTo(800 - 176 - bottom, 5);
	});

	it('is limited by the width on a narrow screen', () => {
		const p = boardPlacement(400, 1200, 25, 27, T);
		expect(23 * T * p.scale).toBeCloseTo(BOARD_WIDTH_SHARE * 400, 5);
	});

	it('centres the board across', () => {
		const p = boardPlacement(1000, 900, 25, 27, T);
		expect(p.x + (25 * T * p.scale) / 2).toBeCloseTo(500, 5);
	});

	it('stays on the screen under page zoom, where the HUD band takes a larger share', () => {
		const a = boardPlacement(1920, 950, 25, 27, T);
		const z = boardPlacement(1920 / 1.5, 950 / 1.5, 25, 27, T);
		expect(z.scale).toBeLessThan(a.scale);
		const top = z.y + T * z.scale;
		expect(top).toBeGreaterThanOrEqual(BOARD_TOP_RESERVE);
		expect(top + 25 * T * z.scale).toBeLessThanOrEqual(950 / 1.5);
	});
});
